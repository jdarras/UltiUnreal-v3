// app/screens/projects.jsx
import React, { Suspense } from 'react';
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
  formatFixed2,
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
import ProjectsSnapshotLightbox from '../components/ProjectsSnapshotLightbox';
import ProjectsDetailActionsBar from '../components/ProjectsDetailActionsBar';
import ProjectsDetailHeaderBar from '../components/ProjectsDetailHeaderBar';
import ProjectsDetailIndexationCard from '../components/ProjectsDetailIndexationCard';

const HttpBindBlock = React.lazy(() => import('../components/HttpBindBlock'));
const ProjectsActiveBanner = React.lazy(() => import('../components/ProjectsActiveBanner'));
const ProjectsClientSection = React.lazy(() => import('../components/ProjectsClientSection'));
const ProjectsServerSection = React.lazy(() => import('../components/ProjectsServerSection'));

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

const DETAIL_SECTION_TITLE_ROW_STYLE = { marginBottom: '12px' };
const FLEX_1_300_STYLE = { flex: '1 1 300px' };
const LABEL_CLICKABLE_STYLE = { cursor: 'pointer', userSelect: 'none' };
const TEXT_ELLIPSIS_STYLE = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const PROJECT_DETAIL_FIELDSET_STYLE = {
  border: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};
