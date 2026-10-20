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
  refreshProjectEngineVersion,
} = require('./server-projects.cjs');
const {
  rewriteIniSectionContent,
  normalizeBoolIni,
  normalizeNumberIni,
  buildSmoothedFrameRateRange,
} = require('./server-ini.cjs');
const { normalizeProjectUsageMode } = require('./server-normalize.cjs');

const RENDER_BRIDGE_PLUGIN_NAME = 'UltiUnrealRenderBridge';
const PROJECT_PLUGIN_CATALOG = Object.freeze({
  UltiUnrealRenderBridge: Object.freeze({
    key: 'UltiUnrealRenderBridge',
    category: 'Rendu',
    displayName: 'UltiUnrealRenderBridge',
    packageName: 'UltiUnrealRenderBridge',
    installFolderName: 'UltiUnrealRenderBridge',
    pluginName: 'UltiUnrealRenderBridge',
    upluginFile: 'UltiUnrealRenderBridge.uplugin',
    fallbackVersionTags: ['UE5.8', 'UE5.7', 'UE5.6'],
    aliases: ['renderBridge', 'render_bridge', 'render-bridge', 'UltiUnrealRenderBridge'],
  }),
  UU_Camera: Object.freeze({
    key: 'UU_Camera',
    category: 'Live',
    displayName: 'UU_Camera',
    packageName: 'UU_Camera',
    installFolderName: 'UU_Camera',
    pluginName: 'UltiUnrealCamera',
    upluginFile: 'UltiUnrealCamera.uplugin',
    fallbackVersionTags: ['UE5.8', 'UE5.7'],
    aliases: ['UU_Camera', 'UltiUnrealCamera', 'camera'],
    manualFiles: Object.freeze({
      fr: 'UU_Camera_User_Guide_Fr.pdf',
      en: 'UU_Camera_User_Guide_En.pdf',
    }),
  }),
  UU_Texture: Object.freeze({
    key: 'UU_Texture',
    category: 'Live',
    displayName: 'UU_Texture',
    packageName: 'UU_Texture',
    installFolderName: 'UU_Texture',
    pluginName: 'UltiUnrealTexture',
    upluginFile: 'UltiUnrealTexture.uplugin',
    fallbackVersionTags: ['UE5.8', 'UE5.7'],
    aliases: ['UU_Texture', 'UltiUnrealTexture', 'texture'],
    manualFiles: Object.freeze({
      fr: 'UU_Texture_User_Guide_Fr.pdf',
      en: 'UU_Texture_User_Guide_En.pdf',
    }),
  }),
});
const PROJECT_PLUGIN_ALIAS_MAP = (() => {
  const out = new Map();
  for (const spec of Object.values(PROJECT_PLUGIN_CATALOG)) {
    const aliases = [spec.key, spec.pluginName, spec.packageName, ...(Array.isArray(spec.aliases) ? spec.aliases : [])];
    for (const alias of aliases) {
      const key = String(alias || '').trim().toLowerCase();
      if (key) out.set(key, spec.key);
    }
  }
  return out;
})();

function readJsonFileSafe(filePath = '') {
  const p = path.resolve(String(filePath || '').trim());
  const raw = fs.readFileSync(p, 'utf8');
  const sanitized = String(raw || '').replace(/^\uFEFF/, '');
  return JSON.parse(sanitized || '{}');
}

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

function copyDirectoryRecursive(srcDir, destDir) {
  const src = path.resolve(String(srcDir || '').trim());
  const dest = path.resolve(String(destDir || '').trim());
  if (!src || !dest) throw new Error('missing_source_or_destination');
  const stat = fs.statSync(src);
  if (!stat.isDirectory()) throw new Error('source_not_directory');

  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryRecursive(from, to);
      continue;
    }
    if (entry.isFile()) {
      fs.copyFileSync(from, to);
    }
  }
}

function resolveEngineVersionTag(rawVersion = '') {
  const match = String(rawVersion || '').match(/(\d+\.\d+)/);
  if (!match || !match[1]) return '';
  return `UE${match[1]}`;
}

function resolveEngineVersionTagVariants(rawVersion = '') {
  const match = String(rawVersion || '').match(/(\d+\.\d+)/);
  if (!match || !match[1]) return [];
  return [`UE${match[1]}`, `UE_${match[1]}`];
}

