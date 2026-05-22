import React from 'react';

function useSetupServerMachineSegmentation({
  setCfg,
  cfgRef,
  reindexAndPersist,
  renderAvailabilityValues,
}) {
  const addDetectedMachine = React.useCallback(
    async (entry) => {
      const ip = String(entry?.ip || '').trim();
      if (!ip) return;
      const base = Array.isArray(cfgRef.current?.machines) ? cfgRef.current.machines : [];
      if (base.some((machine) => String(machine?.ip || '').trim().toLowerCase() === ip.toLowerCase())) return;

      const nextMachine = {
        name: entry?.name || `Station ${base.length + 1}`,
        color: '',
        ip,
        uproject: '',
        args: {},
        showEditor: false,
        showArgs: false,
        status: 'unknown',
        lastMsg: '',
        lastMsgType: '',
        renderAvailability: 'capable',
        sortIndex: base.length,
        prevIp: '',
      };

      const merged = [...base, nextMachine].map((machine, idx) => ({ ...machine, sortIndex: idx }));
      setCfg((prev) => ({ ...prev, machines: merged }));
      cfgRef.current = { ...cfgRef.current, machines: merged };
      await reindexAndPersist(merged);
    },
    [cfgRef, reindexAndPersist, setCfg]
  );

  const setRenderAvailability = React.useCallback(
    async (idxInState, availability) => {
      if (!renderAvailabilityValues.includes(availability)) return;
      const list = Array.isArray(cfgRef.current?.machines) ? [...cfgRef.current.machines] : [];
      if (idxInState < 0 || idxInState >= list.length) return;

      const target = {
        ...list[idxInState],
        renderAvailability: availability,
        renderReturnAt: availability === 'busy' ? (list[idxInState]?.renderReturnAt || null) : null,
      };
      const rest = list.filter((_, idx) => idx !== idxInState);

      const capable = rest.filter((machine) => machine.renderAvailability !== 'excluded');
      const excluded = rest.filter((machine) => machine.renderAvailability === 'excluded');

      const merged = availability === 'excluded'
        ? [...capable, ...excluded, target]
        : [...capable, target, ...excluded];
      const reindexed = merged.map((machine, idx) => ({ ...machine, sortIndex: idx }));

      setCfg((prev) => ({ ...prev, machines: reindexed }));
      cfgRef.current = { ...cfgRef.current, machines: reindexed };

      await reindexAndPersist(reindexed);
    },
    [cfgRef, reindexAndPersist, renderAvailabilityValues, setCfg]
  );

  return {
    addDetectedMachine,
    setRenderAvailability,
  };
}

export { useSetupServerMachineSegmentation };
