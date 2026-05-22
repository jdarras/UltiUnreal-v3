import React from 'react';

function useLaunchControlResolvers({
  projectsData,
  hosts,
  localIp,
  syncStatusMap,
  allowStartDesynced,
}) {
  const activeProject = React.useMemo(() => {
    const activeId = String(projectsData?.activeId || '').trim();
    const list = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
    return list.find((project) => project && activeId && String(project.id || '').trim() === activeId) || null;
  }, [projectsData]);

  const activeProjectEngineVersion = String(activeProject?.engineVersion || '').trim();

  const serverHost = React.useMemo(
    () => hosts.find((host) => String(host.ip || '').trim() === String(localIp || '').trim()),
    [hosts, localIp]
  );

  const resolveUprojectFor = React.useCallback((host) => {
    const ip = String(host?.ip || '').trim();

    const activeName = String(projectsData?.activeName || '').trim();
    const activeId = String(projectsData?.activeId || '').trim();
    const activeKey = activeId;
    if (!activeKey) return '';

    const list = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
    const active = list.find((project) => {
      if (!project) return false;
      if (activeId && String(project.id || '').trim() === activeId) return true;
      return false;
    }) || null;

    const syncEnabled = !!host?.syncEnabled;
    const syncRoot = String(host?.syncRoot || '').trim();
    const isLocal = ip === '127.0.0.1' || (localIp && ip === localIp);

    if (isLocal && active) {
      return String(
        active.uproject ||
          active.path ||
          active.projectPath ||
          ''
      ).trim();
    }

    if (syncEnabled && syncRoot) {
      let sourcePath = '';

      if (active) {
        sourcePath =
          active.uproject ||
          active.path ||
          active.projectPath ||
          '';
      }

      if (!sourcePath && projectsData?.activeByHost && typeof projectsData.activeByHost === 'object') {
        const perHost = projectsData.activeByHost[ip] || {};
        const candidate = perHost[activeKey];
        if (typeof candidate === 'string' && candidate) {
          sourcePath = candidate;
        }
      }

      if (sourcePath) {
        const normalized = sourcePath.replace(/\\/g, '/');
        const lastSlash = normalized.lastIndexOf('/');
        const fileName = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
        const sourceDir = lastSlash > 0 ? normalized.slice(0, lastSlash) : '';

        const projectName = sourceDir
          ? sourceDir
              .replace(/[/\\]+$/, '')
              .split(/[/\\]/)
              .filter(Boolean)
              .slice(-1)[0] || activeName || activeKey
          : (activeName || activeKey);

        const baseDir = projectName ? `${syncRoot}\\${projectName}` : syncRoot;
        return `${baseDir}\\${fileName}`;
      }

      return `${syncRoot}\\${activeName || activeKey}\\<missing.uproject>`;
    }

    if (projectsData?.activeByHost && typeof projectsData.activeByHost === 'object') {
      const perHost = projectsData.activeByHost[ip] || {};
      const candidate = perHost[activeKey];
      if (typeof candidate === 'string' && candidate) {
        return candidate.trim();
      }
    }

    if (typeof host?.uproject === 'string' && host.uproject) {
      return String(host.uproject).trim();
    }

    if (isLocal && active) {
      return String(
        active.uproject ||
          active.path ||
          active.projectPath ||
          ''
      ).trim();
    }

    return '';
  }, [localIp, projectsData]);

  const resolveExeForHost = React.useCallback((host) => {
    if (!activeProjectEngineVersion) return '';

    const editors =
      (host && host.unrealEditors && typeof host.unrealEditors === 'object'
        ? host.unrealEditors
        : {}) || {};

    return editors[activeProjectEngineVersion] || '';
  }, [activeProjectEngineVersion]);

  const isReadyHost = React.useCallback((host, resolved = null) => {
    const exe = resolved?.exe ?? resolveExeForHost(host);
    const uproj = resolved?.uproj ?? resolveUprojectFor(host);
    const activeId = String(projectsData?.activeId || '').trim();
    const ip = String(resolved?.ip ?? host?.ip ?? '').trim();
    const syncEnabled = !!host?.syncEnabled;
    const syncRoot = String(host?.syncRoot || '').trim();
    const syncStatus = syncEnabled ? syncStatusMap[ip] : null;
    const syncStatusName = String(syncStatus?.status || '').trim().toLowerCase();
    const syncKnownStatus = syncStatusName === 'in_sync' || syncStatusName === 'desync';
    const syncError = syncEnabled && syncStatus && syncStatus.ok === false;
    const syncMissingRoot = syncEnabled && syncStatusName === 'no_root';
    const syncOk =
      !syncEnabled ||
      (!!syncRoot &&
        syncKnownStatus &&
        !syncError &&
        !syncMissingRoot &&
        (syncStatusName === 'in_sync' || !!allowStartDesynced));
    return !!activeId && !!exe && !!uproj && syncOk;
  }, [allowStartDesynced, projectsData?.activeId, resolveExeForHost, resolveUprojectFor, syncStatusMap]);

  return {
    activeProjectEngineVersion,
    serverHost,
    resolveUprojectFor,
    resolveExeForHost,
    isReadyHost,
  };
}

export { useLaunchControlResolvers };
