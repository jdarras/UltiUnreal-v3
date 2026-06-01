import React from 'react';
import { getHosts, getProjects, getOnlineMap, getCommon, checkSync } from '../../utils/agent';
import {
  sortHosts,
  buildHostsSignature,
  buildProjectsSignature,
} from '../launchcontrolHelpers';
import { startPostprodAsyncLoop } from '../../hooks/postprodAsyncLoop';

function sortVersionsList(list = []) {
  return [...list].sort((a, b) => parseFloat(a) - parseFloat(b));
}

function normalizeUnrealVersions(commonRaw) {
  return Array.isArray(commonRaw?.unrealVersions) && commonRaw.unrealVersions.length
    ? commonRaw.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
}

function normalizeSortedUnrealVersions(commonRaw) {
  return sortVersionsList(normalizeUnrealVersions(commonRaw));
}

function applyCommonVisibilityFlags(
  commonRaw,
  canUseEditorLaunch,
  setShowUeLaunch,
  setAllowStartDesynced
) {
  setShowUeLaunch(canUseEditorLaunch && !!commonRaw?.show_start_new_ue);
  setAllowStartDesynced(!!commonRaw?.allowStartDesynced);
}

function resolveLaunchModeFromCommon(commonRaw, canUseEditorLaunch, preserveUnknownInEditor) {
  const mode = String(commonRaw?.launchMode || '').toLowerCase();
  if (mode === 'integration' && canUseEditorLaunch) return 'integration';
  if (mode === 'production') return 'production';
  if (!canUseEditorLaunch) return 'production';
  return preserveUnknownInEditor ? null : 'production';
}

function applyLaunchModeFromCommon(
  commonRaw,
  canUseEditorLaunch,
  preserveUnknownInEditor,
  setLaunchMode
) {
  const launchMode = resolveLaunchModeFromCommon(
    commonRaw,
    canUseEditorLaunch,
    preserveUnknownInEditor
  );
  if (launchMode) setLaunchMode(launchMode);
}

function areStringListsEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function setUnrealVersionsFromCommon(commonRaw, setUeVersions, { preservePrevious = true } = {}) {
  const next = normalizeSortedUnrealVersions(commonRaw);
  if (!preservePrevious) {
    setUeVersions(next);
    return;
  }
  setUeVersions((prev) => (areStringListsEqual(prev, next) ? prev : next));
}

function readPositiveNumber(value) {
  const num = Number(value || 0);
  return num > 0 ? num : 0;
}

function applyInitialRefreshSec(commonRaw, setRefreshSec) {
  const refreshSeconds = readPositiveNumber(commonRaw?.refreshSec);
  if (refreshSeconds) setRefreshSec(refreshSeconds);
}

function applyPolledRefreshSec(commonRaw, refreshSecRef, setRefreshSec) {
  const refreshSeconds = readPositiveNumber(commonRaw?.refreshSec);
  if (refreshSeconds && refreshSeconds !== refreshSecRef.current) {
    setRefreshSec(refreshSeconds);
  }
}

function applyInitialRcHttpPort(commonRaw, setRcHttpPort) {
  const rcPort = readPositiveNumber(commonRaw?.rcHttpPort);
  if (rcPort) setRcHttpPort(rcPort);
}

function applyPolledRcHttpPort(commonRaw, rcHttpPortRef, setRcHttpPort) {
  const portCfg = readPositiveNumber(commonRaw?.rcHttpPort);
  if (portCfg && portCfg !== rcHttpPortRef.current) {
    setRcHttpPort(portCfg);
  }
}

function applyInitialUseStartLayout(commonRaw, setUseStartLayout) {
  if (typeof commonRaw?.useStartLayout === 'boolean') {
    setUseStartLayout(!!commonRaw.useStartLayout);
  }
}

function applyPolledUseStartLayout(commonRaw, useStartLayoutRef, setUseStartLayout) {
  if (
    typeof commonRaw?.useStartLayout === 'boolean' &&
    commonRaw.useStartLayout !== useStartLayoutRef.current
  ) {
    setUseStartLayout(!!commonRaw.useStartLayout);
  }
}

function readPollingIntervalMs(refreshSecRef) {
  return Math.max(2, Number(refreshSecRef.current || 5)) * 1000;
}

