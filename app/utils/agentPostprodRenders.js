import {
  httpRequest, toRequestError, assertPostprodToken,
  normalizeRemoteStationHost, formatRemoteStationHostForUrl,
} from './agentHttp.js';

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
  // Station : uniquement ses rendus en cours (réponse légère, sans analyse disque).
  const assignedWorker = String(options?.assignedWorker || '').trim();
  const endpoint = assignedWorker
    ? `/agent/postprod/renders?assignedWorker=${encodeURIComponent(assignedWorker)}`
    : (shouldScan ? '/agent/postprod/renders?scan=true' : '/agent/postprod/renders');
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

export async function postprodListRemoteJobsByStation(stationIp = '', agentPort = 4000, timeoutMs = 3000) {
  const normalizedIp = normalizeRemoteStationHost(stationIp);
  const hostForUrl = formatRemoteStationHostForUrl(normalizedIp);
  if (!hostForUrl) {
    return { ok: false, error: 'invalid_station_ip', jobs: [], stationIp: '', stationName: '' };
  }
  const portRaw = Number(agentPort);
  const normalizedPort = Number.isFinite(portRaw) && portRaw > 0
    ? Math.max(1, Math.min(65535, Math.trunc(portRaw)))
    : 4000;
  const normalizedTimeout = Number.isFinite(Number(timeoutMs)) && Number(timeoutMs) > 0
    ? Math.max(300, Math.trunc(Number(timeoutMs)))
    : 3000;
  const url = `http://${hostForUrl}:${normalizedPort}/agent/postprod/remote/jobs`;

  if (typeof window.electron?.httpGet === 'function') {
    try {
      const result = await window.electron.httpGet(url, {}, normalizedTimeout);
      const status = Number(result?.status || 0);
      const text = String(result?.text || '').trim();
      let json = null;
      try { json = JSON.parse(text || '{}'); } catch { json = null; }
      if (!result?.ok || !json || json.ok !== true) {
        return {
          ok: false,
          status,
          error: String(json?.error || result?.error || `http_${status || 0}`).trim() || 'remote_jobs_unavailable',
          jobs: [],
          stationIp: normalizedIp,
          stationName: '',
        };
      }
      return {
        ok: true,
        status,
        error: '',
        jobs: Array.isArray(json.jobs) ? json.jobs : [],
        stationIp: String(json.stationIp || normalizedIp).trim() || normalizedIp,
        stationName: String(json.stationName || '').trim(),
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: String(error?.message || error || 'remote_jobs_unavailable').trim() || 'remote_jobs_unavailable',
        jobs: [],
        stationIp: normalizedIp,
        stationName: '',
      };
    }
  }

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), normalizedTimeout) : null;
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined,
    });
    const text = await response.text();
    let json = null;
    try { json = JSON.parse(text || '{}'); } catch { json = null; }
    if (!response.ok || !json || json.ok !== true) {
      return {
        ok: false,
        status: Number(response.status || 0),
        error: String(json?.error || `http_${Number(response.status || 0)}`).trim() || 'remote_jobs_unavailable',
        jobs: [],
        stationIp: normalizedIp,
        stationName: '',
      };
    }
    return {
      ok: true,
      status: Number(response.status || 0),
      error: '',
      jobs: Array.isArray(json.jobs) ? json.jobs : [],
      stationIp: String(json.stationIp || normalizedIp).trim() || normalizedIp,
      stationName: String(json.stationName || '').trim(),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: String(error?.message || error || 'remote_jobs_unavailable').trim() || 'remote_jobs_unavailable',
      jobs: [],
      stationIp: normalizedIp,
      stationName: '',
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
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
      serverTime: '',
      staleRequeued: 0,
      workers: { total: 0, online: 0, available: 0 },
      renders: { queued: 0, running: 0, failed: 0, done: 0 },
    },
  };
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

export async function postprodReplaceRenderFormFields(token = '', formId, fields = [], wrcFile = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(formId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_form_id');
    err.code = 'invalid_render_form_id';
    err.status = 400;
    throw err;
  }
  const body = {
    fields: Array.isArray(fields) ? fields : [],
    wrcFile: String(wrcFile || '').trim(),
  };
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

export async function postprodReserveRenderId(token = '', timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const res = await httpRequest('/agent/postprod/renders/reserve-id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: {},
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, reservedRenderId: 0 };
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

export async function postprodScheduleRenderJob(token = '', renderId = 0, payload = {}, timeoutMs = 6000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(renderId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_id');
    err.code = 'invalid_render_id';
    err.status = 400;
    throw err;
  }
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest(`/agent/postprod/renders/${Math.trunc(idNum)}/schedule`, {
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

export async function postprodUpdateRenderExportDestinations(
  token = '',
  renderId = 0,
  exportDestinationIds = [],
  timeoutMs = 6000
) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(renderId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_id');
    err.code = 'invalid_render_id';
    err.status = 400;
    throw err;
  }
  const body = {
    exportDestinationIds: Array.isArray(exportDestinationIds) ? exportDestinationIds : [],
  };
  const res = await httpRequest(`/agent/postprod/renders/${Math.trunc(idNum)}/export-destinations`, {
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

export async function postprodDeleteRenderJob(token = '', renderId = 0, timeoutMs = 6000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(renderId);
  if (!Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_render_id');
    err.code = 'invalid_render_id';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/renders/${Math.trunc(idNum)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, renderId: Math.trunc(idNum) };
}

export async function postprodReorderRenderJobs(token = '', payload = {}, timeoutMs = 6000) {
  const authToken = assertPostprodToken(token);
  const body = payload && typeof payload === 'object' ? payload : {};
  const res = await httpRequest('/agent/postprod/renders/reorder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body,
    timeoutMs,
  });
  if (!res.ok) throw toRequestError(res);
  return res.json || { ok: true, updated: 0 };
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

export async function postprodPatchRenderWorkerAptitude(token = '', workerKey = '', apte = false, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const key = String(workerKey || '').trim();
  if (!key) {
    const err = new Error('invalid_worker_key');
    err.code = 'invalid_worker_key';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/render-workers/${encodeURIComponent(key)}/aptitude`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: { apte: !!apte },
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

// Station bloquée : rend au serveur un rendu attribué mais non commencé, qui
// repart en file pour une autre station.
export async function postprodReleaseRenderWorkerJob(token = '', workerKey = '', renderId, timeoutMs = 8000) {
  const authToken = assertPostprodToken(token);
  const idNum = Number(renderId);
  const key = String(workerKey || '').trim();
  if (!key || !Number.isFinite(idNum) || idNum <= 0) {
    const err = new Error('invalid_release_request');
    err.code = 'invalid_release_request';
    err.status = 400;
    throw err;
  }
  const res = await httpRequest(`/agent/postprod/render-workers/${encodeURIComponent(key)}/release-job`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    },
    body: { renderId: Math.trunc(idNum) },
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
