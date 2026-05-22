import React from 'react';
import { postCommon } from '../../utils/agent';

function useLaunchControlRuntimeState() {
  const [busy, setBusy] = React.useState({});

  const setQuietModeFlag = React.useCallback(async (enabled) => {
    try {
      await postCommon({ quietMode: !!enabled });
    } catch {
      // silencieux : ne bloque pas l'action
    }
  }, []);

  const setHostBusy = React.useCallback((ip, isBusy) => {
    const key = String(ip || '').trim();
    if (!key) return;
    setBusy((prev) => ({ ...prev, [key]: !!isBusy }));
  }, []);

  const setHostsBusy = React.useCallback((ips, isBusy) => {
    const keys = Array.isArray(ips)
      ? ips.map((ip) => String(ip || '').trim()).filter(Boolean)
      : [];
    if (!keys.length) return;
    setBusy((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        next[key] = !!isBusy;
      });
      return next;
    });
  }, []);

  return {
    busy,
    setHostBusy,
    setHostsBusy,
    setQuietModeFlag,
  };
}

export { useLaunchControlRuntimeState };
