// app/utils/agent.js
// Lecture centralisée des endpoints de l’agent avec URL absolue
// Base construite depuis uu_identity (role, serverIp, agentPort)
import { readIdentity } from './identity';
import { buildColorPropertyBody } from './colorutils.mjs';

function ensureLeadingSlash(p) { return p.startsWith('/') ? p : '/' + p; }

function normalizeHttpBase(raw, fallbackPort = 0, protocolHint = 'http:') {
  const input = String(raw || '').trim();
  if (!input) return '';
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(input)
    ? input
    : `${protocolHint}//${input}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    if (!u.port) {
      const n = Number(fallbackPort);
      if (Number.isFinite(n) && n > 0) {
        u.port = String(Math.trunc(n));
      }
    }
    u.search = '';
    u.hash = '';
    u.pathname = String(u.pathname || '').replace(/\/+$/g, '');
    const out = u.toString();
    return out.endsWith('/') ? out.slice(0, -1) : out;
  } catch {
    return '';
  }
}

function normalizeHttpsBase(raw, fallbackPort = 0) {
  const normalized = normalizeHttpBase(raw, fallbackPort, 'https:');
  if (!normalized) return '';
  try {
    const u = new URL(normalized);
    if (u.protocol !== 'https:') return '';
    return normalized;
  } catch {
    return '';
  }
}

function getPostprodBrokerHeaders(identity = null) {
  const id = identity && typeof identity === 'object' ? identity : readIdentity();
  const mode = String(id?.mode || '').trim().toLowerCase();
  const networkMode = String(id?.postprodNetworkMode || 'lan').trim().toLowerCase();
  if (mode !== 'postprod' || networkMode !== 'broker') return {};
  const token = String(id?.postprodBrokerToken || '').trim();
  if (!token) return {};
  return { 'x-uu-broker-token': token };
}

function getBase() {
  const id = readIdentity();
  const mode = String(id?.mode || '').trim().toLowerCase();
  const role = id?.role || 'server';
  const port = id?.agentPort || 4000;
  if (mode === 'postprod') {
    const networkMode = String(id?.postprodNetworkMode || 'lan').trim().toLowerCase();
    const brokerBase = normalizeHttpsBase(id?.postprodHubUrl || '', port);
    if (networkMode === 'broker' && brokerBase) return brokerBase;
    const hostBase = normalizeHttpBase(id?.postprodHubHost || id?.serverIp || '', port, 'http:');
    if (hostBase) return hostBase;
    return `http://127.0.0.1:${port}`;
  }
  const host = role === 'client' ? (id?.serverIp || null) : '127.0.0.1';
  if (role === 'client' && !host) throw new Error('serverIp manquant dans uu_identity (rôle client)');
  return `http://${host}:${port}`;
}

// Base URL utilisée pour les snippets Companion
export function getCompanionBaseUrl() {
  const id = readIdentity();
  const mode = String(id?.mode || '').trim().toLowerCase();
  const role = id?.role || 'server';
  const port = id?.agentPort || 4000;
  if (mode === 'postprod') {
    return getBase();
  }

  // Sur le HUB (rôle = server), on utilise de préférence l'IP saisie dans Welcome
  if (role === 'server') {
    const ip = String(id.localIp || '').trim();
    const host = ip || '127.0.0.1';
    return `http://${host}:${port}`;
  }

  // Sur un client, Companion doit parler au HUB (serverIp)
  const host = String(id.serverIp || '').trim();
  if (!host) throw new Error('serverIp manquant dans uu_identity (rôle client)');
  return `http://${host}:${port}`;
}

export function getAgentBaseUrl() {
  return getBase();
}

export async function runLocalProcess({
  command = '',
  args = [],
  timeoutMs = 30 * 60 * 1000,
  cwd = '',
} = {}) {
  if (typeof window.electron?.runProcess !== 'function') {
    return { ok: false, error: 'run_process_unavailable' };
  }
  const payload = {
    command: String(command || '').trim(),
    args: Array.isArray(args) ? args : [],
    timeoutMs,
    cwd: String(cwd || '').trim(),
  };
  return await window.electron.runProcess(payload);
}

