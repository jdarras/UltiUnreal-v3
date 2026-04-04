// main/server-hosts-online.cjs
// Online map / présence volatile / heartbeat des hosts

const os = require('os');
const { readJSON } = require('./server-files.cjs');
const {
  hostsToList,
  getUnrealProcessCandidates,
} = require('./server-normalize.cjs');

const DEFAULT_PRESENCE_TTL_MS = 30000;

let ONLINE = {};             // ip -> { online, rtt, unrealRunning, ts }
let PRESENCE_VOLATILE = {};  // ip -> { ip, ts, name? }

function localIpSet() {
  const set = new Set(['127.0.0.1', 'localhost']);
  try {
    const ifaces = os.networkInterfaces() || {};
    for (const arr of Object.values(ifaces)) {
      for (const addr of arr || []) {
        const ip = String(addr.address || '').trim();
        if (ip) set.add(ip);
      }
    }
  } catch {}
  return set;
}

function cleanupPresence(ttlMs = DEFAULT_PRESENCE_TTL_MS) {
  const now = Date.now();
  for (const [ip, entry] of Object.entries(PRESENCE_VOLATILE || {})) {
    const ts = Date.parse(entry?.ts || '');
    if (!Number.isFinite(ts) || now - ts > ttlMs) {
      delete PRESENCE_VOLATILE[ip];
    }
  }
}

function isUnrealProcessRunning(names = []) {
  try {
    const candidates = names.length
      ? names
      : ['UnrealEditor.exe', 'UE4Editor.exe', 'UE5Editor.exe', 'UE4Game.exe', 'UE5Game.exe'];

    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      const out = execSync('tasklist', { encoding: 'utf8' });
      const lower = out.toLowerCase();
      return candidates.some((n) => lower.includes(String(n || '').toLowerCase()));
    }
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const { execSync } = require('child_process');
      const out = execSync('ps -A -o comm', { encoding: 'utf8' });
      const lower = out.toLowerCase();
      return candidates.some((n) => lower.includes(String(n || '').toLowerCase().replace('.exe', '')));
    }
  } catch {
    // ignore errors
  }
  return false;
}

async function pingPreset(ip, port, presetName, timeoutMs = 1000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const url = `http://${ip}:${port}/remote/preset/${encodeURIComponent(presetName || 'RemoteControlPreset')}`;
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}

async function pingOnce(ip, port, timeoutMs = 2000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const url = `http://${ip}:${port}/agent/ping`;
  const start = Date.now();
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return { online:false, rtt:null, unrealRunning:false };

    const data = await r.json().catch(() => ({}));
    const running = !!data.unrealRunning;

    return { online:true, rtt: Date.now() - start, unrealRunning: running };
  } catch {
    clearTimeout(t);
    return { online:false, rtt:null, unrealRunning:false };
  }
}

