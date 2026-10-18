// main/main.cjs — Electron + Agent HTTP (clean, sans uu_ ni local_agent.json)
const { app, BrowserWindow, ipcMain, dialog, Menu, clipboard, nativeImage, protocol } = require('electron');

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'uu-media', privileges: { secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
]);

const path   = require('path');
const fs     = require('fs');
const http   = require('http');
const https  = require('https');
const os     = require('os');
const { spawn, execFile } = require('child_process'); 
const { pathToFileURL } = require('url');
const i18nFr = require('../app/i18n/fr.json');
const i18nEn = require('../app/i18n/en.json');
const { setProcessDataDir } = require('./data-path.cjs');
const { getSharedStore } = require('./server-shared-sqlite.cjs');
const {
  normalizeExportDestinationEntries,
} = require('./server-postprod-export-destinations.cjs');
const fabAuth = require('./fab-auth.cjs');
const {
  formatPidFileContent,
  readRenderPidStatus,
  listSystemProcesses,
  readSystemProcessStartMs,
  terminateOwnedRenderProcess,
} = require('./render-process-control.cjs');
const {
  SUPERVISOR_SCRIPT,
  createRenderJobStore,
  runSupervisorRelay,
} = require('./render-job-supervisor.cjs');
const {
  validateExternalTarget,
  validateHttpTarget,
  isAllowedRendererNavigation,
} = require('./ipc-security.cjs');

const VERSION = '2026.3';
const APP_AUTHOR  = 'Julien Darras';
const APP_CONTACT = 'contact@jdarrasvp.fr - www.jdarrasvp.fr';
const APP_ICON = path.join(__dirname, '..', 'app', 'assets', 'icon.png');

// ----------------------------- FICHIERS DATA -----------------------------
const DATA_DIR       = setProcessDataDir();
const COMMON_FILE    = path.join(DATA_DIR, 'common_server.json');
const HOSTS_FILE     = path.join(DATA_DIR, 'hosts_server.json');
const PROJECTS_FILE  = path.join(DATA_DIR, 'projects_server.json');
const PRODUCTION_DIR = path.join(DATA_DIR, 'production');
const PROJECT_META_DIR = path.join(DATA_DIR, 'projects');
const sharedStore = getSharedStore({ dataDir: DATA_DIR });

const DEFAULT_COMMON = {
  agentPort: 4000,
  rcHttpPort: 30010,
  rcWsPort: 30020,
  refreshSec: 5,
  logWarnLines: 1500,
  logHardLimitLines: 2000,
  unrealVersions: [],
  launchMode: 'production',
  allowStartDesynced: false,
  proxyEnabled: false,
  proxyResolution: 50,
  proxyCrf: 23,
  renderExportDestinations: [],
};
const DEFAULT_HOSTS = {};
const DEFAULT_PROJECTS = {
  projects: [],
  nextId: 1,
  activeId: '',
  activeName: '',
  activeByHost: {},
};

let agentStarted = false;
let mainWindow = null;
let isQuitting = false;

// Empêche de lancer plusieurs instances (évite conflit de port agent)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      try {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      } catch {}
    }
  });
}

function getLocaleStrings() {
  try {
    const locale = String(app.getLocale?.() || '').toLowerCase();
    if (locale.startsWith('en')) return i18nEn;
    return i18nFr;
  } catch {
    return i18nFr;
  }
}

async function _getLocaleStringsAsync() {
  try {
    if (mainWindow && mainWindow.webContents) {
      const lang = await mainWindow.webContents.executeJavaScript(`
        (function() {
          try {
            const raw = localStorage.getItem('uu_identity') || '{}';
            const parsed = JSON.parse(raw);
            return String(parsed.lang || '').trim();
          } catch { return ''; }
        })();
      `);
      if (String(lang || '').toLowerCase().startsWith('en')) return i18nEn;
      if (lang) return i18nFr;
    }
  } catch {}
  return getLocaleStrings();
}

ipcMain.handle('start-agent', async (_evt, port) => {
  if (agentStarted) {
    return true; // déjà lancé
  }

  try {
    // On dit à server.cjs sur quel port écouter
    process.env.UU_AGENT_PORT = String(port);

    // On le lance DANS le même process (pas de node externe)
    require(path.join(__dirname, 'server.cjs'));

    agentStarted = true;
    return true;
  } catch (e) {
    console.error('Erreur au démarrage de l’agent :', e);
    return { ok: false, error: e?.message || String(e) };
  }
});

function resolveExistingPathOrParent(inputPath = '') {
  const preferredPath = String(inputPath || '').trim();
  if (!preferredPath) return '';
  try {
    const normalized = path.normalize(preferredPath.replace(/\//g, path.sep));
    if (fs.existsSync(normalized)) {
      return normalized;
    }
    const parent = path.dirname(normalized);
    if (parent && fs.existsSync(parent)) return parent;
  } catch {}
  return '';
}

function resolveUnrealEditorDialogDefaultPath(preferredPath = '') {
  const preferredLocation = resolveExistingPathOrParent(preferredPath);
  if (preferredLocation) return preferredLocation;

  const fallbackDirs = [
    'C:\\Program Files\\Epic Games\\',
    'D:\\Epic\\UE_5.7\\Engine\\Binaries\\',
  ];
  for (const dir of fallbackDirs) {
    try {
      if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) return dir;
    } catch {}
  }

  try {
    return app.getPath('downloads');
  } catch {
    return '';
  }
}

ipcMain.handle('open-executable', async (_evt, opts = {}) => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;
  const preferredPath =
    typeof opts === 'string'
      ? opts
      : (opts && typeof opts === 'object' ? opts.defaultPath : '');
  const defaultPath = resolveUnrealEditorDialogDefaultPath(preferredPath);
  const result = await dialog.showOpenDialog(win, {
    title: 'Choisir UnrealEditor.exe',
    properties: ['openFile'],
    filters: [{ name: 'Exécutables', extensions: ['exe'] }],
    defaultPath: defaultPath || undefined,
  });
  if (result.canceled || !result.filePaths?.[0]) return null;
  return result.filePaths[0];
});

