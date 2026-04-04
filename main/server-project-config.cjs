// main/server-project-config.cjs
// Routes et helpers config projet / INI (extraits de server.cjs)

const fs = require('fs');
const path = require('path');
const { ensureDirPath } = require('./server-files.cjs');
const {
  loadProjects,
  saveProjects,
  findProjectId,
  readProjectMeta,
  writeProjectMeta,
  extractProjectInsights,
  isValidId,
} = require('./server-projects.cjs');
const {
  rewriteIniSectionContent,
  normalizeBoolIni,
  normalizeNumberIni,
  buildSmoothedFrameRateRange,
} = require('./server-ini.cjs');

function ensureHttpServerBindAddress(uprojectPath, bindAddress = '0.0.0.0') {
  const up = String(uprojectPath || '').trim();
  if (!up) return { ok: false, error: 'missing_uproject' };
  if (/[\r\n]/.test(bindAddress)) {
    return { ok: false, error: 'invalid_bind_address' };
  }

  const iniPath = path.join(path.dirname(up), 'Config', 'DefaultEngine.ini');
  if (!fs.existsSync(iniPath)) {
    return { ok: false, error: 'ini_not_found', iniPath };
  }

  try {
    const txt = fs.readFileSync(iniPath, 'utf8');
    const next = rewriteIniSectionContent(txt, 'HTTPServer.Listeners', {
      DefaultBindAddress: bindAddress,
    });
    if (next !== txt) {
      fs.writeFileSync(iniPath, next, 'utf8');
    }
    return { ok: true, iniPath, bindAddress, changed: next !== txt };
  } catch (e) {
    return { ok: false, error: 'write_failed', message: String(e?.message || e), iniPath };
  }
}

function normalizeProjectUsageMode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  const aliases = new Map([
    ['live', 'live'],
    ['auto_render', 'auto_render'],
    ['render', 'auto_render'],
    ['rendu_automatique', 'auto_render'],
    ['rendu automatique', 'auto_render'],
    ['live_auto_render', 'live_auto_render'],
    ['live + rendu automatique', 'live_auto_render'],
    ['live et rendu automatique', 'live_auto_render'],
    ['live_and_auto_render', 'live_auto_render'],
    ['other', 'other'],
    ['autre', 'other'],
  ]);
  return aliases.get(key) || '';
}


