import { memo, useCallback, useEffect, useMemo } from "react";
import {
  APP_VERSION,
  APP_MODE_POSTPROD,
  POSTPROD_TAB_USERS,
  POSTPROD_TAB_PROFILES,
  POSTPROD_TAB_RENDERS_CREATE,
  POSTPROD_TABS_BASE,
} from "../utils/appConstants";
import { preloadPostproductionTab } from "../screens/postproduction/preloaders";

const preloaders = {
  Projets: () => import("../screens/projects.jsx"),
  Ressources: () => import("../screens/resources.jsx"),
  Synchronisation: () => import("../screens/synchronisation.jsx"),
  "Launch Control": () => import("../screens/launchcontrol.jsx"),
  Production: () => import("../screens/production.jsx"),
  Logs: () => import("../screens/logs.jsx"),
  Configuration: () => import("../screens/configuration.jsx"),
  License: () => import("../screens/license.jsx"),
};

function resolvePostprodTabForNavItem(item, { appMode, role }) {
  const navItem = String(item || "").trim();
  if (!navItem) return "";
  if (
    navItem === POSTPROD_TAB_USERS
    || navItem === POSTPROD_TAB_PROFILES
    || navItem === POSTPROD_TAB_RENDERS_CREATE
    || navItem === "Rendus"
    || navItem === "Datas"
  ) {
    return navItem;
  }
  if (navItem === "Logs" && appMode === APP_MODE_POSTPROD) {
    return "Historique";
  }
  if (
    appMode === APP_MODE_POSTPROD
    && role !== "server"
    && (navItem === "Projets" || navItem === "Ressources")
  ) {
    return navItem;
  }
  return "";
}

function getSidebarItems({
  role,
  appMode,
  clientSyncEnabled,
  resourcesAvailable,
  postprodTabs = POSTPROD_TABS_BASE,
  postprodCanManageMachines = true,
  liveAccountTabs = [],
}) {
  if (appMode === APP_MODE_POSTPROD) {
    const tabs = Array.isArray(postprodTabs) ? postprodTabs : [];
    const hasProfiles = tabs.includes(POSTPROD_TAB_PROFILES);
    const hasUsers = tabs.includes(POSTPROD_TAB_USERS);
    const accountTabs = [
      ...(hasProfiles ? [POSTPROD_TAB_PROFILES] : []),
      ...(hasUsers ? [POSTPROD_TAB_USERS] : []),
    ];
    const restTabs = tabs.filter(
      (tab) => (
        tab !== POSTPROD_TAB_PROFILES
        && tab !== POSTPROD_TAB_USERS
        && tab !== POSTPROD_TAB_RENDERS_CREATE
      )
    );
    return [...accountTabs, ...(postprodCanManageMachines ? ["Setup"] : []), ...restTabs, "Logs"];
  }

  const accountTabs = Array.isArray(liveAccountTabs) ? liveAccountTabs : [];

  return role === "server"
    ? [...accountTabs, "Setup", "Projets", ...(resourcesAvailable ? ["Ressources"] : []), "Synchronisation", "Launch Control", "Production", "Logs"]
    : clientSyncEnabled
      ? [...accountTabs, "Setup", "Synchronisation", "Logs"]
      : [...accountTabs, "Setup", "Projets", "Logs"];
}

