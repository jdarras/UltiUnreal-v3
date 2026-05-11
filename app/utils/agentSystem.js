import { readIdentity } from './identity';
import {
  httpGet, httpPost, httpRequest, toRequestError,
  normalizeHosts, getBase,
  __agentRequest,
} from './agentHttp.js';

export function getCompanionBaseUrl() {
  const id = readIdentity();
  const mode = String(id?.mode || '').trim().toLowerCase();
  const port = id?.agentPort || 4000;
  if (mode === 'postprod') {
    return getBase();
  }
  const role = id?.role || 'server';

  if (role === 'server') {
    const ip = String(id.localIp || '').trim();
    const host = ip || '127.0.0.1';
    return `http://${host}:${port}`;
  }

  const host = String(id.serverIp || '').trim();
  if (!host) throw new Error('serverIp manquant dans uu_identity (rôle client)');
  return `http://${host}:${port}`;
}

export function getAgentBaseUrl() {
  return getBase();
}

export async function getHosts()  { const raw = await httpGet('/agent/hosts'); return normalizeHosts(raw); }
export async function getProjects(opts = {}) {
  const light = opts.light ? '?light=1' : '';
  const timeoutMsRaw = Number(opts.timeoutMs);
  const timeoutMs = Number.isFinite(timeoutMsRaw) && timeoutMsRaw > 0
    ? Math.trunc(timeoutMsRaw)
    : 5000;
  return await httpGet(`/agent/projects${light}`, timeoutMs);
}
export async function getCommon() { return await httpGet('/agent/common'); }
export async function getPresence() { return await httpGet('/agent/presence'); }
export async function getOnlineStatus() { return await httpGet('/agent/online'); }
export async function postPresence(body = {}) { return await httpPost('/agent/presence', body); }

export async function setAgentRenderAvailability(renderAvailability = 'capable', renderReturnAt = null, timeoutMs = 5000) {
  const nextAvailability = String(renderAvailability || '').trim().toLowerCase();
  if (!['capable', 'busy', 'excluded'].includes(nextAvailability)) {
    throw new Error('invalid renderAvailability, expected: capable | busy | excluded');
  }
  const body = {
    renderAvailability: nextAvailability,
    renderReturnAt: (nextAvailability === 'busy' && typeof renderReturnAt === 'string' && renderReturnAt.trim())
      ? renderReturnAt.trim()
      : null,
  };
  const res = await httpRequest('/agent/availability', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, renderAvailability: nextAvailability, renderReturnAt: body.renderReturnAt };
}

export async function postCommon(patch = {}) {
  return await httpPost('/agent/common', patch);
}

export async function pingLocalAgent(port) {
  const url = `http://127.0.0.1:${Number(port)}/agent/ping`;
  return await __agentRequest('GET', url);
}

export async function postCommonAtPort(port, payload = {}) {
  const url = `http://127.0.0.1:${Number(port)}/agent/common`;
  return await __agentRequest('POST', url, payload);
}

export async function getOnlineMap() {
  try {
    const id = readIdentity();
    let localIp = String(id?.localIp || '').trim().toLowerCase();

    const common = await getCommon().catch(() => ({}));
    const port = Number(common?.agentPort || 4000);

    const hosts = await getHosts().catch(() => []);
    const list = Array.isArray(hosts) ? hosts : [];

    const res = await fetch(`http://127.0.0.1:${port}/agent/online`);
    const j = await res.json().catch(() => ({}));
    const now = new Date().toISOString();

    let items = j && j.ok && j.items ? j.items : {};

    if (Array.isArray(items)) {
      const map = {};
      for (const it of items) {
        if (it && it.ip) {
          const key = String(it.ip).trim();
          if (key) map[key] = it;
        }
      }
      items = map;
    } else if (!items || typeof items !== 'object') {
      items = {};
    }

    const out = {};
    for (const h of list) {
      const ipRaw = String(h?.ip || '').trim();
      if (!ipRaw) continue;
      const ipKey = ipRaw.toLowerCase();

      const it = items[ipRaw] || {};

      let online = !!it.online;
      let unrealRunning =
        typeof it.unrealRunning === 'boolean' ? it.unrealRunning : null;

      const isLocalHost =
        !!localIp && ipKey === localIp;

      if (isLocalHost) {
        online = true;
      }

      const VALID_AVAIL = ['capable', 'busy', 'excluded'];
      const renderAvailability = VALID_AVAIL.includes(it.renderAvailability)
        ? it.renderAvailability
        : 'capable';
      const renderReturnAt = typeof it.renderReturnAt === 'string' && it.renderReturnAt
        ? it.renderReturnAt
        : null;
      out[ipRaw] = {
        online,
        unrealRunning,
        rtt: it.rtt ?? null,
        renderAvailability,
        renderReturnAt,
        ts: it.ts || now,
        name: String(h?.name || '').trim() || ipRaw,
      };
    }

    return out;
  } catch {
    return {};
  }
}
