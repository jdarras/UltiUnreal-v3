import React, { Suspense, useEffect } from "react";
import { NoticeContext } from "../NoticeContext";
import Sidebar from "./Sidebar";
import { buildPostprodScreenProps } from "./postprodScreenProps";
import { ConfirmDialog } from "./ConfirmDialog";
import { resolveConfirmDialogLabels } from "./confirmDialogLabels";
import { getQuitConfirmMessageLabel } from "./componentI18n";
import Welcome from "../screens/welcome.jsx";
import SetupScreen from "../screens/setup.jsx";
import AuthGateScreen from "../screens/authgate.jsx";
import { AptitudeCheckModal } from "../screens/postproduction/renders/components/AptitudeCheckModal";
import {
  APP_VERSION,
  APP_MODE_LIVE,
  APP_MODE_POSTPROD,
  POSTPROD_TAB_USERS,
} from "../utils/appConstants";

const ProjectsScreen = React.lazy(() => import("../screens/projects.jsx"));
const ResourcesScreen = React.lazy(() => import("../screens/resources.jsx"));
const LogsScreen = React.lazy(() => import("../screens/logs.jsx"));
const LaunchControlScreen = React.lazy(() => import("../screens/launchcontrol.jsx"));
const ProductionScreen = React.lazy(() => import("../screens/production.jsx"));
const SynchronisationScreen = React.lazy(() => import("../screens/synchronisation.jsx"));
const ConfigurationScreen = React.lazy(() => import("../screens/configuration.jsx"));
const LicenseScreen = React.lazy(() => import("../screens/license.jsx"));
const PostProductionScreen = React.lazy(() => import("../screens/postproduction.jsx"));

const APP_SHELL_SCREEN_FALLBACK_STYLE = { padding: '24px' };
const APP_SHELL_HYDRATING_SECTION_STYLE = { margin: '24px auto' };
const ScreenFallback = <div className="uu-loading" style={APP_SHELL_SCREEN_FALLBACK_STYLE}>…</div>;

function buildAppShellLaunchControlVisibilityStyle(isLaunchControlActive) {
  return { display: isLaunchControlActive ? "block" : "none" };
}

function isServerPostprodScreenActive(ctx) {
  return (
    ctx.role === "server"
    && ctx.appMode === APP_MODE_POSTPROD
    && (ctx.postprodVisibleTabs.includes(ctx.current) || ctx.current === "Logs" || ctx.current === POSTPROD_TAB_USERS)
    && ctx.current !== "Projets"
    && ctx.current !== "Ressources"
    && ctx.current !== "Synchronisation"
  );
}

function isServerLiveAccountScreenActive(ctx) {
  return (
    ctx.role === "server"
    && ctx.appMode === APP_MODE_LIVE
    && ctx.liveAccountTabs.includes(ctx.current)
  );
}

function isClientPostprodScreenActive(ctx) {
  return (
    ctx.role === "client"
    && ctx.appMode === APP_MODE_POSTPROD
    && (ctx.postprodVisibleTabs.includes(ctx.current) || ctx.current === "Logs" || ctx.current === POSTPROD_TAB_USERS)
    && ctx.current !== "Synchronisation"
  );
}

function isClientLiveAccountScreenActive(ctx) {
  return (
    ctx.role === "client"
    && ctx.appMode === APP_MODE_LIVE
    && ctx.liveAccountTabs.includes(ctx.current)
  );
}

