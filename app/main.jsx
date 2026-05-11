// app/main.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createRoot } from "react-dom/client";

import {
  getCommon,
  getHosts,
  getLibraryMeta,
  getLogsStorage,
  postPresence,
  postprodUpsertRenderWorker,
} from "./utils/agent";

import {
  normalizePostprodOfflineOutbox,
  readPostprodOfflineOutbox,
  writePostprodOfflineOutbox,
  normalizePostprodWorkerCompletionOutbox,
  readPostprodWorkerCompletionOutbox,
  writePostprodWorkerCompletionOutbox,
} from "./utils/postprodOutboxHelpers";
import { mapRenderExportDestinationOptions } from "./utils/postprodCatalogHelpers";
import {
  APP_MODE_POSTPROD,
  POSTPROD_TAB_USERS,
  POSTPROD_TAB_RENDERS_CREATE,
} from "./utils/appConstants";
import ErrorBoundary from "./components/ErrorBoundary";
import AppShell from "./components/AppShell";
import {
  resolveUserShowFabResourcesPreference,
  getPostprodTabsForUser,
  getModeAccessForUser,
  normalizeAppMode,
  getLiveAccountTabs,
  getAllowedTabs,
  resolveDefaultTab,
} from "./utils/postprodPermissionsHelpers";
import {
  readPostprodAuth,
} from "./utils/postprodAuthHelpers";
import { useNotice } from "./hooks/useNotice";
import { usePostprodApiCallbacks } from "./hooks/usePostprodApiCallbacks";
import { usePostprodEntityMutations } from "./hooks/usePostprodEntityMutations";
import { usePostprodRenderCallbacks } from "./hooks/usePostprodRenderCallbacks";
import { usePostprodOutboxCallbacks } from "./hooks/usePostprodOutboxCallbacks";
import { usePostprodAuthCallbacks } from "./hooks/usePostprodAuthCallbacks";
import { usePostprodWorkerRenderLoop } from "./hooks/usePostprodWorkerRenderLoop";
import { usePostprodTabTriggers } from "./hooks/usePostprodTabTriggers";
import { usePostprodTabRefreshPolling } from "./hooks/usePostprodTabRefreshPolling";
import { usePostprodQueueDispatch } from "./hooks/usePostprodQueueDispatch";
import { usePostprodNavCallbacks } from "./hooks/usePostprodNavCallbacks";
import { usePostprodNavEffects } from "./hooks/usePostprodNavEffects";
import { usePostprodNavAlerts } from "./hooks/usePostprodNavAlerts";

import "./global.css";
import { readIdentity, writeIdentity } from "./utils/identity";
import { createT, preloadI18n } from "./i18n";

const LS_SYNC_KEY = 'uu_client_syncEnabled';


