import React from 'react';

function useLaunchControlStartLayoutCommands({
  launchMode,
  t,
  setStatusMsg,
  useStartLayoutRef,
  hasStartLayoutRef,
  wrcReadyRef,
  startRequestedRef,
  lastStartLayoutSigRef,
  wrcAttemptsRef,
  startWrcProbe,
}) {
  const armProductionStartCycle = React.useCallback(() => {
    if (launchMode !== 'production') return;
    startRequestedRef.current = true;
    wrcReadyRef.current = false;
    lastStartLayoutSigRef.current = '';
    wrcAttemptsRef.current = 0;
    try {
      startWrcProbe();
    } catch {}
  }, [
    launchMode,
    startRequestedRef,
    wrcReadyRef,
    lastStartLayoutSigRef,
    wrcAttemptsRef,
    startWrcProbe,
  ]);

  const showStartLayoutStatus = React.useCallback(() => {
    if (launchMode !== 'production') return;
    if (!useStartLayoutRef.current || !hasStartLayoutRef.current) return;
    setStatusMsg(
      wrcReadyRef.current
        ? t('launch.status.startLayoutSent')
        : t('launch.status.startLayoutWaiting')
    );
  }, [hasStartLayoutRef, launchMode, setStatusMsg, t, useStartLayoutRef, wrcReadyRef]);

  return {
    armProductionStartCycle,
    showStartLayoutStatus,
  };
}

export { useLaunchControlStartLayoutCommands };
