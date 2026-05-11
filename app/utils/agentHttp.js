import { readIdentity } from './identity';
import { buildColorPropertyBody } from './colorutils.mjs';

export function ensureLeadingSlash(p) { return p.startsWith('/') ? p : '/' + p; }

export function getBase() {
  const id = readIdentity();
  const mode = String(id?.mode || '').trim().toLowerCase();
  const port = id?.agentPort || 4000;
  if (mode === 'postprod') {
    return `http://127.0.0.1:${port}`;
  }
  const role = id?.role || 'server';
  const host = role === 'client' ? (id?.serverIp || null) : '127.0.0.1';
  if (role === 'client' && !host) throw new Error('serverIp manquant dans uu_identity (rôle client)');
  return `http://${host}:${port}`;
}

export async function httpGet(path, timeoutMs = 5000) {
  const url = getBase() + ensureLeadingSlash(path);
  if (window.electron?.httpGet) {
    const r = await window.electron.httpGet(url, {}, timeoutMs);
    if (!r.ok) throw new Error(r.error || `HTTP ${r.status}`);
    return JSON.parse(r.text || '{}');
  }
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    const txt = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return JSON.parse(txt || '{}');
  } finally { clearTimeout(t); }
}

export async function httpPost(path, body = {}, timeoutMs = 5000) {
  const url = getBase() + ensureLeadingSlash(path);

  if (typeof window.electron?.httpJson === 'function') {
    const r = await window.electron.httpJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      timeout: timeoutMs,
    });

    const parseText = (txt) => {
      try { return JSON.parse(txt); } catch { return null; }
    };

    if (!r || r.ok === false) {
      const parsedErr = r?.text ? parseText(r.text) : null;
      const errMsg = parsedErr?.error || r?.error || `HTTP ${r?.status || 'fail'}`;
      throw new Error(errMsg);
    }

    if (typeof r?.text === 'string') {
      const parsed = parseText(r.text);
      if (parsed && typeof parsed === 'object') return parsed;
    }
    if (typeof r === 'object' && r !== null) return r;
    return r;
  }

  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    try { return JSON.parse(txt || '{}'); } catch { return { ok: true, text: txt }; }
  } finally { clearTimeout(t); }
}

export async function httpRequest(path, opts = {}) {
  const {
    method = 'GET',
    headers = {},
    body = undefined,
    timeoutMs = 5000,
  } = opts || {};
  const url = getBase() + ensureLeadingSlash(path);

  const parseText = (txt) => {
    try { return JSON.parse(txt || '{}'); } catch { return null; }
  };

  if (typeof window.electron?.httpJson === 'function') {
    const r = await window.electron.httpJson(url, {
      method,
      headers: { ...(headers || {}) },
      body,
      timeout: timeoutMs,
    });
    const text = typeof r?.text === 'string' ? r.text : '';
    const json = parseText(text);
    const status = Number(r?.status || 0);
    return {
      ok: !!r?.ok,
      status,
      text,
      json,
      error: String(r?.error || ''),
    };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { ...(headers || {}) },
      body: body == null ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    const json = parseText(text);
    return {
      ok: res.ok,
      status: Number(res.status || 0),
      text,
      json,
      error: '',
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      text: '',
      json: null,
      error: String(e?.message || e),
    };
  } finally {
    clearTimeout(t);
  }
}

export function toRequestError(res) {
  const code = String(res?.json?.error || '').trim();
  const message = String(
    res?.json?.message ||
    res?.json?.error ||
    res?.error ||
    `HTTP ${Number(res?.status || 0) || 500}`
  );
  const err = new Error(message);
  err.status = Number(res?.status || 0);
  err.code = code;
  err.details = String(res?.text || '');
  return err;
}

export function pickUEPath(cfg) {
  return (
    cfg?.unreal_editor ??
    cfg?.unrealEditor ??
    cfg?.editor ??
    cfg?.editorPath ??
    cfg?.unreal_editor_path ??
    cfg?.UnrealEditor ??
    cfg?.UnrealEditorExe ??
    cfg?.UnrealEditorPath ??
    ''
  );
}

export function extractUnrealEditors(cfg = {}) {
  const map = {};
  if (cfg.unrealEditors && typeof cfg.unrealEditors === 'object') {
    for (const [ver, p] of Object.entries(cfg.unrealEditors)) {
      map[String(ver).trim()] = String(p || '').trim();
    }
  }
  return map;
}

export function resolveExeForVersion(cfg = {}, version = '') {
  const ver = String(version || '').trim();
  if (!ver) return '';
  const map = extractUnrealEditors(cfg);
  return map[ver] || '';
}