function applyInitialCommonConfig({
  commonRaw,
  canUseEditorLaunch,
  setRefreshSec,
  setShowUeLaunch,
  setAllowStartDesynced,
  setUeVersions,
  setLaunchMode,
  setUseStartLayout,
  setRcHttpPort,
}) {
  applyInitialRefreshSec(commonRaw, setRefreshSec);
  applyCommonVisibilityFlags(commonRaw, canUseEditorLaunch, setShowUeLaunch, setAllowStartDesynced);
  setUnrealVersionsFromCommon(commonRaw, setUeVersions, { preservePrevious: false });
  applyLaunchModeFromCommon(commonRaw, canUseEditorLaunch, false, setLaunchMode);
  applyInitialUseStartLayout(commonRaw, setUseStartLayout);
  applyInitialRcHttpPort(commonRaw, setRcHttpPort);
}

function applyPolledCommonConfig({
  commonRaw,
  commonCfgRef,
  canUseEditorLaunch,
  setShowUeLaunch,
  setAllowStartDesynced,
  setUeVersions,
  refreshSecRef,
  setRefreshSec,
  rcHttpPortRef,
  setRcHttpPort,
  setLaunchMode,
  useStartLayoutRef,
  setUseStartLayout,
}) {
  commonCfgRef.current = commonRaw;
  applyCommonVisibilityFlags(commonRaw, canUseEditorLaunch, setShowUeLaunch, setAllowStartDesynced);
  setUnrealVersionsFromCommon(commonRaw, setUeVersions);
  applyPolledRefreshSec(commonRaw, refreshSecRef, setRefreshSec);
  applyPolledRcHttpPort(commonRaw, rcHttpPortRef, setRcHttpPort);
  applyLaunchModeFromCommon(commonRaw, canUseEditorLaunch, true, setLaunchMode);
  applyPolledUseStartLayout(commonRaw, useStartLayoutRef, setUseStartLayout);
}

function normalizeLaunchProjectsData(projectsRaw) {
  const activeByHost =
    projectsRaw?.activeByHost && typeof projectsRaw.activeByHost === 'object'
      ? projectsRaw.activeByHost
      : {};

  return {
    activeName: String(projectsRaw?.activeName || ''),
    activeId: String(projectsRaw?.activeId || ''),
    projects: Array.isArray(projectsRaw?.projects) ? projectsRaw.projects : [],
    activeByHost,
  };
}

function canRunHostSyncCheck(host) {
  return (
    host &&
    host.renderAvailability !== 'excluded' &&
    host.eligible !== false &&
    host.syncEnabled &&
    String(host.syncRoot || '').trim()
  );
}

function canBeQuickRefreshTarget(host, localIp) {
  if (!host || host.renderAvailability === 'excluded' || host.eligible === false) return false;
  const ip = String(host.ip || '').trim();
  if (!ip || ip === localIp) return false;
  if (host.syncEnabled) return false;
  return true;
}

function mergeSyncStatusResults(previousMap, results) {
  const next = { ...(previousMap || {}) };
  (Array.isArray(results) ? results : []).forEach((entry) => {
    if (!entry?.ip) return;
    next[entry.ip] = entry.res || {};
  });
  return next;
}

function hostHasProjectAssociation(host, activeByHost, activeId) {
  const ip = String(host?.ip || '').trim();
  if (!ip) return false;
  const perHost = activeByHost?.[ip] || {};
  const assoc = typeof perHost[activeId] === 'string' ? perHost[activeId].trim() : '';
  const uproject = typeof host?.uproject === 'string' ? host.uproject.trim() : '';
  return !!assoc || !!uproject;
}

function needsQuickRefreshForHost(host, localIp, activeByHost, activeId) {
  if (!canBeQuickRefreshTarget(host, localIp)) return false;
  return !hostHasProjectAssociation(host, activeByHost, activeId);
}

function resolveActiveProjectFromData(projectsData) {
  const list = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
  const activePid = String(projectsData?.activeId || '').trim();
  const activeName = String(projectsData?.activeName || '').trim();

  return (
    list.find((project) => String(project?.id || '').trim() === activePid) ||
    list.find(
      (project) =>
        activeName &&
        String(project?.name || '').trim().toLowerCase() === activeName.toLowerCase()
    ) ||
    null
  );
}

function resolveWrcPresetName(activeProject) {
  const activeWrcNames = Array.isArray(activeProject?.wrcNames)
    ? activeProject.wrcNames
    : (activeProject?.wrcName ? [activeProject.wrcName] : []);
  return String(activeWrcNames[0] || '').trim() || 'RemoteControlPreset';
}

