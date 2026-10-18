// app/screens/projects.jsx
import React from 'react';
import {
  getCommon,
  saveProjectMeta,
} from '../utils/agent';
import { createT } from '../i18n';
import {
  getLocalIp,
  normPath,
  isUproject,
  padId,
  mapRelToAssetPath,
  mapRelToAssetPathNoDot,
} from '../utils/projects-helpers';
import {
  SORT_STORAGE_KEY,
  SORT_MODE_OPTIONS,
  getUprojectDialogDefaultPath,
  collectReferentOptions,
} from '../utils/projectsScreenUtils';
import useFilteredProjects from '../utils/useFilteredProjects';
import { readIdentity } from '../utils/identity';
import { NoticeContext } from '../NoticeContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { resolveConfirmDialogLabels } from '../components/confirmDialogLabels';
import { useProjectIntegration } from './hooks/useProjectIntegration';
import { useProjectsList } from './hooks/useProjectsList';
import { useProjectDetail } from './hooks/useProjectDetail';
import { usePromiseConfirmDialog } from './hooks/usePromiseConfirmDialog';
import { useProjectsNoticeEffect } from './hooks/useProjectsNoticeEffect';
import { useProjectsServerUiHandlers } from './hooks/useProjectsServerUiHandlers';
import ProjectsDetailView from '../components/ProjectsDetailView';
import ProjectsMainView from '../components/ProjectsMainView';

function createInitialAdvanced() {
  return {
    status: [],
    type: [],
    usageMode: [],
    engineVersion: [],
    director: '',
    technician: '',
    operator: '',
    journalist: '',
    tags: '',
  };
}

function createDefaultDetailMeta({ includeFavorite = false } = {}) {
  const base = {
    status: '',
    type: '',
    usageMode: '',
    syncIncluded: false,
    category: '',
    fileVersion: '',
    referents: {},
    keywords: [],
    note: '',
  };
  if (includeFavorite) {
    return { ...base, favorite: false };
  }
  return base;
}