function ensureJsonFile(filePath, payload) {
  if (fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, JSON.stringify(payload || {}, null, 2), 'utf8');
}

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  ensureJsonFile(COMMON_FILE, DEFAULT_COMMON);
  ensureJsonFile(HOSTS_FILE, DEFAULT_HOSTS);
  ensureJsonFile(PROJECTS_FILE, DEFAULT_PROJECTS);
  // Migration douce: si la clé n'existe pas encore, on force la valeur par défaut à false.
  try {
    const commonRaw = readJson(COMMON_FILE, {}) || {};
    const next = { ...commonRaw };
    let changed = false;
    if (typeof next.allowStartDesynced !== 'boolean') {
      next.allowStartDesynced = false;
      changed = true;
    }
    if (typeof next.proxyEnabled !== 'boolean') {
      next.proxyEnabled = false;
      changed = true;
    }
    const proxyResolution = Number(next.proxyResolution);
    if (!Number.isFinite(proxyResolution) || ![25, 50, 75].includes(Math.trunc(proxyResolution))) {
      next.proxyResolution = 50;
      changed = true;
    } else {
      next.proxyResolution = Math.trunc(proxyResolution);
    }
    const proxyCrf = Number(next.proxyCrf);
    if (!Number.isFinite(proxyCrf) || ![18, 23, 28].includes(Math.trunc(proxyCrf))) {
      next.proxyCrf = 23;
      changed = true;
    } else {
      next.proxyCrf = Math.trunc(proxyCrf);
    }
    if (!Object.prototype.hasOwnProperty.call(next, 'renderExportDestinations')) {
      if (Object.prototype.hasOwnProperty.call(next, 'render_export_destinations')) {
        next.renderExportDestinations = next.render_export_destinations;
      } else {
        next.renderExportDestinations = [];
      }
      changed = true;
    }
    const normalizedRenderExportDestinations = normalizeExportDestinationEntries(
      next.renderExportDestinations,
      []
    );
    if (JSON.stringify(normalizedRenderExportDestinations) !== JSON.stringify(next.renderExportDestinations || [])) {
      next.renderExportDestinations = normalizedRenderExportDestinations;
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(next, 'render_export_destinations')) {
      delete next.render_export_destinations;
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(COMMON_FILE, JSON.stringify(next, null, 2), 'utf8');
    }
  } catch {}
  if (!fs.existsSync(PRODUCTION_DIR)) fs.mkdirSync(PRODUCTION_DIR, { recursive: true });
  if (!fs.existsSync(PROJECT_META_DIR)) fs.mkdirSync(PROJECT_META_DIR, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const t = fs.readFileSync(file, 'utf-8');
    return JSON.parse(t || 'null') ?? fallback;
  } catch { return fallback; }
}

function decodeFileUrlToPath(fileUrl = '') {
  const raw = String(fileUrl || '').trim();
  if (!raw || !/^file:\/\//i.test(raw)) return '';
  try {
    const parsed = new URL(raw);
    let pathname = decodeURIComponent(String(parsed.pathname || ''));
    if (process.platform === 'win32' && /^\/[a-zA-Z]:/.test(pathname)) {
      pathname = pathname.slice(1);
    }
    return path.normalize(pathname);
  } catch {
    return '';
  }
}

async function loadNativeImageFromSource(source = '') {
  const raw = String(source || '').trim();
  if (!raw) return null;
  if (/^data:image\//i.test(raw)) {
    try {
      const img = nativeImage.createFromDataURL(raw);
      if (!img.isEmpty()) return img;
    } catch {}
  }

  const localPath = (() => {
    if (/^file:\/\//i.test(raw)) return decodeFileUrlToPath(raw);
    return path.normalize(raw.replace(/\//g, path.sep));
  })();
  if (localPath) {
    try {
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const fromPath = nativeImage.createFromPath(localPath);
        if (!fromPath.isEmpty()) return fromPath;
        const fromBuffer = nativeImage.createFromBuffer(fs.readFileSync(localPath));
        if (!fromBuffer.isEmpty()) return fromBuffer;
      }
    } catch {}
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const res = await fetch(raw, { method: 'GET' });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        const fromRemote = nativeImage.createFromBuffer(buffer);
        if (!fromRemote.isEmpty()) return fromRemote;
      }
    } catch {}
  }
  return null;
}

async function copyImageSourceToClipboard(source = '') {
  const raw = String(source || '').trim();
  if (!raw) return { ok: false, error: 'missing_source' };
  const img = await loadNativeImageFromSource(raw);
  if (img && !img.isEmpty()) {
    clipboard.writeImage(img);
    return { ok: true };
  }
  try {
    clipboard.writeText(raw);
    return { ok: false, error: 'image_unavailable', fallback: 'text' };
  } catch {
    return { ok: false, error: 'image_unavailable' };
  }
}

function getAgentPort() {
  const common = readJson(path.join(DATA_DIR, 'common_server.json')) || {};
  const n = Number(common?.agentPort || 4000);
  return Number.isFinite(n) && n > 0 ? n : 4000;
}

async function postQuitAgent({ purge = true } = {}) {
  const port = getAgentPort();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 1500);
  try {
    await fetch(`http://127.0.0.1:${port}/agent/quit`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ purge }),
      signal: ctrl.signal
    });
  } catch {
    // on ignore les erreurs réseau ici
  } finally {
    clearTimeout(t);
  }
}

async function reallyQuit() {
  if (isQuitting) return;
  isQuitting = true;
  await postQuitAgent({ purge: false });
  app.quit();
}

// IPs locales (pour /agent/ping)
function getLocalIPv4List(opts = {}) {
  const mode = String(opts?.mode || '').trim().toLowerCase();
  const ethernetOnly = mode === 'ethernet' || !!opts?.ethernetOnly;
  const wifiOnly = mode === 'wifi' || !!opts?.wifiOnly;
  const out = [];
  const seen = new Set();
  const ifs = os.networkInterfaces() || {};
  const ethernetRe = /^(ethernet|local area connection|lan|eth|enp|eno|enx|em|p\d+p\d+|en\d+)/i;
  const wifiRe = /(wi-?fi|wlan|wireless|airport)/i;
  for (const k of Object.keys(ifs)) {
    const name = String(k || '').trim();
    if (wifiOnly) {
      if (!name || !wifiRe.test(name)) continue;
    } else if (ethernetOnly) {
      if (!name || wifiRe.test(name) || !ethernetRe.test(name)) continue;
    }
    for (const i of ifs[k] || []) {
      const fam = i && i.family;
      if ((fam === 'IPv4' || fam === 4) && !i.internal && i.address) {
        const addr = String(i.address).trim();
        if (!addr || seen.has(addr)) continue;
        seen.add(addr);
        out.push(addr);
      }
    }
  }
  return out.sort();
}

