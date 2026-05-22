import React from 'react';
import {
  deleteHost,
  getCommon,
  getHosts,
  getOnlineStatus,
  postHost,
} from '../../utils/agent';
import {
  RENDER_AVAILABILITY_VALUES,
  hostArrayToEditList,
  isValidIpv4,
  normalizeArgsForServer,
} from '../setupHelpers';
import { useSetupServerCardRenderer } from './useSetupServerCardRenderer';
import { useSetupServerConfigState } from './useSetupServerConfigState';
import { useSetupServerIndexPersistence } from './useSetupServerIndexPersistence';
import { useSetupServerLifecycle } from './useSetupServerLifecycle';
import { useSetupServerMachineCommit } from './useSetupServerMachineCommit';
import { useSetupServerMachineCrud } from './useSetupServerMachineCrud';
import { useSetupServerMachineSegmentation } from './useSetupServerMachineSegmentation';
import { useSetupServerMachineUpdater } from './useSetupServerMachineUpdater';
import { useSetupServerPersistence } from './useSetupServerPersistence';
import { useSetupServerReorder } from './useSetupServerReorder';
import { useSetupServerStatus } from './useSetupServerStatus';
import { useSetupServerViewModel } from './useSetupServerViewModel';

export function useSetupServerOrchestrator({
  role,
  localIp,
  lang,
  isRenderMode,
  t,
}) {
  const { cfg, setCfg, cfgRef } = useSetupServerConfigState();
  const scheduleServerSaveRef = React.useRef(() => {});
  const cancelScheduledServerSaveRef = React.useRef(() => {});
  const [detected, setDetected] = React.useState([]);
  const sortLocale = lang || 'fr';

  const { refreshStatuses } = useSetupServerStatus({
    localIp,
    setCfg,
    setDetected,
    getOnlineStatus,
  });

  useSetupServerLifecycle({
    role,
    sortLocale,
    getCommon,
    getHosts,
    setCfg,
    hostArrayToEditList,
    refreshStatuses,
    refreshSec: cfg.refreshSec,
  });

  const updateMachine = useSetupServerMachineUpdater({
    setCfg,
    role,
    isValidIpv4,
    scheduleServerSaveRef,
    cancelScheduledServerSaveRef,
  });

  const {
    toggleMachineParams,
    updateMachineArgs,
    addMachine,
    removeMachine,
  } = useSetupServerMachineCrud({
    cfgRef,
    setCfg,
    deleteHost,
    updateMachine,
  });

  const {
    scheduleServerSave,
    cancelScheduledServerSave,
    saveArgsToServer,
  } = useSetupServerPersistence({
    cfgRef,
    t,
    isValidIpv4,
    renderAvailabilityValues: RENDER_AVAILABILITY_VALUES,
    normalizeArgsForServer,
    postHost,
    refreshStatuses,
    updateMachine,
  });

  React.useEffect(() => {
    scheduleServerSaveRef.current = scheduleServerSave;
    cancelScheduledServerSaveRef.current = cancelScheduledServerSave;
  }, [scheduleServerSave, cancelScheduledServerSave]);

  const { reindexAndPersist } = useSetupServerIndexPersistence({
    setCfg,
    cfgRef,
    postHost,
    getHosts,
    hostArrayToEditList,
    lang,
    renderAvailabilityValues: RENDER_AVAILABILITY_VALUES,
    normalizeArgsForServer,
    refreshStatuses,
  });

  const {
    addDetectedMachine,
    setRenderAvailability,
  } = useSetupServerMachineSegmentation({
    setCfg,
    cfgRef,
    reindexAndPersist,
    renderAvailabilityValues: RENDER_AVAILABILITY_VALUES,
  });

  const {
    updateMachineRenderReturnAt,
    handleIpBlur,
  } = useSetupServerMachineCommit({
    cfgRef,
    saveArgsToServer,
    deleteHost,
    isValidIpv4,
    updateMachine,
    reindexAndPersist,
  });

  const {
    statusDot,
    presetOptions,
    capableList,
    excludedList,
    machineColorUsageCounts,
    unknownDetected,
  } = useSetupServerViewModel({
    t,
    machines: cfg.machines,
    detected,
  });

  const {
    onDragStart,
    onDragOver,
    onDrop,
    onCardDragEnd,
  } = useSetupServerReorder({
    setCfg,
    reindexAndPersist,
    cfgRef,
  });

  const { renderCard } = useSetupServerCardRenderer({
    t,
    statusDot,
    isRenderMode,
    machineColorUsageCounts,
    presetOptions,
    onDragStart,
    onCardDragEnd,
    onDragOver,
    onDrop,
    toggleMachineParams,
    updateMachine,
    setRenderAvailability,
    removeMachine,
    handleIpBlur,
    updateMachineRenderReturnAt,
    updateMachineArgs,
  });

  return {
    addMachine,
    capableList,
    excludedList,
    renderCard,
    unknownDetected,
    addDetectedMachine,
  };
}
