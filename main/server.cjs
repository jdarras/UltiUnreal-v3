// main/server.cjs
// Endpoints principaux :
//   GET  /agent/ping
//   GET  /agent/info
//   GET  /agent/common
//   POST /agent/common
//   PUT  /agent/common
//   GET  /agent/projects
//   POST /agent/projects
//   POST /agent/projects/scan
//   POST /agent/projects/import
//   GET  /agent/library
//   GET  /agent/library/meta
//   POST /agent/library/import-remote
//   GET  /agent/set-project
//   GET  /agent/hosts
//   POST /agent/host/:ip
//   POST /agent/host/:ip/launch
//   POST /agent/host/:ip/stop
//   POST /agent/host/:ip/delete
//   POST /agent/launch
//   POST /agent/stop
//   GET  /agent/logs
//   GET  /agent/logs/all
//   GET  /agent/logs/storage
//   POST /agent/logs/purge
//   GET  /agent/online
//   POST /agent/quit
//   GET  /agent/layout?projectId=<id|name>
//   POST /agent/layout?projectId=<id|name>
//   POST /agent/layout/preset-snapshot?projectId=<id|name>&ip=…&port=…&preset=…
//   GET  /agent/library/item?uid=<uid>
//   POST /agent/library/item { uid, user }
//   POST /agent/postprod/auth/login
//   POST /agent/postprod/auth/logout
//   GET  /agent/postprod/me
//   PUT  /agent/postprod/me
//   GET  /agent/postprod/users
//   POST /agent/postprod/users
//   PUT  /agent/postprod/users/:id
//   GET  /agent/postprod/roles
//   POST /agent/postprod/roles
//   PUT  /agent/postprod/roles/:key
//   GET  /agent/postprod/tasks
//   POST /agent/postprod/tasks
//   POST /agent/postprod/tasks/:id/transition
//   GET  /agent/postprod/tasks/:id/transitions
//   GET  /agent/postprod/renders
//   POST /agent/postprod/renders
//   POST /agent/postprod/renders/:id/transition
//   GET  /agent/postprod/renders/:id/transitions

const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {
  readJSON,
  writeJSON,
  writeJSONIfChanged,
  getJSON,
} = require('./server-files.cjs');
const { getDataDir } = require('./data-path.cjs');
const {
  loadProjects,
  saveProjects,
  enrichProjectForClient,
  findProjectId,
  zp4,
  isValidId,
  readEngineVersionFromUproject,
  readProjectMeta,
  writeProjectMeta,
  extractProjectInsights,
  deleteProjectMeta,
  deleteProjectDoc,
} = require('./server-projects.cjs');

const { handleSync }    = require('./server-sync.cjs');
const { handleLaunch }  = require('./server-launch.cjs');
const { handleWidgets } = require('./server-widgets.cjs');
const { handleLogs } = require('./server-logs.cjs');
const { handleLibraryRoutes } = require('./server-library.cjs');
const { handleLayoutRoutes } = require('./server-layout.cjs');
const { handleProjectConfigRoutes, ensureHttpServerBindAddress } = require('./server-project-config.cjs');
const { handleHostsOnlineRoutes, heartbeatLoop } = require('./server-hosts-online.cjs');
const { createPostprodAuth } = require('./server-postprod-auth.cjs');

const NAME = 'UltiUnreal Agent';
const VERSION = '0.9.0';

const CACHE_TTL_MS = 10 * 1000;
let cacheCommon = { ts: 0, data: null };
let cacheProjects = { ts: 0, data: null };
let cacheProjectsLight = { ts: 0, data: null };

function getCommonCached() {
  const now = Date.now();
  if (cacheCommon.data && now - cacheCommon.ts < CACHE_TTL_MS) return cacheCommon.data;
  const data = readJSON(COMMON_FILE) || {};
  applyLogStorageLimitsFromCommon(data);
  cacheCommon = { ts: now, data };
  return data;
}

function setCommonCache(data) {
  applyLogStorageLimitsFromCommon(data);
  cacheCommon = { ts: Date.now(), data: data || {} };
}

function getProjectsCached() {
  const now = Date.now();
  if (cacheProjects.data && now - cacheProjects.ts < CACHE_TTL_MS) {
    return cacheProjects.data;
  }
  const pj = loadProjects();
  const active = pj.projects.find(p => p.id === pj.activeId);
  const payload = {
    activeId: pj.activeId || '',
    activeName: active?.name || pj.activeName || '',
    nextId: pj.nextId || 1,
    projects: pj.projects.map(enrichProjectForClient),
    activeByHost: (pj.activeByHost && typeof pj.activeByHost === 'object') ? pj.activeByHost : {},
  };
  cacheProjects = { ts: now, data: payload };
  return payload;
}

function invalidateProjectsCache() {
  cacheProjects = { ts: 0, data: null };
  cacheProjectsLight = { ts: 0, data: null };
}

function getProjectsLight() {
  const now = Date.now();
  if (cacheProjectsLight.data && now - cacheProjectsLight.ts < CACHE_TTL_MS) {
    return cacheProjectsLight.data;
  }
  const pj = loadProjects();
  const active = pj.projects.find(p => p.id === pj.activeId);
  const payload = {
    activeId: pj.activeId || '',
    activeName: active?.name || pj.activeName || '',
    nextId: pj.nextId || 1,
    projects: pj.projects.map((pr) =>
      enrichProjectForClient(pr, { skipFs: true, skipInsights: true })
    ),
    activeByHost: (pj.activeByHost && typeof pj.activeByHost === 'object') ? pj.activeByHost : {},
  };
  cacheProjectsLight = { ts: now, data: payload };
  return payload;
}

