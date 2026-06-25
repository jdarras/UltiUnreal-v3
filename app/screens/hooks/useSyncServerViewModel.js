import React from 'react';

import { safeStr } from '../synchronisationHelpers.js';

function filterSyncTargetHosts(hosts, serverIp, isRenderMode) {
  return (Array.isArray(hosts) ? hosts : []).filter((host) => {
    if (!host || typeof host !== 'object') return false;
    const ip = safeStr(host.ip || host.address, '');
    if (!ip) return false;
    if (!isRenderMode && serverIp && ip === serverIp) return false;
    return true;
  });
}

function resolveSourceProjectInfo(projectsData) {
  let sourceUproject = '';

  if (projectsData) {
    const activeByHost = projectsData.activeByHost || {};
    const keysToTry = [];
    if (projectsData.activeId) keysToTry.push(String(projectsData.activeId));

    if (activeByHost && typeof activeByHost === 'object' && keysToTry.length > 0) {
      for (const hostKey of Object.keys(activeByHost)) {
        const perHost = activeByHost[hostKey];
        if (!perHost || typeof perHost !== 'object') continue;
        for (const key of keysToTry) {
          const value = perHost[key];
          if (typeof value === 'string' && value.toLowerCase().endsWith('.uproject')) {
            sourceUproject = value;
            break;
          }
        }
        if (sourceUproject) break;
      }
    }

    if (!sourceUproject && Array.isArray(projectsData.projects)) {
      let activeProject = null;
      if (projectsData.activeId) {
        activeProject = projectsData.projects.find(
          (project) => project && String(project.id || '') === String(projectsData.activeId)
        );
      }

      if (!activeProject && projectsData.activeName) {
        const ref = String(projectsData.activeName).trim().toLowerCase();
        activeProject = projectsData.projects.find(
          (project) => project && String(project.name || '').trim().toLowerCase() === ref
        );
      }

      if (activeProject) {
        if (
          typeof activeProject.uproject === 'string' &&
          activeProject.uproject.toLowerCase().endsWith('.uproject')
        ) {
          sourceUproject = activeProject.uproject;
        } else {
          for (const key of Object.keys(activeProject)) {
            const value = activeProject[key];
            if (typeof value === 'string' && value.toLowerCase().endsWith('.uproject')) {
              sourceUproject = value;
              break;
            }
          }
        }
      }
    }
  }

  let sourceDir = '';
  let sourceProjectName = '';

  if (sourceUproject) {
    const normalized = sourceUproject.replace(/\//g, '\\');
    const separatorIndex = normalized.lastIndexOf('\\');
    if (separatorIndex > 0) {
      sourceDir = normalized.slice(0, separatorIndex);
      const tail = normalized.slice(separatorIndex + 1);
      if (tail.toLowerCase().endsWith('.uproject')) {
        const parts = tail.split('.');
        sourceProjectName = parts[0] || '';
      } else {
        sourceProjectName = tail;
      }
    }
  } else if (projectsData && Array.isArray(projectsData.projects)) {
    const activeProject = projectsData.projects.find((project) => project && (project.active || project.isActive)) || null;
    if (activeProject) {
      if (typeof activeProject.uproject === 'string') {
        const normalized = activeProject.uproject.replace(/\//g, '\\');
        const separatorIndex = normalized.lastIndexOf('\\');
        if (separatorIndex > 0) {
          sourceDir = normalized.slice(0, separatorIndex);
        }
        if (activeProject.name) {
          sourceProjectName = activeProject.name;
        } else if (separatorIndex > 0) {
          const tail = normalized.slice(separatorIndex + 1);
          if (tail.toLowerCase().endsWith('.uproject')) {
            const parts = tail.split('.');
            sourceProjectName = parts[0] || '';
          } else {
            sourceProjectName = tail;
          }
        }
      } else if (activeProject.name) {
        sourceProjectName = activeProject.name;
      }
    }
  }

  return { sourceDir, sourceProjectName };
}

function useSyncServerViewModel({
  hosts,
  localIp,
  projectsData,
  loadingProjects,
  activeName,
  isRenderMode,
  t,
}) {
  const localHost = React.useMemo(
    () => hosts.find((host) => host && localIp && safeStr(host.ip || host.address, '') === localIp) || hosts[0],
    [hosts, localIp]
  );

  const localHostIp = React.useMemo(
    () => safeStr(localHost?.ip || localHost?.address, '') || '',
    [localHost]
  );

  const serverIp = localIp || localHostIp;

  const clientHosts = React.useMemo(
    () => filterSyncTargetHosts(hosts, serverIp, isRenderMode),
    [hosts, isRenderMode, serverIp]
  );

  const hasClientHosts = clientHosts.length > 0;

  const groupedHosts = React.useMemo(
    () =>
      clientHosts.reduce(
        (acc, host) => {
          if (!host) return acc;
          if (host.renderAvailability === 'excluded' || host.eligible === false) {
            acc.excludedHosts.push(host);
          } else if (host.syncEnabled) {
            acc.syncHosts.push(host);
          } else {
            acc.localProjectHosts.push(host);
          }
          return acc;
        },
        { excludedHosts: [], localProjectHosts: [], syncHosts: [] }
      ),
    [clientHosts]
  );

  const { sourceDir, sourceProjectName } = React.useMemo(
    () => resolveSourceProjectInfo(projectsData),
    [projectsData]
  );

  const displayProjectName = React.useMemo(() => {
    if (loadingProjects) return t('sync.server.activeProjectLoading');
    return activeName || sourceProjectName || '';
  }, [loadingProjects, t, activeName, sourceProjectName]);

  return {
    sourceDir,
    sourceProjectName,
    displayProjectName,
    clientHosts,
    hasClientHosts,
    groupedHosts,
  };
}

export { filterSyncTargetHosts, useSyncServerViewModel };