function markHostAndLoopbackRunning(prevMap, fallbackMap, ip) {
  const next = { ...(prevMap || fallbackMap || {}) };
  const mark = (key) => {
    const entry = next[key] || {};
    next[key] = { ...entry, online: true, unrealRunning: true };
  };
  mark(ip);
  mark('127.0.0.1');
  return next;
}

async function probeWrcPreset({
  ip,
  port,
  presetName,
  map,
  wrcReadyRef,
  setStatusMsg,
  setOnlineMap,
  t,
}) {
  const ctrl = new AbortController();
  const abortTimer = setTimeout(() => ctrl.abort(), 1200);

  try {
    const url = `http://${ip}:${port}/remote/preset/${encodeURIComponent(presetName)}`;
    const resp = await fetch(url, { signal: ctrl.signal });

    if (resp.ok) {
      if (!wrcReadyRef.current) {
        wrcReadyRef.current = true;
        setStatusMsg(
          t('launch.status.wrcConnected', { ip, port, preset: presetName }) ||
            `WRC connecté (${ip}:${port}/${presetName})`
        );
      }
      setOnlineMap((prev) => markHostAndLoopbackRunning(prev, map, ip));
    }
  } catch {
    wrcReadyRef.current = false;
  } finally {
    clearTimeout(abortTimer);
  }
}

