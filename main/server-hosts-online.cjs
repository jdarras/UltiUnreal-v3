// main/server-hosts-online.cjs
// Online map / présence volatile / heartbeat des hosts

const dgram = require('dgram');
const os = require('os');
const { readJSON } = require('./server-files.cjs');
const {
  hostsToList,
  getUnrealProcessCandidates,
  RENDER_AVAILABILITY_VALUES,
} = require('./server-normalize.cjs');

const DEFAULT_PRESENCE_TTL_MS = 30000;
const DEFAULT_DISCOVERY_INTERVAL_MS = 15000;
const DEFAULT_DISCOVERY_TIMEOUT_MS = 650;
const DEFAULT_DISCOVERY_CONCURRENCY = 48;
const DEFAULT_DISCOVERY_BROADCAST_INTERVAL_MS = 5000;
const MAX_DISCOVERY_CANDIDATES = 512;
const DISCOVERY_MESSAGE_TYPE = 'ultiunreal.station.presence';
const VIRTUAL_DISCOVERY_INTERFACE_RE = /(vpn|mcafee|wireguard|tailscale|zerotier|hamachi|virtual|vmware|virtualbox|hyper-v|wsl|docker|tap|tunnel|teredo|isatap|bluetooth)/i;

let ONLINE = {};             // ip -> { online, rtt, unrealRunning, ts }
let PRESENCE_VOLATILE = {};  // ip -> { ip, ts, name? }
let DISCOVERY_STATE = { running: false, lastStartedAt: 0 };
let UDP_DISCOVERY_STATE = { socket: null, timer: null, udpPort: 0 };

function isIpv4(value = '') {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(value || '').trim());
  if (!match) return false;
  return match.slice(1).every((part) => {
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

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

function shouldIncludeVirtualDiscoveryInterfaces(common = {}) {
  if (common?.stationDiscoveryIncludeVirtualInterfaces === true) return true;
  if (common?.stationDiscoveryIncludeVpn === true) return true;
  return /^(1|true|yes|on)$/i.test(String(process.env.UU_STATION_DISCOVERY_INCLUDE_VPN || '').trim());
}

function isPointToPointIpv4Address(addr = {}) {
  const netmask = String(addr?.netmask || '').trim();
  const cidr = String(addr?.cidr || '').trim();
  return netmask === '255.255.255.255' || /\/32$/i.test(cidr);
}

function isVirtualDiscoveryInterface(interfaceName = '') {
  return VIRTUAL_DISCOVERY_INTERFACE_RE.test(String(interfaceName || '').trim());
}

function shouldUseInterfaceForDiscovery(interfaceName = '', addr = {}, options = {}) {
  const ip = String(addr?.address || '').trim();
  if (!ip || addr?.internal || !isIpv4(ip)) return false;
  if (options?.includeVirtualInterfaces === true) return true;
  if (isPointToPointIpv4Address(addr)) return false;
  if (isVirtualDiscoveryInterface(interfaceName)) return false;
  return true;
}

function getLocalIpv4Addresses(options = {}) {
  const out = [];
  const seen = new Set();
  try {
    const ifaces = os.networkInterfaces() || {};
    for (const [interfaceName, arr] of Object.entries(ifaces)) {
      for (const addr of arr || []) {
        const ip = String(addr?.address || '').trim();
        if (!shouldUseInterfaceForDiscovery(interfaceName, addr, options)) continue;
        if (seen.has(ip)) continue;
        seen.add(ip);
        out.push(ip);
      }
    }
  } catch {}
  return out;
}

function ipv4ToNumber(value = '') {
  if (!isIpv4(value)) return null;
  const parts = String(value).split('.').map((part) => Number(part));
  return (((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3]) >>> 0;
}

function numberToIpv4(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '';
  const normalized = n >>> 0;
  return [
    (normalized >>> 24) & 255,
    (normalized >>> 16) & 255,
    (normalized >>> 8) & 255,
    normalized & 255,
  ].join('.');
}

function buildLanBroadcastAddresses(options = {}) {
  const out = new Set(['255.255.255.255']);
  try {
    const ifaces = os.networkInterfaces() || {};
    for (const [interfaceName, arr] of Object.entries(ifaces)) {
      for (const addr of arr || []) {
        const ip = String(addr?.address || '').trim();
        const netmask = String(addr?.netmask || '').trim();
        if (!shouldUseInterfaceForDiscovery(interfaceName, addr, options) || !isIpv4(netmask)) continue;
        const ipNum = ipv4ToNumber(ip);
        const maskNum = ipv4ToNumber(netmask);
        if (ipNum == null || maskNum == null) continue;
        const broadcast = numberToIpv4(((ipNum & maskNum) | (~maskNum >>> 0)) >>> 0);
        if (broadcast && broadcast !== ip) out.add(broadcast);
      }
    }
  } catch {}
  return [...out];
}

function buildLanDiscoveryCandidates(options = {}) {
  const locals = new Set(getLocalIpv4Addresses(options));
  const seen = new Set();
  const out = [];
  for (const localIp of locals) {
    const parts = localIp.split('.');
    if (parts.length !== 4) continue;
    const prefix = parts.slice(0, 3).join('.');
    for (let suffix = 1; suffix <= 254; suffix += 1) {
      const candidate = `${prefix}.${suffix}`;
      if (locals.has(candidate) || seen.has(candidate)) continue;
      seen.add(candidate);
      out.push(candidate);
      if (out.length >= MAX_DISCOVERY_CANDIDATES) return out;
    }
  }
  return out;
}

function normalizePositiveInteger(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw < min) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(raw)));
}