function normalizeProjectPluginKey(pluginKey = '') {
  const raw = String(pluginKey || '').trim();
  if (!raw) return '';
  return PROJECT_PLUGIN_ALIAS_MAP.get(raw.toLowerCase()) || '';
}

function resolveProjectPluginSpec(pluginKey = '') {
  const key = normalizeProjectPluginKey(pluginKey);
  return key ? PROJECT_PLUGIN_CATALOG[key] || null : null;
}

function collectVersionTagVariants(engineVersion = '', fallbackVersionTags = []) {
  const out = [];
  const addTag = (tag) => {
    const raw = String(tag || '').trim();
    if (!raw) return;
    for (const variant of resolveEngineVersionTagVariants(raw)) {
      if (!out.includes(variant)) out.push(variant);
    }
    if (!out.includes(raw)) out.push(raw);
  };
  if (resolveEngineVersionTag(engineVersion)) {
    addTag(engineVersion);
    return out;
  }
  for (const tag of fallbackVersionTags) addTag(tag);
  return out;
}

function listProjectPluginPackageCandidates(pluginKey = '', engineVersion = '') {
  const spec = resolveProjectPluginSpec(pluginKey);
  if (!spec) return [];
  const repoRoot = path.resolve(__dirname, '..');
  const cwdRoot = path.resolve(process.cwd() || '.');
  const rootCandidates = Array.from(new Set([repoRoot, cwdRoot]));
  const versionTags = collectVersionTagVariants(engineVersion, spec.fallbackVersionTags || []);
  const out = [];

  for (const root of rootCandidates) {
    const pluginsRoot = path.join(root, 'plugins');
    const toolsRoot = path.join(root, 'tools');
    const toolsPluginsRoot = path.join(toolsRoot, 'plugins');

    for (const versionTag of versionTags) {
      out.push({
        versionTag,
        packageDir: path.join(pluginsRoot, spec.category, spec.packageName, versionTag),
      });
      out.push({
        versionTag,
        packageDir: path.join(toolsPluginsRoot, spec.category, spec.packageName, versionTag),
      });
    }

    out.push({
      versionTag: '',
      packageDir: path.join(pluginsRoot, spec.category, spec.packageName),
    });
    out.push({
      versionTag: '',
      packageDir: path.join(toolsPluginsRoot, spec.category, spec.packageName),
    });

    if (spec.key === RENDER_BRIDGE_PLUGIN_NAME) {
      for (const versionTag of versionTags) {
        out.push({
          versionTag,
          packageDir: path.join(pluginsRoot, versionTag, spec.packageName),
        });
        out.push({
          versionTag,
          packageDir: path.join(toolsPluginsRoot, versionTag, spec.packageName),
        });
      }
      out.push({
        versionTag: '',
        packageDir: path.join(pluginsRoot, spec.packageName),
      });
      out.push({
        versionTag: '',
        packageDir: path.join(toolsRoot, spec.packageName),
      });
      out.push({
        versionTag: 'UE5.6',
        packageDir: path.join(toolsRoot, `${spec.packageName}56`),
      });
    }
  }
  return out;
}

function listRenderBridgePackageCandidates(engineVersion = '') {
  return listProjectPluginPackageCandidates(RENDER_BRIDGE_PLUGIN_NAME, engineVersion);
}

function resolveProjectPluginManuals(spec = null, packageDir = '') {
  if (!spec?.manualFiles || !packageDir) return {};
  const packageRoot = path.dirname(path.resolve(packageDir));
  const manuals = {};
  for (const [lang, filename] of Object.entries(spec.manualFiles || {})) {
    const filePath = path.join(packageRoot, String(filename || ''));
    if (fs.existsSync(filePath)) manuals[lang] = filePath;
  }
  return manuals;
}

