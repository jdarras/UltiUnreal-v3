import {
  APP_MODE_LIVE,
  APP_MODE_POSTPROD,
  POSTPROD_TAB_USERS,
  POSTPROD_TAB_PROFILES,
  POSTPROD_TAB_RENDERS_CREATE,
  POSTPROD_TABS_BASE,
} from "./appConstants";

function parseUserNotificationPreferencesValue(value = null) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  const raw = String(value || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

function resolveUserShowFabResourcesPreference(user = null) {
  if (!user || typeof user !== "object") return true;
  const prefs = parseUserNotificationPreferencesValue(
    user?.notificationPreferences && typeof user.notificationPreferences === "object"
      ? user.notificationPreferences
      : user?.notificationPrefsJson
  );
  return prefs?.showFabResources !== false;
}

function getPostprodTabsForUser(
  user = null,
  authenticated = false,
  {
    resourcesEnabled = true,
  } = {}
) {
  if (!authenticated || !user || typeof user !== 'object') return [POSTPROD_TAB_USERS];
  const canManageRoles = user?.permissions?.canManageRoles === true;
  const canManageForms = user?.permissions?.canManageForms === true;
  const canCreateTasks = user?.permissions?.canCreateTasks !== false;
  const canSyncScenes = user?.permissions?.canSyncScenes === true;
  const canViewResources = user?.permissions?.canViewResources !== false;
  const canAccessResources = canViewResources && resourcesEnabled;
  const tabs = [];
  if (canManageRoles) tabs.push(POSTPROD_TAB_PROFILES);
  tabs.push(POSTPROD_TAB_USERS);
  tabs.push(
    ...POSTPROD_TABS_BASE.filter(
      (tab) => (
        tab !== POSTPROD_TAB_USERS
        && (tab !== "Datas" || canManageForms)
        && (tab !== "Ressources" || canAccessResources)
        && (tab !== POSTPROD_TAB_RENDERS_CREATE || canCreateTasks)
        && (tab !== "Synchronisation" || canSyncScenes)
      )
    )
  );
  return tabs;
}

function getModeAccessForUser(user = null, authenticated = false) {
  if (!authenticated || !user || typeof user !== "object") {
    return {
      canUseLive: true,
      canUsePostprod: true,
      canChooseMode: true,
      forcedMode: null,
    };
  }

  const explicitCanUseLive = user?.permissions?.canUseLiveMode;
  const explicitCanUsePostprod = user?.permissions?.canUsePostprodMode;
  const canUseLive = typeof explicitCanUseLive === "boolean"
    ? explicitCanUseLive
    : true;
  const canUsePostprod = typeof explicitCanUsePostprod === "boolean"
    ? explicitCanUsePostprod
    : true;
  const canChooseMode = canUseLive && canUsePostprod;
  const forcedMode = canChooseMode
    ? null
    : (canUsePostprod ? APP_MODE_POSTPROD : (canUseLive ? APP_MODE_LIVE : APP_MODE_POSTPROD));

  return {
    canUseLive,
    canUsePostprod,
    canChooseMode,
    forcedMode,
  };
}

function normalizeAppMode(mode) {
  return String(mode || '').trim().toLowerCase() === APP_MODE_POSTPROD
    ? APP_MODE_POSTPROD
    : APP_MODE_LIVE;
}

function getLiveAccountTabs({ authenticated = false, canManageUsers = false, canManageRoles = false } = {}) {
  if (!authenticated) return [];
  const tabs = [];
  if (canManageRoles) tabs.push(POSTPROD_TAB_PROFILES);
  if (canManageUsers) tabs.push(POSTPROD_TAB_USERS);
  return tabs;
}

function getAllowedTabs({
  role,
  appMode,
  clientSyncEnabled,
  resourcesAvailable,
  postprodTabs = POSTPROD_TABS_BASE,
  postprodCanManageMachines = true,
  liveAccountTabs = [],
}) {
  if (appMode === APP_MODE_POSTPROD) {
    return role === "server"
      ? [...(postprodCanManageMachines ? ["Setup"] : []), "Configuration", ...postprodTabs, "Logs"]
      : [...(postprodCanManageMachines ? ["Setup"] : []), ...postprodTabs, "Logs"];
  }

  const accountTabs = Array.isArray(liveAccountTabs) ? liveAccountTabs : [];

  if (role === "server") {
    const allowed = ["Setup", "Configuration", "Projets", "Synchronisation", "Launch Control", "Production", "Logs"];
    if (resourcesAvailable) allowed.splice(2, 0, "Ressources");
    if (accountTabs.length > 0) {
      const logsIdx = allowed.indexOf('Logs');
      const insertAt = logsIdx >= 0 ? logsIdx : allowed.length;
      allowed.splice(insertAt, 0, ...accountTabs);
    }
    return allowed;
  }

  return clientSyncEnabled
    ? ["Setup", "Synchronisation", ...accountTabs, "Logs"]
    : ["Setup", "Projets", ...accountTabs, "Logs"];
}

function resolveDefaultTab(allowedTabs = [], appMode = APP_MODE_LIVE) {
  const tabs = Array.isArray(allowedTabs) ? allowedTabs : [];
  if (tabs.includes("Projets")) return "Projets";
  if (tabs.length > 0) return tabs[0];
  return appMode === APP_MODE_POSTPROD ? POSTPROD_TAB_USERS : "Setup";
}

export {
  parseUserNotificationPreferencesValue,
  resolveUserShowFabResourcesPreference,
  getPostprodTabsForUser,
  getModeAccessForUser,
  normalizeAppMode,
  getLiveAccountTabs,
  getAllowedTabs,
  resolveDefaultTab,
};
