import { useCallback, useEffect, useState } from 'react';
import { getHosts, getOnlineMap, postCommon, postLaunch, postStop } from '../../utils/agent';

function getProjectByKey(projects, projectKey) {
  const ref = String(projectKey || '').trim();
  if (!ref) return null;
  return projects.find((p) => {
    if (!p) return false;
    if (String(p.id || '').trim() === ref) return true;
    if (String(p.name || '').trim().toLowerCase() === ref.toLowerCase()) return true;
    return false;
  }) || null;
}

function getActiveProject(projects, activeId) {
  const refId = String(activeId || '').trim();
  return projects.find((p) => {
    if (!p) return false;
    if (refId && String(p.id || '').trim() === refId) return true;
    return false;
  }) || null;
}

function resolveExeForHost(host, projects, activeId, projectKey) {
  const selectedProject = getProjectByKey(projects, projectKey);
  const launchProject = selectedProject || getActiveProject(projects, activeId);
  const requiredVersion = String(launchProject?.engineVersion || '').trim();
  if (!requiredVersion) return '';
  const editors =
    (host && host.unrealEditors && typeof host.unrealEditors === 'object'
      ? host.unrealEditors
      : {}) || {};
  return editors[requiredVersion] || '';
}

function resolveUprojectForHost(host, projects, activeId, activeName, projectKey) {
  const selectedProject = getProjectByKey(projects, projectKey);
  const activeProj = selectedProject || getActiveProject(projects, activeId);
  if (!host) return '';
  const ip = String(host.ip || '').trim();
  const syncEnabled = !!host.syncEnabled;
  const syncRoot = String(host.syncRoot || '').trim();

  if (ip && activeProj) {
    return (
      String(activeProj.uproject || activeProj.projectPath || activeProj.path || '').trim() ||
      ''
    );
  }

  if (syncEnabled && syncRoot && activeProj) {
    const src = String(
      activeProj.uproject || activeProj.projectPath || activeProj.path || ''
    ).trim();
    if (src) {
      const norm = src.replace(/\\/g, '/');
      const lastSlash = norm.lastIndexOf('/');
      const file = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
      const sourceDir = lastSlash > 0 ? norm.slice(0, lastSlash) : '';
      const projectName = sourceDir
        ? sourceDir
            .replace(/[/\\]+$/, '')
            .split(/[/\\]/)
            .filter(Boolean)
            .slice(-1)[0] || activeProj.name || activeId || activeName
        : (activeProj.name || activeId || activeName);
      const baseDir = projectName ? `${syncRoot}\\${projectName}` : syncRoot;
      return `${baseDir}\\${file}`;
    }
    return `${syncRoot}\\${activeProj.name || activeId || activeName}\\<missing.uproject>`;
  }

  if (typeof host.uproject === 'string' && host.uproject) {
    return String(host.uproject).trim();
  }

  if (activeProj) {
    return String(
      activeProj.uproject || activeProj.projectPath || activeProj.path || ''
    ).trim();
  }

  return '';
}

function useProjectIntegration({
  t,
  role,
  localIp,
  projects,
  activeName,
  activeId,
  canManageUnrealProjects,
  noticeApi,
}) {
  const [serverHost, setServerHost] = useState(null);
  const [serverRunning, setServerRunning] = useState(false);
  const [integrationBusy, setIntegrationBusy] = useState(false);
  const [integrationMsg, setIntegrationMsg] = useState('');

  const clearIntegrationFeedback = useCallback(() => {
    setIntegrationMsg('');
  }, []);

  useEffect(() => {
    if (role !== 'server') return;
    let alive = true;
    (async () => {
      try {
        const hosts = await getHosts().catch(() => []);
        const hostList = Array.isArray(hosts) ? hosts : [];
        const preferred =
          hostList.find(
            (h) =>
              h &&
              String(h.ip || '').trim().toLowerCase() ===
                String(localIp || '').trim().toLowerCase()
          ) || hostList[0] || null;
        if (!alive) return;
        setServerHost(preferred);

        if (preferred && preferred.ip) {
          const map = await getOnlineMap().catch(() => ({}));
          if (!alive) return;
          const entry = map && map[preferred.ip];
          setServerRunning(!!(entry && entry.unrealRunning));
        } else {
          if (alive) setServerRunning(false);
        }
      } catch {
        if (alive) {
          setServerHost(null);
          setServerRunning(false);
        }
      }
    })();
    return () => { alive = false; };
  }, [role, localIp]);

  const startIntegration = useCallback(async (projectKey = '') => {
    if (!canManageUnrealProjects) return;
    if (!serverHost || !serverHost.ip) return;
    const exe = resolveExeForHost(serverHost, projects, activeId, projectKey);
    const uproject = resolveUprojectForHost(serverHost, projects, activeId, activeName, projectKey);
    const selectedProject = getProjectByKey(projects, projectKey);
    const launchProject = selectedProject || getActiveProject(projects, activeId);
    const requiredVersion = String(launchProject?.engineVersion || '').trim();
    if (!exe || !uproject) {
      setIntegrationMsg(
        !exe
          ? t('launch.status.missingExe')
          : (serverHost.syncEnabled
              ? t('launch.status.missingUprojectSync')
              : t('launch.status.missingUproject'))
      );
      return;
    }
    setIntegrationBusy(true);
    try {
      await postCommon({ launchMode: 'integration' });
      const launchRes = await postLaunch(serverHost.ip, { uproject, engineVersion: requiredVersion });
      if (launchRes?.localFallback?.used) {
        const msg = t('launch.msg.localFallback');
        noticeApi?.showNotice?.(msg, 'warn');
      }
      setServerRunning(true);
      clearIntegrationFeedback();
    } catch (e) {
      setIntegrationMsg(e?.message || String(e));
    } finally {
      setIntegrationBusy(false);
    }
  }, [canManageUnrealProjects, serverHost, projects, activeId, activeName, t, noticeApi, clearIntegrationFeedback]);

  const stopIntegration = useCallback(async (projectKey = '') => {
    if (!canManageUnrealProjects) return;
    if (!serverHost || !serverHost.ip) return;
    setIntegrationBusy(true);
    try {
      const uproject = resolveUprojectForHost(serverHost, projects, activeId, activeName, projectKey);
      const stopRes = await postStop(serverHost.ip, { mode: 'integration', uproject });
      if (stopRes?.localFallback?.used) {
        const msg = t('launch.msg.localFallback');
        noticeApi?.showNotice?.(msg, 'warn');
      }
      await postCommon({ launchMode: 'production' });
      setServerRunning(false);
      clearIntegrationFeedback();
    } catch (e) {
      setIntegrationMsg(e?.message || String(e));
    } finally {
      setIntegrationBusy(false);
    }
  }, [canManageUnrealProjects, serverHost, projects, activeId, activeName, t, noticeApi, clearIntegrationFeedback]);

  const integrationMsgType = integrationMsg ? 'error' : '';

  return {
    serverHost,
    serverRunning,
    integrationBusy,
    integrationMsg,
    integrationMsgType,
    startIntegration,
    stopIntegration,
  };
}

export { useProjectIntegration };
