import React from 'react';
import {
  isHostAllowedForLaunchMode,
  computeAgentStatus,
  computeProjectStatus,
  computeExeStatus,
} from '../launchcontrolHelpers';

function useLaunchControlViewModel({
  hosts,
  loading,
  onlineMap,
  launchMode,
  localIp,
  canUseLiveLaunch,
  canUseEditorLaunch,
  busy,
  t,
  syncStatusMap,
  activeProjectEngineVersion,
  projectsData,
  resolveExeForHost,
  resolveUprojectFor,
  isReadyHost,
}) {
  const hasMachines = Array.isArray(hosts) && hosts.length > 0;

  const pathOrND = React.useCallback((value) => {
    const normalized = String(value || '')
      .replace(/\//g, '\\')
      .replace(/\\+/g, '\\')
      .trim();
    return normalized || t('launch.path.undefined');
  }, [t]);

  const hostRuntimeRows = React.useMemo(() => {
    return (Array.isArray(hosts) ? hosts : []).map((host) => {
      const ip = String(host?.ip || '').trim();
      const entry = onlineMap && onlineMap[ip];
      const online = !!(entry && entry.online);
      const running = !!(entry && entry.unrealRunning);
      const modeAllowsHost = isHostAllowedForLaunchMode({
        ip,
        localIp,
        launchMode,
        canUseLiveLaunch,
        canUseEditorLaunch,
      });
      const ue = resolveExeForHost(host);
      const uproj = resolveUprojectFor(host);
      const ready = isReadyHost(host, { exe: ue, uproj, ip });
      const canStart = modeAllowsHost && ready && online && !running && !busy[host.ip];
      const canStop = modeAllowsHost && !busy[host.ip] && running;
      const agentStatus = computeAgentStatus({
        isBusy: !!busy[ip],
        online,
        running,
        t,
      });
      const projectStatus = computeProjectStatus({
        host,
        ip,
        uproj,
        syncStatusMap,
        t,
      });
      const exeStatus = computeExeStatus({
        hasExe: !!ue,
        requiredVersion: activeProjectEngineVersion,
        t,
      });
      const ipValid = !!ip && /\d/.test(ip);
      const hostInvalid =
        !ipValid ||
        !online ||
        projectStatus.cls === 'fail' ||
        exeStatus.cls === 'fail';
      const hostWarn = projectStatus.cls === 'warn';
      return {
        host,
        ip,
        online,
        running,
        ue,
        uproj,
        canStart,
        canStop,
        agentStatus,
        projectStatus,
        exeStatus,
        hostInvalid,
        hostWarn,
      };
    });
  }, [
    hosts,
    onlineMap,
    localIp,
    launchMode,
    canUseLiveLaunch,
    canUseEditorLaunch,
    resolveExeForHost,
    resolveUprojectFor,
    isReadyHost,
    busy,
    t,
    syncStatusMap,
    activeProjectEngineVersion,
  ]);

  const canStartAnyHost = React.useMemo(
    () => hostRuntimeRows.some((row) => row.canStart),
    [hostRuntimeRows]
  );

  const canStopAnyHost = React.useMemo(
    () => hostRuntimeRows.some((row) => row.canStop),
    [hostRuntimeRows]
  );

  const activeLabel = loading
    ? t('launch.loading')
    : (projectsData.activeName || t('launch.activeProject.none'));

  return {
    hasMachines,
    pathOrND,
    hostRuntimeRows,
    canStartAnyHost,
    canStopAnyHost,
    activeLabel,
  };
}

export { useLaunchControlViewModel };
