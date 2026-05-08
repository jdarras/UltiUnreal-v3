// app/screens/projects.jsx
import React from 'react';
import {
  getCommon,
  getProjectMeta,
  saveProjectMeta,
  setProjectDefaultMaps,
  setProjectVersion as agentSetProjectVersion,
  getProjects as agentGetProjects,
  postProjects as agentPostProjects,
  setProjectAssociation,
  getHosts,
  postLaunch,
  postStop,
  postCommon,
  getOnlineMap,
  getProjectRenderBridgeStatus,
  installProjectRenderBridge,
} from '../utils/agent';
import { createT } from '../i18n';
import {
  getLocalIp,
  normPath,
  isUproject,
  padId,
  normalizeThumbnailPath,
  mapRelToAssetPath,
  mapRelToAssetPathNoDot,
  formatFixed2,
} from '../utils/projects-helpers';
import {
  SORT_STORAGE_KEY,
  FAVORITE_STORAGE_KEY,
  SORT_MODE_OPTIONS,
  getUprojectDialogDefaultPath,
  normalizeKeyword,
  normalizeKeywordsList,
  collectReferentOptions,
} from '../utils/projectsScreenUtils';
import ProjectsHeaderBar from '../components/ProjectsHeaderBar';
import ProjectsListView from '../components/ProjectsListView';
import ProjectsCardsView from '../components/ProjectsCardsView';
import ProjectForm from '../components/ProjectForm';
import ProjectsThumbsView from '../components/ProjectsThumbsView';
import HttpBindBlock from '../components/HttpBindBlock';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import useFilteredProjects from '../utils/useFilteredProjects';
import { readIdentity } from '../utils/identity';
import { useSnapshots } from './hooks/useSnapshots';
import { useVideoProduction } from './hooks/useVideoProduction';
import { useHttpBind } from './hooks/useHttpBind';
import { NoticeContext } from '../NoticeContext';

const PROJECTS_FAVORITES_STORAGE_KEY = 'uu_projects_favorites';
const POSTPROD_AUTH_STORAGE_KEY = 'uu_postprod_auth';

function normalizeScopeValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '_');
}

function resolveFavoritesUserScope(identity = {}) {
  const candidates = [
    Number.isFinite(Number(identity?.postprodUserId)) ? `id:${Number(identity.postprodUserId)}` : '',
    identity?.postprodUserPublicId ? `public:${identity.postprodUserPublicId}` : '',
    identity?.postprodUsername ? `username:${identity.postprodUsername}` : '',
    identity?.username ? `username:${identity.username}` : '',
  ];
  for (const candidate of candidates) {
    const normalized = normalizeScopeValue(candidate);
    if (normalized) return normalized;
  }
  try {
    const raw = localStorage.getItem(POSTPROD_AUTH_STORAGE_KEY) || '';
    const parsed = raw ? JSON.parse(raw) : {};
    const user = parsed?.user && typeof parsed.user === 'object' ? parsed.user : {};
    const fallbackCandidates = [
      Number.isFinite(Number(user?.id)) ? `id:${Number(user.id)}` : '',
      user?.publicId ? `public:${user.publicId}` : '',
      user?.username ? `username:${user.username}` : '',
    ];
    for (const candidate of fallbackCandidates) {
      const normalized = normalizeScopeValue(candidate);
      if (normalized) return normalized;
    }
  } catch {
    // noop
  }
  return 'anonymous';
}

function readBooleanFlag(value, fallback = false) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
}

function readFavoriteMap(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out = {};
    Object.entries(parsed).forEach(([projectIdRaw, val]) => {
      const projectId = String(projectIdRaw || '').trim();
      if (!projectId) return;
      if (val === true) out[projectId] = true;
    });
    return out;
  } catch {
    return {};
  }
}

function writeFavoriteMap(storageKey, map) {
  try {
    const payload = {};
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      Object.entries(map).forEach(([projectIdRaw, val]) => {
        const projectId = String(projectIdRaw || '').trim();
        if (!projectId) return;
        if (val === true) payload[projectId] = true;
      });
    }
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // noop
  }
}