const DATA_DIR       = getDataDir();
const COMMON_FILE    = path.join(DATA_DIR, 'common_server.json');
const HOSTS_FILE     = path.join(DATA_DIR, 'hosts_server.json');
const PRODUCTION_DIR = path.join(DATA_DIR, 'production');
const LOG_FILE       = path.join(DATA_DIR, 'logs_server.ndjson');
const DEFAULT_LOG_WARN_LINES = 1500;
const DEFAULT_LOG_HARD_LIMIT_LINES = 2000;
let LOG_WARN_LINES = DEFAULT_LOG_WARN_LINES;
let LOG_HARD_LIMIT_LINES = DEFAULT_LOG_HARD_LIMIT_LINES;
const PRESENCE_TTL_MS = 30000; // durée de rétention des présences éphémères

function coercePositiveInt(value, fallback, min = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return Math.max(min, Number(fallback) || min);
  return Math.max(min, Math.trunc(n));
}

const MAX_JSON_BODY_BYTES = coercePositiveInt(
  process.env.UU_AGENT_MAX_JSON_BODY_BYTES,
  2 * 1024 * 1024,
  1024
);
const REQUEST_TIMEOUT_MS = coercePositiveInt(
  process.env.UU_AGENT_REQUEST_TIMEOUT_MS,
  30 * 1000,
  1000
);
const HEADERS_TIMEOUT_MS = coercePositiveInt(
  process.env.UU_AGENT_HEADERS_TIMEOUT_MS,
  15 * 1000,
  1000
);
const KEEP_ALIVE_TIMEOUT_MS = coercePositiveInt(
  process.env.UU_AGENT_KEEPALIVE_TIMEOUT_MS,
  5 * 1000,
  1000
);
const CORS_ALLOWED_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';

function normalizeLogStorageLimits(raw = null, fallbackWarn = DEFAULT_LOG_WARN_LINES, fallbackHard = DEFAULT_LOG_HARD_LIMIT_LINES) {
  const src = raw && typeof raw === 'object' ? raw : {};
  let warnAt = coercePositiveInt(src.logWarnLines, fallbackWarn, 100);
  let hardLimit = coercePositiveInt(src.logHardLimitLines, fallbackHard, 200);
  if (hardLimit <= warnAt) hardLimit = warnAt + 1;
  return { warnAt, hardLimit };
}

function applyLogStorageLimitsFromCommon(raw = null) {
  const normalized = normalizeLogStorageLimits(raw, LOG_WARN_LINES, LOG_HARD_LIMIT_LINES);
  LOG_WARN_LINES = normalized.warnAt;
  LOG_HARD_LIMIT_LINES = normalized.hardLimit;
  return normalized;
}

function sendJSON(res, status, obj) {
  const payload = JSON.stringify(obj ?? {}, null, 2);
  return sendJSONPayload(res, status, payload);
}

function sendJSONWithEtag(req, res, status, obj) {
  const payload = JSON.stringify(obj ?? {}, null, 2);
  const etag = `"${tinyHash(payload)}"`;
  const ifNoneMatch = String(req.headers?.['if-none-match'] || '').trim();
  if (ifNoneMatch === etag) {
    res.writeHead(304, {
      'ETag': etag,
      'Access-Control-Allow-Origin':'*',
      'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS,
      'Access-Control-Allow-Headers':'Content-Type, Authorization, X-UU-Auth, X-UU-Broker-Token, X-UU-Purge-Id, X-UU-Purge-Origin',
    });
    res.end();
    return;
  }
  return sendJSONPayload(res, status, payload, etag);
}

function sendJSONPayload(res, status, payload, etag = '') {
  const buffer = Buffer.from(payload, 'utf8');
  const acceptsGzip = !!res._acceptsGzip;
  const shouldCompress = acceptsGzip && buffer.length > 1024;
  const baseHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS,
    // On autorise les headers custom utilisés par le front (purgeId/origin, etc.)
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-UU-Auth, X-UU-Broker-Token, X-UU-Purge-Id, X-UU-Purge-Origin',
  };
  if (etag) baseHeaders.ETag = etag;

  if (shouldCompress) {
    try {
      const gz = zlib.gzipSync(buffer);
      res.writeHead(status, {
        ...baseHeaders,
        'Content-Encoding': 'gzip',
        'Content-Length': gz.length,
      });
      res.end(gz);
      return;
    } catch {
      // fallback to plain
    }
  }

  res.writeHead(status, { ...baseHeaders, 'Content-Length': buffer.length });
  res.end(buffer);
}

function createHttpError(statusCode, code, message, details = null) {
  const err = new Error(String(message || code || 'request error'));
  err.statusCode = Number(statusCode) || 500;
  err.code = String(code || 'request_error');
  if (details && typeof details === 'object') err.details = details;
  return err;
}

function parseBody(req, opts = {}) {
  const maxBytes = coercePositiveInt(
    opts?.maxBytes,
    MAX_JSON_BODY_BYTES,
    1024
  );
  const declaredLen = Number(req?.headers?.['content-length']);
  if (Number.isFinite(declaredLen) && declaredLen > maxBytes) {
    try { req.resume(); } catch {}
    return Promise.reject(
      createHttpError(413, 'payload_too_large', `JSON body exceeds ${maxBytes} bytes`, {
        maxBytes,
        contentLength: Math.trunc(declaredLen),
      })
    );
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let done = false;

    const cleanup = () => {
      req.off('aborted', onAborted);
      req.off('error', onError);
      req.off('data', onData);
      req.off('end', onEnd);
    };

    const settle = (fn, value) => {
      if (done) return;
      done = true;
      cleanup();
      fn(value);
    };
    const fail = (err) => settle(reject, err);
    const ok = (value) => settle(resolve, value);

    const onAborted = () => {
      fail(createHttpError(400, 'request_aborted', 'Request body aborted by client'));
    };

    const onError = (err) => {
      fail(createHttpError(400, 'request_stream_error', 'Request stream error', {
        error: String(err?.message || err),
      }));
    };

    const onData = (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > maxBytes) {
        req.off('data', onData);
        req.off('end', onEnd);
        try { req.resume(); } catch {}
        fail(createHttpError(413, 'payload_too_large', `JSON body exceeds ${maxBytes} bytes`, {
          maxBytes,
          receivedBytes: totalBytes,
        }));
        return;
      }
      chunks.push(buf);
    };

    const onEnd = () => {
      if (!chunks.length) return ok({});
      const raw = Buffer.concat(chunks, totalBytes).toString('utf8').trim();
      if (!raw) return ok({});
      try {
        ok(JSON.parse(raw));
      } catch {
        fail(createHttpError(400, 'invalid_json', 'Invalid JSON body'));
      }
    };

    req.on('aborted', onAborted);
    req.on('error', onError);
    req.on('data', onData);
    req.on('end', onEnd);
  });
}