function resolveDiscoveryAgentPort(common = {}) {
  return normalizePositiveInteger(common?.agentPort || process.env.UU_AGENT_PORT, 4000, 1, 65535);
}

function resolveDiscoveryUdpPort(common = {}, fallbackPort = 4000) {
  return normalizePositiveInteger(
    common?.stationDiscoveryUdpPort ||
      common?.discoveryUdpPort ||
      process.env.UU_STATION_DISCOVERY_UDP_PORT ||
      fallbackPort,
    fallbackPort,
    1,
    65535
  );
}

function resolveDiscoveryBroadcastIntervalMs(common = {}) {
  return normalizePositiveInteger(
    common?.stationDiscoveryBroadcastIntervalMs ||
      Number(common?.stationDiscoveryBroadcastIntervalSec || 0) * 1000 ||
      process.env.UU_STATION_DISCOVERY_BROADCAST_INTERVAL_MS,
    DEFAULT_DISCOVERY_BROADCAST_INTERVAL_MS,
    1000,
    60000
  );
}

function isStationDiscoveryDisabled(common = {}) {
  return common?.stationDiscoveryEnabled === false || common?.lanDiscoveryEnabled === false;
}

function resolveLocalAnnouncement(common = {}) {
  const agentPort = resolveDiscoveryAgentPort(common);
  const includeVirtualInterfaces = shouldIncludeVirtualDiscoveryInterfaces(common);
  const usableLocalIps = getLocalIpv4Addresses({ includeVirtualInterfaces });
  const configuredIp = String(common?.localIp || common?.hostIp || '').trim();
  const ip = String(
    (usableLocalIps.includes(configuredIp) ? configuredIp : '') ||
    usableLocalIps[0] ||
    ''
  ).trim();
  const name = String(
    common?.hostName ||
    common?.stationName ||
    os.hostname() ||
    ip
  ).trim();
  return {
    ip,
    name: name || ip,
    agentPort,
  };
}

function recordDiscoveredPresence(raw = {}, source = 'discovery') {
  const ip = String(
    raw?.ip ||
    raw?.stationIp ||
    raw?.localIp ||
    raw?.address ||
    ''
  ).trim();
  if (!ip || !isIpv4(ip) || localIpSet().has(ip)) return false;
  const name = String(
    raw?.name ||
    raw?.stationName ||
    raw?.hostName ||
    ip
  ).trim();
  const agentPort = Number(raw?.agentPort || raw?.port || 0) || undefined;
  const renderAvailability = RENDER_AVAILABILITY_VALUES.includes(raw?.renderAvailability)
    ? raw.renderAvailability
    : null;
  PRESENCE_VOLATILE[ip] = {
    ip,
    name: name || ip,
    agentPort,
    renderAvailability,
    source,
    ts: new Date().toISOString(),
  };
  return true;
}