function resolveProjectPluginPackage(pluginKey = '', engineVersion = '') {
  const spec = resolveProjectPluginSpec(pluginKey);
  if (!spec) {
    return {
      packageAvailable: false,
      packageDir: '',
      packageUpluginPath: '',
      packageVersionTag: '',
      manuals: {},
      error: 'unknown_plugin',
    };
  }
  const candidates = listProjectPluginPackageCandidates(spec.key, engineVersion);
  const seen = new Set();
  for (const candidate of candidates) {
    const packageDir = path.resolve(candidate.packageDir);
    if (seen.has(packageDir)) continue;
    seen.add(packageDir);
    const upluginPath = path.join(packageDir, spec.upluginFile);
    if (fs.existsSync(packageDir) && fs.existsSync(upluginPath)) {
      return {
        packageAvailable: true,
        packageDir,
        packageUpluginPath: upluginPath,
        packageVersionTag: candidate.versionTag || '',
        manuals: resolveProjectPluginManuals(spec, packageDir),
      };
    }
  }
  return {
    packageAvailable: false,
    packageDir: '',
    packageUpluginPath: '',
    packageVersionTag: '',
    manuals: {},
  };
}

function resolveRenderBridgePackage(engineVersion = '') {
  return resolveProjectPluginPackage(RENDER_BRIDGE_PLUGIN_NAME, engineVersion);
}

function findInstalledProjectPlugin(projectPluginsRoot = '', spec = null) {
  if (!projectPluginsRoot || !spec) return { dir: '', upluginPath: '' };
  const names = Array.from(new Set([
    spec.installFolderName,
    spec.packageName,
    spec.pluginName,
  ].map((name) => String(name || '').trim()).filter(Boolean)));
  for (const name of names) {
    const dir = path.join(projectPluginsRoot, name);
    const upluginPath = path.join(dir, spec.upluginFile);
    if (fs.existsSync(upluginPath)) return { dir, upluginPath };
  }
  return { dir: '', upluginPath: '' };
}

function resolveProjectPluginStatus(proj = {}, pluginKey = '') {
  const spec = resolveProjectPluginSpec(pluginKey);
  if (!spec) {
    return {
      ok: false,
      error: 'unknown_plugin',
      installedInProject: false,
      enabledInProject: false,
      ready: false,
    };
  }
  const up = String(proj?.uproject || proj?.projectPath || proj?.path || '').trim();
  if (!up) {
    return {
      ok: false,
      error: 'missing_uproject',
      installedInProject: false,
      enabledInProject: false,
      ready: false,
    };
  }

  const projectDir = path.resolve(path.dirname(up));
  const projectPluginsRoot = path.join(projectDir, 'Plugins');
  const projectPluginDir = path.join(projectPluginsRoot, spec.installFolderName);
  const installed = findInstalledProjectPlugin(projectPluginsRoot, spec);
  const projectInstalledPluginDir = installed.dir || '';
  const projectPluginUpluginPath = installed.upluginPath || path.join(projectPluginDir, spec.upluginFile);
  const installedInProject = !!installed.upluginPath;

  let declaredInProject = false;
  let enabledInProject = false;
  let marketplaceReference = false;
  let uprojectReadError = '';
  try {
    const parsed = readJsonFileSafe(up);
    if (Array.isArray(parsed?.Plugins)) {
      const row = parsed.Plugins.find(
        (entry) => String(entry?.Name || '').trim().toLowerCase() === spec.pluginName.toLowerCase()
      );
      declaredInProject = !!row;
      enabledInProject = row?.Enabled === true;
      marketplaceReference = !!String(row?.MarketplaceURL || '').trim();
    }
  } catch (e) {
    uprojectReadError = String(e?.message || e || '');
  }

  const packageInfo = resolveProjectPluginPackage(spec.key, proj?.engineVersion || '');
  const availableInProject = installedInProject || marketplaceReference;
  const installationSource = installedInProject
    ? 'project'
    : (marketplaceReference ? 'marketplace' : '');
  return {
    ok: true,
    key: spec.key,
    category: spec.category,
    displayName: spec.displayName,
    pluginName: spec.pluginName,
    installFolderName: spec.installFolderName,
    projectPath: up,
    projectPluginDir,
    projectInstalledPluginDir,
    projectPluginUpluginPath,
    installedInProject,
    declaredInProject,
    enabledInProject,
    marketplaceReference,
    availableInProject,
    installationSource,
    ready: availableInProject && enabledInProject,
    packageAvailable: packageInfo.packageAvailable === true,
    packageDir: packageInfo.packageDir || '',
    packageUpluginPath: packageInfo.packageUpluginPath || '',
    packageVersionTag: packageInfo.packageVersionTag || '',
    manuals: packageInfo.manuals || {},
    uprojectReadError,
  };
}