function useLaunchControlPollingFlow({
  canUseEditorLaunch,
  sortLocale,
  localIp,
  t,
  showErrorMessage,
  refreshHasStartLayout,
  setLoading,
  setHosts,
  setProjectsData,
  setRefreshSec,
  setShowUeLaunch,
  setAllowStartDesynced,
  setUeVersions,
  setLaunchMode,
  setUseStartLayout,
  setRcHttpPort,
  setOnlineMap,
  setSyncStatusMap,
  setStatusMsg,
  commonCfgRef,
  projectsDataRef,
  rcHttpPortRef,
  refreshSecRef,
  useStartLayoutRef,
  wrcReadyRef,
}) {
  const hostsSigRef = React.useRef('');
  const projSigRef = React.useRef('');
  const quickRefreshTimerRef = React.useRef(null);
  const quickRefreshPendingRef = React.useRef(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      showErrorMessage('');
      try {
        const [hostsRaw, projectsRaw, commonRaw] = await Promise.all([
          getHosts(),
          getProjects({ light: true }),
          getCommon(),
        ]);
        hostsSigRef.current = buildHostsSignature(hostsRaw);
        projSigRef.current = buildProjectsSignature(projectsRaw);
        setHosts(sortHosts(hostsRaw, sortLocale));
        setProjectsData(normalizeLaunchProjectsData(projectsRaw));
        applyInitialCommonConfig({
          commonRaw,
          canUseEditorLaunch,
          setRefreshSec,
          setShowUeLaunch,
          setAllowStartDesynced,
          setUeVersions,
          setLaunchMode,
          setUseStartLayout,
          setRcHttpPort,
        });
      } catch (error) {
        showErrorMessage(error?.message || String(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [
    canUseEditorLaunch,
    setAllowStartDesynced,
    setHosts,
    setLaunchMode,
    setLoading,
    setProjectsData,
    setRcHttpPort,
    setRefreshSec,
    setShowUeLaunch,
    setUeVersions,
    setUseStartLayout,
    showErrorMessage,
    sortLocale,
  ]);

  React.useEffect(() => {
    let stopped = false;

    async function tick() {
      if (stopped) return null;
      const tickStartedAt = Date.now();
      try {
        const [map, hostsRaw, projectsRaw, commonRaw] = await Promise.all([
          getOnlineMap().catch(() => ({})),
          getHosts().catch(() => []),
          getProjects({ light: true }).catch(() => null),
          getCommon().catch(() => null),
        ]);
        const normalizedProjectsData =
          projectsRaw && typeof projectsRaw === 'object'
            ? normalizeLaunchProjectsData(projectsRaw)
            : null;

        setOnlineMap(map || {});

        if (Array.isArray(hostsRaw)) {
          const sig = buildHostsSignature(hostsRaw);
          if (sig !== hostsSigRef.current) {
            const sorted = sortHosts(hostsRaw, sortLocale);
            hostsSigRef.current = sig;
            setHosts(sorted);
          }
        }

        if (Array.isArray(hostsRaw)) {
          const syncTargets = hostsRaw.filter(canRunHostSyncCheck);
          if (syncTargets.length) {
            const results = await Promise.all(
              syncTargets.map(async (host) => {
                const ip = String(host?.ip || '').trim();
                if (!ip) return null;
                try {
                  const res = await checkSync(ip, 2500);
                  return { ip, res };
                } catch (error) {
                  return { ip, res: { ok: false, error: error?.message || String(error) } };
                }
              })
            );
            setSyncStatusMap((prev) => mergeSyncStatusResults(prev, results));
          }
        }

        if (normalizedProjectsData) {
          const sigP = buildProjectsSignature(projectsRaw);
          if (sigP !== projSigRef.current) {
            projSigRef.current = sigP;
            setProjectsData(normalizedProjectsData);
            const pid = String(
              normalizedProjectsData.activeId || normalizedProjectsData.activeName || ''
            ).trim();
            refreshHasStartLayout(pid);
          }
        }

        const activeId = String(normalizedProjectsData?.activeId || '').trim();
        const activeByHost = normalizedProjectsData?.activeByHost || {};
        const needsQuickRefresh =
          Array.isArray(hostsRaw) &&
          activeId &&
          hostsRaw.some((host) => needsQuickRefreshForHost(host, localIp, activeByHost, activeId));
        if (needsQuickRefresh && !quickRefreshPendingRef.current) {
          quickRefreshPendingRef.current = true;
          if (quickRefreshTimerRef.current) clearTimeout(quickRefreshTimerRef.current);
          quickRefreshTimerRef.current = setTimeout(() => {
            if (stopped) return;
            quickRefreshPendingRef.current = false;
            tick();
          }, 800);
        }

        if (commonRaw && typeof commonRaw === 'object') {
          applyPolledCommonConfig({
            commonRaw,
            commonCfgRef,
            canUseEditorLaunch,
            setShowUeLaunch,
            setAllowStartDesynced,
            setUeVersions,
            refreshSecRef,
            setRefreshSec,
            rcHttpPortRef,
            setRcHttpPort,
            setLaunchMode,
            useStartLayoutRef,
            setUseStartLayout,
          });
        }

        const localHost = (Array.isArray(hostsRaw) ? hostsRaw : []).find(
          (host) => host && localIp && host.ip === localIp
        );
        const ip = localHost?.ip || localIp || '127.0.0.1';
        const port = Number(rcHttpPortRef.current || 30010);

        const activeProject = resolveActiveProjectFromData(projectsDataRef.current);
        const presetName = resolveWrcPresetName(activeProject);
        const entry = (map || {})[ip] || {};
        const alreadyRunning = !!entry.unrealRunning;

        if (!alreadyRunning && ip) {
          await probeWrcPreset({
            ip,
            port,
            presetName,
            map,
            wrcReadyRef,
            setStatusMsg,
            setOnlineMap,
            t,
          });
        }
      } catch {
        // Keep current UI state on network errors.
      } finally {
        if (stopped) return null;
        const everyMs = readPollingIntervalMs(refreshSecRef);
        const elapsed = Date.now() - tickStartedAt;
        return Math.max(150, everyMs - elapsed);
      }
    }

    const stopLoop = startPostprodAsyncLoop({
      intervalMs: readPollingIntervalMs(refreshSecRef),
      tick,
    });

    return () => {
      stopped = true;
      stopLoop();
      if (quickRefreshTimerRef.current) {
        clearTimeout(quickRefreshTimerRef.current);
        quickRefreshTimerRef.current = null;
      }
      quickRefreshPendingRef.current = false;
    };
  }, [
    canUseEditorLaunch,
    commonCfgRef,
    localIp,
    projectsDataRef,
    rcHttpPortRef,
    refreshHasStartLayout,
    refreshSecRef,
    setAllowStartDesynced,
    setHosts,
    setLaunchMode,
    setOnlineMap,
    setProjectsData,
    setRcHttpPort,
    setRefreshSec,
    setShowUeLaunch,
    setStatusMsg,
    setSyncStatusMap,
    setUeVersions,
    setUseStartLayout,
    sortLocale,
    t,
    useStartLayoutRef,
    wrcReadyRef,
  ]);
}

export { useLaunchControlPollingFlow };