function normalizeStationIdentityKey(entry = {}) {
  const name = String(entry?.name || entry?.stationName || '').trim().toLowerCase();
  if (name) return `name:${name}`;
  const hostName = String(entry?.hostName || '').trim().toLowerCase();
  if (hostName) return `host:${hostName}`;
  const ip = String(entry?.ip || '').trim().toLowerCase();
  return ip ? `ip:${ip}` : '';
}

function privateIpPreference(ip = '') {
  const value = String(ip || '').trim();
  if (/^192\.168\./.test(value)) return 50;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return 45;
  if (/^10\./.test(value)) return 40;
  if (/^169\.254\./.test(value)) return 10;
  return 30;
}

function detectedStationScore(entry = {}) {
  const ip = String(entry?.ip || '').trim();
  let score = privateIpPreference(ip);
  if (entry?.agentPort) score += 2;
  if (entry?.renderAvailability === 'capable') score += 1;
  if (String(entry?.source || '').trim().toLowerCase() === 'udp') score += 1;
  return score;
}

function listDetectedStations(options = {}) {
  const ttlMs = options?.ttlMs || DEFAULT_PRESENCE_TTL_MS;
  const includeLocal = options?.includeLocal === true;
  const dedupe = options?.dedupe !== false;
  cleanupPresence(ttlMs);
  const locals = localIpSet();
  const out = [];
  for (const [ip, entry] of Object.entries(PRESENCE_VOLATILE || {})) {
    const key = String(ip || entry?.ip || '').trim();
    if (!key || !isIpv4(key)) continue;
    if (!includeLocal && locals.has(key)) continue;
    out.push({
      ip: key,
      name: String(entry?.name || entry?.stationName || key).trim() || key,
      agentPort: Number(entry?.agentPort || entry?.port || 0) || undefined,
      renderAvailability: RENDER_AVAILABILITY_VALUES.includes(entry?.renderAvailability)
        ? entry.renderAvailability
        : null,
      source: String(entry?.source || 'presence').trim() || 'presence',
      ts: entry?.ts || new Date().toISOString(),
    });
  }
  const deduped = dedupe
    ? [...out.reduce((byIdentity, entry) => {
      const identityKey = normalizeStationIdentityKey(entry);
      if (!identityKey) return byIdentity;
      const previous = byIdentity.get(identityKey);
      if (!previous || detectedStationScore(entry) > detectedStationScore(previous)) {
        byIdentity.set(identityKey, entry);
      }
      return byIdentity;
    }, new Map()).values()]
    : out;
  deduped.sort((a, b) => (
    String(a.name || a.ip).localeCompare(String(b.name || b.ip), undefined, { sensitivity: 'base' })
  ));
  return deduped;
}

function sendDiscoveryAnnouncement(socket, ctx = {}, udpPort = 4000) {
  if (!socket) return;
  const common = readJSON(ctx.COMMON_FILE) || {};
  if (isStationDiscoveryDisabled(common)) return;
  const announcement = resolveLocalAnnouncement(common);
  if (!announcement.ip || !isIpv4(announcement.ip)) return;
  const payload = {
    type: DISCOVERY_MESSAGE_TYPE,
    version: 1,
    ip: announcement.ip,
    stationIp: announcement.ip,
    name: announcement.name,
    stationName: announcement.name,
    agentPort: announcement.agentPort,
    port: announcement.agentPort,
    ts: new Date().toISOString(),
  };
  const message = Buffer.from(JSON.stringify(payload), 'utf8');
  const includeVirtualInterfaces = shouldIncludeVirtualDiscoveryInterfaces(common);
  for (const address of buildLanBroadcastAddresses({ includeVirtualInterfaces })) {
    try {
      socket.send(message, 0, message.length, udpPort, address);
    } catch {}
  }
}

function stopLanDiscoveryBroadcast() {
  if (UDP_DISCOVERY_STATE.timer) {
    clearInterval(UDP_DISCOVERY_STATE.timer);
  }
  if (UDP_DISCOVERY_STATE.socket) {
    try { UDP_DISCOVERY_STATE.socket.close(); } catch {}
  }
  UDP_DISCOVERY_STATE = { socket: null, timer: null, udpPort: 0 };
}

