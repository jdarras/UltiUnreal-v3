import { httpRequest, toRequestError, assertPostprodToken } from './agentHttp.js';

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

export async function postprodPurgeAudit(token = '', timeoutMs = 12000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/audit/purge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: {},
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, purge: null };
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