function sendHttpError(req, res, url, err) {
  const statusCode = Number(err?.statusCode || err?.status || 0);
  const pathname = url && url.pathname ? url.pathname : '';

  if (statusCode >= 400 && statusCode < 500) {
    const code = String(err?.code || 'bad_request');
    const message = String(err?.message || 'Bad request');
    const payload = { ok: false, error: code, message };
    if (err?.details && typeof err.details === 'object' && Object.keys(err.details).length) {
      payload.details = err.details;
    }

    logLine({
      level: 'warn',
      src: 'server',
      action: 'request_error',
      message: `${req.method || 'GET'} ${pathname || req.url || ''} -> ${statusCode} ${code}`,
      data: {
        statusCode,
        code,
        method: req.method || '',
        path: pathname || String(req.url || ''),
        details: payload.details || null,
      },
    });

    if (!res.headersSent && !res.writableEnded) {
      return sendJSON(res, statusCode, payload);
    }
    return;
  }

  console.error('[UltiUnreal Agent] Unhandled error:', err);
  logLine({
    level: 'error',
    src: 'server',
    action: 'unhandled_error',
    message: 'Erreur non gérée dans le handler HTTP',
    data: {
      error: String(err?.message || err),
      stack: err && err.stack ? String(err.stack) : null,
      path: pathname || String(req.url || ''),
      method: req.method,
    },
  });

  if (!res.headersSent && !res.writableEnded) {
    return sendJSON(res, 500, { ok: false, error: String(err?.message || err) });
  }
}

// INI helpers moved to server-ini.cjs

// ---------- Logs ----------
let logLineCount = 0;
let logWarnReached = false;
let logSaturated = false;
let logDropNoticePrinted = false;

function countExistingLogLines(filePath) {
  try {
    if (!fs.existsSync(filePath)) return 0;
    const data = fs.readFileSync(filePath, 'utf8');
    if (!data) return 0;
    return data.split(/\r?\n/).filter(Boolean).length;
  } catch {
    return 0;
  }
}

function resetLogStorageState() {
  logLineCount = 0;
  logWarnReached = false;
  logSaturated = false;
  logDropNoticePrinted = false;
}

function refreshLogStorageStateFromDisk({ resetDropNotice = false } = {}) {
  const n = countExistingLogLines(LOG_FILE);
  logLineCount = Math.max(0, Number(n) || 0);
  logWarnReached = logLineCount >= LOG_WARN_LINES;
  logSaturated = logLineCount >= LOG_HARD_LIMIT_LINES;
  if (resetDropNotice || !logSaturated) {
    logDropNoticePrinted = false;
  }
}

function getLogStorageStatus() {
  // Re-synchronise l'état en mémoire avec le fichier pour éviter les états "stale"
  // (ex: purge/troncature externe du fichier de logs).
  refreshLogStorageStateFromDisk();
  return {
    lineCount: Number(logLineCount || 0),
    warnAt: LOG_WARN_LINES,
    hardLimit: LOG_HARD_LIMIT_LINES,
    warnReached: !!logWarnReached,
    saturated: !!logSaturated,
  };
}

applyLogStorageLimitsFromCommon(readJSON(COMMON_FILE) || {});
refreshLogStorageStateFromDisk({ resetDropNotice: true });

function purgeLogsFile() {
  try {
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.writeFileSync(LOG_FILE, '', 'utf8');
    resetLogStorageState();
  } catch {}
}
function logLine(entry = {}) {
  try {
    if (logSaturated) {
      // Si le fichier a été purgé/tronqué hors route API, on tente une
      // resynchronisation pour lever l'état saturé automatiquement.
      refreshLogStorageStateFromDisk();
      if (!logSaturated) {
        logDropNoticePrinted = false;
      }
      if (logSaturated) {
        if (!logDropNoticePrinted) {
          logDropNoticePrinted = true;
          console.warn(
            `[WARN server/log_storage_limit] Cap logs atteint (${LOG_HARD_LIMIT_LINES} lignes). ` +
            `Écriture suspendue jusqu'à purge manuelle.`
          );
        }
        return;
      }
    }

    const e = {
      ts: new Date().toISOString(),
      level: 'info',   // info|success|warn|error|debug
      src: 'server',   // server|agent|ui|ue
      host: '',
      action: '',
      message: '',
      data: {},
      ...entry
    };
    fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(e) + '\n', 'utf8');
    logLineCount += 1;
    if (!logWarnReached && logLineCount >= LOG_WARN_LINES) {
      logWarnReached = true;
      console.warn(
        `[WARN server/log_storage_limit] Le fichier logs contient ${logLineCount} lignes. ` +
        `Archive puis purge recommandées.`
      );
    }
    if (!logSaturated && logLineCount >= LOG_HARD_LIMIT_LINES) {
      logSaturated = true;
      logDropNoticePrinted = false;
      console.warn(
        `[WARN server/log_storage_limit] Cap logs atteint (${LOG_HARD_LIMIT_LINES} lignes). ` +
        `Écriture suspendue jusqu'à purge manuelle.`
      );
    }
    const tag = `${e.level.toUpperCase()} ${e.src}/${e.action}`;
    console.log(`[${tag}] ${e.message}`);
  } catch {}
}

// ---------- Launch local process state ----------
let CURRENT_PID = null;

function isPidAlive(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch {
    return false;
  }
}

