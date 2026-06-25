import React from 'react';
import { safeStr } from '../synchronisationHelpers';

export function useSyncServerAutoCheck({
  role,
  clientHosts,
  onCheckHost,
  refreshKey = '',
}) {
  const checkedKeysRef = React.useRef(new Set());
  const refreshKeyRef = React.useRef('');

  React.useEffect(() => {
    if (role !== 'server') return;
    if (!Array.isArray(clientHosts) || clientHosts.length === 0) return;
    if (refreshKeyRef.current !== refreshKey) {
      refreshKeyRef.current = refreshKey;
      checkedKeysRef.current.clear();
    }
    let cancelled = false;

    void (async () => {
      for (const host of clientHosts) {
        if (cancelled) return;
        const ip = safeStr(host?.ip || host?.address, '');
        if (!ip) continue;
        const root = String(host?.syncRoot || '').trim();
        const key = `${refreshKey}|${ip}|${root}|${host?.syncEnabled ? '1' : '0'}`;
        if (checkedKeysRef.current.has(key)) continue;
        checkedKeysRef.current.add(key);
        await onCheckHost(ip);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, clientHosts, onCheckHost, refreshKey]);
}
