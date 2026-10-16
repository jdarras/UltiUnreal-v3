import { useCallback, useRef } from "react";
import {
  postprodListTasks,
  postprodListProjects,
  postprodListResources,
  postprodReindexResources,
  postprodGetResource,
  postprodListProjectRenderTemplates,
  postprodListRenderTransitions,
  postprodGetProjectUnrealCatalog,
  postprodGetProjectWrcFields,
  postprodListProjectDataTables,
  postprodSyncProject,
  postprodUpsertDataTableRow,
  postprodUpdateDataTable,
} from "../utils/agent";
import {
  resolvePostprodTasksError,
  resolvePostprodRendersError,
  resolvePostprodResourcesError,
  resolvePostprodProjectsError,
  resolvePostprodDataError,
} from "../utils/postprodErrorHelpers";
import {
  mapTaskProjectOptions,
  mapTaskResourceOptions,
} from "../utils/postprodCatalogHelpers";
import { createLatestRequestTracker } from "../utils/latestRequestTracker";

function usePostprodContentApi({
  postprodAuth,
  t,
  showNotice,
  postprodWrcCacheNoticeRef,
  refreshPostprodProjectWrcSnapshots,
  setPostprodTasks,
  setPostprodProjects,
  setPostprodResources,
  setPostprodTaskCatalog,
  setPostprodRenderProjectCatalog,
}) {
  // Les listes sont rafraîchies en arrière-plan : une réponse plus ancienne ou
  // arrivée après un changement de session ne doit pas écraser l'état.
  const requestTrackerRef = useRef(null);
  if (!requestTrackerRef.current) requestTrackerRef.current = createLatestRequestTracker();
  requestTrackerRef.current.setSession(String(postprodAuth.token || '').trim());
  const loadPostprodTasks = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    // Ancien callback appelé après un changement de session : ne rien toucher.
    if (token && !requestTrackerRef.current.isSessionCurrent(token)) return;
    const isCurrentRequest = requestTrackerRef.current.begin('tasks', token);
    if (!token) {
      setPostprodTasks({ items: [], loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodTasks((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodTasks((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const res = await postprodListTasks(token);
      if (!isCurrentRequest()) return;
      const items = Array.isArray(res?.tasks) ? res.tasks : [];
      setPostprodTasks({ items, loading: false, error: '' });
    } catch (e) {
      if (!isCurrentRequest()) return;
      setPostprodTasks((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodTasksError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodProjects = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    // Ancien callback appelé après un changement de session : ne rien toucher.
    if (token && !requestTrackerRef.current.isSessionCurrent(token)) return;
    const isCurrentRequest = requestTrackerRef.current.begin('projects', token);
    if (!token) {
      setPostprodProjects({ items: [], loading: false, error: '' });
      return;
    }
    setPostprodProjects((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListProjects(token);
      if (!isCurrentRequest()) return;
      const items = Array.isArray(res?.projects) ? res.projects : [];
      setPostprodProjects({ items, loading: false, error: '' });
    } catch (e) {
      if (!isCurrentRequest()) return;
      setPostprodProjects((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodProjectsError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodResources = useCallback(async (options = {}) => {
    const token = String(postprodAuth.token || '').trim();
    // Ancien callback appelé après un changement de session : ne rien toucher.
    if (token && !requestTrackerRef.current.isSessionCurrent(token)) return;
    const isCurrentRequest = requestTrackerRef.current.begin('resources', token);
    const forceSync = options?.forceSync === true;
    if (!token) {
      setPostprodResources({ items: [], loading: false, error: '', source: '', sync: null });
      return;
    }
    setPostprodResources((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodListResources(token, 8000, { refresh: forceSync });
      if (!isCurrentRequest()) return;
      const items = Array.isArray(res?.items) ? res.items : [];
      const source = String(res?.source || '').trim();
      const sync = res?.sync && typeof res.sync === 'object' ? res.sync : null;
      setPostprodResources({ items, loading: false, error: '', source, sync });
    } catch (e) {
      if (!isCurrentRequest()) return;
      setPostprodResources((prev) => ({
        ...prev,
        loading: false,
        error: resolvePostprodResourcesError(e, t),
      }));
    }
  }, [postprodAuth.token, t]);

  const loadPostprodTaskCatalog = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    // Ancien callback appelé après un changement de session : ne rien toucher.
    if (token && !requestTrackerRef.current.isSessionCurrent(token)) return;
    const isCurrentRequest = requestTrackerRef.current.begin('taskCatalog', token);
    if (!token) {
      setPostprodTaskCatalog({ projects: [], resources: [], loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodTaskCatalog((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodTaskCatalog((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const [projectsRes, resourcesRes] = await Promise.all([
        postprodListProjects(token).catch(() => ({})),
        postprodListResources(token, 8000).catch(() => ({})),
      ]);
      if (!isCurrentRequest()) return;
      const projects = mapTaskProjectOptions(projectsRes);
      const resources = mapTaskResourceOptions(resourcesRes);
      setPostprodTaskCatalog({
        projects,
        resources,
        loading: false,
        error: '',
      });
    } catch {
      if (!isCurrentRequest()) return;
      setPostprodTaskCatalog((prev) => ({
        ...prev,
        loading: false,
        error: t('postprod.tasks.catalog.error'),
      }));
    }
  }, [postprodAuth.token, t]);

  const handlePostprodLoadResourceDetail = useCallback(async (resourceRef) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    const id = String(resourceRef || '').trim();
    if (!id) return null;
    const res = await postprodGetResource(token, id);
    const item = res?.item && typeof res.item === 'object' ? res.item : null;
    if (!item) {
      throw Object.assign(new Error('resource_not_found'), {
        code: 'resource_not_found',
        status: 404,
      });
    }
    return item;
  }, [postprodAuth.token]);

  const handlePostprodReindexResources = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return false;
    setPostprodResources((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await postprodReindexResources(token);
      await Promise.all([
        loadPostprodResources({ forceSync: true }),
        loadPostprodTaskCatalog(),
      ]);
      const processed = Number(res?.processed || 0);
      const inserted = Number(res?.inserted || 0);
      const updated = Number(res?.updated || 0);
      showNotice(
        t('postprod.resources.msg.reindexed', {
          processed: Number.isFinite(processed) ? processed : 0,
          inserted: Number.isFinite(inserted) ? inserted : 0,
          updated: Number.isFinite(updated) ? updated : 0,
        }),
        'ok'
      );
      return true;
    } catch (e) {
      const msg = resolvePostprodResourcesError(e, t);
      setPostprodResources((prev) => ({
        ...prev,
        loading: false,
        error: msg,
      }));
      return false;
    }
  }, [postprodAuth.token, loadPostprodResources, loadPostprodTaskCatalog, showNotice, t]);

  const handlePostprodLoadProjectRenderTemplates = useCallback(async (projectRef) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    try {
      const res = await postprodListProjectRenderTemplates(token, projectRef);
      return Array.isArray(res?.templates) ? res.templates : [];
    } catch (e) {
      const err = new Error(resolvePostprodProjectsError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t]);

  const handlePostprodLoadRenderTransitions = useCallback(async (renderId) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    try {
      const res = await postprodListRenderTransitions(token, renderId);
      return Array.isArray(res?.transitions) ? res.transitions : [];
    } catch (e) {
      const err = new Error(resolvePostprodRendersError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t]);

  const handlePostprodLoadProjectUnrealCatalog = useCallback(async (projectRef) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) {
      return { levels: [], sequences: [], presets: [], wrcPresets: [], stats: null };
    }
    try {
      const res = await postprodGetProjectUnrealCatalog(token, projectRef);
      const catalog = res?.catalog && typeof res.catalog === 'object' ? res.catalog : {};
      const normalizedCatalog = {
        levels: Array.isArray(catalog.levels) ? catalog.levels : [],
        sequences: Array.isArray(catalog.sequences) ? catalog.sequences : [],
        presets: Array.isArray(catalog.presets) ? catalog.presets : [],
        wrcPresets: Array.isArray(catalog.wrcPresets) ? catalog.wrcPresets : [],
        stats: catalog?.stats && typeof catalog.stats === 'object' ? catalog.stats : null,
      };
      void (async () => {
        const summary = await refreshPostprodProjectWrcSnapshots(projectRef, normalizedCatalog.wrcPresets);
        const projectKey = String(projectRef || '').trim().toLowerCase();
        if (summary?.usingLastKnown > 0) {
          return;
        }
        if (summary?.missingSnapshot > 0) {
          const noticeKey = `catalog::nosnapshot::${projectKey}`;
          const nowTs = Date.now();
          const previousTs = Number(postprodWrcCacheNoticeRef.current?.[noticeKey] || 0);
          if (!Number.isFinite(previousTs) || (nowTs - previousTs) > 10000) {
            postprodWrcCacheNoticeRef.current = {
              ...(postprodWrcCacheNoticeRef.current || {}),
              [noticeKey]: nowTs,
            };
            showNotice(t('production.error.wrcUnreachableNoSnapshot'), 'warn');
          }
        }
      })();
      return normalizedCatalog;
    } catch (e) {
      const err = new Error(resolvePostprodProjectsError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t, refreshPostprodProjectWrcSnapshots, showNotice]);

  const handlePostprodLoadProjectWrcFields = useCallback(async (projectRef, wrcFile = '', options = null) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    const opts = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
    try {
      const res = await postprodGetProjectWrcFields(token, projectRef, wrcFile, 10000, opts);
      return Array.isArray(res?.fields) ? res.fields : [];
    } catch (e) {
      const code = String(e?.code || '').trim().toLowerCase();
      if (code === 'wrc_preset_unreachable_no_snapshot') {
        const noticeKey = `nosnapshot::${String(projectRef || '').trim()}::${String(wrcFile || '').trim()}`.toLowerCase();
        const nowTs = Date.now();
        const previousTs = Number(postprodWrcCacheNoticeRef.current?.[noticeKey] || 0);
        if (!Number.isFinite(previousTs) || (nowTs - previousTs) > 10000) {
          postprodWrcCacheNoticeRef.current = {
            ...(postprodWrcCacheNoticeRef.current || {}),
            [noticeKey]: nowTs,
          };
          showNotice(t('production.error.wrcUnreachableNoSnapshot'), 'warn');
        }
      }
      const resolved = resolvePostprodProjectsError(e, t);
      const fallback = String(e?.message || '').trim();
      const message = fallback && resolved === t('postprod.projects.error')
        ? fallback
        : resolved;
      const err = new Error(message);
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t, showNotice]);

  const handlePostprodLoadProjectDataTables = useCallback(async (projectRef) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return [];
    try {
      const res = await postprodListProjectDataTables(token, projectRef);
      return Array.isArray(res?.tables) ? res.tables : [];
    } catch (e) {
      const err = new Error(resolvePostprodDataError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, t]);

  const handlePostprodSyncProject = useCallback(async (projectRef, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    try {
      const res = await postprodSyncProject(token, projectRef, payload);
      await loadPostprodProjects();
      showNotice('Projet synchronise.', 'ok');
      return res?.sync && typeof res.sync === 'object' ? res.sync : null;
    } catch (e) {
      const err = new Error(resolvePostprodProjectsError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, loadPostprodProjects, showNotice, t]);

  const handlePostprodUpsertDataTableRow = useCallback(async (tableId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    try {
      const res = await postprodUpsertDataTableRow(token, tableId, payload);
      showNotice('Ligne de donnees enregistree.', 'ok');
      return res?.row && typeof res.row === 'object' ? res.row : null;
    } catch (e) {
      const err = new Error(resolvePostprodDataError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, showNotice, t]);

  const handlePostprodUpdateDataTable = useCallback(async (tableId, payload = {}) => {
    const token = String(postprodAuth.token || '').trim();
    if (!token) return null;
    try {
      const res = await postprodUpdateDataTable(token, tableId, payload);
      showNotice('Liaison widgets enregistree.', 'ok');
      return res?.table && typeof res.table === 'object' ? res.table : null;
    } catch (e) {
      const err = new Error(resolvePostprodDataError(e, t));
      err.code = e?.code || '';
      throw err;
    }
  }, [postprodAuth.token, showNotice, t]);

  const loadPostprodRenderProjectCatalog = useCallback(async (options = {}) => {
    const silent = options?.silent === true;
    const token = String(postprodAuth.token || '').trim();
    // Ancien callback appelé après un changement de session : ne rien toucher.
    if (token && !requestTrackerRef.current.isSessionCurrent(token)) return;
    const isCurrentRequest = requestTrackerRef.current.begin('renderProjectCatalog', token);
    if (!token) {
      setPostprodRenderProjectCatalog({ items: [], loading: false, error: '' });
      return;
    }
    if (silent) {
      setPostprodRenderProjectCatalog((prev) => ({ ...prev, error: '' }));
    } else {
      setPostprodRenderProjectCatalog((prev) => ({ ...prev, loading: true, error: '' }));
    }
    try {
      const projectsRes = await postprodListProjects(token, {
        usageMode: ['auto_render', 'live_auto_render'],
      });
      if (!isCurrentRequest()) return;
      const items = mapTaskProjectOptions(projectsRes);
      setPostprodRenderProjectCatalog({
        items,
        loading: false,
        error: '',
      });
    } catch {
      if (!isCurrentRequest()) return;
      setPostprodRenderProjectCatalog((prev) => ({
        ...prev,
        loading: false,
        error: t('postprod.renders.projects.error'),
      }));
    }
  }, [postprodAuth.token, t]);

  return {
    loadPostprodTasks,
    loadPostprodProjects,
    loadPostprodResources,
    loadPostprodTaskCatalog,
    handlePostprodLoadResourceDetail,
    handlePostprodReindexResources,
    handlePostprodLoadProjectRenderTemplates,
    handlePostprodLoadRenderTransitions,
    handlePostprodLoadProjectUnrealCatalog,
    handlePostprodLoadProjectWrcFields,
    handlePostprodLoadProjectDataTables,
    handlePostprodSyncProject,
    handlePostprodUpsertDataTableRow,
    handlePostprodUpdateDataTable,
    loadPostprodRenderProjectCatalog,
  };
}

export { usePostprodContentApi };
