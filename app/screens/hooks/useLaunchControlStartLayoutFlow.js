import React from 'react';
import { useLaunchControlStartLayoutAutoSend } from './useLaunchControlStartLayoutAutoSend';
import { useLaunchControlStartLayoutCommands } from './useLaunchControlStartLayoutCommands';
import { useLaunchControlStartLayoutProbe } from './useLaunchControlStartLayoutProbe';
import {
  emitLaunchControlStartLayoutLog,
  refreshHasStartLayoutState,
  resolveWrcTargetFromRefs,
} from './launchControlStartLayoutShared';

function useLaunchControlStartLayoutFlow({
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
  setStatusMsg,
  setHasStartLayout,
  setUseStartLayout,
}) {
  const [wrcReadyTick, setWrcReadyTick] = React.useState(0);
  const wrcAttemptsRef = React.useRef(0);
  const startLayoutSendInProgressRef = React.useRef(false);
  const lastStartLayoutSigRef = React.useRef('');
  const startLayoutTimerRef = React.useRef(null);
  const startRequestedRef = React.useRef(false);

  const resolveWrcTarget = React.useCallback(
    () => resolveWrcTargetFromRefs({ hostsRef, projectsDataRef, rcHttpPortRef }),
    [hostsRef, projectsDataRef, rcHttpPortRef]
  );

  const emitStartLayoutLog = React.useCallback(
    (event = {}) => emitLaunchControlStartLayoutLog(event),
    []
  );

  const { startWrcProbe } = useLaunchControlStartLayoutProbe({
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
  });

  const {
    armProductionStartCycle,
    showStartLayoutStatus,
  } = useLaunchControlStartLayoutCommands({
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
  });

  useLaunchControlStartLayoutAutoSend({
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
  });

  const refreshHasStartLayout = React.useCallback(
    async (projectId) =>
      refreshHasStartLayoutState({
        projectId,
        setHasStartLayout,
        setUseStartLayout,
      }),
    [setHasStartLayout, setUseStartLayout]
  );

  return {
    armProductionStartCycle,
    showStartLayoutStatus,
    refreshHasStartLayout,
  };
}

export { useLaunchControlStartLayoutFlow };
