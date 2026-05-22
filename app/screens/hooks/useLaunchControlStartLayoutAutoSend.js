import React from 'react';
import { dispatchStartLayout } from './launchControlStartLayoutDispatch';

function useLaunchControlStartLayoutAutoSend({
  launchMode,
  t,
  onlineMap,
  hostsRef,
  projectsDataRef,
  commonCfgRef,
  rcHttpPortRef,
  useStartLayoutRef,
  hasStartLayoutRef,
  wrcReadyRef,
  wrcReadyTick,
  setStatusMsg,
  resolveWrcTarget,
  emitStartLayoutLog,
  wrcAttemptsRef,
  startRequestedRef,
  startLayoutSendInProgressRef,
  lastStartLayoutSigRef,
  startLayoutTimerRef,
}) {
  React.useEffect(() => {
    if (!useStartLayoutRef.current || !hasStartLayoutRef.current) return;
    if (!wrcReadyRef.current) return;
    if (!startRequestedRef.current) return;
    if (launchMode !== 'production') return;

    const isAnyHostRunning = Object.values(onlineMap || {}).some((entry) => entry && entry.unrealRunning);
    if (!isAnyHostRunning) return;

    const projectKey = String(projectsDataRef.current?.activeId || projectsDataRef.current?.activeName || '').trim();
    if (!projectKey) return;

    if (lastStartLayoutSigRef.current === projectKey) return;
    if (startLayoutSendInProgressRef.current) return;
    if (startLayoutTimerRef.current) return;

    startLayoutSendInProgressRef.current = true;
    const startDelaySec = Math.max(0, Number(commonCfgRef.current?.startLayoutSendDelaySec || 3));
    setStatusMsg(t('launch.status.startLayoutAutoPending', { delay: startDelaySec }));

    startLayoutTimerRef.current = setTimeout(async () => {
      try {
        const { sent } = await dispatchStartLayout({
          projectKey,
          hostsRef,
          projectsDataRef,
          rcHttpPortRef,
          wrcAttemptsRef,
          resolveWrcTarget,
          emitStartLayoutLog,
          setStatusMsg,
          t,
        });
        if (sent) {
          lastStartLayoutSigRef.current = projectKey;
        }
      } finally {
        startLayoutSendInProgressRef.current = false;
        startLayoutTimerRef.current = null;
      }
    }, startDelaySec * 1000);
  }, [
    commonCfgRef,
    emitStartLayoutLog,
    hasStartLayoutRef,
    hostsRef,
    launchMode,
    onlineMap,
    projectsDataRef,
    rcHttpPortRef,
    resolveWrcTarget,
    setStatusMsg,
    t,
    useStartLayoutRef,
    wrcReadyRef,
    wrcReadyTick,
    wrcAttemptsRef,
    startRequestedRef,
    startLayoutSendInProgressRef,
    lastStartLayoutSigRef,
    startLayoutTimerRef,
  ]);

  React.useEffect(() => () => {
    if (startLayoutTimerRef.current) {
      clearTimeout(startLayoutTimerRef.current);
      startLayoutTimerRef.current = null;
    }
  }, [startLayoutTimerRef]);
}

export { useLaunchControlStartLayoutAutoSend };
