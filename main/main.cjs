// main/main.cjs — Electron + Agent HTTP (clean, sans uu_ ni local_agent.json)
const { app, BrowserWindow, ipcMain, dialog, Menu, clipboard, nativeImage } = require('electron');

const path   = require('path');
const fs     = require('fs');
const http   = require('http');
const https  = require('https');
const os     = require('os');
const { spawn } = require('child_process'); 
const i18nFr = require('../app/i18n/fr.json');
const i18nEn = require('../app/i18n/en.json');
const { initLicenseIpc } = require('./license.cjs');
const { setProcessDataDir } = require('./data-path.cjs');
const { getSharedStore } = require('./server-shared-sqlite.cjs');
const fabAuth = require('./fab-auth.cjs');

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
  webRemoteControlName: 'RemoteControlPreset',
  rcHttpPort: 30010,
  rcWsPort: 30020,
  refreshSec: 5,
  logWarnLines: 1500,
  logHardLimitLines: 2000,
  unrealVersions: [],
  launchMode: 'production',
  allowStartDesynced: false,
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

initLicenseIpc();

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
    if (typeof commonRaw.allowStartDesynced !== 'boolean') {
      const next = { ...commonRaw, allowStartDesynced: false };
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

  // ✅ utiliser la variable globale mainWindow (déclarée plus haut)
  mainWindow = new BrowserWindow({
    width: 1600, height: 1100, minWidth: 1100, minHeight: 800,
    backgroundColor: '#0f1216',
    show: true,
    icon: windowIcon,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true }
  });

  if (isDev) mainWindow.loadURL('http://localhost:5173');
  else       mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

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
    if (!targetUrl) return { ok: false, error: 'missing url' };
    const { shell } = require('electron');
    const url = String(targetUrl || '').trim();
    if (!url) return { ok: false, error: 'missing url' };
    await shell.openExternal(url);
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

ipcMain.handle('http-json', async (_evt, { url, method = 'GET', headers = {}, body = undefined, timeout = 10000 }) => {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https:') ? https : http;
      let payload = body;
      if (payload && typeof payload === 'object') {
        payload = JSON.stringify(payload);
      }
      const opts = { method, headers: { ...(headers || {}) }, timeout };
      if (typeof payload === 'string') {
        opts.headers['Content-Length'] = Buffer.byteLength(payload, 'utf8');
        if (!opts.headers['Content-Type']) opts.headers['Content-Type'] = 'application/json';
      }
      const req = client.request(url, opts, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, text: data }));
      });
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
      req.on('error',   (err) => resolve({ ok: false, error: String(err.message) }));
      if (typeof payload === 'string') req.write(payload);
      req.end();
    } catch (e) {
      resolve({ ok: false, error: String(e?.message || e) });
    }
  });
});

ipcMain.handle('http-get', async (_evt, { url, headers = {}, timeoutMs = 8000 }) => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { method: 'GET', headers, signal: ctrl.signal });
    clearTimeout(t);
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
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

  // Désactiver complètement la barre de menu (File / Edit / View / Window / Help)
  Menu.setApplicationMenu(null);

  createWindow(); // l’agent sera lancé au clic “Continuer” via start-agent
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

