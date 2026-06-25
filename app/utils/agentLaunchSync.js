import { httpGet, httpPost, resolveExeForVersion,
  __agentRequest, __parseAgentError, __toAgentError,
  __withLocalFallback, __isLocalServerIpTarget, __isRetryableNetworkFailure,
} from './agentHttp.js';
import { getCommon, getHosts, getProjects } from './agentSystem.js';

// Parse l'argument surchargé (number = timeout, objet = options) commun à checkSync/copySync.
function resolveSyncTimeoutAndOptions(timeoutOrOptions, maybeOptions, defaultTimeout) {
  let timeoutMs = defaultTimeout;
  let options = {};
  if (typeof timeoutOrOptions === 'number') {
    timeoutMs = timeoutOrOptions;
    options = maybeOptions && typeof maybeOptions === 'object' ? maybeOptions : {};
  } else if (timeoutOrOptions && typeof timeoutOrOptions === 'object') {
    options = timeoutOrOptions;
    timeoutMs =
      typeof options.timeoutMs === 'number' && Number.isFinite(options.timeoutMs)
        ? options.timeoutMs
        : defaultTimeout;
  }
  return { timeoutMs, options };
}

// Construit la query string ip/scope/direction commune aux endpoints de sync.
function buildSyncScopeQuery(hostIp, options = {}) {
  const params = new URLSearchParams();
  params.set('ip', String(hostIp || ''));
  const scope = String(options.scope || '').trim();
  if (scope) params.set('scope', scope);
  const direction = String(options.direction || '').trim();
  if (direction) params.set('direction', direction);
  return params.toString();
}

export async function postHost(ip, body = {}) {
  const safeIp = encodeURIComponent(String(ip || '').trim());
  if (!safeIp) {
    return { ok: false, error: 'ip manquante pour postHost' };
  }
  try {
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

export async function postLaunch(ip, body = {}) {
  const targetIp = String(ip || '').trim();
  if (!targetIp) throw new Error('IP manquante pour postLaunch');

  const common = await getCommon().catch(() => ({}));
  const agentPort  = Number(common.agentPort || 4000);
  const rcHttpPort = Number(common.rcHttpPort || 0);
  const rcWsPort   = Number(common.rcWsPort  || 0);
  const modeRaw    = String(common.launchMode || '').toLowerCase();
  const mode       = modeRaw === 'integration' ? 'integration' : 'production';

  const hosts = await getHosts().catch(() => []);
  const host  = hosts.find(h => String(h.ip || '').trim() === targetIp);
  if (!host) throw new Error(`Host ${targetIp} introuvable`);

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

  let uproject = String(body.uproject || '').trim();
  const editorOnly = body.editorOnly === true;
  if (!uproject && !editorOnly) {
    uproject = String(host.uproject || '').trim();
  }
  if (!uproject && !editorOnly) throw new Error(`.uproject manquant pour ${targetIp}`);

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

export async function checkSync(hostIp, timeoutOrOptions = 120000, maybeOptions = null) {
  if (!hostIp) throw new Error('hostIp manquant pour checkSync');

  const { timeoutMs, options } = resolveSyncTimeoutAndOptions(timeoutOrOptions, maybeOptions, 120000);
  const query = buildSyncScopeQuery(hostIp, options);

  return await httpGet(`/agent/sync/check?${query}`, timeoutMs);
}

export async function copySync(hostIp, payload = null, timeoutOrOptions = 600000, maybeOptions = null) {
  if (!hostIp) throw new Error('hostIp manquant pour copySync');

  const { timeoutMs, options } = resolveSyncTimeoutAndOptions(timeoutOrOptions, maybeOptions, 600000);
  const body = payload && typeof payload === 'object' ? payload : {};
  const query = buildSyncScopeQuery(hostIp, options);

  return await httpPost(`/agent/sync/copy?${query}`, body, timeoutMs);
}

export async function setSyncProjectSource(projectId, sourceIp) {
  const pid = String(projectId || '').trim();
  const ip = String(sourceIp || '').trim();
  if (!pid || !ip) throw new Error('Projet ou station source manquant');
  return await httpPost('/agent/sync/source', { projectId: pid, sourceIp: ip }, 10000);
}

export async function getSyncSummary({ refresh = false } = {}) {
  return await httpGet(`/agent/sync/summary${refresh ? '?refresh=1' : ''}`, 120000);
}

export async function updateSyncIgnore(ip, add = [], remove = []) {
  if (!ip) throw new Error('ip manquant pour updateSyncIgnore');

  const normalize = (rel) => String(rel || '').replace(/\\/g, '/');
  const addNorm = Array.isArray(add) ? add.map(normalize) : [];
  const removeNorm = Array.isArray(remove) ? remove.map(normalize) : [];

  return await httpPost('/agent/sync/update-ignore', {
    ip,
    add: addNorm,
    remove: removeNorm,
  });
}

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
