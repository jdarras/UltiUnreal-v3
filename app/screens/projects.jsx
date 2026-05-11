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
import { useProjectIntegration } from './hooks/useProjectIntegration';
import { useProjectsList } from './hooks/useProjectsList';
import { useProjectDetail } from './hooks/useProjectDetail';
import { usePromiseConfirmDialog } from './hooks/usePromiseConfirmDialog';

const ProjectsHeaderBar = React.lazy(() => import('../components/ProjectsHeaderBar'));
const ProjectsListView = React.lazy(() => import('../components/ProjectsListView'));
const ProjectsCardsView = React.lazy(() => import('../components/ProjectsCardsView'));
const ProjectForm = React.lazy(() => import('../components/ProjectForm'));
const ProjectsThumbsView = React.lazy(() => import('../components/ProjectsThumbsView'));
const HttpBindBlock = React.lazy(() => import('../components/HttpBindBlock'));
const MultiSelectDropdown = React.lazy(() => import('../components/MultiSelectDropdown'));

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

  function renderConfirmDialog() {
    if (!confirmDialog.open) return null;
    const title = t('production.confirm.title') || 'Confirmation';
    const labelCancel = t('production.confirm.cancel') || t('app.quit.confirm.cancel') || 'Annuler';
    const labelOk = t('production.confirm.ok') || 'OK';
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 12000
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeConfirmDialog(false);
        }}
      >
        <div
          className="uu-card"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          style={{ width: 'min(460px, calc(100vw - 32px))', padding: '16px' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ fontWeight: 600, marginBottom: '10px' }}>{title}</div>
          <div style={{ marginBottom: '14px', lineHeight: 1.35 }}>{confirmDialog.message}</div>
          <div className="uu-row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" className="uu-btn" onClick={() => closeConfirmDialog(false)}>{labelCancel}</button>
            <button ref={confirmOkBtnRef} type="button" className="uu-btn prod-toggle-active" onClick={() => closeConfirmDialog(true)}>{labelOk}</button>
          </div>
        </div>
      </div>
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

  // Top-level httpBind message (from saveToServer warnings)
  const [httpBindMsg, setHttpBindMsg] = React.useState('');
  const [httpBindMsgType, setHttpBindMsgType] = React.useState('');

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
    setHttpBindMsg,
    setHttpBindMsgType,
    httpBindMsg,
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
    detailMsg,
    setDetailMsg,
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
    setSnapshotOpen,
    setSnapshotMsg,
    setSnapshotMsgType,
    snapshotSrc,
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

  // Notice effect
  React.useEffect(() => {
    if (!noticeApi) return;
    const candidates = [
      integrationMsg ? { text: integrationMsg, type: integrationMsgType } : null,
      httpBindMsg ? { text: httpBindMsg, type: httpBindMsgType } : null,
      detailMsg ? { text: detailMsg, type: 'error' } : null,
      projectVersionMsg ? { text: projectVersionMsg, type: projectVersionMsgType } : null,
      indexationMsg ? { text: indexationMsg, type: indexationMsgType } : null,
      renderBridgeMsg ? { text: renderBridgeMsg, type: renderBridgeMsgType } : null,
      intervenantsMsg ? { text: intervenantsMsg, type: intervenantsMsgType } : null,
      snapshotMsg ? { text: snapshotMsg, type: snapshotMsgType } : null,
      mapsMsg ? { text: mapsMsg, type: mapsMsgType } : null,
    ];
    const first = candidates.find(Boolean);
    if (first && first.text) {
      noticeApi.showNotice?.(first.text, first.type || '');
    }
  }, [
    integrationMsg, integrationMsgType,
    httpBindMsg, httpBindMsgType,
    detailMsg,
    projectVersionMsg, projectVersionMsgType,
    indexationMsg, indexationMsgType,
    renderBridgeMsg, renderBridgeMsgType,
    intervenantsMsg, intervenantsMsgType,
    snapshotMsg, snapshotMsgType,
    mapsMsg, mapsMsgType,
    noticeApi,
  ]);

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
        if (snapshotBusy) return;
        setSnapshotOpen(null);
        setSnapshotMsg('');
        setSnapshotMsgType('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [snapshotOpen, snapshotBusy, setSnapshotOpen, setSnapshotMsg, setSnapshotMsgType]);

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
    setDetailMeta({ status: '', type: '', usageMode: '', category: '', fileVersion: '', referents: {}, keywords: [], note: '', favorite: false });
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
      : { status: '', type: '', usageMode: '', category: '', fileVersion: '', referents: {}, keywords: [], note: '' };
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
  const lazyInlineFallback = <span className="uu-muted">{t('projects.detail.loading')}</span>;

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
        <div className="uu-section">
          <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
            <span className="uu-id-tag">[{detailId}]</span>
            <input
              className="uu-input"
              style={{ minWidth: '240px', width: '50%' }}
              value={detailName}
              onChange={(e) => {
                const name = e.target.value;
                setDetailName(name);
                setDetailMsg('');
                if (detailIsNew) return;
                const updated = projects.map(p =>
                  String(p.id || '').trim() === String(detailId).trim()
                    ? { ...p, name }
                    : p
                );
                setProjects(updated);
                saveToServer(updated, name, activeByHost, detailId);
              }}
            />
            <div className="uu-row uu-align-center uu-gap-6" style={{ flex: '0 0 auto' }}>
              <button
                type="button"
                className={`uu-fav-btn ${detailMeta?.favorite === true ? 'active' : ''}`}
                onClick={() => {
                  const nextFav = detailMeta?.favorite === true ? false : true;
                  handleSetDetailFavorite(detailId, nextFav);
                }}
                aria-pressed={detailMeta?.favorite === true ? 'true' : 'false'}
                title={t('resources.detail.labels.favorite')}
              >
                ★
              </button>
              <span>Favori</span>
              <span>—</span>
              <span>{t('projects.detail.labels.engineVersionShort')} {versionEl(proj?.engineVersion)}</span>
            </div>
            <div className="uu-row uu-gap-8" style={{ marginLeft: 'auto' }}>
              {detailIsNew ? (
                <button className="uu-btn" onClick={() => { createProjectFromDraft(); }}>
                  {t('projects.detail.buttons.add')}
                </button>
              ) : null}
              <button className="uu-btn" onClick={() => closeDetailAndSave('')}>{t('projects.detail.back')}</button>
            </div>
          </div>
          {/* inline messages supprimés : seuls les messages top-page sont conservés */}
        </div>

        <div className="uu-section uu-col uu-gap-16">
          {detailLoading ? (
            <div className="uu-muted">{t('projects.detail.loading')}</div>
          ) : (
            <fieldset
              className="uu-project-detail-stack"
              disabled={!canEditFields}
              style={{
                border: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Bloc : Chemin (sans titre) */}
              <div className="uu-card">
                <div className="uu-row wrap">
                  <div className="uu-label w-160">{t('projects.detail.labels.path')}</div>
                  <div className="uu-value">
                    <div className="uu-row uu-gap-6 uu-wrap uu-align-center">
                      <input
                        className="uu-input"
                        style={{ flex: '1 1 300px' }}
                        value={detailPath}
                        onChange={(e) => { setDetailPath(e.target.value); setDetailMsg(''); }}
                        onBlur={(e) => {
                          const nextPath = e.target.value;
                          scheduleSave(null, null, { path: nextPath });
                        }}
                      />
                      <button
                        type="button"
                        className="uu-btn"
                        onClick={async () => {
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
                        }}
                      >
                        {t('common.browse')}
                      </button>
                      <button
                        type="button"
                        className="uu-btn"
                        onClick={() => {
                          const p = normPath(detailPath);
                          if (!p) return;
                          if (window?.electron?.openPath) {
                            window.electron.openPath(p);
                          } else {
                            const uri = p.startsWith('file://') ? p : `file:///${p.replace(/\\/g, '/')}`;
                            try { window.open(encodeURI(uri)); } catch {}
                          }
                        }}
                      >
                        {t('common.view')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloc : Indexation */}
              <div className="uu-card">
                <div className="uu-row uu-align-center uu-gap-8" style={{ marginBottom: '12px' }}>
                  <strong className="uu-block-title">{t('projects.detail.blocks.indexation')}</strong>
                </div>
                <div className="uu-col uu-gap-16">
                  <div className="uu-row wrap uu-align-center uu-gap-8">
                    <div className="uu-label w-160">{t('projects.detail.labels.status')}</div>
                    <select
                      className="uu-select"
                      style={{ width: '260px' }}
                      value={meta.status || ''}
                      onChange={(e) => {
                        projectDropdownDirtyRef.current = true;
                        updateDetailField('status', e.target.value);
                      }}
                    >
                      <option value="">{noneLabel}</option>
                      <option value="Test">{t('projects.detail.status.test')}</option>
                      <option value="In progress">{t('projects.detail.status.in_progress')}</option>
                      <option value="A modifier">{t('projects.detail.status.to_modify')}</option>
                      <option value="PAD">{t('projects.detail.status.pas')}</option>
                      <option value="Archive">{t('projects.detail.status.archive')}</option>
                    </select>

                    <div className="uu-label" style={{ width: '110px', textAlign: 'left', marginLeft: '8px' }}>
                      {t('projects.detail.labels.usageMode')}
                    </div>
                    <select
                      className="uu-select"
                      style={{ width: '260px' }}
                      value={meta.usageMode || ''}
                      onChange={(e) => {
                        projectDropdownDirtyRef.current = true;
                        updateDetailField('usageMode', e.target.value);
                      }}
                    >
                      <option value="">{noneLabel}</option>
                      <option value="live">{t('projects.detail.usageMode.live')}</option>
                      <option value="auto_render">{t('projects.detail.usageMode.auto_render')}</option>
                      <option value="live_auto_render">{t('projects.detail.usageMode.live_auto_render')}</option>
                      <option value="other">{t('projects.detail.usageMode.other')}</option>
                    </select>
                  </div>

                  <div className="uu-row wrap uu-align-center uu-gap-8">
                    <div className="uu-label w-160">{t('projects.detail.labels.type')}</div>
                    <select
                      className="uu-select"
                      style={{ width: '260px' }}
                      value={meta.type || ''}
                      onChange={(e) => {
                        projectDropdownDirtyRef.current = true;
                        updateDetailField('type', e.target.value);
                      }}
                    >
                      <option value="">{noneLabel}</option>
                      <option value="Réalité augmentée">{t('projects.detail.type.ar')}</option>
                      <option value="Green Screen">{t('projects.detail.type.green')}</option>
                      <option value="NDisplay">{t('projects.detail.type.ndisplay')}</option>
                      <option value="Motion Design">{t('projects.detail.type.motion')}</option>
                      <option value="Blueprint">{t('projects.detail.type.blueprint')}</option>
                      <option value="Plugin">{t('projects.detail.type.plugin')}</option>
                      <option value="Scène Unreal">{t('projects.detail.type.scene')}</option>
                      <option value="Movie Render Cue">{t('projects.detail.type.movie_render_cue')}</option>
                    </select>

                    {!detailIsNew && (
                      <>
                        <div className="uu-label" style={{ width: '90px', textAlign: 'left', marginLeft: '8px' }}>
                          {t('projects.detail.labels.fileVersion')}
                        </div>
                        <input
                          className="uu-input"
                          style={{ width: '180px' }}
                          value={projectVersion ?? ''}
                          disabled={detailLoading || projectVersionBusy}
                          onChange={(e) => {
                            const v = e.target.value;
                            setProjectVersion(v);
                            setProjectVersionMsg('');
                            setProjectVersionMsgType('');
                          }}
                          onBlur={() => scheduleProjectVersionSave()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              scheduleProjectVersionSave();
                            }
                          }}
                        />
                      </>
                    )}
                  </div>

                  <div className="uu-row wrap">
                  <div className="uu-label w-160">{t('projects.detail.labels.note')}</div>
                  <div className="uu-value">
                    <textarea
                      ref={detailNoteRef}
                      className="uu-input"
                      rows={1}
                      style={{ overflow: 'hidden' }}
                      value={meta.note || ''}
                      onChange={(e) => {
                        const el = e.target;
                        el.style.height = '0px';
                        el.style.height = el.scrollHeight + 'px';
                        updateDetailField('note', e.target.value);
                      }}
                    />
                  </div>
                </div>

                  <div className="uu-row wrap">
                    <div className="uu-label w-160">{t('projects.detail.labels.keywords')}</div>
                    <div className="uu-row" style={{ flex: '1 1 auto' }}>
                      <input
                        className="uu-input"
                        style={{ minWidth: '220px', flex: '1 1 260px' }}
                        placeholder=""
                        value={keywordsInput}
                        onChange={(e) => setKeywordsInput(e.target.value)}
                        onKeyDown={handleKeywordKeyDown}
                        onBlur={() => addKeywordToDraft(keywordsInput)}
                      />
                    </div>
                  </div>
                  <div className="uu-row uu-gap-6 uu-wrap" style={{ marginLeft: '160px' }}>
                    {detailKeywordsList.map((kw) => (
                      <span
                        key={kw}
                        className="uu-chip"
                        style={{ border: 'none', padding: '6px 10px', gap: '8px' }}
                      >
                        <span style={{ marginRight: '6px' }}>{kw}</span>
                        <button
                          type="button"
                          className="uu-chip-remove"
                          onClick={() => removeKeywordFromDraft(kw)}
          aria-label={t('common.delete')}
                          style={{ padding: '2px 6px', minWidth: 'auto', height: '22px' }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bloc : Plugin Rendu (Bridge) */}
              {!detailIsNew && renderBridgeEligible ? (
                <div className="uu-card">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ marginBottom: '12px' }}>
                    <strong className="uu-block-title">{t('projects.detail.blocks.renderBridge')}</strong>
                  </div>
                  <div className="uu-col uu-gap-10">
                    <div className="uu-row wrap uu-align-center uu-gap-8">
                      <div className="uu-label w-160">{t('projects.detail.renderBridge.stateLabel')}</div>
                      <div
                        className="uu-value"
                        style={{ color: renderBridgeReady ? 'var(--uu-ok)' : 'var(--uu-color-text)' }}
                      >
                        {renderBridgeStateLabel}
                      </div>
                    </div>
                    {!renderBridgePackageAvailable ? (
                      <div className="uu-row wrap uu-align-center uu-gap-8">
                        <div className="uu-label w-160">{t('projects.detail.renderBridge.packageLabel')}</div>
                        <div className="uu-value" style={{ color: 'var(--uu-error)' }}>
                          {t('projects.detail.renderBridge.compatibilityHint')}
                        </div>
                      </div>
                    ) : null}
                    {renderBridgeStatus?.packageDir ? (
                      <div className="uu-row wrap uu-align-center uu-gap-8">
                        <div className="uu-label w-160">{t('projects.detail.renderBridge.packagePathLabel')}</div>
                        <div className="uu-value uu-muted" style={{ wordBreak: 'break-all' }}>
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
                  <div className="uu-row uu-align-center uu-gap-8" style={{ marginBottom: '12px' }}>
                    <strong className="uu-block-title">{t('projects.detail.blocks.maps')}</strong>
                  </div>

                  <div className="uu-col uu-gap-16">
                    <div className="uu-row wrap">
                      <div className="uu-label w-160">{t('projects.detail.maps.defaultGame')}</div>
                      <div className="uu-value">
                        <select
                          className="uu-select"
                          style={{ width: '520px' }}
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
                          style={{ width: '520px' }}
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
                <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={{ marginBottom: '12px' }}>
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
                <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={{ marginBottom: '12px' }}>
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
                <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={{ marginBottom: '12px' }}>
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
                            <label htmlFor={`wrc-preset-${key}`} className="uu-small" style={{ cursor: 'pointer', userSelect: 'none' }}>
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
                <div className="uu-row uu-align-center uu-gap-8 uu-row-nowrap" style={{ marginBottom: '12px' }}>
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
                          style={{ width: '180px' }}
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
                            style={{ width: '180px' }}
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
                            <div className="uu-label" style={{ width: '48px' }}>{t('projects.detail.vp.min')}</div>
                            <input
                              className="uu-input"
                              style={{ width: '120px' }}
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
                            <div className="uu-label" style={{ width: '48px' }}>{t('projects.detail.vp.max')}</div>
                            <input
                              className="uu-input"
                              style={{ width: '120px' }}
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
                  <div className="uu-row uu-align-center uu-gap-8" style={{ marginBottom: '12px' }}>
                    <strong className="uu-block-title">{t('projects.detail.blocks.snapshots')}</strong>
                  </div>
                  <div className="uu-row wrap">
                    <div className="uu-label w-160" />
                    <div className="uu-value">
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                          gap: '12px',
                        }}
                      >
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
                              style={{
                                padding: '6px',
                                cursor: 'pointer',
                              }}
                              onClick={() => { setSnapshotMsg(''); setSnapshotMsgType(''); setSnapshotOpen({ rel: relOrPath, path: full, mtime }); }}
                              title={relOrPath}
                            >
                              <div
                                style={{
                                  width: '100%',
                                  aspectRatio: '16 / 9',
                                  background: '#1c1f24',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                }}
                              >
                                {src ? (
                                  <img
                                    src={src}
                                    alt=""
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  <div className="uu-muted" style={{ padding: '8px' }}>{t('common.none')}</div>
                                )}
                              </div>
                              <div className="uu-muted uu-small mt-4" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  <div className="uu-row uu-align-center uu-gap-8" style={{ marginBottom: '12px' }}>
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
                <div className="uu-row uu-align-center uu-gap-8" style={{ marginBottom: '12px' }}>
                  <strong className="uu-block-title">{t('projects.detail.blocks.intervenants')}</strong>
                </div>
                <div className="uu-col uu-gap-16">
                  <div className="uu-row wrap">
                    <div className="uu-label w-160">{t('projects.detail.labels.director')}</div>
                    <div className="uu-value">
                      <input
                        className="uu-input"
                        style={{ width: '60%' }}
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
                        style={{ width: '60%' }}
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
                        style={{ width: '60%' }}
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
                        style={{ width: '60%' }}
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
                  <div className="uu-row uu-align-center uu-gap-8" style={{ marginBottom: '12px' }}>
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

        <div className="uu-section">
          <div className="uu-row uu-gap-8">
            {detailIsNew && canManageUnrealProjects ? (
              <button
                className="uu-btn"
                onClick={createProjectFromDraft}
              >
                {t('projects.detail.buttons.add')}
              </button>
            ) : null}
            {detailIsNew ? null : (
              <>
                {canManageUnrealProjects && showProjectActivation ? (
                  <button
                    className={`uu-btn ${isActiveDetail ? 'prod-toggle-active' : ''}`}
                    onClick={() => { activateOne(detailId); }}
                    disabled={isActiveDetail}
                  >
                    {isActiveDetail ? t('projects.server.card.active') : t('projects.server.card.setActive')}
                  </button>
                ) : null}
                {canManageUnrealProjects && (showProjectActivation ? isActiveDetail : true) ? (
                  <button
                    className={showProjectActivation ? 'uu-btn prod-toggle-active' : 'uu-btn'}
                    onClick={() => { startIntegration(detailId); }}
                  >
                    {t('launch.buttons.start')}
                  </button>
                ) : null}
                {canCreateTaskFromProject && isAutoRenderUsage(detailMeta?.usageMode, detailMeta?.status) ? (
                  <button
                    className="uu-btn"
                    onClick={() => { createTaskFromProject(detailId); }}
                  >
                    {t('projects.actions.createTask', 'Rendu')}
                  </button>
                ) : null}
                {canManageUnrealProjects ? (
                  <button className="uu-btn" onClick={() => { removeOne(detailId); setDetailId(''); }}>{t('projects.server.card.delete')}</button>
                ) : null}
              </>
            )}
          </div>
        </div>

        {snapshotOpen ? (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              zIndex: 9999,
            }}
            onClick={() => { if (!snapshotBusy) { setSnapshotOpen(null); setSnapshotMsg(''); setSnapshotMsgType(''); } }}
          >
            <div
              className="uu-card"
              style={{
                width: 'min(1200px, 95vw)',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: '12px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
                <strong className="uu-block-title">{t('projects.snapshots.title')}</strong>
                <span className="uu-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {snapshotOpen.rel || ''}
                </span>
                <button
                  type="button"
                  className="uu-btn"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => { setSnapshotOpen(null); setSnapshotMsg(''); setSnapshotMsgType(''); }}
                  disabled={snapshotBusy}
                >
                  {t('common.close')}
                </button>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={snapshotSrc(detailId, snapshotOpen.rel, snapshotOpen.mtime)}
                  alt=""
                  style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }}
                />
              </div>

              <div className="uu-row uu-gap-8 mt-12">
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => { if (snapshotOpen.path) window.electron?.openPath?.(snapshotOpen.path); }}
                  disabled={!snapshotOpen.path}
                >
                  {t('projects.snapshots.openInExplorer')}
                </button>
                <button
                  type="button"
                  className="uu-btn"
                  onClick={() => setAutoScreenshotFromSnapshot(snapshotOpen.rel || snapshotOpen.path, snapshotOpen.mtime)}
                  disabled={snapshotBusy || !(snapshotOpen.rel || snapshotOpen.path)}
                >
                  {t('projects.snapshots.setAsThumbnail')}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {renderConfirmDialog()}
      </div>
    );
  }

  /* ---------------- Rendu principal ---------------- */
  return (
    <div className="uu-page uu-page-compact">
      
      {/* Bandeau "Projet actif" (live uniquement) */}
      {showProjectActivation ? (
        <div className="uu-section">
          {role === 'server' ? (
            <div className="uu-kv">
              {canOpenProjectDetails && activeId ? (
                <button className="uu-btn" onClick={() => openDetails(activeId)}>
                  {t('projects.actions.edit')}
                </button>
              ) : null}
              <span className="uu-k">{t('projects.active.label')}</span>
              <span className="uu-v">
                {projectsLoading
                  ? t('projects.active.loading')
            : (activeName || t('projects.active.none'))}{' '}
                {activeId ? (
                  <span className="uu-id-tag uu-muted">[{activeId}]</span>
                ) : null}
              </span>
            </div>
          ) : (
            <div className="uu-kv">
              <span className="uu-k">{t('projects.active.label')}</span>
              <span className="uu-v">
                {projectsLoading
                  ? t('projects.active.loading')
            : (clientActiveName || t('projects.active.none'))}{' '}
                {clientActiveId ? <span className="uu-id-tag uu-muted">[{clientActiveId}]</span> : null}
              </span>
            </div>
          )}
        </div>
      ) : null}

      {role === 'server' ? (
        <>
          {/* Section : bouton + tri OU formulaire */}
          <div className="uu-section">
            {/* Quand on n’édite pas : bouton + tri */}
            {!formVisible && (
              <Suspense fallback={lazyBlockFallback}>
                <ProjectsHeaderBar
                  t={t}
                  sortMode={sortMode}
                  onSortChange={(val) => handleSort(val)}
                  searchQuery={searchQuery}
                  favoriteOnly={favoriteOnly}
                  onToggleFavoriteFilter={() => setFavoriteOnly((prev) => !prev)}
                  onSearchChange={setSearchQuery}
                  onSearchClear={() => {
                    setSearchQuery('');
                    setFavoriteOnly(false);
                    setSearchAdvanced(createInitialAdvanced());
                    setSearchExpanded(false);
                  }}
                  canClear={!!searchQuery || favoriteOnly || hasAdvancedFilters || searchExpanded}
                  onAdvanced={() => setSearchExpanded(true)}
                  viewMode={viewMode}
                  onViewChange={setViewMode}
                  onAdd={startAddProject}
                  canAdd={canManageUnrealProjects}
                />
              </Suspense>
            )}

            {/* Quand on édite / ajoute : on affiche ton formulaire */}
            {formVisible && (
              <Suspense fallback={lazyBlockFallback}>
                <ProjectForm
                  t={t}
                  form={form}
                  setForm={setForm}
                  formError={formError}
                  onSubmit={submitForm}
                  onCancel={cancelForm}
                  editingIndex={editingIndex}
                  noteRef={noteRef}
                  normalizePath={normPath}
                  clearFormError={() => setFormError('')}
                  onBrowse={async () => {
                    let file = await window.electron?.chooseUproject?.({
                      defaultPath: getUprojectDialogDefaultPath(form.projectPath),
                    });
                    if (file && typeof file === 'object') {
                      file = file.file || file.path || (Array.isArray(file) ? file[0] : '');
                    }
                    if (file) {
                      setForm((f) => ({ ...f, projectPath: normPath(file) }));
                    }
                  }}
                />
              </Suspense>
            )}
          </div>

          {/* Section : liste des projets (triés) */}
          {searchExpanded && (
            <div className="uu-card uu-col uu-gap-12" style={{ marginBottom: '16px' }}>
              <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
                <strong className="uu-block-title">{t('projects.search.advancedTitle')}</strong>
                <div className="uu-muted">
                  {filteredProjects.length ? `(${filteredProjects.length} ${t('projects.search.resultsLabel')})` : ''}
                </div>
              </div>

              <div className="uu-col uu-gap-12">
                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.status')}</label>
                    <Suspense fallback={lazyInlineFallback}>
                      <MultiSelectDropdown
                        options={[
                          { value: 'Test', label: t('projects.detail.status.test') },
                          { value: 'In progress', label: t('projects.detail.status.in_progress') },
                          { value: 'A modifier', label: t('projects.detail.status.to_modify') },
                          { value: 'PAD', label: t('projects.detail.status.pas') },
                          { value: 'Archive', label: t('projects.detail.status.archive') },
                        ]}
                        values={searchAdvanced.status}
                        onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, status: vals }))}
                        placeholder={noneLabel}
                        noneLabel={noneLabel}
                        style={{ width: '500px', minWidth: '500px', maxWidth: '500px' }}
                      />
                    </Suspense>
                  </div>
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.type')}</label>
                    <Suspense fallback={lazyInlineFallback}>
                      <MultiSelectDropdown
                        options={[
                          { value: 'Réalité augmentée', label: t('projects.detail.type.ar') },
                          { value: 'Green Screen', label: t('projects.detail.type.green') },
                          { value: 'NDisplay', label: t('projects.detail.type.ndisplay') },
                          { value: 'Motion Design', label: t('projects.detail.type.motion') },
                          { value: 'Blueprint', label: t('projects.detail.type.blueprint') },
                          { value: 'Plugin', label: t('projects.detail.type.plugin') },
                          { value: 'Scène Unreal', label: t('projects.detail.type.scene') },
                          { value: 'Movie Render Cue', label: t('projects.detail.type.movie_render_cue') },
                        ]}
                        values={searchAdvanced.type}
                        onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, type: vals }))}
                        placeholder={noneLabel}
                        noneLabel={noneLabel}
                        style={{ width: '520px', minWidth: '520px', maxWidth: '520px' }}
                      />
                    </Suspense>
                  </div>
                </div>

                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.usageMode')}</label>
                    <Suspense fallback={lazyInlineFallback}>
                      <MultiSelectDropdown
                        options={[
                          { value: 'live', label: t('projects.detail.usageMode.live') },
                          { value: 'auto_render', label: t('projects.detail.usageMode.auto_render') },
                          { value: 'live_auto_render', label: t('projects.detail.usageMode.live_auto_render') },
                          { value: 'other', label: t('projects.detail.usageMode.other') },
                        ]}
                        values={searchAdvanced.usageMode}
                        onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, usageMode: vals }))}
                        placeholder={noneLabel}
                        noneLabel={noneLabel}
                        style={{ width: '500px', minWidth: '500px', maxWidth: '500px' }}
                      />
                    </Suspense>
                  </div>
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.table.engineVersion')}</label>
                    <Suspense fallback={lazyInlineFallback}>
                      <MultiSelectDropdown
                        options={engineVersionOptions}
                        values={searchAdvanced.engineVersion}
                        onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, engineVersion: vals }))}
                        placeholder={noneLabel}
                        noneLabel={noneLabel}
                        style={{ width: '520px', minWidth: '520px', maxWidth: '520px' }}
                      />
                    </Suspense>
                  </div>
                </div>

                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.director')}</label>
                    <select
                      className="uu-select"
                      style={{ width: '500px', minWidth: '500px', maxWidth: '500px', height: '36px' }}
                      value={searchAdvanced.director}
                      onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, director: e.target.value }))}
                    >
                      <option value="">{noneLabel}</option>
                      {directorOptions.map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.technician')}</label>
                    <select
                      className="uu-select"
                      style={{ width: '520px', minWidth: '520px', maxWidth: '520px', height: '36px' }}
                      value={searchAdvanced.technician}
                      onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, technician: e.target.value }))}
                    >
                      <option value="">{noneLabel}</option>
                      {technicianOptions.map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.operator')}</label>
                    <select
                      className="uu-select"
                      style={{ width: '500px', minWidth: '500px', maxWidth: '500px', height: '36px' }}
                      value={searchAdvanced.operator}
                      onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, operator: e.target.value }))}
                    >
                      <option value="">{noneLabel}</option>
                      {operatorOptions.map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.journalist')}</label>
                    <select
                      className="uu-select"
                      style={{ width: '520px', minWidth: '520px', maxWidth: '520px', height: '36px' }}
                      value={searchAdvanced.journalist}
                      onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, journalist: e.target.value }))}
                    >
                      <option value="">{noneLabel}</option>
                      {journalistOptions.map((val) => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.keywords')}</label>
                    <input
                      className="uu-input"
                      style={{ width: '500px', minWidth: '500px', maxWidth: '500px' }}
                      value={searchAdvanced.tags}
                      onChange={(e) => setSearchAdvanced((prev) => ({ ...prev, tags: e.target.value }))}
                      placeholder={t('projects.search.placeholderTags')}
                    />
                  </div>
                </div>
              </div>

                <div className="uu-row uu-align-center uu-gap-8">
                  <button
                    type="button"
                    className="uu-btn"
                    onClick={() => { setSearchExpanded(false); setSearchQuery(''); setSearchAdvanced(createInitialAdvanced()); }}
                  >
                    {t('projects.search.close')}
                  </button>
                </div>
              </div>
            )}
          <div className=" ">
            {projectsWithActive.length === 0 && (
              <div className="uu-muted">
          {projectsLoading ? t('projects.detail.loading') : t('projects.server.empty')}
              </div>
            )}

            {projectsWithActive.length > 0 && (
              <div className="uu-row uu-gap-12 uu-align-center" style={{ margin: '12px 0' }}>
                <div className="uu-row uu-gap-6 uu-align-center">
                  {canPrevPage && (
                    <button
                      type="button"
                      className="uu-btn"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      aria-label={t('projects.pagination.prevAria')}
                    >
                      ‹
                    </button>
                  )}
                  <span className="uu-muted">
                    {`Page ${currentPage + 1}/${totalPages}`}
                  </span>
                  {canNextPage && (
                    <button
                      type="button"
                      className="uu-btn"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      aria-label={t('projects.pagination.nextAria')}
                    >
                      ›
                    </button>
                  )}
                  <select
                    className="uu-select"
                    value={pageSize}
                    onChange={(e) => setPageSize(Math.max(10, Number(e.target.value) || 50))}
                    style={{ width: '80px' }}
                    aria-label={t('projects.pagination.pageSizeAria')}
                  >
                    {[25, 50, 100, 200].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {projectsWithActive.length > 0 && viewMode === 'cards' && (
              <Suspense fallback={lazyBlockFallback}>
                <ProjectsCardsView
                  t={t}
                  projects={visibleProjects}
                  versionEl={versionEl}
                  openDetails={openDetails}
                  activateOne={activateOne}
                  onToggleFavorite={handleToggleFavorite}
                  onCreateTaskFromProject={createTaskFromProject}
                  startIntegration={startIntegration}
                  stopIntegration={stopIntegration}
                  serverHost={serverHost}
                  serverRunning={serverRunning}
                  integrationBusy={integrationBusy}
                  integrationMsg={integrationMsg}
                  integrationMsgType={integrationMsgType}
                  removeOne={removeOne}
                  canManageUnrealProjects={canManageUnrealProjects}
                  canEditProjectFields={canEditFields}
                  canCreateTasks={canCreateTaskFromProject}
                  isAutoRenderUsage={isAutoRenderUsage}
                  showActivationControls={showProjectActivation}
                />
              </Suspense>
            )}

            {projectsWithActive.length > 0 && viewMode === 'list' && (
              <Suspense fallback={lazyBlockFallback}>
                <ProjectsListView
                  t={t}
                  projects={visibleProjects}
                  versionEl={versionEl}
                  openDetails={openDetails}
                  activateOne={activateOne}
                  onCreateTaskFromProject={createTaskFromProject}
                  onToggleFavorite={handleToggleFavorite}
                  startIntegration={startIntegration}
                  stopIntegration={stopIntegration}
                  serverHost={serverHost}
                  serverRunning={serverRunning}
                  integrationBusy={integrationBusy}
                  sortMode={sortMode}
                  sortDir={sortDir}
                  onSort={handleSort}
                  canManageUnrealProjects={canManageUnrealProjects}
                  canEditProjectFields={canEditFields}
                  canCreateTasks={canCreateTaskFromProject}
                  isAutoRenderUsage={isAutoRenderUsage}
                  showActivationControls={showProjectActivation}
                />
              </Suspense>
            )}

            {projectsWithActive.length > 0 && viewMode === 'thumbs' && (
              <Suspense fallback={lazyBlockFallback}>
                <ProjectsThumbsView
                  t={t}
                  projects={visibleProjects}
                  versionEl={versionEl}
                  openDetails={openDetails}
                  activateOne={activateOne}
                  onToggleFavorite={handleToggleFavorite}
                  onCreateTaskFromProject={createTaskFromProject}
                  startIntegration={startIntegration}
                  stopIntegration={stopIntegration}
                  serverHost={serverHost}
                  serverRunning={serverRunning}
                  integrationBusy={integrationBusy}
                  canManageUnrealProjects={canManageUnrealProjects}
                  canEditProjectFields={canEditFields}
                  canCreateTasks={canCreateTaskFromProject}
                  isAutoRenderUsage={isAutoRenderUsage}
                  showActivationControls={showProjectActivation}
                />
              </Suspense>
            )}
          </div>
        </>
      ) : (
        /* bloc client inchangé */
        <div className="uu-section uu-maxw-640">
          {!clientActiveName ? (
            <div className="uu-muted">
              {t('projects.client.noActiveServer')}
            </div>
          ) : (
            <>
              <div className="uu-row">
                <div className="uu-label w-160">{t('projects.client.activeLabel')}</div>
                <div className="uu-value">
                  <span className="uu-id-tag">
                    [{clientActiveId || '----'}]
                  </span>
                  {clientActiveName}
                </div>
              </div>

              <div className="uu-grid-field mt-12">
                <label className="uu-label">{t('projects.client.pathLabel')}</label>
                <div className="uu-grid-2">
                  <input
                    className="uu-input"
                    value={clientAssocPath}
                    readOnly
                    placeholder="D:\\Projets\\MonJeu\\MonJeu.uproject"
                  />
                <button
                  type="button"
                  className="uu-btn"
                  onClick={handleAssociateForClientActive}
                  disabled={!clientActiveName || clientSyncEnabled}
                >
                  {t('projects.client.associateButton')}
                </button>
                </div>
              </div>

              {clientSyncEnabled && (
                <div className="uu-message uu-message-info">
                  {t('projects.client.syncInfo.line1')}
                  <br />
                  {t('projects.client.syncInfo.line2')}
                  <br />
                  {t('projects.client.syncInfo.line3')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {renderConfirmDialog()}
    </div>
  );
}

// MultiSelectDropdown moved to component file
