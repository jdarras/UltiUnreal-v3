import React from 'react';
import { safeStr } from '../synchronisationHelpers';

export function useSyncClientViewModel({
  hosts,
  localIp,
  t,
}) {
  return React.useMemo(() => {
    const list = Array.isArray(hosts) ? hosts : [];
    const hasHosts = list.length > 0;

    const localHostClient = hasHosts
      ? list.find(
          (host) =>
            host &&
            String(safeStr(host.ip || host.address, '')).trim() === localIp
        ) || list[0]
      : null;

    const localHostIp = localHostClient
      ? safeStr(localHostClient.ip || localHostClient.address, '')
      : '';
    const localHostName = localHostClient
      ? safeStr(localHostClient.name, t('sync.client.thisMachine'))
      : '';

    return {
      hasHosts,
      localHostClient,
      localHostIp,
      localHostName,
    };
  }, [hosts, localIp, t]);
}
