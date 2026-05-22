import React from 'react';

function useSetupServerMachineCrud({
  cfgRef,
  setCfg,
  deleteHost,
  updateMachine,
}) {
  const toggleMachineParams = React.useCallback(
    (idxInState, shouldOpen) => {
      updateMachine(idxInState, { showEditor: !!shouldOpen, showArgs: !!shouldOpen });
    },
    [updateMachine]
  );

  const updateMachineArgs = React.useCallback(
    (idxInState, patch = {}) => {
      const prevArgs = cfgRef.current?.machines?.[idxInState]?.args || {};
      updateMachine(idxInState, { args: { ...prevArgs, ...patch } });
    },
    [cfgRef, updateMachine]
  );

  const addMachine = React.useCallback(() => {
    setCfg((prev) => {
      const nextIndex = prev.machines.length;
      return {
        ...prev,
        machines: [
          ...prev.machines,
          {
            name: `Station ${prev.machines.length + 1}`,
            color: '',
            ip: '',
            uproject: '',
            args: {},
            showEditor: false,
            showArgs: false,
            status: 'unknown',
            lastMsg: '',
            lastMsgType: '',
            renderAvailability: 'capable',
            sortIndex: nextIndex,
            prevIp: '',
          },
        ],
      };
    });
  }, [setCfg]);

  const removeMachine = React.useCallback(
    async (idxInState) => {
      const ip = String(cfgRef.current?.machines?.[idxInState]?.ip || '').trim();
      if (ip) {
        try {
          await deleteHost(ip);
        } catch {}
      }
      setCfg((prev) => ({
        ...prev,
        machines: prev.machines.filter((_, idx) => idx !== idxInState),
      }));
    },
    [cfgRef, deleteHost, setCfg]
  );

  return {
    toggleMachineParams,
    updateMachineArgs,
    addMachine,
    removeMachine,
  };
}

export { useSetupServerMachineCrud };
