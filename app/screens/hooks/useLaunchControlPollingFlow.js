import React from 'react';
import { getHosts, getProjects, getOnlineMap, getCommon, checkSync } from '../../utils/agent';
import {
  sortHosts,
  buildHostsSignature,
  buildProjectsSignature,
} from '../launchcontrolHelpers';

function sortVersionsList(list = []) {
  return [...list].sort((a, b) => parseFloat(a) - parseFloat(b));
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
        setProjectsData({
          activeName: String(projectsRaw?.activeName || ''),
          activeId: String(projectsRaw?.activeId || ''),
          projects: Array.isArray(projectsRaw?.projects) ? projectsRaw.projects : [],
          activeByHost:
            projectsRaw?.activeByHost && typeof projectsRaw.activeByHost === 'object'
              ? projectsRaw.activeByHost
              : {},
        });
        const refreshSeconds = Number(commonRaw?.refreshSec || 0);
        if (refreshSeconds && refreshSeconds > 0) setRefreshSec(refreshSeconds);
        setShowUeLaunch(canUseEditorLaunch && !!commonRaw?.show_start_new_ue);
        setAllowStartDesynced(!!commonRaw?.allowStartDesynced);
        const initialVersions =
          Array.isArray(commonRaw?.unrealVersions) && commonRaw.unrealVersions.length
            ? commonRaw.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
            : [];
        setUeVersions(sortVersionsList(initialVersions));

        const mode = String(commonRaw?.launchMode || '').toLowerCase();
        if (mode === 'integration' && canUseEditorLaunch) {
          setLaunchMode('integration');
        } else {
          setLaunchMode('production');
        }

        if (typeof commonRaw?.useStartLayout === 'boolean') {
          setUseStartLayout(!!commonRaw.useStartLayout);
        }

        const rcPort = Number(commonRaw?.rcHttpPort || 0);
        if (rcPort) setRcHttpPort(rcPort);
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
    let timer = null;
    let stopped = false;

    async function tick() {
      const tickStartedAt = Date.now();
      try {
        const [map, hostsRaw, projectsRaw, commonRaw] = await Promise.all([
          getOnlineMap().catch(() => ({})),
          getHosts().catch(() => []),
          getProjects({ light: true }).catch(() => null),
          getCommon().catch(() => null),
        ]);

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
          const syncTargets = hostsRaw.filter(
            (host) =>
              host &&
              host.renderAvailability !== 'excluded' &&
              host.eligible !== false &&
              host.syncEnabled &&
              String(host.syncRoot || '').trim()
          );
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
            setSyncStatusMap((prev) => {
              const next = { ...(prev || {}) };
              for (const entry of results) {
                if (!entry?.ip) continue;
                next[entry.ip] = entry.res || {};
              }
              return next;
            });
          }
        }

        if (projectsRaw && typeof projectsRaw === 'object') {
          const sigP = buildProjectsSignature(projectsRaw);
          if (sigP !== projSigRef.current) {
            projSigRef.current = sigP;
            setProjectsData({
              activeName: String(projectsRaw?.activeName || ''),
              activeId: String(projectsRaw?.activeId || ''),
              projects: Array.isArray(projectsRaw?.projects) ? projectsRaw.projects : [],
              activeByHost:
                projectsRaw?.activeByHost && typeof projectsRaw.activeByHost === 'object'
                  ? projectsRaw.activeByHost
                  : {},
            });
            const pid = String(projectsRaw?.activeId || projectsRaw?.activeName || '').trim();
            refreshHasStartLayout(pid);
          }
        }

        const activeId = String(projectsRaw?.activeId || '').trim();
        const activeByHost =
          projectsRaw?.activeByHost && typeof projectsRaw.activeByHost === 'object'
            ? projectsRaw.activeByHost
            : {};
        const needsQuickRefresh =
          Array.isArray(hostsRaw) &&
          activeId &&
          hostsRaw.some((host) => {
            if (!host || host.renderAvailability === 'excluded' || host.eligible === false) return false;
            const ip = String(host.ip || '').trim();
            if (!ip || ip === localIp) return false;
            if (host.syncEnabled) return false;
            const perHost = activeByHost[ip] || {};
            const assoc = typeof perHost[activeId] === 'string' ? perHost[activeId].trim() : '';
            const uproj = typeof host.uproject === 'string' ? host.uproject.trim() : '';
            return !assoc && !uproj;
          });
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
          commonCfgRef.current = commonRaw;
          setShowUeLaunch(canUseEditorLaunch && !!commonRaw?.show_start_new_ue);
          setAllowStartDesynced(!!commonRaw?.allowStartDesynced);
          const versions =
            Array.isArray(commonRaw?.unrealVersions) && commonRaw.unrealVersions.length
              ? commonRaw.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
              : [];
          setUeVersions((prev) => {
            const next = sortVersionsList(versions);
            const same =
              prev.length === next.length &&
              prev.every((v, i) => v === next[i]);
            return same ? prev : next;
          });

          const refreshSeconds = Number(commonRaw.refreshSec || 0);
          if (refreshSeconds && refreshSeconds > 0 && refreshSeconds !== refreshSecRef.current) {
            setRefreshSec(refreshSeconds);
          }

          const portCfg = Number(commonRaw.rcHttpPort || 0);
          if (portCfg && portCfg !== rcHttpPortRef.current) {
            setRcHttpPort(portCfg);
          }

          const mode = String(commonRaw.launchMode || '').toLowerCase();
          if (mode === 'integration' && canUseEditorLaunch) {
            setLaunchMode('integration');
          } else if (mode === 'production') {
            setLaunchMode('production');
          } else if (!canUseEditorLaunch) {
            setLaunchMode('production');
          }

          if (
            typeof commonRaw.useStartLayout === 'boolean' &&
            commonRaw.useStartLayout !== useStartLayoutRef.current
          ) {
            setUseStartLayout(!!commonRaw.useStartLayout);
          }
        }

        const localHost = (Array.isArray(hostsRaw) ? hostsRaw : []).find(
          (host) => host && localIp && host.ip === localIp
        );
        const ip = localHost?.ip || localIp || '127.0.0.1';
        const port = Number(rcHttpPortRef.current || 30010);

        const list = Array.isArray(projectsDataRef.current?.projects)
          ? projectsDataRef.current.projects
          : [];
        const activePid = String(projectsDataRef.current?.activeId || '').trim();
        const activeName = String(projectsDataRef.current?.activeName || '').trim();
        const activeProject =
          list.find((project) => String(project?.id || '').trim() === activePid) ||
          list.find(
            (project) =>
              activeName &&
              String(project?.name || '').trim().toLowerCase() === activeName.toLowerCase()
          ) ||
          null;

        const activeWrcNames = Array.isArray(activeProject?.wrcNames)
          ? activeProject.wrcNames
          : (activeProject?.wrcName ? [activeProject.wrcName] : []);
        const presetName = String(activeWrcNames[0] || '').trim() || 'RemoteControlPreset';
        const entry = (map || {})[ip] || {};
        const alreadyRunning = !!entry.unrealRunning;

        if (!alreadyRunning && ip) {
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
              setOnlineMap((prev) => {
                const cur = { ...(prev || map || {}) };
                const mark = (key) => {
                  const e = cur[key] || {};
                  cur[key] = { ...e, online: true, unrealRunning: true };
                };
                mark(ip);
                mark('127.0.0.1');
                return cur;
              });
            }
          } catch {
            wrcReadyRef.current = false;
          } finally {
            clearTimeout(abortTimer);
          }
        }
      } catch {
        // Keep current UI state on network errors.
      } finally {
        if (!stopped) {
          const everyMs = Math.max(2, Number(refreshSecRef.current || 5)) * 1000;
          const elapsed = Date.now() - tickStartedAt;
          const waitMs = Math.max(150, everyMs - elapsed);
          timer = setTimeout(tick, waitMs);
        }
      }
    }

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (quickRefreshTimerRef.current) {
        clearTimeout(quickRefreshTimerRef.current);
        quickRefreshTimerRef.current = null;
      }
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
