import { httpRequest, toRequestError, assertPostprodToken, appendPostprodActivityFilters } from './agentHttp.js';

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

export async function postprodDeleteUser(token = '', userId, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(userId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_user_id');
    err.code = 'invalid_user_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/users/${Math.trunc(idNum)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
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

export async function postprodPurgeUserActivity(token = '', userId = 0, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Math.trunc(Number(userId));
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_user_id');
    err.code = 'invalid_user_id';
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/users/${idNum}/activity`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${authToken}` },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, deleted: 0 };
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

export async function postprodDeleteRole(token = '', roleKey = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const key = String(roleKey || '').trim();
  if (!key) {
    const err = new Error('invalid_role_key');
    err.code = 'invalid_role_key';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/roles/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true };
}

export async function postprodListUserAlerts(token = '', options = {}, timeoutMs = 6000) {
  const authToken = assertPostprodToken(token);
  const opts = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
  const resolvedTimeoutMs = Number.isFinite(Number(opts?.timeoutMs))
    ? Number(opts.timeoutMs)
    : timeoutMs;
  const limitRaw = Number(opts?.limit || 100);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.max(1, Math.min(500, Math.trunc(limitRaw)))
    : 100;
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  const res = await httpRequest(`/agent/postprod/alerts?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs: resolvedTimeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, alerts: [], summary: null };
}