// ---------- Helpers Unreal ----------
function ensureGameFlags(args) {
  const flat = Array.isArray(args) ? args.map(v => String(v)) : [];
  const lower = flat.map(v => v.toLowerCase());

  // On enlève -editor
  let out = flat.filter(v => v.toLowerCase() !== '-editor');

  // On ajoute -game s’il n’est pas déjà là
  if (!lower.includes('-game')) {
    out.push('-game');
  }

  return out;
}

// Petit hash lisible (pour presetHash)
function tinyHash(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).slice(0, 8);
}

function normalizePathKey(p) {
  return String(p || '')
    .trim()
    .replace(/\\/g, '/')
    .toLowerCase();
}

const PROJECT_SCAN_EXCLUDES = [
  'Intermediate',
  'Saved',
  'Binaries',
  'DerivedDataCache',
  'HostProject',
];

function isExcludedDirName(name, excludeSet) {
  const key = String(name || '').trim().toLowerCase();
  return !!key && excludeSet.has(key);
}

function listUprojectFilesInDir(rootPath, recursive = true, excludeDirs = PROJECT_SCAN_EXCLUDES) {
  const out = [];
  const rawRoot = String(rootPath || '').trim();
  if (!rawRoot) return out;

  let st;
  try {
    st = fs.statSync(rawRoot);
  } catch {
    return out;
  }

  if (st.isFile()) {
    if (/\.uproject$/i.test(rawRoot)) {
      out.push(path.resolve(rawRoot));
    }
    return out;
  }
  if (!st.isDirectory()) return out;

  const excludeSet = new Set(
    (Array.isArray(excludeDirs) ? excludeDirs : [])
      .map((d) => String(d || '').trim().toLowerCase())
      .filter(Boolean)
  );

  const rootName = path.basename(rawRoot);
  if (isExcludedDirName(rootName, excludeSet)) return out;

  if (!recursive) {
    let entries;
    try {
      entries = fs.readdirSync(rawRoot, { withFileTypes: true });
    } catch {
      return out;
    }
    for (const entry of entries) {
      if (entry.isFile() && /\.uproject$/i.test(entry.name || '')) {
        out.push(path.resolve(rawRoot, entry.name));
      }
    }
    return out;
  }

  const stack = [rawRoot];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const name = entry.name || '';
      const full = path.join(dir, name);
      if (entry.isDirectory()) {
        if (isExcludedDirName(name, excludeSet)) continue;
        stack.push(full);
      } else if (entry.isFile() && /\.uproject$/i.test(name)) {
        out.push(path.resolve(full));
      }
    }
  }

  return out;
}

function scanProjectRoots(roots, opts = {}) {
  const list = Array.isArray(roots) ? roots : [];
  const recursive = opts.recursive !== false;
  const excludeDirs = Array.isArray(opts.excludeDirs)
    ? opts.excludeDirs
    : PROJECT_SCAN_EXCLUDES;
  const unique = new Map();

  for (const root of list) {
    const raw = String(root || '').trim();
    if (!raw) continue;
    const files = listUprojectFilesInDir(raw, recursive, excludeDirs);
    for (const up of files) {
      const key = normalizePathKey(up);
      if (key && !unique.has(key)) unique.set(key, up);
    }
  }

  return Array.from(unique.values());
}

// ---------- Helpers HTTP ----------
async function postJSON(url, body) {
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body || {}) });
  const txt = await res.text();
  try { return JSON.parse(txt || '{}'); } catch { return { ok:false, text:txt }; }
}

function resolvePort() {
  const envs = [process.env.UU_AGENT_PORT, process.env.AGENT_PORT, process.env.PORT].filter(Boolean);
  for (const e of envs) { const n = Number(e); if (Number.isFinite(n) && n > 0) return n; }
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    if (v.startsWith('--port=')) { const n = Number(v.split('=')[1]); if (Number.isFinite(n) && n > 0) return n; }
    if ((v === '-p' || v === '--port') && a[i + 1]) { const n = Number(a[i + 1]); if (Number.isFinite(n) && n > 0) return n; }
  }
  return 4000;
}
const PORT = resolvePort();

// Démarrage du heartbeat des hosts (online/unrealRunning)
heartbeatLoop({ COMMON_FILE, HOSTS_FILE });
const postprodAuth = createPostprodAuth({
  dataDir: DATA_DIR,
  logLine,
});

