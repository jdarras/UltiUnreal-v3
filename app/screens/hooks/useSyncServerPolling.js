import React from 'react';
import { getHosts, getProjects } from '../../utils/agent';
import { startPostprodAsyncLoop } from '../../hooks/postprodAsyncLoop';
import {
  normalizeSyncHosts,
  normalizeSyncProjectsData,
} from './syncDataNormalization';

export function useSyncServerPolling({
  role,
  quietMode,
  setHosts,
  setProjectsData,
  setActiveName,
}) {
  React.useEffect(() => {
    if (role !== 'server') return;
    if (quietMode) return;
    let stopped = false;

    const stopLoop = startPostprodAsyncLoop({
      intervalMs: 5000,
      tick: async () => {
        try {
          const [hostsRaw, projectsRaw] = await Promise.all([
            getHosts().catch(() => []),
            getProjects({ light: true }).catch(() => null),
          ]);
          if (stopped) return;

          setHosts(normalizeSyncHosts(hostsRaw));

          const projectsNormalized = normalizeSyncProjectsData(projectsRaw);
          if (!projectsNormalized) return;
          if (stopped) return;
          setProjectsData(projectsNormalized);
          setActiveName(projectsNormalized.activeName || '');
        } catch {
          // Keep previous state on polling errors.
        }
      },
    });

    return () => {
      stopped = true;
      stopLoop();
    };
  }, [role, quietMode, setHosts, setProjectsData, setActiveName]);
}