const WORD_BREAK_ALL_STYLE = { wordBreak: 'break-all' };
const SNAPSHOT_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: '12px',
};
const SNAPSHOT_TILE_STYLE = { padding: '6px', cursor: 'pointer' };
const SNAPSHOT_TILE_PREVIEW_STYLE = {
  width: '100%',
  aspectRatio: '16 / 9',
  background: '#1c1f24',
  borderRadius: '6px',
  overflow: 'hidden',
};
const SNAPSHOT_TILE_IMAGE_STYLE = { width: '100%', height: '100%', objectFit: 'cover' };
const SNAPSHOT_TILE_EMPTY_STYLE = { padding: '8px' };
const WIDTH_180_STYLE = { width: '180px' };
const WIDTH_120_STYLE = { width: '120px' };
const WIDTH_48_STYLE = { width: '48px' };
const WIDTH_520_STYLE = { width: '520px' };
const WIDTH_60_PERCENT_STYLE = { width: '60%' };
const RENDER_BRIDGE_STATE_READY_STYLE = { color: 'var(--uu-ok)' };
const RENDER_BRIDGE_STATE_DEFAULT_STYLE = { color: 'var(--uu-color-text)' };
const RENDER_BRIDGE_STATE_ERROR_STYLE = { color: 'var(--uu-error)' };

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
    mapsMsg,
    mapsMsgType,
    mapsBusy,
    keywordsInput,
    setKeywordsInput,
    detailKeywordsList,
    isRenderBridgeUsage,
    loadRenderBridgeStatus,
    installRenderBridgeForDetail,
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
  }, [detailId, projectFavorites]);

  // Cross-domain: open pending detail once projects loaded
  React.useEffect(() => {
    if (pendingDetailIdRef.current && projects.length > 0) {
      openDetails(pendingDetailIdRef.current);
      pendingDetailIdRef.current = '';
    }
  }, [projects]);

  // Cross-domain: start integration once detail + serverHost available
  React.useEffect(() => {
    if (pendingStartRef.current && detailId && serverHost?.ip) {
      pendingStartRef.current = false;
      startIntegration(detailId);
    }
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

  const noticeCandidates = React.useMemo(() => ([
    integrationMsg ? { text: integrationMsg, type: integrationMsgType } : null,
    httpBindMsg ? { text: httpBindMsg, type: httpBindMsgType } : null,
    detailMsg ? { text: detailMsg, type: 'error' } : null,
    projectVersionMsg ? { text: projectVersionMsg, type: projectVersionMsgType } : null,
    indexationMsg ? { text: indexationMsg, type: indexationMsgType } : null,
    renderBridgeMsg ? { text: renderBridgeMsg, type: renderBridgeMsgType } : null,
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
    const proj = projects.find(p => String(p.id || '').trim() === String(detailId));
    const meta = detailMeta || { status:'', type:'', usageMode:'', category:'', fileVersion:'', referents:{}, keywords:[], note:'' };
    const refs = meta.referents || {};
    const isActiveDetail = String(activeId || '').trim() === String(detailId || '').trim();
    const pluginsList = (Array.isArray(detailInsights?.plugins) ? detailInsights.plugins : [])
      .filter((pl) => pl && pl.enabled !== false);
    const hasPlugins = pluginsList.length > 0;
    const {
      hasMaps,
      options: mapOptions,
      selectedGame,
      selectedEditor,
      listDisplay: mapListDisplay,
    } = detailMapsView;
    const sequencesList = Array.isArray(detailInsights?.sequences?.list)
      ? detailInsights.sequences.list
      : [];
    const hasSequences = sequencesList.length > 0;
    const renderPresetsList = Array.isArray(detailInsights?.renderPresets?.list)
      ? detailInsights.renderPresets.list
      : [];
    const hasRenderPresets = renderPresetsList.length > 0;
    const wrcPresetsList = Array.isArray(detailInsights?.wrcPresets?.list)
      ? detailInsights.wrcPresets.list
      : [];
    const renderBridgeEligible = isPostprodMode && isRenderBridgeUsage(meta?.usageMode);
    const renderBridgeInstalled = renderBridgeStatus?.installedInProject === true;
    const renderBridgeEnabled = renderBridgeStatus?.enabledInProject === true;
    const renderBridgeReady = renderBridgeStatus?.ready === true;
    const renderBridgePackageAvailable = renderBridgeStatus?.packageAvailable === true;
    const renderBridgeStateLabel = renderBridgeReady
      ? t('projects.detail.renderBridge.state.ready')
      : (
          renderBridgeInstalled
            ? (renderBridgeEnabled
              ? t('projects.detail.renderBridge.state.ready')
              : t('projects.detail.renderBridge.state.notEnabled'))
            : t('projects.detail.renderBridge.state.notInstalled')
        );
    const hasWrcPresets = wrcPresetsList.length > 0;
    const setupUnreal = (detailInsights && typeof detailInsights === 'object') ? detailInsights.setupUnreal : null;
    const suRenderer = Array.isArray(setupUnreal?.renderer) ? setupUnreal.renderer : [];
    const suPlatform = setupUnreal && typeof setupUnreal.platform === 'object' ? setupUnreal.platform : {};
    const suWin = Array.isArray(suPlatform?.windows) ? suPlatform.windows : [];
    const suLinux = Array.isArray(suPlatform?.linux) ? suPlatform.linux : [];
    const suMac = Array.isArray(suPlatform?.mac) ? suPlatform.mac : [];
    const suHw = Array.isArray(suPlatform?.hardware) ? suPlatform.hardware : [];
    const hasSetupUnreal = !!(suRenderer.length || suWin.length || suLinux.length || suMac.length || suHw.length);

    const setupVP = (detailInsights && typeof detailInsights === 'object') ? detailInsights.setupVideoProduction : null;
    const vpCadence = setupVP && typeof setupVP.cadence === 'object' ? setupVP.cadence : {};
    const vpTimecode = setupVP && typeof setupVP.timecode === 'object' ? setupVP.timecode : {};
    const vpAnim = setupVP && typeof setupVP.animation === 'object' ? setupVP.animation : {};
    const vpSeq = setupVP && typeof setupVP.levelSequence === 'object' ? setupVP.levelSequence : {};
    const hasSetupVP = !!(
      setupVP &&
      (Object.values(vpCadence).some(Boolean) ||
        Object.values(vpTimecode).some(Boolean) ||
        Object.values(vpAnim).some(Boolean) ||
        Object.values(vpSeq).some(Boolean))
    );
    const snapshotsList = Array.isArray(detailInsights?.snapshots?.items)
      ? detailInsights.snapshots.items
      : [];
    const hasSnapshots = snapshotsList.length > 0;

    return (
      <div className="uu-page uu-page-compact">
        <ProjectsDetailHeaderBar
          t={t}
          detailId={detailId}
          detailName={detailName}
          onDetailNameChange={handleDetailNameInputChange}
          isFavorite={detailMeta?.favorite === true}
          onToggleFavorite={handleDetailFavoriteToggle}
          engineVersionElement={versionEl(proj?.engineVersion)}
          detailIsNew={detailIsNew}
          onCreateProject={createProjectFromDraft}
          onBack={handleCloseDetail}
        />

        <div className="uu-section uu-col uu-gap-16">
          {detailLoading ? (
            <div className="uu-muted">{t('projects.detail.loading')}</div>
          ) : (
            <fieldset
              className="uu-project-detail-stack"
              disabled={!canEditFields}
              style={PROJECT_DETAIL_FIELDSET_STYLE}
            >
              {/* Bloc : Chemin (sans titre) */}
              <div className="uu-card">
                <div className="uu-row wrap">
                  <div className="uu-label w-160">{t('projects.detail.labels.path')}</div>
                  <div className="uu-value">
                    <div className="uu-row uu-gap-6 uu-wrap uu-align-center">
                      <input
                        className="uu-input"
                        style={FLEX_1_300_STYLE}
                        value={detailPath}
                        onChange={handleDetailPathInputChange}
                        onBlur={handleDetailPathInputBlur}
                      />
                      <button
                        type="button"
                        className="uu-btn"
                        onClick={handleBrowseDetailPath}
                      >
                        {t('common.browse')}
                      </button>
                      <button
                        type="button"
                        className="uu-btn"
                        onClick={handleViewDetailPath}
                      >
                        {t('common.view')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <ProjectsDetailIndexationCard
                t={t}
                meta={meta}
                noneLabel={noneLabel}
                detailIsNew={detailIsNew}
                detailLoading={detailLoading}
                projectVersion={projectVersion}
                projectVersionBusy={projectVersionBusy}
                markProjectDropdownDirty={markProjectDropdownDirty}
                onUpdateDetailField={updateDetailField}
                onProjectVersionChange={handleProjectVersionInputChange}
                onProjectVersionBlur={handleProjectVersionInputBlur}
                onProjectVersionKeyDown={handleProjectVersionInputKeyDown}
                detailNoteRef={detailNoteRef}
                onDetailNoteChange={handleDetailNoteChange}
                keywordsInput={keywordsInput}
                onKeywordsInputChange={handleKeywordsInputChange}
                onKeywordsKeyDown={handleKeywordKeyDown}
                onKeywordsBlur={handleKeywordsInputBlur}
                detailKeywordsList={detailKeywordsList}
                onRemoveKeyword={removeKeywordFromDraft}
              />

              {/* Bloc : Plugin Rendu (Bridge) */}
              {!detailIsNew && renderBridgeEligible ? (
                <div className="uu-card">
                  <div className="uu-row uu-align-center uu-gap-8" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                    <strong className="uu-block-title">{t('projects.detail.blocks.renderBridge')}</strong>
                  </div>
                  <div className="uu-col uu-gap-10">
                    <div className="uu-row wrap uu-align-center uu-gap-8">
                      <div className="uu-label w-160">{t('projects.detail.renderBridge.stateLabel')}</div>
                      <div
                        className="uu-value"
                        style={renderBridgeReady ? RENDER_BRIDGE_STATE_READY_STYLE : RENDER_BRIDGE_STATE_DEFAULT_STYLE}
                      >
                        {renderBridgeStateLabel}
                      </div>
                    </div>
                    {!renderBridgePackageAvailable ? (
                      <div className="uu-row wrap uu-align-center uu-gap-8">
                        <div className="uu-label w-160">{t('projects.detail.renderBridge.packageLabel')}</div>
                        <div className="uu-value" style={RENDER_BRIDGE_STATE_ERROR_STYLE}>
                          {t('projects.detail.renderBridge.compatibilityHint')}
                        </div>
                      </div>
                    ) : null}
                    {renderBridgeStatus?.packageDir ? (
                      <div className="uu-row wrap uu-align-center uu-gap-8">
                        <div className="uu-label w-160">{t('projects.detail.renderBridge.packagePathLabel')}</div>
                        <div className="uu-value uu-muted" style={WORD_BREAK_ALL_STYLE}>
                          {String(renderBridgeStatus.packageDir || '')}
                        </div>
                      </div>
                    ) : null}
                    {!renderBridgeReady ? (
                      <div className="uu-row wrap uu-align-center uu-gap-8">
                        <div className="uu-label w-160">{t('projects.detail.renderBridge.actionsLabel')}</div>
                        <div className="uu-row uu-gap-8">
                          <button
                            type="button"
                            className="uu-btn"
                            disabled={renderBridgeBusy}
                            onClick={() => { loadRenderBridgeStatus(detailId); }}
                          >
                            {t('projects.detail.renderBridge.refresh')}
                          </button>
                          <button
                            type="button"
                            className="uu-btn"
                            disabled={renderBridgeBusy || !renderBridgePackageAvailable}
                            onClick={() => { installRenderBridgeForDetail(); }}
                          >
                            {renderBridgeInstalled
                              ? t('projects.detail.renderBridge.update')
                              : t('projects.detail.renderBridge.install')}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Bloc : Maps (si info) */}
              {hasMaps ? (
                <div className="uu-card">
                  <div className="uu-row uu-align-center uu-gap-8" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                    <strong className="uu-block-title">{t('projects.detail.blocks.maps')}</strong>
                  </div>

                  <div className="uu-col uu-gap-16">
                    <div className="uu-row wrap">
                      <div className="uu-label w-160">{t('projects.detail.maps.defaultGame')}</div>
                      <div className="uu-value">
                        <select
                          className="uu-select"
                          style={WIDTH_520_STYLE}
                          value={selectedGame}
                          onChange={(e) => {
                            const v = String(e.target.value || '').trim();
                            if (!v) return;
                            applyDefaultMapsPatch({ gameDefaultMap: v });
                          }}
                          disabled={mapsBusy || detailLoading}
                        >
                          <option value="">{t('common.none')}</option>
                          {mapOptions.map((option) => (
                            <option key={`g-${option.assetFull}`} value={option.assetFull}>
                              {option.display}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="uu-row wrap">
                      <div className="uu-label w-160">{t('projects.detail.maps.defaultEditor')}</div>
                      <div className="uu-value">
                        <select
                          className="uu-select"
                          style={WIDTH_520_STYLE}
                          value={selectedEditor}
                          onChange={(e) => {
                            const v = String(e.target.value || '').trim();
                            if (!v) return;
                            applyDefaultMapsPatch({ editorStartupMap: v });
                          }}
                          disabled={mapsBusy || detailLoading}
                        >
                          <option value="">{t('common.none')}</option>
                          {mapOptions.map((option) => (
                            <option key={`e-${option.assetFull}`} value={option.assetFull}>
                              {option.display}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="uu-row wrap">
                    <div className="uu-label w-160" />
                    <div className="uu-value uu-muted">
                      {mapListDisplay.length ? (
                        <div className="uu-small mt-4">
                          {mapListDisplay.map((displayPath, idx) => (
                            <div key={idx}>{displayPath}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Bloc : Sequences Unreal */}
              <div className="uu-card">
                <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                  <strong className="uu-block-title">{t('projects.detail.blocks.sequences')}</strong>
                  {!hasSequences ? (
                    <div className="uu-muted">{t('projects.detail.sequences.noInfo')}</div>
                  ) : null}
                </div>
                <div className="uu-row wrap">
                  <div className="uu-label w-160">{t('projects.detail.sequences.count')}</div>
                  <div className="uu-value">{sequencesList.length}</div>
                </div>
                {hasSequences ? (
                  <div className="uu-row wrap">
                    <div className="uu-label w-160" />
                    <div className="uu-value uu-small mt-4">
                      {sequencesList.map((entry, idx) => {
                        const assetPath = String(entry?.assetPath || '').trim();
                        const relativePath = String(entry?.relativePath || '').trim();
                        const name = String(entry?.name || '').trim();
                        const key = assetPath || relativePath || `${name}-${idx}`;
                        return (
                          <div key={`project-sequence-${key}`}>
                            {assetPath || relativePath || name || '-'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Bloc : Parametres de rendu */}
              <div className="uu-card">
                <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                  <strong className="uu-block-title">{t('projects.detail.blocks.renderPresets')}</strong>
                  {!hasRenderPresets ? (
                    <div className="uu-muted">{t('projects.detail.renderPresets.noInfo')}</div>
                  ) : null}
                </div>
                <div className="uu-row wrap">
                  <div className="uu-label w-160">{t('projects.detail.renderPresets.count')}</div>
                  <div className="uu-value">{renderPresetsList.length}</div>
                </div>
                {hasRenderPresets ? (
                  <div className="uu-row wrap">
                    <div className="uu-label w-160" />
                    <div className="uu-value uu-small mt-4">
                      {renderPresetsList.map((entry, idx) => {
                        const assetPath = String(entry?.assetPath || '').trim();
                        const relativePath = String(entry?.relativePath || '').trim();
                        const name = String(entry?.name || '').trim();
                        const key = assetPath || relativePath || `${name}-${idx}`;
                        return (
                          <div key={`project-render-preset-${key}`}>
                            {assetPath || relativePath || name || '-'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Bloc : WRC */}
              <div className="uu-card">
                <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                  <strong className="uu-block-title">{t('projects.detail.blocks.wrc')}</strong>
                </div>
                <Suspense fallback={lazyBlockFallback}>
                  <HttpBindBlock
                    t={t}
                    visible={httpBindVisible}
                    httpBindEditing={httpBindEditing}
                    httpBindDraft={httpBindDraft}
                    setHttpBindDraft={setHttpBindDraft}
                    httpBindDraftValid={httpBindDraftValid}
                    httpBindBusy={httpBindBusy}
                    httpBindDisplay={httpBindDisplay}
                    httpBindDisplayClass={httpBindDisplayClass}
                    httpBindInlineMsg={httpBindInlineMsg}
                    httpBindInlineClass={httpBindInlineClass}
                    canEditHttpBind={canEditHttpBind}
                    startHttpBindEdit={startHttpBindEdit}
                    cancelHttpBindEdit={cancelHttpBindEdit}
                    saveHttpBindAddress={saveHttpBindAddress}
                  />
                </Suspense>
                <div className="uu-row wrap mt-12">
                  <div className="uu-label w-160">{t('projects.detail.wrcPresets.count')}</div>
                  <div className="uu-value">{wrcPresetsList.length}</div>
                </div>
                {hasWrcPresets ? (
                  <div className="uu-row wrap mt-4">
                    <div className="uu-label w-160">{t('projects.detail.wrcPresets.active')}</div>
                    <div className="uu-value">
                      {wrcPresetsList.map((entry, idx) => {
                        const assetPath = String(entry?.assetPath || '').trim();
                        const relativePath = String(entry?.relativePath || '').trim();
                        const name = String(entry?.name || '').trim();
                        const key = assetPath || relativePath || `${name}-${idx}`;
                        const isChecked = detailWrcNames.includes(name);
                        return (
                          <div key={`project-wrc-preset-${key}`} className="uu-row uu-align-center uu-gap-8 mt-4">
                            <input
                              type="checkbox"
                              id={`wrc-preset-${key}`}
                              checked={isChecked}
                              disabled={!canEditFields}
                              onChange={() => {
                                const next = isChecked
                                  ? detailWrcNames.filter(n => n !== name)
                                  : [...detailWrcNames, name];
                                setDetailWrcNames(next);
                                scheduleSave(null, null, { wrcNames: next });
                              }}
                            />
                            <label htmlFor={`wrc-preset-${key}`} className="uu-small" style={LABEL_CLICKABLE_STYLE}>
                              {assetPath || relativePath || name || '-'}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="uu-row wrap mt-4">
                    <div className="uu-label w-160" />
                    <div className="uu-value uu-muted">{t('projects.detail.wrcPresets.noInfo')}</div>
                  </div>
                )}
              </div>

              {/* Bloc : Setup Video Production */}
              <div className="uu-card">
                <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                  <strong className="uu-block-title">{t('projects.detail.blocks.setupVideoProduction')}</strong>
                  {!hasSetupVP ? (
                    <div className="uu-muted">
                      {t('projects.detail.vp.noInfo')}
                    </div>
                  ) : null}
                </div>

                  <div className="uu-col uu-gap-16">
                    <div className="uu-row wrap">
                      <div className="uu-label w-160">{t('projects.detail.vp.minDesiredFrameRate')}</div>
                      <div className="uu-value">
                        <input
                          className="uu-input"
                          style={WIDTH_180_STYLE}
                          value={vpDraft?.minDesiredFrameRate ?? ''}
                          onChange={(e) => {
                            const next = { ...(vpDraft || {}), minDesiredFrameRate: e.target.value };
                            setVpDraft(next);
                            scheduleVpSave(next);
                          }}
                          onBlur={(e) => {
                            const formatted = formatFixed2(e.target.value);
                            if (formatted !== String(e.target.value || '')) {
                              const next = { ...(vpDraft || {}), minDesiredFrameRate: formatted };
                              setVpDraft(next);
                              scheduleVpSave(next);
                            }
                          }}
                          disabled={vpBusy}
                        />
                      </div>
                    </div>

                    <div className="uu-row wrap">
                      <div className="uu-label w-160">{t('projects.detail.vp.fixedFrameRate')}</div>
                      <div className="uu-value">
                        <div className="uu-row uu-align-center uu-gap-12 uu-wrap">
                          <label className="uu-check">
                            <input
                              type="checkbox"
                              checked={!!vpDraft?.useFixedFrameRate}
                              onChange={(e) => {
                                const next = { ...(vpDraft || {}), useFixedFrameRate: !!e.target.checked };
                                setVpDraft(next);
                                scheduleVpSave(next);
                              }}
                              disabled={vpBusy}
                            />
                            <span>{t('projects.detail.vp.enabled')}</span>
                          </label>
                          <input
                            className="uu-input"
                            style={WIDTH_180_STYLE}
                            value={vpDraft?.fixedFrameRate ?? ''}
                            onChange={(e) => {
                              const next = { ...(vpDraft || {}), fixedFrameRate: e.target.value };
                              setVpDraft(next);
                              scheduleVpSave(next);
                            }}
                            onBlur={(e) => {
                              const formatted = formatFixed2(e.target.value);
                              if (formatted !== String(e.target.value || '')) {
                                const next = { ...(vpDraft || {}), fixedFrameRate: formatted };
                                setVpDraft(next);
                                scheduleVpSave(next);
                              }
                            }}
                            disabled={vpBusy || !vpDraft?.useFixedFrameRate}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="uu-row wrap">
                      <div className="uu-label w-160">{t('projects.detail.vp.smoothFrameRate')}</div>
                      <div className="uu-value">
                        <div className="uu-row uu-align-center uu-gap-12 uu-wrap">
                          <label className="uu-check">
                            <input
                              type="checkbox"
                              checked={!!vpDraft?.smoothEnabled}
                              onChange={(e) => {
                                const next = { ...(vpDraft || {}), smoothEnabled: !!e.target.checked };
                                setVpDraft(next);
                                scheduleVpSave(next);
                              }}
                              disabled={vpBusy}
                            />
                            <span>{t('projects.detail.vp.enabled')}</span>
                          </label>
                          <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
                            <div className="uu-label" style={WIDTH_48_STYLE}>{t('projects.detail.vp.min')}</div>
                            <input
                              className="uu-input"
                              style={WIDTH_120_STYLE}
                              value={vpDraft?.smoothMin ?? ''}
                              onChange={(e) => {
                                const next = { ...(vpDraft || {}), smoothMin: e.target.value };
                                setVpDraft(next);
                                scheduleVpSave(next);
                              }}
                              onBlur={(e) => {
                                const formatted = formatFixed2(e.target.value);
                                if (formatted !== String(e.target.value || '')) {
                                  const next = { ...(vpDraft || {}), smoothMin: formatted };
                                  setVpDraft(next);
                                  scheduleVpSave(next);
                                }
                              }}
                              disabled={vpBusy || !vpDraft?.smoothEnabled}
                            />
                            <div className="uu-label" style={WIDTH_48_STYLE}>{t('projects.detail.vp.max')}</div>
                            <input
                              className="uu-input"
                              style={WIDTH_120_STYLE}
                              value={vpDraft?.smoothMax ?? ''}
                              onChange={(e) => {
                                const next = { ...(vpDraft || {}), smoothMax: e.target.value };
                                setVpDraft(next);
                                scheduleVpSave(next);
                              }}
                              onBlur={(e) => {
                                const formatted = formatFixed2(e.target.value);
                                if (formatted !== String(e.target.value || '')) {
                                  const next = { ...(vpDraft || {}), smoothMax: formatted };
                                  setVpDraft(next);
                                  scheduleVpSave(next);
                                }
                              }}
                              disabled={vpBusy || !vpDraft?.smoothEnabled}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="uu-row wrap">
                      <div className="uu-label w-160">{t('projects.detail.setupVideoProduction.timecode')}</div>
                      <div className="uu-value uu-muted">
                        {vpTimecode?.GenerateDefaultTimecodeFrameRate ? (
                          <div>GenerateDefaultTimecodeFrameRate={vpTimecode.GenerateDefaultTimecodeFrameRate}</div>
                        ) : null}
                        {vpTimecode?.TimecodeProviderClassName ? (
                          <div>TimecodeProviderClassName={vpTimecode.TimecodeProviderClassName}</div>
                        ) : null}
                        {vpTimecode?.CustomTimeStepClassName ? (
                          <div>CustomTimeStepClassName={vpTimecode.CustomTimeStepClassName}</div>
                        ) : null}
                        {vpAnim?.DefaultFrameRate ? (
                          <div>DefaultFrameRate={vpAnim.DefaultFrameRate}</div>
                        ) : null}
                        {vpSeq?.DefaultDisplayRate ? (
                          <div>LevelSequence.DefaultDisplayRate={vpSeq.DefaultDisplayRate}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              {/* Bloc : Snapshots (si info) */}
              {hasSnapshots ? (
                <div className="uu-card">
                  <div className="uu-row uu-align-center uu-gap-8" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                    <strong className="uu-block-title">{t('projects.detail.blocks.snapshots')}</strong>
                  </div>
                  <div className="uu-row wrap">
                    <div className="uu-label w-160" />
                    <div className="uu-value">
                      <div style={SNAPSHOT_GRID_STYLE}>
                        {snapshotsList.map((it, idx) => {
                          const rel = String(it?.rel || '').trim();
                          const full = String(it?.path || '').trim();
                          const relOrPath = rel || full;
                          const mtime = String(it?.mtime || '').trim();
                          const src = snapshotSrc(detailId, relOrPath, mtime);
                          const fileName = (relOrPath.split('/').filter(Boolean).slice(-1)[0] || relOrPath || `#${idx + 1}`);
                          return (
                            <div
                              key={relOrPath || idx}
                              className="uu-card"
                              style={SNAPSHOT_TILE_STYLE}
                              onClick={() => openSnapshotViewer({ rel: relOrPath, path: full, mtime })}
                              title={relOrPath}
                            >
                              <div style={SNAPSHOT_TILE_PREVIEW_STYLE}>
                                {src ? (
                                  <img
                                    src={src}
                                    alt=""
                                    style={SNAPSHOT_TILE_IMAGE_STYLE}
                                  />
                                ) : (
                                  <div className="uu-muted" style={SNAPSHOT_TILE_EMPTY_STYLE}>{t('common.none')}</div>
                                )}
                              </div>
                              <div className="uu-muted uu-small mt-4" style={TEXT_ELLIPSIS_STYLE}>
                                {fileName}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Bloc : Plugins (si info) */}
              {hasPlugins ? (
                <div className="uu-card">
                  <div className="uu-row uu-align-center uu-gap-8" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                    <strong className="uu-block-title">{t('projects.detail.blocks.plugins')}</strong>
                  </div>
                  <div className="uu-row wrap">
                    <div className="uu-label w-160" />
                    <div className="uu-value uu-muted">
                      {(pluginsList || []).map((pl, idx) => (
                        <div key={idx}>
                          {pl.name} {pl.marketplace ? t('projects.detail.plugins.marketplace') : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Bloc : Intervenants */}
              <div className="uu-card">
                <div className="uu-row uu-align-center uu-gap-8" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                  <strong className="uu-block-title">{t('projects.detail.blocks.intervenants')}</strong>
                </div>
                <div className="uu-col uu-gap-16">
                  <div className="uu-row wrap">
                    <div className="uu-label w-160">{t('projects.detail.labels.director')}</div>
                    <div className="uu-value">
                      <input
                        className="uu-input"
                        style={WIDTH_60_PERCENT_STYLE}
                        value={refs.director || ''}
                        onChange={(e) => {
                          const next = updateDetailField('referents.director', e.target.value);
                          scheduleSave(next, 'intervenants');
                        }}
                      />
                    </div>
                  </div>

                  <div className="uu-row wrap">
                    <div className="uu-label w-160">{t('projects.detail.labels.technician')}</div>
                    <div className="uu-value">
                      <input
                        className="uu-input"
                        style={WIDTH_60_PERCENT_STYLE}
                        value={refs.technician || ''}
                        onChange={(e) => {
                          const next = updateDetailField('referents.technician', e.target.value);
                          scheduleSave(next, 'intervenants');
                        }}
                      />
                    </div>
                  </div>

                  <div className="uu-row wrap">
                    <div className="uu-label w-160">{t('projects.detail.labels.operator')}</div>
                    <div className="uu-value">
                      <input
                        className="uu-input"
                        style={WIDTH_60_PERCENT_STYLE}
                        value={refs.operator || ''}
                        onChange={(e) => {
                          const next = updateDetailField('referents.operator', e.target.value);
                          scheduleSave(next, 'intervenants');
                        }}
                      />
                    </div>
                  </div>

                  <div className="uu-row wrap">
                    <div className="uu-label w-160">{t('projects.detail.labels.journalist')}</div>
                    <div className="uu-value">
                      <input
                        className="uu-input"
                        style={WIDTH_60_PERCENT_STYLE}
                        value={refs.journalist || ''}
                        onChange={(e) => {
                          const next = updateDetailField('referents.journalist', e.target.value);
                          scheduleSave(next, 'intervenants');
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc : Setup Unreal (si info) */}
              {hasSetupUnreal ? (
                <div className="uu-card">
                  <div className="uu-row uu-align-center uu-gap-8" style={DETAIL_SECTION_TITLE_ROW_STYLE}>
                    <strong className="uu-block-title">{t('projects.detail.blocks.setupUnreal')}</strong>
                  </div>
                  <div className="uu-col uu-gap-16">
                    {suRenderer.length ? (
                      <div className="uu-row wrap">
                        <div className="uu-label w-160">{t('projects.detail.setupUnreal.renderer')}</div>
                        <div className="uu-value uu-muted">
                          {suRenderer.map((it, idx) => (
                            <div key={`${it.key}-${idx}`}>{it.key}={it.value}</div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(suWin.length || suLinux.length || suMac.length || suHw.length) ? (
                      <div className="uu-row wrap">
                        <div className="uu-label w-160">{t('projects.detail.setupUnreal.platform')}</div>
                        <div className="uu-value uu-muted">
                          {suWin.length ? (
                            <>
                              <div><strong>{t('projects.detail.setupUnreal.platform.windows')}</strong></div>
                              {suWin.map((it, idx) => <div key={`win-${it.key}-${idx}`}>{it.key}={it.value}</div>)}
                            </>
                          ) : null}
                          {suLinux.length ? (
                            <>
                              <div className="mt-8"><strong>{t('projects.detail.setupUnreal.platform.linux')}</strong></div>
                              {suLinux.map((it, idx) => <div key={`linux-${it.key}-${idx}`}>{it.key}={it.value}</div>)}
                            </>
                          ) : null}
                          {suMac.length ? (
                            <>
                              <div className="mt-8"><strong>{t('projects.detail.setupUnreal.platform.mac')}</strong></div>
                              {suMac.map((it, idx) => <div key={`mac-${it.key}-${idx}`}>{it.key}={it.value}</div>)}
                            </>
                          ) : null}
                          {suHw.length ? (
                            <>
                              <div className="mt-8"><strong>{t('projects.detail.setupUnreal.platform.hardware')}</strong></div>
                              {suHw.map((it, idx) => <div key={`hw-${it.key}-${idx}`}>{it.key}={it.value}</div>)}
                            </>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </fieldset>
          )}
        </div>

        <ProjectsDetailActionsBar
          t={t}
          detailIsNew={detailIsNew}
          canManageUnrealProjects={canManageUnrealProjects}
          showProjectActivation={showProjectActivation}
          isActiveDetail={isActiveDetail}
          canCreateTaskFromProject={canCreateTaskFromProject}
          detailMeta={detailMeta}
          isAutoRenderUsage={isAutoRenderUsage}
          onCreateProject={createProjectFromDraft}
          onActivateProject={() => activateOne(detailId)}
          onStartIntegration={() => startIntegration(detailId)}
          onCreateTaskFromProject={() => createTaskFromProject(detailId)}
          onDeleteProject={() => { removeOne(detailId); setDetailId(''); }}
        />

        <ProjectsSnapshotLightbox
          t={t}
          snapshotOpen={snapshotOpen}
          detailId={detailId}
          snapshotBusy={snapshotBusy}
          snapshotSrc={snapshotSrc}
          onClose={closeSnapshotViewer}
          onSetAsThumbnail={setAutoScreenshotFromSnapshot}
        />
        {renderConfirmDialog()}
      </div>
    );
  }

  /* ---------------- Rendu principal ---------------- */
  return (
    <div className="uu-page uu-page-compact">
      
      {role === 'server' && showProjectActivation ? (
        <Suspense fallback={lazyBlockFallback}>
          <ProjectsActiveBanner {...activeBannerProps} />
        </Suspense>
      ) : null}

      {role === 'server' ? (
        <Suspense fallback={lazyBlockFallback}>
          <ProjectsServerSection {...serverSectionProps} />
        </Suspense>
      ) : (
        <Suspense fallback={lazyBlockFallback}>
          <ProjectsClientSection {...clientSectionProps} />
        </Suspense>
      )}

      {renderConfirmDialog()}
    </div>
  );
}