/* --------------------- App --------------------- */
function App() {
  // Toujours avoir un objet, jamais null
  const [identity, setIdentity] = useState(() => readIdentity());
  const [postprodAuth, setPostprodAuth] = useState(() => {
    const saved = readPostprodAuth();
    return {
      ...saved,
      busy: false,
      error: '',
      hydrated: false,
    };
  });
  const [postprodUsers, setPostprodUsers] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodRoles, setPostprodRoles] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodTasks, setPostprodTasks] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodTaskCatalog, setPostprodTaskCatalog] = useState({
    projects: [],
    resources: [],
    loading: false,
    error: '',
  });
  const [postprodRenderEditorRequest, setPostprodRenderEditorRequest] = useState(null);
  const [postprodRenderFormFocusRequest, setPostprodRenderFormFocusRequest] = useState(null);
  const [postprodEditUserRequest, setPostprodEditUserRequest] = useState(null);
  const [postprodProjects, setPostprodProjects] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodResources, setPostprodResources] = useState({
    items: [],
    loading: false,
    error: '',
    source: '',
    sync: null,
  });
  const [postprodRenderProjectCatalog, setPostprodRenderProjectCatalog] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodRenders, setPostprodRenders] = useState({
    items: [],
    loading: false,
    error: '',
    detectedScan: null,
  });
  const [postprodUserAlerts, setPostprodUserAlerts] = useState({
    items: [],
    summary: null,
    loading: false,
    error: '',
  });
  const [postprodRenderHealth, setPostprodRenderHealth] = useState({
    data: null,
    loading: false,
    error: '',
  });
  const [postprodOfflineOutbox, setPostprodOfflineOutbox] = useState(() => readPostprodOfflineOutbox());
  const [postprodWorkerCompletionOutbox, setPostprodWorkerCompletionOutbox] = useState(() => readPostprodWorkerCompletionOutbox());
  const [postprodRenderWorkers, setPostprodRenderWorkers] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodRenderTemplates, setPostprodRenderTemplates] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodRenderForms, setPostprodRenderForms] = useState({
    items: [],
    loading: false,
    error: '',
  });
  const [postprodProfile, setPostprodProfile] = useState({
    saving: false,
    error: '',
  });
  const [postprodMyActivity, setPostprodMyActivity] = useState({
    activities: [],
    summary: { total: 0, actions: {}, projects: [] },
    loading: false,
    error: '',
  });
  const [postprodAudit, setPostprodAudit] = useState({
    entries: [],
    loading: false,
    error: '',
    total: 0,
    page: 1,
    pageSize: 100,
    hasMore: false,
    auditLogStore: null,
    filters: {
      actorUserId: null,
      action: '',
      scopeType: '',
      fromAt: '',
      toAt: '',
    },
  });
  const [postprodRenderHealthAuditMaintenance, setPostprodRenderHealthAuditMaintenance] = useState({
    data: null,
    loading: false,
    error: '',
    purging: false,
    purgeError: '',
    lastPurge: null,
  });
  const [showWelcome, setShowWelcome] = useState(true);
  const [showLicense, setShowLicense] = useState(false);
  const [licenseOrigin, setLicenseOrigin] = useState('welcome');
  const [current, setCurrent] = useState("Projets");
  const [userTabKey, setUserTabKey] = useState(0);
  const [roleTabKey, setRoleTabKey] = useState(0);
  const [datasTabKey, setDatasTabKey] = useState(0);
  const [quitDialogOpen, setQuitDialogOpen] = useState(false);
  const [aptitudeCheckPending, setAptitudeCheckPending] = useState(null);
  const [queuePausedLaunchPending, setQueuePausedLaunchPending] = useState(null);
  const [busyImmediateLaunchPending, setBusyImmediateLaunchPending] = useState(null);
  const [resourcesRefreshKey, setResourcesRefreshKey] = useState(0);
  const [postprodTaskFormOpen, setPostprodTaskFormOpen] = useState(false);
  const [postprodUserEditorOpen, setPostprodUserEditorOpen] = useState(false);
  const [hasLibraryItems, setHasLibraryItems] = useState(false);
  const noticeApiRaw = useNotice();
  const noticeApi = useMemo(() => ({
    notice: noticeApiRaw.notice,
    showNotice: noticeApiRaw.showNotice,
    clearNotice: noticeApiRaw.clearNotice,
  }), [noticeApiRaw.notice, noticeApiRaw.showNotice, noticeApiRaw.clearNotice]);
  const [clientSyncEnabled, setClientSyncEnabled] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_SYNC_KEY);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
    } catch {}
    return false;
  });
  const [commonCfg, setCommonCfg] = useState(null);
  const [commonLoaded, setCommonLoaded] = useState(false);
  const [hostsCfg, setHostsCfg] = useState([]);
  const [hostsLoaded, setHostsLoaded] = useState(false);
  const [logsStorageSummary, setLogsStorageSummary] = useState(null);
  const [initialClientNavDone, setInitialClientNavDone] = useState(false);
  const postprodRendersRequestSeqRef = useRef(0);
  const postprodAgentBootRef = useRef({ started: false, port: '' });
  const postprodWrcCacheNoticeRef = useRef({});
  const handleCommonUpdated = React.useCallback((next) => {
    if (!next || typeof next !== 'object') return;
    setCommonCfg(next);
    setCommonLoaded(true);
  }, []);
  const safeIdentity = identity && typeof identity === 'object' ? identity : {};
  const appMode = normalizeAppMode(safeIdentity.mode);
  const role = appMode === APP_MODE_POSTPROD
    ? "server"
    : (safeIdentity.role || "server");
  const lang = String(safeIdentity.lang || 'fr').trim();
  const localIp = String(safeIdentity.localIp || '').trim().toLowerCase();
  const [i18nToken, setI18nToken] = useState(0);
  useEffect(() => {
    let cancelled = false;
    preloadI18n(lang).then(() => {
      if (cancelled) return;
      setI18nToken((prev) => prev + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [lang]);
  const t = useMemo(() => createT(lang), [lang, i18nToken]);
  const postprodAuthenticated = !!(postprodAuth.token && postprodAuth.user);
  const postprodModeAccess = useMemo(
    () => getModeAccessForUser(postprodAuth.user, postprodAuthenticated),
    [postprodAuth.user, postprodAuthenticated]
  );

  const applyUserLanguageToIdentity = useCallback((userLike = null) => {
    if (!userLike || typeof userLike !== "object") return;
    if (!Object.prototype.hasOwnProperty.call(userLike, "language")) return;
    const normalized = String(userLike?.language || "").trim().toLowerCase() === "en" ? "en" : "fr";
    setIdentity((prev) => {
      const currentIdentity = prev && typeof prev === "object" ? prev : {};
      if (String(currentIdentity.lang || "fr").trim().toLowerCase() === normalized) {
        return currentIdentity;
      }
      const nextIdentity = {
        ...currentIdentity,
        lang: normalized,
      };
      writeIdentity(nextIdentity);
      return nextIdentity;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof window.electron?.startAgent !== 'function') return;
    if (postprodAuthenticated) return;

    const rawPort = Number(safeIdentity.agentPort);
    const normalizedPort = Number.isFinite(rawPort) && rawPort > 0 && rawPort < 65536
      ? String(Math.trunc(rawPort))
      : '4000';

    if (
      postprodAgentBootRef.current.started
      && postprodAgentBootRef.current.port === normalizedPort
    ) {
      return;
    }

    postprodAgentBootRef.current = { started: true, port: normalizedPort };
    window.electron.startAgent(normalizedPort).catch(() => {
      postprodAgentBootRef.current = { started: false, port: '' };
    });
  }, [postprodAuthenticated, safeIdentity.agentPort]);

  useEffect(() => {
    if (!postprodAuthenticated) {
      setPostprodRenderEditorRequest(null);
    }
  }, [postprodAuthenticated]);

  useEffect(() => {
    if (!postprodAuthenticated) return;
    const forcedMode = String(postprodModeAccess?.forcedMode || "").trim();
    if (!forcedMode) return;
    const currentMode = normalizeAppMode(safeIdentity.mode);
    if (currentMode === forcedMode) return;

    const nextIdentity = {
      ...safeIdentity,
      mode: forcedMode,
      role: forcedMode === APP_MODE_POSTPROD
        ? "server"
        : (String(safeIdentity.role || "server").trim() || "server"),
      serverIp: forcedMode === APP_MODE_POSTPROD
        ? ""
        : String(safeIdentity.serverIp || "").trim(),
    };
    writeIdentity(nextIdentity);
    setIdentity(nextIdentity);
    setCurrent("Projets");
  }, [
    postprodAuthenticated,
    postprodModeAccess?.forcedMode,
    safeIdentity.mode,
    safeIdentity.role,
    safeIdentity.serverIp,
  ]);

  // Fournit la bande de notification globale
  const noticeContextValue = useMemo(() => ({
    showNotice: noticeApi.showNotice,
    clearNotice: noticeApi.clearNotice,
  }), [noticeApi.showNotice, noticeApi.clearNotice]);
  const updatePostprodOfflineOutbox = useCallback((updater) => {
    setPostprodOfflineOutbox((current) => {
      const base = normalizePostprodOfflineOutbox(current);
      const nextRaw = typeof updater === 'function' ? updater(base) : updater;
      const next = normalizePostprodOfflineOutbox(nextRaw);
      writePostprodOfflineOutbox(next);
      return next;
    });
  }, []);
  const updatePostprodWorkerCompletionOutbox = useCallback((updater) => {
    setPostprodWorkerCompletionOutbox((current) => {
      const base = normalizePostprodWorkerCompletionOutbox(current);
      const nextRaw = typeof updater === 'function' ? updater(base) : updater;
      const next = normalizePostprodWorkerCompletionOutbox(nextRaw);
      writePostprodWorkerCompletionOutbox(next);
      return next;
    });
  }, []);

  const goToProjectDetail = React.useCallback((projectId) => {
    if (!projectId) return;
    try { localStorage.setItem('uu_pending_detail', String(projectId)); } catch {}
    setCurrent("Projets");
  }, []);

  useEffect(() => {
    window.goToProjectDetail = goToProjectDetail;
    // Navigation inverse : fermer le détail projet
    window.closeProjectDetail = async () => {
      try {
        if (window.__closeProjectDetail) {
          await window.__closeProjectDetail();
        }
      } catch {}
      setCurrent("Projets");
    };
    // Fermeture du détail ressource via clic sur l'onglet actif
    window.closeResourceDetail = async () => {
      try {
        if (window.__closeResourceDetail) {
          await window.__closeResourceDetail();
        }
      } catch {}
      setCurrent("Ressources");
    };
    return () => {
      if (window.goToProjectDetail === goToProjectDetail) {
        delete window.goToProjectDetail;
      }
      if (window.closeProjectDetail && window.__closeProjectDetail) {
        delete window.closeProjectDetail;
      }
      if (window.closeResourceDetail && window.__closeResourceDetail) {
        delete window.closeResourceDetail;
      }
    };
  }, [goToProjectDetail]);

  const showNotice = noticeApi.showNotice;
  const quitOkBtnRef = useRef(null);
  const quitPrevFocusRef = useRef(null);

  const openQuitDialog = useCallback(() => {
    setQuitDialogOpen((prev) => {
      if (prev) return prev;
      const activeEl =
        typeof document !== 'undefined' && document?.activeElement
          ? document.activeElement
          : null;
      quitPrevFocusRef.current =
        activeEl && typeof activeEl.focus === 'function' ? activeEl : null;
      return true;
    });
  }, []);

  const closeQuitDialog = useCallback((shouldQuit) => {
    setQuitDialogOpen(false);
    const prev = quitPrevFocusRef.current;
    quitPrevFocusRef.current = null;
    if (shouldQuit) {
      window.electron?.quitApp?.();
      return;
    }
    if (prev && typeof prev.focus === 'function') {
      setTimeout(() => {
        try {
          prev.focus();
        } catch {}
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!quitDialogOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeQuitDialog(false);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        closeQuitDialog(true);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    const timer = setTimeout(() => {
      quitOkBtnRef.current?.focus?.();
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [quitDialogOpen, closeQuitDialog]);

  useEffect(() => {
    if (!window.electron?.onAppQuitRequested) return undefined;
    const off = window.electron.onAppQuitRequested(() => {
      openQuitDialog();
    });
    return () => {
      if (typeof off === 'function') off();
    };
  }, [openQuitDialog]);

  const postprodCanManageUsers = !!postprodAuth.user?.permissions?.canManageUsers;
  const postprodCanManageRoles = postprodAuth.user?.permissions?.canManageRoles === true;
  const postprodCanManageRenderTemplates = postprodAuth.user?.permissions?.canManageForms === true;
  const postprodCanManageMachines = postprodAuth.user?.permissions?.canManageMachines === true;
  const postprodCanManageConfiguration = postprodAuthenticated
    ? postprodAuth.user?.permissions?.canManageConfiguration === true
    : true;
  const postprodCanBanUsers = postprodAuth.user?.permissions?.canBanUsers === true;
  const postprodCanManageProjectPermissions =
    postprodAuth.user?.permissions?.canManageProjectPermissions === true;
  const postprodCanViewResources = postprodAuth.user?.permissions?.canViewResources !== false;
  const postprodUserShowFabResources = resolveUserShowFabResourcesPreference(postprodAuth.user);
  const resourcesEnabledGlobal = !!(
    commonCfg
    && (
      commonCfg.fab_resources_enabled === true
      || commonCfg.fabResourcesEnabled === true
    )
  );
  const resourcesEnabled = resourcesEnabledGlobal && (!postprodAuthenticated || postprodUserShowFabResources);
  const postprodCanAccessResources = postprodCanViewResources && resourcesEnabled;
  const postprodCanCreateTasks = postprodAuth.user?.permissions?.canCreateTasks !== false;
  const postprodCanAssignRenderRequests = postprodAuth.user?.permissions?.canAssignRenderRequests === true;
  const postprodCanBypassPadForTasks = postprodAuth.user?.permissions?.canSyncScenes === true;
  const postprodCanEditProjects = postprodAuth.user?.permissions?.canEditProjects !== false;
  const postprodCanManageLayouts = postprodAuth.user?.permissions?.canManageLayouts !== false;
  const postprodCanLaunchLiveProjects = postprodAuth.user?.permissions?.canLaunchLiveProjects !== false;
  const postprodCanLaunchProjects = postprodAuth.user?.permissions?.canLaunchProjects !== false;
  const liveCanEditProjects = postprodAuthenticated ? postprodCanEditProjects : true;
  const liveCanLaunchRuntimeProjects = postprodAuthenticated ? postprodCanLaunchLiveProjects : true;
  const liveCanLaunchEditorProjects = postprodAuthenticated ? postprodCanLaunchProjects : true;
  const postprodCanLaunchRenders = !!postprodAuth.user?.permissions?.canLaunchRenders;
  const postprodRefreshSec = Math.max(2, Number(commonCfg?.refreshSec || 5) || 5);
  const postprodRefreshMs = postprodRefreshSec * 1000;
  const postprodManageableRoles = Array.isArray(postprodAuth.user?.permissions?.manageableRoles)
    ? postprodAuth.user.permissions.manageableRoles
    : [];
  const postprodVisibleTabs = useMemo(
    () =>
      getPostprodTabsForUser(postprodAuth.user, postprodAuthenticated, {
        resourcesEnabled,
      }),
    [postprodAuth.user, postprodAuthenticated, resourcesEnabled]
  );
  const liveAccountTabs = useMemo(
    () => getLiveAccountTabs({
      authenticated: postprodAuthenticated,
      canManageUsers: postprodCanManageUsers,
      canManageRoles: postprodCanManageRoles,
    }),
    [postprodAuthenticated, postprodCanManageUsers, postprodCanManageRoles]
  );
  const postprodLockedTabs = appMode === APP_MODE_POSTPROD && !postprodAuthenticated
    ? postprodVisibleTabs.filter((tab) => tab !== POSTPROD_TAB_USERS)
    : [];
  const postprodOfflineOutboxCount = useMemo(
    () => normalizePostprodOfflineOutbox(postprodOfflineOutbox).length,
    [postprodOfflineOutbox]
  );
  const postprodWorkerCompletionOutboxCount = useMemo(
    () => normalizePostprodWorkerCompletionOutbox(postprodWorkerCompletionOutbox).length,
    [postprodWorkerCompletionOutbox]
  );
  const postprodRenderHealthView = useMemo(() => {
    const data = postprodRenderHealth.data && typeof postprodRenderHealth.data === 'object'
      ? postprodRenderHealth.data
      : null;
    if (!data) return data;
    return {
      ...data,
      offlineOutboxPending: postprodOfflineOutboxCount + postprodWorkerCompletionOutboxCount,
      offlineRenderCreateOutboxPending: postprodOfflineOutboxCount,
      offlineWorkerCompletionOutboxPending: postprodWorkerCompletionOutboxCount,
    };
  }, [postprodRenderHealth.data, postprodOfflineOutboxCount, postprodWorkerCompletionOutboxCount]);
  const [licenseStatus, setLicenseStatus] = useState({ ok: false, status: 'loading' });
  const licenseOk = licenseStatus && licenseStatus.ok === true;

  useEffect(() => {
    if (showWelcome || showLicense) return;
    if (
      appMode === APP_MODE_POSTPROD
      && current === POSTPROD_TAB_RENDERS_CREATE
      && postprodTaskFormOpen
    ) {
      return;
    }

    let stopped = false;
    let timer = null;
    const pollSec = Math.max(2, Number(commonCfg?.refreshSec || 5) || 5);

    const tick = async () => {
      try {
        const status = await getLogsStorage({ allHosts: true });
        if (!stopped && status && typeof status === 'object' && status.ok !== false) {
          setLogsStorageSummary(status);
        }
      } catch {
        // conserve le dernier état connu en cas d'erreur réseau temporaire
      }

      if (!stopped) {
        timer = setTimeout(tick, pollSec * 1000);
      }
    };

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    showWelcome,
    showLicense,
    commonCfg?.refreshSec,
    appMode,
    current,
    postprodTaskFormOpen,
  ]);


  const refreshLicenseStatus = React.useCallback(async () => {
    if (!window.electron?.licenseGetStatus) {
      const fallback = { ok: false, status: 'unavailable' };
      setLicenseStatus(fallback);
      return fallback;
    }
    try {
      const res = await window.electron.licenseGetStatus();
      const next = res && typeof res === 'object' ? res : { ok: false, status: 'error' };
      setLicenseStatus(next);
      return next;
    } catch {
      const next = { ok: false, status: 'error' };
      setLicenseStatus(next);
      return next;
    }
  }, []);

  useEffect(() => {
    refreshLicenseStatus();
  }, [refreshLicenseStatus]);

  // Charger common/hosts (config locale + capacites Unreal locales)
  useEffect(() => {
    if (showWelcome || showLicense) return;
    let cancelled = false;
    setCommonLoaded(false);
    setHostsLoaded(false);
    (async () => {
      try {
        const [c, h] = await Promise.all([
          getCommon(),
          getHosts().catch(() => []),
        ]);
        if (!cancelled) {
          setCommonCfg(c || {});
          setCommonLoaded(true);
          setHostsCfg(Array.isArray(h) ? h : []);
          setHostsLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setCommonCfg(null);
          // On laisse commonLoaded à false en cas d'échec pour ne pas marquer en rouge
          setCommonLoaded(false);
          setHostsCfg([]);
          setHostsLoaded(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [role, current, showWelcome, showLicense]);

  const resourcesAvailable = resourcesEnabled && hasLibraryItems;
  const resourcesTabAvailable = resourcesAvailable && postprodCanViewResources;

  const refreshLibraryAvailability = React.useCallback(async () => {
    if (role !== 'server' || showWelcome || showLicense || !resourcesEnabled) {
      setHasLibraryItems(false);
      return;
    }
    try {
      const res = await getLibraryMeta();
      const count = Number(res?.count);
      const itemsCount = Number.isFinite(count)
        ? count
        : (Array.isArray(res?.items) ? res.items.length : 0);
      const hasItems = res?.hasItems === true || itemsCount > 0;
      setHasLibraryItems(hasItems);
    } catch {}
  }, [role, resourcesEnabled, showWelcome, showLicense]);

  useEffect(() => {
    refreshLibraryAvailability();
  }, [refreshLibraryAvailability, resourcesRefreshKey]);


  const versionsList = Array.isArray(commonCfg?.unrealVersions)
    ? commonCfg.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
  const localHost =
    (Array.isArray(hostsCfg)
      ? hostsCfg.find(
          (h) =>
            h &&
            String(h.ip || '').trim().toLowerCase() === localIp
        )
      : null) || ((Array.isArray(hostsCfg) && hostsCfg.length === 1) ? hostsCfg[0] || null : null);
  const localEditors =
    localHost && localHost.unrealEditors && typeof localHost.unrealEditors === 'object'
      ? localHost.unrealEditors
      : {};
  const localEditorEntries = Object.entries(localEditors || {}).filter(([, value]) => {
    const normalized = String(value || "").trim();
    return normalized.length > 0;
  });
  const localEditorPathsByVersion = new Map(
    localEditorEntries.map(([version, value]) => [String(version || "").trim(), String(value || "").trim()])
  );
  const localEditorPaths = Array.from(localEditorPathsByVersion.values()).filter(Boolean);
  const localPrimaryUnrealEditorPath = (
    Array.isArray(versionsList)
      ? versionsList
          .map((v) => String(localEditors?.[v] || '').trim())
          .find((pathValue) => pathValue.length > 0)
      : ''
  ) || localEditorPaths[0] || String(localHost?.unreal_editor || '').trim();
  const localHostName = String(localHost?.name || '').trim();
  const localUnrealVersions = (
    versionsList.length > 0
      ? versionsList.filter((v) => String(localEditors?.[v] || '').trim().length > 0)
      : Array.from(localEditorPathsByVersion.keys()).filter(Boolean)
  );
  const localUnrealVersionsKey = localUnrealVersions.join('|');
  const localRenderAvailability = (() => {
    const VALID = ['capable', 'busy', 'excluded'];
    if (VALID.includes(localHost?.renderAvailability)) return localHost.renderAvailability;
    return localHost?.renderEnabled === false ? 'excluded' : 'capable';
  })();
  const localRenderEnabled = localRenderAvailability !== 'excluded'; // backward compat alias
  const hasLocalUnrealCapability = (
    localEditorPaths.length > 0
    || String(localHost?.unreal_editor || '').trim().length > 0
  );
  const postprodRenderOutputDir = String(
    commonCfg?.render_output_dir
    ?? commonCfg?.renderOutputDir
    ?? (
      (Array.isArray(commonCfg?.render_output_dirs) ? commonCfg.render_output_dirs : (
        Array.isArray(commonCfg?.renderOutputDirs) ? commonCfg.renderOutputDirs : []
      ))
        .map((entry) => String(entry || '').trim())
        .find(Boolean)
    )
    ?? ''
  ).trim();
  const unnamedRenderDestinationLabel = String(
    t("postprod.tasks.form.exportDestinations.undefined", "Aucune destination définie")
  ).trim();
  const postprodRenderExportDestinationOptions = useMemo(
    () => mapRenderExportDestinationOptions(commonCfg, unnamedRenderDestinationLabel),
    [commonCfg, unnamedRenderDestinationLabel]
  );
  const renderWorkerKey = String(safeIdentity.localIp || '').trim()
    || (postprodAuth.user?.username ? `user:${String(postprodAuth.user.username).trim()}` : '');
  const renderWorkerDisplayName = String(localHostName || safeIdentity.localIp || postprodAuth.user?.username || 'Worker')
    .trim();
  const renderWorkerCapabilities = useMemo(() => {
    const runtimePlatform = typeof navigator !== 'undefined'
      ? String(navigator.platform || '').trim().toLowerCase()
      : '';
    const out = {
      unrealEnabled: hasLocalUnrealCapability,
      renderEnabled: localRenderEnabled,
      unrealVersions: localUnrealVersions,
      platform: runtimePlatform,
    };
    if (localHostName) out.hostName = localHostName;
    if (localPrimaryUnrealEditorPath) out.unrealEditorPath = localPrimaryUnrealEditorPath;
    return out;
  }, [hasLocalUnrealCapability, localRenderEnabled, localPrimaryUnrealEditorPath, localUnrealVersionsKey, localHostName]);

  const ensureLocalRenderWorkerOnline = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    const workerKey = String(renderWorkerKey || '').trim();
    if (!token || !workerKey) return false;
    const payloadBase = {
      workerKey,
      displayName: renderWorkerDisplayName,
      capabilities: renderWorkerCapabilities,
      canRender: localRenderEnabled,
      renderAvailability: localRenderAvailability,
      isActive: true,
    };
    try {
      await postprodUpsertRenderWorker(token, { ...payloadBase, isOnline: true });
      return true;
    } catch {
      return false;
    }
  }, [
    postprodAuth.token,
    renderWorkerKey,
    renderWorkerDisplayName,
    renderWorkerCapabilities,
    hasLocalUnrealCapability,
    localRenderEnabled,
    localRenderAvailability,
  ]);

  const postprodRenderWorkersForUi = useMemo(() => {
    const base = Array.isArray(postprodRenderWorkers.items) ? postprodRenderWorkers.items : [];
    const workerKey = String(renderWorkerKey || '').trim();
    if (!workerKey) return base;
    const idx = base.findIndex((entry) => String(entry?.workerKey || '').trim() === workerKey);
    if (idx >= 0) {
      const next = [...base];
      const current = next[idx] && typeof next[idx] === 'object' ? next[idx] : {};
      next[idx] = {
        ...current,
        workerKey,
        displayName: String(current?.displayName || '').trim() || renderWorkerDisplayName || workerKey,
        // La station courante est localement joignable par l'application.
        isOnline: true,
        canRender: localRenderEnabled ? true : current?.canRender,
        renderAvailability: localRenderAvailability,
      };
      return next;
    }
    if (!localRenderEnabled) return base;
    return [
      {
        workerKey,
        displayName: renderWorkerDisplayName || workerKey,
        isOnline: true,
        canRender: true,
        renderAvailability: localRenderAvailability,
        capabilities: renderWorkerCapabilities,
        isActive: true,
      },
      ...base,
    ];
  }, [
    postprodRenderWorkers.items,
    renderWorkerKey,
    renderWorkerDisplayName,
    renderWorkerCapabilities,
    hasLocalUnrealCapability,
    localRenderEnabled,
    localRenderAvailability,
  ]);

  const configMissing =
    role === 'server' &&
    commonLoaded &&
    commonCfg &&
    (
      !Number(commonCfg.rcHttpPort || 0) ||
      versionsList.length === 0 ||
      (hostsLoaded &&
        versionsList.some(
          (v) => !String(localEditors[v] || '').trim()
        ))
    );

  // Quand on valide l’écran Welcome
  async function handleWelcomeContinue(newIdentity) {
    const requestedMode = normalizeAppMode(newIdentity?.mode);
    const mode = postprodModeAccess?.forcedMode
      ? normalizeAppMode(postprodModeAccess.forcedMode)
      : requestedMode;
    const nextIdentity = {
      ...(newIdentity || {}),
      mode,
      role: mode === APP_MODE_POSTPROD
        ? 'server'
        : String(newIdentity?.role || 'server').trim() || 'server',
      serverIp: mode === APP_MODE_POSTPROD
        ? ''
        : String(newIdentity?.serverIp || '').trim(),
    };
    writeIdentity(nextIdentity);
    setIdentity(nextIdentity);
    const allowed = getAllowedTabs({
      role: nextIdentity.mode === APP_MODE_POSTPROD ? "server" : (String(nextIdentity.role || "server").trim() || "server"),
      appMode: nextIdentity.mode,
      clientSyncEnabled,
      resourcesAvailable: resourcesTabAvailable,
      postprodTabs: postprodVisibleTabs,
      postprodCanManageMachines,
      liveAccountTabs,
    });
    setCurrent(resolveDefaultTab(allowed, nextIdentity.mode));
    setInitialClientNavDone(false);
    const latest = await refreshLicenseStatus();
    if (latest && latest.ok) {
      setShowWelcome(false);
      setShowLicense(false);
    } else {
      setShowWelcome(false);
      setShowLicense(true);
      setLicenseOrigin('gate');
    }
  }

  function openLicense(origin) {
    setLicenseOrigin(origin || 'welcome');
    setShowWelcome(false);
    setShowLicense(true);
  }

  function handleLicenseBack() {
    setShowLicense(false);
    setShowWelcome(true);
  }

  function handleLicenseContinue() {
    if (licenseOrigin === 'welcome') {
      setShowLicense(false);
      setShowWelcome(true);
      return;
    }
    setShowLicense(false);
  }

  const {
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
  } = usePostprodNavCallbacks({
    appMode, postprodCanAccessResources, resourcesTabAvailable,
    hostsCfg, localIp, showNotice, t, postprodAuth,
    current, role,
    setCurrent, setResourcesRefreshKey, setUserTabKey, setRoleTabKey, setDatasTabKey,
    setPostprodRenderEditorRequest, setPostprodRenderFormFocusRequest,
    setPostprodEditUserRequest, setHasLibraryItems,
  });

  const {
    loadPostprodUsers,
    loadPostprodMyActivity,
    loadPostprodAudit,
    loadPostprodRenderHealthAuditMaintenance,
    handlePostprodPurgeRenderHealthAudit,
    handlePostprodPurgeAudit,
    exportPostprodAuditAll,
    exportPostprodAuditAllJson,
    exportPostprodAuditAllNdjson,
    loadPostprodRoles,
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
    loadPostprodRenders,
    loadPostprodUserAlerts,
    handlePostprodScanDetectedRenders,
    handlePostprodGenerateRenderProxy,
    loadPostprodRenderTemplates,
    loadPostprodRenderForms,
    loadPostprodRenderHealth,
  } = usePostprodApiCallbacks({
    postprodAuth,
    t,
    showNotice,
    postprodCanManageUsers,
    postprodCanManageRoles,
    postprodAudit,
    postprodWrcCacheNoticeRef,
    postprodRendersRequestSeqRef,
    refreshPostprodProjectWrcSnapshots,
    current,
    hostsCfg,
    localIp,
    safeIdentity,
    setPostprodUsers,
    setPostprodMyActivity,
    setPostprodAudit,
    setPostprodRenderHealthAuditMaintenance,
    setPostprodRoles,
    setPostprodTasks,
    setPostprodProjects,
    setPostprodResources,
    setPostprodTaskCatalog,
    setPostprodRenderProjectCatalog,
    setPostprodRenders,
    setPostprodUserAlerts,
    setPostprodRenderTemplates,
    setPostprodRenderForms,
    setPostprodRenderHealth,
  });

  const {
    replayPostprodWorkerCompletionOutbox,
    resetOutboxState,
  } = usePostprodOutboxCallbacks({
    postprodAuth,
    t,
    showNotice,
    appMode,
    postprodAuthenticated,
    renderWorkerKey,
    localPrimaryUnrealEditorPath,
    postprodOfflineOutbox,
    postprodWorkerCompletionOutbox,
    postprodOfflineOutboxCount,
    postprodWorkerCompletionOutboxCount,
    updatePostprodOfflineOutbox,
    updatePostprodWorkerCompletionOutbox,
    loadPostprodRenders,
    loadPostprodRenderHealth,
    postprodRenderHealth,
  });

  const { handlePostprodLogin, handlePostprodLogout } = usePostprodAuthCallbacks({
    postprodAuth,
    t,
    showNotice,
    safeIdentity,
    applyUserLanguageToIdentity,
    appMode,
    role,
    clientSyncEnabled,
    resourcesTabAvailable,
    resourcesEnabledGlobal,
    postprodCanManageMachines,
    liveAccountTabs,
    postprodVisibleTabs,
    resetOutboxState,
    setPostprodAuth,
    setPostprodUsers,
    setPostprodRoles,
    setPostprodTasks,
    setPostprodTaskCatalog,
    setPostprodProjects,
    setPostprodResources,
    setPostprodRenderProjectCatalog,
    setPostprodRenders,
    setPostprodUserAlerts,
    setPostprodRenderHealth,
    setPostprodRenderWorkers,
    setPostprodRenderTemplates,
    setPostprodRenderForms,
    setPostprodProfile,
    setPostprodMyActivity,
    setPostprodAudit,
    setPostprodRenderHealthAuditMaintenance,
    setIdentity,
    setCurrent,
  });

  const {
    loadPostprodRenderWorkers,
    handlePatchLocalWorkerAptitude,
    handleAptitudeConfirm,
    handleAptitudeCancel,
    handleQueuePausedLaunchConfirm,
    handleQueuePausedLaunchContinue,
    handleBusyImmediateLaunchConfirm,
    handleBusyImmediateLaunchCancel,
    handlePostprodReserveRenderId,
    handlePostprodCreateRender,
    handlePostprodScheduleRender,
    handlePostprodUpdateRenderExportDestinations,
    handlePostprodDeleteRender,
    handlePostprodReorderRenders,
    handlePostprodTransitionRender,
    handlePostprodDispatchRenders,
    handlePostprodPatchWorkerAptitude,
    handlePostprodSaveDispatchPolicy,
  } = usePostprodRenderCallbacks({
    postprodAuth,
    t,
    showNotice,
    ensureLocalRenderWorkerOnline,
    updatePostprodOfflineOutbox,
    loadPostprodRenders,
    loadPostprodRenderHealth,
    loadPostprodUserAlerts,
    loadPostprodTasks,
    aptitudeCheckPending,
    queuePausedLaunchPending,
    busyImmediateLaunchPending,
    postprodOfflineOutboxCount,
    localPrimaryUnrealEditorPath,
    postprodRenderOutputDir,
    renderWorkerKey,
    renderWorkerDisplayName,
    localRenderAvailability,
    postprodRenderWorkers,
    setAptitudeCheckPending,
    setQueuePausedLaunchPending,
    setBusyImmediateLaunchPending,
    setPostprodRenders,
    setPostprodRenderWorkers,
    setHostsCfg,
    setHostsLoaded,
  });

  const {
    handlePostprodUpdateMe,
    handlePostprodCreateUser,
    handlePostprodUpdateUser,
    handlePostprodDeleteUser,
    handlePostprodUpdateUserProjectPermissions,
    handlePostprodToggleUserActive,
    handlePostprodLoadUserActivity,
    handlePostprodPurgeUserActivity,
    handlePostprodLoadUserProjectPermissions,
    handlePostprodCreateRole,
    handlePostprodUpdateRole,
    handlePostprodDeleteRole,
    handlePostprodCreateTask,
    handlePostprodUpdateTask,
    handlePostprodDeleteTask,
    handlePostprodTransitionTask,
    handlePostprodCreateRenderTemplate,
    handlePostprodUpdateRenderTemplate,
    handlePostprodDeleteRenderTemplate,
    handlePostprodCreateRenderForm,
    handlePostprodUpdateRenderForm,
    handlePostprodDeleteRenderForm,
    handlePostprodLoadRenderFormFields,
    handlePostprodReplaceRenderFormFields,
  } = usePostprodEntityMutations({
    postprodAuth,
    t,
    showNotice,
    postprodCanManageUsers,
    postprodCanManageRoles,
    postprodCanManageProjectPermissions,
    postprodCanBanUsers,
    postprodCanManageRenderTemplates,
    applyUserLanguageToIdentity,
    loadPostprodUsers,
    loadPostprodRoles,
    loadPostprodTasks,
    loadPostprodRenderTemplates,
    loadPostprodRenderForms,
    setPostprodProfile,
    setPostprodAuth,
    setPostprodUsers,
    setPostprodRoles,
    setPostprodTasks,
    setPostprodRenderTemplates,
    setPostprodRenderForms,
  });

  usePostprodWorkerRenderLoop({
    postprodAuth, t, showNotice,
    postprodAuthenticated, postprodCanLaunchRenders,
    hasLocalUnrealCapability, localRenderEnabled, localRenderAvailability,
    renderWorkerKey, renderWorkerDisplayName, renderWorkerCapabilities, localPrimaryUnrealEditorPath,
    postprodWorkerCompletionOutbox,
    replayPostprodWorkerCompletionOutbox, updatePostprodWorkerCompletionOutbox,
    loadPostprodRenders, loadPostprodRenderWorkers, loadPostprodRenderHealth,
    handlePostprodDispatchRenders,
  });


  usePostprodTabTriggers({
    postprodAuthenticated, appMode, current,
    postprodCanManageUsers, postprodCanManageRoles,
    postprodCanManageRenderTemplates, postprodCanAccessResources,
    loadPostprodUsers, loadPostprodMyActivity, loadPostprodRoles,
    loadPostprodTasks, loadPostprodTaskCatalog, loadPostprodProjects,
    loadPostprodResources, loadPostprodRenderTemplates, loadPostprodRenderWorkers,
    loadPostprodRenderForms, loadPostprodRenders, loadPostprodRenderProjectCatalog,
    loadPostprodAudit, loadPostprodUserAlerts,
    setPostprodMyActivity, setPostprodRenderHealthAuditMaintenance,
  });

  usePostprodTabRefreshPolling({
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
  });

  usePostprodQueueDispatch({
    appMode, postprodAuthenticated, postprodCanLaunchRenders, localRenderEnabled,
    current, postprodTasks, postprodRenders, postprodAuth,
    handlePostprodCreateRender, ensureLocalRenderWorkerOnline,
    handlePostprodDispatchRenders, handlePatchLocalWorkerAptitude,
  });

  usePostprodNavEffects({
    current, appMode, postprodAuthenticated, role,
    clientSyncEnabled, resourcesTabAvailable, postprodVisibleTabs,
    postprodCanManageMachines, liveAccountTabs, postprodLockedTabs,
    postprodTaskFormOpen, postprodRenderEditorRequest,
    showWelcome, showLicense, initialClientNavDone, safeIdentity,
    setCurrent, setPostprodTaskFormOpen, setPostprodUserEditorOpen,
    setClientSyncEnabled, setInitialClientNavDone,
  });

  // Émettre périodiquement une présence pour que le serveur détecte les machines actives
  useEffect(() => {
    if (showWelcome || showLicense) return;
    const ip = String(safeIdentity.localIp || '').trim();
    const srvIp = String(safeIdentity.serverIp || '').trim();
    const roleNow = String(safeIdentity.role || '').trim();
    if (!ip) return;
    if (roleNow === 'client' && !srvIp) return; // impossible d'atteindre le serveur

    let stopped = false;
    let timer = null;

    const sendPresence = async () => {
      try {
        await postPresence({ ip, name: ip });
      } catch {
        // échec silencieux, on réessaie au tick suivant
      }
      if (!stopped) {
        timer = setTimeout(sendPresence, 5000);
      }
    };

    sendPresence();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [showWelcome, showLicense, safeIdentity.localIp, safeIdentity.serverIp, safeIdentity.role]);

  const { logsNavAlert, usersNavAlert, rendersNavAlert, rendersTopNoticeText } = usePostprodNavAlerts({
    appMode, postprodAuthenticated, t, showNotice,
    logsStorageSummary, postprodAudit, postprodUserAlerts,
  });

  const appShellState = useMemo(() => ({
    auth: { postprodAuth, postprodAuthenticated, postprodModeAccess },
    app: {
      appMode, role, t, current,
      showWelcome, showLicense, licenseOk, licenseStatus,
      noticeApi, noticeContextValue, clientSyncEnabled,
    },
    sidebar: {
      postprodVisibleTabs, postprodCanManageMachines, liveAccountTabs,
      configMissing, resourcesTabAvailable, postprodLockedTabs,
      logsNavAlert, usersNavAlert, rendersNavAlert, rendersTopNoticeText,
    },
    permissions: {
      postprodCanManageUsers, postprodCanManageRoles, postprodCanManageRenderTemplates,
      postprodCanBanUsers, postprodCanManageProjectPermissions,
      postprodCanViewResources, postprodCanAccessResources,
      postprodCanCreateTasks, postprodCanAssignRenderRequests, postprodManageableRoles,
      postprodCanManageConfiguration, postprodCanEditProjects, postprodCanBypassPadForTasks,
      postprodCanLaunchProjects, liveCanEditProjects, liveCanLaunchRuntimeProjects,
      liveCanLaunchEditorProjects, postprodCanManageLayouts,
    },
    data: {
      postprodUsers, postprodRoles, postprodProfile, postprodMyActivity, postprodAudit,
      postprodTasks, postprodTaskCatalog, postprodProjects, postprodResources,
      postprodRenderProjectCatalog, postprodRenders, postprodRenderHealth, postprodRenderHealthView,
      postprodOfflineOutbox, postprodWorkerCompletionOutbox, postprodRenderHealthAuditMaintenance,
      postprodRenderWorkersForUi, postprodRenderWorkers, postprodRenderTemplates, postprodRenderForms,
      postprodRenderOutputDir, postprodRenderExportDestinationOptions,
      postprodRenderEditorRequest, postprodEditUserRequest, postprodRenderFormFocusRequest,
    },
    ui: {
      resourcesRefreshKey, userTabKey, roleTabKey, datasTabKey,
      aptitudeCheckPending, queuePausedLaunchPending, busyImmediateLaunchPending,
      quitDialogOpen, quitOkBtnRef,
    },
  }), [
    postprodAuth, postprodAuthenticated, postprodModeAccess,
    appMode, role, t, current, showWelcome, showLicense, licenseOk, licenseStatus,
    noticeApi, noticeContextValue, clientSyncEnabled,
    postprodVisibleTabs, postprodCanManageMachines, liveAccountTabs,
    configMissing, resourcesTabAvailable, postprodLockedTabs,
    logsNavAlert, usersNavAlert, rendersNavAlert, rendersTopNoticeText,
    postprodCanManageUsers, postprodCanManageRoles, postprodCanManageRenderTemplates,
    postprodCanBanUsers, postprodCanManageProjectPermissions, postprodCanViewResources,
    postprodCanAccessResources, postprodCanCreateTasks, postprodCanAssignRenderRequests,
    postprodManageableRoles, postprodCanManageConfiguration, postprodCanEditProjects,
    postprodCanBypassPadForTasks, postprodCanLaunchProjects, liveCanEditProjects,
    liveCanLaunchRuntimeProjects, liveCanLaunchEditorProjects, postprodCanManageLayouts,
    postprodUsers, postprodRoles, postprodProfile, postprodMyActivity, postprodAudit,
    postprodTasks, postprodTaskCatalog, postprodProjects, postprodResources,
    postprodRenderProjectCatalog, postprodRenders, postprodRenderHealth, postprodRenderHealthView,
    postprodOfflineOutbox, postprodWorkerCompletionOutbox, postprodRenderHealthAuditMaintenance,
    postprodRenderWorkersForUi, postprodRenderWorkers, postprodRenderTemplates, postprodRenderForms,
    postprodRenderOutputDir, postprodRenderExportDestinationOptions,
    postprodRenderEditorRequest, postprodEditUserRequest, postprodRenderFormFocusRequest,
    resourcesRefreshKey, userTabKey, roleTabKey, datasTabKey,
    aptitudeCheckPending, queuePausedLaunchPending, busyImmediateLaunchPending,
    quitDialogOpen, quitOkBtnRef,
  ]);

  const appShellActions = useMemo(() => ({
    nav: { handleNavClick, showNotice },
    auth: { handlePostprodLogin, handlePostprodLogout },
    welcome: {
      handleWelcomeContinue, openLicense, handleLicenseBack, handleLicenseContinue,
      refreshLicenseStatus, setLicenseStatus, setShowWelcome, setShowLicense,
    },
    dialog: { openQuitDialog, closeQuitDialog },
    config: { handleCommonUpdated, setIdentity, handleLibraryImported },
    postprod: {
      handlePostprodScanDetectedRenders, handlePostprodUpdateMe, handlePostprodOpenRenderEditor,
    },
    users: {
      handlePostprodCreateUser, handlePostprodUpdateUser, handlePostprodDeleteUser,
      handlePostprodUpdateUserProjectPermissions, handlePostprodLoadUserActivity,
      handlePostprodLoadUserProjectPermissions, handlePostprodToggleUserActive,
      loadPostprodUsers, handlePostprodOpenUser,
    },
    roles: { handlePostprodCreateRole, handlePostprodUpdateRole, handlePostprodDeleteRole, loadPostprodRoles },
    activity: {
      handlePostprodPurgeUserActivity, handlePostprodOpenActivityTarget, setPostprodEditUserRequest,
      loadPostprodMyActivity, loadPostprodAudit, loadPostprodRenderHealthAuditMaintenance,
      handlePostprodPurgeAudit, handlePostprodPurgeRenderHealthAudit,
      exportPostprodAuditAll, exportPostprodAuditAllJson, exportPostprodAuditAllNdjson,
    },
    tasks: {
      handlePostprodCreateTask, handlePostprodUpdateTask, handlePostprodDeleteTask,
      handlePostprodTransitionTask, loadPostprodTasks,
      setPostprodTaskFormOpen, setPostprodUserEditorOpen, loadPostprodTaskCatalog, loadPostprodProjects,
    },
    projects: {
      handlePostprodLoadProjectRenderTemplates, handlePostprodLoadProjectUnrealCatalog,
      handlePostprodLoadProjectWrcFields, handlePostprodSyncProject,
      handlePostprodLoadProjectDataTables, handlePostprodUpsertDataTableRow,
      handlePostprodUpdateDataTable, handlePostprodNavigateToProject,
    },
    resources: { loadPostprodResources, handlePostprodReindexResources, handlePostprodLoadResourceDetail },
    renderTemplates: {
      handlePostprodCreateRenderTemplate, handlePostprodUpdateRenderTemplate, handlePostprodDeleteRenderTemplate,
    },
    renders: {
      handlePostprodCreateRender, handlePostprodReserveRenderId,
      handlePostprodTransitionRender, handlePostprodLoadRenderTransitions,
      handlePostprodDispatchRenders, handlePostprodSaveDispatchPolicy,
      handlePostprodScheduleRender, handlePostprodUpdateRenderExportDestinations,
      handlePostprodReorderRenders, handlePostprodDeleteRender,
      handlePostprodGenerateRenderProxy, handlePostprodPatchWorkerAptitude,
      loadPostprodRenderTemplates, loadPostprodRenderForms,
      handlePostprodCreateRenderForm, handlePostprodUpdateRenderForm,
      handlePostprodDeleteRenderForm, handlePostprodLoadRenderFormFields,
      handlePostprodReplaceRenderFormFields,
      loadPostprodRenders, loadPostprodRenderHealth, loadPostprodRenderWorkers,
      handlePostprodRenderEditorHandled, handlePostprodEditUserHandled,
      handlePostprodRenderFormFocusHandled, handlePostprodNavigateToRenderForm,
    },
    misc: { setClientSyncEnabled },
    modals: {
      handleAptitudeConfirm, handleAptitudeCancel,
      handleQueuePausedLaunchConfirm, handleQueuePausedLaunchContinue,
      handleBusyImmediateLaunchConfirm, handleBusyImmediateLaunchCancel,
    },
  }), [
    handleNavClick, showNotice, handlePostprodLogin, handlePostprodLogout,
    handleWelcomeContinue, openLicense, handleLicenseBack, handleLicenseContinue,
    refreshLicenseStatus, setLicenseStatus, setShowWelcome, setShowLicense,
    openQuitDialog, closeQuitDialog, handleCommonUpdated, setIdentity, handleLibraryImported,
    handlePostprodScanDetectedRenders, handlePostprodUpdateMe, handlePostprodOpenRenderEditor,
    handlePostprodCreateUser, handlePostprodUpdateUser, handlePostprodDeleteUser,
    handlePostprodUpdateUserProjectPermissions, handlePostprodLoadUserActivity,
    handlePostprodLoadUserProjectPermissions, handlePostprodToggleUserActive,
    loadPostprodUsers, handlePostprodOpenUser, handlePostprodCreateRole,
    handlePostprodUpdateRole, handlePostprodDeleteRole, loadPostprodRoles,
    handlePostprodPurgeUserActivity, handlePostprodOpenActivityTarget, setPostprodEditUserRequest,
    loadPostprodMyActivity, loadPostprodAudit, loadPostprodRenderHealthAuditMaintenance,
    handlePostprodPurgeAudit, handlePostprodPurgeRenderHealthAudit,
    exportPostprodAuditAll, exportPostprodAuditAllJson, exportPostprodAuditAllNdjson,
    handlePostprodCreateTask, handlePostprodUpdateTask, handlePostprodDeleteTask,
    handlePostprodTransitionTask, loadPostprodTasks, setPostprodTaskFormOpen,
    setPostprodUserEditorOpen, loadPostprodTaskCatalog, loadPostprodProjects,
    handlePostprodLoadProjectRenderTemplates, handlePostprodLoadProjectUnrealCatalog,
    handlePostprodLoadProjectWrcFields, handlePostprodSyncProject,
    handlePostprodLoadProjectDataTables, handlePostprodUpsertDataTableRow,
    handlePostprodUpdateDataTable, handlePostprodNavigateToProject, loadPostprodResources,
    handlePostprodReindexResources, handlePostprodLoadResourceDetail,
    handlePostprodCreateRenderTemplate, handlePostprodUpdateRenderTemplate,
    handlePostprodDeleteRenderTemplate, handlePostprodCreateRender,
    handlePostprodReserveRenderId, handlePostprodTransitionRender,
    handlePostprodLoadRenderTransitions, handlePostprodDispatchRenders,
    handlePostprodSaveDispatchPolicy, handlePostprodScheduleRender,
    handlePostprodUpdateRenderExportDestinations, handlePostprodReorderRenders,
    handlePostprodDeleteRender, handlePostprodGenerateRenderProxy,
    handlePostprodPatchWorkerAptitude, loadPostprodRenderTemplates, loadPostprodRenderForms,
    handlePostprodCreateRenderForm, handlePostprodUpdateRenderForm,
    handlePostprodDeleteRenderForm, handlePostprodLoadRenderFormFields,
    handlePostprodReplaceRenderFormFields, loadPostprodRenders,
    loadPostprodRenderHealth, loadPostprodRenderWorkers, handlePostprodRenderEditorHandled,
    handlePostprodEditUserHandled, handlePostprodRenderFormFocusHandled,
    handlePostprodNavigateToRenderForm, setClientSyncEnabled, handleAptitudeConfirm,
    handleAptitudeCancel, handleQueuePausedLaunchConfirm, handleQueuePausedLaunchContinue,
    handleBusyImmediateLaunchConfirm, handleBusyImmediateLaunchCancel,
  ]);

  return <AppShell state={appShellState} actions={appShellActions} />;
}

/* --------------------- Rendu racine --------------------- */
async function bootstrap() {
  try {
    const initialIdentity = readIdentity();
    const initialLang = String(initialIdentity?.lang || 'fr').trim();
    await preloadI18n(initialLang);
  } catch {}

  const root = createRoot(document.getElementById("root"));
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

void bootstrap();