async function httpGet(path, timeoutMs = 5000) {
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

async function httpPost(path, body = {}, timeoutMs = 5000) {
  const url = getBase() + ensureLeadingSlash(path);

  // Chemin IPC (évite les soucis CORS/devserver)
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

    // Success path : on tente de parser le JSON retourné par l’agent
    if (typeof r?.text === 'string') {
      const parsed = parseText(r.text);
      if (parsed && typeof parsed === 'object') return parsed;
    }
    // Fallback : si http-json nous a déjà renvoyé l’objet sérialisé
    if (typeof r === 'object' && r !== null) return r;
    return r;
  }

  // Fallback fetch
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

async function httpRequest(path, opts = {}) {
  const {
    method = 'GET',
    headers = {},
    body = undefined,
    timeoutMs = 5000,
  } = opts || {};
  const id = readIdentity();
  const brokerHeaders = getPostprodBrokerHeaders(id);
  const url = getBase() + ensureLeadingSlash(path);

  const parseText = (txt) => {
    try { return JSON.parse(txt || '{}'); } catch { return null; }
  };

  if (typeof window.electron?.httpJson === 'function') {
    const r = await window.electron.httpJson(url, {
      method,
      headers: { ...brokerHeaders, ...(headers || {}) },
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
      headers: { ...brokerHeaders, ...(headers || {}) },
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

function toRequestError(res) {
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

// — Fallback multi-clés pour le chemin d'UnrealEditor.exe
function pickUEPath(cfg) {
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

function extractUnrealEditors(cfg = {}) {
  const map = {};

  if (cfg.unrealEditors && typeof cfg.unrealEditors === 'object') {
    for (const [ver, p] of Object.entries(cfg.unrealEditors)) {
      map[String(ver).trim()] = String(p || '').trim();
    }
  }

  return map;
}

function resolveExeForVersion(cfg = {}, version = '') {
  const ver = String(version || '').trim();
  if (!ver) return '';
  const map = extractUnrealEditors(cfg);
  return map[ver] || '';
}

/** Accepte map IP->config ou array, et renvoie toujours un array normalisé */
function normalizeHosts(raw) {
  const toStd = (cfg = {}, ip = '') => ({
    ip: cfg.ip || ip || '',
    name: (cfg && (cfg.name || cfg.hostname)) || (ip || ''),
    color: cfg?.color || '',
    unreal_editor: pickUEPath(cfg),
    unrealEditors: extractUnrealEditors(cfg),
    uproject: cfg?.uproject || cfg?.project || cfg?.uprojectPath || '',
    args: cfg?.args || {},
    // Synchronisation pour cette machine
    syncRoot: cfg?.syncRoot || cfg?.sync_root || '',
    syncEnabled: (typeof cfg?.syncEnabled === 'boolean')
      ? cfg.syncEnabled
      : !!(cfg?.syncRoot || cfg?.sync_root),

    eligible: cfg?.eligible === false ? false : true,
    renderEnabled: cfg?.renderEnabled === false || cfg?.render_enabled === false ? false : true,
    sortIndex: Number.isFinite(Number(cfg?.sortIndex)) ? Number(cfg.sortIndex) : null,
  });

  if (Array.isArray(raw)) return raw.map((cfg) => toStd(cfg, cfg?.ip));
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([ip, cfg]) => toStd(cfg, ip));
  }
  return [];
}

/** Lectures via l'agent */
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
export async function getProjectMeta(projectId) {
  const pid = encodeURIComponent(String(projectId || '').trim());
  if (!pid) return { ok:false, error:'missing projectId' };
  return await httpGet(`/agent/project-meta?projectId=${pid}`);
}
export async function saveProjectMeta(projectId, meta = {}) {
  const pid = String(projectId || '').trim();
  if (!pid) return { ok:false, error:'missing projectId' };
  return await httpPost('/agent/project-meta', { projectId: pid, meta });
}
export async function setProjectAutoScreenshot(projectId, pngBase64 = '') {
  const pid = String(projectId || '').trim();
  if (!pid) return { ok: false, error: 'missing projectId' };
  const b64 = String(pngBase64 || '').trim();
  if (!b64) return { ok: false, error: 'missing_image' };
  return await httpPost('/agent/project-autoscreenshot', { projectId: pid, pngBase64: b64 });
}

export async function setProjectDefaultMaps(projectId, patch = {}) {
  const pid = String(projectId || '').trim();
  if (!pid) return { ok: false, error: 'missing projectId' };

  // Backward compat : si on passe une string, on patch les 2 maps
  if (typeof patch === 'string') {
    const asset = String(patch || '').trim();
    if (!asset) return { ok: false, error: 'missing_map' };
    return await httpPost('/agent/project-default-maps', {
      projectId: pid,
      gameDefaultMap: asset,
      editorStartupMap: asset,
    });
  }

  const p = patch && typeof patch === 'object' ? patch : {};
  const gameDefaultMap = String(p.gameDefaultMap || '').trim();
  const editorStartupMap = String(p.editorStartupMap || '').trim();
  if (!gameDefaultMap && !editorStartupMap) return { ok: false, error: 'missing_map' };
  return await httpPost('/agent/project-default-maps', { projectId: pid, gameDefaultMap, editorStartupMap });
}

export async function setProjectVersion(projectId, projectVersion = '') {
  const pid = String(projectId || '').trim();
  if (!pid) return { ok: false, error: 'missing projectId' };
  const pv = String(projectVersion || '').trim();
  if (!pv) return { ok: false, error: 'missing_version' };
  return await httpPost('/agent/project-version', { projectId: pid, projectVersion: pv });
}

export async function setProjectVideoProduction(projectId, cadence = {}) {
  const pid = String(projectId || '').trim();
  if (!pid) return { ok: false, error: 'missing projectId' };
  const c = cadence && typeof cadence === 'object' ? cadence : {};
  return await httpPost('/agent/project-video-production', { projectId: pid, cadence: c });
}

export async function setProjectHttpBind(projectId, bindAddress = '0.0.0.0') {
  const pid = String(projectId || '').trim();
  if (!pid) return { ok: false, error: 'missing projectId' };
  const addr = String(bindAddress || '').trim();
  if (!addr) return { ok: false, error: 'missing bindAddress' };
  return await httpPost('/agent/project-http-bind', { projectId: pid, bindAddress: addr });
}

/** Écritures utiles */
export async function postCommon(patch = {}) {
  return await httpPost('/agent/common', patch);
}

export async function postProjects(body = {}) {
  return await httpPost('/agent/projects', body);
}

export async function postProjectsScan(body = {}) {
  return await httpPost('/agent/projects/scan', body);
}

export async function postProjectsImport(body = {}) {
  return await httpPost('/agent/projects/import', body);
}

export async function postprodAuthLogin({ username = '', password = '' } = {}, timeoutMs = 8000) {
  const res = await httpRequest('/agent/postprod/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      username: String(username || '').trim(),
      password: String(password || ''),
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodAuthMe(token = '', timeoutMs = 8000) {
  const authToken = String(token || '').trim();
  if (!authToken) {
    const err = new Error('missing_token');
    err.code = 'missing_token';
    err.status = 401;
    throw err;
  }
  const res = await httpRequest('/agent/postprod/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodUpdateMe(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/me', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodAuthLogout(token = '', timeoutMs = 5000) {
  const authToken = String(token || '').trim();
  if (!authToken) return { ok: true, revoked: false };
  const res = await httpRequest('/agent/postprod/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: {},
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

function assertPostprodToken(token) {
  const authToken = String(token || '').trim();
  if (!authToken) {
    const err = new Error('missing_token');
    err.code = 'missing_token';
    err.status = 401;
    throw err;
  }
  return authToken;
}

export async function postprodListUsers(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/users', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, users: [] };
}

export async function postprodCreateUser(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodUpdateUser(token = '', userId, payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(userId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_user_id');
    err.code = 'invalid_user_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/users/${Math.trunc(idNum)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodUpdateUserProfile(token = '', userId, payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(userId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_user_id');
    err.code = 'invalid_user_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/users/${Math.trunc(idNum)}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodUpdateUserProjectPermissions(
  token = '',
  userId,
  projectId = '',
  payload = {},
  timeoutMs = 8000
) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(userId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_user_id');
    err.code = 'invalid_user_id';
    err.status = 400;
    throw err;
  }
  const projectRef = String(projectId || '').trim();
  if (!projectRef) {
    const err = new Error('invalid_project_id');
    err.code = 'invalid_project_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(
    `/agent/postprod/users/${Math.trunc(idNum)}/project-permissions/${encodeURIComponent(projectRef)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body,
      timeoutMs,
    }
  );
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListUserProjectPermissions(
  token = '',
  userId,
  timeoutMs = 8000
) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(userId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_user_id');
    err.code = 'invalid_user_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(
    `/agent/postprod/users/${Math.trunc(idNum)}/project-permissions`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeoutMs,
    }
  );
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, userId: Math.trunc(idNum), projectPermissions: [] };
}

function appendPostprodActivityFilters(params, options = {}) {
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

export async function postprodListUserActivity(
  token = '',
  userId,
  limit = 50,
  options = {},
  timeoutMs = 8000
) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(userId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_user_id');
    err.code = 'invalid_user_id';
    err.status = 400;
    throw err;
  }
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 50)));
  const resolvedOptions =
    options && typeof options === 'object' && !Array.isArray(options)
      ? options
      : {};
  const resolvedTimeoutMs =
    Number.isFinite(Number(options)) && timeoutMs === 8000
      ? Number(options)
      : timeoutMs;
  const params = new URLSearchParams();
  params.set('limit', String(safeLimit));
  appendPostprodActivityFilters(params, resolvedOptions);
  const res = await httpRequest(
    `/agent/postprod/users/${Math.trunc(idNum)}/activity?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeoutMs: resolvedTimeoutMs,
    }
  );
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, activities: [], summary: { total: 0, actions: {}, projects: [] } };
}

export async function postprodListMyActivity(token = '', limit = 50, options = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(Number(limit) || 50)));
  const resolvedOptions =
    options && typeof options === 'object' && !Array.isArray(options)
      ? options
      : {};
  const resolvedTimeoutMs =
    Number.isFinite(Number(options)) && timeoutMs === 8000
      ? Number(options)
      : timeoutMs;
  const params = new URLSearchParams();
  params.set('limit', String(safeLimit));
  appendPostprodActivityFilters(params, resolvedOptions);
  const res = await httpRequest(`/agent/postprod/me/activity?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs: resolvedTimeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, activities: [], summary: { total: 0, actions: {}, projects: [] } };
}

export async function postprodListAudit(token = '', options = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const params = new URLSearchParams();

  const rawLimit = Number(options?.limit ?? options?.pageSize);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(500, Math.trunc(rawLimit)))
    : 100;
  params.set('limit', String(limit));

  const rawPage = Number(options?.page);
  const page = Number.isFinite(rawPage)
    ? Math.max(1, Math.trunc(rawPage))
    : 1;
  params.set('page', String(page));

  const rawOffset = Number(options?.offset);
  if (Number.isFinite(rawOffset)) {
    params.set('offset', String(Math.max(0, Math.trunc(rawOffset))));
  }

  const actorUserIdRaw = Number(options?.actorUserId);
  if (Number.isFinite(actorUserIdRaw) && actorUserIdRaw > 0) {
    params.set('actorUserId', String(Math.trunc(actorUserIdRaw)));
  }

  const action = String(options?.action || '').trim();
  if (action) params.set('action', action);

  const scopeType = String(options?.scopeType || '').trim();
  if (scopeType) params.set('scopeType', scopeType);

  const fromAt = String(options?.fromAt || '').trim();
  if (fromAt) params.set('fromAt', fromAt);

  const toAt = String(options?.toAt || '').trim();
  if (toAt) params.set('toAt', toAt);

  const query = params.toString();
  const res = await httpRequest(`/agent/postprod/audit${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || {
    ok: true,
    entries: [],
    pagination: {
      total: 0,
      limit,
      offset: 0,
      page,
      hasMore: false,
    },
    filters: { limit, page },
  };
}

export async function postprodGetRenderHealthAuditMaintenance(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/audit/maintenance/render-health', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, maintenance: null };
}

export async function postprodPurgeRenderHealthAudit(token = '', timeoutMs = 12000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/audit/maintenance/render-health/purge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: {},
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, purge: null, maintenance: null };
}

export async function postprodExportAuditCsv(token = '', options = {}, timeoutMs = 30000) {
  const authToken = assertPostprodToken(token);
  const params = new URLSearchParams();

  const actorUserIdRaw = Number(options?.actorUserId);
  if (Number.isFinite(actorUserIdRaw) && actorUserIdRaw > 0) {
    params.set('actorUserId', String(Math.trunc(actorUserIdRaw)));
  }

  const action = String(options?.action || '').trim();
  if (action) params.set('action', action);

  const scopeType = String(options?.scopeType || '').trim();
  if (scopeType) params.set('scopeType', scopeType);

  const fromAt = String(options?.fromAt || '').trim();
  if (fromAt) params.set('fromAt', fromAt);

  const toAt = String(options?.toAt || '').trim();
  if (toAt) params.set('toAt', toAt);

  const query = String(options?.query || options?.q || '').trim();
  if (query) params.set('q', query);

  const batchRaw = Number(options?.batch);
  if (Number.isFinite(batchRaw)) {
    params.set('batch', String(Math.max(1, Math.min(5000, Math.trunc(batchRaw)))));
  }

  const queryString = params.toString();
  const res = await httpRequest(`/agent/postprod/audit/export${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return {
    ok: true,
    csv: String(res.text || ''),
  };
}

export async function postprodExportAuditJson(token = '', options = {}, timeoutMs = 30000) {
  const authToken = assertPostprodToken(token);
  const params = new URLSearchParams();
  params.set('format', 'json');

  const actorUserIdRaw = Number(options?.actorUserId);
  if (Number.isFinite(actorUserIdRaw) && actorUserIdRaw > 0) {
    params.set('actorUserId', String(Math.trunc(actorUserIdRaw)));
  }

  const action = String(options?.action || '').trim();
  if (action) params.set('action', action);

  const scopeType = String(options?.scopeType || '').trim();
  if (scopeType) params.set('scopeType', scopeType);

  const fromAt = String(options?.fromAt || '').trim();
  if (fromAt) params.set('fromAt', fromAt);

  const toAt = String(options?.toAt || '').trim();
  if (toAt) params.set('toAt', toAt);

  const query = String(options?.query || options?.q || '').trim();
  if (query) params.set('q', query);

  const batchRaw = Number(options?.batch);
  if (Number.isFinite(batchRaw)) {
    params.set('batch', String(Math.max(1, Math.min(5000, Math.trunc(batchRaw)))));
  }

  const queryString = params.toString();
  const res = await httpRequest(`/agent/postprod/audit/export${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, entries: [] };
}

export async function postprodExportAuditNdjson(token = '', options = {}, timeoutMs = 30000) {
  const authToken = assertPostprodToken(token);
  const params = new URLSearchParams();
  params.set('format', 'ndjson');

  const actorUserIdRaw = Number(options?.actorUserId);
  if (Number.isFinite(actorUserIdRaw) && actorUserIdRaw > 0) {
    params.set('actorUserId', String(Math.trunc(actorUserIdRaw)));
  }

  const action = String(options?.action || '').trim();
  if (action) params.set('action', action);

  const scopeType = String(options?.scopeType || '').trim();
  if (scopeType) params.set('scopeType', scopeType);

  const fromAt = String(options?.fromAt || '').trim();
  if (fromAt) params.set('fromAt', fromAt);

  const toAt = String(options?.toAt || '').trim();
  if (toAt) params.set('toAt', toAt);

  const query = String(options?.query || options?.q || '').trim();
  if (query) params.set('q', query);

  const batchRaw = Number(options?.batch);
  if (Number.isFinite(batchRaw)) {
    params.set('batch', String(Math.max(1, Math.min(5000, Math.trunc(batchRaw)))));
  }

  const queryString = params.toString();
  const res = await httpRequest(`/agent/postprod/audit/export${queryString ? `?${queryString}` : ''}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return {
    ok: true,
    ndjson: String(res.text || ''),
  };
}

export async function postprodListRoles(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/roles', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, roles: [] };
}

export async function postprodCreateRole(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/roles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodUpdateRole(token = '', roleKey = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const key = String(roleKey || '').trim();
  if (!key) {
    const err = new Error('invalid_role_key');
    err.code = 'invalid_role_key';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/roles/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListTasks(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/tasks', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, tasks: [] };
}

export async function postprodListProjects(token = '', options = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const usageModeListRaw = Array.isArray(options?.usageMode)
    ? options.usageMode
    : [options?.usageMode];
  const usageModeList = [];
  const seen = new Set();
  for (const modeRaw of usageModeListRaw) {
    const mode = String(modeRaw || '').trim();
    if (!mode || seen.has(mode)) continue;
    seen.add(mode);
    usageModeList.push(mode);
  }
  const query = usageModeList.length > 0
    ? `?usageMode=${encodeURIComponent(usageModeList.join(','))}`
    : '';
  const res = await httpRequest(`/agent/postprod/projects${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, projects: [], filters: { usageMode: usageModeList } };
}

export async function postprodListProjectRenderTemplates(token = '', projectId = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const projectRef = String(projectId || '').trim();
  if (!projectRef) {
    const err = new Error('invalid_project_id');
    err.code = 'invalid_project_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(
    `/agent/postprod/projects/${encodeURIComponent(projectRef)}/render-templates`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeoutMs,
    }
  );
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, templates: [] };
}

export async function postprodGetProjectUnrealCatalog(token = '', projectId = '', timeoutMs = 15000) {
  const authToken = assertPostprodToken(token);
  const projectRef = String(projectId || '').trim();
  if (!projectRef) {
    const err = new Error('invalid_project_id');
    err.code = 'invalid_project_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(
    `/agent/postprod/projects/${encodeURIComponent(projectRef)}/unreal-catalog`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeoutMs,
    }
  );
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, catalog: { levels: [], sequences: [], presets: [], wrcPresets: [] } };
}

export async function postprodGetProjectWrcFields(token = '', projectId = '', presetName = '', timeoutMs = 10000) {
  const authToken = assertPostprodToken(token);
  const projectRef = String(projectId || '').trim();
  if (!projectRef) {
    const err = new Error('invalid_project_id');
    err.code = 'invalid_project_id';
    err.status = 400;
    throw err;
  }
  const params = new URLSearchParams();
  const preset = String(presetName || '').trim();
  if (preset) params.set('preset', preset);
  const suffix = params.toString();
  const res = await httpRequest(
    `/agent/postprod/projects/${encodeURIComponent(projectRef)}/wrc-fields${suffix ? `?${suffix}` : ''}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeoutMs,
    }
  );
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, fields: [] };
}

export async function postprodSyncProject(token = '', projectId = '', payload = {}, timeoutMs = 10000) {
  const authToken = assertPostprodToken(token);
  const projectRef = String(projectId || '').trim();
  if (!projectRef) {
    const err = new Error('invalid_project_id');
    err.code = 'invalid_project_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(
    `/agent/postprod/projects/${encodeURIComponent(projectRef)}/sync`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body,
      timeoutMs,
    }
  );
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListProjectDataTables(token = '', projectId = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const projectRef = String(projectId || '').trim();
  if (!projectRef) {
    const err = new Error('invalid_project_id');
    err.code = 'invalid_project_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(
    `/agent/postprod/projects/${encodeURIComponent(projectRef)}/data-tables`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeoutMs,
    }
  );
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, tables: [] };
}

export async function postprodUpsertDataTableRow(token = '', tableId, payload = {}, timeoutMs = 10000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(tableId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_data_table_id');
    err.code = 'invalid_data_table_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/data-tables/${Math.trunc(idNum)}/rows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodUpdateDataTable(token = '', tableId, payload = {}, timeoutMs = 10000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(tableId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_data_table_id');
    err.code = 'invalid_data_table_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/data-tables/${Math.trunc(idNum)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListResources(token = '', timeoutMs = 8000, options = {}) {
  const authToken = assertPostprodToken(token);
  const forceRefresh = options?.refresh === true;
  const path = forceRefresh
    ? '/agent/postprod/resources?refresh=1'
    : '/agent/postprod/resources';
  const res = await httpRequest(path, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, items: [] };
}

export async function postprodReindexResources(token = '', timeoutMs = 20000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/resources/reindex', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: {},
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodGetResource(token = '', resourceId = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const id = String(resourceId || '').trim();
  if (!id) {
    const err = new Error('invalid_resource_id');
    err.code = 'invalid_resource_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/resources/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, item: null };
}

export async function postprodCreateTask(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodUpdateTask(token = '', taskId, payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(taskId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_task_id');
    err.code = 'invalid_task_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/tasks/${Math.trunc(idNum)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodDeleteTask(token = '', taskId, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(taskId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_task_id');
    err.code = 'invalid_task_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/tasks/${Math.trunc(idNum)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodTransitionTask(token = '', taskId, payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(taskId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_task_id');
    err.code = 'invalid_task_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/tasks/${Math.trunc(idNum)}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListTaskTransitions(token = '', taskId, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(taskId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_task_id');
    err.code = 'invalid_task_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/tasks/${Math.trunc(idNum)}/transitions`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, transitions: [] };
}

export async function postprodListRenders(token = '', timeoutOrOptions = 8000, maybeOptions = null) {
  const authToken = assertPostprodToken(token);
  let timeoutMs = 8000;
  let options = {};
  if (timeoutOrOptions && typeof timeoutOrOptions === 'object' && !Array.isArray(timeoutOrOptions)) {
    options = timeoutOrOptions;
    timeoutMs = Number.isFinite(Number(options?.timeoutMs)) ? Number(options.timeoutMs) : 8000;
  } else {
    timeoutMs = Number.isFinite(Number(timeoutOrOptions)) ? Number(timeoutOrOptions) : 8000;
    options = maybeOptions && typeof maybeOptions === 'object' && !Array.isArray(maybeOptions)
      ? maybeOptions
      : {};
  }
  const shouldScan = options?.scan === true;
  const endpoint = shouldScan
    ? '/agent/postprod/renders?scan=true'
    : '/agent/postprod/renders';
  const res = await httpRequest(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, renders: [] };
}

export async function postprodScanDetectedRenders(token = '', payload = {}, timeoutMs = 12000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/renders/detected/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, detectedScan: null };
}

export async function postprodListRenderJobs(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/render-jobs', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, renderJobs: [] };
}

export async function postprodCreateRenderJob(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/render-jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodGetRenderJob(token = '', renderId, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(renderId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_id');
    err.code = 'invalid_render_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/render-jobs/${Math.trunc(idNum)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, renderJob: null };
}

export async function postprodListRenderTemplates(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/render-templates', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, templates: [] };
}

export async function postprodCreateRenderTemplate(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/render-templates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodUpdateRenderTemplate(token = '', templateId, payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(templateId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_template_id');
    err.code = 'invalid_render_template_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/render-templates/${Math.trunc(idNum)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodDeleteRenderTemplate(token = '', templateId, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(templateId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_template_id');
    err.code = 'invalid_render_template_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/render-templates/${Math.trunc(idNum)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListRenderForms(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/render-forms', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, forms: [] };
}

export async function postprodCreateRenderForm(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/render-forms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodUpdateRenderForm(token = '', formId, payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(formId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_form_id');
    err.code = 'invalid_render_form_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/render-forms/${Math.trunc(idNum)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodDeleteRenderForm(token = '', formId, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(formId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_form_id');
    err.code = 'invalid_render_form_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/render-forms/${Math.trunc(idNum)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListRenderFormFields(token = '', formId, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(formId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_form_id');
    err.code = 'invalid_render_form_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/render-forms/${Math.trunc(idNum)}/fields`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, fields: [] };
}

export async function postprodReplaceRenderFormFields(token = '', formId, fields = [], timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(formId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_form_id');
    err.code = 'invalid_render_form_id';
    err.status = 400;
    throw err;
  }
  const body = { fields: Array.isArray(fields) ? fields : [] };
  const res = await httpRequest(`/agent/postprod/render-forms/${Math.trunc(idNum)}/fields`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, fields: [] };
}

export async function postprodGetHealth(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/health', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || {
    ok: true,
    health: {
      hubOnline: true,
      serverTime: '',
      staleRequeued: 0,
      workers: { total: 0, online: 0, available: 0 },
      renders: { queued: 0, running: 0, failed: 0, done: 0 },
    },
  };
}

export async function postprodCreateRender(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/renders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodTransitionRender(token = '', renderId, payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(renderId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_id');
    err.code = 'invalid_render_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/renders/${Math.trunc(idNum)}/transition`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodDispatchRenders(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/renders/dispatch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, dispatched: [], count: 0 };
}

export async function postprodSaveDispatchPolicy(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/renders/dispatch-policy', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, saved: true, dispatchPolicy: null };
}

export async function postprodCreateRenderHealthEvent(token = '', payload = {}, timeoutMs = 5000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/renders/health-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListRenderWorkers(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/render-workers', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, workers: [] };
}

export async function postprodUpsertRenderWorker(token = '', payload = {}, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/render-workers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodCompleteRenderWorkerJob(token = '', renderId, payload = {}, timeoutMs = 12000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(renderId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_id');
    err.code = 'invalid_render_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/renders/${Math.trunc(idNum)}/worker-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListRenderTransitions(token = '', renderId, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(renderId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_id');
    err.code = 'invalid_render_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/renders/${Math.trunc(idNum)}/transitions`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, transitions: [] };
}

export async function getLibraryMeta() { return await httpGet('/agent/library/meta'); }
export async function getLibrary() { return await httpGet('/agent/library'); }
export async function getLibraryItem(uid = '') {
  const key = encodeURIComponent(String(uid || '').trim());
  if (!key) return { ok: false, error: 'missing_uid' };
  return await httpGet(`/agent/library/item?uid=${key}`, 10000);
}

export async function postLibraryImportRemotePreview(body = {}) {
  const res = await httpRequest('/agent/library/import-remote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { ...body, mode: 'preview' },
    timeoutMs: 120000,
  });
  if (res.ok) {
    return res.json && typeof res.json === 'object' ? res.json : { ok: true };
  }
  const json = res.json && typeof res.json === 'object' ? res.json : {};
  return {
    ok: false,
    error: String(json.error || res.error || `HTTP ${res.status || 0}`),
    detail: String(json.detail || json.message || res.error || ''),
    status: Number(res.status || 0),
  };
}

export async function postLibraryImportRemote(body = {}) {
  const res = await httpRequest('/agent/library/import-remote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    timeoutMs: 120000,
  });
  if (res.ok) {
    return res.json && typeof res.json === 'object' ? res.json : { ok: true };
  }
  const json = res.json && typeof res.json === 'object' ? res.json : {};
  return {
    ok: false,
    error: String(json.error || res.error || `HTTP ${res.status || 0}`),
    detail: String(json.detail || json.message || res.error || ''),
    status: Number(res.status || 0),
  };
}

export async function postLibraryItem(body = {}) {
  return await httpPost('/agent/library/item', body);
}

export async function postHost(ip, body = {}) {
  const safeIp = encodeURIComponent(String(ip || '').trim());
  if (!safeIp) {
    return { ok: false, error: 'ip manquante pour postHost' };
  }

  try {
    // On passe par la base unique (server ou client → HUB) :
    //   server : http://127.0.0.1:<agentPort>
    //   client : http://<serverIp>:<agentPort>
    const res = await httpPost(`/agent/host/${safeIp}`, body);
    return res || {};
  } catch (e) {
    console.error('postHost failed', e);
    return { ok: false, error: String(e?.message || e) };
  }
}

export async function deleteHost(ip) {
  const safeIp = encodeURIComponent(String(ip || '').trim());
  return await httpPost(`/agent/host/${safeIp}/delete`, {});
}

// Lance Unreal directement sur l'agent de la machine (bypass /agent/host/.../launch)
export async function postLaunch(ip, body = {}) {
  const targetIp = String(ip || '').trim();
  if (!targetIp) throw new Error('IP manquante pour postLaunch');

  // 1) Config globale (ports + mode)
  const common = await getCommon().catch(() => ({}));
  const agentPort  = Number(common.agentPort || 4000);
  const rcHttpPort = Number(common.rcHttpPort || 0);
  const rcWsPort   = Number(common.rcWsPort  || 0);
  const modeRaw    = String(common.launchMode || '').toLowerCase();
  const mode       = modeRaw === 'integration' ? 'integration' : 'production';

  // 2) Config machine (EXE + args)
  const hosts = await getHosts().catch(() => []);
  const host  = hosts.find(h => String(h.ip || '').trim() === targetIp);
  if (!host) throw new Error(`Host ${targetIp} introuvable`);

  // 3) Projet actif (pour version d'engine)
  let requiredVersion = String(body.engineVersion || body.requiredVersion || '').trim();
  if (!requiredVersion) {
    const projects = await getProjects().catch(() => ({}));
    const activeId = projects?.activeId || '';
    const activeName = projects?.activeName || '';
    const projList = Array.isArray(projects?.projects) ? projects.projects : [];
    const activeProj =
      projList.find((p) => p && p.id === activeId) ||
      projList.find(
        (p) =>
          activeName &&
          p &&
          String(p.name || '').trim().toLowerCase() ===
            String(activeName).trim().toLowerCase()
      ) ||
      null;
    requiredVersion = String(activeProj?.engineVersion || '').trim();
  }
  const exe = resolveExeForVersion(host, requiredVersion);
  if (!exe) {
    throw new Error(
      `UnrealEditor.exe manquant pour ${targetIp} (version ${requiredVersion || 'inconnue'})`
    );
  }

  // 4) .uproject : priorité au body.uproject (résolu côté UI)
  let uproject = String(body.uproject || '').trim();
  const editorOnly = body.editorOnly === true;
  if (!uproject && !editorOnly) {
    uproject = String(host.uproject || '').trim();
  }
  if (!uproject && !editorOnly) throw new Error(`.uproject manquant pour ${targetIp}`);

  // 5) Args spécifiques (host.args + éventuels args supplémentaires)
  const hostArgs  = (host.args && typeof host.args === 'object') ? host.args : {};
  const extraArgs = (body.args && typeof body.args === 'object') ? body.args : {};
  const args      = { ...hostArgs, ...extraArgs };

  const payload = {
    exe,
    uproject,
    requiredVersion,
    args,
    rcHttpPort,
    rcWsPort,
    mode,
    editorOnly,
  };

  const url = `http://${targetIp}:${agentPort}/agent/launch`;
  const res = await __agentRequest('POST', url, payload);

  if (!res.ok) {
    const parsed = __parseAgentError(res);
    const canRetryLocal =
      __isLocalServerIpTarget(targetIp) &&
      __isRetryableNetworkFailure(parsed);
    if (canRetryLocal) {
      const localUrl = `http://127.0.0.1:${agentPort}/agent/launch`;
      const localRes = await __agentRequest('POST', localUrl, payload);
      if (localRes.ok) {
        return __withLocalFallback(localRes.data, targetIp);
      }
      const localParsed = __parseAgentError(localRes);
      const localErr = __toAgentError(localParsed, 500);
      localErr.fallbackAttempted = true;
      localErr.fallbackTarget = '127.0.0.1';
      throw localErr;
    }
    const err = __toAgentError(parsed, 500);
    console.error('[postLaunch] launch failed', {
      targetIp,
      status: err.status,
      code: err.code,
      details: err.details,
      payload: {
        editorOnly: !!payload.editorOnly,
        requiredVersion: payload.requiredVersion || '',
        exe: payload.exe || '',
        uproject: payload.uproject || '',
      },
    });
    throw err;
  }
  return res.data || { ok: true };
}

// Stoppe Unreal directement sur l'agent de la machine
export async function postStop(ip, body = {}) {
  const targetIp = String(ip || '').trim();
  if (!targetIp) throw new Error('IP manquante pour postStop');

  const common = await getCommon().catch(() => ({}));
  const agentPort = Number(common.agentPort || 4000);
  const url       = `http://${targetIp}:${agentPort}/agent/stop`;

  const res = await __agentRequest('POST', url, body);
  if (!res.ok) {
    const parsed = __parseAgentError(res);
    const canRetryLocal =
      __isLocalServerIpTarget(targetIp) &&
      __isRetryableNetworkFailure(parsed);
    if (canRetryLocal) {
      const localUrl = `http://127.0.0.1:${agentPort}/agent/stop`;
      const localRes = await __agentRequest('POST', localUrl, body);
      if (localRes.ok) {
        return __withLocalFallback(localRes.data, targetIp);
      }
      throw __toAgentError(__parseAgentError(localRes), 500);
    }
    throw __toAgentError(parsed, 500);
  }
  return res.data || { ok: true };
}

// Compat: associer un .uproject pour un host et un nom de projet actif
export async function setProjectAssociation(hostIp, projectName, uprojectPath) {
  const host = encodeURIComponent(String(hostIp || '').trim());
  const name = encodeURIComponent(String(projectName || '').trim());
  const up   = encodeURIComponent(String(uprojectPath || '').trim());

  // Le backend attend host + name + uproject
  return await httpGet(
    `/agent/set-project?host=${host}&name=${name}&uproject=${up}`
  );
}

// --- Synchronisation projets : vérification réelle via l'agent serveur ---
export async function checkSync(hostIp, timeoutMs = 120000) {
  if (!hostIp) throw new Error('hostIp manquant pour checkSync');
  return await httpGet(
    `/agent/sync/check?ip=${encodeURIComponent(hostIp)}`,
    timeoutMs
  );
}

// --- Synchronisation projets : copie depuis le serveur vers un host ---
export async function copySync(hostIp, payload = null, timeoutMs = 600000) {
  if (!hostIp) throw new Error('hostIp manquant pour copySync');

  const body =
    payload && typeof payload === 'object'
      ? payload
      : {};

  // Compat : si body = {}, le backend recalcule la diff comme avant
  return await httpPost(
    `/agent/sync/copy?ip=${encodeURIComponent(hostIp)}`,
    body,
    timeoutMs
  );
}

// --- Logs (server-only pour le moment) ---
export async function getLogs({ limit = 500, levels = [], since = null } = {}) {
  try {
    // On réutilise l'agent local (port depuis /agent/common)
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

export async function getOnlineMap() {
  try {
    // IP locale saisie dans Welcome (HUB)
    const id = readIdentity();
    let localIp = String(id?.localIp || '').trim().toLowerCase();

    // On lit la config commune pour connaître le port de l’agent
    const common = await getCommon().catch(() => ({}));
    const port = Number(common?.agentPort || 4000);

    // On récupère la liste des machines (normalisées)
    const hosts = await getHosts().catch(() => []);
    const list = Array.isArray(hosts) ? hosts : [];

    // On interroge l’agrégateur côté serveur
    const res = await fetch(`http://127.0.0.1:${port}/agent/online`);
    const j = await res.json().catch(() => ({}));
    const now = new Date().toISOString();

    let items = j && j.ok && j.items ? j.items : {};

    // items peut être soit un objet { ip: {online,...} }, soit un tableau
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

    // On construit une map propre en tenant compte de localIp uniquement
    const out = {};
    for (const h of list) {
      const ipRaw = String(h?.ip || '').trim();
      if (!ipRaw) continue;
      const ipKey = ipRaw.toLowerCase();

      const it = items[ipRaw] || {};

      let online = !!it.online;
      let unrealRunning =
        typeof it.unrealRunning === 'boolean' ? it.unrealRunning : null;

      // 🔴 Cas particulier : la machine locale (celle du HUB)
      //  - basée uniquement sur l’IP locale saisie dans uu_identity
      const isLocalHost =
        !!localIp && ipKey === localIp;

      if (isLocalHost) {
        // Si l’UI tourne, l’agent local répond forcément → on force online = true
        online = true;
      }

      out[ipRaw] = {
        online,
        unrealRunning,
        rtt: it.rtt ?? null,
        ts: it.ts || now,
      };
    }

    return out;
  } catch {
    // En cas de souci, on ne bloque jamais l’UI : on renvoie une map vide
    return {};
  }
}

// ===== Production Layout (fichiers data/production/<projectId>.json via l'agent) =====
export async function getLayout(projectId, opts = {}) {
  const name = encodeURIComponent(String(projectId || '').trim());
  const layoutId = String(opts?.layoutId || '').trim();
  const qs = [];
  if (name) qs.push(`projectId=${name}`);
  if (layoutId) qs.push(`layoutId=${encodeURIComponent(layoutId)}`);
  const url = qs.length ? `/agent/layout?${qs.join('&')}` : `/agent/layout`;
  // on utilise les helpers existants httpGet/httpPost
  return await httpGet(url); // -> { ok:true, projectId, name, layout:[...], layouts:[...], activeLayoutId, preset? }
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

  return await httpPost(url, payload, timeoutMs); // -> { ok:true, projectId, layouts?, activeLayoutId? }
}

// Snapshot du preset WRC pour un projet (stocké dans le même fichier que le layout)
export async function savePresetSnapshot(projectId, ip, port, presetName) {
  const pid = encodeURIComponent(String(projectId || '').trim());
  const ipEnc = encodeURIComponent(String(ip || '').trim());
  const portEnc = encodeURIComponent(String(port || '').trim());
  const presetEnc = encodeURIComponent(String(presetName || '').trim());

  if (!pid || !ipEnc || !portEnc || !presetEnc) {
    return { ok: false, error: 'missing projectId/ip/port/preset' };
  }

  const url = `/agent/layout/preset-snapshot?projectId=${pid}&ip=${ipEnc}&port=${portEnc}&preset=${presetEnc}`;
  return await httpPost(url, {}); // -> { ok:true, projectId, ts, presetHash }
}

export async function purgeLogs({ allHosts = true } = {}) {
  try {
    const common = await getCommon().catch(() => ({}));
    const port = Number(common?.agentPort || 4000);
    // Generate a purgeId and include an origin so servers won't re-propagate
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

// Log d'une action widget depuis l'UI (Production, etc.)
export async function logWidgetAction(event = {}) {
  try {
    // On utilise l'agent du HUB : POST /agent/logs/ui
    await httpPost('/agent/logs/ui', event, 2000);
  } catch (e) {
    // On ne casse jamais l'UI pour un problème de log
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

/* ===================== WRC HELPERS (unique source réseau) ===================== */

/** Requête JSON via pont Electron si dispo, sinon fetch. */
async function __agentRequest(method, url, body) {
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

async function __requestAbsoluteJson(url, {
  method = 'GET',
  body = undefined,
  timeoutMs = 5000,
} = {}) {
  const id = readIdentity();
  const brokerHeaders = getPostprodBrokerHeaders(id);
  if (typeof window?.electron?.httpJson === 'function') {
    const r = await window.electron.httpJson(url, {
      method,
      headers: {
        ...brokerHeaders,
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
        ...brokerHeaders,
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

function __joinBaseAndPath(base, path) {
  const baseStr = String(base || '').replace(/\/+$/g, '');
  const p = String(path || '').startsWith('/') ? String(path) : `/${String(path || '')}`;
  return `${baseStr}${p}`;
}

function __resolvePostprodHubBase({
  mode = 'lan',
  hubHost = '',
  hubUrl = '',
  port = 4000,
} = {}) {
  const nPort = Number(port);
  const fallbackPort = Number.isFinite(nPort) && nPort > 0 ? Math.trunc(nPort) : 4000;
  const networkMode = String(mode || '').trim().toLowerCase();
  if (networkMode === 'broker') {
    return normalizeHttpsBase(hubUrl, 0);
  }
  return normalizeHttpBase(hubHost, fallbackPort, 'http:') || `http://127.0.0.1:${fallbackPort}`;
}

function __parseAgentError(res) {
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

function __toAgentError(parsed, fallbackStatus = 500) {
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

function __withLocalFallback(data, fromIp) {
  const payload = data && typeof data === 'object' ? { ...data } : { ok: true };
  payload.localFallback = {
    used: true,
    from: String(fromIp || '').trim(),
    to: '127.0.0.1',
  };
  return payload;
}

function __isLocalServerIpTarget(targetIp) {
  const ip = String(targetIp || '').trim().toLowerCase();
  if (!ip || ip === '127.0.0.1' || ip === 'localhost') return false;
  const id = readIdentity() || {};
  const role = String(id?.role || 'server').trim().toLowerCase();
  if (role !== 'server') return false;
  const localIp = String(id?.localIp || '').trim().toLowerCase();
  return !!localIp && ip === localIp;
}

function __isRetryableNetworkFailure(parsed) {
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

/** Normalise la Value en payload RC suivant le type. */
function __wrcBodyForProperty(value, valueType) {
  let t = String(valueType || '').toLowerCase();

  // Si aucune info explicite, on essaie de deviner à partir du type JS de "value"
  if (!t) {
    if (typeof value === 'string') {
      t = 'text';
    } else if (typeof value === 'boolean') {
      t = 'bool';
    } else if (typeof value === 'number') {
      t = 'float';
    }
  }

    // ----- Types texte (FText / FString / FName / Name / String / Text) -----
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
    // On fait comme pour les arguments de fonction :
    // on envoie une simple string, que ce soit FText/FString/FName
    return {
      PropertyValue: String(value ?? ''),
      GenerateTransaction: true
    };
  }

  // ----- Bool -----
  if (t === 'bool' || t === 'boolean') {
    return {
      PropertyValue: !!value,
      GenerateTransaction: true
    };
  }

  // ----- Float -----
  if (t === 'float' || t === 'double') {
    return {
      PropertyValue: Number(value ?? 0),
      GenerateTransaction: true
    };
  }

  // ----- Byte (uint8) -----
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

  // ----- Int -----
  if (t === 'int' || t === 'int32' || t === 'int64') {
    return {
      PropertyValue: parseInt(value ?? 0, 10),
      GenerateTransaction: true
    };
  }

    // ----- Color (FLinearColor) -----
  if (
    t === 'color' ||
    t === 'flinearcolor' ||
    t === 'fcolor' ||
    t.includes('linearcolor') ||
    t.includes('fcolor')
  ) {
    return buildColorPropertyBody(value, t);
  }

  // Fallback générique
  return {
    PropertyValue: value,
    GenerateTransaction: true
  };
}

/** Construit les cibles à partir de hosts + common (ports/preset). */
export function buildTargetsFromHosts(hosts, common) {
  const port = Number(common?.rcHttpPort || 30010);
  const preset = common?.webRemoteControlName || 'RemoteControlPreset';
  return (Array.isArray(hosts) ? hosts : [])
    .map(h => ({ ip: String(h?.ip || '').trim(), port, preset }))
    .filter(t => t.ip && t.port && preset);
}

/** GET preset brut côté UE. */
export async function wrcGetPreset(ip, port, preset) {
  const url = `http://${ip}:${Number(port)}/remote/preset/${encodeURIComponent(preset)}`;
  return await __agentRequest('GET', url);
}

/** PUT propriété sur 1 cible. */
export async function wrcPutProperty(ip, port, preset, path, value, valueType) {
  const url = `http://${ip}:${Number(port)}/remote/preset/${encodeURIComponent(preset)}/property/${encodeURIComponent(path)}`;
  const body = __wrcBodyForProperty(value, valueType);
  return await __agentRequest('PUT', url, body);
}

/** Appel fonction sur 1 cible. */
export async function wrcCallFunction(ip, port, preset, displayName, parameters = {}) {
  const url = `http://${ip}:${Number(port)}/remote/preset/${encodeURIComponent(preset)}/function/${encodeURIComponent(displayName)}`;
  const body = { Parameters: parameters || {}, GenerateTransaction: true };
  return await __agentRequest('PUT', url, body);
}

/** Diffusion propriété selon les “targets” du widget. */
export async function wrcPutPropertyForWidget(widget, hosts, common, value) {
  const tlist = buildTargetsFromHosts(hosts, common);
  const sel = widget?.targets || {};
  const path = widget?.binding?.path;
  let vtype = widget?.binding?.valueType || 'text';
  if (!path) return [];

  let sendValue = value;

  // Cas particulier : widget "vector" lié à une propriété de rotation (FRotator)
  if (widget?.type === 'vector' && value && typeof value === 'object') {
    const propName = String(widget?.binding?.propertyName || '').toLowerCase();
    const t = String(vtype || '').toLowerCase();

    const isRotatorType =
      t === 'rotator' ||
      t === 'frotator' ||
      propName === 'rotation' ||
      propName.endsWith('.rotation') ||
      propName.includes('rotation');

    if (isRotatorType) {
      // Rotator Unreal : Roll = X, Pitch = Y, Yaw = Z (en degrés)
      // On veut : X(UU) -> X(Unreal), Y(UU) -> Y, Z(UU) -> Z
      // Donc :
      //   Roll  = X
      //   Pitch = Y
      //   Yaw   = Z
      const X = value.X ?? value.x ?? value.Roll ?? value.roll ?? 0;
      const Y = value.Y ?? value.y ?? value.Pitch ?? value.pitch ?? 0;
      const Z = value.Z ?? value.z ?? value.Yaw ?? value.yaw ?? 0;

      sendValue = {
        Roll:  Number(X) || 0,
        Pitch: Number(Y) || 0,
        Yaw:   Number(Z) || 0,
      };

      vtype = 'rotator';
    }
  }

  console.debug('[UltiUnreal][WRC] put property', {
    widgetId: widget?.id,
    widgetLabel: widget?.label,
    path,
    valueType: vtype,
    value: sendValue,
    targets: tlist.filter((t) => !!sel[t.ip])
  });

  const tasks = tlist
    .filter((t) => !!sel[t.ip])
    .map((t) =>
      wrcPutProperty(t.ip, t.port, t.preset, path, sendValue, vtype)
    );

  return Promise.all(tasks);
}

/** Diffusion fonction selon les “targets” du widget. */
export async function wrcCallFunctionForWidget(widget, hosts, common, overrideArgs = null) {
  const tlist = buildTargetsFromHosts(hosts, common);
  const sel = widget?.targets || {};
  const dn  = widget?.binding?.displayName;
  if (!dn) return [];

  // Valeurs configurées dans le widget pour les arguments de la fonction
  const defaultArgs =
    widget?.binding?.argDefaults && typeof widget.binding.argDefaults === 'object'
      ? widget.binding.argDefaults
      : {};
  const currentArgs =
    widget?.binding?.argValues && typeof widget.binding.argValues === 'object'
      ? widget.binding.argValues
      : {};
  const mergedArgs = { ...defaultArgs, ...currentArgs };
  const rawArgs = overrideArgs && typeof overrideArgs === 'object'
    ? overrideArgs
    : mergedArgs;
  const parameters = {};

  if (rawArgs && typeof rawArgs === 'object') {
    for (const [key, val] of Object.entries(rawArgs)) {
      // on ignore les champs vides
      if (val === '' || val === null || typeof val === 'undefined') continue;
      parameters[key] = val;
    }
  }

  const targets = tlist.filter(t => !!sel[t.ip]);

  console.debug('[UltiUnreal][WRC] call function', {
    widgetId: widget?.id,
    widgetLabel: widget?.label,
    displayName: dn,
    parameters,
    targets
  });

  const payload = {
    widgetLabel: widget?.label,
    displayName: dn,
    targets,
    parameters,
  };

  console.log('[UltiUnreal][WRC] Button widget → call function', payload);

  try {
    const results = await Promise.all(
      targets.map(t =>
        wrcCallFunction(t.ip, t.port, t.preset, dn, parameters)
      )
    );

    console.log('[UltiUnreal][WRC] Button widget → results', results);
    return results;
  } catch (e) {
    console.error('[UltiUnreal][WRC] Button widget → ERROR', e);
    throw e;
  }
}

export async function wrcSendJoystickForWidget(widget, hosts, common, value) {
  const linkType = widget?.ui?.linkType || 'vector2d';
  const tlist = buildTargetsFromHosts(hosts, common);
  const sel = widget?.targets || {};

  const xVal = typeof value?.X === 'number' ? value.X : 0;
  const yVal = typeof value?.Y === 'number' ? value.Y : 0;

  // --- Cas "Manuel" : deux propriétés float séparées X / Y ---
  if (linkType === 'manual') {
    const bx = widget?.joystickBindings?.x || {};
    const by = widget?.joystickBindings?.y || {};

    const tasks = [];

    console.debug('[UltiUnreal][WRC] joystick manual', {
      widgetId: widget?.id,
      widgetLabel: widget?.label,
      pathX: bx.path,
      pathY: by.path,
      valueX: xVal,
      valueY: yVal,
      targets: tlist.filter((t) => !!sel[t.ip])
    });

    for (const t of tlist) {
      if (!sel[t.ip]) continue;

      if (bx.path) {
        tasks.push(
          wrcPutProperty(
            t.ip,
            t.port,
            t.preset,
            bx.path,
            xVal,
            bx.valueType || 'float'
          )
        );
      }

      if (by.path) {
        tasks.push(
          wrcPutProperty(
            t.ip,
            t.port,
            t.preset,
            by.path,
            yVal,
            by.valueType || 'float'
          )
        );
      }
    }

    return Promise.all(tasks);
  }

  // --- Cas par défaut : un seul Vector2D (XY) ---
  const path = widget?.binding?.path;
  if (!path) return [];

  const vtype = widget?.binding?.valueType || 'vector2d';
  const payload = { X: xVal, Y: yVal };

  console.debug('[UltiUnreal][WRC] joystick vector2d', {
    widgetId: widget?.id,
    widgetLabel: widget?.label,
    path,
    valueType: vtype,
    payload,
    targets: tlist.filter((t) => !!sel[t.ip])
  });

  const tasks = tlist
    .filter((t) => !!sel[t.ip])
    .map((t) =>
      wrcPutProperty(
        t.ip,
        t.port,
        t.preset,
        path,
        payload,
        vtype
      )
    );

  return Promise.all(tasks);
}

// --- Helpers "absolus" pour ping/lecture locale (Welcome/Setup) ---
export async function pingLocalAgent(port) {
  const url = `http://127.0.0.1:${Number(port)}/agent/ping`;
  return await __agentRequest('GET', url); // réutilise le bridge ou fetch interne
}

export async function probePostprodHub({
  mode = 'lan',
  hubHost = '',
  hubUrl = '',
  port = 4000,
  timeoutMs = 3500,
} = {}) {
  const targetBase = __resolvePostprodHubBase({ mode, hubHost, hubUrl, port });
  if (!targetBase) {
    return {
      ok: false,
      target: '',
      endpoint: '',
      status: 0,
      error: 'invalid_hub_base',
    };
  }
  const endpoints = [
    '/agent/postprod/auth/health',
    '/agent/ping',
  ];
  let last = null;
  for (const endpoint of endpoints) {
    const url = __joinBaseAndPath(targetBase, endpoint);
    const res = await __requestAbsoluteJson(url, { method: 'GET', timeoutMs });
    if (res?.ok) {
      return {
        ok: true,
        target: targetBase,
        endpoint,
        status: Number(res?.status || 200),
      };
    }
    last = { endpoint, res };
  }
  const errCode = String(last?.res?.json?.error || '').trim();
  return {
    ok: false,
    target: targetBase,
    endpoint: String(last?.endpoint || ''),
    status: Number(last?.res?.status || 0),
    error: errCode || String(last?.res?.error || 'hub_unreachable'),
  };
}

// --- Écrire les "common" sur l'agent local à un port précis (Welcome) ---
export async function postCommonAtPort(port, payload = {}) {
  const url = `http://127.0.0.1:${Number(port)}/agent/common`;
  return await __agentRequest('POST', url, payload);
}

// Met à jour la liste syncIgnore d'un projet actif
export async function updateSyncIgnore(ip, add = [], remove = []) {
  if (!ip) throw new Error('ip manquant pour updateSyncIgnore');

  const normalize = (rel) => String(rel || '').replace(/\\/g, '/');
  const addNorm = Array.isArray(add) ? add.map(normalize) : [];
  const removeNorm = Array.isArray(remove) ? remove.map(normalize) : [];

  try {
    console.log('[sync] POST /agent/sync/update-ignore', { ip, add: addNorm, remove: removeNorm });
    const resp = await httpPost('/agent/sync/update-ignore', {
      ip,
      add: addNorm,
      remove: removeNorm,
    });
    console.log('[sync] update-ignore response', resp);
    return resp;
  } catch (e) {
    console.error('[sync] update-ignore failed', e);
    throw e;
  }
}

// Récupère les chemins ignorés pour le projet actif (serveur)
export async function getSyncIgnoreForHost(ip) {
  if (!ip) return [];
  try {
    const pj = await getProjects().catch(() => null);
    const activeId = pj?.activeId || '';
    const activeName = pj?.activeName || '';
    const projects = Array.isArray(pj?.projects) ? pj.projects : [];
    const active =
      projects.find((p) => p && p.id === activeId) ||
      projects.find(
        (p) =>
          p &&
          activeName &&
          String(p.name || '').trim().toLowerCase() ===
            String(activeName).trim().toLowerCase()
      );

    const si = active?.syncIgnore || {};
    const defaults = Array.isArray(si.default) ? si.default : [];
    const hostSpecific =
      ip && si && typeof si === 'object' && Array.isArray(si[ip])
        ? si[ip]
        : [];

    return [...defaults, ...hostSpecific].filter(
      (s) => typeof s === 'string' && s.trim()
    );
  } catch {
    return [];
  }
}
