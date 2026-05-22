import React from 'react';
import { getHosts, getProjects } from '../../utils/agent';
import { safeStr } from '../synchronisationHelpers';

function normalizeHosts(rawHosts) {
  return (Array.isArray(rawHosts) ? rawHosts : []).filter(
    (host) =>
      host &&
      typeof host === 'object' &&
      safeStr(host.ip || host.address, '')
  );
}

function normalizeProjects(rawProjects) {
  if (!rawProjects || typeof rawProjects !== 'object') return null;

  let activeName = '';
  if (typeof rawProjects.activeName === 'string') {
    activeName = rawProjects.activeName;
  } else if (Array.isArray(rawProjects.projects)) {
    const activeProject = rawProjects.projects.find(
      (project) => project && (project.active || project.isActive)
    );
    if (activeProject && typeof activeProject.name === 'string') {
      activeName = activeProject.name;
    }
  }

  return {
    activeId:
      typeof rawProjects.activeId === 'string' ||
      typeof rawProjects.activeId === 'number'
        ? rawProjects.activeId
        : undefined,
    activeName: activeName || '',
    projects: Array.isArray(rawProjects.projects) ? rawProjects.projects : [],
    activeByHost:
      rawProjects.activeByHost &&
      typeof rawProjects.activeByHost === 'object'
        ? rawProjects.activeByHost
        : {},
  };
}

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

    let cancelled = false;
    let timer = null;

    async function tick() {
      try {
        const [hostsRaw, projectsRaw] = await Promise.all([
          getHosts().catch(() => []),
          getProjects({ light: true }).catch(() => null),
        ]);
        if (cancelled) return;

        setHosts(normalizeHosts(hostsRaw));

        const projectsNormalized = normalizeProjects(projectsRaw);
        if (!projectsNormalized) return;
        setProjectsData(projectsNormalized);
        setActiveName(projectsNormalized.activeName || '');
      } catch {
        // Keep previous state on polling errors.
      }
    }

    tick();
    timer = setInterval(tick, 5000);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [role, quietMode, setHosts, setProjectsData, setActiveName]);
}
