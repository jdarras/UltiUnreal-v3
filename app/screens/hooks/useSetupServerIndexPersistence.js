import React from 'react';

function useSetupServerIndexPersistence({
  setCfg,
  cfgRef,
  postHost,
  getHosts,
  hostArrayToEditList,
  lang,
  renderAvailabilityValues,
  normalizeArgsForServer,
  refreshStatuses,
}) {
  const reindexAndPersist = React.useCallback(
    async (machines) => {
      const list = Array.isArray(machines) ? machines : [];
      const updated = list.map((machine, idx) => ({ ...machine, sortIndex: idx }));

      setCfg((prev) => ({ ...prev, machines: updated }));
      cfgRef.current = { ...cfgRef.current, machines: updated };

      for (const machine of updated) {
        const ip = String(machine?.ip || '').trim();
        if (!ip) continue;
        try {
          const renderAvailability = renderAvailabilityValues.includes(machine.renderAvailability)
            ? machine.renderAvailability
            : 'capable';
          await postHost(ip, {
            ip,
            name: String(machine.name || '').trim(),
            color: String(machine.color || '').trim(),
            args: normalizeArgsForServer(machine.args || {}),
            renderAvailability,
            renderReturnAt: renderAvailability === 'busy'
              ? (typeof machine.renderReturnAt === 'string' ? machine.renderReturnAt || null : null)
              : null,
            sortIndex: Number(machine.sortIndex),
          });
        } catch {}
      }

      try {
        const hosts = await getHosts().catch(() => []);
        const machineList = hostArrayToEditList(hosts, lang);
        setCfg((prev) => ({ ...prev, machines: machineList }));
      } catch {}

      await refreshStatuses();
    },
    [
      cfgRef,
      getHosts,
      hostArrayToEditList,
      lang,
      normalizeArgsForServer,
      postHost,
      refreshStatuses,
      renderAvailabilityValues,
      setCfg,
    ]
  );

  return {
    reindexAndPersist,
  };
}

export { useSetupServerIndexPersistence };
