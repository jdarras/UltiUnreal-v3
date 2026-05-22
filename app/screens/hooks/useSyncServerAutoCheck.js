import React from 'react';
import { safeStr } from '../synchronisationHelpers';

export function useSyncServerAutoCheck({
  role,
  clientHosts,
  onCheckHost,
}) {
  const [autoCheckDone, setAutoCheckDone] = React.useState(false);

  React.useEffect(() => {
    if (role !== 'server') return;
    if (autoCheckDone) return;
    if (!Array.isArray(clientHosts) || clientHosts.length === 0) return;

    setAutoCheckDone(true);

    clientHosts.forEach((host) => {
      const ip = safeStr(host?.ip || host?.address, '');
      if (!ip) return;
      onCheckHost(ip);
    });
  }, [role, autoCheckDone, clientHosts, onCheckHost]);
}
