import { useEffect } from "react";
import {
  APP_MODE_POSTPROD,
  POSTPROD_TAB_USERS,
  POSTPROD_TAB_PROFILES,
  POSTPROD_TAB_RENDERS_CREATE,
} from "../utils/appConstants";

function usePostprodTabTriggers({
  postprodAuthenticated, appMode, current,
  postprodCanManageUsers, postprodCanManageRoles,
  postprodCanManageRenderTemplates, postprodCanAccessResources,
  loadPostprodUsers, loadPostprodMyActivity, loadPostprodRoles,
  loadPostprodTasks, loadPostprodTaskCatalog, loadPostprodProjects,
  loadPostprodResources, loadPostprodRenderTemplates, loadPostprodRenderWorkers,
  loadPostprodRenderForms, loadPostprodRenders, loadPostprodRenderProjectCatalog,
  loadPostprodAudit, loadPostprodUserAlerts,
  setPostprodMyActivity, setPostprodRenderHealthAuditMaintenance,
}) {
  useEffect(() => {
    if (!postprodAuthenticated || !postprodCanManageUsers) return;
    if (current !== POSTPROD_TAB_USERS && current !== POSTPROD_TAB_PROFILES && current !== POSTPROD_TAB_RENDERS_CREATE) return;
    loadPostprodUsers();
  }, [
    postprodAuthenticated,
    postprodCanManageUsers,
    current,
    loadPostprodUsers,
  ]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    if (current !== POSTPROD_TAB_USERS) return;
    if (postprodCanManageUsers) {
      setPostprodMyActivity({
        activities: [],
        summary: { total: 0, actions: {}, projects: [] },
        loading: false,
        error: '',
      });
      return;
    }
    loadPostprodMyActivity();
  }, [
    postprodAuthenticated,
    postprodCanManageUsers,
    current,
    loadPostprodMyActivity,
  ]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    if (!postprodCanManageUsers && !postprodCanManageRoles) return;
    if (current !== POSTPROD_TAB_USERS && current !== POSTPROD_TAB_PROFILES) return;
    loadPostprodRoles();
  }, [
    postprodAuthenticated,
    postprodCanManageUsers,
    postprodCanManageRoles,
    current,
    loadPostprodRoles,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== POSTPROD_TAB_RENDERS_CREATE && current !== 'Rendus') return;
    loadPostprodTasks();
  }, [
    appMode,
    postprodAuthenticated,
    current,
    loadPostprodTasks,
  ]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    if (current !== POSTPROD_TAB_RENDERS_CREATE) return;
    loadPostprodTaskCatalog();
  }, [
    postprodAuthenticated,
    current,
    loadPostprodTaskCatalog,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    const needsProjectsForTab =
      current === 'Projets' ||
      (current === 'Datas' && postprodCanManageRenderTemplates) ||
      current === POSTPROD_TAB_USERS;
    if (!needsProjectsForTab) return;
    loadPostprodProjects();
  }, [
    appMode,
    postprodAuthenticated,
    postprodCanManageRenderTemplates,
    current,
    loadPostprodProjects,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== 'Ressources') return;
    if (!postprodCanAccessResources) return;
    loadPostprodResources();
  }, [
    appMode,
    postprodAuthenticated,
    current,
    postprodCanAccessResources,
    loadPostprodResources,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== POSTPROD_TAB_RENDERS_CREATE && current !== 'Rendus') return;
    loadPostprodRenderTemplates();
    loadPostprodRenderWorkers();
    if (current === POSTPROD_TAB_RENDERS_CREATE) {
      loadPostprodRenderForms();
      loadPostprodRenders();
    }
    if (current === 'Rendus') {
      loadPostprodRenderProjectCatalog();
      loadPostprodRenderForms();
      loadPostprodRenders();
    }
  }, [
    appMode,
    postprodAuthenticated,
    current,
    loadPostprodRenderProjectCatalog,
    loadPostprodRenders,
    loadPostprodRenderForms,
    loadPostprodRenderTemplates,
    loadPostprodRenderWorkers,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== 'Datas') return;
    if (!postprodCanManageRenderTemplates) return;
    loadPostprodRenderForms();
  }, [
    appMode,
    postprodAuthenticated,
    postprodCanManageRenderTemplates,
    current,
    loadPostprodRenderForms,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    if (current !== 'Logs') return;
    loadPostprodAudit();
    setPostprodRenderHealthAuditMaintenance({
      data: null,
      loading: false,
      error: '',
      purging: false,
      purgeError: '',
      lastPurge: null,
    });
  }, [
    appMode,
    postprodAuthenticated,
    current,
    loadPostprodAudit,
  ]);

  useEffect(() => {
    if (appMode !== APP_MODE_POSTPROD || !postprodAuthenticated) return;
    loadPostprodUserAlerts();
  }, [
    appMode,
    postprodAuthenticated,
    loadPostprodUserAlerts,
  ]);
}

export { usePostprodTabTriggers };