function resolveScreenViewportKind(ctx) {
  if (!ctx || typeof ctx !== "object") return "none";
  if (ctx.role === "server") {
    if (ctx.current === "Setup" && (ctx.appMode !== APP_MODE_POSTPROD || ctx.postprodCanManageMachines)) return "server_setup";
    if (ctx.current === "Configuration") return "server_configuration";
    if (ctx.appMode === APP_MODE_LIVE && ctx.current === "Projets") return "server_live_projects";
    if (ctx.appMode === APP_MODE_LIVE && ctx.resourcesTabAvailable && ctx.current === "Ressources") return "server_live_resources";
    if (ctx.appMode === APP_MODE_LIVE && ctx.current === "Synchronisation") return "server_live_sync";
    if (ctx.appMode === APP_MODE_LIVE && ctx.current === "Production") return "server_live_production";
    if (ctx.appMode === APP_MODE_LIVE && ctx.current === "Logs") return "server_live_logs";
    if (ctx.appMode === APP_MODE_POSTPROD && ctx.postprodAuthenticated && ctx.current === "Projets") return "server_postprod_projects";
    if (ctx.appMode === APP_MODE_POSTPROD && ctx.postprodAuthenticated && ctx.postprodCanAccessResources && ctx.current === "Ressources") return "server_postprod_resources";
    if (ctx.appMode === APP_MODE_POSTPROD && ctx.postprodAuthenticated && ctx.current === "Synchronisation") return "server_postprod_sync";
    if (isServerPostprodScreenActive(ctx)) return "server_postprod_screen";
    if (isServerLiveAccountScreenActive(ctx)) return "server_live_account_screen";
    if (ctx.appMode === APP_MODE_LIVE) return "server_live_other";
    return "server_other";
  }
  if (ctx.role === "client") {
    if (ctx.current === "Setup" && (ctx.appMode !== APP_MODE_POSTPROD || ctx.postprodCanManageMachines)) return "client_setup";
    if (ctx.appMode === APP_MODE_LIVE && ctx.current === "Projets") return "client_live_projects";
    if (ctx.appMode === APP_MODE_LIVE && ctx.current === "Synchronisation") return "client_live_sync";
    if (ctx.appMode === APP_MODE_LIVE && ctx.current === "Logs") return "client_live_logs";
    if (ctx.appMode === APP_MODE_POSTPROD && ctx.postprodAuthenticated && ctx.current === "Synchronisation") return "client_postprod_sync";
    if (isClientPostprodScreenActive(ctx)) return "client_postprod_screen";
    if (isClientLiveAccountScreenActive(ctx)) return "client_live_account_screen";
    return "client_other";
  }
  return "none";
}