function ensureLanDiscoveryBroadcast(ctx = {}) {
  const common = readJSON(ctx.COMMON_FILE) || {};
  if (isStationDiscoveryDisabled(common)) {
    stopLanDiscoveryBroadcast();
    return false;
  }
  const agentPort = resolveDiscoveryAgentPort(common);
  const udpPort = resolveDiscoveryUdpPort(common, agentPort);
  if (UDP_DISCOVERY_STATE.socket && UDP_DISCOVERY_STATE.udpPort === udpPort) {
    return true;
  }

  stopLanDiscoveryBroadcast();
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  UDP_DISCOVERY_STATE = { socket, timer: null, udpPort };

  socket.on('message', (message, rinfo) => {
    try {
      const parsed = JSON.parse(String(message || ''));
      if (!parsed || parsed.type !== DISCOVERY_MESSAGE_TYPE) return;
      const remoteAddress = String(rinfo?.address || '').trim();
      recordDiscoveredPresence({
        ...parsed,
        ip: parsed.ip || parsed.stationIp || remoteAddress,
      }, 'udp');
    } catch {}
  });

  socket.on('error', () => {
    if (UDP_DISCOVERY_STATE.socket === socket) {
      stopLanDiscoveryBroadcast();
    } else {
      try { socket.close(); } catch {}
    }
  });

  const intervalMs = resolveDiscoveryBroadcastIntervalMs(common);
  socket.bind(udpPort, () => {
    try { socket.setBroadcast(true); } catch {}
    sendDiscoveryAnnouncement(socket, ctx, udpPort);
    const timer = setInterval(() => {
      sendDiscoveryAnnouncement(socket, ctx, udpPort);
    }, intervalMs);
    if (typeof timer.unref === 'function') timer.unref();
    if (UDP_DISCOVERY_STATE.socket === socket) {
      UDP_DISCOVERY_STATE.timer = timer;
    } else {
      clearInterval(timer);
    }
  });
  if (typeof socket.unref === 'function') socket.unref();
  return true;
}

async function fetchAgentPingForDiscovery(ip, port, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const response = await fetch(`http://${ip}:${port}/agent/ping`, {
      signal: ctrl.signal,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => null);
    if (!data || data.ok === false) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  const list = Array.isArray(items) ? items : [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, list.length) }, async () => {
    while (cursor < list.length) {
      const index = cursor;
      cursor += 1;
      await worker(list[index], index);
    }
  });
  await Promise.all(workers);
}

