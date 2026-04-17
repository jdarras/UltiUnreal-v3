// main/server-projects.cjs
// Gestion des données projets / layouts pour UltiUnreal Agent

const fs = require('fs');
const path = require('path');
const { getDataDir } = require('./data-path.cjs');
const { getSharedStore } = require('./server-shared-sqlite.cjs');

const DATA_DIR       = getDataDir();
const PROJECT_META_DIR = path.join(DATA_DIR, 'projects');
const projectFsCache = new Map();
const engineCache = new Map(); // path -> { mtimeMs, engine }
const metaCache = new Map();   // metaPath -> { mtimeMs, data }
const sharedStore = getSharedStore({
  dataDir: DATA_DIR,
  logLine: (entry) => {
    try {
      if (!entry || typeof entry !== 'object') return;
      if (entry.level === 'error') {
        console.error('[UltiUnreal][Agent][shared-store]', entry.message || '');
      }
    } catch {}
  },
});

function zp4(n) { const s = String(Number(n) || 0); return s.padStart(4, '0'); }
const ID_PATTERN = /^\d{4}$/;
function isValidId(v) { return ID_PATTERN.test(String(v || '').trim()); }

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

function readEngineVersionFromUproject(uprojectPath) {
  const up = String(uprojectPath || '').trim();
  if (!up) return '';
  try {
    const full = path.resolve(up);
    const st = fs.statSync(full);
    const mtimeMs = st.mtimeMs || 0;
    const cached = engineCache.get(full);
    if (cached && cached.mtimeMs === mtimeMs) return cached.engine;

    const raw = fs.readFileSync(full, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    const engine = String(parsed.EngineAssociation || '').trim();
    engineCache.set(full, { mtimeMs, engine });
    return engine;
  } catch {
    engineCache.delete(path.resolve(String(uprojectPath || '').trim()));
    return '';
  }
}

function getProjectFsInfo(uprojectPath, projectName = '') {
  const up = path.resolve(String(uprojectPath || '').trim());
  if (!up) return { mtimeMs: 0, lastModified: '', thumbPath: '' };

  try {
    const stat = fs.statSync(up);
    const mtimeMs = stat.mtimeMs || 0;
    const projectDir = path.dirname(up);
    const savedDir = path.join(projectDir, 'Saved');
    const autoDir = path.join(savedDir, 'AutoScreenshot');
    const shotsDir = path.join(savedDir, 'Screenshots');
    const nameKey = String(projectName || '').trim().toLowerCase();
    const safeStat = (p) => {
      try {
        return fs.existsSync(p) ? (fs.statSync(p).mtimeMs || 0) : 0;
      } catch {
        return 0;
      }
    };
    const dirMtimeMs = Math.max(
      safeStat(projectDir),
      safeStat(savedDir),
      safeStat(autoDir),
      safeStat(shotsDir)
    );
    const cached = projectFsCache.get(up);
    if (cached && cached.mtimeMs === mtimeMs && cached.dirMtimeMs === dirMtimeMs && cached.nameKey === nameKey) {
      return cached;
    }

    const info = {
      mtimeMs,
      dirMtimeMs,
      nameKey,
      lastModified: stat.mtime ? stat.mtime.toISOString() : '',
      thumbPath: '',
      thumbData: '',
    };

    const candidateDirs = [
      savedDir,
      path.join(savedDir, 'AutoScreenshot'),
      path.join(savedDir, 'Screenshots'),
    ];

    const preferred = [
      'AutoScreenshot.png',
      'AutoScreenshot.jpg',
      'Screenshot.png',
      'Screenshot.jpg',
    ];

    for (const dir of candidateDirs) {
      if (!fs.existsSync(dir)) continue;
      for (const fname of preferred) {
        const candidate = path.join(dir, fname);
        if (fs.existsSync(candidate)) {
          info.thumbPath = candidate;
          break;
        }
      }
      if (info.thumbPath) break;
    }

    if (!info.thumbPath) {
      for (const dir of candidateDirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs
          .readdirSync(dir, { withFileTypes: true })
          .filter(ent => ent.isFile() && /\.(png|jpe?g)$/i.test(ent.name || ''))
          .map(ent => ent.name)
          .sort();
        if (files.length > 0) {
          info.thumbPath = path.join(dir, files[0]);
          break;
        }
      }
    }

    // Fallback racine projet : <NomProjet>.png puis premier .png trouvé
    if (!info.thumbPath) {
      const upName = path.basename(up, path.extname(up));
      const safeProjectName = String(projectName || '').replace(/[\\/]+/g, '').trim();
      const preferredNames = [
        safeProjectName ? `${safeProjectName}.png` : '',
        upName ? `${upName}.png` : '',
      ].filter(Boolean);

      for (const fname of preferredNames) {
        const preferredRoot = path.join(projectDir, fname);
        if (fs.existsSync(preferredRoot)) {
          info.thumbPath = preferredRoot;
          break;
        }
      }

      if (!info.thumbPath && fs.existsSync(projectDir)) {
        const files = fs
          .readdirSync(projectDir, { withFileTypes: true })
          .filter(ent => ent.isFile() && /\.png$/i.test(ent.name || ''))
          .map(ent => ent.name)
          .sort();
        if (files.length > 0) {
          info.thumbPath = path.join(projectDir, files[0]);
        }
      }
    }

    if (info.thumbPath) {
      try {
        const buf = fs.readFileSync(info.thumbPath);
        const ext = path.extname(info.thumbPath).toLowerCase();
        const mime =
          ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : 'image/png';
        info.thumbData = `data:${mime};base64,${buf.toString('base64')}`;
      } catch {
        // ignore failed read
      }
    }

    projectFsCache.set(up, info);
    return info;
  } catch {
    projectFsCache.delete(up);
    return { mtimeMs: 0, lastModified: '', thumbPath: '', thumbData: '' };
  }
}

function loadProjects() {
  const pj = sharedStore.loadProjectsDoc();
  pj.projects = Array.isArray(pj.projects) ? pj.projects : [];

  // 1) trouver l'ID max existant (IDs = "0001" -> nombre 1)
  let maxNum = 0;
  for (const pr of pj.projects) {
    const id = String(pr?.id || '').trim();
    const n = Number(id);
    if (isValidId(id) && Number.isFinite(n) && n > maxNum) maxNum = n;
  }

  // 2) initialiser / corriger nextId à max+1
  let changed = false;
  if (!Number.isFinite(pj.nextId) || pj.nextId <= maxNum) {
    pj.nextId = maxNum + 1;
    changed = true;
  }

  // 3) récupérer la version d'Unreal si absente
  for (const pr of pj.projects) {
    if (!pr.engineVersion) {
      const eng = readEngineVersionFromUproject(pr.uproject || pr.projectPath || '');
      if (eng) {
        pr.engineVersion = eng;
        changed = true;
      }
    }
  }

  // 4) valider/corriger activeId : s'il n'existe pas, essayer via activeName
  const hasActive = pj.projects.some(p => p.id === pj.activeId);
  if (!hasActive) {
    if (typeof pj.activeName === 'string') {
      const name = pj.activeName.trim().toLowerCase();
      const m = pj.projects.find(p => String(p.name || '').trim().toLowerCase() === name);
      pj.activeId = m ? m.id : '';
    } else {
      pj.activeId = '';
    }
    changed = true;
  }

  // 5) Normaliser activeByHost : clés = IDs uniquement (conversion nom -> id si possible)
  if (pj.activeByHost && typeof pj.activeByHost === 'object') {
    const nextABH = {};
    for (const [ip, mapping] of Object.entries(pj.activeByHost)) {
      if (!mapping || typeof mapping !== 'object') continue;
      const clean = {};
      for (const [key, val] of Object.entries(mapping)) {
        const id = isValidId(key) ? key : findProjectId(pj, key);
        if (id && isValidId(id) && !clean[id]) {
          clean[id] = val;
        }
      }
      if (Object.keys(clean).length) {
        nextABH[ip] = clean;
      }
    }
    // stringify compare to avoid heavy deep equal lib
    if (JSON.stringify(nextABH) !== JSON.stringify(pj.activeByHost || {})) {
      pj.activeByHost = nextABH;
      changed = true;
    }
  }

  if (changed) {
    try { saveProjects(pj, { onlyIfChanged: false }); }
    catch (e) {
      console.error('[UltiUnreal][Agent] write projects_server.json failed', e);
    }
  }
  return pj;
}

function saveProjects(doc, { onlyIfChanged = false } = {}) {
  const payload = doc && typeof doc === 'object' ? doc : {};
  return sharedStore.saveProjectsDoc(payload, { onlyIfChanged: onlyIfChanged === true });
}

function enrichProjectForClient(p, opts = {}) {
  const out = { ...p };
  const skipFs = opts.skipFs === true;
  const skipInsights = opts.skipInsights === true;

  const normPath = (v) => String(v || '').trim();
  const up =
    (typeof out.uproject === 'string' && normPath(out.uproject)) ||
    (typeof out.projectPath === 'string' && normPath(out.projectPath)) ||
    '';

  if (!out.engineVersion) {
    out.engineVersion = readEngineVersionFromUproject(up);
  }

  // Meta (statut/type/référents/tags + thumbnailPath optionnel)
  let meta = {};
  try {
    meta = readProjectMeta(String(out.id || '').trim()) || {};
  } catch {
    meta = {};
  }

  if (meta && typeof meta === 'object') {
    const mStatus = meta.status === 'PAS' ? 'PAD' : meta.status;
    if (typeof mStatus === 'string') out.metaStatus = mStatus;
    if (typeof meta.type === 'string') out.metaType = meta.type;
    out.metaUsageMode = normalizeProjectUsageMode(meta.usageMode);
    if (typeof meta.category === 'string') out.metaCategory = meta.category;
    if (meta.fileVersion !== undefined) out.metaFileVersion = meta.fileVersion;
    if (Array.isArray(meta.keywords)) out.metaKeywords = meta.keywords;
    out.favorite = meta.favorite === true;
    if (Array.isArray(meta.wrcNames)) {
      out.wrcNames = meta.wrcNames;
    } else if (typeof meta.wrcName === 'string' && meta.wrcName.trim()) {
      out.wrcNames = [meta.wrcName.trim()];
    }
    if (meta.referents && typeof meta.referents === 'object') {
      out.metaReferents = {
        director: String(meta.referents.director || ''),
        technician: String(meta.referents.technician || ''),
        operator: String(meta.referents.operator || ''),
        journalist: String(meta.referents.journalist || ''),
      };
    }
    if (typeof meta.note === 'string' && meta.note.trim()) {
      out.note = meta.note;
    }
  }

  // Fallback pour anciens enregistrements (metaFavorite dans projects_server)
  if (out.favorite === undefined) {
    if (p && typeof p === 'object') {
      if (p.favorite !== undefined) out.favorite = p.favorite === true;
      else if (p.metaFavorite !== undefined) out.favorite = p.metaFavorite === true;
    }
  }
  if (out.wrcNames === undefined && p && typeof p === 'object') {
    if (Array.isArray(p.wrcNames)) {
      out.wrcNames = p.wrcNames;
    } else if (typeof p.wrcName === 'string' && p.wrcName.trim()) {
      out.wrcNames = [p.wrcName.trim()];
    }
  }
  if (!Array.isArray(out.wrcNames)) out.wrcNames = [];

  if (!up) return out;

  if (!skipFs) {
    const fsInfo = getProjectFsInfo(up, out.name);
    if (fsInfo.lastModified) out.lastModified = fsInfo.lastModified;
    if (fsInfo.thumbData) {
      out.thumbnail = fsInfo.thumbData;
      out.thumbnailPath = fsInfo.thumbPath || '';
    } else if (fsInfo.thumbPath) {
      out.thumbnail = fsInfo.thumbPath;
      out.thumbnailPath = fsInfo.thumbPath;
    }
  }

  // 3) Maps par défaut + liste (pour affichage rapide dans les cartes)
  if (!skipInsights) {
    try {
      const insights = extractProjectInsights(up);
      if (insights && insights.maps) {
        out.maps = insights.maps;
      }
    } catch {}
  }

  return out;
}

function findProjectId(pj, idOrName) {
  const v = String(idOrName || '').trim();
  if (!v) return '';
  if (isValidId(v) && pj.projects.some(p => p.id === v)) return v;
  const m = pj.projects.find(p => String(p.name || '').trim().toLowerCase() === v.toLowerCase());
  return m ? m.id : '';
}

function readProjectDoc(pid) {
  return sharedStore.readProjectDoc(pid);
}

function writeProjectDoc(pid, obj) {
  // Nous comparons le contenu *hors* lastSavedTs pour décider d'écrire.
  const nextObj = obj || {};
  const nextWithoutTs = { ...nextObj };
  delete nextWithoutTs.lastSavedTs;

  const prevObj = readProjectDoc(pid) || {};
  const prevWithoutTs = { ...prevObj };
  delete prevWithoutTs.lastSavedTs;
  const prevSer = JSON.stringify(prevWithoutTs || {}, null, 2);
  const nextSer = JSON.stringify(nextWithoutTs || {}, null, 2);
  // Si le contenu (hors timestamp) est strictement identique, on évite l'écriture
  if (prevSer === nextSer) return false;

  // On marque l'instant de la vraie écriture
  try {
    nextObj.lastSavedTs = new Date().toISOString();
  } catch {}

  return sharedStore.writeProjectDoc(pid, nextObj, { onlyIfChanged: true });
}

function readProjectMeta(pid) {
  if (!isValidId(pid)) return {};
  const f = path.join(PROJECT_META_DIR, `${pid}.json`);
  try {
    if (fs.existsSync(f)) {
      const st = fs.statSync(f);
      const mtimeMs = st.mtimeMs || 0;
      const cached = metaCache.get(f);
      if (cached && cached.mtimeMs === mtimeMs) return cached.data;
      const data = sharedStore.readProjectMeta(pid) || {};
      metaCache.set(f, { mtimeMs, data });
      return data;
    }
  } catch {}
  return sharedStore.readProjectMeta(pid) || {};
}

function writeProjectMeta(pid, obj) {
  if (!isValidId(pid)) return false;
  const ok = sharedStore.writeProjectMeta(pid, obj || {}, { onlyIfChanged: false });
  const f = path.join(PROJECT_META_DIR, `${pid}.json`);
  try {
    if (fs.existsSync(f)) {
      const st = fs.statSync(f);
      metaCache.set(f, { mtimeMs: st.mtimeMs || 0, data: obj || {} });
    } else {
      metaCache.delete(f);
    }
  } catch {}
  return ok;
}

function parseIniKey(filePath, key) {
  try {
    const txt = fs.readFileSync(filePath, 'utf8');
    const esc = String(key || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^\\s*${esc}\\s*=\\s*(.+)\\s*$`, 'img');
    let last = '';
    for (const m of txt.matchAll(re)) {
      if (m && m[1]) last = String(m[1]).trim();
    }
    return last;
  } catch {
    return '';
  }
}

function parseIniSectionsFromText(txt) {
  const out = {};
  const lines = String(txt || '').split(/\r?\n/);
  let section = '';

  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    if (!line) continue;
    if (line.startsWith(';') || line.startsWith('#')) continue;

    const sm = /^\[(.+)\]$/.exec(line);
    if (sm) {
      section = sm[1] || '';
      continue;
    }

    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();

    if (!out[section]) out[section] = [];
    out[section].push({ key, value });
  }

  return out;
}

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function buildUnrealAssetPathFromRelative(relativePath) {
  const normalizedRelative = toPosixPath(relativePath)
    .replace(/^\/+/, '')
    .trim();
  if (!normalizedRelative) return '';
  const withoutExt = normalizedRelative.replace(/\.[^/.\\]+$/g, '').trim();
  if (!withoutExt) return '';
  const segments = withoutExt.split('/').filter(Boolean);
  const leaf = segments[segments.length - 1] || '';
  if (!leaf) return '';
  return `/Game/${withoutExt}.${leaf}`;
}

function classifyUnrealAssetFromName(fileName = '', ext = '') {
  const normalizedExt = String(ext || '').trim().toLowerCase();
  const baseName = String(fileName || '').trim().replace(/\.[^/.\\]+$/g, '');
  const lower = baseName.toLowerCase();
  const isLevel = normalizedExt === '.umap';
  const isWrcPreset = (
    normalizedExt === '.uasset' && (
      lower.includes('remotecontrol') ||
      lower.includes('remote_control') ||
      lower.includes('wrc_preset') ||
      lower.includes('rcpreset') ||
      /\bwrc(?:_|-|\b)/.test(lower)
    )
  );
  const isSequence = (
    normalizedExt === '.uasset' && (
      lower.startsWith('ls_') ||
      lower.includes('levelsequence') ||
      lower.includes('sequence') ||
      lower.endsWith('_seq')
    )
  );
  const isPreset = (
    normalizedExt === '.uasset' && (
      lower.includes('mrg') ||
      lower.includes('mrq') ||
      lower.includes('mrc') ||
      lower.includes('moviepipeline') ||
      lower.includes('renderpreset') ||
      lower.includes('preset')
    ) &&
    !isWrcPreset
  );
  return { isLevel, isSequence, isPreset, isWrcPreset };
}

function extractProjectInsights(uprojectPath) {
  const up = String(uprojectPath || '').trim();
  if (!up || !fs.existsSync(up)) return {};
  const baseDir = path.dirname(up);
  const insights = {};

  // Plugins depuis le .uproject
  try {
    const raw = fs.readFileSync(up, 'utf8');
    const j = JSON.parse(raw || '{}');
    if (Array.isArray(j.Plugins)) {
      insights.plugins = j.Plugins.map(p => ({
        name: p?.Name || '',
        enabled: !!p?.Enabled,
        marketplace: !!p?.MarketplaceURL,
      })).filter(p => p.name);
    }
    if (Array.isArray(j.TargetPlatforms)) {
      insights.targetPlatforms = j.TargetPlatforms;
    }
  } catch {}

  // Maps par défaut via Config/DefaultEngine.ini
  try {
    const iniPath = path.join(baseDir, 'Config', 'DefaultEngine.ini');
    const iniExists = fs.existsSync(iniPath);
    const defaultGame = parseIniKey(iniPath, 'GameDefaultMap');
    const defaultEditor = parseIniKey(iniPath, 'EditorStartupMap');
    insights.maps = {
      defaultGame,
      defaultEditor,
    };
    let httpBindAddress = '';

    // Project Version (Project Settings > Description > Project Version) depuis DefaultGame.ini
    try {
      const gameIniPath = path.join(baseDir, 'Config', 'DefaultGame.ini');
      const txt = fs.readFileSync(gameIniPath, 'utf8');
      const sections = parseIniSectionsFromText(txt);
      const gp = sections['/Script/EngineSettings.GeneralProjectSettings'] || [];
      const pv = [...gp].reverse().find(e => String(e.key || '') === 'ProjectVersion');
      if (pv && pv.value !== undefined) {
        insights.projectVersion = String(pv.value || '').trim();
      }
    } catch {}

    // Setup Unreal / Video Production (whitelist)
    if (iniExists) {
      const txt = fs.readFileSync(iniPath, 'utf8');
      const sec = parseIniSectionsFromText(txt);

      const httpSec = sec['HTTPServer.Listeners'] || [];
      const httpBind = [...httpSec]
        .reverse()
        .find(e => String(e.key || '') === 'DefaultBindAddress');
      if (httpBind && httpBind.value !== undefined) {
        httpBindAddress = String(httpBind.value || '').trim();
      }

      // Setup Unreal (read-only) : Renderer + Platform/RHI/Shader Model
      const rendererSec = sec['/Script/Engine.RendererSettings'] || [];
      const renderer = rendererSec
        .filter(e => String(e.key || '').startsWith('r.'))
        .map(e => ({ key: String(e.key || ''), value: String(e.value || '') }));

      const winSec = sec['/Script/WindowsTargetPlatform.WindowsTargetSettings'] || [];
      const windows = winSec
        .filter(e => {
          const k = String(e.key || '');
          return (
            k === 'DefaultGraphicsRHI' ||
            k === 'Compiler' ||
            /^[-+]?D3D(11|12)TargetedShaderFormats$/i.test(k.replace(/^[-+]/, '')) ||
            /^[-+]?D3D(11|12)TargetedShaderFormats$/i.test(k)
          );
        })
        .map(e => ({ key: String(e.key || ''), value: String(e.value || '') }));

      const linuxSec = sec['/Script/LinuxTargetPlatform.LinuxTargetSettings'] || [];
      const linux = linuxSec
        .filter(e => /^[-+]?TargetedRHIs$/i.test(String(e.key || '').replace(/^[-+]/, '')))
        .map(e => ({ key: String(e.key || ''), value: String(e.value || '') }));

      const macSec = sec['/Script/MacTargetPlatform.MacTargetSettings'] || [];
      const mac = macSec
        .filter(e => /^[-+]?TargetedRHIs$/i.test(String(e.key || '').replace(/^[-+]/, '')))
        .map(e => ({ key: String(e.key || ''), value: String(e.value || '') }));

      const hwSec = sec['/Script/HardwareTargeting.HardwareTargetingSettings'] || [];
      const hardware = hwSec
        .filter(e => {
          const k = String(e.key || '');
          return k === 'TargetedHardwareClass' || k === 'DefaultGraphicsPerformance';
        })
        .map(e => ({ key: String(e.key || ''), value: String(e.value || '') }));

      if (renderer.length || windows.length || linux.length || mac.length || hardware.length) {
        insights.setupUnreal = {
          renderer,
          platform: { windows, linux, mac, hardware },
        };
      }

      // Setup Video Production : cadence + timecode/genlock (partially editable in UI)
      const engineSec = sec['/Script/Engine.Engine'] || [];
      const pick = (k) => {
        const match = [...engineSec].reverse().find(e => String(e.key || '') === k);
        return match ? String(match.value || '') : '';
      };

      const cadence = {
        MinDesiredFrameRate: pick('MinDesiredFrameRate'),
        bSmoothFrameRate: pick('bSmoothFrameRate'),
        SmoothedFrameRateRange: pick('SmoothedFrameRateRange'),
        bUseFixedFrameRate: pick('bUseFixedFrameRate'),
        FixedFrameRate: pick('FixedFrameRate'),
      };
      const timecode = {
        GenerateDefaultTimecodeFrameRate: pick('GenerateDefaultTimecodeFrameRate'),
        TimecodeProviderClassName: pick('TimecodeProviderClassName'),
        CustomTimeStepClassName: pick('CustomTimeStepClassName'),
      };

      const animSec = sec['/Script/Engine.AnimationSettings'] || [];
      const animPick = (k) => {
        const match = [...animSec].reverse().find(e => String(e.key || '') === k);
        return match ? String(match.value || '') : '';
      };
      const sequenceSec = sec['/Script/LevelSequence.LevelSequenceProjectSettings'] || [];
      const seqPick = (k) => {
        const match = [...sequenceSec].reverse().find(e => String(e.key || '') === k);
        return match ? String(match.value || '') : '';
      };

      const video = {
        cadence,
        timecode,
        animation: { DefaultFrameRate: animPick('DefaultFrameRate') },
        levelSequence: { DefaultDisplayRate: seqPick('LevelSequence.DefaultDisplayRate') },
      };

      const hasVideo =
        Object.values(video.cadence).some(Boolean) ||
        Object.values(video.timecode).some(Boolean) ||
        Object.values(video.animation).some(Boolean) ||
        Object.values(video.levelSequence).some(Boolean);

      if (hasVideo) {
        insights.setupVideoProduction = video;
      }
    }

    insights.httpServer = {
      iniExists: !!iniExists,
      bindAddress: httpBindAddress
    };
  } catch {}

  // Catalogue Unreal (maps + sequences + presets de rendu)
  try {
    const contentDir = path.join(baseDir, 'Content');
    const mapList = [];
    const sequenceList = [];
    const presetList = [];
    const wrcPresetList = [];
    const seenMap = new Set();
    const seenSequence = new Set();
    const seenPreset = new Set();
    const seenWrcPreset = new Set();
    const stack = [contentDir];
    let scannedFiles = 0;
    while (stack.length) {
      const dir = stack.pop();
      if (!dir || !fs.existsSync(dir)) continue;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          stack.push(full);
          continue;
        }
        if (!ent.isFile()) continue;
        scannedFiles += 1;
        const ext = String(path.extname(ent.name || '') || '').trim().toLowerCase();
        if (ext !== '.umap' && ext !== '.uasset') continue;
        const rel = toPosixPath(path.relative(contentDir, full)).replace(/^\/+/, '');
        if (!rel) continue;
        const assetPath = buildUnrealAssetPathFromRelative(rel);
        const name = String(ent.name || '').replace(/\.[^/.\\]+$/g, '').trim();
        const classified = classifyUnrealAssetFromName(ent.name, ext);

        if (classified.isLevel) {
          const key = String(rel || '').toLowerCase();
          if (!seenMap.has(key)) {
            seenMap.add(key);
            mapList.push(rel);
          }
        }
        if (classified.isSequence && assetPath) {
          const key = assetPath.toLowerCase();
          if (!seenSequence.has(key)) {
            seenSequence.add(key);
            sequenceList.push({
              name,
              assetPath,
              relativePath: rel,
            });
          }
        }
        if (classified.isPreset && assetPath) {
          const key = assetPath.toLowerCase();
          if (!seenPreset.has(key)) {
            seenPreset.add(key);
            presetList.push({
              name,
              assetPath,
              relativePath: rel,
            });
          }
        }
        if (classified.isWrcPreset && assetPath) {
          const key = assetPath.toLowerCase();
          if (!seenWrcPreset.has(key)) {
            seenWrcPreset.add(key);
            wrcPresetList.push({
              name,
              assetPath,
              relativePath: rel,
            });
          }
        }
      }
    }
    if (mapList.length) {
      insights.maps = { ...(insights.maps || {}), list: mapList };
    }
    if (sequenceList.length) {
      sequenceList.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
      insights.sequences = { list: sequenceList };
    }
    if (presetList.length) {
      presetList.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
      insights.renderPresets = { list: presetList };
    }
    if (wrcPresetList.length) {
      wrcPresetList.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
      insights.wrcPresets = { list: wrcPresetList };
    }
    insights.renderCatalogStats = {
      scannedFiles,
    };
  } catch {}

  // Snapshots (Saved/Screenshots/**)
  try {
    const shotsRoot = path.join(baseDir, 'Saved', 'Screenshots');
    if (fs.existsSync(shotsRoot)) {
      const items = [];
      const stack = [shotsRoot];
      while (stack.length) {
        const dir = stack.pop();
        if (!dir) continue;
        let entries = [];
        try {
          entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const ent of entries) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory()) {
            stack.push(full);
          } else if (ent.isFile() && /\.(png|jpe?g)$/i.test(ent.name || '')) {
            try {
              const st = fs.statSync(full);
              items.push({
                rel: path.relative(shotsRoot, full).replace(/\\/g, '/'),
                path: full,
                mtime: st && st.mtime ? st.mtime.toISOString() : '',
                mtimeMs: st && typeof st.mtimeMs === 'number' ? st.mtimeMs : 0,
              });
            } catch {
              // ignore
            }
          }
        }
      }

      if (items.length) {
        items.sort((a, b) => (b.mtimeMs || 0) - (a.mtimeMs || 0));
        const maxItems = 60;
        insights.snapshots = {
          root: shotsRoot,
          items: items.slice(0, maxItems).map(({ mtimeMs, ...rest }) => rest),
        };
      } else {
        insights.snapshots = { root: shotsRoot, items: [] };
      }
    }
  } catch {}

  return insights;
}

function deleteProjectMeta(id) {
  const pid = String(id || '').trim();
  if (!isValidId(pid)) return;
  try { sharedStore.deleteProjectMeta(pid); } catch {}
  const metaFile = path.join(PROJECT_META_DIR, `${pid}.json`);
  try {
    if (fs.existsSync(metaFile)) fs.unlinkSync(metaFile);
  } catch {
    // ignore
  }
}

function deleteProjectDoc(id) {
  const pid = String(id || '').trim();
  if (!isValidId(pid)) return;
  try { sharedStore.deleteProjectDoc(pid); } catch {}
}

// ---------------------------------------------------------------------------
// Verrou de projet (open lock) + source d'autorité
// ---------------------------------------------------------------------------

function setProjectLock(projectId, hostIp, hostName) {
  const pid = String(projectId || '').trim();
  if (!isValidId(pid)) return false;
  const ip   = String(hostIp   || '').trim();
  const name = String(hostName || '').trim();
  if (!ip) return false;

  const pj = loadProjects();
  const projects = Array.isArray(pj.projects) ? pj.projects : [];
  const idx = projects.findIndex(p => p && p.id === pid);
  if (idx === -1) return false;

  projects[idx] = {
    ...projects[idx],
    lockedByHostIp:   ip,
    lockedByHostName: name,
    lockedAt:         new Date().toISOString(),
  };
  pj.projects = projects;
  saveProjects(pj, { onlyIfChanged: false });
  return true;
}

function clearProjectLock(projectId) {
  const pid = String(projectId || '').trim();
  if (!isValidId(pid)) return false;

  const pj = loadProjects();
  const projects = Array.isArray(pj.projects) ? pj.projects : [];
  const idx = projects.findIndex(p => p && p.id === pid);
  if (idx === -1) return false;

  const p = { ...projects[idx] };
  delete p.lockedByHostIp;
  delete p.lockedByHostName;
  delete p.lockedAt;
  projects[idx] = p;
  pj.projects = projects;
  saveProjects(pj, { onlyIfChanged: false });
  return true;
}

function clearProjectLockByIp(hostIp) {
  const ip = String(hostIp || '').trim();
  if (!ip) return false;

  const pj = loadProjects();
  const projects = Array.isArray(pj.projects) ? pj.projects : [];
  let changed = false;
  for (let i = 0; i < projects.length; i++) {
    if (projects[i] && String(projects[i].lockedByHostIp || '').trim() === ip) {
      const p = { ...projects[i] };
      delete p.lockedByHostIp;
      delete p.lockedByHostName;
      delete p.lockedAt;
      projects[i] = p;
      changed = true;
    }
  }
  if (!changed) return false;
  pj.projects = projects;
  saveProjects(pj, { onlyIfChanged: false });
  return true;
}

function setProjectSource(projectId, hostIp) {
  const pid = String(projectId || '').trim();
  if (!isValidId(pid)) return false;
  const ip = String(hostIp || '').trim();
  if (!ip) return false;

  const pj = loadProjects();
  const projects = Array.isArray(pj.projects) ? pj.projects : [];
  const idx = projects.findIndex(p => p && p.id === pid);
  if (idx === -1) return false;

  projects[idx] = { ...projects[idx], sourceHostIp: ip };
  pj.projects = projects;
  saveProjects(pj, { onlyIfChanged: false });
  return true;
}

function isProjectLocked(projectId) {
  const pid = String(projectId || '').trim();
  if (!isValidId(pid)) return { locked: false, byIp: '', byName: '' };

  const pj = loadProjects();
  const projects = Array.isArray(pj.projects) ? pj.projects : [];
  const p = projects.find(pr => pr && pr.id === pid);
  if (!p) return { locked: false, byIp: '', byName: '' };

  const byIp = String(p.lockedByHostIp || '').trim();
  return {
    locked: Boolean(byIp),
    byIp,
    byName: String(p.lockedByHostName || '').trim(),
  };
}

module.exports = {
  loadProjects,
  saveProjects,
  enrichProjectForClient,
  findProjectId,
  readProjectDoc,
  writeProjectDoc,
  zp4,
  isValidId,
  readEngineVersionFromUproject,
  readProjectMeta,
  writeProjectMeta,
  extractProjectInsights,
  deleteProjectMeta,
  deleteProjectDoc,
  setProjectLock,
  clearProjectLock,
  clearProjectLockByIp,
  setProjectSource,
  isProjectLocked,
};
