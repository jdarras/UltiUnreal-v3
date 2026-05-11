import { httpPost, httpRequest, toRequestError, assertPostprodToken } from './agentHttp.js';

export async function postprodRegenerateAllProxies(body = {}, timeoutMs = 15 * 60 * 1000) {
  const payload = body && typeof body === 'object' ? body : {};
  return await httpPost('/agent/postprod/proxy/regenerate-all', payload, timeoutMs);
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

export async function postprodGetProjectWrcFields(
  token = '',
  projectId = '',
  wrcFile = '',
  timeoutMs = 10000,
  options = null
) {
  const authToken = assertPostprodToken(token);
  const projectRef = String(projectId || '').trim();
  if (!projectRef) {
    const err = new Error('invalid_project_id');
    err.code = 'invalid_project_id';
    err.status = 400;
    throw err;
  }
  const opts = options && typeof options === 'object' && !Array.isArray(options)
    ? options
    : {};
  const params = new URLSearchParams();
  const preset = String(wrcFile || '').trim();
  if (preset) params.set('wrcFile', preset);
  if (opts.refreshSnapshot === true || opts.refresh === true) {
    params.set('refreshSnapshot', '1');
  }
  const host = String(opts.host || '').trim();
  if (host) params.set('host', host);
  const portRaw = Number(opts.port);
  if (Number.isFinite(portRaw) && portRaw > 0) {
    params.set('port', String(Math.trunc(portRaw)));
  }
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