function areScreenViewportPropsEqual(prevProps, nextProps) {
  const prev = prevProps?.ctx;
  const next = nextProps?.ctx;
  if (prev === next) return true;
  if (!prev || !next) return false;

  const prevKind = resolveScreenViewportKind(prev);
  const nextKind = resolveScreenViewportKind(next);
  if (prevKind !== nextKind) return false;
  if (prev.role !== next.role || prev.appMode !== next.appMode || prev.current !== next.current || prev.offsetClass !== next.offsetClass) {
    return false;
  }

  // LaunchControlScreen is kept mounted in server/live mode (hidden when inactive).
  if (next.role === "server" && next.appMode === APP_MODE_LIVE) {
    if (
      prev.liveCanLaunchRuntimeProjects !== next.liveCanLaunchRuntimeProjects
      || prev.liveCanLaunchEditorProjects !== next.liveCanLaunchEditorProjects
      || prev.liveCanEditProjects !== next.liveCanEditProjects
    ) {
      return false;
    }
  }

  switch (nextKind) {
    case "server_setup":
      return prev.postprodCanManageMachines === next.postprodCanManageMachines;
    case "client_setup":
      return (
        prev.postprodCanManageMachines === next.postprodCanManageMachines
        && prev.clientSyncEnabled === next.clientSyncEnabled
        && prev.setClientSyncEnabled === next.setClientSyncEnabled
      );
    case "server_configuration":
      return (
        prev.licenseStatus === next.licenseStatus
        && prev.handleCommonUpdated === next.handleCommonUpdated
        && prev.handleNavClick === next.handleNavClick
        && prev.handleLibraryImported === next.handleLibraryImported
        && prev.setIdentity === next.setIdentity
        && prev.handlePostprodScanDetectedRenders === next.handlePostprodScanDetectedRenders
        && prev.handlePostprodUpdateMe === next.handlePostprodUpdateMe
        && prev.postprodCanViewResources === next.postprodCanViewResources
        && prev.postprodCanEditProjects === next.postprodCanEditProjects
        && prev.postprodCanManageConfiguration === next.postprodCanManageConfiguration
        && prev.liveCanLaunchEditorProjects === next.liveCanLaunchEditorProjects
        && prev.postprodUser === next.postprodUser
      );
    case "server_live_projects":
      return (
        prev.liveCanLaunchEditorProjects === next.liveCanLaunchEditorProjects
        && prev.liveCanEditProjects === next.liveCanEditProjects
      );
    case "server_postprod_projects":
      return (
        prev.postprodCanLaunchProjects === next.postprodCanLaunchProjects
        && prev.postprodCanEditProjects === next.postprodCanEditProjects
        && prev.postprodCanCreateTasks === next.postprodCanCreateTasks
        && prev.postprodCanBypassPadForTasks === next.postprodCanBypassPadForTasks
        && prev.handlePostprodOpenRenderEditor === next.handlePostprodOpenRenderEditor
      );
    case "server_live_resources":
    case "server_postprod_resources":
      return prev.resourcesRefreshKey === next.resourcesRefreshKey;
    case "server_live_production":
      return prev.postprodCanManageLayouts === next.postprodCanManageLayouts;
    case "server_postprod_screen":
    case "server_live_account_screen":
      return (
        prev.postprodScreenSharedProps === next.postprodScreenSharedProps
        && prev.postprodServerOnlyProps === next.postprodServerOnlyProps
        && prev.postprodTabKey === next.postprodTabKey
        && prev.postprodTitleOverride === next.postprodTitleOverride
      );
    case "client_postprod_screen":
    case "client_live_account_screen":
      return (
        prev.postprodScreenSharedProps === next.postprodScreenSharedProps
        && prev.postprodTabKey === next.postprodTabKey
      );
    default:
      return true;
  }
}