export function normalizeHosts(raw) {
  const toStd = (cfg = {}, ip = '') => {
    const VALID_AVAIL = ['capable', 'busy', 'excluded'];
    const renderAvailability = (() => {
      if (VALID_AVAIL.includes(cfg?.renderAvailability)) return cfg.renderAvailability;
      if (cfg?.eligible === false || cfg?.renderEnabled === false || cfg?.render_enabled === false) return 'excluded';
      return 'capable';
    })();
    return {
      ip: cfg.ip || ip || '',
      name: (cfg && (cfg.name || cfg.hostname)) || (ip || ''),
      color: cfg?.color || '',
      unreal_editor: pickUEPath(cfg),
      unrealEditors: extractUnrealEditors(cfg),
      uproject: cfg?.uproject || cfg?.project || cfg?.uprojectPath || '',
      args: cfg?.args || {},
      syncRoot: cfg?.syncRoot || cfg?.sync_root || '',
      syncEnabled: (typeof cfg?.syncEnabled === 'boolean')
        ? cfg.syncEnabled
        : !!(cfg?.syncRoot || cfg?.sync_root),
      renderAvailability,
      eligible: renderAvailability !== 'excluded',
      renderEnabled: renderAvailability !== 'excluded',
      sortIndex: Number.isFinite(Number(cfg?.sortIndex)) ? Number(cfg.sortIndex) : null,
    };
  };

  if (Array.isArray(raw)) return raw.map((cfg) => toStd(cfg, cfg?.ip));
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([ip, cfg]) => toStd(cfg, ip));
  }
  return [];
}

export function assertPostprodToken(token) {
  const authToken = String(token || '').trim();
  if (!authToken) {
    const err = new Error('missing_token');
    err.code = 'missing_token';
    err.status = 401;
    throw err;
  }
  return authToken;
}

export function appendPostprodActivityFilters(params, options = {}) {
  const rawFromAt = String(options?.fromAt || '').trim();
  const rawToAt = String(options?.toAt || '').trim();
  const rawActionType = String(options?.actionType || '').trim().toLowerCase();
  const rawSearchQuery = String(
    options?.searchQuery ||
    options?.search ||
    options?.query ||
    options?.q ||
    ''
  ).trim();
  if (rawFromAt) params.set('fromAt', rawFromAt);
  if (rawToAt) params.set('toAt', rawToAt);
  if (rawActionType && rawActionType !== 'all') params.set('actionType', rawActionType);
  if (rawSearchQuery) params.set('search', rawSearchQuery);

  const refs = Array.isArray(options?.projectRefs)
    ? options.projectRefs
    : [options?.projectRef || options?.projectId || options?.project];
  const normalizedRefs = refs
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (normalizedRefs.length > 0) {
    params.set('projectRef', normalizedRefs.join(','));
  }
}

