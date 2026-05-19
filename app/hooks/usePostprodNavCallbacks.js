import { useCallback } from "react";
import {
  getHosts,
  getProjects,
  postCommon,
  postLaunch,
  postprodGetProjectUnrealCatalog,
  postprodGetProjectWrcFields,
} from "../utils/agent";
import {
  APP_MODE_POSTPROD,
  POSTPROD_TAB_USERS,
  POSTPROD_TAB_PROFILES,
  POSTPROD_TAB_RENDERS_CREATE,
} from "../utils/appConstants";

function usePostprodNavCallbacks({
  appMode, postprodCanAccessResources, resourcesTabAvailable,
  hostsCfg, localIp, showNotice, t, postprodAuth,
  setCurrent, setResourcesRefreshKey, setUserTabKey, setRoleTabKey, setDatasTabKey,
  setPostprodRenderEditorRequest, setPostprodRenderFormFocusRequest,
  setPostprodEditUserRequest, setHasLibraryItems,
}) {
  const handleNavClick = useCallback((item, opts = {}) => {
    const force = !!opts.force;
    if (item === "Ressources") {
      const canOpenResources = appMode === APP_MODE_POSTPROD
        ? postprodCanAccessResources
        : resourcesTabAvailable;
      if (!canOpenResources && !force) return;
      setResourcesRefreshKey((prev) => prev + 1);
    }
    if (item === POSTPROD_TAB_USERS) {
      setUserTabKey((prev) => prev + 1);
    }
    if (item === POSTPROD_TAB_PROFILES) {
      setRoleTabKey((prev) => prev + 1);
    }
    if (item === "Datas") {
      setDatasTabKey((prev) => prev + 1);
    }
    setCurrent(item);
  }, [appMode, postprodCanAccessResources, resourcesTabAvailable]);

  const handlePostprodOpenRenderEditor = useCallback((payload = {}) => {
    const typeRaw = String(payload?.type || '').trim().toLowerCase();
    const type = typeRaw === "rendu" ? "render" : typeRaw;
    const ref = String(payload?.ref || '').trim();
    if (!ref) return;
    const action = String(payload?.action || '').trim().toLowerCase();
    const task = payload?.task && typeof payload.task === "object" && !Array.isArray(payload.task)
      ? payload.task
      : null;
    if (
      type !== 'project'
      && type !== 'resource'
      && type !== 'task'
      && type !== 'render'
      && type !== 'project_create'
    ) return;
    setPostprodRenderEditorRequest({
      id: `${type}:${action}:${ref}:${Date.now()}`,
      type,
      ref,
      action,
      task,
    });
    setCurrent(POSTPROD_TAB_RENDERS_CREATE);
  }, []);

  const handlePostprodOpenActivityTarget = useCallback((payload = {}) => {
    const type = String(payload?.type || "").trim().toLowerCase();
    if (!type) return;

    if (type === "project") {
      const projectRef = String(payload?.projectRef || payload?.ref || "").trim();
      if (projectRef) {
        try { localStorage.setItem("uu_pending_detail", projectRef); } catch {}
      }
      setCurrent("Projets");
      return;
    }

    if (type === "form" || type === "formulaire") {
      setCurrent("Datas");
      return;
    }

    if (type === "task" || type === "tache") {
      const taskIdRaw = Number(payload?.taskId || payload?.ref || 0);
      const taskRef = Number.isFinite(taskIdRaw) && taskIdRaw > 0
        ? String(Math.trunc(taskIdRaw))
        : String(payload?.ref || "").trim();
      if (!taskRef) return;
      setPostprodRenderEditorRequest({
        id: `render:${taskRef}:${Date.now()}`,
        type: "render",
        ref: taskRef,
      });
      setCurrent(POSTPROD_TAB_RENDERS_CREATE);
      return;
    }

    if (type === "validation" || type === "render" || type === "rendu") {
      setCurrent("Rendus");
    }
  }, []);

  const normalizePostprodWrcFiles = useCallback((wrcPresets = []) => {
    const list = Array.isArray(wrcPresets) ? wrcPresets : [];
    const out = [];
    const seen = new Set();
    for (const entry of list) {
      const value = String(
        (entry && typeof entry === 'object'
          ? (entry.assetPath || entry.path || entry.name)
          : entry
        ) || ''
      ).trim();
      if (!value) continue;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(value);
    }
    return out;
  }, []);

  const refreshPostprodProjectWrcSnapshots = useCallback(async (projectRef, wrcPresets = []) => {
    const token = String(postprodAuth.token || '').trim();
    const project = String(projectRef || '').trim();
    if (!token || !project) {
      return { attempted: 0, refreshed: 0, usingLastKnown: 0, missingSnapshot: 0, failed: 0 };
    }
    const wrcFiles = normalizePostprodWrcFiles(wrcPresets);
    if (wrcFiles.length <= 0) {
      return { attempted: 0, refreshed: 0, usingLastKnown: 0, missingSnapshot: 0, failed: 0 };
    }
    let refreshed = 0;
    let usingLastKnown = 0;
    let missingSnapshot = 0;
    let failed = 0;
    for (const wrcFile of wrcFiles) {
      try {
        const res = await postprodGetProjectWrcFields(token, project, wrcFile, 10000, { refreshSnapshot: true });
        if (res?.refreshedFromUnreal === true) refreshed += 1;
        if (res?.usingLastKnownPreset === true) usingLastKnown += 1;
      } catch (e) {
        const code = String(e?.code || '').trim().toLowerCase();
        if (code === 'wrc_preset_unreachable_no_snapshot') missingSnapshot += 1;
        else failed += 1;
      }
    }
    return { attempted: wrcFiles.length, refreshed, usingLastKnown, missingSnapshot, failed };
  }, [postprodAuth.token, normalizePostprodWrcFiles]);

  const handlePostprodNavigateToProject = useCallback(async (projectRef, opts = {}) => {
    const ref = String(projectRef || '').trim();
    if (!ref) return;
    if (opts?.start) {
      try {
        const hostList = Array.isArray(hostsCfg) && hostsCfg.length > 0
          ? hostsCfg
          : (await getHosts().catch(() => []));
        const preferredHost = (
          Array.isArray(hostList)
            ? hostList.find(
                (host) =>
                  host
                  && String(host.ip || '').trim().toLowerCase() === String(localIp || '').trim().toLowerCase()
              ) || hostList[0]
            : null
        );
        const hostIp = String(preferredHost?.ip || '').trim();
        if (!hostIp) {
          showNotice(t('launch.status.agentOffline'), 'warn');
          return;
        }

        const projectsPayload = await getProjects({ timeoutMs: 30000 }).catch(() => ({}));
        const projectsList = Array.isArray(projectsPayload?.projects) ? projectsPayload.projects : [];
        const refLower = ref.toLowerCase();
        const selectedProject = projectsList.find((project) => {
          const id = String(project?.id || '').trim().toLowerCase();
          const name = String(project?.name || '').trim().toLowerCase();
          const code = String(project?.code || '').trim().toLowerCase();
          return refLower === id || refLower === name || refLower === code;
        }) || null;
        const uproject = String(
          selectedProject?.uproject
          || selectedProject?.projectPath
          || selectedProject?.path
          || selectedProject?.uprojectPath
          || ''
        ).trim();
        const requiredVersion = String(selectedProject?.engineVersion || '').trim();
        if (!uproject) {
          showNotice(t('launch.status.missingUproject'), 'warn');
          return;
        }

        await postCommon({ launchMode: 'integration' });
        const launchRes = await postLaunch(hostIp, { uproject, engineVersion: requiredVersion });
        if (launchRes?.localFallback?.used) {
          showNotice(t('launch.msg.localFallback'), 'warn');
        }
        const postprodToken = String(postprodAuth.token || '').trim();
        const projectRefForRefresh = String(
          selectedProject?.id
          || selectedProject?.name
          || ref
        ).trim();
        if (postprodToken && projectRefForRefresh) {
          let wrcPresetsFromProject = Array.isArray(selectedProject?.wrcNames)
            ? selectedProject.wrcNames
            : [];
          try {
            const catalogRes = await postprodGetProjectUnrealCatalog(postprodToken, projectRefForRefresh);
            const catalogObj = catalogRes?.catalog && typeof catalogRes.catalog === 'object'
              ? catalogRes.catalog
              : {};
            const catalogWrc = Array.isArray(catalogObj?.wrcPresets) ? catalogObj.wrcPresets : [];
            if (catalogWrc.length > 0) wrcPresetsFromProject = catalogWrc;
          } catch {}
          void refreshPostprodProjectWrcSnapshots(projectRefForRefresh, wrcPresetsFromProject);
        }
        return;
      } catch (e) {
        showNotice(String(e?.message || e || t('postprod.projects.error')), 'error');
        return;
      }
    }
    try { localStorage.setItem('uu_pending_detail', ref); } catch {}
    setCurrent('Projets');
  }, [hostsCfg, localIp, showNotice, t, postprodAuth.token, refreshPostprodProjectWrcSnapshots]);

  const handlePostprodRenderEditorHandled = useCallback(() => {
    setPostprodRenderEditorRequest(null);
  }, []);

  const handlePostprodRenderFormFocusHandled = useCallback(() => {
    setPostprodRenderFormFocusRequest(null);
  }, []);

  const handlePostprodNavigateToRenderForm = useCallback((form) => {
    const formId = Number(form?.id || 0);
    if (formId <= 0) return;
    setPostprodRenderFormFocusRequest({ ref: String(formId) });
    setCurrent("Datas");
  }, []);

  const handlePostprodEditUserHandled = useCallback((reqKey) => {
    setPostprodEditUserRequest(prev => prev?.reqKey === reqKey ? null : prev);
  }, []);

  const handlePostprodOpenUser = useCallback((entry) => {
    const userId = Number(entry?.id || 0);
    if (!userId) return;
    handleNavClick(POSTPROD_TAB_USERS);
    setPostprodEditUserRequest({ userId, reqKey: Date.now() });
  }, [handleNavClick]);

  const handleLibraryImported = useCallback(() => {
    setHasLibraryItems(true);
    setResourcesRefreshKey((prev) => prev + 1);
  }, []);

  return {
    handleNavClick,
    handlePostprodOpenRenderEditor,
    handlePostprodOpenActivityTarget,
    refreshPostprodProjectWrcSnapshots,
    handlePostprodNavigateToProject,
    handlePostprodRenderEditorHandled,
    handlePostprodRenderFormFocusHandled,
    handlePostprodNavigateToRenderForm,
    handlePostprodEditUserHandled,
    handlePostprodOpenUser,
    handleLibraryImported,
  };
}

export { usePostprodNavCallbacks };