async function runLanDiscoveryOnce(ctx = {}) {
  if (DISCOVERY_STATE.running) return { ok: true, skipped: true };
  const common = readJSON(ctx.COMMON_FILE) || {};
  if (isStationDiscoveryDisabled(common)) {
    return { ok: true, skipped: true, disabled: true };
  }

  const port = resolveDiscoveryAgentPort(common);
  const timeoutMs = normalizePositiveInteger(
    common?.stationDiscoveryTimeoutMs || process.env.UU_STATION_DISCOVERY_TIMEOUT_MS,
    DEFAULT_DISCOVERY_TIMEOUT_MS,
    100,
    5000
  );
  const concurrency = normalizePositiveInteger(
    common?.stationDiscoveryConcurrency || process.env.UU_STATION_DISCOVERY_CONCURRENCY,
    DEFAULT_DISCOVERY_CONCURRENCY,
    1,
    128
  );
  const rawCandidates = Array.isArray(ctx.discoveryCandidates)
    ? ctx.discoveryCandidates
    : buildLanDiscoveryCandidates({
      includeVirtualInterfaces: shouldIncludeVirtualDiscoveryInterfaces(common),
    });
  const locals = localIpSet();
  const candidates = rawCandidates
    .map((candidate) => String(candidate || '').trim())
    .filter((candidate) => candidate && isIpv4(candidate) && !locals.has(candidate))
    .slice(0, MAX_DISCOVERY_CANDIDATES);

  if (candidates.length <= 0) return { ok: true, scanned: 0, detected: 0 };

  DISCOVERY_STATE = { running: true, lastStartedAt: Date.now() };
  let detectedCount = 0;
  try {
    await runWithConcurrency(candidates, concurrency, async (ip) => {
      const data = await fetchAgentPingForDiscovery(ip, port, timeoutMs);
      if (!data) return;
      const name = String(
        data.stationName ||
        data.hostName ||
        data.hostname ||
        data.name ||
        ip
      ).trim();
      recordDiscoveredPresence({
        ip,
        name: name || ip,
        agentPort: Number(data.port || port) || port,
        renderAvailability: data.renderAvailability,
      }, 'lan');
      detectedCount += 1;
    });
    return { ok: true, scanned: candidates.length, detected: detectedCount };
  } finally {
    DISCOVERY_STATE.running = false;
  }
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
    const avail = RENDER_AVAILABILITY_VALUES.includes(data.renderAvailability)
      ? data.renderAvailability
      : null;
    const renderReturnAt = typeof data.renderReturnAt === 'string' && data.renderReturnAt
      ? data.renderReturnAt
      : null;

    return { online:true, rtt: Date.now() - start, unrealRunning: running, renderAvailability: avail, renderReturnAt };
  } catch {
    clearTimeout(t);
    return { online:false, rtt:null, unrealRunning:false, renderAvailability: null };
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
  const presetName = 'RemoteControlPreset';
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

    const prevAvail = ONLINE[ip]?.renderAvailability;
    ONLINE[ip] = {
      online: !!now.online,
      rtt: typeof now.rtt === 'number' ? now.rtt : null,
      unrealRunning: !!now.unrealRunning,
      renderAvailability: RENDER_AVAILABILITY_VALUES.includes(now.renderAvailability)
        ? now.renderAvailability
        : (RENDER_AVAILABILITY_VALUES.includes(prevAvail) ? prevAvail : 'capable'),
      renderReturnAt: typeof now.renderReturnAt === 'string' && now.renderReturnAt
        ? now.renderReturnAt
        : (ONLINE[ip]?.renderReturnAt || null),
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
    ensureLanDiscoveryBroadcast(ctx);
    // Nettoyage des présences volatiles à chaque tick
    cleanupPresence(presenceTtlMs);
    const discoveryIntervalMs = normalizePositiveInteger(
      common?.stationDiscoveryIntervalMs || Number(common?.stationDiscoveryIntervalSec || 0) * 1000,
      DEFAULT_DISCOVERY_INTERVAL_MS,
      2000,
      120000
    );
    if (Date.now() - Number(DISCOVERY_STATE.lastStartedAt || 0) >= discoveryIntervalMs) {
      runLanDiscoveryOnce(ctx).catch(() => {});
    }
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
    const locals = localIpSet();

    for (const [ip, st] of Object.entries(ONLINE || {})) {
      items[ip] = {
        ip,
        online: !!st.online,
        unrealRunning: !!st.unrealRunning,
        rtt: typeof st.rtt === 'number' ? st.rtt : null,
        renderAvailability: RENDER_AVAILABILITY_VALUES.includes(st.renderAvailability)
          ? st.renderAvailability
          : 'capable',
        renderReturnAt: typeof st.renderReturnAt === 'string' && st.renderReturnAt
          ? st.renderReturnAt
          : null,
        ts: st.ts || new Date().toISOString(),
      };
    }

    const detected = {};
    for (const entry of listDetectedStations({ ttlMs: presenceTtlMs })) {
      const key = String(entry?.ip || '').trim();
      if (!key || locals.has(key)) continue;
      detected[key] = {
        ip: key,
        ts: entry?.ts || new Date().toISOString(),
        name: entry?.name || '',
        agentPort: Number(entry?.agentPort || 0) || undefined,
        renderAvailability: RENDER_AVAILABILITY_VALUES.includes(entry?.renderAvailability)
          ? entry.renderAvailability
          : null,
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
      if (localIpSet().has(ip)) {
        return sendJSON(res, 200, { ok: true, ignored: true });
      }
      const name = typeof body?.name === 'string' ? body.name : '';
      recordDiscoveredPresence({
        ip,
        name,
        agentPort: Number(body?.agentPort || 0) || undefined,
        renderAvailability: body?.renderAvailability,
      }, 'presence');
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
  runLanDiscoveryOnce,
  buildLanDiscoveryCandidates,
  buildLanBroadcastAddresses,
  ensureLanDiscoveryBroadcast,
  stopLanDiscoveryBroadcast,
  cleanupPresence,
  isUnrealProcessRunning,
  listDetectedStations,
  recordDiscoveredPresence,
  getOnlineState: () => ONLINE,
  setOnlineState: (s) => { ONLINE = s || {}; },
  getPresenceVolatile: () => PRESENCE_VOLATILE,
  setPresenceVolatile: (s) => { PRESENCE_VOLATILE = s || {}; },
};