// ----------------------------- FENÊTRE UI -----------------------------
const isDev = !!process.env.VITE_DEV;

function createWindow() {
  const windowIcon = fs.existsSync(APP_ICON) ? APP_ICON : undefined;
  const devUrl = 'http://localhost:5173';
  const prodFile = path.join(__dirname, '..', 'dist', 'index.html');
  const allowedNavigationUrls = [isDev ? devUrl : pathToFileURL(prodFile).toString()];

  // ✅ utiliser la variable globale mainWindow (déclarée plus haut)
  mainWindow = new BrowserWindow({
    width: 1600, height: 1100, minWidth: 1100, minHeight: 800,
    backgroundColor: '#0f1216',
    show: true,
    icon: windowIcon,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  });

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (isAllowedRendererNavigation(targetUrl, allowedNavigationUrls)) return;
    event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  if (isDev) mainWindow.loadURL(devUrl);
  else       mainWindow.loadFile(prodFile);

  // Raccourci DevTools explicite (menu global désactivé plus bas).
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = String(input?.key || '').toLowerCase();
    const isMacToggle = process.platform === 'darwin' && input.meta && input.alt && key === 'i';
    const isWinToggle = process.platform !== 'darwin' && input.control && input.shift && key === 'i';
    const isF12 = key === 'f12';
    if (!isMacToggle && !isWinToggle && !isF12) return;

    event.preventDefault();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // ✅ accrocher le handler ici, sur mainWindow
  mainWindow.on('close', (e) => {
    if (isQuitting) return;      // on laisse passer si déjà en sortie
    e.preventDefault();
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:quit-requested');
        return;
      }
    } catch {}
    Promise.resolve().then(reallyQuit).catch(() => {});
  });
}

// ----------------------------- IPC PRELOAD -----------------------------
ipcMain.handle('get-local-ips', async (_evt, opts = {}) => {
  return getLocalIPv4List(opts);
});

ipcMain.handle('choose-uproject', async (_evt, opts = {}) => {
  const fallbackPath = app.getPath('downloads');
  const preferredPath = typeof opts === 'string'
    ? opts
    : (opts && typeof opts === 'object' ? opts.defaultPath : '');
  const defaultPath = String(preferredPath || '').trim() || fallbackPath;
  const result = await dialog.showOpenDialog({
    title: 'Sélectionne un projet Unreal (.uproject)',
    properties: ['openFile'],
    filters: [{ name: 'Unreal Project', extensions: ['uproject'] }],
    defaultPath
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return { file: result.filePaths[0] };
});

ipcMain.handle('choose-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choisir un dossier racine',
    properties: ['openDirectory', 'createDirectory']
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return null;
  }

  // On renvoie le chemin du dossier sélectionné
  return filePaths[0];
});

