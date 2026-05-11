import { httpRequest, toRequestError, assertPostprodToken } from './agentHttp.js';

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