export function normalizeRemoteStationHost(value) {
  let hostRaw = String(value || '').trim();
  if (!hostRaw) return '';
  hostRaw = hostRaw.replace(/^\s*https?:\/\//i, '');
  const slashIndex = hostRaw.indexOf('/');
  if (slashIndex >= 0) hostRaw = hostRaw.slice(0, slashIndex).trim();
  if (!hostRaw) return '';
  if (hostRaw.startsWith('[')) {
    const endBracket = hostRaw.indexOf(']');
    hostRaw = endBracket > 1 ? hostRaw.slice(1, endBracket).trim() : '';
  }
  if (!hostRaw) return '';
  if (/^localhost$/i.test(hostRaw)) return '127.0.0.1';
  if (/^[^:]+:\d+$/.test(hostRaw)) {
    hostRaw = String(hostRaw.split(':')[0] || '').trim();
  }
  return hostRaw;
}

export function formatRemoteStationHostForUrl(hostValue) {
  const host = normalizeRemoteStationHost(hostValue);
  if (!host) return '';
  if (host.includes(':') && !host.startsWith('[')) return `[${host}]`;
  return host;
}

export async function __agentRequest(method, url, body) {
  if (window?.electron?.httpJson) {
    const r = await window.electron.httpJson(url, body ? { method, body } : { method });
    return r || { ok:false, status:0, text:'', error:'bridge absent' };
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type':'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { ok:res.ok, status:res.status, text, data, error:res.ok ? '' : `HTTP ${res.status}` };
}

export async function __requestAbsoluteJson(url, {
  method = 'GET',
  body = undefined,
  timeoutMs = 5000,
} = {}) {
  if (typeof window?.electron?.httpJson === 'function') {
    const r = await window.electron.httpJson(url, {
      method,
      headers: {
        ...(body == null ? {} : { 'Content-Type': 'application/json' }),
      },
      body,
      timeout: timeoutMs,
    });
    const text = typeof r?.text === 'string' ? r.text : '';
    let json = null;
    try { json = JSON.parse(text || '{}'); } catch {}
    return {
      ok: !!r?.ok,
      status: Number(r?.status || 0),
      text,
      json,
      error: String(r?.error || ''),
    };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(0, Number(timeoutMs) || 0));
  try {
    const res = await fetch(url, {
      method,
      headers: {
        ...(body == null ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body == null ? undefined : JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text || '{}'); } catch {}
    return {
      ok: res.ok,
      status: Number(res.status || 0),
      text,
      json,
      error: '',
    };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      text: '',
      json: null,
      error: String(e?.message || e),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function __joinBaseAndPath(base, path) {
  const baseStr = String(base || '').replace(/\/+$/g, '');
  const p = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  return `${baseStr}${p}`;
}

export function __parseAgentError(res) {
  let data = res?.data || null;
  if (!data && typeof res?.text === 'string' && res.text) {
    try { data = JSON.parse(res.text); } catch {}
  }
  const code = String(data?.error || '').trim();
  const message = String(data?.message || '').trim();
  const status = Number(res?.status || 0);
  return {
    code,
    message,
    status,
    text: String(res?.text || '').trim(),
    fallback: String(res?.error || '').trim(),
  };
}

export function __toAgentError(parsed, fallbackStatus = 500) {
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  const err = new Error(
    String(
      p.code ||
      p.message ||
      p.fallback ||
      `HTTP ${Number(p.status || 0) || fallbackStatus}`
    )
  );
  err.code = String(p.code || '');
  err.status = Number(p.status || 0);
  err.details = String(p.message || p.text || p.fallback || '');
  return err;
}

export function __withLocalFallback(data, fromIp) {
  const payload = data && typeof data === 'object' ? { ...data } : { ok: true };
  payload.localFallback = {
    used: true,
    from: String(fromIp || '').trim(),
    to: '127.0.0.1',
  };
  return payload;
}

export function __isLocalServerIpTarget(targetIp) {
  const ip = String(targetIp || '').trim().toLowerCase();
  if (!ip || ip === '127.0.0.1' || ip === 'localhost') return false;
  const id = readIdentity() || {};
  const role = String(id?.role || 'server').trim().toLowerCase();
  if (role !== 'server') return false;
  const localIp = String(id?.localIp || '').trim().toLowerCase();
  return !!localIp && ip === localIp;
}

export function __isRetryableNetworkFailure(parsed) {
  const p = parsed && typeof parsed === 'object' ? parsed : {};
  const status = Number(p.status || 0);
  if (status > 0) return false;
  const code = String(p.code || '').trim().toLowerCase();
  if (code && !['timeout', 'network_error', 'network'].includes(code)) {
    return false;
  }
  const raw = [
    p.fallback,
    p.text,
    p.message,
  ].map((v) => String(v || '').trim().toLowerCase()).join(' ');
  if (!raw) return true;
  return /timeout|timed out|econnrefused|ehostunreach|enetunreach|econnreset|failed to fetch|network|aborted|socket hang up|bridge absent|request failed/.test(raw);
}

export function __wrcBodyForProperty(value, valueType) {
  let t = String(valueType || '').toLowerCase();

  if (!t) {
    if (typeof value === 'string') {
      t = 'text';
    } else if (typeof value === 'boolean') {
      t = 'bool';
    } else if (typeof value === 'number') {
      t = 'float';
    }
  }

  const isTextLike =
    t === 'text' ||
    t === 'string' ||
    t === 'name' ||
    t.includes('text') ||
    t.includes('string') ||
    t.includes('name') ||
    t.includes('ftext') ||
    t.includes('fstring') ||
    t.includes('fname');

  if (isTextLike) {
    return {
      PropertyValue: String(value ?? ''),
      GenerateTransaction: true
    };
  }

  if (t === 'bool' || t === 'boolean') {
    return {
      PropertyValue: !!value,
      GenerateTransaction: true
    };
  }

  if (t === 'float' || t === 'double') {
    return {
      PropertyValue: Number(value ?? 0),
      GenerateTransaction: true
    };
  }

  if (t === 'byte' || t === 'uint8' || t.includes('byte') || t.includes('uint8')) {
    const n = Number(value ?? 0);
    const v = Number.isFinite(n)
      ? Math.max(0, Math.min(255, Math.round(n)))
      : 0;
    return {
      PropertyValue: v,
      GenerateTransaction: true
    };
  }

  if (t === 'int' || t === 'int32' || t === 'int64') {
    return {
      PropertyValue: parseInt(value ?? 0, 10),
      GenerateTransaction: true
    };
  }

  if (
    t === 'color' ||
    t === 'flinearcolor' ||
    t === 'fcolor' ||
    t.includes('linearcolor') ||
    t.includes('fcolor')
  ) {
    return buildColorPropertyBody(value, t);
  }

  return {
    PropertyValue: value,
    GenerateTransaction: true
  };
}
