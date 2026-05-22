import React from 'react';

function useSetupServerMachineCommit({
  cfgRef,
  saveArgsToServer,
  deleteHost,
  isValidIpv4,
  updateMachine,
  reindexAndPersist,
}) {
  const updateMachineRenderReturnAt = React.useCallback(
    (idxInState, isoValue) => {
      updateMachine(idxInState, { renderReturnAt: isoValue });
      const updated = { ...cfgRef.current?.machines?.[idxInState], renderReturnAt: isoValue };
      saveArgsToServer(idxInState, updated);
    },
    [cfgRef, saveArgsToServer, updateMachine]
  );

  const handleIpBlur = React.useCallback(
    async (idxInState) => {
      const current =
        Array.isArray(cfgRef.current?.machines) && cfgRef.current.machines[idxInState]
          ? cfgRef.current.machines[idxInState]
          : null;
      if (!current) return;
      const ip = String(current.ip || '').trim();
      if (!ip) return;

      const prevIp = String(current.prevIp || '').trim();
      await saveArgsToServer(idxInState, current);

      if (prevIp && prevIp !== ip && isValidIpv4(prevIp)) {
        try {
          await deleteHost(prevIp);
        } catch {}
      }
      updateMachine(idxInState, { prevIp: '' });

      await reindexAndPersist(cfgRef.current?.machines || []);
    },
    [cfgRef, deleteHost, isValidIpv4, reindexAndPersist, saveArgsToServer, updateMachine]
  );

  return {
    updateMachineRenderReturnAt,
    handleIpBlur,
  };
}

export { useSetupServerMachineCommit };
