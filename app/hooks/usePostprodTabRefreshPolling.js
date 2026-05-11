import { useCallback, useEffect } from "react";
import {
  APP_MODE_POSTPROD,
  POSTPROD_TAB_USERS,
  POSTPROD_TAB_PROFILES,
  POSTPROD_TAB_RENDERS_CREATE,
} from "../utils/appConstants";

function usePostprodTabRefreshPolling({
  appMode, postprodAuthenticated, current, postprodRefreshMs,
  postprodCanManageUsers, postprodCanManageRoles,
  postprodCanManageRenderTemplates, postprodCanAccessResources,
  postprodTaskFormOpen, postprodUserEditorOpen,
  postprodAuth,
  loadPostprodUsers, loadPostprodMyActivity, loadPostprodRoles,
  loadPostprodTasks, loadPostprodTaskCatalog, loadPostprodProjects,
  loadPostprodResources, loadPostprodRenderTemplates, loadPostprodRenderWorkers,
  loadPostprodRenderForms, loadPostprodRenders, loadPostprodRenderProjectCatalog,
  loadPostprodAudit, loadPostprodRenderHealth, loadPostprodUserAlerts,
}) {
  const refreshPostprodCurrentTab = useCallback(async () => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current === POSTPROD_TAB_RENDERS_CREATE && postprodTaskFormOpen) return;

    const jobs = [];
    const queue = (fn) => {
      if (typeof fn === 'function') jobs.push(fn);
    };

    queue(loadPostprodRenderHealth);
    queue(() => loadPostprodUserAlerts({ silent: true }));
    if (current !== POSTPROD_TAB_RENDERS_CREATE && current !== 'Rendus') {
      queue(() => loadPostprodTasks({ silent: true }));
      queue(() => loadPostprodRenders({ silent: true }));
    }

    if (current === POSTPROD_TAB_USERS) {
      if (!postprodUserEditorOpen) {
        queue(loadPostprodUsers);
        queue(loadPostprodProjects);
        if (postprodCanManageUsers) {
          queue(loadPostprodRoles);
        } else {
          queue(loadPostprodMyActivity);
        }
      }
    } else if (current === POSTPROD_TAB_PROFILES) {
      if (postprodCanManageUsers || postprodCanManageRoles) {
        queue(loadPostprodRoles);
      }
      if (postprodCanManageRoles) {
        queue(loadPostprodUsers);
      }
    } else if (current === 'Projets') {
      queue(loadPostprodProjects);
    } else if (current === 'Ressources') {
      if (postprodCanAccessResources) {
        queue(loadPostprodResources);
      }
    } else if (current === POSTPROD_TAB_RENDERS_CREATE) {
      if (!postprodTaskFormOpen) {
        queue(() => loadPostprodTasks({ silent: true }));
        queue(() => loadPostprodTaskCatalog({ silent: true }));
        queue(() => loadPostprodRenderTemplates({ silent: true }));
        queue(() => loadPostprodRenderWorkers({ silent: true }));
        queue(() => loadPostprodRenders({ silent: true }));
        queue(loadPostprodRenderForms);
      }
    } else if (current === 'Rendus') {
      queue(() => loadPostprodTasks({ silent: true }));
      queue(() => loadPostprodRenderProjectCatalog({ silent: true }));
      queue(() => loadPostprodRenderTemplates({ silent: true }));
      queue(() => loadPostprodRenderWorkers({ silent: true }));
      queue(() => loadPostprodRenders({ silent: true }));
      queue(loadPostprodRenderForms);
    } else if (current === 'Datas') {
      if (postprodCanManageRenderTemplates) {
        queue(loadPostprodProjects);
        queue(loadPostprodRenderForms);
      }
    } else if (current === 'Logs') {
      queue(loadPostprodAudit);
    }

    await Promise.all(
      jobs.map(async (fn) => {
        try {
          await fn();
        } catch {}
      })
    );

  }, [
    appMode,
    postprodAuthenticated,
    current,
    postprodAuth.token,
    postprodCanManageUsers,
    postprodCanManageRoles,
    postprodCanManageRenderTemplates,
    postprodCanAccessResources,
    loadPostprodUsers,
    loadPostprodProjects,
    loadPostprodRoles,
    loadPostprodMyActivity,
    loadPostprodResources,
    loadPostprodTasks,
    loadPostprodTaskCatalog,
    loadPostprodRenderTemplates,
    loadPostprodRenderWorkers,
    loadPostprodRenderForms,
    postprodTaskFormOpen,
    loadPostprodRenderProjectCatalog,
    loadPostprodRenders,
    loadPostprodAudit,
    loadPostprodRenderHealth,
    loadPostprodUserAlerts,
    postprodUserEditorOpen,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current === 'Datas' || current === 'Logs' || current === 'Rendus' || current === POSTPROD_TAB_RENDERS_CREATE) return;
    if (current === POSTPROD_TAB_USERS && !postprodCanManageUsers) return;

    let stopped = false;
    let timer = null;

    const tick = async () => {
      await refreshPostprodCurrentTab();
      if (!stopped) {
        timer = setTimeout(tick, postprodRefreshMs);
      }
    };

    timer = setTimeout(tick, postprodRefreshMs);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    appMode,
    postprodAuthenticated,
    current,
    postprodRefreshMs,
    postprodCanManageUsers,
    refreshPostprodCurrentTab,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== 'Rendus') return;

    let stopped = false;
    let timer = null;
    const intervalMs = 10000;

    const tick = async () => {
      const isVisible = typeof document === 'undefined'
        ? true
        : document.visibilityState === 'visible';
      if (isVisible) {
        await refreshPostprodCurrentTab();
      }
      if (!stopped) {
        timer = setTimeout(tick, intervalMs);
      }
    };

    timer = setTimeout(tick, intervalMs);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    appMode,
    postprodAuthenticated,
    current,
    refreshPostprodCurrentTab,
  ]);
}

export { usePostprodTabRefreshPolling };