function resolveRenderBridgeProjectStatus(proj = {}) {
  return resolveProjectPluginStatus(proj, RENDER_BRIDGE_PLUGIN_NAME);
}

function enableProjectPluginInUproject(uprojectPath = '', pluginKey = '') {
  const spec = resolveProjectPluginSpec(pluginKey);
  if (!spec) return { ok: false, error: 'unknown_plugin' };
  const up = path.resolve(String(uprojectPath || '').trim());
  if (!up) return { ok: false, error: 'missing_uproject' };
  if (!fs.existsSync(up)) return { ok: false, error: 'missing_uproject' };

  let parsed = null;
  try {
    parsed = readJsonFileSafe(up);
  } catch (e) {
    return { ok: false, error: 'invalid_uproject_json', message: String(e?.message || e || '') };
  }
  if (!parsed || typeof parsed !== 'object') parsed = {};
  if (!Array.isArray(parsed.Plugins)) parsed.Plugins = [];

  let changed = false;
  const index = parsed.Plugins.findIndex(
    (entry) => String(entry?.Name || '').trim().toLowerCase() === spec.pluginName.toLowerCase()
  );
  if (index >= 0) {
    if (parsed.Plugins[index]?.Enabled !== true) {
      parsed.Plugins[index] = { ...(parsed.Plugins[index] || {}), Name: spec.pluginName, Enabled: true };
      changed = true;
    }
  } else {
    parsed.Plugins.push({ Name: spec.pluginName, Enabled: true });
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(up, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  }
  return { ok: true, changed };
}

function enableRenderBridgeInUproject(uprojectPath = '') {
  return enableProjectPluginInUproject(uprojectPath, RENDER_BRIDGE_PLUGIN_NAME);
}

function resolveProjectPluginInstallTarget(baseStatus = {}) {
  const projectPath = String(baseStatus?.projectPath || '').trim();
  if (!projectPath) return { ok: false, error: 'missing_project_path' };
  const projectPluginsRoot = path.resolve(path.join(path.dirname(projectPath), 'Plugins'));
  const projectPluginDir = path.resolve(
    baseStatus.projectInstalledPluginDir || baseStatus.projectPluginDir || ''
  );
  if (!projectPluginDir || !projectPluginDir.startsWith(projectPluginsRoot + path.sep)) {
    return { ok: false, error: 'invalid_plugin_destination', projectPluginsRoot, projectPluginDir };
  }
  return { ok: true, projectPluginsRoot, projectPluginDir };
}

function listProjectPluginStatuses(proj = {}, category = '') {
  const cat = String(category || '').trim().toLowerCase();
  return Object.values(PROJECT_PLUGIN_CATALOG)
    .filter((spec) => !cat || String(spec.category || '').trim().toLowerCase() === cat)
    .map((spec) => resolveProjectPluginStatus(proj, spec.key));
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
      const engineVersionChanged = refreshProjectEngineVersion(proj || {});
      if (engineVersionChanged) {
        try { saveProjects(pj, { onlyIfChanged: false }); } catch {}
      }
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
      if (engineVersionChanged && typeof invalidateProjectsCache === 'function') {
        invalidateProjectsCache();
      }
      return sendJSON(res, 200, {
        ok: true,
        projectId: pid,
        engineVersion: String(proj?.engineVersion || '').trim(),
        meta,
        insights,
      });
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
      const hasSyncIncluded = Object.prototype.hasOwnProperty.call(incoming, 'syncIncluded');
      const syncIncluded = hasSyncIncluded
        ? incoming.syncIncluded === true
        : prevMeta.syncIncluded === true;
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
      const hasWrcNames = Object.prototype.hasOwnProperty.call(incoming, 'wrcNames');
      const wrcNames = hasWrcNames
        ? (Array.isArray(incoming.wrcNames) ? incoming.wrcNames.map(v => String(v || '').trim()).filter(Boolean) : [])
        : (Array.isArray(prevMeta.wrcNames)
            ? prevMeta.wrcNames
            : (prevMeta.wrcName ? [String(prevMeta.wrcName).trim()].filter(Boolean) : []));
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
        syncIncluded,
        category,
        fileVersion,
        referents,
        keywords,
        note,
        wrcNames
      };
      if (hasFavorite) meta.favorite = favorite;
      writeProjectMeta(pid, meta);
      return sendJSON(res, 200, { ok: true, projectId: pid, meta });
    }
    return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
  }

  // ---- Project plugin status ----
  // GET /agent/project-plugin-status?projectId=<id|name>&plugin=<pluginKey>
  if (url.pathname === '/agent/project-plugin-status') {
    if (req.method !== 'GET') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }
    const pluginKey = String(url.searchParams.get('plugin') || '').trim();
    const spec = resolveProjectPluginSpec(pluginKey);
    if (!spec) return sendJSON(res, 400, { ok: false, error: 'unknown_plugin' });
    const pj = loadProjects();
    const q = String(url.searchParams.get('projectId') || '').trim();
    const pid = findProjectId(pj, q) || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });
    const proj = (pj.projects || []).find((p) => String(p?.id || '').trim() === pid) || null;
    const status = resolveProjectPluginStatus(proj || {}, spec.key);
    if (!status.ok) {
      return sendJSON(res, 400, { ok: false, error: status.error || 'invalid_project' });
    }
    return sendJSON(res, 200, { ok: true, projectId: pid, ...status });
  }

  // ---- Live project plugins status ----
  // GET /agent/project-live-plugins-status?projectId=<id|name>
  if (url.pathname === '/agent/project-live-plugins-status') {
    if (req.method !== 'GET') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }
    const pj = loadProjects();
    const q = String(url.searchParams.get('projectId') || '').trim();
    const pid = findProjectId(pj, q) || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });
    const proj = (pj.projects || []).find((p) => String(p?.id || '').trim() === pid) || null;
    const statuses = listProjectPluginStatuses(proj || {}, 'Live');
    const invalid = statuses.find((status) => !status.ok);
    if (invalid) {
      return sendJSON(res, 400, { ok: false, error: invalid.error || 'invalid_project' });
    }
    return sendJSON(res, 200, { ok: true, projectId: pid, plugins: statuses });
  }

  // ---- Project plugin install/update ----
  // POST /agent/project-plugin-install { projectId, plugin }
  if (url.pathname === '/agent/project-plugin-install') {
    if (req.method !== 'POST') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }
    const body = await parseBody(req);
    const spec = resolveProjectPluginSpec(body?.plugin || '');
    if (!spec) return sendJSON(res, 400, { ok: false, error: 'unknown_plugin' });
    const pj = loadProjects();
    const pid = findProjectId(pj, body?.projectId || '') || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });
    const proj = (pj.projects || []).find((p) => String(p?.id || '').trim() === pid) || null;
    const baseStatus = resolveProjectPluginStatus(proj || {}, spec.key);
    if (!baseStatus.ok) {
      return sendJSON(res, 400, { ok: false, error: baseStatus.error || 'invalid_project' });
    }
    if (!baseStatus.packageAvailable || !baseStatus.packageDir) {
      return sendJSON(res, 404, { ok: false, error: 'missing_plugin_package', plugin: spec.key });
    }

    const target = resolveProjectPluginInstallTarget(baseStatus);
    if (!target.ok) {
      return sendJSON(res, 400, { ok: false, error: target.error || 'invalid_plugin_destination' });
    }

    try {
      fs.mkdirSync(target.projectPluginsRoot, { recursive: true });
      fs.rmSync(target.projectPluginDir, { recursive: true, force: true });
      copyDirectoryRecursive(baseStatus.packageDir, target.projectPluginDir);
      const enableRes = enableProjectPluginInUproject(baseStatus.projectPath, spec.key);
      if (!enableRes.ok) {
        return sendJSON(res, 500, { ok: false, error: enableRes.error || 'enable_plugin_failed' });
      }
      if (typeof invalidateProjectsCache === 'function') invalidateProjectsCache();
      const finalStatus = resolveProjectPluginStatus(proj || {}, spec.key);
      logLine?.({
        level: 'success',
        action: 'project_plugin_install',
        message: `Plugin ${spec.pluginName} installe/mis a jour`,
        data: {
          projectId: pid,
          plugin: spec.key,
          packageDir: baseStatus.packageDir,
          projectPluginDir: target.projectPluginDir,
        },
      });
      return sendJSON(res, 200, {
        ok: true,
        projectId: pid,
        restartRequired: true,
        ...finalStatus,
      });
    } catch (e) {
      return sendJSON(res, 500, {
        ok: false,
        error: 'project_plugin_install_failed',
        plugin: spec.key,
        message: String(e?.message || e || ''),
      });
    }
  }

  // ---- Render Bridge plugin status ----
  // GET /agent/project-render-bridge-status?projectId=<id|name>
  if (url.pathname === '/agent/project-render-bridge-status') {
    if (req.method !== 'GET') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }
    const pj = loadProjects();
    const q = String(url.searchParams.get('projectId') || '').trim();
    const pid = findProjectId(pj, q) || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });
    const proj = (pj.projects || []).find((p) => String(p?.id || '').trim() === pid) || null;
    const status = resolveRenderBridgeProjectStatus(proj || {});
    if (!status.ok) {
      return sendJSON(res, 400, { ok: false, error: status.error || 'invalid_project' });
    }
    return sendJSON(res, 200, { ok: true, projectId: pid, pluginName: RENDER_BRIDGE_PLUGIN_NAME, ...status });
  }

  // ---- Render Bridge plugin install/update ----
  // POST /agent/project-render-bridge-install { projectId }
  if (url.pathname === '/agent/project-render-bridge-install') {
    if (req.method !== 'POST') {
      return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
    }
    const body = await parseBody(req);
    const pj = loadProjects();
    const pid = findProjectId(pj, body?.projectId || '') || '';
    if (!pid) return sendJSON(res, 400, { ok: false, error: 'unknown_project' });
    const proj = (pj.projects || []).find((p) => String(p?.id || '').trim() === pid) || null;
    const baseStatus = resolveRenderBridgeProjectStatus(proj || {});
    if (!baseStatus.ok) {
      return sendJSON(res, 400, { ok: false, error: baseStatus.error || 'invalid_project' });
    }
    if (!baseStatus.packageAvailable || !baseStatus.packageDir) {
      return sendJSON(res, 404, { ok: false, error: 'missing_render_bridge_package' });
    }

    const projectPluginDir = path.resolve(baseStatus.projectPluginDir || '');
    const projectPluginsRoot = path.resolve(path.join(path.dirname(baseStatus.projectPath), 'Plugins'));
    if (!projectPluginDir.startsWith(projectPluginsRoot + path.sep)) {
      return sendJSON(res, 400, { ok: false, error: 'invalid_plugin_destination' });
    }

    try {
      fs.mkdirSync(projectPluginsRoot, { recursive: true });
      fs.rmSync(projectPluginDir, { recursive: true, force: true });
      copyDirectoryRecursive(baseStatus.packageDir, projectPluginDir);
      const enableRes = enableRenderBridgeInUproject(baseStatus.projectPath);
      if (!enableRes.ok) {
        return sendJSON(res, 500, { ok: false, error: enableRes.error || 'enable_plugin_failed' });
      }
      if (typeof invalidateProjectsCache === 'function') invalidateProjectsCache();
      const finalStatus = resolveRenderBridgeProjectStatus(proj || {});
      logLine?.({
        level: 'success',
        action: 'project_render_bridge_install',
        message: 'Plugin UltiUnrealRenderBridge installe/mis a jour',
        data: {
          projectId: pid,
          packageDir: baseStatus.packageDir,
          projectPluginDir,
        },
      });
      return sendJSON(res, 200, {
        ok: true,
        projectId: pid,
        pluginName: RENDER_BRIDGE_PLUGIN_NAME,
        restartRequired: true,
        ...finalStatus,
      });
    } catch (e) {
      return sendJSON(res, 500, {
        ok: false,
        error: 'render_bridge_install_failed',
        message: String(e?.message || e || ''),
      });
    }
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

module.exports = {
  handleProjectConfigRoutes,
  ensureHttpServerBindAddress,
  PROJECT_PLUGIN_CATALOG,
  resolveProjectPluginSpec,
  resolveProjectPluginPackage,
  resolveProjectPluginStatus,
  listProjectPluginPackageCandidates,
  listProjectPluginStatuses,
  listRenderBridgePackageCandidates,
  resolveRenderBridgePackage,
  resolveEngineVersionTag,
  resolveEngineVersionTagVariants,
};