ipcMain.handle(
  'choose-file',
  async (_evt, { title = 'Choisir un fichier', filters = null, defaultPath = '' } = {}) => {
    const preferredPath = String(defaultPath || '').trim();
    let resolvedDefaultPath = '';
    if (preferredPath) {
      try {
        // Normalise pour Windows (chemins stockés en slash dans les layouts).
        const normalized = path.normalize(preferredPath.replace(/\//g, path.sep));
        if (fs.existsSync(normalized)) {
          const st = fs.statSync(normalized);
          resolvedDefaultPath = st.isDirectory() ? normalized : path.dirname(normalized);
        } else {
          const parent = path.dirname(normalized);
          if (parent && fs.existsSync(parent)) {
            resolvedDefaultPath = parent;
          }
        }
        if (!resolvedDefaultPath) resolvedDefaultPath = normalized;
      } catch {
        resolvedDefaultPath = preferredPath;
      }
    }
    const result = await dialog.showOpenDialog({
      title,
      properties: ['openFile'],
      filters: Array.isArray(filters) && filters.length ? filters : undefined,
      defaultPath: resolvedDefaultPath || undefined,
    });
    if (result.canceled || !result.filePaths?.length) return null;
    return result.filePaths[0];
  }
);

ipcMain.handle('read-file-dataurl', async (_evt, filePath) => {
  try {
    const p = String(filePath || '').trim();
    if (!p) return null;
    const ext = path.extname(p).toLowerCase();
    const mime =
      ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.png'
          ? 'image/png'
          : ext === '.tga'
            ? 'image/x-tga'
            : '';
    if (!mime) return null;
    const buf = fs.readFileSync(p);
    if (!buf || !buf.length) return null;
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
});

ipcMain.handle('read-file-text', async (_evt, filePath) => {
  try {
    const p = String(filePath || '').trim();
    if (!p) return null;
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    console.error('read-file-text failed', e);
    return null;
  }
});

ipcMain.handle('copy-image-to-clipboard', async (_evt, source) => {
  return await copyImageSourceToClipboard(source);
});

ipcMain.handle('show-image-context-menu', async (evt, payload = {}) => {
  const source = typeof payload === 'string'
    ? payload
    : String(payload?.source || payload?.src || '').trim();
  const win = BrowserWindow.fromWebContents(evt.sender) || BrowserWindow.getFocusedWindow() || null;
  const menu = Menu.buildFromTemplate([
    {
      label: "Copier l'image",
      click: () => {
        void copyImageSourceToClipboard(source);
      },
    },
  ]);
  menu.popup({ window: win || undefined });
  return { ok: true };
});

async function clearFabSessionCookies() {
  const sess = fabAuth.getAuthSession();
  if (!sess || !sess.cookies) return;
  try {
    const list = await sess.cookies.get({ url: 'https://www.fab.com' });
    await Promise.all(
      list.map((cookie) => {
        const domain = String(cookie?.domain || 'www.fab.com').replace(/^\./, '') || 'www.fab.com';
        const protocol = cookie?.secure ? 'https://' : 'http://';
        const url = `${protocol}${domain}${cookie?.path || '/'}`;
        return sess.cookies.remove(url, cookie.name).catch(() => {});
      })
    );
  } catch {}
}

async function openFabLoginWindow() {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = async (reason) => {
      if (resolved) return;
      resolved = true;
      const connected = await checkFabLoggedIn();
      resolve({ ok: true, connected, reason });
    };

    const windowIcon = fs.existsSync(APP_ICON) ? APP_ICON : undefined;
    const win = new BrowserWindow({
      width: 1200,
      height: 900,
      backgroundColor: '#0f1216',
      icon: windowIcon,
      webPreferences: {
        partition: fabAuth.AUTH_PARTITION,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    win.on('closed', () => finish('closed'));

    win.webContents.on('did-navigate', async (_evt, url) => {
      if (String(url || '').includes('/library')) {
        const connected = await checkFabLoggedIn();
        if (connected) {
          finish('logged-in');
          if (!win.isDestroyed()) win.close();
        }
      }
    });

    win.loadURL('https://www.fab.com/login?redirect=/library');
  });
}

async function checkFabLoggedIn() {
  try {
    await fabAuth.refreshCookiesFromSession();
    const sess = fabAuth.getAuthSession && fabAuth.getAuthSession();
    if (!sess || typeof sess.fetch !== 'function') {
      return false;
    }
    const res = await sess.fetch('https://www.fab.com/i/users/me', {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      credentials: 'include',
      referrer: 'https://www.fab.com/library',
    });
    if (!res.ok) return false;
    const text = await res.text();
    const data = JSON.parse(text || '{}');
    return !!data?.displayName;
  } catch {
    return false;
  }
}

ipcMain.handle('fab-auth-status', async () => {
  const connected = await checkFabLoggedIn();
  return { ok: true, connected };
});

ipcMain.handle('fab-login', async () => {
  const connected = await checkFabLoggedIn();
  if (connected) {
    return { ok: true, connected: true, reused: true };
  }
  return await openFabLoginWindow();
});

ipcMain.handle('fab-logout', async () => {
  await clearFabSessionCookies();
  fabAuth.clearCookies();
  return { ok: true, connected: false };
});

ipcMain.handle('load-projects', async () => {
  const j = sharedStore.loadProjectsDoc();
  return { ok: true, ...j };
});

ipcMain.handle('save-projects', async (_evt, { projects, activeByHost, activeName }) => {
  const cur = sharedStore.loadProjectsDoc();
  const out = {
    projects: Array.isArray(projects) ? projects : [],
    activeByHost: (activeByHost && typeof activeByHost === 'object') ? activeByHost : (cur.activeByHost || {}),
    activeName: typeof activeName === 'string' ? activeName : (cur.activeName || '')
  };
  sharedStore.saveProjectsDoc(out, { onlyIfChanged: false });
  return { ok: true };
});

ipcMain.handle('export-file', async (_evt, { defaultName = 'logs.json', content = '', filters = null } = {}) => {
  try {
    const defPath = path.join(app.getPath('downloads'), defaultName);
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exporter',
      defaultPath: defPath,
      filters: Array.isArray(filters) && filters.length
        ? filters
        : [
            { name: 'JSON', extensions: ['json'] },
            { name: 'Texte', extensions: ['txt'] },
          ],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };
    fs.writeFileSync(filePath, content ?? '', 'utf8');
    return { ok: true, filePath };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle('open-external', async (_evt, targetUrl) => {
  try {
    const validated = validateExternalTarget(targetUrl);
    if (!validated.ok) return { ok: false, error: validated.error };
    const { shell } = require('electron');
    await shell.openExternal(validated.raw);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle('open-launcher-url', async (_evt, { exePath, url } = {}) => {
  try {
    const rawExe = String(exePath || '').trim();
    const rawUrl = String(url || '').trim();
    if (!rawExe) return { ok: false, error: 'missing exe' };
    if (!rawUrl) return { ok: false, error: 'missing url' };

    let exe = rawExe;
    let stat = null;
    try { stat = fs.statSync(exe); } catch {}
    if (stat && stat.isDirectory()) {
      exe = path.join(exe, 'EpicGamesLauncher.exe');
      try { stat = fs.statSync(exe); } catch {}
    }
    if (!stat || !stat.isFile()) {
      return { ok: false, error: 'invalid exe' };
    }

    const child = spawn(exe, [rawUrl], { detached: true, stdio: 'ignore' });
    child.unref();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle('open-network-center', async () => {
  try {
    if (process.platform !== 'win32') {
      return { ok: false, error: 'unsupported_platform' };
    }
    const child = spawn('control.exe', ['/name', 'Microsoft.NetworkAndSharingCenter'], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle('check-pid-alive', async (_evt, opts) => {
  const pid = Number(typeof opts === 'number' ? opts : opts?.pid ?? 0);
  if (!Number.isFinite(pid) || pid <= 0) return { alive: false, error: 'invalid_pid' };
  try {
    process.kill(pid, 0);
    return { alive: true, pid };
  } catch (err) {
    if (err?.code === 'EPERM') return { alive: true, pid };
    return { alive: false, pid, error: String(err?.code || err?.message || 'unknown') };
  }
});

ipcMain.handle('check-file-exists', async (_evt, filePath) => {
  const p = String(filePath || '').trim();
  if (!p) return { exists: false };
  try {
    fs.accessSync(p, fs.constants.F_OK);
  } catch {
    return { exists: false };
  }
  try {
    const stat = fs.statSync(p);
    return { exists: true, isFile: stat.isFile(), mtimeMs: stat.mtimeMs };
  } catch {
    return { exists: true };
  }
});

const RENDER_OUTPUT_SCAN_EXTS = new Set([
  '.mp4', '.mov', '.mxf', '.avi', '.webm', '.mkv',
  '.png', '.jpg', '.jpeg', '.exr', '.tga', '.bmp', '.dpx', '.hdr',
]);

function scanRenderOutputsRecursive({
  rootDir = '',
  minMtimeMs = 0,
  maxDepth = 4,
  limit = 200,
} = {}) {
  const out = [];
  const root = String(rootDir || '').trim();
  if (!root || !fs.existsSync(root)) return out;
  const safeDepth = Number.isFinite(Number(maxDepth))
    ? Math.max(1, Math.min(12, Math.trunc(Number(maxDepth))))
    : 4;
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.min(5000, Math.trunc(Number(limit))))
    : 200;
  const minMtime = Number.isFinite(Number(minMtimeMs))
    ? Math.max(0, Math.trunc(Number(minMtimeMs)))
    : 0;

  const walk = (dir, depth) => {
    if (out.length >= safeLimit) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (out.length >= safeLimit) break;
      const absPath = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (depth < safeDepth) walk(absPath, depth + 1);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = String(path.extname(entry.name || '') || '').toLowerCase();
      if (!RENDER_OUTPUT_SCAN_EXTS.has(ext)) continue;
      let stat = null;
      try {
        stat = fs.statSync(absPath);
      } catch {
        stat = null;
      }
      if (!stat || !stat.isFile()) continue;
      const mtimeMs = Number(stat.mtimeMs || 0);
      if (minMtime > 0 && mtimeMs < minMtime) continue;
      out.push({
        path: absPath,
        size: Number.isFinite(Number(stat.size)) ? Math.max(0, Math.trunc(Number(stat.size))) : 0,
        mtimeMs,
      });
    }
  };

  walk(root, 0);
  out.sort((a, b) => {
    const mtimeDiff = Number(b?.mtimeMs || 0) - Number(a?.mtimeMs || 0);
    if (mtimeDiff !== 0) return mtimeDiff;
    return String(a?.path || '').localeCompare(String(b?.path || ''));
  });
  if (out.length > safeLimit) return out.slice(0, safeLimit);
  return out;
}

ipcMain.handle('find-render-outputs', async (_evt, opts = {}) => {
  const rootDir = String(opts?.rootDir || '').trim();
  if (!rootDir) return { ok: false, error: 'missing_root_dir', files: [] };
  let resolvedRoot = rootDir;
  try {
    resolvedRoot = path.resolve(rootDir);
  } catch {
    resolvedRoot = rootDir;
  }
  const files = scanRenderOutputsRecursive({
    rootDir: resolvedRoot,
    minMtimeMs: Number(opts?.minMtimeMs || 0),
    maxDepth: Number(opts?.maxDepth || 4),
    limit: Number(opts?.limit || 200),
  });
  return { ok: true, rootDir: resolvedRoot, files };
});

function sanitizeRenderPidTag(pidTag) {
  return String(pidTag || '').trim().replace(/[^a-z0-9_-]/gi, '').slice(0, 64);
}

function renderPidFilePath(tag) {
  return path.join(app.getPath('userData'), `uu_render_${tag}.pid`);
}

function renderExitFilePath(tag) {
  return path.join(app.getPath('userData'), `uu_render_${tag}.exit`);
}


function removeRenderPidFiles(tag) {
  try { fs.unlinkSync(renderPidFilePath(tag)); } catch {}
  try { fs.unlinkSync(renderExitFilePath(tag)); } catch {}
  for (const ext of ['job', 'state', 'stop', 'state.tmp']) {
    try { fs.unlinkSync(path.join(app.getPath('userData'), `uu_render_${tag}.${ext}`)); } catch {}
  }
}

// Arrêt d'un seul processus : l'arborescence est calculée par le contrôleur
// (pas de /T, qui se fie à des numéros de parents éventuellement périmés).
function killSystemProcess(pid) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      execFile('taskkill', ['/PID', String(Math.trunc(pid)), '/F'], { windowsHide: true, timeout: 15000 }, () => resolve());
      return;
    }
    try { process.kill(pid, 'SIGKILL'); } catch {}
    resolve();
  });
}

async function terminateRenderProcessByTag(tag) {
  const parsed = readRenderPidStatus(renderPidFilePath(tag));
  if (parsed.state === 'absent') return { ok: true, status: 'no_pid_file' };
  // Fichier présent mais illisible ou invalide : aucune conclusion possible,
  // le suivi est conservé et la station reste bloquée.
  if (parsed.state !== 'present') return { ok: false, status: parsed.error };
  const result = await terminateOwnedRenderProcess({
    pid: parsed.pid,
    processStartMs: parsed.processStartMs,
    spawnedAtMs: parsed.spawnedAtMs,
    listProcesses: () => listSystemProcesses(),
    killProcess: killSystemProcess,
  });
  // Le fichier PID n'est supprimé qu'une fois la fin des processus possédés confirmée.
  if (result.ok) removeRenderPidFiles(tag);
  return { ...result, pid: parsed.pid };
}

ipcMain.handle('read-render-pid', async (_evt, pidTag) => {
  const tag = sanitizeRenderPidTag(pidTag);
  if (!tag) return { state: 'invalid_tag', pid: null, error: 'invalid_tag' };
  const status = readRenderPidStatus(renderPidFilePath(tag));
  if (status.state !== 'present') return status;
  // Heure du lancement d'origine : sert à la reprise (délai et fraîcheur des sorties).
  return { state: 'present', pid: status.pid, pidFile: renderPidFilePath(tag), startedAtMs: status.spawnedAtMs };
});

ipcMain.handle('delete-render-pid', async (_evt, pidTag) => {
  const tag = sanitizeRenderPidTag(pidTag);
  if (!tag) return { ok: false };
  removeRenderPidFiles(tag);
  return { ok: true };
});

// Code de sortie relevé par le processus principal tant que l'application est
// restée ouverte pendant le rendu ; inconnu après un redémarrage.
ipcMain.handle('read-render-exit', async (_evt, pidTag) => {
  const tag = sanitizeRenderPidTag(pidTag);
  if (!tag) return { known: false };
  try {
    const parsed = JSON.parse(fs.readFileSync(renderExitFilePath(tag), 'utf8'));
    const code = Number.isInteger(parsed?.code) ? parsed.code : null;
    return { known: true, code, signal: parsed?.signal || null };
  } catch {
    return { known: false };
  }
});

ipcMain.handle('terminate-render-process', async (_evt, pidTag) => {
  const tag = sanitizeRenderPidTag(pidTag);
  if (!tag) return { ok: false, status: 'invalid_tag' };
  return await terminateRenderProcessByTag(tag);
});

// Réconcilie tous les fichiers PID présents sur disque (ils survivent à un
// redémarrage) : les processus de rendus qui ne sont plus suivis sont arrêtés.
// La station ne doit lancer aucun rendu tant que busyTags n'est pas vide.
ipcMain.handle('reconcile-render-processes', async (_evt, opts = {}) => {
  const keepTags = new Set((Array.isArray(opts?.keepTags) ? opts.keepTags : []).map(sanitizeRenderPidTag).filter(Boolean));
  let names = [];
  try {
    names = fs.readdirSync(app.getPath('userData'));
  } catch {
    return { ok: false, busyTags: [], error: 'user_data_unreadable' };
  }
  const tagsFor = (ext) => names
    .map((name) => new RegExp(`^uu_render_([a-z0-9_-]+)\\.${ext}$`, 'i').exec(name)?.[1] || '')
    .filter((tag) => tag && !keepTags.has(tag));
  const busyTags = [];
  try {
    // Rendus supervisés : arrêt du job entier, confirmé par le superviseur.
    for (const tag of tagsFor('job')) {
      const stop = await getRenderJobStore().stop(tag);
      if (stop.ok) removeRenderPidFiles(tag);
      else busyTags.push({ tag, status: stop.phase });
    }
    // Anciens suivis par fichier PID (avant la supervision par Job Object).
    for (const tag of tagsFor('pid')) {
      const result = await terminateRenderProcessByTag(tag);
      if (!result.ok) busyTags.push({ tag, status: result.status, survivors: result.survivors || [] });
    }
  } catch (err) {
    return { ok: false, busyTags, error: String(err?.message || 'reconcile_failed') };
  }
  // ok n'est vrai que si tout a pu être vérifié et qu'aucun processus ne survit.
  return { ok: busyTags.length <= 0, busyTags };
});

// ---- Rendus supervisés par Job Object (Windows) ----------------------------
// Fichiers par rendu : .job (lancement : superviseur, heures), .state (écrit par
// le superviseur), .stop (demande d'arrêt du job entier).

function ensureRenderSupervisorScript() {
  const file = path.join(app.getPath('userData'), 'uu_render_supervisor.ps1');
  let current = null;
  try { current = fs.readFileSync(file, 'utf8'); } catch {}
  if (current !== SUPERVISOR_SCRIPT) fs.writeFileSync(file, SUPERVISOR_SCRIPT);
  return file;
}

let renderJobStore = null;
function getRenderJobStore() {
  if (!renderJobStore) {
    renderJobStore = createRenderJobStore({
      dir: app.getPath('userData'),
      listProcesses: listSystemProcesses,
      runRelay: runSupervisorRelay,
      readProcessStartMs: readSystemProcessStartMs,
      readLegacyPidStatus: (tag) => readRenderPidStatus(renderPidFilePath(tag)),
    });
  }
  return renderJobStore;
}

// Les suivis existants (ancien fichier PID, réservation) ne sont jamais effacés
// ici : le lancement est refusé tant qu'ils existent.
async function startSupervisedRender({ tag, command, args, cwd }) {
  let scriptFile = '';
  try {
    scriptFile = ensureRenderSupervisorScript();
  } catch (err) {
    return { ok: false, error: `supervisor_script_unwritable:${String(err?.code || err?.message || '')}` };
  }
  return await getRenderJobStore().start({ tag, scriptFile, command, args, cwd });
}

ipcMain.handle('read-render-job', async (_evt, pidTag) => {
  const tag = sanitizeRenderPidTag(pidTag);
  if (!tag) return { exists: false };
  return await getRenderJobStore().read(tag);
});

ipcMain.handle('stop-render-job', async (_evt, pidTag) => {
  const tag = sanitizeRenderPidTag(pidTag);
  if (!tag) return { ok: false, phase: 'invalid_tag' };
  return await getRenderJobStore().stop(tag);
});

ipcMain.handle('supports-render-jobs', async () => process.platform === 'win32');

ipcMain.handle('run-process', async (_evt, opts = {}) => {
  const commandRaw = String(opts?.command || '').trim();
  if (!commandRaw) return { ok: false, error: 'missing_command' };
  if (commandRaw.length > 4000) return { ok: false, error: 'command_too_long' };

  let command = commandRaw;
  try {
    const argsProbe = Array.isArray(opts?.args) ? opts.args : [];
    const hasGameArg = argsProbe.some((entry) => String(entry || '').trim().toLowerCase() === '-game');
    if (/UnrealEditor\.exe$/i.test(commandRaw) && hasGameArg) {
      const cmdExe = commandRaw.replace(/UnrealEditor\.exe$/i, 'UnrealEditor-Cmd.exe');
      if (fs.existsSync(cmdExe)) {
        command = cmdExe;
      }
    }
  } catch {}

  try {
    const argsProbe = Array.isArray(opts?.args) ? opts.args : [];
    const firstArgRaw = String(argsProbe[0] || '').trim();
    const firstArg = firstArgRaw.replace(/^"(.*)"$/, '$1').trim();
    const looksLikeUproject = /\.uproject$/i.test(firstArg) && fs.existsSync(firstArg);
    const looksLikeUnrealExe = /UnrealEditor(?:-Cmd)?\.exe$/i.test(command);
    if (looksLikeUproject && looksLikeUnrealExe) {
      const raw = String(fs.readFileSync(firstArg, 'utf8') || '');
      const cleanRaw = raw.replace(/^\uFEFF/, '');
      let assocRaw = '';
      try {
        const parsed = JSON.parse(cleanRaw || '{}');
        assocRaw = String(parsed?.EngineAssociation || '').trim();
      } catch {
        const match = cleanRaw.match(/\"EngineAssociation\"\s*:\s*\"([^\"]+)\"/i);
        assocRaw = match ? String(match[1] || '').trim() : '';
      }
      const assocMatch = assocRaw.match(/(\d+\.\d+)/);
      const assocVersion = assocMatch ? assocMatch[1] : '';
      if (assocVersion) {
        const normalizedCommand = command.replace(/\//g, '\\');
        const exeName = /UnrealEditor-Cmd\.exe$/i.test(normalizedCommand)
          ? 'UnrealEditor-Cmd.exe'
          : 'UnrealEditor.exe';
        const altExeName = exeName === 'UnrealEditor-Cmd.exe'
          ? 'UnrealEditor.exe'
          : 'UnrealEditor-Cmd.exe';
        const candidates = [];

        const versionReplaced = normalizedCommand.replace(/\\UE_\d+\.\d+\\/i, `\\UE_${assocVersion}\\`);
        if (versionReplaced && versionReplaced !== normalizedCommand) candidates.push(versionReplaced);

        const driveRoot = path.parse(normalizedCommand).root;
        const drive = String(driveRoot || '').replace(/[\\\/]+$/, '');
        if (drive) {
          candidates.push(path.join(`${drive}\\Epic`, `UE_${assocVersion}`, 'Engine', 'Binaries', 'Win64', exeName));
          candidates.push(path.join(`${drive}\\Epic`, `UE_${assocVersion}`, 'Engine', 'Binaries', 'Win64', altExeName));
        }

        for (const candidateRaw of candidates) {
          const candidate = String(candidateRaw || '').replace(/\//g, '\\');
          if (candidate && fs.existsSync(candidate)) {
            command = candidate;
            break;
          }
        }
      }
    }
  } catch {}

  const argsIn = Array.isArray(opts?.args) ? opts.args : [];
  const MAX_ARGS_COUNT = 96;
  const MAX_ARG_CHARS = 24000;
  const MAX_TOTAL_ARGS_CHARS = 30000;
  const args = [];
  let totalArgsChars = 0;
  for (const rawArg of argsIn.slice(0, MAX_ARGS_COUNT)) {
    const argRaw = String(rawArg ?? '').trim();
    if (!argRaw) continue;
    const arg = argRaw.replace(
      /^-MoviePipelineLocalExecutorClass=.*MoviePipelineCommandLineExecutor.*$/i,
      '-MoviePipelineLocalExecutorClass=/Script/MovieRenderPipelineCore.MoviePipelineInProcessExecutor'
    );
    if (arg.length > MAX_ARG_CHARS) {
      return { ok: false, error: 'arg_too_long' };
    }
    totalArgsChars += arg.length;
    if (totalArgsChars > MAX_TOTAL_ARGS_CHARS) {
      return { ok: false, error: 'args_too_long' };
    }
    args.push(arg);
  }

  const timeoutRaw = Number(opts?.timeoutMs);
  const timeoutMs = Number.isFinite(timeoutRaw)
    ? Math.max(1000, Math.min(4 * 60 * 60 * 1000, Math.trunc(timeoutRaw)))
    : (30 * 60 * 1000);

  const cwdRaw = String(opts?.cwd || '').trim();
  let cwd = '';
  if (cwdRaw) {
    try {
      const stat = fs.statSync(cwdRaw);
      if (stat && stat.isDirectory()) cwd = cwdRaw;
    } catch {}
  }

  if (opts?.detached === true && opts?.supervised === true) {
    const tag = sanitizeRenderPidTag(opts?.pidTag);
    if (!tag) return { ok: false, error: 'missing_pid_tag' };
    if (process.platform !== 'win32') return { ok: false, error: 'supervision_unsupported_platform' };
    return await startSupervisedRender({ tag, command, args, cwd });
  }

  if (opts?.detached === true) {
    const pidTag = String(opts?.pidTag || '').trim().replace(/[^a-z0-9_-]/gi, '').slice(0, 64);
    const pidFile = pidTag ? renderPidFilePath(pidTag) : null;
    if (pidTag) { try { fs.unlinkSync(renderExitFilePath(pidTag)); } catch {} }
    // Noté avant le lancement : aucun descendant ne peut être antérieur à cette heure.
    const spawnedAtMs = Date.now();
    let child;
    try {
      child = spawn(command, args, {
        windowsHide: false,
        shell: false,
        detached: true,
        stdio: 'ignore',
        ...(cwd ? { cwd } : {}),
      });
    } catch (err) {
      return { ok: false, error: String(err?.message || 'spawn_failed') };
    }
    child.unref();
    const pid = child.pid;
    if (pidTag) {
      // Code de sortie conservé sur disque pour le worker (tant que l'application reste ouverte).
      child.on('exit', (code, signal) => {
        try {
          fs.writeFileSync(renderExitFilePath(pidTag), JSON.stringify({ code, signal: signal || null, at: Date.now() }));
        } catch {}
      });
    }
    if (pidFile) {
      try { fs.writeFileSync(pidFile, formatPidFileContent(pid, spawnedAtMs)); } catch {}
      // Identité exacte du processus : heure de création relevée dans la table système.
      const processStartMs = await readSystemProcessStartMs(pid);
      if (processStartMs != null) {
        try { fs.writeFileSync(pidFile, formatPidFileContent(pid, spawnedAtMs, processStartMs)); } catch {}
      }
    }
    return { ok: true, detached: true, pid, pidFile: pidFile || null };
  }

  return await new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;
    let timedOut = false;
    let stdout = '';
    let stderr = '';
    const MAX_CAPTURE_CHARS = 200000;

    const finish = (payload = {}) => {
      if (settled) return;
      settled = true;
      resolve({
        ok: payload.ok === true,
        command: String(command || ''),
        code: Number.isFinite(Number(payload.code)) ? Number(payload.code) : null,
        signal: payload.signal ? String(payload.signal) : null,
        timedOut: payload.timedOut === true,
        stdout: String(payload.stdout || stdout || ''),
        stderr: String(payload.stderr || stderr || ''),
        error: payload.error ? String(payload.error) : '',
        durationMs: Date.now() - startedAt,
      });
    };

    let child = null;
    try {
      child = spawn(command, args, {
        windowsHide: true,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        ...(cwd ? { cwd } : {}),
      });
    } catch (err) {
      finish({
        ok: false,
        timedOut: false,
        error: String(err?.message || err || 'spawn_failed'),
      });
      return;
    }

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {}
    }, timeoutMs);

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        if (settled) return;
        stdout += String(chunk || '');
        if (stdout.length > MAX_CAPTURE_CHARS) {
          stdout = stdout.slice(stdout.length - MAX_CAPTURE_CHARS);
        }
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        if (settled) return;
        stderr += String(chunk || '');
        if (stderr.length > MAX_CAPTURE_CHARS) {
          stderr = stderr.slice(stderr.length - MAX_CAPTURE_CHARS);
        }
      });
    }

    child.on('error', (err) => {
      clearTimeout(timer);
      finish({
        ok: false,
        timedOut,
        error: String(err?.message || err || 'process_error'),
      });
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const exitCode = Number.isFinite(Number(code)) ? Number(code) : null;
      const ok = !timedOut && exitCode === 0;
      finish({
        ok,
        code: exitCode,
        signal: signal ? String(signal) : null,
        timedOut,
        error: ok ? '' : (timedOut ? 'timeout' : `exit_code_${exitCode == null ? 'unknown' : exitCode}`),
      });
    });
  });
});

ipcMain.handle('open-path', async (_evt, targetPath) => {
  try {
    if (!targetPath) return { ok: false, error: 'missing path' };
    const { shell } = require('electron');
    const p = String(targetPath || '').replace(/^file:\/\//i, '');
    const fs = require('fs');
    let stat = null;
    try { stat = fs.statSync(p); } catch {}
    if (stat && stat.isFile()) {
      shell.showItemInFolder(p);
      return { ok: true };
    }
    const res = await shell.openPath(p);
    if (res) return { ok: false, error: res };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

const MAX_IPC_HTTP_RESPONSE_BYTES = 32 * 1024 * 1024;
const MAX_IPC_HTTP_REQUEST_BYTES = 8 * 1024 * 1024;

async function readFetchResponseText(response) {
  const contentLength = Number(response?.headers?.get?.('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_IPC_HTTP_RESPONSE_BYTES) {
    throw new Error('response_too_large');
  }
  if (!response?.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_IPC_HTTP_RESPONSE_BYTES) {
      throw new Error('response_too_large');
    }
    return text;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    totalBytes += chunk.length;
    if (totalBytes > MAX_IPC_HTTP_RESPONSE_BYTES) {
      await reader.cancel().catch(() => {});
      throw new Error('response_too_large');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, totalBytes).toString('utf8');
}

ipcMain.handle('http-json', async (_evt, { url, method = 'GET', headers = {}, body = undefined, timeout = 10000 }) => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      resolve(payload);
    };
    try {
      const validated = validateHttpTarget(url);
      if (!validated.ok) {
        finish({ ok: false, error: validated.error });
        return;
      }
      const client = validated.url.protocol === 'https:' ? https : http;
      let payload = body;
      if (payload && typeof payload === 'object') {
        payload = JSON.stringify(payload);
      }
      const normalizedMethod = String(method || 'GET').trim().toUpperCase();
      const allowedMethods = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD']);
      if (!allowedMethods.has(normalizedMethod)) {
        finish({ ok: false, error: 'unsupported_http_method' });
        return;
      }
      const timeoutMs = Number.isFinite(Number(timeout))
        ? Math.max(1000, Math.min(15 * 60 * 1000, Math.trunc(Number(timeout))))
        : 10000;
      const opts = { method: normalizedMethod, headers: { ...(headers || {}) }, timeout: timeoutMs };
      if (typeof payload === 'string') {
        const payloadBytes = Buffer.byteLength(payload, 'utf8');
        if (payloadBytes > MAX_IPC_HTTP_REQUEST_BYTES) {
          finish({ ok: false, error: 'request_too_large' });
          return;
        }
        opts.headers['Content-Length'] = payloadBytes;
        if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
      }
      const req = client.request(validated.url, opts, (res) => {
        const chunks = [];
        let totalBytes = 0;
        res.on('data', (rawChunk) => {
          if (settled) return;
          const chunk = Buffer.from(rawChunk);
          totalBytes += chunk.length;
          if (totalBytes > MAX_IPC_HTTP_RESPONSE_BYTES) {
            finish({ ok: false, status: Number(res.statusCode || 0), error: 'response_too_large' });
            req.destroy();
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => {
          if (settled) return;
          finish({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            text: Buffer.concat(chunks, totalBytes).toString('utf8'),
          });
        });
      });
      req.on('timeout', () => {
        finish({ ok: false, error: 'timeout' });
        req.destroy();
      });
      req.on('error', (err) => finish({ ok: false, error: String(err.message) }));
      if (typeof payload === 'string') req.write(payload);
      req.end();
    } catch (e) {
      finish({ ok: false, error: String(e?.message || e) });
    }
  });
});

ipcMain.handle('http-get', async (_evt, { url, headers = {}, timeoutMs = 8000 }) => {
  try {
    const validated = validateHttpTarget(url);
    if (!validated.ok) return { ok: false, status: 0, error: validated.error };
    const ctrl = new AbortController();
    const normalizedTimeout = Number.isFinite(Number(timeoutMs))
      ? Math.max(1000, Math.min(15 * 60 * 1000, Math.trunc(Number(timeoutMs))))
      : 8000;
    const timer = setTimeout(() => ctrl.abort(), normalizedTimeout);
    try {
      const res = await fetch(validated.url, { method: 'GET', headers, signal: ctrl.signal });
      const text = await readFetchResponseText(res);
      return { ok: res.ok, status: res.status, text };
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    return { ok: false, status: 0, error: e?.message || String(e) };
  }
});

ipcMain.handle('app:quit', async () => {
  await reallyQuit();
  return { ok: true };
});

// ----------------------------- BOOT -----------------------------
app.whenReady().then(() => {
  console.log(`UltiUnreal — version ${VERSION} — © ${APP_AUTHOR} — contact : ${APP_CONTACT}`);
  ensureDataFiles();

  // Proxy uu-media:// → fichier local avec range requests (seeking vidéo)
  protocol.handle('uu-media', async (request) => {
    let filePath;
    try {
      const rawUrl = request.url.replace(/^uu-media:/i, 'file:');
      const urlObj = new URL(rawUrl);
      filePath = decodeURIComponent(urlObj.pathname);
      if (process.platform === 'win32' && /^\/[A-Za-z]:/.test(filePath)) {
        filePath = filePath.slice(1);
      }
      filePath = path.normalize(filePath);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      return new Response('Not Found', { status: 404 });
    }

    const total = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogg': 'video/ogg',
      '.mkv': 'video/x-matroska', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.tga': 'image/x-tga',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    const rangeHeader = request.headers.get('range') || '';
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
      const chunkSize = end - start + 1;
      const nodeStream = fs.createReadStream(filePath, { start, end });
      const webStream = new ReadableStream({
        start(ctrl) {
          nodeStream.on('data', (chunk) => ctrl.enqueue(chunk));
          nodeStream.on('end', () => ctrl.close());
          nodeStream.on('error', (err) => ctrl.error(err));
        },
        cancel() { nodeStream.destroy(); },
      });
      return new Response(webStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
        },
      });
    }

    const nodeStream = fs.createReadStream(filePath);
    const webStream = new ReadableStream({
      start(ctrl) {
        nodeStream.on('data', (chunk) => ctrl.enqueue(chunk));
        nodeStream.on('end', () => ctrl.close());
        nodeStream.on('error', (err) => ctrl.error(err));
      },
      cancel() { nodeStream.destroy(); },
    });
    return new Response(webStream, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(total),
        'Content-Type': contentType,
      },
    });
  });

  // Désactiver complètement la barre de menu (File / Edit / View / Window / Help)
  Menu.setApplicationMenu(null);

  createWindow(); // l’agent sera lancé au clic “Continuer” via start-agent
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

