import { useCallback, useEffect } from "react";
import { postprodAuthLogin, postprodAuthLogout, postprodAuthMe } from "../utils/agent";
import { resolvePostprodAuthError } from "../utils/postprodErrorHelpers";
import {
  getModeAccessForUser,
  getPostprodTabsForUser,
  getAllowedTabs,
  resolveDefaultTab,
  normalizeAppMode,
  resolveUserShowFabResourcesPreference,
} from "../utils/postprodPermissionsHelpers";
import { readIdentity, writeIdentity } from "../utils/identity";
import { writePostprodAuth } from "../utils/postprodAuthHelpers";
import { APP_MODE_POSTPROD } from "../utils/appConstants";

function usePostprodAuthCallbacks({
  postprodAuth, t, showNotice,
  safeIdentity, applyUserLanguageToIdentity,
  appMode, role, clientSyncEnabled,
  resourcesTabAvailable, resourcesEnabledGlobal,
  postprodCanManageMachines, liveAccountTabs, postprodVisibleTabs,
  resetOutboxState,
  setPostprodAuth, setPostprodUsers, setPostprodRoles, setPostprodTasks,
  setPostprodTaskCatalog, setPostprodProjects, setPostprodResources,
  setPostprodRenderProjectCatalog, setPostprodRenders, setPostprodUserAlerts,
  setPostprodRenderHealth, setPostprodRenderWorkers, setPostprodRenderTemplates,
  setPostprodRenderForms, setPostprodProfile, setPostprodMyActivity,
  setPostprodAudit, setPostprodRenderHealthAuditMaintenance,
  setIdentity, setCurrent,
}) {
  const clearPostprodAuth = useCallback((errorText = '') => {
    resetOutboxState();
    writePostprodAuth(null);
    setPostprodAuth({
      token: '',
      user: null,
      expiresAt: '',
      busy: false,
      error: String(errorText || ''),
      hydrated: true,
    });
    setPostprodUsers({ items: [], loading: false, error: '' });
    setPostprodRoles({ items: [], loading: false, error: '' });
    setPostprodTasks({ items: [], loading: false, error: '' });
    setPostprodTaskCatalog({ projects: [], resources: [], loading: false, error: '' });
    setPostprodProjects({ items: [], loading: false, error: '' });
    setPostprodResources({ items: [], loading: false, error: '', source: '', sync: null });
    setPostprodRenderProjectCatalog({ items: [], loading: false, error: '' });
    setPostprodRenders({ items: [], loading: false, error: '', detectedScan: null });
    setPostprodUserAlerts({ items: [], summary: null, loading: false, error: '' });
    setPostprodRenderHealth({ data: null, loading: false, error: '' });
    setPostprodRenderWorkers({ items: [], loading: false, error: '' });
    setPostprodRenderTemplates({ items: [], loading: false, error: '' });
    setPostprodRenderForms({ items: [], loading: false, error: '' });
    setPostprodProfile({ saving: false, error: '' });
    setPostprodMyActivity({
      activities: [],
      summary: { total: 0, actions: {}, projects: [] },
      loading: false,
      error: '',
    });
    setPostprodAudit({
      entries: [],
      loading: false,
      error: '',
      total: 0,
      page: 1,
      pageSize: 100,
      hasMore: false,
      filters: {
        actorUserId: null,
        action: '',
        scopeType: '',
        fromAt: '',
        toAt: '',
      },
    });
    setPostprodRenderHealthAuditMaintenance({
      data: null,
      loading: false,
      error: '',
      purging: false,
      purgeError: '',
      lastPurge: null,
    });
  }, [resetOutboxState, setPostprodAudit, setPostprodAuth, setPostprodMyActivity, setPostprodProfile, setPostprodProjects, setPostprodRenderForms, setPostprodRenderHealth, setPostprodRenderHealthAuditMaintenance, setPostprodRenderProjectCatalog, setPostprodRenderTemplates, setPostprodRenderWorkers, setPostprodRenders, setPostprodResources, setPostprodRoles, setPostprodTaskCatalog, setPostprodTasks, setPostprodUserAlerts, setPostprodUsers]);

  const handlePostprodLogin = useCallback(async (credentials = {}) => {
    setPostprodAuth((prev) => ({ ...prev, busy: true, error: '' }));
    try {
      if (typeof window !== 'undefined' && typeof window.electron?.startAgent === 'function') {
        const rawPort = Number(safeIdentity.agentPort);
        const normalizedPort = Number.isFinite(rawPort) && rawPort > 0 && rawPort < 65536
          ? String(Math.trunc(rawPort))
          : '4000';
        const boot = await window.electron.startAgent(normalizedPort);
        if (boot && typeof boot === 'object' && boot.ok === false) {
          const bootError = Object.assign(
            new Error(String(boot.error || 'postprod_unavailable')),
            { code: 'postprod_unavailable', status: 503 }
          );
          throw bootError;
        }
      }
      const res = await postprodAuthLogin(credentials);
      const token = String(res?.token || '').trim();
      const user = res?.user && typeof res.user === 'object' ? res.user : null;
      const expiresAt = String(res?.session?.expiresAt || '').trim();
      if (!token || !user) {
        throw Object.assign(new Error('invalid_session'), { code: 'invalid_session', status: 401 });
      }
      const payload = { token, user, expiresAt };
      const modeAccess = getModeAccessForUser(user, true);
      const persistedIdentity = readIdentity() || {};
      const persistedMode = normalizeAppMode(persistedIdentity?.mode);
      const normalizedMode = modeAccess?.forcedMode
        ? normalizeAppMode(modeAccess.forcedMode)
        : persistedMode;
      const nextIdentity = {
        ...persistedIdentity,
        mode: normalizedMode,
        role: normalizedMode === APP_MODE_POSTPROD
          ? 'server'
          : (String(persistedIdentity?.role || 'server').trim() || 'server'),
        serverIp: normalizedMode === APP_MODE_POSTPROD
          ? ''
          : String(persistedIdentity?.serverIp || '').trim(),
      };
      writeIdentity(nextIdentity);
      setIdentity(nextIdentity);
      writePostprodAuth(payload);
      setPostprodAuth({
        ...payload,
        busy: false,
        error: '',
        hydrated: true,
      });
      applyUserLanguageToIdentity(user);
      setPostprodProfile({ saving: false, error: '' });
      const nextResourcesEnabled = resourcesEnabledGlobal && resolveUserShowFabResourcesPreference(user);
      const nextTabs = getPostprodTabsForUser(user, true, {
        resourcesEnabled: nextResourcesEnabled,
      });
      const allowed = getAllowedTabs({
        role: normalizedMode === APP_MODE_POSTPROD
          ? "server"
          : (String(nextIdentity.role || "server").trim() || "server"),
        appMode: normalizedMode,
        clientSyncEnabled,
        resourcesAvailable: resourcesTabAvailable,
        postprodTabs: normalizedMode === APP_MODE_POSTPROD ? nextTabs : postprodVisibleTabs,
        postprodCanManageMachines,
        liveAccountTabs,
      });
      setCurrent(allowed.includes("Projets") ? "Projets" : resolveDefaultTab(allowed, normalizedMode));
      showNotice(t('app.auth.msg.loginOk'), 'ok');
    } catch (e) {
      const msg = resolvePostprodAuthError(e, t);
      setPostprodAuth((prev) => ({
        ...prev,
        busy: false,
        error: msg,
        hydrated: true,
      }));
    }
  }, [
    showNotice,
    t,
    safeIdentity.agentPort,
    applyUserLanguageToIdentity,
    clientSyncEnabled,
    resourcesTabAvailable,
    resourcesEnabledGlobal,
    postprodCanManageMachines,
    liveAccountTabs,
    postprodVisibleTabs,
    setCurrent,
    setIdentity,
    setPostprodAuth,
    setPostprodProfile,
  ]);

  const handlePostprodLogout = useCallback(async () => {
    const token = String(postprodAuth.token || '').trim();
    setPostprodAuth((prev) => ({ ...prev, busy: true, error: '' }));
    try {
      if (token) {
        await postprodAuthLogout(token).catch(() => ({}));
      }
    } finally {
      clearPostprodAuth('');
      const allowed = getAllowedTabs({
        role,
        appMode,
        clientSyncEnabled,
        resourcesAvailable: resourcesTabAvailable,
        postprodTabs: postprodVisibleTabs,
        postprodCanManageMachines,
        liveAccountTabs,
      });
      setCurrent(resolveDefaultTab(allowed, appMode));
      showNotice(t('app.auth.msg.logoutOk'), 'info');
    }
  }, [
    postprodAuth.token,
    clearPostprodAuth,
    showNotice,
    t,
    appMode,
    role,
    clientSyncEnabled,
    resourcesTabAvailable,
    postprodVisibleTabs,
    postprodCanManageMachines,
    liveAccountTabs,
    setCurrent,
    setPostprodAuth,
  ]);
  useEffect(() => {
    let cancelled = false;
    const token = String(postprodAuth.token || '').trim();

    if (!token) {
      setPostprodAuth((prev) => prev.hydrated ? prev : ({ ...prev, hydrated: true }));
      return;
    }
    if (postprodAuth.hydrated && postprodAuth.user) return;

    setPostprodAuth((prev) => ({ ...prev, busy: true, error: '' }));
    (async () => {
      try {
        const me = await postprodAuthMe(token);
        if (cancelled) return;
        const user = me?.user && typeof me.user === 'object' ? me.user : null;
        if (!user) {
          throw Object.assign(new Error('invalid_session'), { code: 'invalid_session', status: 401 });
        }
        const expiresAt = String(me?.session?.expiresAt || postprodAuth.expiresAt || '').trim();
        const payload = { token, user, expiresAt };
        writePostprodAuth(payload);
        setPostprodAuth({
          ...payload,
          busy: false,
          error: '',
          hydrated: true,
        });
        applyUserLanguageToIdentity(user);
      } catch {
        if (cancelled) return;
        const isInitialHydration = !postprodAuth.hydrated;
        const message = isInitialHydration ? '' : t('postprod.auth.error.invalidSession');
        clearPostprodAuth(message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    postprodAuth.token,
    postprodAuth.user,
    postprodAuth.hydrated,
    postprodAuth.expiresAt,
    clearPostprodAuth,
    applyUserLanguageToIdentity,
    t,
    setPostprodAuth,
  ]);

  return { clearPostprodAuth, handlePostprodLogin, handlePostprodLogout };
}

export { usePostprodAuthCallbacks };