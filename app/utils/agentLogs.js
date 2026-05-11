import { readIdentity } from './identity';
import { httpGet, httpPost } from './agentHttp.js';
import { getCommon } from './agentSystem.js';

export async function getLogs({ limit = 500, levels = [], since = null } = {}) {
  try {
    const common = await getCommon().catch(() => ({}));
    const port = Number(common?.agentPort || 4000);
    const qs = [];
    if (limit) qs.push(`limit=${encodeURIComponent(limit)}`);
    if (Array.isArray(levels) && levels.length) qs.push(`level=${levels.join(',')}`);
    if (since) qs.push(`since=${encodeURIComponent(since)}`);
    const url = `http://127.0.0.1:${port}/agent/logs${qs.length ? `?${qs.join('&')}` : ''}`;

    const res = await fetch(url);
    const j = await res.json().catch(() => ({}));
    return {
      items: (j && j.ok && Array.isArray(j.items)) ? j.items : [],
      logStore: j && typeof j.logStore === 'object' ? j.logStore : null,
    };
  } catch {
    return { items: [], logStore: null };
  }
}

export async function getAllLogs({ limit = 500, levels = [], since = null } = {}) {
  try {
    const common = await getCommon().catch(() => ({}));
    const port = Number(common?.agentPort || 4000);
    const qs = [];
    if (limit) qs.push(`limit=${encodeURIComponent(limit)}`);
    if (Array.isArray(levels) && levels.length) qs.push(`level=${levels.join(',')}`);
    if (since) qs.push(`since=${encodeURIComponent(since)}`);
    const url = `http://127.0.0.1:${port}/agent/logs/all${qs.length ? `?${qs.join('&')}` : ''}`;

    const res = await fetch(url);
    const j = await res.json().catch(() => ({}));
    return {
      items: (j && j.ok && Array.isArray(j.items)) ? j.items : [],
      logStore: j && typeof j.logStore === 'object' ? j.logStore : null,
    };
  } catch {
    return { items: [], logStore: null };
  }
}

export async function getLogsStorage({ allHosts = true } = {}) {
  try {
    const qs = allHosts ? '?all=1' : '';
    const j = await httpGet(`/agent/logs/storage${qs}`);
    if (j && typeof j === 'object') return j;
    return { ok: false, items: [], summary: null };
  } catch {
    return { ok: false, items: [], summary: null };
  }
}

export async function getLayout(projectId, opts = {}) {
  const name = encodeURIComponent(String(projectId || '').trim());
  const layoutId = String(opts?.layoutId || '').trim();
  const qs = [];
  if (name) qs.push(`projectId=${name}`);
  if (layoutId) qs.push(`layoutId=${encodeURIComponent(layoutId)}`);
  const url = qs.length ? `/agent/layout?${qs.join('&')}` : `/agent/layout`;
  return await httpGet(url);
}

export async function saveLayout(projectId, layout, opts = {}, timeoutMs = 5000) {
  const name = encodeURIComponent(String(projectId || '').trim());
  const qs = [];
  if (name) qs.push(`projectId=${name}`);
  const url = qs.length ? `/agent/layout?${qs.join('&')}` : `/agent/layout`;

  const payload = {};
  if (Array.isArray(layout)) payload.layout = layout;

  if (opts && typeof opts === 'object') {
    if (opts.layoutId) payload.layoutId = String(opts.layoutId);
    if (opts.action) payload.action = String(opts.action);
    if (Object.prototype.hasOwnProperty.call(opts, 'name')) {
      payload.name = String(opts.name || '');
    }
    if (Object.prototype.hasOwnProperty.call(opts, 'color')) {
      payload.color = String(opts.color || '');
    }
    if (Object.prototype.hasOwnProperty.call(opts, 'isStart')) {
      payload.isStart = !!opts.isStart;
    }
    if (Array.isArray(opts.order)) payload.order = opts.order;
  }

  return await httpPost(url, payload, timeoutMs);
}

export async function savePresetSnapshot(projectId, ip, port, presetName) {
  const pid = encodeURIComponent(String(projectId || '').trim());
  const ipEnc = encodeURIComponent(String(ip || '').trim());
  const portEnc = encodeURIComponent(String(port || '').trim());
  const presetEnc = encodeURIComponent(String(presetName || '').trim());

  if (!pid || !ipEnc || !portEnc || !presetEnc) {
    return { ok: false, error: 'missing projectId/ip/port/preset' };
  }

  const url = `/agent/layout/preset-snapshot?projectId=${pid}&ip=${ipEnc}&port=${portEnc}&preset=${presetEnc}`;
  return await httpPost(url, {});
}

export async function purgeLogs({ allHosts = true } = {}) {
  try {
    const common = await getCommon().catch(() => ({}));
    const port = Number(common?.agentPort || 4000);
    const idObj = readIdentity();
    const originIp = String(idObj?.localIp || '').trim() || '127.0.0.1';
    const purgeId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const url = `http://127.0.0.1:${port}/agent/logs/purge?purgeId=${encodeURIComponent(purgeId)}&origin=${encodeURIComponent(originIp)}${allHosts ? '&all=1' : ''}`;
    const res = await fetch(url, { method: 'POST', headers: { 'X-UU-Purge-Id': purgeId, 'X-UU-Purge-Origin': originIp } });
    const j = await res.json().catch(() => null);
    if (j && typeof j === 'object' && Object.prototype.hasOwnProperty.call(j, 'ok')) {
      return !!j.ok;
    }
    return !!res.ok;
  } catch { return false; }
}

export async function logWidgetAction(event = {}) {
  try {
    await httpPost('/agent/logs/ui', event, 2000);
  } catch (e) {
    console.warn('[UltiUnreal][Logs] logWidgetAction failed', e);
  }
}

export async function quitApp({ purge = true } = {}) {
  try {
    const common = await getCommon().catch(() => ({}));
    const port = Number(common?.agentPort || 4000);
    await fetch(`http://127.0.0.1:${port}/agent/quit`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ purge })
    });
  } catch {}
}