// ---------- HTTP server ----------
const server = http.createServer(async (req, res) => {
  let url = null;
  try {
    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      const err = createHttpError(
        408,
        'request_timeout',
        `Request timed out after ${REQUEST_TIMEOUT_MS}ms`,
        { timeoutMs: REQUEST_TIMEOUT_MS }
      );
      sendHttpError(req, res, url, err);
      try { req.destroy(); } catch {}
    });

    // Préflight CORS
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin':'*',
        'Access-Control-Allow-Methods': CORS_ALLOWED_METHODS,
        'Access-Control-Allow-Headers':'Content-Type, Authorization, X-UU-Auth, X-UU-Broker-Token, X-UU-Purge-Id, X-UU-Purge-Origin',
      });
      res.end();
      return;
    }

    // Parsing de l’URL une seule fois
    try {
      url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    } catch {
      return sendJSON(res, 400, { ok: false, error: 'bad url' });
    }

    // Compression support
    const encHeader = String(req.headers?.['accept-encoding'] || '');
    res._acceptsGzip = encHeader.includes('gzip');

    // ---- Routes Post-production auth (/agent/postprod/*) ----
    const handledPostprod = await postprodAuth.handleRoutes(req, res, url, {
      sendJSON,
      parseBody,
    });
    if (handledPostprod !== false) return;

    // ---- Routes de synchronisation (/agent/sync/...) ----
    if (url.pathname.startsWith('/agent/sync')) {
      const handled = await handleSync(req, res, url, {
        logLine,
        sendJSON,
        COMMON_FILE,
        HOSTS_FILE,
        loadProjects,
      });
      if (handled !== false) return; // déjà traité par server-sync.cjs
    }

    // ---- Routes Launch & Hosts (/agent/hosts, /agent/host/:ip..., /agent/launch, /agent/stop) ----
    const handledLaunch = await handleLaunch(req, res, url, {
      logLine,
      sendJSON,
      COMMON_FILE,
      HOSTS_FILE,
      PRODUCTION_DIR,
      parseBody,
      postJSON,
      ensureGameFlags,
      getCurrentPid: () => CURRENT_PID,
      setCurrentProcess: (pid, child) => {
        CURRENT_PID = pid;
        if (child && typeof child.once === 'function') {
          const cleanup = () => {
            if (CURRENT_PID === pid) {
              CURRENT_PID = null;
            }
          };
          child.once('exit', cleanup);
          child.once('close', cleanup);
          child.once('error', cleanup);
        }
      },
      clearCurrentProcess: () => {
        CURRENT_PID = null;
      },
    });
    if (handledLaunch !== false) return;

    // ---- Routes UI / Companion : widgets (press / nudge) ----
    const handledWidgets = await handleWidgets(req, res, url, {
      logLine,
      sendJSON,
      COMMON_FILE,
      HOSTS_FILE,
      parseBody,
    });
    if (handledWidgets !== false) return;

    // ---- Routes Logs (/agent/logs...) ----
    const handledLogs = await handleLogs(req, res, url, {
      logLine,
      sendJSON,
      COMMON_FILE,
      HOSTS_FILE,
      LOG_FILE,
      getJSON,
      getLogStorageStatus,
      resetLogStorageState,
    });
    if (handledLogs !== false) return;

    // ---- Online / Presence ----
    const handledOnline = await handleHostsOnlineRoutes(req, res, url, {
      sendJSON,
      parseBody,
      presenceTtlMs: PRESENCE_TTL_MS,
    });
    if (handledOnline !== false) return;

    // Tout le reste des routes existantes

    // ---- Ping ----
    if (req.method === 'GET' && url.pathname === '/agent/ping') {
      let pid = Number(CURRENT_PID);
      let running = false;
      if (Number.isInteger(pid) && pid > 0) {
        running = isPidAlive(pid);
      }
      if (!running) {
        pid = null;
        CURRENT_PID = null;
      }
      return sendJSON(res, 200, {
        ok: true,
        name: NAME,
        version: VERSION,
        port: PORT,
        unrealRunning: running,
        pid
      });
    }

    // ---- Info ----
    if (req.method === 'GET' && url.pathname === '/agent/info') {
      return sendJSON(res, 200, {
        ok: true,
        common: readJSON(COMMON_FILE) || {},
        projects: loadProjects() || {},
        hosts: readJSON(HOSTS_FILE) || {}
      });
    }

    // ---- Common GET/POST ----
    if (url.pathname === '/agent/common') {
      if (req.method === 'GET') {
        return sendJSON(res, 200, getCommonCached() || {});
      }
      if (req.method === 'POST' || req.method === 'PUT') {
        const body = await parseBody(req);
        const prev = readJSON(COMMON_FILE) || {};
        const hasRenderOutputDirInBody = Object.prototype.hasOwnProperty.call(body || {}, 'render_output_dir')
          || Object.prototype.hasOwnProperty.call(body || {}, 'renderOutputDir');
        const hasRenderOutputDirsInBody = Object.prototype.hasOwnProperty.call(body || {}, 'render_output_dirs')
          || Object.prototype.hasOwnProperty.call(body || {}, 'renderOutputDirs');
                  const ALLOWED = [
                    'webRemoteControlName',
                    'rcHttpPort',
                    'rcWsPort',
                    'agentPort',
                    'refreshSec',
                    'logWarnLines',
                    'logHardLimitLines',
                    'defaultPresetName',
                    'launchMode',
                    'unrealVersions',
                    'project_roots',
                    'render_output_dir',
                    'render_output_dirs',
                    'fab_resources_enabled',
                    // UI flags
                    'show_start_new_ue',
                    'allowStartDesynced',
                    'quietMode',
                    // Start Layout / WRC tuning
                    'wrcMaxAttempts',
                    'wrcRetryDelaySec',
                    'startLayoutSendDelaySec',
                    // legacy / duplicated keys
                    'unrealLauncherPath',
                    'unreal_launcher_path',
                    'renderOutputDir',
                    'renderOutputDirs',
                    'useStartLayout',
                  ];
        const patch = {};
        for (const k of ALLOWED) if (k in body) patch[k] = body[k];
        const next = { ...prev, ...patch };
        if ('unreal_launcher_path' in next) {
          // keep legacy input only as fallback, persist camelCase
          if (!next.unrealLauncherPath) {
            next.unrealLauncherPath = next.unreal_launcher_path;
          }
          delete next.unreal_launcher_path;
        }
        if ('renderOutputDir' in next) {
          if (!String(next.render_output_dir || '').trim()) {
            next.render_output_dir = next.renderOutputDir;
          }
          delete next.renderOutputDir;
        }
        if ('renderOutputDirs' in next) {
          if (!Array.isArray(next.render_output_dirs)) {
            next.render_output_dirs = next.renderOutputDirs;
          }
          delete next.renderOutputDirs;
        }
        const normalizePathList = (value) => {
          const rawList = Array.isArray(value)
            ? value
            : String(value || '').split(/[;\n\r]+/g);
          const out = [];
          const seen = new Set();
          for (const item of rawList) {
            const cleaned = String(item || '').trim();
            if (!cleaned) continue;
            const key = cleaned.replace(/\\/g, '/').toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(cleaned);
          }
          return out;
        };
        next.render_output_dir = String(next.render_output_dir || '').trim();
        next.render_output_dirs = normalizePathList(next.render_output_dirs);
        if (hasRenderOutputDirInBody && !hasRenderOutputDirsInBody) {
          next.render_output_dirs = next.render_output_dir
            ? normalizePathList(next.render_output_dir)
            : [];
        }
        if (!next.render_output_dir && next.render_output_dirs.length > 0) {
          next.render_output_dir = String(next.render_output_dirs[0] || '').trim();
        } else if (next.render_output_dir && next.render_output_dirs.length === 0) {
          next.render_output_dirs = normalizePathList(next.render_output_dir);
        }
        if ('fab_vault_path' in next) delete next.fab_vault_path;
        if ('fabVaultPath' in next) delete next.fabVaultPath;
        // cleanup legacy duplicate flag
        if ('show_unreal_launch_buttons' in next) delete next.show_unreal_launch_buttons;
        // cleanup legacy option removed from UI/backend
        if ('startLayoutDetailedLogs' in next) delete next.startLayoutDetailedLogs;
        const normalizedLogLimits = normalizeLogStorageLimits(next);
        next.logWarnLines = normalizedLogLimits.warnAt;
        next.logHardLimitLines = normalizedLogLimits.hardLimit;
        applyLogStorageLimitsFromCommon(next);
        const commonChanged = writeJSONIfChanged(COMMON_FILE, next);
        setCommonCache(next);

        // Nettoyage des versions Unreal supprimées : purge des chemins sur tous les hosts
        const versionsList = Array.isArray(next.unrealVersions)
          ? next.unrealVersions
          : Array.isArray(body.unrealVersions)
            ? body.unrealVersions
            : null;

        if (versionsList) {
          const allowed = new Set(
            versionsList
              .map((v) => String(v || '').trim())
              .filter(Boolean)
          );

          try {
            const hosts = readJSON(HOSTS_FILE) || {};
            let changed = false;

            const cleanHost = (cfg = {}) => {
              let touch = false;

              // Bloc unrealEditors
              if (cfg.unrealEditors && typeof cfg.unrealEditors === 'object') {
                for (const ver of Object.keys(cfg.unrealEditors)) {
                  const v = String(ver || '').trim();
                  if (!allowed.has(v)) {
                    delete cfg.unrealEditors[ver];
                    touch = true;
                  }
                }
                if (
                  cfg.unrealEditors &&
                  typeof cfg.unrealEditors === 'object' &&
                  Object.keys(cfg.unrealEditors).length === 0
                ) {
                  delete cfg.unrealEditors;
                  touch = true;
                }
              }

              // Bloc legacy unreal_editors
              if (cfg.unreal_editors && typeof cfg.unreal_editors === 'object') {
                for (const ver of Object.keys(cfg.unreal_editors)) {
                  const v = String(ver || '').trim();
                  if (!allowed.has(v)) {
                    delete cfg.unreal_editors[ver];
                    touch = true;
                  }
                }
                if (
                  cfg.unreal_editors &&
                  typeof cfg.unreal_editors === 'object' &&
                  Object.keys(cfg.unreal_editors).length === 0
                ) {
                  delete cfg.unreal_editors;
                  touch = true;
                }
              }

              // Clés plates unreal_editor_<version> (legacy)
              for (const key of Object.keys(cfg)) {
                const m = /^unreal_editor_(.+)$/i.exec(String(key || '').trim());
                if (m && m[1]) {
                  const v = String(m[1]).trim();
                  if (!allowed.has(v)) {
                    delete cfg[key];
                    touch = true;
                  }
                }
              }

              return touch;
            };

            if (Array.isArray(hosts)) {
              hosts.forEach((cfg) => {
                if (cfg && typeof cfg === 'object') {
                  if (cleanHost(cfg)) changed = true;
                }
              });
              if (changed) writeJSON(HOSTS_FILE, hosts);
            } else if (hosts && typeof hosts === 'object') {
              for (const ip of Object.keys(hosts)) {
                const cfg = hosts[ip];
                if (cfg && typeof cfg === 'object') {
                  if (cleanHost(cfg)) changed = true;
                }
              }
              if (changed) writeJSON(HOSTS_FILE, hosts);
            }
          } catch (e) {
            logLine({
              level: 'warn',
              action: 'cleanup_unreal_versions',
              message: 'Nettoyage des chemins unrealEditors impossible après suppression de version',
              data: { error: String(e?.message || e) },
            });
          }
        }

        if (commonChanged) {
          logLine({ level:'success', action:'write_json', message:'common_server.json mis à jour', data: next });
        }
        return sendJSON(res, 200, { ok:true, common: next });
      }
    }

    // ---- Fab Library (external module) ----
    const handledLibrary = await handleLibraryRoutes(req, res, url, {
      sendJSON,
      sendJSONWithEtag,
      parseBody,
      logLine,
    });
    if (handledLibrary !== false) return;

    // ---- Project config / INI / meta (external module) ----
    const handledProjectConfig = await handleProjectConfigRoutes(req, res, url, {
      sendJSON,
      parseBody,
      invalidateProjectsCache,
      logLine,
    });
    if (handledProjectConfig !== false) return;

    // ---- Layout (external module) ----
    const handledLayout = await handleLayoutRoutes(req, res, url, {
      sendJSON,
      parseBody,
      logLine,
      tinyHash,
    });
    if (handledLayout !== false) return;

    // ---- Projects scan (list only) ----
    if (url.pathname === '/agent/projects/scan') {
      if (req.method !== 'POST') {
        return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
      }

      const body = await parseBody(req);
      const common = readJSON(COMMON_FILE) || {};
      const roots = Array.isArray(body?.project_roots)
        ? body.project_roots
        : (Array.isArray(common?.project_roots) ? common.project_roots : []);
      const recursive = body?.recursive !== false;

      const foundPaths = scanProjectRoots(roots, { recursive });
      const pj = loadProjects();
      const existing = new Set();

      for (const p of pj.projects || []) {
        const up = p?.uproject || p?.projectPath || p?.path || '';
        const key = normalizePathKey(up);
        if (key) existing.add(key);
      }

      const items = foundPaths.map((up) => {
        const key = normalizePathKey(up);
        const name = path.basename(up).replace(/\.uproject$/i, '');
        return { name, uprojectPath: up, exists: key ? existing.has(key) : false };
      });

      const found = items.length;
      const already = items.filter((it) => it.exists).length;

      logLine({
        level: 'info',
        action: 'scan_projects',
        message: 'Scan des projets terminé',
        data: { found, already },
      });

      return sendJSON(res, 200, { ok: true, found, already, items });
    }

    // ---- Projects import (from scan selection) ----
    if (url.pathname === '/agent/projects/import') {
      if (req.method !== 'POST') {
        return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
      }

      const body = await parseBody(req);
      const rawList = Array.isArray(body?.uprojectPaths)
        ? body.uprojectPaths
        : Array.isArray(body?.paths)
          ? body.paths
          : [];
      const commonCfg = readJSON(COMMON_FILE) || {};
      const defaultWrcName = String(commonCfg.webRemoteControlName || '').trim();

      const unique = new Map();
      for (const raw of rawList) {
        const up = String(raw || '').trim();
        if (!up) continue;
        if (!/\.uproject$/i.test(up)) continue;
        const key = normalizePathKey(up);
        if (!key || unique.has(key)) continue;
        unique.set(key, up);
      }

      const pj = loadProjects();
      const existing = new Set();
      for (const p of pj.projects || []) {
        const up = p?.uproject || p?.projectPath || p?.path || '';
        const key = normalizePathKey(up);
        if (key) existing.add(key);
      }

      let nextId = Number(pj.nextId || 1);
      if (!Number.isFinite(nextId) || nextId < 1) nextId = 1;
      let imported = 0;
      const importedPaths = [];
      const skippedPaths = [];

      for (const up of unique.values()) {
        const key = normalizePathKey(up);
        if (!key) continue;
        if (existing.has(key)) {
          skippedPaths.push(up);
          continue;
        }
        const name = path.basename(up).replace(/\.uproject$/i, '');
        pj.projects.push({
          id: zp4(nextId),
          name,
          uproject: up,
          note: '',
          createdAt: new Date().toISOString(),
          engineVersion: '',
          wrcName: defaultWrcName || '',
        });

        // Créer/mettre à jour le meta avec WRC et maps détectées
        try {
          const meta = readProjectMeta(zp4(nextId)) || {};
          if (!meta.wrcName && defaultWrcName) meta.wrcName = defaultWrcName;
          const insights = extractProjectInsights(up) || {};
          if (insights.maps) {
            meta.maps = {
              defaultGame: insights.maps.defaultGame || '',
              defaultEditor: insights.maps.defaultEditor || '',
            };
          }
          writeProjectMeta(zp4(nextId), meta);
        } catch (e) {
          console.warn('[projects/import] meta write failed', e && e.message ? e.message : e);
        }

        existing.add(key);
        imported += 1;
        importedPaths.push(up);
        nextId += 1;
      }

      const total = unique.size;
      const skipped = Math.max(0, total - imported);

      if (imported > 0) {
        pj.nextId = nextId;
        saveProjects(pj, { onlyIfChanged: false });
        invalidateProjectsCache();
        logLine({
          level: 'success',
          action: 'import_projects',
          message: 'Import des projets terminé',
          data: { total, imported, skipped },
        });
      } else {
        logLine({
          level: 'info',
          action: 'import_projects',
          message: 'Import des projets terminé (aucun nouveau projet)',
          data: { total, imported, skipped },
        });
      }

      return sendJSON(res, 200, { ok: true, total, imported, skipped, importedPaths, skippedPaths });
    }

    // ---- Projects GET/POST ----
    if (url.pathname === '/agent/projects') {
      if (req.method === 'GET') {
        const light = url.searchParams.get('light') === '1' || url.searchParams.get('light') === 'true';
        const payload = light ? getProjectsLight() : getProjectsCached();
        return sendJSONWithEtag(req, res, 200, payload);
      }
        if (req.method === 'POST') {
          const body = await parseBody(req);
          const pj = loadProjects();
          const prevProjects = Array.isArray(pj.projects) ? [...pj.projects] : [];
          const httpBindWarnings = [];

          if (Array.isArray(body.projects)) {
            const list = [];
            const seenIds = new Set();
            for (const it of body.projects) {
            const name = String(it?.name || '').trim();
            const up   = String(it?.uproject || it?.projectPath || '').trim();
            const createdAt = typeof it?.createdAt === 'string' ? it.createdAt : '';
            let engineVersion =
              String(it?.engineVersion || '').trim() ||
              readEngineVersionFromUproject(up) ||
              '';
            const id     = String(it?.id || '').trim();

            if (!isValidId(id)) {
              return sendJSON(res, 400, { ok: false, error: 'invalid_project_id', message: `ID projet invalide pour "${name || ''}" (4 chiffres attendus)` });
            }
            if (seenIds.has(id)) {
              return sendJSON(res, 400, { ok: false, error: 'duplicate_project_id', message: `ID projet dupliqué "${id}" dans le payload` });
            }
            seenIds.add(id);

              const prev = prevProjects.find(p =>
                (p && p.id && p.id === id) ||
                (p && p.uproject && up && String(p.uproject).trim().toLowerCase() === up.toLowerCase())
              );
              if (!engineVersion && prev && prev.engineVersion) {
                engineVersion = String(prev.engineVersion).trim();
              }

              const prevUp = String(prev?.uproject || prev?.projectPath || '').trim();
              const pathChanged =
                !!up && normalizePathKey(prevUp) !== normalizePathKey(up);

              if (pathChanged) {
                const bindRes = ensureHttpServerBindAddress(up, '0.0.0.0');
                if (!bindRes.ok) {
                  httpBindWarnings.push({
                    id,
                    name,
                    error: bindRes.error || 'unknown_error',
                    iniPath: bindRes.iniPath || '',
                  });
                }
              }

            // ⬇️ ICI on garde enfin note + createdAt dans le JSON
            list.push({ id, name, uproject: up, createdAt, engineVersion });

            // Mettre à jour les métadonnées projet (note / wrcName / favorite éventuel)
            const meta = readProjectMeta(id) || {};
            let metaChanged = false;
            if (typeof it?.note === 'string') { meta.note = it.note; metaChanged = true; }
            if (typeof it?.wrcName === 'string') { meta.wrcName = String(it.wrcName).trim(); metaChanged = true; }
            if (Object.prototype.hasOwnProperty.call(it || {}, 'favorite')) {
              meta.favorite = it.favorite === true;
              metaChanged = true;
            }
            if (metaChanged) {
              try { writeProjectMeta(id, meta); } catch {}
            }
          }
          pj.projects = list;

          // Nettoyage des layouts de production orphelins (projets supprimés) + métadonnées projet
          try {
            const prevIds = new Set(
              prevProjects
                .map(p => String(p.id || '').trim())
                .filter(Boolean)
            );
            const newIds = new Set(
              pj.projects
                .map(p => String(p.id || '').trim())
                .filter(Boolean)
            );

            for (const id of prevIds) {
              if (!id || newIds.has(id)) continue;
              try { deleteProjectDoc(id); } catch {}
              logLine({
                level: 'info',
                src: 'projects',
                action: 'delete_layout',
                message: `Layout de production supprimé pour le projet retiré ${id}`,
                data: { projectId: id, file: path.join(PRODUCTION_DIR, `${id}.json`) }
              });
              try { deleteProjectMeta(id); } catch {}
            }
          } catch {}
        }

        // activeId / activeName (optionnel)
        if (typeof body.activeId === 'string') {
          const nextActiveId = String(body.activeId || '').trim();
          if (nextActiveId && !isValidId(nextActiveId)) {
            return sendJSON(res, 400, { ok: false, error: 'invalid_active_id', message: 'activeId doit contenir 4 chiffres' });
          }
          pj.activeId = pj.projects.some(p => p.id === nextActiveId) ? nextActiveId : pj.activeId;
        }
        if (typeof body.activeName === 'string') {
          pj.activeName = body.activeName;
          const m = pj.projects.find(p =>
            String(p.name || '').trim().toLowerCase() === body.activeName.trim().toLowerCase()
          );
          if (m) pj.activeId = m.id;
        }

        // activeByHost : IP -> { projectId -> uproject } (IDs uniquement)
        if (body.activeByHost && typeof body.activeByHost === 'object') {
          const cleanABH = {};
          for (const [ip, mapping] of Object.entries(body.activeByHost)) {
            if (!mapping || typeof mapping !== 'object') continue;
            const m = {};
            for (const [key, val] of Object.entries(mapping)) {
              const id = isValidId(key) ? key : findProjectId(pj, key);
              const exists = id && pj.projects.some(p => p.id === id);
              if (id && isValidId(id) && exists && !m[id]) {
                m[id] = val;
              }
            }
            if (Object.keys(m).length) cleanABH[ip] = m;
          }
          pj.activeByHost = cleanABH;
        }

        // Recalcule propre de nextId = max(id)+1
        let maxNum = 0;
        pj.projects.forEach(p => {
          const n = Number(String(p.id || '').trim());
          if (isValidId(p.id) && Number.isFinite(n) && n > maxNum) maxNum = n;
        });
        pj.nextId = maxNum + 1;

        const projectsChanged = saveProjects(pj, { onlyIfChanged: true });
        if (projectsChanged) {
          invalidateProjectsCache();
          logLine({
            level: 'success',
            action: 'write_json',
            message: 'projects_server.json mis à jour',
            data: pj
          });
        }
          return sendJSON(res, 200, {
            ok: true,
            activeId: pj.activeId,
            nextId: pj.nextId,
            projects: pj.projects,
            httpBindWarnings
          });
        }
      }
    // ---- Quitter l'agent (optionnellement purge des logs) ----
    if (url.pathname === '/agent/quit' && req.method === 'POST') {
      const body = await parseBody(req);
      const doPurge = body?.purge !== false;

      if (doPurge) {
        purgeLogsFile();
        logLine({
          level: 'info',
          src: 'server',
          action: 'quit',
          message: 'Fermeture de l’agent demandée (logs purgés)',
        });
      } else {
        logLine({
          level: 'info',
          src: 'server',
          action: 'quit',
          message: 'Fermeture de l’agent demandée (sans purge)',
        });
      }

      // On ne force pas l'extinction du process ici (géré par l'hôte Electron)
      return sendJSON(res, 200, { ok: true, purged: doPurge });
    }

    // ---- 404 ----
    return sendJSON(res, 404, { ok:false, error:'not found' });
  } catch (e) {
    return sendHttpError(req, res, url, e);
  }
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.keepAliveTimeout = Math.min(KEEP_ALIVE_TIMEOUT_MS, REQUEST_TIMEOUT_MS);
server.headersTimeout = Math.min(
  REQUEST_TIMEOUT_MS,
  Math.max(server.keepAliveTimeout + 1000, HEADERS_TIMEOUT_MS)
);

server.on('error', (err) => {
  // Évite un crash si une autre instance de l’app (ou l’agent) écoute déjà sur ce port
  if (err && err.code === 'EADDRINUSE') {
    console.warn(`[UltiUnreal Agent] Port ${PORT} déjà utilisé. Ferme l’autre instance ou change agentPort.`);
    logLine({
      level: 'warn',
      src: 'server',
      action: 'server_port_in_use',
      message: `Le port ${PORT} est déjà utilisé`,
      data: { port: PORT, error: String(err?.message || err) },
    });
    return;
  }

  console.error('[UltiUnreal Agent] Server listen error:', err);
  logLine({
    level: 'error',
    src: 'server',
    action: 'server_listen_error',
    message: 'Erreur au démarrage de l’écoute serveur',
    data: { port: PORT, error: String(err?.message || err) },
  });
  throw err;
});

server.listen(PORT, () => {
  console.log(`[UltiUnreal Agent] ${NAME} v${VERSION} on http://127.0.0.1:${PORT}`);
  logLine({
    level: 'info',
    src: 'server',
    action: 'server_start',
    message: `Démarrage v${VERSION} sur le port ${PORT}`,
    data: { dataDir: DATA_DIR }
  });
});