function applyFavoritesToProjects(list = [], favoritesMap = {}) {
  const map = favoritesMap && typeof favoritesMap === 'object' && !Array.isArray(favoritesMap)
    ? favoritesMap
    : {};
  return (Array.isArray(list) ? list : []).map((project) => {
    const projectId = String(project?.id || '').trim();
    return {
      ...project,
      favorite: projectId ? map[projectId] === true : false,
    };
  });
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
  // canEditProjectFields defaults to canManageUnrealProjects when not explicitly set
  const canEditFields = canEditProjectFields !== null ? canEditProjectFields : canManageUnrealProjects;
  const canOpenProjectDetails = canManageUnrealProjects || canEditFields;
  const id = React.useMemo(readIdentity, []);
  const role = String(id.role || '').trim() || 'server';
  const localIp = getLocalIp();
  const favoritesUserScope = React.useMemo(() => resolveFavoritesUserScope(id), [id]);
  const favoritesFilterStorageKey = React.useMemo(
    () => `${FAVORITE_STORAGE_KEY}:${favoritesUserScope}`,
    [favoritesUserScope]
  );
  const favoritesStorageKey = React.useMemo(
    () => `${PROJECTS_FAVORITES_STORAGE_KEY}:${favoritesUserScope}`,
    [favoritesUserScope]
  );

  const lang = String(id.lang || 'fr').trim();
  const t = React.useMemo(() => createT(lang), [lang]);
  const currentMode = String(appMode || id.mode || '').trim().toLowerCase();
  const isPostprodMode = currentMode === 'postprod';
  const noticeApi = React.useContext(NoticeContext);
  // Serveur
  const [projects, setProjects] = React.useState([]);            // [{id,name,uproject}]
  const [activeName, setActiveName] = React.useState('');
  const [activeId, setActiveId] = React.useState('');            // NEW
  const [activeByHost, setActiveByHost] = React.useState({});
  const [formVisible, setFormVisible] = React.useState(false);
  const [formError, setFormError] = React.useState('');
  const [serverHost, setServerHost] = React.useState(null);      // {ip,...}
  const [serverRunning, setServerRunning] = React.useState(false);
  const [integrationBusy, setIntegrationBusy] = React.useState(false);
  const [integrationMsg, setIntegrationMsg] = React.useState('');
  const [integrationMsgType, setIntegrationMsgType] = React.useState('');
  const [confirmDialog, setConfirmDialog] = React.useState({
    open: false,
    message: '',
  });
  const confirmResolveRef = React.useRef(null);
  const confirmPrevFocusRef = React.useRef(null);
  const confirmOkBtnRef = React.useRef(null);
  const [editingIndex, setEditingIndex] = React.useState(null);
  const [form, setForm] = React.useState({
    name: '',
    projectPath: '',
    note: '',
    createdAt: '',
  });
  const [nextId, setNextId] = React.useState(1);
  const [viewMode, setViewMode] = React.useState(() => {
    try {
      const stored = localStorage.getItem('uu_projects_view');
      if (stored === 'cards' || stored === 'list' || stored === 'thumbs') return stored;
    } catch {}
    return 'thumbs'; // défaut : miniatures
  }); // cards | list | thumbs
  const [knownVersions, setKnownVersions] = React.useState([]);
  const [detailWrcNames, setDetailWrcNames] = React.useState([]);
  const [detailId, setDetailId] = React.useState('');
  const [detailName, setDetailName] = React.useState('');
  const [detailMeta, setDetailMeta] = React.useState(null);
  const detailMetaRef = React.useRef(null);
  const [keywordsInput, setKeywordsInput] = React.useState('');
  const [detailInsights, setDetailInsights] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detailPath, setDetailPath] = React.useState('');
  const [httpBindMsg, setHttpBindMsg] = React.useState('');
  const [httpBindMsgType, setHttpBindMsgType] = React.useState('');
  const [projectsLoading, setProjectsLoading] = React.useState(true);
  const [detailMsg, setDetailMsg] = React.useState('');
  const [detailIsNew, setDetailIsNew] = React.useState(false);
  const [projectVersion, setProjectVersion] = React.useState('');
  const [projectVersionMsg, setProjectVersionMsg] = React.useState('');
  const [projectVersionMsgType, setProjectVersionMsgType] = React.useState(''); // ok | error
  const [projectVersionBusy, setProjectVersionBusy] = React.useState(false);
  const [indexationMsg, setIndexationMsg] = React.useState('');
  const [indexationMsgType, setIndexationMsgType] = React.useState(''); // ok | error
  const [renderBridgeStatus, setRenderBridgeStatus] = React.useState(null);
  const [renderBridgeBusy, setRenderBridgeBusy] = React.useState(false);
  const [renderBridgeMsg, setRenderBridgeMsg] = React.useState('');
  const [renderBridgeMsgType, setRenderBridgeMsgType] = React.useState(''); // ok | error
  const renderBridgeAutoInstallAttemptRef = React.useRef(new Set());
  const [intervenantsMsg, setIntervenantsMsg] = React.useState('');
  const [intervenantsMsgType, setIntervenantsMsgType] = React.useState(''); // ok | error
  const detailNoteRef = React.useRef(null);
  const detailSavedNoteRef = React.useRef('');
  const detailNoteDirtyRef = React.useRef(false);
  const {
    snapshotOpen,
    snapshotBusy,
    snapshotMsg,
    snapshotMsgType,
    setSnapshotOpen,
    setSnapshotBusy,
    setSnapshotMsg,
    setSnapshotMsgType,
    snapshotSrc,
    setAutoScreenshotFromSnapshot
  } = useSnapshots({ t, detailId, setDetailMeta, setProjects });
  const {
    httpBindBusy,
    httpBindEditing,
    httpBindDraft,
    setHttpBindDraft,
    httpBindDisplay,
    httpBindDisplayClass,
    httpIniExists,
    httpBindDraftValid,
    httpBindInlineMsg,
    httpBindInlineClass,
    canEditHttpBind,
    startHttpBindEdit,
    cancelHttpBindEdit,
    saveHttpBindAddress,
    resetHttpBind,
  } = useHttpBind({ detailInsights, detailId, detailIsNew, t, setDetailInsights });
  const [mapsMsg, setMapsMsg] = React.useState('');
  const [mapsMsgType, setMapsMsgType] = React.useState(''); // ok | error
  const [mapsBusy, setMapsBusy] = React.useState(false);
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
    } else {
      // ne pas effacer la notice globale pour conserver l'affichage commun
    }
  }, [
    integrationMsg,
    integrationMsgType,
    httpBindMsg,
    httpBindMsgType,
    detailMsg,
    projectVersionMsg,
    projectVersionMsgType,
    indexationMsg,
    indexationMsgType,
    renderBridgeMsg,
    renderBridgeMsgType,
    intervenantsMsg,
    intervenantsMsgType,
    snapshotMsg,
    snapshotMsgType,
    mapsMsg,
    mapsMsgType,
    noticeApi
  ]);

  React.useEffect(() => {
    return () => {
      if (confirmResolveRef.current) {
        try {
          confirmResolveRef.current(false);
        } catch {
          // noop
        }
        confirmResolveRef.current = null;
      }
    };
  }, []);

  function closeConfirmDialog(ok) {
    const resolve = confirmResolveRef.current;
    confirmResolveRef.current = null;
    setConfirmDialog((prev) => (prev.open ? { ...prev, open: false } : prev));
    if (resolve) resolve(!!ok);

    setTimeout(() => {
      try {
        window.focus();
      } catch {
        // noop
      }
      const el = confirmPrevFocusRef.current;
      confirmPrevFocusRef.current = null;
      if (el && typeof el.focus === 'function' && el.isConnected !== false) {
        try {
          el.focus({ preventScroll: true });
        } catch {
          try {
            el.focus();
          } catch {
            // noop
          }
        }
      }
    }, 0);
  }

  function requestConfirm(message) {
    const msg = String(message || '').trim();
    return new Promise((resolve) => {
      if (confirmResolveRef.current) {
        try {
          confirmResolveRef.current(false);
        } catch {
          // noop
        }
      }
      const activeEl =
        typeof document !== 'undefined' && document?.activeElement
          ? document.activeElement
          : null;
      confirmPrevFocusRef.current =
        activeEl && typeof activeEl.focus === 'function' ? activeEl : null;
      confirmResolveRef.current = resolve;
      setConfirmDialog({ open: true, message: msg });
    });
  }

  React.useEffect(() => {
    if (!confirmDialog.open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeConfirmDialog(false);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        closeConfirmDialog(true);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const timer = setTimeout(() => {
      confirmOkBtnRef.current?.focus?.();
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [confirmDialog.open]);

  function renderConfirmDialog() {
    if (!confirmDialog.open) return null;
    const title = t('production.confirm.title') || 'Confirmation';
    const labelCancel =
      t('production.confirm.cancel') || t('app.quit.confirm.cancel') || 'Annuler';
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
          style={{
            width: 'min(460px, calc(100vw - 32px))',
            padding: '16px'
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div style={{ fontWeight: 600, marginBottom: '10px' }}>
            {title}
          </div>
          <div style={{ marginBottom: '14px', lineHeight: 1.35 }}>
            {confirmDialog.message}
          </div>
          <div className="uu-row" style={{ justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="uu-btn"
              onClick={() => closeConfirmDialog(false)}
            >
              {labelCancel}
            </button>
            <button
              ref={confirmOkBtnRef}
              type="button"
              className="uu-btn prod-toggle-active"
              onClick={() => closeConfirmDialog(true)}
            >
              {labelOk}
            </button>
          </div>
        </div>
      </div>
    );
  }
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
  const {
    vpDraft,
    setVpDraft,
    setVpMsg,
    setVpMsgType,
    vpBusy,
    setVpBusy,
    scheduleVpSave
  } = useVideoProduction({ t, detailId, detailIsNew, detailInsights, setDetailInsights });
  const pendingDetailIdRef = React.useRef('');
  const pendingStartRef = React.useRef(false);
  const fullProjectsReloadAttemptedRef = React.useRef(false);
  // Tri des projets : 'name' | 'createdAt' | 'lastModified'
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
  }); // asc | desc
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchExpanded, setSearchExpanded] = React.useState(false);
  const [projectFavorites, setProjectFavorites] = React.useState(() => readFavoriteMap(favoritesStorageKey));
  const projectFavoritesRef = React.useRef(projectFavorites);
  const [favoriteOnly, setFavoriteOnly] = React.useState(() => {
    return readBooleanFlag(localStorage.getItem(favoritesFilterStorageKey), false);
  });
  const initialAdvanced = {
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
  const [searchAdvanced, setSearchAdvanced] = React.useState(initialAdvanced);
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
  const isRenderBridgeUsage = React.useCallback((usageMode) => {
    const mode = String(usageMode || '').trim();
    return mode === 'auto_render' || mode === 'live_auto_render';
  }, []);
  const loadRenderBridgeStatus = React.useCallback(async (projectId) => {
    const pid = String(projectId || '').trim();
    if (!pid) {
      setRenderBridgeStatus(null);
      return { ok: false, error: 'missing projectId' };
    }
    setRenderBridgeBusy(true);
    setRenderBridgeMsg('');
    setRenderBridgeMsgType('');
    try {
      const res = await getProjectRenderBridgeStatus(pid);
      if (res && res.ok) {
        setRenderBridgeStatus(res);
        return res;
      }
      setRenderBridgeStatus(null);
      setRenderBridgeMsg(t('projects.detail.renderBridge.statusError'));
      setRenderBridgeMsgType('error');
      return res || { ok: false, error: 'status_failed' };
    } catch {
      setRenderBridgeStatus(null);
      setRenderBridgeMsg(t('projects.detail.renderBridge.statusError'));
      setRenderBridgeMsgType('error');
      return { ok: false, error: 'status_failed' };
    } finally {
      setRenderBridgeBusy(false);
    }
  }, [t]);
  const installRenderBridgeForDetail = React.useCallback(async (projectIdOverride = '', options = {}) => {
    const pid = String(projectIdOverride || detailId || '').trim();
    const silentSuccess = options?.silentSuccess === true;
    if (!pid) return;
    setRenderBridgeBusy(true);
    setRenderBridgeMsg('');
    setRenderBridgeMsgType('');
    try {
      const res = await installProjectRenderBridge(pid);
      if (res && res.ok) {
        setRenderBridgeStatus(res);
        if (!silentSuccess) {
          setRenderBridgeMsg(t('projects.detail.renderBridge.installOk'));
          setRenderBridgeMsgType('ok');
        }
      } else {
        setRenderBridgeMsg(t('projects.detail.renderBridge.installError'));
        setRenderBridgeMsgType('error');
      }
    } catch {
      setRenderBridgeMsg(t('projects.detail.renderBridge.installError'));
      setRenderBridgeMsgType('error');
    } finally {
      setRenderBridgeBusy(false);
      await loadRenderBridgeStatus(pid);
    }
  }, [detailId, loadRenderBridgeStatus, t]);
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
  const directorOptions = React.useMemo(
    () => collectReferentOptions(projects, 'director'),
    [projects]
  );
  const technicianOptions = React.useMemo(
    () => collectReferentOptions(projects, 'technician'),
    [projects]
  );
  const operatorOptions = React.useMemo(
    () => collectReferentOptions(projects, 'operator'),
    [projects]
  );
  const journalistOptions = React.useMemo(
    () => collectReferentOptions(projects, 'journalist'),
    [projects]
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
  const detailKeywordsList = React.useMemo(
    () => normalizeKeywordsList(detailMeta?.keywords),
    [detailMeta?.keywords]
  );
  const detailKeywordsSet = React.useMemo(
    () => new Set(detailKeywordsList.map((k) => k.toLowerCase())),
    [detailKeywordsList]
  );

  // Ajuster la hauteur de la zone de note (vue détail) à chaque mise à jour du contenu
  React.useEffect(() => {
    const el = detailNoteRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [detailMeta?.note, detailNoteRef]);
  const keywordsDirtyRef = React.useRef(false);
  const addKeywordToDraft = React.useCallback((raw) => {
    const parts = String(raw || '')
      .split(/[,;\n]+/)
      .map((s) => normalizeKeyword(s))
      .filter(Boolean);

    if (!parts.length) {
      setKeywordsInput('');
      return;
    }

    const seen = new Set(detailKeywordsSet);
    const toAdd = [];
    parts.forEach((kw) => {
      if (seen.has(kw)) return;
      seen.add(kw);
      toAdd.push(kw);
    });

    if (!toAdd.length) {
      setKeywordsInput('');
      return;
    }

    const next = [...detailKeywordsList, ...toAdd];
    updateDetailField('keywords', next);
    setKeywordsInput('');
    keywordsDirtyRef.current = true;
  }, [detailKeywordsList, detailKeywordsSet, updateDetailField, scheduleSave]);
  const removeKeywordFromDraft = React.useCallback((kw) => {
    const key = normalizeKeyword(kw);
    if (!key) return;
    const next = detailKeywordsList.filter((t) => normalizeKeyword(t) !== key);
    updateDetailField('keywords', next);
    keywordsDirtyRef.current = true;
  }, [detailKeywordsList, updateDetailField, scheduleSave]);
  const handleKeywordKeyDown = React.useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeywordToDraft(keywordsInput);
    }
  }, [addKeywordToDraft, keywordsInput]);

  React.useEffect(() => {
    detailMetaRef.current = detailMeta;
  }, [detailMeta]);

  React.useEffect(() => {
    setKeywordsInput('');
  }, [detailId, detailMeta?.keywords]);

  const projectsWithActive = React.useMemo(
    () => filteredProjects.map((p) => ({
      ...p,
      isActive:
        !!activeId &&
        String(activeId).trim() === String(p.id || '').trim(),
    })),
    [filteredProjects, activeId],
  );

  // Pagination (pour limiter le rendu DOM quand beaucoup de projets)
  React.useEffect(() => {
    setPage(0);
    try {
      localStorage.setItem('uu_projects_page_size', String(pageSize));
    } catch {}
  }, [filteredProjects.length, pageSize, sortMode, sortDir]);
  const totalProjects = projectsWithActive.length;
  const totalPages = Math.max(1, Math.ceil(totalProjects / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageStart = currentPage * pageSize;
  const visibleProjects = projectsWithActive.slice(pageStart, pageStart + pageSize);
  const canPrevPage = currentPage > 0;
  const canNextPage = currentPage < totalPages - 1;

  const httpBindVisible = !detailIsNew && !!detailId && (httpIniExists !== null);

  function handleSort(col) {
    if (sortMode === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortMode(col);
      setSortDir(col === 'name' ? 'asc' : 'desc');
    }
  }

  // Persister la vue sélectionnée
  React.useEffect(() => {
    try {
      localStorage.setItem('uu_projects_view', viewMode);
    } catch {}
  }, [viewMode]);

  // Persister le tri sélectionné (mode + direction)
  React.useEffect(() => {
    try {
      localStorage.setItem(
        SORT_STORAGE_KEY,
        JSON.stringify({ mode: sortMode, dir: sortDir })
      );
    } catch {}
  }, [sortMode, sortDir]);

  // Persister le filtre favoris
  React.useEffect(() => {
    try {
      localStorage.setItem(favoritesFilterStorageKey, favoriteOnly ? 'true' : 'false');
    } catch {}
  }, [favoriteOnly, favoritesFilterStorageKey]);

  React.useEffect(() => {
    projectFavoritesRef.current = projectFavorites;
  }, [projectFavorites]);

  React.useEffect(() => {
    const nextFavorites = readFavoriteMap(favoritesStorageKey);
    projectFavoritesRef.current = nextFavorites;
    setProjectFavorites(nextFavorites);
    setProjects((prev) => applyFavoritesToProjects(prev, nextFavorites));
    setFavoriteOnly(readBooleanFlag(localStorage.getItem(favoritesFilterStorageKey), false));
  }, [favoritesStorageKey, favoritesFilterStorageKey]);

  React.useEffect(() => {
    if (!detailId) return;
    const fav = projectFavorites[String(detailId || '').trim()] === true;
    setDetailMeta((prev) => (prev ? { ...prev, favorite: fav } : prev));
    const current = detailMetaRef.current;
    if (current && typeof current === 'object') {
      detailMetaRef.current = { ...current, favorite: fav };
    }
  }, [detailId, projectFavorites]);

  React.useEffect(() => {
    writeFavoriteMap(favoritesStorageKey, projectFavorites);
  }, [favoritesStorageKey, projectFavorites]);

  const knownVersionsSet = React.useMemo(
    () => new Set(knownVersions.map(v => String(v || '').trim().toLowerCase()).filter(Boolean)),
    [knownVersions]
  );
  const projectDropdownDirtyRef = React.useRef(false);

  function versionEl(v) {
    const s = String(v || '').trim();
    if (!s) return <span className="uu-version uu-version-empty">—</span>;
    const warn = !knownVersionsSet.has(s.toLowerCase());
    const cls = warn ? 'uu-version uu-version-warn' : 'uu-version uu-version-ok';
    const title = warn ? t('projects.version.unknown') : '';
    return <span className={cls} title={title}>{s}</span>;
  }

  // Sauvegarde forcée du détail courant avant fermeture/changement de projet
  async function closeDetailAndSave(nextDetailId = '') {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (!detailId || detailIsNew) {
      setDetailId(nextDetailId);
      return;
    }
    const pid = String(detailId || '').trim();
    if (!pid) {
      setDetailId(nextDetailId);
      return;
    }
    const metaSnapshot = detailMetaRef.current || detailMeta || {};
    const keywordsSnapshot = metaSnapshot.keywords
      ?? detailMetaRef.current?.keywords
      ?? detailMeta?.keywords
      ?? [];
    keywordsDirtyRef.current = false;
    projectDropdownDirtyRef.current = false; // flush dropdown dirty flag
    detailSavedNoteRef.current = String(metaSnapshot.note || '');
    detailNoteDirtyRef.current = false;
    try {
      await saveDetails(
        metaSnapshot,
        pid,
        detailPath,
        detailWrcNames,
        projectVersion,
        keywordsSnapshot,
        'indexation'
      );
    } catch {
      // on ferme quand même, mais on conserve les messages d’erreur éventuels
    } finally {
      setDetailId(nextDetailId);
    }
  }

  // Expose pour navigation "cliquable" sur l'onglet actif (Sidebar)
  React.useEffect(() => {
    window.__closeProjectDetail = async () => {
      await closeDetailAndSave('');
    };
    return () => {
      if (window.__closeProjectDetail) delete window.__closeProjectDetail;
    };
  }, [closeDetailAndSave]);

  async function openDetails(projectId) {
    const pid = String(projectId || '').trim();
    if (!pid) return;
    if (detailId && pid !== detailId) {
      await closeDetailAndSave(pid);
      // Recharger les refs locales après réouverture (le reste du flux ci-dessous)
    }
    const proj = projects.find(p => String(p.id || '').trim() === pid);
    setDetailIsNew(false);
    setDetailName(proj?.name || '');
    setDetailPath(proj?.uproject || proj?.projectPath || '');
    setDetailWrcNames(Array.isArray(proj?.wrcNames) ? proj.wrcNames : (proj?.wrcName ? [proj.wrcName] : []));
    setDetailId(pid);
    setDetailLoading(true);
    setDetailMsg('');
    resetHttpBind();
    setIndexationMsg('');
    setIndexationMsgType('');
    setRenderBridgeStatus(null);
    setRenderBridgeMsg('');
    setRenderBridgeMsgType('');
    setRenderBridgeBusy(false);
    setIntervenantsMsg('');
    setIntervenantsMsgType('');
    if (projectVersionTimer.current) clearTimeout(projectVersionTimer.current);
    setProjectVersion('');
    setProjectVersionMsg('');
    setProjectVersionMsgType('');
    setProjectVersionBusy(false);
    setSnapshotOpen(null);
    setSnapshotBusy(false);
    setSnapshotMsg('');
    setSnapshotMsgType('');
    setMapsMsg('');
    setMapsMsgType('');
    setMapsBusy(false);
    setVpMsg('');
    setVpMsgType('');
    setVpBusy(false);
    setVpDraft(null);
    setDetailMeta(null);
    setDetailInsights(null);
    try {
      const res = await getProjectMeta(pid);
      if (res && res.ok) {
        const metaRaw = res.meta || {};
        const normalizedStatus = metaRaw.status === 'PAS' ? 'PAD' : metaRaw.status;
        const insightsPv = String(res.insights?.projectVersion ?? '').trim();
        const isFavorite = projectFavoritesRef.current[String(pid || '').trim()] === true;
        const meta = {
          ...metaRaw,
          status: normalizedStatus,
          favorite: isFavorite,
          ...(insightsPv ? { fileVersion: insightsPv } : {}),
        };
        setDetailMeta(meta);
        detailSavedNoteRef.current = String(meta.note || '');
        detailNoteDirtyRef.current = false;
        setDetailInsights(res.insights || {});
        const initialPv = insightsPv || String(metaRaw.fileVersion ?? '').trim();
        setProjectVersion(initialPv);
        const update = {};
        if (typeof meta.note === 'string') update.note = meta.note;
        if (meta.status !== undefined) update.metaStatus = meta.status || '';
        if (meta.type !== undefined) update.metaType = meta.type || '';
        if (meta.usageMode !== undefined) update.metaUsageMode = String(meta.usageMode || '');
        if (meta.category !== undefined) update.metaCategory = String(meta.category || '');
        if (meta.fileVersion !== undefined) update.metaFileVersion = meta.fileVersion;
        if (meta.referents) update.metaReferents = meta.referents;
        if (meta.keywords) update.metaKeywords = Array.isArray(meta.keywords) ? meta.keywords : [];
        update.favorite = isFavorite;
        if (Object.keys(update).length) {
          setProjects(prev =>
            prev.map(p =>
              String(p.id || '').trim() === pid ? { ...p, ...update } : p
            )
          );
        }
      } else {
        setDetailMeta({ favorite: projectFavoritesRef.current[String(pid || '').trim()] === true });
        detailSavedNoteRef.current = '';
        detailNoteDirtyRef.current = false;
        setDetailInsights({});
      }
    } catch {
      setDetailMeta({ favorite: projectFavoritesRef.current[String(pid || '').trim()] === true });
      detailSavedNoteRef.current = '';
      detailNoteDirtyRef.current = false;
      setDetailInsights({});
    } finally {
      setDetailLoading(false);
    }
  }

  React.useEffect(() => {
    if (!detailId || detailIsNew) {
      if (projectVersionTimer.current) clearTimeout(projectVersionTimer.current);
      setProjectVersion('');
      setProjectVersionMsg('');
      setProjectVersionMsgType('');
      setProjectVersionBusy(false);
      return;
    }
    const pv = String(detailInsights?.projectVersion ?? detailMeta?.fileVersion ?? '').trim();
    setProjectVersion(pv);
  }, [detailId, detailIsNew, detailInsights?.projectVersion, detailMeta?.fileVersion]);

  React.useEffect(() => {
    let cancelled = false;
    const pid = String(detailId || '').trim();
    const usageMode = String(detailMeta?.usageMode || '').trim();
    if (!pid || detailIsNew || !isRenderBridgeUsage(usageMode)) {
      setRenderBridgeStatus(null);
      setRenderBridgeMsg('');
      setRenderBridgeMsgType('');
      setRenderBridgeBusy(false);
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const res = await loadRenderBridgeStatus(pid);
      if (cancelled) return;
      if (res && res.ok === false) {
        setRenderBridgeStatus(null);
        return;
      }
      // Auto-install/update once per project open to keep the bridge transparent.
      const isReady = res?.ready === true;
      const packageAvailable = res?.packageAvailable === true;
      const alreadyAttempted = renderBridgeAutoInstallAttemptRef.current.has(pid);
      if (!isReady && packageAvailable && !alreadyAttempted) {
        renderBridgeAutoInstallAttemptRef.current.add(pid);
        await installRenderBridgeForDetail(pid, { silentSuccess: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId, detailIsNew, detailMeta?.usageMode, isRenderBridgeUsage, loadRenderBridgeStatus, installRenderBridgeForDetail]);

  // Fermer la page détail avec Échap
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

  // Quand la popup snapshot est ouverte, Échap ferme d'abord la popup
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

  async function saveDetails(metaOverride, pidOverride, pathOverride, wrcNamesOverride, pvOverride, keywordsOverride, source) {
    if (!canEditFields) return;
    if (detailIsNew) return;
    const pid = String(pidOverride || detailId || '').trim();
    if (!pid) return;
    const meta = metaOverride || detailMetaRef.current || detailMeta || {};
    const pathValue = pathOverride !== undefined ? pathOverride : detailPath;
    const wrcNamesValue = Array.isArray(wrcNamesOverride) ? wrcNamesOverride : detailWrcNames;
    const pvValue = pvOverride !== undefined ? pvOverride : projectVersion;
    const keywordsValue = keywordsOverride !== undefined
      ? keywordsOverride
      : (meta.keywords ?? detailMetaRef.current?.keywords ?? detailMeta?.keywords ?? []);
    const keywords = normalizeKeywordsList(keywordsValue);
    const payload = {
      status: meta.status === 'PAS' ? 'PAD' : (meta.status || ''),
      type: meta.type || '',
      usageMode: meta.usageMode || '',
      category: meta.category || '',
      fileVersion: pvValue || meta.fileVersion || '',
      referents: meta.referents || {},
      keywords,
      note: meta.note || '',
      wrcNames: wrcNamesValue,
    };
    try {
      const res = await saveProjectMeta(pid, payload);
      if (!res || res.ok === false) throw new Error(res?.error || 'save_failed');
      // Mettre à jour la liste des projets (chemin + note pour la recherche)
      const updated = projects.map(p =>
        String(p.id || '').trim() === pid
          ? {
              ...p,
              uproject: pathValue ? normPath(pathValue) : p.uproject,
              wrcNames: wrcNamesValue,
              note: payload.note,
              metaStatus: payload.status || '',
              metaType: payload.type || '',
              metaUsageMode: payload.usageMode || '',
              metaCategory: payload.category || '',
              metaFileVersion: payload.fileVersion ?? '',
              metaReferents: payload.referents || {},
              metaKeywords: payload.keywords || [],
            }
          : p
      );
      setProjects(updated);
      detailSavedNoteRef.current = String(payload.note || '');
      const listSaved = await saveToServer(updated, activeName, activeByHost, activeId);
      if (!listSaved) throw new Error('save_failed');

      if (source === 'indexation') {
        setIndexationMsgType('ok');
        setIndexationMsg(t('projects.detail.indexation.updateOk'));
        setTimeout(() => setIndexationMsg(''), 2000);
      } else if (source === 'intervenants') {
        setIntervenantsMsgType('ok');
        setIntervenantsMsg(t('projects.detail.intervenants.updateOk'));
        setTimeout(() => setIntervenantsMsg(''), 2000);
      }
    } catch {
      if (source === 'indexation') {
        setIndexationMsgType('error');
        setIndexationMsg(t('projects.detail.indexation.updateError'));
        setTimeout(() => setIndexationMsg(''), 2000);
      } else if (source === 'intervenants') {
        setIntervenantsMsgType('error');
        setIntervenantsMsg(t('projects.detail.intervenants.updateError'));
        setTimeout(() => setIntervenantsMsg(''), 2000);
      }
    }

    // Si le chemin a changé, relancer un scan en préservant les métadonnées saisies
    if (pathOverride !== undefined && !detailIsNew) {
      setDetailLoading(true);
      const preserved = {
        status: meta.status,
        type: meta.type,
        usageMode: meta.usageMode,
        note: meta.note,
        keywords: meta.keywords,
        referents: meta.referents,
      };
      try {
        const res = await getProjectMeta(pid);
        if (res && res.ok) {
          const metaRaw = res.meta || {};
          const mergedMeta = {
            ...metaRaw,
            status: preserved.status ?? metaRaw.status,
            type: preserved.type ?? metaRaw.type,
            usageMode: preserved.usageMode ?? metaRaw.usageMode,
            note: preserved.note ?? metaRaw.note,
            keywords: preserved.keywords ?? metaRaw.keywords,
            referents: { ...(metaRaw.referents || {}), ...(preserved.referents || {}) },
            favorite: projectFavoritesRef.current[String(pid || '').trim()] === true,
          };
          setDetailMeta(mergedMeta);
          setDetailInsights(res.insights || {});
          const pvFromScan = String(res.insights?.projectVersion ?? metaRaw.fileVersion ?? '').trim();
          setProjectVersion(pvFromScan);
          setProjectVersionMsg('');
          setProjectVersionMsgType('');
          setProjects(prev => prev.map(p =>
            String(p.id || '').trim() === pid
              ? {
                  ...p,
                  uproject: pathValue ? normPath(pathValue) : p.uproject,
                  wrcNames: wrcNamesValue,
                  note: mergedMeta.note,
                  metaStatus: mergedMeta.status || '',
                  metaType: mergedMeta.type || '',
                  metaUsageMode: mergedMeta.usageMode || '',
                  metaCategory: mergedMeta.category || '',
                  metaFileVersion: mergedMeta.fileVersion ?? '',
                  metaReferents: mergedMeta.referents || {},
                  metaKeywords: Array.isArray(mergedMeta.keywords) ? mergedMeta.keywords : [],
                }
              : p
          ));
        }
      } catch (e) {
        console.error('refresh after path change', e);
      } finally {
        setDetailLoading(false);
      }
    }
  }

  async function applyDefaultMapsPatch(patch = {}) {
    const pid = String(detailId || '').trim();
    const p = patch && typeof patch === 'object' ? patch : {};
    const game = String(p.gameDefaultMap || '').trim();
    const editor = String(p.editorStartupMap || '').trim();
    if (!pid || (!game && !editor)) return;

    setMapsBusy(true);
    setMapsMsg('');
    setMapsMsgType('');
    // Optimiste : met à jour l'affichage immédiatement
    setDetailInsights((prev) => ({
      ...(prev || {}),
      maps: {
        ...((prev && prev.maps) ? prev.maps : {}),
        ...(game ? { defaultGame: game } : {}),
        ...(editor ? { defaultEditor: editor } : {}),
      },
    }));
    try {
      const res = await setProjectDefaultMaps(pid, { gameDefaultMap: game, editorStartupMap: editor });
      if (!res || res.ok === false) throw new Error(res?.error || 'save_failed');

      // Refresh insights only
      let nextInsights = null;
      try {
        const next = await getProjectMeta(pid);
        if (next && next.ok) {
          nextInsights = next.insights || {};
          setDetailInsights(nextInsights);
        }
      } catch {}

      // Reflect maps defaults into the list view
      if (nextInsights && nextInsights.maps) {
        const mapsNext = nextInsights.maps;
        setProjects((prev) => prev.map((p) => (
          String(p.id || '').trim() === pid
            ? { ...p, maps: { ...mapsNext } }
            : p
        )));
      }

      setMapsMsgType('ok');
      const okKey = (game && editor)
        ? 'projects.detail.maps.updateOk'
        : (game ? 'projects.detail.maps.updateOkGame' : 'projects.detail.maps.updateOkEditor');
      setMapsMsg(t(okKey));
      setTimeout(() => setMapsMsg(''), 2000);
    } catch {
      setMapsMsgType('error');
      setMapsMsg(t('projects.detail.maps.updateError'));
    } finally {
      setMapsBusy(false);
    }
  }

  function updateDetailField(path, value) {
    const base = detailMetaRef.current || detailMeta || {};
    const next = { ...base };
    if (path.startsWith('referents.')) {
      const key = path.split('.')[1];
      next.referents = { ...(next.referents || {}), [key]: value };
    } else if (path === 'status') {
      next.status = value;
    } else if (path === 'type') {
      next.type = value;
    } else if (path === 'usageMode') {
      next.usageMode = value;
    } else if (path === 'category') {
      next.category = value;
    } else if (path === 'fileVersion') {
      next.fileVersion = value;
    } else if (path === 'favorite') {
      next.favorite = !!value;
    } else if (path === 'keywords') {
      next.keywords = value;
    } else if (path === 'note') {
      next.note = value;
      detailNoteDirtyRef.current = true;
    }
    detailMetaRef.current = next;
    setDetailMeta(next);
    return next;
  }

  // autosave meta (debounced naive)
  const saveTimer = React.useRef(null);
  function scheduleSave(nextMeta, source, overrides = {}) {
    if (!canEditFields) return;
    if (detailIsNew) return;
    const pid = String(detailId || '').trim();
    if (!pid) return;
    if (source === 'indexation' && detailNoteDirtyRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (source === 'indexation') {
      setIndexationMsg('');
      setIndexationMsgType('');
    } else if (source === 'intervenants') {
      setIntervenantsMsg('');
      setIntervenantsMsgType('');
    }
    const metaSnapshot = nextMeta || detailMetaRef.current || detailMeta || {};
    const metaForSave = { ...metaSnapshot };
    const pathSnapshot = overrides.path !== undefined ? overrides.path : undefined;
    const wrcNamesSnapshot = Array.isArray(overrides.wrcNames) ? overrides.wrcNames : detailWrcNames;
    const pvSnapshot = overrides.pv !== undefined ? overrides.pv : projectVersion;
    const keywordsSnapshot = overrides.keywords !== undefined
      ? overrides.keywords
      : (metaSnapshot.keywords ?? detailMetaRef.current?.keywords ?? detailMeta?.keywords ?? []);
    saveTimer.current = setTimeout(() => {
      saveDetails(metaForSave, pid, pathSnapshot, wrcNamesSnapshot, pvSnapshot, keywordsSnapshot, source);
    }, 500);
  }

  // Project Version (DefaultGame.ini) save (debounced)
  const projectVersionTimer = React.useRef(null);
  function scheduleProjectVersionSave(nextValue) {
    if (!canEditFields) return;
    if (detailIsNew) return;
    if (projectVersionTimer.current) clearTimeout(projectVersionTimer.current);
    const val = nextValue !== undefined ? nextValue : projectVersion;
    projectVersionTimer.current = setTimeout(() => { saveProjectVersion(val); }, 450);
  }

  async function saveProjectVersion(value) {
    if (!canEditFields) return;
    if (detailIsNew) return;
    const pid = String(detailId || '').trim();
    if (!pid) return;
    const pv = String(value ?? '').trim();
    if (!pv) {
      setProjectVersion('');
      setProjectVersionMsg('');
      setProjectVersionMsgType('');
      return;
    }

    // Pas d'appel réseau si la valeur n'a pas changé
    const currentSaved = String(detailInsights?.projectVersion ?? '').trim();
    if (pv === currentSaved) {
      setProjectVersionMsg('');
      setProjectVersionMsgType('');
      return;
    }

    setProjectVersionBusy(true);
    setProjectVersionMsg('');
    setProjectVersionMsgType('');
    try {
      const res = await agentSetProjectVersion(pid, pv);
      if (!res || res.ok === false) throw new Error(res?.error || 'save_failed');
      setProjectVersionMsg(t('projects.detail.projectVersion.updateOk'));
      setProjectVersionMsgType('ok');
      setDetailInsights((prev) => ({ ...(prev || {}), projectVersion: pv }));
      setDetailMeta((prev) => ({ ...(prev || {}), fileVersion: pv }));
      setProjects((prev) =>
        prev.map((p) =>
          String(p.id || '').trim() === pid
            ? { ...p, metaFileVersion: pv }
            : p
        )
      );
      setTimeout(() => {
        setProjectVersionMsg('');
        setProjectVersionMsgType('');
      }, 2000);
    } catch {
      setProjectVersionMsg(t('projects.detail.projectVersion.updateError'));
      setProjectVersionMsgType('error');
    } finally {
      setProjectVersionBusy(false);
    }
  }

  const setProjectFavoriteLocal = React.useCallback((projectId, isFavorite) => {
    const pid = String(projectId || '').trim();
    if (!pid) return;
    setProjectFavorites((prev) => {
      const next = { ...(prev && typeof prev === 'object' ? prev : {}) };
      if (isFavorite === true) next[pid] = true;
      else delete next[pid];
      return next;
    });
    setProjects((prev) =>
      prev.map((p) =>
        String(p.id || '').trim() === pid ? { ...p, favorite: isFavorite === true } : p
      )
    );
    if (String(detailId || '').trim() === pid) {
      setDetailMeta((prev) => (prev ? { ...prev, favorite: isFavorite === true } : prev));
      const current = detailMetaRef.current;
      if (current && typeof current === 'object') {
        detailMetaRef.current = { ...current, favorite: isFavorite === true };
      }
    }
  }, [detailId]);

  const toggleProjectFavorite = React.useCallback((proj) => {
    const pid = String(proj?.id || '').trim();
    if (!pid) return;
    const nextFav = proj?.favorite === true ? false : true;
    setProjectFavoriteLocal(pid, nextFav);
  }, [setProjectFavoriteLocal]);

  const noteRef = React.useRef(null); 

// Ajuster la hauteur de la note quand on charge un projet en édition
  React.useEffect(() => {
    if (!formVisible || !noteRef.current) return;
    const el = noteRef.current;
    el.style.height = '0px';
    el.style.height = el.scrollHeight + 'px';
  }, [formVisible, form.note]);

  function normalizeProjectsPayload(parsed) {
    const list = Array.isArray(parsed?.projects)
      ? parsed.projects.map((x) => ({
          id: String(x.id || '').trim(),
          name: String(x.name || ''),
          uproject: normPath(x.uproject || x.projectPath || ''),
          wrcNames: Array.isArray(x.wrcNames) ? x.wrcNames : (x.wrcName ? [String(x.wrcName)] : []),
          note: String(x.note || ''),
          createdAt: String(x.createdAt || ''),
          lastModified: String(x.lastModified || ''),
          thumbnail: normalizeThumbnailPath(x.thumbnail || x.thumbnailPath || ''),
          engineVersion: String(x.engineVersion || ''),
          metaStatus: String(x.metaStatus || ''),
          metaType: String(x.metaType || ''),
          metaUsageMode: String(x.metaUsageMode || ''),
          metaCategory: String(x.metaCategory || ''),
          metaFileVersion: x.metaFileVersion ?? '',
          metaReferents: (x.metaReferents && typeof x.metaReferents === 'object') ? x.metaReferents : {},
          metaKeywords: Array.isArray(x.metaKeywords) ? x.metaKeywords : [],
          maps: (x.maps && typeof x.maps === 'object') ? x.maps : {},
          favorite: false,
        }))
      : [];
    return {
      list,
      activeName: String(parsed?.activeName || ''),
      activeId: String(parsed?.activeId || ''),
      activeByHost: (parsed?.activeByHost && typeof parsed.activeByHost === 'object') ? parsed.activeByHost : {},
      nextId: Number(parsed?.nextId || 1),
    };
  }

  // Client
  const LS_CLIENT_ASSOC = 'uu_client_project_assoc';
  const [clientActiveName, setClientActiveName] = React.useState('');
  const [clientActiveId, setClientActiveId] = React.useState(''); // NEW (affichage)
  const [clientAssocPath, setClientAssocPath] = React.useState(() => {
    try {
      const raw = localStorage.getItem(LS_CLIENT_ASSOC) || '';
      return String(raw || '');
    } catch {
      return '';
    }
  });
  const [, setMsg] = React.useState('');
  const [clientSyncEnabled, setClientSyncEnabled] = React.useState(false);

  /* ---------------- Chargement initial ---------------- */
  React.useEffect(() => {
    let alive = true;
    fullProjectsReloadAttemptedRef.current = false;
    (async () => {
      setProjectsLoading(true);
      try {
        let parsed = null;
        try {
          // Priorité au chargement complet pour garder les miniatures visibles.
          parsed = await agentGetProjects({ timeoutMs: 30000 });
        } catch {
          // Fallback dégradé si le chargement complet échoue.
          parsed = await agentGetProjects({ light: true, timeoutMs: 10000 });
        }
        if (!alive || !parsed || typeof parsed !== 'object') return;
        if (role === 'server') {
          const norm = normalizeProjectsPayload(parsed);
          setProjects(applyFavoritesToProjects(norm.list, projectFavoritesRef.current));
          setActiveName(norm.activeName);
          setActiveId(norm.activeId);
          setActiveByHost(norm.activeByHost);
          setNextId(norm.nextId);
        } else {
          setClientActiveName(String(parsed.activeName || ''));
          setClientActiveId(String(parsed.activeId || ''));
          const assoc = (parsed.activeByHost && parsed.activeByHost[localIp] && parsed.activeByHost[localIp][parsed.activeId]) || '';
          if (assoc) {
            setClientAssocPath(String(assoc || ''));
            try { localStorage.setItem(LS_CLIENT_ASSOC, String(assoc || '')); } catch {}
          }
        }
      } catch {}
      finally {
        if (alive) setProjectsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [role, localIp]);

  // Si le premier chargement est passé en mode "light" (sans thumbs), on tente une relance complète.
  React.useEffect(() => {
    if (role !== 'server') return;
    if (fullProjectsReloadAttemptedRef.current) return;
    if (!Array.isArray(projects) || projects.length === 0) return;
    if (projects.some((p) => String(p?.thumbnail || '').trim())) return;

    let alive = true;
    fullProjectsReloadAttemptedRef.current = true;

    (async () => {
      try {
        const parsed = await agentGetProjects({ timeoutMs: 30000 });
        if (!alive || !parsed || typeof parsed !== 'object') return;
        const norm = normalizeProjectsPayload(parsed);
        setProjects(applyFavoritesToProjects(norm.list, projectFavoritesRef.current));
        setActiveName(norm.activeName);
        setActiveId(norm.activeId);
        setActiveByHost(norm.activeByHost);
        setNextId(norm.nextId);
      } catch {
        // noop: on reste sur les données disponibles
      }
    })();

    return () => { alive = false; };
  }, [role, projects]);

  // Ouvrir un détail demandé depuis une autre page
  React.useEffect(() => {
    try {
      const pending = localStorage.getItem('uu_pending_detail') || '';
      if (pending) {
        pendingDetailIdRef.current = String(pending).trim();
        localStorage.removeItem('uu_pending_detail');
      }
      const pendingStart = localStorage.getItem('uu_pending_start') || '';
      if (pendingStart) {
        pendingStartRef.current = true;
        localStorage.removeItem('uu_pending_start');
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    if (pendingDetailIdRef.current && projects.length > 0) {
      openDetails(pendingDetailIdRef.current);
      pendingDetailIdRef.current = '';
    }
  }, [projects]);

  React.useEffect(() => {
    if (pendingStartRef.current && detailId && serverHost?.ip) {
      pendingStartRef.current = false;
      startIntegration(detailId);
    }
  }, [detailId, serverHost]);

  // Charger les versions UE connues (page config)
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

  // Lecture hosts + état du serveur (agent en ligne / unrealRunning) pour le bouton intégration
  React.useEffect(() => {
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

  // --- Lecture de l'état de synchronisation pour la machine locale (client) ---
  React.useEffect(() => {
    if (role !== 'client') return;

    let alive = true;
    (async () => {
      try {
        const hosts = await getHosts().catch(() => []);
        const list = Array.isArray(hosts) ? hosts : [];

        let preferred = list.find(
          (h) =>
            h &&
            String(h.ip || h.address || '')
              .trim()
              .toLowerCase() === String(localIp || '').trim().toLowerCase()
        );
        if (!preferred && list.length > 0) {
          preferred = list[0];
        }

        if (preferred && alive) {
          const enabled =
            typeof preferred.syncEnabled === 'boolean'
              ? preferred.syncEnabled
              : !!preferred.syncRoot; // fallback : si un root est défini, on considère la synchro active
          setClientSyncEnabled(enabled);
        } else {
          if (alive) setClientSyncEnabled(false);
        }
      } catch (e) {
        console.warn('Failed to read syncEnabled for client host', e);
        if (alive) setClientSyncEnabled(false);
      }
    })();
    return () => { alive = false; };
  }, [role, localIp]);

  /* ---------------- Actions serveur ---------------- */
  async function startAddProject() {
    if (!canManageUnrealProjects) return;
    const newId = padId(nextId);
    setDetailId(newId);
    setDetailName('');
    setDetailMeta({ status:'', type:'', usageMode:'', category:'', fileVersion:'', referents:{}, keywords:[], note:'', favorite: false });
    setDetailInsights({});
    setDetailPath('');
    setDetailWrcNames([]);
    setDetailIsNew(true);
    setDetailMsg('');
    resetHttpBind();
    setIndexationMsg('');
    setIndexationMsgType('');
    setRenderBridgeStatus(null);
    setRenderBridgeMsg('');
    setRenderBridgeMsgType('');
    setRenderBridgeBusy(false);
    setIntervenantsMsg('');
    setIntervenantsMsgType('');
    if (projectVersionTimer.current) clearTimeout(projectVersionTimer.current);
    setProjectVersion('');
    setProjectVersionMsg('');
    setProjectVersionMsgType('');
    setProjectVersionBusy(false);
    setSnapshotOpen(null);
    setSnapshotBusy(false);
    setSnapshotMsg('');
    setSnapshotMsgType('');
    setMapsMsg('');
    setMapsMsgType('');
    setMapsBusy(false);
    setVpMsg('');
    setVpMsgType('');
    setVpBusy(false);
    setVpDraft(null);

    // Ouvrir directement le sélecteur de fichier .uproject pour gagner un clic
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
      : { status:'', type:'', usageMode:'', category:'', fileVersion:'', referents:{}, keywords:[], note:'' };
    const { favorite: _ignoredFavorite, ...detailMetaSharedPayload } = detailMetaPayload;
    await saveProjectMeta(
      newId,
      detailMetaSharedPayload
    );
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

    // Doublon de nom ? (autorisons le rename, mais pas deux noms identiques)
    const dup = projects.findIndex(x => String(x.name || '').trim().toLowerCase() === name.toLowerCase());
    if (dup !== -1 && dup !== idx) return t('projects.validation.duplicateName');
    return null;
  }

  async function saveToServer(
    nextProjects,
    nextActiveName = activeName,
    nextABH = activeByHost,
    nextActiveId = activeId
  ) {
    const payload = {
      projects: nextProjects.map(p => ({
        id: (p.id || '').trim(),
        name: (p.name || '').trim(),
        uproject: normPath(p.uproject || p.projectPath || ''),
        wrcNames: Array.isArray(p.wrcNames) ? p.wrcNames : [],
          note: String(p.note || ''),
          maps: (p.maps && typeof p.maps === 'object') ? p.maps : {},
          createdAt: String(p.createdAt || ''),
          engineVersion: String(p.engineVersion || ''),
        })),
      activeName: nextActiveName || '',
      activeId: String(nextActiveId || ''),   // ⬅️ NOUVEAU
      activeByHost: nextABH || {},
    };

    const r = await agentPostProjects(payload);
    if (!r || r.ok === false) return false;

    const warnings = Array.isArray(r.httpBindWarnings)
      ? r.httpBindWarnings
      : [];
    if (warnings.length > 0) {
      const first = warnings[0] || {};
      const name = String(first.name || first.id || '').trim();
      const msg =
        String(first.error || '').toLowerCase() === 'ini_not_found'
          ? t('projects.httpBind.iniMissing', { name: name || '—' })
          : t('projects.httpBind.updateError');
      setHttpBindMsg(msg);
      setHttpBindMsgType('error');
    } else if (httpBindMsg) {
      setHttpBindMsg('');
      setHttpBindMsgType('');
    }

    // Recharger pour récupérer IDs/activeId normalisés par le serveur
    try {
      const fresh = await agentGetProjects();
      const list = Array.isArray(fresh.projects)
        ? fresh.projects.map(x => ({
            id: String(x.id || '').trim(),
            name: String(x.name || ''),
            uproject: normPath(x.uproject || x.projectPath || ''),
            wrcNames: Array.isArray(x.wrcNames) ? x.wrcNames : (x.wrcName ? [String(x.wrcName)] : []),
            note: String(x.note || ''),
            createdAt: String(x.createdAt || ''),
            lastModified: String(x.lastModified || ''),
            thumbnail: normalizeThumbnailPath(x.thumbnail || x.thumbnailPath || ''),
            engineVersion: String(x.engineVersion || ''),
            metaStatus: String(x.metaStatus || ''),
            metaType: String(x.metaType || ''),
            metaUsageMode: String(x.metaUsageMode || ''),
            metaCategory: String(x.metaCategory || ''),
            metaFileVersion: x.metaFileVersion ?? '',
            metaReferents: (x.metaReferents && typeof x.metaReferents === 'object') ? x.metaReferents : {},
            metaKeywords: Array.isArray(x.metaKeywords) ? x.metaKeywords : [],
            maps: (x.maps && typeof x.maps === 'object') ? x.maps : {},
            favorite: false,
          }))
        : [];
      setProjects(applyFavoritesToProjects(list, projectFavoritesRef.current));
      setActiveName(String(fresh.activeName || ''));
      setActiveId(String(fresh.activeId || ''));
      setActiveByHost((fresh.activeByHost && typeof fresh.activeByHost === 'object') ? fresh.activeByHost : {});
      setNextId(Number(fresh.nextId || 1));
    } catch {}
    return true;
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
      // Édition (rename autorisé)
      const before = projects[editingIndex];
      const oldName = String(before.name || '').trim();
      const newName = String(data.name || '').trim();

      const next = projects.map((p, i) =>
        i === editingIndex
          ? {
              ...p,
              name: newName,
              uproject: data.projectPath,
              note: data.note,
              // On conserve la date de création existante si elle existe
              createdAt: p.createdAt || data.createdAt,
            }
          : p
      );

      // Corriger activeName si on renomme l’actif
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
      // Création (ID généré côté UI)
      const newId = padId(nextId);
      const nextNextId = nextId + 1;
      const next = [
        ...projects,
        {
          id: newId,
          name: data.name,
          uproject: data.projectPath,
          note: data.note,
          createdAt: data.createdAt,
        },
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

async function removeOne(projectKey) {
  if (!canManageUnrealProjects) return;
  const key = String(projectKey || '').trim();
  if (!key) return;
  const ok = await requestConfirm(t('projects.confirm.delete'));
  if (!ok) return;

  const index = projects.findIndex((p) => String(p.id || '').trim() === key);

  if (index === -1) return;

  const removed = projects[index];
  const next = projects.filter((_, idx) => idx !== index);

  // Corriger activeName si on supprime l’actif
  const removedIsActive =
    removed &&
    String(removed.id || '').trim() === String(activeId || '').trim();

  const nextActiveName = removedIsActive ? '' : activeName;
  const nextActiveId = removedIsActive ? '' : activeId;

  // Purger les entrées correspondantes dans activeByHost
  const nextABH = { ...activeByHost };
  if (removed && removed.id) {
    for (const hostIp of Object.keys(nextABH)) {
      if (nextABH[hostIp] && typeof nextABH[hostIp] === 'object') {
        if (removed.id in nextABH[hostIp]) {
          delete nextABH[hostIp][removed.id];
          if (Object.keys(nextABH[hostIp]).length === 0) delete nextABH[hostIp];
        }
      }
    }
  }

  setProjects(next);
  setActiveName(nextActiveName);
  setActiveId(nextActiveId);
  setActiveByHost(nextABH);
  await saveToServer(next, nextActiveName, nextABH, nextActiveId);
}


async function activateOne(projectKey) {
  if (!canManageUnrealProjects) return;
  const key = String(projectKey || '').trim();
  if (!key) return;

  const index = projects.findIndex((p) => String(p.id || '').trim() === key);

  if (index === -1) return;

  const p = projects[index];
  const name = String(p?.name || '').trim();
  const id = String(p?.id || '').trim();
  const path = String(p?.uproject || '').trim();

  const nextABH = { ...activeByHost };
  if (localIp && id && path && !((nextABH[localIp] || {})[id])) {
    nextABH[localIp] = { ...(nextABH[localIp] || {}), [id]: path };
  }

  setActiveName(name);
  setActiveId(id);
  setActiveByHost(nextABH);
  await saveToServer(projects, name, nextABH, id);
}

  function getProjectByKey(projectKey) {
    const ref = String(projectKey || '').trim();
    if (!ref) return null;
    return projects.find((p) => {
      if (!p) return false;
      if (String(p.id || '').trim() === ref) return true;
      if (String(p.name || '').trim().toLowerCase() === ref.toLowerCase()) return true;
      return false;
    }) || null;
  }

  function getActiveProject() {
    const refId = String(activeId || '').trim();
    return projects.find((p) => {
      if (!p) return false;
      if (refId && String(p.id || '').trim() === refId) return true;
      return false;
    }) || null;
  }

  function resolveExeForHost(host, projectKey = '') {
    const selectedProject = getProjectByKey(projectKey);
    const launchProject = selectedProject || getActiveProject();
    const requiredVersion = String(launchProject?.engineVersion || '').trim();
    if (!requiredVersion) return '';
    const editors =
      (host && host.unrealEditors && typeof host.unrealEditors === 'object'
        ? host.unrealEditors
        : {}) || {};
    return editors[requiredVersion] || '';
  }

  function resolveUprojectForHost(host, projectKey = '') {
    const selectedProject = getProjectByKey(projectKey);
    const activeProj = selectedProject || getActiveProject();
    if (!host) return '';
    const ip = String(host.ip || '').trim();
    const syncEnabled = !!host.syncEnabled;
    const syncRoot = String(host.syncRoot || '').trim();

    // serveur local : utiliser le chemin du projet actif
    if (ip && activeProj) {
      return (
        String(activeProj.uproject || activeProj.projectPath || activeProj.path || '').trim() ||
        ''
      );
    }

    // mode sync (client) : recomposition éventuelle
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

    // fallback : champ direct sur la machine
    if (typeof host.uproject === 'string' && host.uproject) {
      return String(host.uproject).trim();
    }

    // fallback : chemin actif global
    if (activeProj) {
      return String(
        activeProj.uproject || activeProj.projectPath || activeProj.path || ''
      ).trim();
    }

    return '';
  }

  // ---- Lancement mode intégration (serveur local uniquement) ----
  async function startIntegration(projectKey = '') {
    if (!canManageUnrealProjects) return;
    if (!serverHost || !serverHost.ip) return;
    const selectedProject = getProjectByKey(projectKey);
    const launchProject = selectedProject || getActiveProject();
    const exe = resolveExeForHost(serverHost, projectKey);
    const uproject = resolveUprojectForHost(serverHost, projectKey);
    const activeProj = launchProject;
    const requiredVersion = String(activeProj?.engineVersion || '').trim();
    if (!exe || !uproject) {
      setIntegrationMsg(
        !exe
          ? t('launch.status.missingExe')
          : (serverHost.syncEnabled
              ? t('launch.status.missingUprojectSync')
              : t('launch.status.missingUproject'))
      );
      setIntegrationMsgType('error');
      return;
    }
    setIntegrationBusy(true);
    try {
      await postCommon({ launchMode: 'integration' });
      const launchRes = await postLaunch(serverHost.ip, { uproject, engineVersion: requiredVersion });
      if (launchRes?.localFallback?.used) {
        const msg = t('launch.msg.localFallback') || 'Reseau Ethernet inactif, bascule locale sur 127.0.0.1.';
        noticeApi?.showNotice?.(msg, 'warn');
      }
      setServerRunning(true);
      setIntegrationMsg('');
      setIntegrationMsgType('');
    } catch (e) {
      setIntegrationMsg(e?.message || String(e));
      setIntegrationMsgType('error');
    } finally {
      setIntegrationBusy(false);
    }
  }

  async function stopIntegration(projectKey = '') {
    if (!canManageUnrealProjects) return;
    if (!serverHost || !serverHost.ip) return;
    setIntegrationBusy(true);
    try {
      const uproject = resolveUprojectForHost(serverHost, projectKey);
      const stopRes = await postStop(serverHost.ip, { mode: 'integration', uproject });
      if (stopRes?.localFallback?.used) {
        const msg = t('launch.msg.localFallback') || 'Reseau Ethernet inactif, bascule locale sur 127.0.0.1.';
        noticeApi?.showNotice?.(msg, 'warn');
      }
      await postCommon({ launchMode: 'production' });
      setServerRunning(false);
      setIntegrationMsg('');
      setIntegrationMsgType('');
    } catch (e) {
      setIntegrationMsg(e?.message || String(e));
      setIntegrationMsgType('error');
    } finally {
      setIntegrationBusy(false);
    }
  }

  /* ---------------- Action client: associer pour CETTE machine ---------------- */
  async function associateForClientActive() {
    if (!clientActiveName) { setMsg(t('projects.msg.client.noServerActive')); setTimeout(()=>setMsg(''),2000); return; }
    const hostIp = localIp;
    if (!hostIp) { setMsg(t('projects.msg.client.unknownLocalIp')); setTimeout(()=>setMsg(''),2000); return; }

    let file = await window.electron?.chooseUproject?.({
      defaultPath: getUprojectDialogDefaultPath(clientAssocPath),
    });
    if (file && typeof file === 'object') file = file.file || file.path || (Array.isArray(file) ? file[0] : '');
    if (!file) return;

    const p = normPath(file);
    if (!isUproject(p)) { setMsg(t('projects.msg.client.invalidFile')); setTimeout(()=>setMsg(''),2000); return; }

    const j = await setProjectAssociation(hostIp, clientActiveId || clientActiveName, p);
    if (j && j.ok) {
      setClientAssocPath(p);
      try { localStorage.setItem(LS_CLIENT_ASSOC, String(p || '')); } catch {}
      setMsg(t('projects.msg.client.assocSaved'));
      setTimeout(()=>setMsg(''),2000);
    } else {
      setMsg(t('projects.msg.client.assocFailed'));
      setTimeout(()=>setMsg(''),2000);
    }
  }

  /* ---------------- Rendu ---------------- */
  if (detailId) {
    const proj = projects.find(p => String(p.id || '').trim() === String(detailId));
    const meta = detailMeta || { status:'', type:'', usageMode:'', category:'', fileVersion:'', referents:{}, keywords:[], note:'' };
    const refs = meta.referents || {};
    const isActiveDetail = String(activeId || '').trim() === String(detailId || '').trim();
    const pluginsList = (Array.isArray(detailInsights?.plugins) ? detailInsights.plugins : [])
      .filter((pl) => pl && pl.enabled !== false);
    const hasPlugins = pluginsList.length > 0;
    const maps = (detailInsights && typeof detailInsights === 'object') ? detailInsights.maps : null;
    const hasMaps = !!(
      maps &&
      (maps.defaultGame || maps.defaultEditor || ((maps.list || []).length > 0))
    );
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
                  setProjectFavoriteLocal(detailId, nextFav);
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

                  {(() => {
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
                      .filter(o => o.assetFull);

                    const pickSelected = (currentValue) => {
                      const cur = String(currentValue || '').trim();
                      if (!cur) return '';
                      const m = options.find(o => o.assetFull === cur || o.assetNoDot === cur);
                      return m ? m.assetFull : '';
                    };

                    const selectedGame = pickSelected(maps?.defaultGame);
                    const selectedEditor = pickSelected(maps?.defaultEditor);

                    return (
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
                              {options.map((o) => (
                                <option key={`g-${o.assetFull}`} value={o.assetFull}>
                                  {o.display}
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
                              {options.map((o) => (
                                <option key={`e-${o.assetFull}`} value={o.assetFull}>
                                  {o.display}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="uu-row wrap">
                    <div className="uu-label w-160" />
                    <div className="uu-value uu-muted">
                      {(maps?.list || []).length ? (
                        <div className="uu-small mt-4">
                          {(maps.list || []).map((m, idx) => {
                            const parts = String(m || '').split('/');
                            const display = parts.length > 1 ? parts.slice(1).join('/') : m;
                            return <div key={idx}>/{display}</div>;
                          })}
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
                  setSearchAdvanced(initialAdvanced);
                  setSearchExpanded(false);
                }}
                canClear={!!searchQuery || favoriteOnly || hasAdvancedFilters || searchExpanded}
                onAdvanced={() => setSearchExpanded(true)}
                viewMode={viewMode}
                onViewChange={setViewMode}
                onAdd={startAddProject}
                canAdd={canManageUnrealProjects}
              />
            )}

            {/* Quand on édite / ajoute : on affiche ton formulaire */}
            {formVisible && (
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
                  </div>
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.type')}</label>
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
                  </div>
                </div>

                <div className="uu-row uu-gap-16 uu-wrap">
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.detail.labels.usageMode')}</label>
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
                  </div>
                  <div className="uu-row uu-align-center uu-gap-8" style={{ flex: '1 1 45%', minWidth: '320px' }}>
                    <label className="uu-label" style={{ width: '90px' }}>{t('projects.table.engineVersion')}</label>
                    <MultiSelectDropdown
                      options={engineVersionOptions}
                      values={searchAdvanced.engineVersion}
                      onChange={(vals) => setSearchAdvanced((prev) => ({ ...prev, engineVersion: vals }))}
                      placeholder={noneLabel}
                      noneLabel={noneLabel}
                      style={{ width: '520px', minWidth: '520px', maxWidth: '520px' }}
                    />
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
                    onClick={() => { setSearchExpanded(false); setSearchQuery(''); setSearchAdvanced(initialAdvanced); }}
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
              <ProjectsCardsView
                t={t}
                projects={visibleProjects}
                versionEl={versionEl}
                openDetails={openDetails}
                activateOne={activateOne}
                onToggleFavorite={toggleProjectFavorite}
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
            )}

            {projectsWithActive.length > 0 && viewMode === 'list' && (
              <ProjectsListView
                t={t}
                projects={visibleProjects}
                versionEl={versionEl}
                openDetails={openDetails}
                activateOne={activateOne}
                onCreateTaskFromProject={createTaskFromProject}
                onToggleFavorite={toggleProjectFavorite}
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
            )}

            {projectsWithActive.length > 0 && viewMode === 'thumbs' && (
              <ProjectsThumbsView
                t={t}
                projects={visibleProjects}
                versionEl={versionEl}
                openDetails={openDetails}
                activateOne={activateOne}
                onToggleFavorite={toggleProjectFavorite}
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
                  onClick={associateForClientActive}
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