function Sidebar({
  current,
  setCurrent,
  role,
  appMode,
  t,
  clientSyncEnabled,
  postprodTabs = POSTPROD_TABS_BASE,
  postprodCanManageMachines = true,
  liveAccountTabs = [],
  configMissing,
  resourcesAvailable,
  postprodLockedTabs = [],
  postprodLockedTitle = '',
  logsAlert = null,
  usersAlert = null,
  rendersAlert = null,
  postprodUser = null,
  onUserClick = null,
}) {
  const items = useMemo(() => getSidebarItems({
    role,
    appMode,
    clientSyncEnabled,
    resourcesAvailable,
    postprodTabs,
    postprodCanManageMachines,
    liveAccountTabs,
  }), [
    role,
    appMode,
    clientSyncEnabled,
    resourcesAvailable,
    postprodTabs,
    postprodCanManageMachines,
    liveAccountTabs,
  ]);
  const modeLabel = appMode === APP_MODE_POSTPROD
    ? t('app.mode.short.postprod', 'Post-production')
    : t('app.mode.short.live', 'Live');
  const preloadNavItem = useCallback((item) => {
    const postprodTabKey = resolvePostprodTabForNavItem(item, { appMode, role });
    if (postprodTabKey) {
      void preloadPostproductionTab(postprodTabKey);
      return;
    }
    preloaders[item]?.();
  }, [appMode, role]);

  useEffect(() => {
    const activeIndex = items.findIndex((item) => (
      item === current
      || (item === "Rendus" && current === POSTPROD_TAB_RENDERS_CREATE)
    ));
    if (activeIndex < 0) return;
    const neighbors = [items[activeIndex - 1], items[activeIndex + 1]].filter(Boolean);
    for (const item of neighbors) {
      preloadNavItem(item);
    }
  }, [items, current, preloadNavItem]);

  const labelMap = useMemo(() => ({
    Setup: t('nav.machines'),
    Projets: t('nav.projects'),
    Synchronisation: t('nav.sync'),
    'Launch Control': t('nav.launch'),
    Production: t('nav.production'),
    Ressources: t('nav.resources'),
    Utilisateurs: t('nav.users'),
    Rendus: t('nav.renders'),
    Datas: t('nav.data'),
    Profils: t('nav.profiles'),
    Logs: appMode === APP_MODE_POSTPROD ? t('nav.historyLogs') : t('nav.logs'),
  }), [appMode, t]);

  return (
    <aside className="uu-sidebar">
      <div className="uu-sidebar-title">UltiUnreal</div>
      <div className="uu-sidebar-mode">{modeLabel}</div>

      {/* onglets "classiques" */}
      <nav className="uu-nav">
        {items.map((item) => {
          const locked = postprodLockedTabs.includes(item);
          const isActive = (
            current === item
            || (item === "Rendus" && current === POSTPROD_TAB_RENDERS_CREATE)
          );
          const isLogs = item === 'Logs';
          const isUsers = item === 'Utilisateurs';
          const isRenders = item === 'Rendus';
          const activeAlert = isLogs
            ? logsAlert
            : (isUsers ? usersAlert : (isRenders ? rendersAlert : null));
          const logsClass = activeAlert?.level === 'error'
            ? ' logs-alert-error'
            : (activeAlert?.level === 'warn' ? ' logs-alert-warn' : '');
          const logsTitle = locked
            ? postprodLockedTitle
            : (activeAlert?.tooltip || undefined);
          return (
          <button
            key={item}
            className={`uu-nav-btn ${isActive ? "active" : ""}${logsClass}${locked ? " locked" : ""}`}
            disabled={locked}
            onClick={() => {
              if (locked) return;
              // Permet de "revenir" à la liste depuis un détail même si l'onglet est déjà actif
              if (current === item) {
                if (item === "Projets" && typeof window.closeProjectDetail === 'function') {
                  window.closeProjectDetail();
                } else if (item === "Ressources" && typeof window.closeResourceDetail === 'function') {
                  window.closeResourceDetail();
                }
              }
              setCurrent(item);
            }}
            onMouseEnter={() => preloadNavItem(item)}
            onFocus={() => preloadNavItem(item)}
            title={logsTitle}
          >
            {labelMap[item] || item}
          </button>
          );
        })}
      </nav>

      {/* bas de la sidebar : carte utilisateur + config */}
      {(postprodUser || role === "server") && (
        <div className="uu-sidebar-bottom">
          {postprodUser ? (
            <button
              type="button"
              className="uu-sidebar-user"
              onClick={onUserClick}
            >
              {/^data:image\//i.test(String(postprodUser.avatarPath || '')) || /^https?:\/\//i.test(String(postprodUser.avatarPath || '')) ? (
                <img
                  className="uu-sidebar-user-avatar"
                  src={postprodUser.avatarPath}
                  alt=""
                  aria-hidden="true"
                />
              ) : (
                <div className="uu-sidebar-user-avatar uu-sidebar-user-avatar-fallback" aria-hidden="true">
                  {String(postprodUser.displayName || postprodUser.username || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="uu-sidebar-user-info">
                <span className="uu-sidebar-user-name">
                  {postprodUser.displayName || postprodUser.username || '–'}
                </span>
                <span className="uu-sidebar-user-role">
                  {postprodUser.role || ''}
                </span>
              </div>
            </button>
          ) : null}

          {role === "server" && (
            <div className="uu-sidebar-footer">
              <button
                type="button"
                className={`uu-nav-btn uu-nav-btn-gear ${
                  current === "Configuration" ? "active" : ""
                } ${
                  configMissing ? "gear-missing" : ""
                }`}
                onClick={() => setCurrent("Configuration")}
                onMouseEnter={() => preloadNavItem("Configuration")}
                onFocus={() => preloadNavItem("Configuration")}
                title={configMissing ? t('config.gearMissingTooltip') || 'Configuration incomplète' : undefined}
              >
                <span className="uu-gear-icon" aria-hidden="true">
                  ⚙
                </span>
              </button>

              <div className="uu-sidebar-version">
                JDarrasVP – {APP_VERSION}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default memo(Sidebar);
