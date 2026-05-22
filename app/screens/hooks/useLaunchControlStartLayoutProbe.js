import React from 'react';
import { scheduleWrcProbe } from './launchControlWrcProbe';

function useLaunchControlStartLayoutProbe({
  launchMode,
  commonCfgRef,
  startRequestedRef,
  wrcReadyRef,
  wrcAttemptsRef,
  resolveWrcTarget,
  emitStartLayoutLog,
  t,
  setStatusMsg,
  setWrcReadyTick,
  useStartLayoutRef,
  hasStartLayoutRef,
}) {
  const wrcProbeCancelRef = React.useRef(false);
  const wrcProbeTimerRef = React.useRef(null);

  const startWrcProbe = React.useCallback(() => {
    scheduleWrcProbe({
      launchMode,
      commonCfgRef,
      startRequestedRef,
      wrcProbeCancelRef,
      wrcReadyRef,
      wrcAttemptsRef,
      wrcProbeTimerRef,
      resolveWrcTarget,
      emitStartLayoutLog,
      t,
      setStatusMsg,
      setWrcReadyTick,
      useStartLayoutRef,
      hasStartLayoutRef,
    });
  }, [
    launchMode,
    commonCfgRef,
    startRequestedRef,
    wrcReadyRef,
    wrcAttemptsRef,
    resolveWrcTarget,
    emitStartLayoutLog,
    t,
    setStatusMsg,
    setWrcReadyTick,
    useStartLayoutRef,
    hasStartLayoutRef,
  ]);

  React.useEffect(() => () => {
    wrcProbeCancelRef.current = true;
    if (wrcProbeTimerRef.current) {
      clearTimeout(wrcProbeTimerRef.current);
      wrcProbeTimerRef.current = null;
    }
  }, [launchMode, resolveWrcTarget, t]);

  return { startWrcProbe };
}

export { useLaunchControlStartLayoutProbe };
