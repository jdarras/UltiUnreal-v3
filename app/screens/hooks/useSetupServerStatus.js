import React from 'react';

function normalizeOnlineItems(response) {
  let items = response && response.items ? response.items : {};
  if (Array.isArray(items)) {
    const map = {};
    for (const entry of items) {
      const key = String(entry?.ip || '').trim();
      if (key) map[key] = entry;
    }
    items = map;
  } else if (!items || typeof items !== 'object') {
    items = {};
  }
  return items;
}

function normalizeDetectedList(response) {
  const raw = response && response.detected ? response.detected : {};
  const list = [];
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const ip = String(entry?.ip || '').trim();
      if (!ip) continue;
      list.push({
        ip,
        name: String(entry?.name || '').trim(),
        ts: entry?.ts || '',
      });
    }
    return list;
  }
  if (raw && typeof raw === 'object') {
    for (const [ip, entry] of Object.entries(raw)) {
      const key = String(ip || '').trim();
      if (!key) continue;
      list.push({
        ip: key,
        name: String(entry?.name || '').trim(),
        ts: entry?.ts || '',
      });
    }
  }
  return list;
}

function useSetupServerStatus({
  localIp,
  setCfg,
  setDetected,
  getOnlineStatus,
}) {
  const refreshStatuses = React.useCallback(async () => {
    try {
      const response = await getOnlineStatus().catch(() => ({}));
      const online = normalizeOnlineItems(response);

      if (response && (Array.isArray(response.detected) || typeof response.detected === 'object')) {
        setDetected(normalizeDetectedList(response));
      }

      setCfg((prev) => {
        const machines = (prev.machines || []).map((machine) => {
          const ip = String(machine.ip || '').trim();
          if (!ip) {
            return { ...machine, status: 'unknown' };
          }

          const statusItem = online[ip];

          if (!statusItem) {
            return {
              ...machine,
              status: ip === localIp ? 'ok' : 'unknown',
            };
          }

          const isOnline = !!statusItem.online;
          const isLocalMachine = ip === localIp;
          return {
            ...machine,
            status: isOnline ? 'ok' : isLocalMachine ? 'warn' : 'fail',
          };
        });

        return { ...prev, machines };
      });
    } catch (error) {
      console.warn('refreshStatuses error', error);
    }
  }, [getOnlineStatus, localIp, setCfg, setDetected]);

  return {
    refreshStatuses,
  };
}

export { useSetupServerStatus };