async function handleProjectConfigRoutes(req, res, url, ctx = {}) {
  const { sendJSON, parseBody, invalidateProjectsCache, logLine } = ctx;
  // Routes projet/INI extraites de server.cjs
  // ---- Project metadata GET/POST (data/projects/<id>.json) ----
  if (url.pathname === '/agent/project-meta') {
    const pj = loadProjects();
    if (req.method === 'GET') {
      let q = String(url.searchParams.get('projectId') || '').trim();
      const pid = findProjectId(pj, q) || '';
      if (!pid) {
        return sendJSON(res, 400, { ok: false, error: 'unknown_project' });
      }
      const proj = pj.projects.find(p => p.id === pid);
      const meta = readProjectMeta(pid) || {};
      const normalizedUsageMode = normalizeProjectUsageMode(meta.usageMode);
      if (meta && meta.status === 'PAS') {
        meta.status = 'PAD';
        try { writeProjectMeta(pid, meta); } catch {}
      }
      if (normalizedUsageMode !== String(meta.usageMode || '')) {
        meta.usageMode = normalizedUsageMode;
        try { writeProjectMeta(pid, meta); } catch {}
      }
      const insights = extractProjectInsights(proj?.uproject || proj?.projectPath || proj?.path || '');
      return sendJSON(res, 200, { ok: true, projectId: pid, meta, insights });
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      const pid = findProjectId(pj, body?.projectId || '') || '';
      if (!pid) {
        return sendJSON(res, 400, { ok: false, error: 'unknown_project' });
      }
      const incoming = body?.meta && typeof body.meta === 'object' ? body.meta : {};
      const prevMeta = readProjectMeta(pid) || {};
      const allowedStatus = new Set(['Test', 'In progress', 'A modifier', 'PAD', 'Archive']);
      const allowedTypes = new Set([
        'Réalité augmentée',
        'Green Screen',
        'NDisplay',
        'Motion Design',
        'Blueprint',
        'Plugin',
        'Scène Unreal',
        'Movie Render Cue'
      ]);
      const hasStatus = Object.prototype.hasOwnProperty.call(incoming, 'status');
      const rawStatus = incoming.status === 'PAS' ? 'PAD' : incoming.status;
      const status = hasStatus
        ? (allowedStatus.has(rawStatus) ? rawStatus : '')
        : String(prevMeta.status || '');
      const hasType = Object.prototype.hasOwnProperty.call(incoming, 'type');
      const type = hasType
        ? (allowedTypes.has(incoming.type) ? incoming.type : '')
        : String(prevMeta.type || '');
      const hasUsageMode = Object.prototype.hasOwnProperty.call(incoming, 'usageMode');
      const usageMode = hasUsageMode
        ? normalizeProjectUsageMode(incoming.usageMode)
        : normalizeProjectUsageMode(prevMeta.usageMode);
      const hasReferents = Object.prototype.hasOwnProperty.call(incoming, 'referents');
      const referents = hasReferents
        ? (
            incoming.referents && typeof incoming.referents === 'object'
              ? {
                  director: String(incoming.referents.director || ''),
                  technician: String(incoming.referents.technician || ''),
                  operator: String(incoming.referents.operator || ''),
                  journalist: String(incoming.referents.journalist || ''),
                }
              : { director: '', technician: '', operator: '', journalist: '' }
          )
        : (
            prevMeta.referents && typeof prevMeta.referents === 'object'
              ? {
                  director: String(prevMeta.referents.director || ''),
                  technician: String(prevMeta.referents.technician || ''),
                  operator: String(prevMeta.referents.operator || ''),
                  journalist: String(prevMeta.referents.journalist || ''),
                }
              : { director: '', technician: '', operator: '', journalist: '' }
          );
      const hasKeywords = Object.prototype.hasOwnProperty.call(incoming, 'keywords');
      const keywords = hasKeywords
        ? (
            Array.isArray(incoming.keywords)
              ? incoming.keywords.map(v => String(v || '').trim()).filter(Boolean)
              : []
          )
        : (
            Array.isArray(prevMeta.keywords)
              ? prevMeta.keywords.map(v => String(v || '').trim()).filter(Boolean)
              : []
          );
      const hasNote = Object.prototype.hasOwnProperty.call(incoming, 'note');
      const note = hasNote ? String(incoming.note || '') : String(prevMeta.note || '');
      const hasWrcName = Object.prototype.hasOwnProperty.call(incoming, 'wrcName');
      const wrcName = hasWrcName ? String(incoming.wrcName || '').trim() : String(prevMeta.wrcName || '');
      const hasCategory = Object.prototype.hasOwnProperty.call(incoming, 'category');
      const category = hasCategory ? String(incoming.category || '') : String(prevMeta.category || '');
      const hasFavorite = Object.prototype.hasOwnProperty.call(incoming, 'favorite');
      const favorite = hasFavorite ? incoming.favorite === true : prevMeta.favorite === true;
      const hasFileVersion = Object.prototype.hasOwnProperty.call(incoming, 'fileVersion');
      const fvRaw = incoming.fileVersion;
      const fileVersion =
        hasFileVersion
          ? (
              typeof fvRaw === 'number'
                ? (Number.isFinite(fvRaw) ? String(fvRaw) : '')
                : (typeof fvRaw === 'string' ? fvRaw.trim() : '')
            )
          : String(prevMeta.fileVersion || '');
      const meta = {
        ...prevMeta,
        status,
        type,
        usageMode,
        category,
        fileVersion,
        referents,
        keywords,
        note,
        wrcName
      };
      if (hasFavorite) meta.favorite = favorite;
      writeProjectMeta(pid, meta);
      return sendJSON(res, 200, { ok: true, projectId: pid, meta });
    }
    return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
  }

  // ---- Project DefaultEngine.ini : set HTTPServer.Listeners bind address ----
  // POST /agent/project-http-bind { projectId, bindAddress? }
  if (url.pathname === '/agent/project-http-bind') {
    if (req.method !== 'POST') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }

    const body = await parseBody(req);
    const pj = loadProjects();
    const pid = findProjectId(pj, body?.projectId || '') || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });

    const bindAddress = String(body?.bindAddress || '0.0.0.0').trim();
    if (!bindAddress) return sendJSON(res, 400, { ok: false, error: 'missing_bind_address' });
    if (/[\r\n]/.test(bindAddress)) {
      return sendJSON(res, 400, { ok: false, error: 'invalid_bind_address' });
    }

    const proj = pj.projects.find(p => p.id === pid);
    const up = String(proj?.uproject || proj?.projectPath || proj?.path || '').trim();
    if (!up) return sendJSON(res, 400, { ok: false, error: 'missing_uproject' });

    const resBind = ensureHttpServerBindAddress(up, bindAddress);
    if (!resBind.ok) {
      const status = resBind.error === 'ini_not_found' ? 404 : 500;
      return sendJSON(res, status, {
        ok: false,
        error: resBind.error || 'write_failed',
        message: resBind.message || ''
      });
    }

    return sendJSON(res, 200, {
      ok: true,
      projectId: pid,
      bindAddress
    });
  }

  // ---- Project DefaultGame.ini : set ProjectVersion ----
  // POST /agent/project-version { projectId, projectVersion }
  if (url.pathname === '/agent/project-version') {
    if (req.method !== 'POST') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }

    const body = await parseBody(req);
    const pj = loadProjects();
    const pid = findProjectId(pj, body?.projectId || '') || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });

    const projectVersion = String(body?.projectVersion || '').trim();
    if (!projectVersion) return sendJSON(res, 400, { ok: false, error: 'missing_version' });
    if (/[\r\n]/.test(projectVersion)) {
      return sendJSON(res, 400, { ok: false, error: 'invalid_version' });
    }

    const proj = pj.projects.find(p => p.id === pid);
    const up = String(proj?.uproject || proj?.projectPath || proj?.path || '').trim();
    if (!up) return sendJSON(res, 400, { ok: false, error: 'missing_uproject' });

    const iniPath = path.join(path.dirname(up), 'Config', 'DefaultGame.ini');
    if (!fs.existsSync(iniPath)) {
      try {
        ensureDirPath(path.dirname(iniPath));
        const defaultContent = [
          '[/Script/EngineSettings.GeneralProjectSettings]',
          `ProjectVersion=${projectVersion}`,
          ''
        ].join('\n');
        fs.writeFileSync(iniPath, defaultContent, 'utf8');
      } catch (e) {
        return sendJSON(res, 500, { ok: false, error: 'ini_create_failed', message: String(e?.message || e) });
      }
    }

    try {
      const txt = fs.readFileSync(iniPath, 'utf8');
      const next = rewriteIniSectionContent(txt, '/Script/EngineSettings.GeneralProjectSettings', { ProjectVersion: projectVersion });
      fs.writeFileSync(iniPath, next, 'utf8');
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: 'write_failed', message: String(e?.message || e) });
    }

    return sendJSON(res, 200, { ok: true, projectId: pid, projectVersion });
  }

  // ---- Project DefaultEngine.ini : set default maps ----
  // POST /agent/project-default-maps { projectId, gameDefaultMap?, editorStartupMap? }
  if (url.pathname === '/agent/project-default-maps') {
    if (req.method !== 'POST') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }

    const body = await parseBody(req);
    const pj = loadProjects();
    const pid = findProjectId(pj, body?.projectId || '') || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });

    const gameDefaultMap = String(body?.gameDefaultMap || '').trim();
    const editorStartupMap = String(body?.editorStartupMap || '').trim();
    if (!gameDefaultMap && !editorStartupMap) {
      return sendJSON(res, 400, { ok: false, error: 'missing_map' });
    }

    const validateMap = (v, label) => {
      if (!v) return null;
      if (!v.startsWith('/Game/')) return `${label} must start with /Game/`;
      if (/[\r\n]/.test(v)) return `${label} invalid`;
      return null;
    };
    const v1 = validateMap(gameDefaultMap, 'gameDefaultMap');
    if (v1) return sendJSON(res, 400, { ok: false, error: 'invalid_map', message: v1 });
    const v2 = validateMap(editorStartupMap, 'editorStartupMap');
    if (v2) return sendJSON(res, 400, { ok: false, error: 'invalid_map', message: v2 });

    const proj = pj.projects.find(p => p.id === pid);
    const up = String(proj?.uproject || proj?.projectPath || proj?.path || '').trim();
    if (!up) return sendJSON(res, 400, { ok: false, error: 'missing_uproject' });

    const iniPath = path.join(path.dirname(up), 'Config', 'DefaultEngine.ini');
    if (!fs.existsSync(iniPath)) {
      return sendJSON(res, 404, { ok: false, error: 'ini_not_found' });
    }

    try {
      const txt = fs.readFileSync(iniPath, 'utf8');
      const patch = {};
      if (gameDefaultMap) patch.GameDefaultMap = gameDefaultMap;
      if (editorStartupMap) patch.EditorStartupMap = editorStartupMap;
      const next = rewriteIniSectionContent(txt, '/Script/EngineSettings.GameMapsSettings', patch);
      fs.writeFileSync(iniPath, next, 'utf8');
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: 'write_failed', message: String(e?.message || e) });
    }

    return sendJSON(res, 200, {
      ok: true,
      projectId: pid,
      patch: {
        ...(gameDefaultMap ? { GameDefaultMap: gameDefaultMap } : {}),
        ...(editorStartupMap ? { EditorStartupMap: editorStartupMap } : {}),
      },
    });
  }

  // ---- Project DefaultEngine.ini : video production cadence/perf ----
  // POST /agent/project-video-production { projectId, cadence: { ... } }
  if (url.pathname === '/agent/project-video-production') {
    if (req.method !== 'POST') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }

    const body = await parseBody(req);
    const pj = loadProjects();
    const pid = findProjectId(pj, body?.projectId || '') || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });

    const cadence = body?.cadence && typeof body.cadence === 'object' ? body.cadence : {};
    const patch = {};

    if (cadence.minDesiredFrameRate !== undefined) {
      const v = normalizeNumberIni(cadence.minDesiredFrameRate);
      if (v) patch.MinDesiredFrameRate = v;
    }
    if (cadence.smoothEnabled !== undefined) {
      const v = normalizeBoolIni(cadence.smoothEnabled);
      if (v) patch.bSmoothFrameRate = v;
    }
    if (cadence.smoothMin !== undefined && cadence.smoothMax !== undefined) {
      const v = buildSmoothedFrameRateRange(cadence.smoothMin, cadence.smoothMax);
      if (v) patch.SmoothedFrameRateRange = v;
    }
    if (cadence.useFixedFrameRate !== undefined) {
      const v = normalizeBoolIni(cadence.useFixedFrameRate);
      if (v) patch.bUseFixedFrameRate = v;
    }
    if (cadence.fixedFrameRate !== undefined) {
      const v = normalizeNumberIni(cadence.fixedFrameRate);
      if (v) patch.FixedFrameRate = v;
    }

    if (!Object.keys(patch).length) {
      return sendJSON(res, 400, { ok: false, error: 'missing_patch' });
    }

    const proj = pj.projects.find(p => p.id === pid);
    const up = String(proj?.uproject || proj?.projectPath || proj?.path || '').trim();
    if (!up) return sendJSON(res, 400, { ok: false, error: 'missing_uproject' });

    const iniPath = path.join(path.dirname(up), 'Config', 'DefaultEngine.ini');
    if (!fs.existsSync(iniPath)) {
      return sendJSON(res, 404, { ok: false, error: 'ini_not_found' });
    }

    try {
      const txt = fs.readFileSync(iniPath, 'utf8');
      const next = rewriteIniSectionContent(txt, '/Script/Engine.Engine', patch);
      fs.writeFileSync(iniPath, next, 'utf8');
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: 'write_failed', message: String(e?.message || e) });
    }

    return sendJSON(res, 200, { ok: true, projectId: pid, patch });
  }

  // ---- Project snapshot image (binary) ----
  // GET /agent/project-snapshot?projectId=<id|name>&file=<relative path under Saved/Screenshots>
  if (url.pathname === '/agent/project-snapshot') {
    if (req.method !== 'GET') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }

    const pj = loadProjects();
    const q = String(url.searchParams.get('projectId') || '').trim();
    const pid = findProjectId(pj, q) || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });

    const relRaw = String(url.searchParams.get('file') || '').trim();
    const rel = relRaw.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!rel) return sendJSON(res, 400, { ok: false, error: 'missing_file' });

    const proj = pj.projects.find(p => p.id === pid);
    const up = String(proj?.uproject || proj?.projectPath || proj?.path || '').trim();
    if (!up) return sendJSON(res, 400, { ok: false, error: 'missing_uproject' });

    const baseDir = path.dirname(up);
    const root = path.join(baseDir, 'Saved', 'Screenshots');
    const rootResolved = path.resolve(root);
    const fullResolved = path.resolve(rootResolved, rel);

    const rootNorm = rootResolved.toLowerCase();
    const fullNorm = fullResolved.toLowerCase();
    if (!fullNorm.startsWith(rootNorm + path.sep.toLowerCase())) {
      return sendJSON(res, 400, { ok: false, error: 'invalid_path' });
    }

    if (!fs.existsSync(fullResolved)) {
      return sendJSON(res, 404, { ok: false, error: 'not_found' });
    }

    const ext = path.extname(fullResolved).toLowerCase();
    const mime =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
          ? 'image/png'
          : '';
    if (!mime) {
      return sendJSON(res, 415, { ok: false, error: 'unsupported_media_type' });
    }

    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(fullResolved).pipe(res);
    return;
  }

  // ---- Définir AutoScreenshot.png (192x192) depuis l'UI ----
  // POST /agent/project-autoscreenshot { projectId, pngBase64 | dataUrl }
  if (url.pathname === '/agent/project-autoscreenshot') {
    if (req.method !== 'POST') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }

    const body = await parseBody(req);
    const pj = loadProjects();
    const pid = findProjectId(pj, body?.projectId || '') || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });

    let b64 = '';
    if (typeof body?.pngBase64 === 'string') b64 = body.pngBase64.trim();
    if (!b64 && typeof body?.dataUrl === 'string') {
      const s = body.dataUrl.trim();
      const m = /^data:image\/png;base64,(.+)$/i.exec(s);
      b64 = m && m[1] ? m[1].trim() : s;
    }
    if (!b64) return sendJSON(res, 400, { ok: false, error: 'missing_image' });

    let buf = null;
    try {
      buf = Buffer.from(b64, 'base64');
    } catch {
      return sendJSON(res, 400, { ok: false, error: 'invalid_base64' });
    }
    if (!buf || buf.length < 8) {
      return sendJSON(res, 400, { ok: false, error: 'invalid_image' });
    }

    const proj = pj.projects.find(p => p.id === pid);
    const up = String(proj?.uproject || proj?.projectPath || proj?.path || '').trim();
    if (!up) return sendJSON(res, 400, { ok: false, error: 'missing_uproject' });

    const baseDir = path.dirname(up);
    const savedDir = path.join(baseDir, 'Saved');
    const dest = path.join(savedDir, 'AutoScreenshot.png');

    try {
      fs.mkdirSync(savedDir, { recursive: true });
      fs.writeFileSync(dest, buf);
    } catch (e) {
      return sendJSON(res, 500, { ok: false, error: 'write_failed', message: String(e?.message || e) });
    }

    return sendJSON(res, 200, { ok: true, projectId: pid, file: dest, bytes: buf.length });
  }

  // ---- Associer un .uproject (par host + name "legacy") ----
  if (req.method === 'GET' && url.pathname === '/agent/set-project') {
    const host = String(url.searchParams.get('host') || '').trim();
    const name = String(url.searchParams.get('name') || '').trim();
    const uproject = String(url.searchParams.get('uproject') || '').trim();
    if (!host || !name || !uproject) {
      return sendJSON(res, 400, { ok:false, error:'missing host|name|uproject' });
    }
    const pj = loadProjects();
    const id = findProjectId(pj, name);
    if (!id || !isValidId(id)) {
      return sendJSON(res, 400, { ok:false, error:'unknown_project', message:'projectId/nom introuvable' });
    }
    pj.activeByHost = (pj.activeByHost && typeof pj.activeByHost === 'object') ? pj.activeByHost : {};
    const current = pj.activeByHost[host] && typeof pj.activeByHost[host] === 'object' ? pj.activeByHost[host] : {};
    pj.activeByHost[host] = { ...current, [id]: uproject };
    const changed = saveProjects(pj, { onlyIfChanged: true });
    if (changed) {
      if (typeof invalidateProjectsCache === 'function') invalidateProjectsCache();
      logLine?.({ level:'success', action:'write_json', message:'projects_server.json set-project (legacy) exécuté', data:{ host, projectId: id, uproject } });
    }
    return sendJSON(res, 200, { ok:true });
  }

  return false;
}

module.exports = { handleProjectConfigRoutes, ensureHttpServerBindAddress };
