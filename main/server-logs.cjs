// main/server-logs.cjs
// Gestion des logs (lecture, agrégation, purge)
// Endpoints :
//   GET  /agent/logs
//   GET  /agent/logs/all
//   GET  /agent/logs/storage
//   POST /agent/logs/purge

const fs = require('fs');
const os = require('os');
const { readJSON } = require('./server-files.cjs');
const { hostsToList } = require('./server-normalize.cjs');

const MAX_JSON_BODY_BYTES = Math.max(
  1024,
  Math.trunc(Number(process.env.UU_AGENT_MAX_JSON_BODY_BYTES || (2 * 1024 * 1024)))
);

function createHttpError(statusCode, code, message, details = null) {
  const err = new Error(String(message || code || 'request error'));
  err.statusCode = Number(statusCode) || 500;
  err.code = String(code || 'request_error');
  if (details && typeof details === 'object') err.details = details;
  return err;
}

function parseTsMs(raw) {
  if (raw === null || raw === undefined || raw === '') return 0;
  const n = Number(raw);
  if (Number.isFinite(n)) {
    // Accepte secondes (epoch) et millisecondes.
    if (n > 0 && n < 1e12) return Math.trunc(n * 1000);
    return Math.trunc(n);
  }
  const d = new Date(raw);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function getLogTsMs(entry) {
  if (!entry || typeof entry !== 'object') return 0;
  return parseTsMs(entry.ts ?? entry.timestamp ?? entry.time);
}

function parseSinceMs(since) {
  if (!since) return null;
  const n = Number(since);
  if (Number.isFinite(n)) {
    if (n > 0 && n < 1e12) return Math.trunc(n * 1000);
    return Math.trunc(n);
  }
  const d = new Date(since);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function normalizeLogStore(raw = null) {
  if (!raw || typeof raw !== 'object') return null;
  const warnAt = Math.max(0, Number(raw.warnAt || 1500));
  const hardLimit = Math.max(1, Number(raw.hardLimit || 2000));
  const lineCount = Math.max(0, Number(raw.lineCount || 0));
  const saturated = !!raw.saturated || lineCount >= hardLimit;
  const warnReached = !!raw.warnReached || saturated || lineCount >= warnAt;
  return {
    lineCount,
    warnAt,
    hardLimit,
    warnReached,
    saturated,
  };
}

function logStoreState(logStore = null) {
  const s = normalizeLogStore(logStore);
  if (!s) return 'unknown';
  if (s.saturated) return 'saturated';
  if (s.warnReached || s.lineCount >= s.warnAt) return 'warn';
  return 'ok';
}

function buildLogStorageEntry({ ip = '', name = '', source = 'host', logStore = null, error = '' } = {}) {
  const normalizedStore = normalizeLogStore(logStore);
  const normalizedError = String(error || '').trim();
  return {
    ip: String(ip || '').trim(),
    name: String(name || '').trim(),
    source: String(source || 'host').trim() || 'host',
    state: logStoreState(normalizedStore),
    logStore: normalizedStore,
    ...(normalizedError ? { error: normalizedError } : {}),
    ts: new Date().toISOString(),
  };
}

function summarizeLogStorage(items = []) {
  let ok = 0;
  let warn = 0;
  let saturated = 0;
  let unknown = 0;

  for (const it of items) {
    const st = String(it?.state || '').trim().toLowerCase();
    if (st === 'saturated') { saturated += 1; continue; }
    if (st === 'warn') { warn += 1; continue; }
    if (st === 'ok') { ok += 1; continue; }
    unknown += 1;
  }

  return {
    total: items.length,
    ok,
    warn,
    saturated,
    unknown,
    alertCount: warn + saturated,
    maxLevel: saturated > 0 ? 'saturated' : (warn > 0 ? 'warn' : (unknown > 0 ? 'unknown' : 'ok')),
    ts: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Lecture filtrée d’un fichier log
// options : { limit, levels (array), since (ts en ms ou date string) }
// ---------------------------------------------------------------------------
const ALLOWED_LEVELS = new Set(['success','info','warn','error','debug']);
function readLogsFiltered(filename, { limit = 300, levels = null, since = null } = {}) {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    const lines = data.split(/\r?\n/).filter(Boolean);
    const sinceMs = parseSinceMs(since);

    let levelSet = null;
    if (Array.isArray(levels) && levels.length) {
      levelSet = new Set(
        levels.map(l => String(l || '').toLowerCase()).filter(l => ALLOWED_LEVELS.has(l))
      );
    }

    const parsed = lines.map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { ts: Date.now(), level: 'warn', message: line };
      }
    });

    const filtered = parsed.filter((it) => {
      if (levelSet && !levelSet.has(String(it.level || 'info').toLowerCase())) return false;
      if (sinceMs !== null && getLogTsMs(it) < sinceMs) return false;
      return true;
    });

    const sorted = filtered
      .map((it, idx) => ({ it, idx, tsMs: getLogTsMs(it) }))
      .sort((a, b) => {
        if (a.tsMs !== b.tsMs) return a.tsMs - b.tsMs;
        return a.idx - b.idx;
      })
      .map((x) => x.it);

    const max = Number(limit) || 300;
    return sorted.slice(-max);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Purge du fichier log
// ---------------------------------------------------------------------------
function purgeLogs(filename) {
  try {
    if (fs.existsSync(filename)) {
      fs.writeFileSync(filename, '', 'utf8');
    }
    return true;
  } catch {
    return false;
  }
}

function getLocalIps() {
  const set = new Set(['127.0.0.1', 'localhost']);
  const ifaces = os.networkInterfaces() || {};
  for (const list of Object.values(ifaces)) {
    for (const addr of list || []) {
      const ip = String(addr?.address || '').trim().toLowerCase();
      if (ip) set.add(ip);
    }
  }
  return set;
}

// Lecture stricte du body JSON (erreurs explicites 400/413)
function parseBody(req) {
  const declaredLen = Number(req?.headers?.['content-length']);
  if (Number.isFinite(declaredLen) && declaredLen > MAX_JSON_BODY_BYTES) {
    try { req.resume(); } catch {}
    return Promise.reject(createHttpError(413, 'payload_too_large', `JSON body exceeds ${MAX_JSON_BODY_BYTES} bytes`, {
      maxBytes: MAX_JSON_BODY_BYTES,
      contentLength: Math.trunc(declaredLen),
    }));
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

    const onAborted = () => fail(createHttpError(400, 'request_aborted', 'Request body aborted by client'));
    const onError = (err) => fail(createHttpError(400, 'request_stream_error', 'Request stream error', {
      error: String(err?.message || err),
    }));
    const onData = (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buf.length;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        req.off('data', onData);
        req.off('end', onEnd);
        try { req.resume(); } catch {}
        fail(createHttpError(413, 'payload_too_large', `JSON body exceeds ${MAX_JSON_BODY_BYTES} bytes`, {
          maxBytes: MAX_JSON_BODY_BYTES,
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

// ---------------------------------------------------------------------------
// Handler principal : handleLogs()
// ---------------------------------------------------------------------------
async function handleLogs(req, res, url, context) {
  const { sendJSON, logLine, COMMON_FILE, HOSTS_FILE, LOG_FILE, getJSON } =
    context || {};
  const getLogStorageStatus =
    context && typeof context.getLogStorageStatus === 'function'
      ? context.getLogStorageStatus
      : null;
  const resetLogStorageState =
    context && typeof context.resetLogStorageState === 'function'
      ? context.resetLogStorageState
      : null;

  if (typeof sendJSON !== 'function') {
    throw new Error('handleLogs requires sendJSON in context');
  }

  const search = url.searchParams || new URLSearchParams();
  const qLimit = Number(search.get('limit') || 0);
  const limit = qLimit > 0 ? Math.min(qLimit, 5000) : 300;
  const levelParam = search.get('level') || '';
  const levels = levelParam ? levelParam.split(',').map(s => s.trim()).filter(Boolean) : null;
  const sinceParam = search.get('since') || null;
  const sinceMs = parseSinceMs(sinceParam);
  const levelSet = Array.isArray(levels) && levels.length
    ? new Set(levels.map((l) => String(l || '').toLowerCase()).filter((l) => ALLOWED_LEVELS.has(l)))
    : null;
  const includeAllHosts =
    search.get('all') === '1' ||
    search.get('allHosts') === '1';

  // ---- État stockage logs (léger) ----
  if (req.method === 'GET' && url.pathname === '/agent/logs/storage') {
    const localStore = normalizeLogStore(getLogStorageStatus ? getLogStorageStatus() : null);
    const hosts = readJSON(HOSTS_FILE) || {};
    const list = hostsToList(hosts);
    const localIps = getLocalIps();

    let localHost = null;
    for (const h of list) {
      const hip = String(h?.ip || '').trim();
      if (!hip) continue;
      if (localIps.has(hip.toLowerCase())) {
        localHost = h;
        break;
      }
    }

    const localEntry = buildLogStorageEntry({
      ip: localHost?.ip || '127.0.0.1',
      name: localHost?.name || localHost?.ip || 'Local',
      source: 'local',
      logStore: localStore,
    });

    const items = [localEntry];

    if (includeAllHosts) {
      const common = readJSON(COMMON_FILE) || {};
      const agentPort = common.agentPort || 4000;
      const canCallRemote = typeof getJSON === 'function';

      if (canCallRemote) {
        const remoteItems = await Promise.all(
          list.map(async (h) => {
            const hip = String(h?.ip || '').trim();
            if (!hip) return null;
            if (localIps.has(hip.toLowerCase())) return null;
            const hostName = String(h?.name || hip).trim();
            try {
              const remote = await getJSON(`http://${hip}:${agentPort}/agent/logs/storage`, 3000);
              const remoteLocal = remote && typeof remote === 'object'
                ? (remote.local && typeof remote.local === 'object' ? remote.local : remote)
                : null;
              const remoteStore = normalizeLogStore(
                remoteLocal?.logStore ||
                (remote && typeof remote === 'object' ? remote.logStore : null)
              );
              return buildLogStorageEntry({
                ip: remoteLocal?.ip || hip,
                name: remoteLocal?.name || hostName,
                source: 'remote',
                logStore: remoteStore,
              });
            } catch (e) {
              logLine?.({
                level: 'warn',
                src: 'server',
                action: 'logs_storage_remote',
                host: hip,
                message: `Impossible de lire le statut logs du host ${hip}`,
                data: { error: String(e?.message || e) },
              });
              return buildLogStorageEntry({
                ip: hip,
                name: hostName,
                source: 'remote',
                logStore: null,
                error: String(e?.message || e),
              });
            }
          })
        );

        for (const entry of remoteItems) {
          if (!entry) continue;
          items.push(entry);
        }
      }
    }

    return sendJSON(res, 200, {
      ok: true,
      local: localEntry,
      items,
      summary: summarizeLogStorage(items),
    });
  }

  // ---- Lecture logs serveur (/agent/logs) ----
  if (req.method === 'GET' && url.pathname === '/agent/logs') {
    const logs = readLogsFiltered(LOG_FILE, { limit, levels, since: sinceParam });
    return sendJSON(res, 200, {
      ok: true,
      logs,
      items: logs,
      logStore: getLogStorageStatus ? getLogStorageStatus() : null,
    });
  }

  // ---- Lecture logs serveur + clients (/agent/logs/all) ----
  if (req.method === 'GET' && url.pathname === '/agent/logs/all') {
    const logs = readLogsFiltered(LOG_FILE, { limit, levels, since: sinceParam });
    const localIps = getLocalIps();

    const hosts = readJSON(HOSTS_FILE) || {};
    const list = hostsToList(hosts);

    const common = readJSON(COMMON_FILE) || {};
    const agentPort = common.agentPort || 4000;

    const results = await Promise.all(
      list.map(async (h) => {
        const hip = String(h.ip || '').trim();
        if (!hip) return [];

        // On évite de relire la machine locale (sinon on duplique les logs)
        const hipLow = hip.toLowerCase();
        if (localIps.has(hipLow)) {
          return [];
        }
        try {
          let qs = [];
          if (limit) qs.push(`limit=${encodeURIComponent(limit)}`);
          if (levels && levels.length) qs.push(`level=${levels.join(',')}`);
          if (sinceParam) qs.push(`since=${encodeURIComponent(sinceParam)}`);
          const remote = await getJSON(
            `http://${hip}:${agentPort}/agent/logs${qs.length ? `?${qs.join('&')}` : ''}`,
            3000
          );
          return Array.isArray(remote?.logs) ? remote.logs : [];
        } catch (e) {
          logLine?.({
            level: 'warn',
            src: 'server',
            action: 'logs_remote',
            host: hip,
            message: `Impossible de lire les logs du host ${hip}`,
            data: { error: String(e?.message || e) },
          });
          return [];
        }
      })
    );

    // On fusionne et on refiltre/slice au besoin
    const all = [...logs, ...results.flat()];
    const allSorted = all
      .map((it, idx) => ({ it, idx, tsMs: getLogTsMs(it) }))
      .sort((a, b) => {
        if (a.tsMs !== b.tsMs) return a.tsMs - b.tsMs;
        return a.idx - b.idx;
      });

    // Dedup simple pour éviter les doublons (local + remote)
    const seen = new Set();
    const uniq = [];
    for (let i = 0; i < allSorted.length; i += 1) {
      const { it, tsMs } = allSorted[i];
      const key = `${it.ts}|${it.action}|${it.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push({ it, idx: i, tsMs });
    }

    // Applique une dernière fois les filtres since/levels et le cap limit
    const filtered = uniq.filter(({ it, tsMs }) => {
      if (levelSet && !levelSet.has(String(it.level || 'info').toLowerCase())) return false;
      if (sinceMs !== null && tsMs < sinceMs) return false;
      return true;
    }).sort((a, b) => {
      if (a.tsMs !== b.tsMs) return a.tsMs - b.tsMs;
      return a.idx - b.idx;
    }).map((x) => x.it).slice(-limit);

    return sendJSON(res, 200, {
      ok: true,
      logs: filtered,
      items: filtered,
      logStore: getLogStorageStatus ? getLogStorageStatus() : null,
    });
  }

  // ---- Purge des logs serveur (/agent/logs/purge) ----
  if (req.method === 'POST' && url.pathname === '/agent/logs/purge') {
    const search = url.searchParams || new URLSearchParams();
    const body = await parseBody(req);
    const all =
      search.get('all') === '1' ||
      search.get('allHosts') === '1' ||
      body?.all === true ||
      body?.allHosts === true;

    const ok = purgeLogs(LOG_FILE);
    if (ok && resetLogStorageState) {
      resetLogStorageState();
    }
    logLine?.({
      level: ok ? 'info' : 'error',
      src: 'server',
      action: 'purge_logs',
      message: ok ? 'Logs serveur purgés' : 'Erreur purge logs',
    });

    if (all) {
      const common = readJSON(COMMON_FILE) || {};
      const agentPort = common.agentPort || 4000;
      const hosts = readJSON(HOSTS_FILE) || {};
      const list = hostsToList(hosts);
      const localIps = getLocalIps();

      for (const h of list) {
        const hip = String(h.ip || '').trim();
        if (!hip) continue;
        const hipLow = hip.toLowerCase();
        if (localIps.has(hipLow)) continue;

        const target = `http://${hip}:${agentPort}/agent/logs/purge`;
        try {
          const r = await fetch(target, { method: 'POST' });
          const txt = await r.text().catch(() => '');
          if (!r.ok) {
            logLine?.({
              level: 'warn',
              src: 'server',
              action: 'purge_logs_remote',
              host: hip,
              message: `purge remote logs failed (${r.status})`,
              data: { response: txt.slice(0, 500) },
            });
          } else {
            logLine?.({
              level: 'info',
              src: 'server',
              action: 'purge_logs_remote',
              host: hip,
              message: 'purge remote logs ok',
            });
          }
        } catch (e) {
          logLine?.({
            level: 'warn',
            src: 'server',
            action: 'purge_logs_remote',
            host: hip,
            message: 'purge remote logs exception',
            data: { error: String(e?.message || e) },
          });
        }
      }
    }

    return sendJSON(res, 200, {
      ok,
      logStore: getLogStorageStatus ? getLogStorageStatus() : null,
    });
  }

  // ---- Log UI (actions widgets en production) ----
  if (req.method === 'POST' && url.pathname === '/agent/logs/ui') {
    const body = await parseBody(req);
    const lvl = String(body.level || '').toLowerCase();
    const level = ['success', 'info', 'warn', 'error', 'debug'].includes(lvl)
      ? lvl
      : 'info';
    const action = String(body.action || 'widget_press').trim() || 'widget_press';

    const msg =
      String(body.message || '').trim() ||
      (body.widgetLabel ? `UI ${body.widgetLabel}` : `UI ${action}`);

    const targets = Array.isArray(body.targets)
      ? body.targets.filter(Boolean)
      : [];

    logLine?.({
      level,
      src: 'ui',
      action,
      host: '',
      message: msg,
      data: {
        scope: body.scope || '',
        widgetId: body.widgetId || '',
        widgetType: body.widgetType || '',
        widgetLabel: body.widgetLabel || '',
        value: body.value,
        targets,
      },
    });

    return sendJSON(res, 200, { ok: true });
  }

  // ---- Aucun endpoint log ne correspond ----
  return false;
}

module.exports = { handleLogs };
