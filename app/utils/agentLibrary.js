import { httpGet, httpPost, httpRequest } from './agentHttp.js';

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