const ScreenViewport = React.memo(function ScreenViewport({ ctx }) {
  const {
    offsetClass,
    role,
    current,
    appMode,
    postprodAuthenticated,
    postprodCanManageMachines,
    postprodCanViewResources,
    postprodCanAccessResources,
    postprodCanCreateTasks,
    postprodCanManageConfiguration,
    postprodCanEditProjects,
    postprodCanBypassPadForTasks,
    postprodCanLaunchProjects,
    liveCanEditProjects,
    liveCanLaunchRuntimeProjects,
    liveCanLaunchEditorProjects,
    postprodCanManageLayouts,
    postprodVisibleTabs,
    liveAccountTabs,
    resourcesTabAvailable,
    resourcesRefreshKey,
    clientSyncEnabled,
    postprodTabKey,
    postprodTitleOverride,
    postprodScreenSharedProps,
    postprodServerOnlyProps,
    licenseStatus,
    postprodUser,
    handleNavClick,
    handleCommonUpdated,
    handleLibraryImported,
    setIdentity,
    handlePostprodScanDetectedRenders,
    handlePostprodUpdateMe,
    handlePostprodOpenRenderEditor,
    setClientSyncEnabled,
  } = ctx;

  return (
    <section className={`uu-screen ${offsetClass}`}>
      {role === "server" && current === "Setup" && (appMode !== APP_MODE_POSTPROD || postprodCanManageMachines) && <SetupScreen />}
      {role === "server" && current === "Configuration" && (
        <Suspense fallback={ScreenFallback}>
          <ConfigurationScreen
            licenseStatus={licenseStatus}
            onCommonUpdated={handleCommonUpdated}
            onNavigate={handleNavClick}
            onLibraryImported={handleLibraryImported}
            onIdentityUpdated={setIdentity}
            onScanDetectedRenders={handlePostprodScanDetectedRenders}
            onUpdateMe={handlePostprodUpdateMe}
            appMode={appMode}
            canViewResources={postprodCanViewResources}
            canManageProjects={postprodCanEditProjects}
            canManageConfiguration={postprodCanManageConfiguration}
            canLaunchUnrealEditor={liveCanLaunchEditorProjects}
            notificationPrefs={postprodUser?.notificationPreferences || postprodUser?.notificationPrefsJson || {}}
          />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_LIVE && current === "Projets" && (
        <Suspense fallback={ScreenFallback}>
          <ProjectsScreen
            canManageUnrealProjects={liveCanLaunchEditorProjects}
            canEditProjectFields={liveCanEditProjects}
            showProjectActivation={true}
            appMode={appMode}
          />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_LIVE && resourcesTabAvailable && current === "Ressources" && (
        <Suspense fallback={ScreenFallback}>
          <ResourcesScreen refreshKey={resourcesRefreshKey} />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_LIVE && current === "Synchronisation" && (
        <Suspense fallback={ScreenFallback}>
          <SynchronisationScreen />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_LIVE && (
        <div
          style={buildAppShellLaunchControlVisibilityStyle(current === "Launch Control")}
          aria-hidden={current !== "Launch Control"}
        >
          <Suspense fallback={ScreenFallback}>
            <LaunchControlScreen
              isVisible={current === "Launch Control"}
              canLaunchLiveProjects={liveCanLaunchRuntimeProjects}
              canLaunchEditorProjects={liveCanLaunchEditorProjects}
              canEditProjectFields={liveCanEditProjects}
            />
          </Suspense>
        </div>
      )}
      {role === "server" && appMode === APP_MODE_LIVE && current === "Production" && (
        <Suspense fallback={ScreenFallback}>
          <ProductionScreen canManageLayouts={postprodCanManageLayouts} />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_LIVE && current === "Logs" && (
        <Suspense fallback={ScreenFallback}>
          <LogsScreen />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_POSTPROD && postprodAuthenticated && current === "Projets" && (
        <Suspense fallback={ScreenFallback}>
          <ProjectsScreen
            canManageUnrealProjects={postprodCanLaunchProjects}
            canEditProjectFields={postprodCanEditProjects}
            canCreateTasks={postprodCanCreateTasks}
            canBypassPadForTasks={postprodCanBypassPadForTasks}
            showProjectActivation={false}
            appMode={appMode}
            onCreateTaskFromProject={(projectRef) => {
              const ref = String(projectRef || "").trim();
              if (!ref) return;
              handlePostprodOpenRenderEditor({
                type: "project_create",
                action: "create",
                ref,
              });
            }}
          />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_POSTPROD && postprodAuthenticated && postprodCanAccessResources && current === "Ressources" && (
        <Suspense fallback={ScreenFallback}>
          <ResourcesScreen refreshKey={resourcesRefreshKey} />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_POSTPROD && postprodAuthenticated && current === "Synchronisation" && (
        <Suspense fallback={ScreenFallback}>
          <SynchronisationScreen />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_POSTPROD && (postprodVisibleTabs.includes(current) || current === "Logs" || current === POSTPROD_TAB_USERS) && current !== "Projets" && current !== "Ressources" && current !== "Synchronisation" && (
        <Suspense fallback={ScreenFallback}>
          <PostProductionScreen
            {...postprodScreenSharedProps}
            {...postprodServerOnlyProps}
            tabKey={postprodTabKey}
            titleOverride={postprodTitleOverride}
          />
        </Suspense>
      )}
      {role === "server" && appMode === APP_MODE_LIVE && liveAccountTabs.includes(current) && (
        <Suspense fallback={ScreenFallback}>
          <PostProductionScreen
            {...postprodScreenSharedProps}
            {...postprodServerOnlyProps}
            tabKey={postprodTabKey}
            titleOverride={postprodTitleOverride}
          />
        </Suspense>
      )}

      {role === "client" && current === "Setup" && (appMode !== APP_MODE_POSTPROD || postprodCanManageMachines) && (
        <SetupScreen
          clientSyncEnabled={clientSyncEnabled}
          onClientSyncChange={setClientSyncEnabled}
        />
      )}
      {role === "client" && appMode === APP_MODE_LIVE && current === "Projets" && (
        <Suspense fallback={ScreenFallback}>
          <ProjectsScreen showProjectActivation={true} appMode={appMode} />
        </Suspense>
      )}
      {role === "client" && appMode === APP_MODE_LIVE && current === "Synchronisation" && (
        <Suspense fallback={ScreenFallback}>
          <SynchronisationScreen />
        </Suspense>
      )}
      {role === "client" && appMode === APP_MODE_LIVE && current === "Logs" && (
        <Suspense fallback={ScreenFallback}>
          <LogsScreen />
        </Suspense>
      )}
      {role === "client" && appMode === APP_MODE_POSTPROD && postprodAuthenticated && current === "Synchronisation" && (
        <Suspense fallback={ScreenFallback}>
          <SynchronisationScreen />
        </Suspense>
      )}
      {role === "client" && appMode === APP_MODE_POSTPROD && (postprodVisibleTabs.includes(current) || current === "Logs" || current === POSTPROD_TAB_USERS) && current !== "Synchronisation" && (
        <Suspense fallback={ScreenFallback}>
          <PostProductionScreen
            {...postprodScreenSharedProps}
            tabKey={postprodTabKey}
          />
        </Suspense>
      )}
      {role === "client" && appMode === APP_MODE_LIVE && liveAccountTabs.includes(current) && (
        <Suspense fallback={ScreenFallback}>
          <PostProductionScreen
            {...postprodScreenSharedProps}
            tabKey={postprodTabKey}
          />
        </Suspense>
      )}
    </section>
  );
}, areScreenViewportPropsEqual);

function AppShell({ state, actions }) {
  const {
    auth: { postprodAuth, postprodAuthenticated, postprodModeAccess },
    app: {
      appMode, role, t, current,
      showWelcome, showLicense, licenseOk, licenseStatus,
      noticeApi, noticeContextValue,
      clientSyncEnabled,
    },
    sidebar: {
      postprodVisibleTabs, postprodCanManageMachines, liveAccountTabs,
      configMissing, resourcesTabAvailable, postprodLockedTabs,
      logsNavAlert, usersNavAlert, rendersNavAlert, rendersTopNoticeText,
    },
    permissions: {
      postprodCanManageUsers,
      postprodCanViewResources, postprodCanAccessResources,
      postprodCanCreateTasks,
      postprodCanManageConfiguration, postprodCanEditProjects, postprodCanBypassPadForTasks,
      postprodCanLaunchProjects, liveCanEditProjects, liveCanLaunchRuntimeProjects,
      liveCanLaunchEditorProjects, postprodCanManageLayouts,
    },
    ui: {
      resourcesRefreshKey, userTabKey, roleTabKey, datasTabKey,
      aptitudeCheckPending, queuePausedLaunchPending, busyImmediateLaunchPending,
      quitDialogOpen, quitOkBtnRef,
    },
  } = state;

  const {
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
    activity: {
      setPostprodEditUserRequest,
    },
    misc: { setClientSyncEnabled },
    modals: {
      handleAptitudeConfirm, handleAptitudeCancel,
      handleQueuePausedLaunchConfirm, handleQueuePausedLaunchContinue,
      handleBusyImmediateLaunchConfirm, handleBusyImmediateLaunchCancel,
    },
  } = actions;
  const offsetClass = React.useMemo(() => {
    if (role === "server") {
      if (current === "Projets") return "uu-screen-offset-small";
      if (current === "Ressources") return "uu-screen-offset-negative";
      if (current === "Launch Control") return "uu-screen-offset-none";
      if (current === "Synchronisation") return "uu-screen-offset";
    }
    if (role === "client" && ["Projets", "Synchronisation"].includes(current)) {
      return "uu-screen-offset";
    }
    return "";
  }, [role, current]);

  const handleSidebarUserClick = React.useCallback(() => {
    handleNavClick('Utilisateurs');
    if (postprodCanManageUsers) {
      setPostprodEditUserRequest({ userId: postprodAuth.user?.id, reqKey: Date.now() });
    }
  }, [
    handleNavClick,
    postprodCanManageUsers,
    setPostprodEditUserRequest,
    postprodAuth.user?.id,
  ]);
  useEffect(() => {
    noticeApi.clearNotice();
  }, [current]);

  const {
    title: quitDialogTitle,
    cancelLabel: quitDialogCancelLabel,
    confirmLabel: quitDialogConfirmLabel,
  } = resolveConfirmDialogLabels(t, {
    cancelAltKey: 'app.quit.confirm.cancel',
    confirmKey: 'app.quit.confirm.ok',
    confirmFallback: "Quitter l'application",
  });
  const quitConfirmMessage = getQuitConfirmMessageLabel(t);
  const quitDialog = (
    <ConfirmDialog
      open={quitDialogOpen}
      busy={false}
      title={quitDialogTitle}
      message={quitConfirmMessage}
      cancelLabel={quitDialogCancelLabel}
      confirmLabel={quitDialogConfirmLabel}
      onCancel={() => closeQuitDialog(false)}
      onConfirm={() => closeQuitDialog(true)}
      confirmRef={quitOkBtnRef}
      overlayZIndex={2000}
    />
  );

  const serverPostprodScreenActive = (
    role === "server"
    && appMode === APP_MODE_POSTPROD
    && (postprodVisibleTabs.includes(current) || current === "Logs" || current === POSTPROD_TAB_USERS)
    && current !== "Projets"
    && current !== "Ressources"
    && current !== "Synchronisation"
  );
  const serverLiveAccountScreenActive = (
    role === "server"
    && appMode === APP_MODE_LIVE
    && liveAccountTabs.includes(current)
  );
  const clientPostprodScreenActive = (
    role === "client"
    && appMode === APP_MODE_POSTPROD
    && (postprodVisibleTabs.includes(current) || current === "Logs" || current === POSTPROD_TAB_USERS)
    && current !== "Synchronisation"
  );
  const clientLiveAccountScreenActive = (
    role === "client"
    && appMode === APP_MODE_LIVE
    && liveAccountTabs.includes(current)
  );
  const shouldBuildPostprodScreenProps = (
    serverPostprodScreenActive
    || serverLiveAccountScreenActive
    || clientPostprodScreenActive
    || clientLiveAccountScreenActive
  );

  const {
    postprodTabKey,
    postprodTitleOverride,
    postprodScreenSharedProps,
    postprodServerOnlyProps,
  } = React.useMemo(() => {
    if (!shouldBuildPostprodScreenProps) {
      return {
        postprodTabKey: current,
        postprodTitleOverride: "",
        postprodScreenSharedProps: null,
        postprodServerOnlyProps: null,
      };
    }
    return buildPostprodScreenProps({
      state: {
        permissions: state.permissions,
        data: state.data,
      },
      actions: {
        auth: actions.auth,
        postprod: actions.postprod,
        users: actions.users,
        roles: actions.roles,
        activity: actions.activity,
        tasks: actions.tasks,
        projects: actions.projects,
        resources: actions.resources,
        renderTemplates: actions.renderTemplates,
        renders: actions.renders,
      },
      appMode,
      current,
      t,
      userTabKey,
      roleTabKey,
      datasTabKey,
      postprodAuthenticated,
      postprodAuth,
      showNotice,
    });
  }, [
    shouldBuildPostprodScreenProps,
    state.permissions,
    state.data,
    actions.auth,
    actions.postprod,
    actions.users,
    actions.roles,
    actions.activity,
    actions.tasks,
    actions.projects,
    actions.resources,
    actions.renderTemplates,
    actions.renders,
    appMode,
    current,
    t,
    userTabKey,
    roleTabKey,
    datasTabKey,
    postprodAuthenticated,
    postprodAuth,
    showNotice,
  ]);

  const screenCtx = React.useMemo(() => ({
    offsetClass,
    role,
    current,
    appMode,
    postprodAuthenticated,
    postprodCanManageMachines,
    postprodCanViewResources,
    postprodCanAccessResources,
    postprodCanCreateTasks,
    postprodCanManageConfiguration,
    postprodCanEditProjects,
    postprodCanBypassPadForTasks,
    postprodCanLaunchProjects,
    liveCanEditProjects,
    liveCanLaunchRuntimeProjects,
    liveCanLaunchEditorProjects,
    postprodCanManageLayouts,
    postprodVisibleTabs,
    liveAccountTabs,
    resourcesTabAvailable,
    resourcesRefreshKey,
    clientSyncEnabled,
    postprodTabKey,
    postprodTitleOverride,
    postprodScreenSharedProps,
    postprodServerOnlyProps,
    licenseStatus,
    postprodUser: postprodAuth?.user,
    handleNavClick,
    handleCommonUpdated,
    handleLibraryImported,
    setIdentity,
    handlePostprodScanDetectedRenders,
    handlePostprodUpdateMe,
    handlePostprodOpenRenderEditor,
    setClientSyncEnabled,
  }), [
    offsetClass,
    role,
    current,
    appMode,
    postprodAuthenticated,
    postprodCanManageMachines,
    postprodCanViewResources,
    postprodCanAccessResources,
    postprodCanCreateTasks,
    postprodCanManageConfiguration,
    postprodCanEditProjects,
    postprodCanBypassPadForTasks,
    postprodCanLaunchProjects,
    liveCanEditProjects,
    liveCanLaunchRuntimeProjects,
    liveCanLaunchEditorProjects,
    postprodCanManageLayouts,
    postprodVisibleTabs,
    liveAccountTabs,
    resourcesTabAvailable,
    resourcesRefreshKey,
    clientSyncEnabled,
    postprodTabKey,
    postprodTitleOverride,
    postprodScreenSharedProps,
    postprodServerOnlyProps,
    licenseStatus,
    postprodAuth?.user,
    handleNavClick,
    handleCommonUpdated,
    handleLibraryImported,
    setIdentity,
    handlePostprodScanDetectedRenders,
    handlePostprodUpdateMe,
    handlePostprodOpenRenderEditor,
    setClientSyncEnabled,
  ]);

  if (!postprodAuth.hydrated) {
    return (
      <>
        <div className="uu-page uu-page-compact">
          <section className="uu-section uu-maxw-420" style={APP_SHELL_HYDRATING_SECTION_STYLE}>
            <div className="uu-msg info">{t('common.loading')}</div>
          </section>
        </div>
        {quitDialog}
      </>
    );
  }

  if (!postprodAuthenticated) {
    return (
      <>
        <AuthGateScreen
          t={t}
          appMode={appMode}
          busy={postprodAuth.busy}
          error={postprodAuth.error}
          onLogin={handlePostprodLogin}
        />
        {quitDialog}
      </>
    );
  }

  // Écran Welcome après authentification
  if (showWelcome) {
    return (
      <NoticeContext.Provider value={noticeContextValue}>
        <>
          <Welcome
            onContinue={handleWelcomeContinue}
            onOpenLicense={() => openLicense('welcome')}
            licenseStatus={licenseStatus}
            appVersion={APP_VERSION}
            modeAccess={postprodModeAccess}
            currentUser={postprodAuth.user}
          />
          {quitDialog}
        </>
      </NoticeContext.Provider>
    );
  }

  if (showLicense || !licenseOk) {
    return (
      <>
        <Suspense fallback={ScreenFallback}>
          <LicenseScreen
            licenseStatus={licenseStatus}
            onRefresh={refreshLicenseStatus}
            onStatusChange={setLicenseStatus}
            onBack={handleLicenseBack}
            onContinue={handleLicenseContinue}
          />
        </Suspense>
        {quitDialog}
      </>
    );
  }

  return (
    <NoticeContext.Provider value={noticeContextValue}>
    <div className="uu-shell">
        <Sidebar
          current={current}
          setCurrent={handleNavClick}
          role={role}
          appMode={appMode}
          t={t}
          clientSyncEnabled={clientSyncEnabled}
          postprodTabs={postprodVisibleTabs}
          postprodCanManageMachines={postprodCanManageMachines}
          liveAccountTabs={liveAccountTabs}
          configMissing={configMissing}
          resourcesAvailable={resourcesTabAvailable}
          postprodLockedTabs={postprodLockedTabs}
          postprodLockedTitle={t('postprod.auth.navLocked')}
          logsAlert={logsNavAlert}
          usersAlert={usersNavAlert}
          rendersAlert={rendersNavAlert}
          postprodUser={postprodAuthenticated ? postprodAuth.user : null}
          onUserClick={handleSidebarUserClick}
        />


      <main className="uu-content">
        <header className="uu-topbar">
          <div className="uu-topbar-notice">
            {rendersTopNoticeText ? (
              <span className={`uu-top-notice ${String(rendersNavAlert?.level || 'warn').trim() || 'warn'}`} title={rendersTopNoticeText}>
                {rendersTopNoticeText}
              </span>
            ) : null}
            {noticeApi.notice?.text ? (
              <span className={`uu-top-notice ${noticeApi.notice.type || ''}`}>
                {noticeApi.notice.text}
              </span>
            ) : null}
          </div>
          <div className="ml-auto uu-row uu-align-center uu-row-gap0">
            {postprodAuthenticated ? (
              <>
                <button
                  className="uu-btn-ghost"
                  onClick={handlePostprodLogout}
                  disabled={postprodAuth.busy}
                >
                  {t('postprod.auth.logout')}
                </button>
              </>
            ) : null}
            <button
              className="uu-btn-ghost"
              onClick={() => {
                setShowLicense(false);
                setShowWelcome(true);
              }}
            >
              {t('nav.home')}
            </button>
            <button
              className="uu-btn-ghost"
              onClick={openQuitDialog}
            >
              {t('nav.quit')}
            </button>
          </div>
        </header>

        {/* Rendu des écrans selon rôle */}
        <ScreenViewport ctx={screenCtx} />

        {aptitudeCheckPending && (
          <AptitudeCheckModal
            t={t}
            workerDisplayName={aptitudeCheckPending.workerDisplayName}
            onConfirm={handleAptitudeConfirm}
            onCancel={handleAptitudeCancel}
          />
        )}

        {queuePausedLaunchPending && (
          <AptitudeCheckModal
            t={t}
            title={t("postprod.renders.queuePause.modalTitle")}
            body={t("postprod.renders.queuePause.modalBody")}
            confirmLabel={t("postprod.renders.queuePause.confirm")}
            cancelLabel={t("postprod.renders.queuePause.cancel")}
            onConfirm={handleQueuePausedLaunchConfirm}
            onCancel={handleQueuePausedLaunchContinue}
          />
        )}

        {busyImmediateLaunchPending && (
          <AptitudeCheckModal
            t={t}
            workerDisplayName={busyImmediateLaunchPending.workerDisplayName}
            title={"Station occupée"}
            body={"La station est actuellement occupée. Voulez-vous la passer en disponible et lancer le rendu immédiat, ou patienter ?"}
            confirmLabel={"Passer en disponible et lancer"}
            cancelLabel={"Patienter"}
            onConfirm={handleBusyImmediateLaunchConfirm}
            onCancel={handleBusyImmediateLaunchCancel}
          />
        )}

        {quitDialog}
      </main>
    </div>
    </NoticeContext.Provider>
  );
}

export default React.memo(AppShell);

