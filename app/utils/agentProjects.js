import { httpGet, httpPost } from './agentHttp.js';

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

export async function getProjectRenderBridgeStatus(projectId) {
  const pid = encodeURIComponent(String(projectId || '').trim());
  if (!pid) return { ok: false, error: 'missing projectId' };
  return await httpGet(`/agent/project-render-bridge-status?projectId=${pid}`);
}

export async function getProjectLivePluginsStatus(projectId) {
  const pid = encodeURIComponent(String(projectId || '').trim());
  if (!pid) return { ok: false, error: 'missing projectId' };
  return await httpGet(`/agent/project-live-plugins-status?projectId=${pid}`);
}

export async function installProjectPlugin(projectId, plugin) {
  const pid = String(projectId || '').trim();
  const pluginKey = String(plugin || '').trim();
  if (!pid) return { ok: false, error: 'missing projectId' };
  if (!pluginKey) return { ok: false, error: 'missing plugin' };
  return await httpPost('/agent/project-plugin-install', { projectId: pid, plugin: pluginKey });
}

export async function installProjectRenderBridge(projectId) {
  const pid = String(projectId || '').trim();
  if (!pid) return { ok: false, error: 'missing projectId' };
  return await httpPost('/agent/project-render-bridge-install', { projectId: pid });
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

export async function setProjectAssociation(hostIp, projectName, uprojectPath) {
  const host = encodeURIComponent(String(hostIp || '').trim());
  const name = encodeURIComponent(String(projectName || '').trim());
  const up   = encodeURIComponent(String(uprojectPath || '').trim());
  return await httpGet(
    `/agent/set-project?host=${host}&name=${name}&uproject=${up}`
  );
}