/* ===================================================== */
export default function ProjectsScreen({
  canManageUnrealProjects = true,
  canEditProjectFields = null,
  canCreateTasks = false,
  canBypassPadForTasks = false,
  showProjectActivation = true,
  onCreateTaskFromProject = null,
  appMode = '',
}) {
  const canEditFields = canEditProjectFields !== null ? canEditProjectFields : canManageUnrealProjects;
  const canOpenProjectDetails = canManageUnrealProjects || canEditFields;
  const id = React.useMemo(readIdentity, []);
  const role = String(id.role || '').trim() || 'server';
  const localIp = getLocalIp();
  const lang = String(id.lang || 'fr').trim();
  const t = React.useMemo(() => createT(lang), [lang]);
  const currentMode = String(appMode || id.mode || '').trim().toLowerCase();
  const isPostprodMode = currentMode === 'postprod';
  const noticeApi = React.useContext(NoticeContext);

  // Form state (old-style form UI)
  const [formVisible, setFormVisible] = React.useState(false);
  const [formError, setFormError] = React.useState('');
  const [editingIndex, setEditingIndex] = React.useState(null);
  const [form, setForm] = React.useState({ name: '', projectPath: '', note: '', createdAt: '' });
  const noteRef = React.useRef(null);

  const {
    confirmDialog,
    confirmOkBtnRef,
    closeConfirmDialog,
    requestConfirm,
  } = usePromiseConfirmDialog();
  const {
    title: confirmTitle,
    cancelLabel: confirmCancelLabel,
    confirmLabel: confirmOkLabel,
  } = React.useMemo(() => resolveConfirmDialogLabels(t, {
    cancelAltKey: 'app.quit.confirm.cancel',
  }), [t]);

  function renderConfirmDialog() {
    return (
      <ConfirmDialog
        open={confirmDialog.open}
        busy={false}
        title={confirmTitle}
        message={confirmDialog.message}
        cancelLabel={confirmCancelLabel}
        confirmLabel={confirmOkLabel}
        onCancel={() => closeConfirmDialog(false)}
        onConfirm={() => closeConfirmDialog(true)}
        confirmRef={confirmOkBtnRef}
        overlayZIndex={12000}
      />
    );
  }

  // Pagination
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(() => {
    if (typeof window === 'undefined') return 25;
    try {
      const raw = localStorage.getItem('uu_projects_page_size');
      const n = Number(raw);
      if ([25, 50, 100, 200].includes(n)) return n;
    } catch {}
    return 25;
  });

  // View/sort/search state
  const [viewMode, setViewMode] = React.useState(() => {
    try {
      const stored = localStorage.getItem('uu_projects_view');
      if (stored === 'cards' || stored === 'list' || stored === 'thumbs') return stored;
    } catch {}
    return 'thumbs';
  });
  const [knownVersions, setKnownVersions] = React.useState([]);
  const [sortMode, setSortMode] = React.useState(() => {
    try {
      const stored = localStorage.getItem(SORT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const mode = String(parsed?.mode || parsed?.sortMode || parsed?.sort || '').trim();
        if (SORT_MODE_OPTIONS.has(mode)) return mode;
      }
    } catch {}
    return 'name';
  });
  const [sortDir, setSortDir] = React.useState(() => {
    try {
      const stored = localStorage.getItem(SORT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const dir = String(parsed?.dir || parsed?.sortDir || '').trim();
        if (dir === 'asc' || dir === 'desc') return dir;
      }
    } catch {}
    return 'asc';
  });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchExpanded, setSearchExpanded] = React.useState(false);
  const [searchAdvanced, setSearchAdvanced] = React.useState(createInitialAdvanced);

  const [detailMsg, setDetailMsg] = React.useState('');

  // === Domain Hooks ===
  const {
    projects,
    setProjects,
    activeName,
    setActiveName,
    activeId,
    setActiveId,
    activeByHost,
    setActiveByHost,
    nextId,
    setNextId,
    projectsLoading,
    projectFavorites,
    setProjectFavorites,
    projectFavoritesRef,
    favoriteOnly,
    setFavoriteOnly,
    clientActiveName,
    clientActiveId,
    clientAssocPath,
    clientSyncEnabled,
    httpBindMsg,
    httpBindMsgType,
    pendingDetailIdRef,
    pendingStartRef,
    saveToServer,
    removeOne,
    activateOne,
    setProjectFavoriteLocal,
    toggleProjectFavorite,
    associateForClientActive,
  } = useProjectsList({
    t,
    role,
    localIp,
    identity: id,
    canManageUnrealProjects,
    requestConfirm,
  });

  const {
    detailId,
    setDetailId,
    detailName,
    setDetailName,
    detailPath,
    setDetailPath,
    detailWrcNames,
    setDetailWrcNames,
    detailMeta,
    setDetailMeta,
    detailMetaRef,
    detailInsights,
    setDetailInsights,
    detailLoading,
    detailIsNew,
    setDetailIsNew,
    detailNoteRef,
    projectDropdownDirtyRef,
    projectVersion,
    setProjectVersion,
    projectVersionMsg,
    setProjectVersionMsg,
    projectVersionMsgType,
    setProjectVersionMsgType,
    projectVersionBusy,
    indexationMsg,
    indexationMsgType,
    intervenantsMsg,
    intervenantsMsgType,
    renderBridgeStatus,
    renderBridgeBusy,
    renderBridgeMsg,
    renderBridgeMsgType,
    livePluginsStatus,
    livePluginsBusy,
    livePluginsMsg,
    livePluginsMsgType,
    mapsMsg,
    mapsMsgType,
    mapsBusy,
    keywordsInput,
    setKeywordsInput,
    detailKeywordsList,
    isRenderBridgeUsage,
    loadRenderBridgeStatus,
    installRenderBridgeForDetail,
    loadLivePluginsStatus,
    installLiveProjectPlugin,
    updateDetailField,
    scheduleSave,
    scheduleProjectVersionSave,
    applyDefaultMapsPatch,
    openDetails,
    closeDetailAndSave,
    resetDetailState,
    addKeywordToDraft,
    removeKeywordFromDraft,
    handleKeywordKeyDown,
    httpBindVisible,
    snapshotOpen,
    snapshotBusy,
    snapshotMsg,
    snapshotMsgType,
    snapshotSrc,
    openSnapshotViewer,
    closeSnapshotViewer,
    setAutoScreenshotFromSnapshot,
    httpBindBusy,
    httpBindEditing,
    httpBindDraft,
    setHttpBindDraft,
    httpBindDisplay,
    httpBindDisplayClass,
    httpBindDraftValid,
    httpBindInlineMsg,
    httpBindInlineClass,
    canEditHttpBind,
    startHttpBindEdit,
    cancelHttpBindEdit,
    saveHttpBindAddress,
    vpDraft,
    setVpDraft,
    vpBusy,
    scheduleVpSave,
  } = useProjectDetail({
    t,
    canEditFields,
    projects,
    setProjects,
    activeName,
    activeId,
    activeByHost,
    saveToServer,
    projectFavoritesRef,
    isPostprodMode,
  });

  const {
    serverHost,
    serverRunning,
    integrationBusy,
    integrationMsg,
    integrationMsgType,
    startIntegration,
    stopIntegration,
  } = useProjectIntegration({
    t,
    role,
    localIp,
    projects,
    activeName,
    activeId,
    canManageUnrealProjects,
    noticeApi,
  });

  React.useEffect(() => {
    setDetailMsg('');
  }, [detailId]);

  const detailMapsView = React.useMemo(() => {
    const maps = (detailInsights && typeof detailInsights === 'object') ? detailInsights.maps : null;
    const list = Array.isArray(maps?.list) ? maps.list : [];
    const options = list
      .map((rel) => {
        const assetFull = mapRelToAssetPath(rel);
        const assetNoDot = mapRelToAssetPathNoDot(rel);
        const parts = String(rel || '').split('/');
        const displayRel = parts.length > 1 ? parts.slice(1).join('/') : String(rel || '');
        const display = '/' + String(displayRel || '').replace(/\\.umap$/i, '');
        return { rel, assetFull, assetNoDot, display };
      })
      .filter((option) => option.assetFull);

    const pickSelected = (currentValue) => {
      const cur = String(currentValue || '').trim();
      if (!cur) return '';
      const match = options.find(
        (option) => option.assetFull === cur || option.assetNoDot === cur,
      );
      return match ? match.assetFull : '';
    };

    const listDisplay = list.map((mapPath) => {
      const parts = String(mapPath || '').split('/');
      const display = parts.length > 1 ? parts.slice(1).join('/') : mapPath;
      return `/${display}`;
    });

    return {
      hasMaps: !!(maps && (maps.defaultGame || maps.defaultEditor || list.length > 0)),
      options,
      selectedGame: pickSelected(maps?.defaultGame),
      selectedEditor: pickSelected(maps?.defaultEditor),
      listDisplay,
    };
  }, [detailInsights]);

  // Cross-domain: sync detailMeta.favorite when projectFavorites changes
  React.useEffect(() => {
    if (!detailId) return;
    const fav = projectFavorites[String(detailId || '').trim()] === true;
    setDetailMeta((prev) => (prev ? { ...prev, favorite: fav } : prev));
    const current = detailMetaRef.current;
    if (current && typeof current === 'object') {
      detailMetaRef.current = { ...current, favorite: fav };
    }
  }, [detailId, projectFavorites, detailMetaRef, setDetailMeta]);

  // Cross-domain: open pending detail once projects loaded
  React.useEffect(() => {
    if (pendingDetailIdRef.current && projects.length > 0) {
      openDetails(pendingDetailIdRef.current);
      pendingDetailIdRef.current = '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ouverture différée déclenchée seulement à l'arrivée des projets
  }, [projects]);

  // Cross-domain: start integration once detail + serverHost available
  React.useEffect(() => {
    if (pendingStartRef.current && detailId && serverHost?.ip) {
      pendingStartRef.current = false;
      startIntegration(detailId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intégration différée déclenchée seulement quand le détail et le serveur sont prêts
  }, [detailId, serverHost]);

  // Wrapped callbacks: pass detail context to list-hook functions
  const handleSetDetailFavorite = React.useCallback((projectId, isFavorite) => {
    setProjectFavoriteLocal(projectId, isFavorite, detailId, setDetailMeta, detailMetaRef);
  }, [setProjectFavoriteLocal, detailId, setDetailMeta, detailMetaRef]);

  const handleToggleFavorite = React.useCallback((proj) => {
    toggleProjectFavorite(proj, detailId, setDetailMeta, detailMetaRef);
  }, [toggleProjectFavorite, detailId, setDetailMeta, detailMetaRef]);

  const handleAssociateForClientActive = React.useCallback(() => {
    return associateForClientActive(clientActiveId, clientActiveName);
  }, [associateForClientActive, clientActiveId, clientActiveName]);

  const handleDetailNameInputChange = React.useCallback((e) => {
    const name = e.target.value;
    setDetailName(name);
    setDetailMsg('');
    if (detailIsNew) return;
    const updated = projects.map((p) => (
      String(p.id || '').trim() === String(detailId).trim()
        ? { ...p, name }
        : p
    ));
    setProjects(updated);
    saveToServer(updated, name, activeByHost, detailId);
  }, [setDetailName, setDetailMsg, detailIsNew, projects, detailId, setProjects, saveToServer, activeByHost]);

  const handleDetailFavoriteToggle = React.useCallback(() => {
    const nextFav = detailMeta?.favorite === true ? false : true;
    handleSetDetailFavorite(detailId, nextFav);
  }, [detailMeta, detailId, handleSetDetailFavorite]);

  const handleCloseDetail = React.useCallback(() => {
    closeDetailAndSave('');
  }, [closeDetailAndSave]);

  const handleDetailPathInputChange = React.useCallback((e) => {
    setDetailPath(e.target.value);
    setDetailMsg('');
  }, [setDetailPath, setDetailMsg]);

  const handleDetailPathInputBlur = React.useCallback((e) => {
    const nextPath = e.target.value;
    scheduleSave(null, null, { path: nextPath });
  }, [scheduleSave]);

  const handleBrowseDetailPath = React.useCallback(async () => {
    let file = await window.electron?.chooseUproject?.({
      defaultPath: getUprojectDialogDefaultPath(detailPath),
    });
    if (file && typeof file === 'object') {
      file = file.file || file.path || (Array.isArray(file) ? file[0] : '');
    }
    if (file) {
      const np = normPath(file);
      setDetailPath(np);
      setDetailMsg('');
      scheduleSave(null, null, { path: np });
    }
  }, [detailPath, setDetailPath, setDetailMsg, scheduleSave]);

  const handleViewDetailPath = React.useCallback(() => {
    const p = normPath(detailPath);
    if (!p) return;
    if (window?.electron?.openPath) {
      window.electron.openPath(p);
    } else {
      const uri = p.startsWith('file://') ? p : `file:///${p.replace(/\\/g, '/')}`;
      try { window.open(encodeURI(uri)); } catch {}
    }
  }, [detailPath]);

  const markProjectDropdownDirty = React.useCallback(() => {
    projectDropdownDirtyRef.current = true;
  }, [projectDropdownDirtyRef]);

  const handleProjectVersionInputChange = React.useCallback((e) => {
    const v = e.target.value;
    setProjectVersion(v);
    setProjectVersionMsg('');
    setProjectVersionMsgType('');
  }, [setProjectVersion, setProjectVersionMsg, setProjectVersionMsgType]);

  const handleProjectVersionInputBlur = React.useCallback(() => {
    scheduleProjectVersionSave();
  }, [scheduleProjectVersionSave]);

  const handleProjectVersionInputKeyDown = React.useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      scheduleProjectVersionSave();
    }
  }, [scheduleProjectVersionSave]);

  const handleDetailNoteChange = React.useCallback((e) => {
    const el = e.target;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
    updateDetailField('note', e.target.value);
  }, [updateDetailField]);

  const handleKeywordsInputChange = React.useCallback((e) => {
    setKeywordsInput(e.target.value);
  }, [setKeywordsInput]);

  const handleKeywordsInputBlur = React.useCallback(() => {
    addKeywordToDraft(keywordsInput);
  }, [addKeywordToDraft, keywordsInput]);

  const handleSelectDefaultGameMap = React.useCallback((e) => {
    const v = String(e?.target?.value || '').trim();
    if (!v) return;
    applyDefaultMapsPatch({ gameDefaultMap: v });
  }, [applyDefaultMapsPatch]);

  const handleSelectDefaultEditorMap = React.useCallback((e) => {
    const v = String(e?.target?.value || '').trim();
    if (!v) return;
    applyDefaultMapsPatch({ editorStartupMap: v });
  }, [applyDefaultMapsPatch]);

  const handleToggleWrcPreset = React.useCallback((name, isChecked) => {
    const next = isChecked
      ? detailWrcNames.filter(n => n !== name)
      : [...detailWrcNames, name];
    setDetailWrcNames(next);
    scheduleSave(null, null, { wrcNames: next });
  }, [detailWrcNames, setDetailWrcNames, scheduleSave]);

  const handleIntervenantChange = React.useCallback((field, value) => {
    const next = updateDetailField(`referents.${field}`, value);
    scheduleSave(next, 'intervenants');
  }, [updateDetailField, scheduleSave]);

  const handleRefreshRenderBridgeStatus = React.useCallback(() => {
    if (!detailId) return;
    loadRenderBridgeStatus(detailId);
  }, [loadRenderBridgeStatus, detailId]);

  const handleInstallOrUpdateRenderBridge = React.useCallback(() => {
    installRenderBridgeForDetail();
  }, [installRenderBridgeForDetail]);

  const handleRefreshLivePluginsStatus = React.useCallback(() => {
    if (!detailId) return;
    loadLivePluginsStatus(detailId);
  }, [loadLivePluginsStatus, detailId]);

  const handleInstallLiveProjectPlugin = React.useCallback((pluginKey) => {
    installLiveProjectPlugin(pluginKey);
  }, [installLiveProjectPlugin]);

  const handleActivateDetailProject = React.useCallback(() => {
    if (!detailId) return;
    activateOne(detailId);
  }, [activateOne, detailId]);

  const handleStartDetailIntegration = React.useCallback(() => {
    if (!detailId) return;
    startIntegration(detailId);
  }, [startIntegration, detailId]);

  const canCreateTaskFromProject = React.useMemo(() => (
    canCreateTasks === true && typeof onCreateTaskFromProject === 'function'
  ), [canCreateTasks, onCreateTaskFromProject]);
  const isAutoRenderUsage = React.useCallback((usageMode, metaStatus) => {
    const mode = String(usageMode || '').trim();
    if (mode !== 'auto_render' && mode !== 'live_auto_render') return false;
    const status = String(metaStatus || '').trim();
    if (canBypassPadForTasks) return status === 'PAD' || status === 'Test';
    return status === 'PAD';
  }, [canBypassPadForTasks]);
  const createTaskFromProject = React.useCallback((projectRef) => {
    if (!canCreateTaskFromProject) return;
    const ref = String(projectRef || '').trim();
    if (!ref) return;
    onCreateTaskFromProject(ref);
  }, [canCreateTaskFromProject, onCreateTaskFromProject]);

  const handleCreateTaskFromDetail = React.useCallback(() => {
    if (!detailId) return;
    createTaskFromProject(detailId);
  }, [createTaskFromProject, detailId]);

  const handleDeleteDetailProject = React.useCallback(() => {
    if (!detailId) return;
    removeOne(detailId);
    setDetailId('');
  }, [removeOne, detailId, setDetailId]);

  const noticeCandidates = React.useMemo(() => ([
    integrationMsg ? { text: integrationMsg, type: integrationMsgType } : null,
    httpBindMsg ? { text: httpBindMsg, type: httpBindMsgType } : null,
    detailMsg ? { text: detailMsg, type: 'error' } : null,
    projectVersionMsg ? { text: projectVersionMsg, type: projectVersionMsgType } : null,
    indexationMsg ? { text: indexationMsg, type: indexationMsgType } : null,
    renderBridgeMsg ? { text: renderBridgeMsg, type: renderBridgeMsgType } : null,
    livePluginsMsg ? { text: livePluginsMsg, type: livePluginsMsgType } : null,
    intervenantsMsg ? { text: intervenantsMsg, type: intervenantsMsgType } : null,
    snapshotMsg ? { text: snapshotMsg, type: snapshotMsgType } : null,
    mapsMsg ? { text: mapsMsg, type: mapsMsgType } : null,
  ]), [
    integrationMsg, integrationMsgType,
    httpBindMsg, httpBindMsgType,
    detailMsg,
    projectVersionMsg, projectVersionMsgType,
    indexationMsg, indexationMsgType,
    renderBridgeMsg, renderBridgeMsgType,
    livePluginsMsg, livePluginsMsgType,
    intervenantsMsg, intervenantsMsgType,
    snapshotMsg, snapshotMsgType,
    mapsMsg, mapsMsgType,
  ]);

  useProjectsNoticeEffect({ noticeApi, candidates: noticeCandidates });

  // Expose closeDetailAndSave for sidebar navigation
  React.useEffect(() => {
    window.__closeProjectDetail = async () => { await closeDetailAndSave(''); };
    return () => { if (window.__closeProjectDetail) delete window.__closeProjectDetail; };
  }, [closeDetailAndSave]);

  // Escape: close detail panel
  React.useEffect(() => {
    if (!detailId) return;
    const onKey = (e) => {
      const key = e.key || e.code || '';
      if (key === 'Escape' || key === 'Esc') {
        if (snapshotOpen) return;
        e.preventDefault();
        closeDetailAndSave('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailId, snapshotOpen, closeDetailAndSave]);

  // Escape: close snapshot popup first
  React.useEffect(() => {
    if (!snapshotOpen) return;
    const onKey = (e) => {
      const key = e.key || e.code || '';
      if (key === 'Escape' || key === 'Esc') {
        e.preventDefault();
        closeSnapshotViewer();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snapshotOpen, closeSnapshotViewer]);

  // Adjust form note textarea height
  React.useEffect(() => {
    if (!formVisible || !noteRef.current) return;
    const el = noteRef.current;
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  }, [formVisible, form.note]);

  // Load known UE versions
  React.useEffect(() => {
    (async () => {
      try {
        const common = await getCommon().catch(() => ({}));
        const versions = Array.isArray(common.unrealVersions)
          ? common.unrealVersions.map(v => String(v || '').trim()).filter(Boolean)
          : [];
        setKnownVersions(versions);
      } catch {}
    })();
  }, []);

  // Persist view mode
  React.useEffect(() => {
    try { localStorage.setItem('uu_projects_view', viewMode); } catch {}
  }, [viewMode]);

  // Persist sort
  React.useEffect(() => {
    try {
      localStorage.setItem(
        SORT_STORAGE_KEY,
        JSON.stringify({ mode: sortMode, dir: sortDir })
      );
    } catch {}
  }, [sortMode, sortDir]);

  // ---- startAddProject / createProjectFromDraft (cross-domain: list + detail) ----
  async function startAddProject() {
    if (!canManageUnrealProjects) return;
    const newId = padId(nextId);
    setDetailId(newId);
    setDetailName('');
    setDetailIsNew(true);
    resetDetailState();
    setDetailMeta(createDefaultDetailMeta({ includeFavorite: true }));
    setDetailInsights({});
    setDetailPath('');
    setDetailWrcNames([]);

    const choose = window?.electron?.chooseUproject;
    if (typeof choose === 'function') {
      try {
        let file = await choose({ defaultPath: getUprojectDialogDefaultPath('') });
        if (file && typeof file === 'object') {
          file = file.file || file.path || (Array.isArray(file) ? file[0] : '');
        }
        if (file) {
          const np = normPath(file);
          setDetailPath(np);
          const baseName = (() => {
            const parts = String(np || '').split(/[/\\]+/).filter(Boolean);
            const last = parts.pop() || '';
            return last.replace(/\.uproject$/i, '') || last;
          })();
          if (baseName) setDetailName(baseName);
        }
      } catch {}
    }
  }

  async function createProjectFromDraft() {
    if (!canManageUnrealProjects) return;
    if (!detailName.trim() || !detailPath.trim()) {
      setDetailMsg(t('projects.detail.error.missingNamePath'));
      return;
    }
    const newId = detailId || padId(nextId);
    const createdAt = new Date().toISOString();
    const newProj = {
      id: newId,
      name: detailName.trim(),
      uproject: normPath(detailPath),
      wrcNames: detailWrcNames,
      favorite: detailMeta?.favorite === true,
      note: '',
      createdAt,
      engineVersion: '',
    };
    const nextList = [...projects, newProj];
    setProjects(nextList);
    if (newProj.favorite === true) {
      setProjectFavorites((prev) => ({ ...(prev && typeof prev === 'object' ? prev : {}), [newId]: true }));
    }
    setNextId(nextId + 1);
    await saveToServer(nextList, activeName, activeByHost, activeId);
    const detailMetaPayload = detailMeta && typeof detailMeta === 'object'
      ? detailMeta
      : createDefaultDetailMeta();
    const { favorite: _ignoredFavorite, ...detailMetaSharedPayload } = detailMetaPayload;
    await saveProjectMeta(newId, detailMetaSharedPayload);
    setDetailId('');
    setDetailIsNew(false);
  }

  function cancelForm() {
    setFormVisible(false);
    setEditingIndex(null);
    setFormError('');
    setForm({ name: '', projectPath: '', note: '', createdAt: '' });
  }

  function validateForm(d, idx = null) {
    const name = String(d.name || '').trim();
    const p = normPath(d.projectPath);
    if (!name) return t('projects.validation.nameRequired');
    if (!p) return t('projects.validation.pathRequired');
    if (!isUproject(p)) return t('projects.validation.mustBeUproject');
    const dup = projects.findIndex(x => String(x.name || '').trim().toLowerCase() === name.toLowerCase());
    if (dup !== -1 && dup !== idx) return t('projects.validation.duplicateName');
    return null;
  }

  async function submitForm(e) {
    if (!canManageUnrealProjects) return;
    e?.preventDefault?.();
    const data = {
      name: form.name,
      projectPath: normPath(form.projectPath),
      note: form.note || '',
      createdAt: form.createdAt || '',
    };
    const err = validateForm(data, editingIndex);
    if (err) { setFormError(err); return; }

    if (editingIndex !== null) {
      const before = projects[editingIndex];
      const oldName = String(before.name || '').trim();
      const newName = String(data.name || '').trim();
      const next = projects.map((p, i) =>
        i === editingIndex
          ? { ...p, name: newName, uproject: data.projectPath, note: data.note, createdAt: p.createdAt || data.createdAt }
          : p
      );
      let nextActive = activeName;
      if (activeName && oldName.toLowerCase() === activeName.toLowerCase()) {
        nextActive = newName;
      }
      const nextABH = { ...activeByHost };
      setProjects(next);
      setActiveName(nextActive);
      setActiveByHost(nextABH);
      if (await saveToServer(next, nextActive, nextABH)) cancelForm();
    } else {
      const newId = padId(nextId);
      const nextNextId = nextId + 1;
      const next = [
        ...projects,
        { id: newId, name: data.name, uproject: data.projectPath, note: data.note, createdAt: data.createdAt },
      ];
      const nextActive = (projects.length === 0) ? data.name : activeName;
      const nextActiveId = (projects.length === 0) ? newId : activeId;
      const nextABH = { ...activeByHost };
      if (localIp && data.name && data.projectPath) {
        nextABH[localIp] = { ...(nextABH[localIp] || {}), [data.name]: data.projectPath };
      }
      setNextId(nextNextId);
      setProjects(next);
      setActiveName(nextActive);
      setActiveId(nextActiveId);
      setActiveByHost(nextABH);
      if (await saveToServer(next, nextActive, nextABH, nextActiveId)) cancelForm();
    }
  }

  // Computed values
  const hasAdvancedFilters = React.useMemo(
    () => Object.entries(searchAdvanced || {}).some(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v)),
    [searchAdvanced]
  );
  const noneLabel = React.useMemo(() => {
    const raw = t('common.none');
    const stripped = raw ? raw.replace(/[()]/g, '').trim() : '';
    const base = stripped || 'Aucun';
    return base.charAt(0).toUpperCase() + base.slice(1);
  }, [t]);

  const { filteredProjects } = useFilteredProjects(
    projects,
    sortMode,
    sortDir,
    searchQuery,
    searchAdvanced,
    { favorite: favoriteOnly }
  );
  const referentOptions = React.useMemo(() => ({
    director: collectReferentOptions(projects, 'director'),
    technician: collectReferentOptions(projects, 'technician'),
    operator: collectReferentOptions(projects, 'operator'),
    journalist: collectReferentOptions(projects, 'journalist'),
  }), [projects]);
  const directorOptions = referentOptions.director;
  const technicianOptions = referentOptions.technician;
  const operatorOptions = referentOptions.operator;
  const journalistOptions = referentOptions.journalist;
  const knownVersionsSet = React.useMemo(
    () => new Set(knownVersions.map(v => String(v || '').trim().toLowerCase()).filter(Boolean)),
    [knownVersions]
  );
  const engineVersionOptions = React.useMemo(() => {
    const known = (Array.isArray(knownVersions) ? knownVersions : [])
      .map((v) => String(v || '').trim())
      .filter(Boolean);
    const fromProjects = (Array.isArray(projects) ? projects : [])
      .map((p) => String(p?.engineVersion || '').trim())
      .filter(Boolean);
    const merged = Array.from(new Set([...known, ...fromProjects]));
    return merged
      .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true, sensitivity: 'base' }))
      .map((v) => ({ value: v, label: v }));
  }, [knownVersions, projects]);

  const projectsWithActive = React.useMemo(
    () => filteredProjects.map((p) => ({
      ...p,
      isActive: !!activeId && String(activeId).trim() === String(p.id || '').trim(),
    })),
    [filteredProjects, activeId],
  );

  React.useEffect(() => {
    setPage(0);
    try { localStorage.setItem('uu_projects_page_size', String(pageSize)); } catch {}
  }, [filteredProjects.length, pageSize, sortMode, sortDir]);

  const totalProjects = projectsWithActive.length;
  const totalPages = Math.max(1, Math.ceil(totalProjects / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * pageSize;
  const visibleProjects = projectsWithActive.slice(pageStart, pageStart + pageSize);
  const canPrevPage = currentPage > 0;
  const canNextPage = currentPage < totalPages - 1;
  const {
    handleToggleFavoriteFilter,
    handleSearchClear,
    handleOpenAdvancedSearch,
    handleBrowseProjectPath,
    handleCloseAdvancedSearch,
    handlePrevPage,
    handleNextPage,
    handlePageSizeChange,
  } = useProjectsServerUiHandlers({
    createInitialAdvanced,
    formProjectPath: form.projectPath,
    totalPages,
    setFavoriteOnly,
    setSearchQuery,
    setSearchAdvanced,
    setSearchExpanded,
    setForm,
    getUprojectDialogDefaultPath,
    normPath,
    setPage,
    setPageSize,
  });
  const projectViewCommonProps = {
    t,
    projects: visibleProjects,
    versionEl,
    openDetails,
    activateOne,
    onToggleFavorite: handleToggleFavorite,
    onCreateTaskFromProject: createTaskFromProject,
    startIntegration,
    stopIntegration,
    serverHost,
    serverRunning,
    integrationBusy,
    canManageUnrealProjects,
    canEditProjectFields: canEditFields,
    canCreateTasks: canCreateTaskFromProject,
    isAutoRenderUsage,
    showActivationControls: showProjectActivation,
  };

  function handleSort(col) {
    if (sortMode === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortMode(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  }

  function versionEl(v) {
    const s = String(v || '').trim();
    if (!s) return <span className="uu-version uu-version-empty">—</span>;
    const warn = !knownVersionsSet.has(s.toLowerCase());
    const cls = warn ? 'uu-version uu-version-warn' : 'uu-version uu-version-ok';
    const title = warn ? t('projects.version.unknown') : '';
    return <span className={cls} title={title}>{s}</span>;
  }

  /* ---------------- Rendu ---------------- */
  const lazyBlockFallback = <div className="uu-muted">{t('projects.detail.loading')}</div>;
  const canClearServerFilters = !!searchQuery || favoriteOnly || hasAdvancedFilters || searchExpanded;
  const activeBannerProps = {
    t,
    role,
    canOpenProjectDetails,
    activeId,
    activeName,
    clientActiveId,
    clientActiveName,
    projectsLoading,
    onOpenDetails: openDetails,
  };
  const serverSectionProps = {
    fallback: lazyBlockFallback,
    t,
    formVisible,
    sortMode,
    onSortChange: handleSort,
    searchQuery,
    favoriteOnly,
    onToggleFavoriteFilter: handleToggleFavoriteFilter,
    onSearchChange: setSearchQuery,
    onSearchClear: handleSearchClear,
    canClear: canClearServerFilters,
    onAdvanced: handleOpenAdvancedSearch,
    viewMode,
    onViewChange: setViewMode,
    onAdd: startAddProject,
    canAdd: canManageUnrealProjects,
    form,
    setForm,
    formError,
    onSubmit: submitForm,
    onCancel: cancelForm,
    editingIndex,
    noteRef,
    normalizePath: normPath,
    clearFormError: () => setFormError(''),
    onBrowse: handleBrowseProjectPath,
    searchExpanded,
    filteredCount: filteredProjects.length,
    searchAdvanced,
    setSearchAdvanced,
    noneLabel,
    engineVersionOptions,
    directorOptions,
    technicianOptions,
    operatorOptions,
    journalistOptions,
    onCloseAdvanced: handleCloseAdvancedSearch,
    projectsCount: projectsWithActive.length,
    currentPage,
    totalPages,
    canPrevPage,
    canNextPage,
    pageSize,
    onPrevPage: handlePrevPage,
    onNextPage: handleNextPage,
    onPageSizeChange: handlePageSizeChange,
    projectsLoading,
    projectViewCommonProps,
    integrationMsg,
    removeOne,
    sortDir,
  };
  const clientSectionProps = {
    t,
    fallback: lazyBlockFallback,
    showProjectActivation,
    projectsLoading,
    clientActiveName,
    clientActiveId,
    clientAssocPath,
    clientSyncEnabled,
    onAssociate: handleAssociateForClientActive,
  };
  if (detailId) {
    const detailViewProps = {
      t,
      detailId,
      projects,
      detailMeta,
      detailInsights,
      detailMapsView,
      activeId,
      isPostprodMode,
      isRenderBridgeUsage,
      renderBridgeStatus,
      livePluginsStatus,
      detailName,
      onDetailNameChange: handleDetailNameInputChange,
      onToggleDetailFavorite: handleDetailFavoriteToggle,
      versionEl,
      detailIsNew,
      onCreateProject: createProjectFromDraft,
      onBack: handleCloseDetail,
      detailLoading,
      canEditFields,
      detailPath,
      onDetailPathChange: handleDetailPathInputChange,
      onDetailPathBlur: handleDetailPathInputBlur,
      onBrowseDetailPath: handleBrowseDetailPath,
      onViewDetailPath: handleViewDetailPath,
      noneLabel,
      projectVersion,
      projectVersionBusy,
      markProjectDropdownDirty,
      onUpdateDetailField: updateDetailField,
      onProjectVersionChange: handleProjectVersionInputChange,
      onProjectVersionBlur: handleProjectVersionInputBlur,
      onProjectVersionKeyDown: handleProjectVersionInputKeyDown,
      detailNoteRef,
      onDetailNoteChange: handleDetailNoteChange,
      keywordsInput,
      onKeywordsInputChange: handleKeywordsInputChange,
      onKeywordsKeyDown: handleKeywordKeyDown,
      onKeywordsBlur: handleKeywordsInputBlur,
      detailKeywordsList,
      onRemoveKeyword: removeKeywordFromDraft,
      renderBridgeBusy,
      onRefreshRenderBridgeStatus: handleRefreshRenderBridgeStatus,
      onInstallOrUpdateRenderBridge: handleInstallOrUpdateRenderBridge,
      livePluginsBusy,
      onRefreshLivePluginsStatus: handleRefreshLivePluginsStatus,
      onInstallLiveProjectPlugin: handleInstallLiveProjectPlugin,
      mapsBusy,
      onSelectDefaultGame: handleSelectDefaultGameMap,
      onSelectDefaultEditor: handleSelectDefaultEditorMap,
      lazyBlockFallback,
      httpBindVisible,
      httpBindEditing,
      httpBindDraft,
      setHttpBindDraft,
      httpBindDraftValid,
      httpBindBusy,
      httpBindDisplay,
      httpBindDisplayClass,
      httpBindInlineMsg,
      httpBindInlineClass,
      canEditHttpBind,
      onStartHttpBindEdit: startHttpBindEdit,
      onCancelHttpBindEdit: cancelHttpBindEdit,
      onSaveHttpBindAddress: saveHttpBindAddress,
      detailWrcNames,
      onToggleWrcPreset: handleToggleWrcPreset,
      vpDraft,
      setVpDraft,
      scheduleVpSave,
      vpBusy,
      snapshotSrc,
      onOpenSnapshotViewer: openSnapshotViewer,
      onIntervenantChange: handleIntervenantChange,
      canManageUnrealProjects,
      showProjectActivation,
      isAutoRenderUsage,
      canCreateTaskFromProject,
      onActivateProject: handleActivateDetailProject,
      onStartIntegration: handleStartDetailIntegration,
      onCreateTaskFromProject: handleCreateTaskFromDetail,
      onDeleteProject: handleDeleteDetailProject,
      snapshotOpen,
      snapshotBusy,
      onCloseSnapshotViewer: closeSnapshotViewer,
      onSetAsThumbnail: setAutoScreenshotFromSnapshot,
      confirmDialogNode: renderConfirmDialog(),
    };
    return <ProjectsDetailView {...detailViewProps} />;
  }

  /* ---------------- Rendu principal ---------------- */
  return (
    <ProjectsMainView
      role={role}
      showProjectActivation={showProjectActivation}
      lazyBlockFallback={lazyBlockFallback}
      activeBannerProps={activeBannerProps}
      serverSectionProps={serverSectionProps}
      clientSectionProps={clientSectionProps}
      confirmDialogNode={renderConfirmDialog()}
    />
  );
}

