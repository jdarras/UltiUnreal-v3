import { useMemo } from "react";
import {
  APP_MODE_POSTPROD,
  POSTPROD_TAB_USERS,
} from "../utils/appConstants";
import {
  resolveUserShowFabResourcesPreference,
  getPostprodTabsForUser,
  getLiveAccountTabs,
} from "../utils/postprodPermissionsHelpers";

function usePostprodAccessState({
  postprodAuth = {},
  postprodAuthenticated = false,
  commonCfg = null,
  appMode = "",
  role = "server",
} = {}) {
  const permissions = postprodAuth.user?.permissions || {};
  const postprodCanManageUsers = !!permissions.canManageUsers;
  const postprodCanManageRoles = permissions.canManageRoles === true;
  const postprodCanManageRenderTemplates = permissions.canManageForms === true;
  const postprodCanManageMachines = permissions.canManageMachines === true;
  const postprodCanManageConfiguration = postprodAuthenticated
    ? permissions.canManageConfiguration === true
    : String(appMode || '').trim().toLowerCase() !== APP_MODE_POSTPROD;
  const postprodCanBanUsers = permissions.canBanUsers === true;
  const postprodCanManageProjectPermissions = permissions.canManageProjectPermissions === true;
  const postprodCanViewResources = permissions.canViewResources !== false;
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
  const postprodCanCreateTasks = permissions.canCreateTasks !== false;
  const postprodCanAssignRenderRequests = permissions.canAssignRenderRequests === true;
  const postprodCanBypassPadForTasks = permissions.canSyncScenes === true;
  const postprodCanEditProjects = permissions.canEditProjects !== false;
  const postprodCanManageLayouts = permissions.canManageLayouts !== false;
  const postprodCanLaunchProjects = permissions.canLaunchProjects !== false;
  const liveCanEditProjects = postprodAuthenticated ? postprodCanEditProjects : true;
  const liveCanLaunchRuntimeProjects = postprodAuthenticated
    ? permissions.canLaunchLiveProjects !== false
    : true;
  const liveCanLaunchEditorProjects = postprodAuthenticated ? postprodCanLaunchProjects : true;
  const postprodCanLaunchRenders = !!permissions.canLaunchRenders;
  const postprodRefreshSec = Math.max(2, Number(commonCfg?.refreshSec || 5) || 5);
  const postprodRefreshMs = postprodRefreshSec * 1000;
  const postprodManageableRoles = Array.isArray(permissions.manageableRoles)
    ? permissions.manageableRoles
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
      role,
      appMode,
    }),
    [appMode, role, postprodAuthenticated, postprodCanManageUsers, postprodCanManageRoles]
  );
  const postprodLockedTabs = appMode === APP_MODE_POSTPROD && !postprodAuthenticated
    ? postprodVisibleTabs.filter((tab) => tab !== POSTPROD_TAB_USERS)
    : [];

  return {
    postprodCanManageUsers,
    postprodCanManageRoles,
    postprodCanManageRenderTemplates,
    postprodCanManageMachines,
    postprodCanManageConfiguration,
    postprodCanBanUsers,
    postprodCanManageProjectPermissions,
    postprodCanViewResources,
    resourcesEnabledGlobal,
    resourcesEnabled,
    postprodCanAccessResources,
    postprodCanCreateTasks,
    postprodCanAssignRenderRequests,
    postprodCanBypassPadForTasks,
    postprodCanEditProjects,
    postprodCanManageLayouts,
    postprodCanLaunchProjects,
    liveCanEditProjects,
    liveCanLaunchRuntimeProjects,
    liveCanLaunchEditorProjects,
    postprodCanLaunchRenders,
    postprodRefreshSec,
    postprodRefreshMs,
    postprodManageableRoles,
    postprodVisibleTabs,
    liveAccountTabs,
    postprodLockedTabs,
  };
}

export { usePostprodAccessState };
