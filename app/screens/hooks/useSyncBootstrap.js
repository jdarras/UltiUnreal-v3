import React from 'react';
import { getCommon, getHosts } from '../../utils/agent';
import { normalizeSyncHosts } from './syncDataNormalization';

export function useSyncBootstrap({
  setHosts,
  setHostsLoading,
  setHostsError,
  setQuietMode,
}) {
  React.useEffect(() => {
    let cancelled = false;

    async function loadHosts() {
      setHostsLoading(true);
      setHostsError('');
      try {
        const hostsRaw = await getHosts();
        if (cancelled) return;
        setHosts(normalizeSyncHosts(hostsRaw));
      } catch (error) {
        if (!cancelled) {
          setHostsError(String(error?.message || error));
        }
      } finally {
        if (!cancelled) {
          setHostsLoading(false);
        }
      }
    }

    loadHosts();
    return () => {
      cancelled = true;
    };
  }, [setHosts, setHostsLoading, setHostsError]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const common = await getCommon().catch(() => ({}));
        if (cancelled) return;
        if (typeof common?.quietMode === 'boolean') {
          setQuietMode(common.quietMode);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [setQuietMode]);
}