// Ping périodique de tous les hosts (y compris la machine locale)
async function heartbeatOnce(ctx = {}) {
  const { COMMON_FILE, HOSTS_FILE } = ctx;
  const common    = readJSON(COMMON_FILE) || {};
  const rawHosts  = readJSON(HOSTS_FILE)  || {};
  const list      = hostsToList(rawHosts);
  const agentPort = common?.agentPort || 4000;
  const rcHttpPort = common?.rcHttpPort || 30010;
  const presetName = common?.webRemoteControlName || 'RemoteControlPreset';
  const locals = localIpSet();

  for (const h of list) {
    const ip = String(h?.ip || '').trim();
    if (!ip) continue;

    let now = { online: false, rtt: null, unrealRunning: false };
    const treatAsLocal = locals.has(ip);

    try {
      if (treatAsLocal) {
        // Pour la machine locale, on parle à l'agent en 127.0.0.1
        now = await pingOnce('127.0.0.1', agentPort);
        // Si l'agent ne sait pas si Unreal tourne, fallback via les process locaux
        if (!now.unrealRunning) {
          const candidates = getUnrealProcessCandidates(h);
          if (isUnrealProcessRunning(candidates)) {
            now = { online: true, rtt: now.rtt, unrealRunning: true };
          }
        }
      } else {
        // Hosts distants : ping classique sur leur IP
        now = await pingOnce(ip, agentPort);
      }

      // Si le ping agent ne sait pas si Unreal tourne, tentative via WRC direct
      if (!now.unrealRunning && rcHttpPort) {
        try {
          const ok = await pingPreset(ip, rcHttpPort, presetName, 1200);
          if (ok) {
            now = { online: true, rtt: now.rtt, unrealRunning: true };
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // si le ping plante → on laisse now = offline
    }

    ONLINE[ip] = {
      online: !!now.online,
      rtt: typeof now.rtt === 'number' ? now.rtt : null,
      unrealRunning: !!now.unrealRunning,
      ts: new Date().toISOString()
    };
  }
}

function heartbeatLoop(ctx = {}) {
  const { presenceTtlMs = DEFAULT_PRESENCE_TTL_MS } = ctx;
  const run = async () => {
    const startedAt = Date.now();
    try { await heartbeatOnce(ctx); } catch {}
    const common = readJSON(ctx.COMMON_FILE) || {};
    const sec = Math.max(2, Number(common?.refreshSec || 5));
    // Nettoyage des présences volatiles à chaque tick
    cleanupPresence(presenceTtlMs);
    const targetMs = sec * 1000;
    const elapsed = Date.now() - startedAt;
    const waitMs = Math.max(150, targetMs - elapsed);
    setTimeout(run, waitMs);
  };
  run();
}

async function handleHostsOnlineRoutes(req, res, url, ctx = {}) {
  const { sendJSON, parseBody } = ctx;
  const presenceTtlMs = ctx.presenceTtlMs || DEFAULT_PRESENCE_TTL_MS;

  // ---- Online map agrégée ----
  if (req.method === 'GET' && url.pathname === '/agent/online') {
    const items = {};
    cleanupPresence(presenceTtlMs);

    for (const [ip, st] of Object.entries(ONLINE || {})) {
      items[ip] = {
        ip,
        online: !!st.online,
        unrealRunning: !!st.unrealRunning,
        rtt: typeof st.rtt === 'number' ? st.rtt : null,
        ts: st.ts || new Date().toISOString(),
      };
    }

    const detected = {};
    for (const [ip, entry] of Object.entries(PRESENCE_VOLATILE || {})) {
      const key = String(ip || '').trim();
      if (!key) continue;
      detected[key] = {
        ip: key,
        ts: entry?.ts || new Date().toISOString(),
        name: entry?.name || '',
        online: true,
        unrealRunning: false,
        rtt: null,
      };
    }

    return sendJSON(res, 200, { ok: true, items, detected });
  }

  // ---- Présence éphémère ----
  if (url.pathname === '/agent/presence') {
    if (req.method === 'POST') {
      cleanupPresence(presenceTtlMs);
      const body = await parseBody(req);
      const ip = String(body?.ip || '').trim();
      if (!ip) {
        return sendJSON(res, 400, { ok: false, error: 'missing ip' });
      }
      const name = typeof body?.name === 'string' ? body.name : '';
      PRESENCE_VOLATILE[ip] = {
        ip,
        name,
        ts: new Date().toISOString(),
      };
      return sendJSON(res, 200, { ok: true });
    }
    if (req.method === 'GET') {
      cleanupPresence(presenceTtlMs);
      return sendJSON(res, 200, { ok: true, items: { ...(PRESENCE_VOLATILE || {}) } });
    }
  }

  return false;
}

module.exports = {
  handleHostsOnlineRoutes,
  heartbeatLoop,
  heartbeatOnce,
  cleanupPresence,
  isUnrealProcessRunning,
  getOnlineState: () => ONLINE,
  setOnlineState: (s) => { ONLINE = s || {}; },
  getPresenceVolatile: () => PRESENCE_VOLATILE,
  setPresenceVolatile: (s) => { PRESENCE_VOLATILE = s || {}; },
};
