import React from 'react';

function useSetupServerLifecycle({
  role,
  sortLocale,
  getCommon,
  getHosts,
  setCfg,
  hostArrayToEditList,
  refreshStatuses,
  refreshSec,
}) {
  React.useEffect(() => {
    (async () => {
      if (role === 'client') return;
      try {
        const common = await getCommon();
        setCfg((prev) => ({
          ...prev,
          rcHttpPort: common.rcHttpPort ?? prev.rcHttpPort,
          rcWsPort: common.rcWsPort ?? prev.rcWsPort,
          refreshSec: common.refreshSec ?? prev.refreshSec,
          agentPort: common.agentPort ?? prev.agentPort,
        }));
      } catch {}

      try {
        const hosts = await getHosts();
        setCfg((prev) => ({ ...prev, machines: hostArrayToEditList(hosts, sortLocale) }));
        await refreshStatuses();
      } catch {}
    })();
  }, [getCommon, getHosts, hostArrayToEditList, refreshStatuses, role, setCfg, sortLocale]);

  React.useEffect(() => {
    if (role !== 'server') return;
    let stopped = false;
    let timer = null;

    const tick = async () => {
      await refreshStatuses();
      if (stopped) return;
      const sec = Math.max(2, Number(refreshSec || 5));
      timer = setTimeout(tick, sec * 1000);
    };

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [refreshSec, refreshStatuses, role]);
}

export { useSetupServerLifecycle };
