import { getLayout, logWidgetAction } from '../../utils/agent';
import { readIdentity } from '../../utils/identity';

function resolveActiveProjectFromPayload(payload) {
  const activeProjects = payload && typeof payload === 'object' ? payload : {};
  const activeId = String(activeProjects.activeId || '').trim();
  const activeName = String(activeProjects.activeName || '').trim();
  const projects = Array.isArray(activeProjects.projects) ? activeProjects.projects : [];
  return (
    projects.find((project) => activeId && String(project?.id || '').trim() === activeId) ||
    projects.find(
      (project) =>
        activeName &&
        String(project?.name || '').trim().toLowerCase() === activeName.toLowerCase()
    ) ||
    null
  );
}

function resolveWrcTargetFromRefs({ hostsRef, projectsDataRef, rcHttpPortRef }) {
  const hostList = hostsRef.current || [];
  const activeProject = resolveActiveProjectFromPayload(projectsDataRef.current);

  const localIdentityIp = String(readIdentity()?.localIp || '').trim();
  const server = hostList.find((host) => localIdentityIp && host?.ip === localIdentityIp) || hostList[0] || {};

  const ip = server?.ip || localIdentityIp || '127.0.0.1';
  const port = Number(rcHttpPortRef.current || 30010);
  const wrcNames = Array.isArray(activeProject?.wrcNames)
    ? activeProject.wrcNames
    : (activeProject?.wrcName ? [activeProject.wrcName] : []);
  const preset = String(wrcNames[0] || '').trim() || 'RemoteControlPreset';

  return { ip, port, preset };
}

function emitLaunchControlStartLayoutLog(event = {}) {
  const payload = event && typeof event === 'object' ? event : {};
  const rawLevel = String(payload.level || '').trim().toLowerCase();
  const level = ['success', 'info', 'warn', 'error', 'debug'].includes(rawLevel)
    ? rawLevel
    : 'info';
  const action = String(payload.action || 'start_layout').trim() || 'start_layout';
  const message = String(payload.message || '').trim() || action;
  const value = payload.value && typeof payload.value === 'object' ? payload.value : {};
  const targets = Array.isArray(payload.targets) ? payload.targets : [];

  logWidgetAction({
    level,
    action,
    scope: 'launch_control',
    message,
    value,
    targets,
  });
}

async function refreshHasStartLayoutState({
  projectId,
  setHasStartLayout,
  setUseStartLayout,
}) {
  const pid = String(projectId || '').trim();
  if (!pid) {
    setHasStartLayout(false);
    setUseStartLayout(false);
    return;
  }
  try {
    const result = await getLayout(pid);
    const layouts = Array.isArray(result?.layouts) ? result.layouts : [];
    const anyStart = layouts.some((layout) => layout?.isStart);
    setHasStartLayout(anyStart);
    if (!anyStart) setUseStartLayout(false);
  } catch {
    // Preserve current state on transient network failures.
  }
}

export {
  resolveWrcTargetFromRefs,
  emitLaunchControlStartLayoutLog,
  refreshHasStartLayoutState,
};
