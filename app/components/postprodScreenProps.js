import { APP_MODE_POSTPROD, POSTPROD_TAB_USERS } from "../utils/appConstants.js";

function asObject(value) {
  return value && typeof value === "object" ? value : {};
}

function buildPostprodActionGroups(actions = {}) {
  return {
    authActions: asObject(actions.auth),
    postprodActions: asObject(actions.postprod),
    userActions: asObject(actions.users),
    roleActions: asObject(actions.roles),
    activityActions: asObject(actions.activity),
    taskActions: asObject(actions.tasks),
    projectActions: asObject(actions.projects),
    resourceActions: asObject(actions.resources),
    renderTemplateActions: asObject(actions.renderTemplates),
    renderActions: asObject(actions.renders),
  };
}

function buildPostprodTabProps({ appMode, current, t }) {
  return {
    postprodTabKey: appMode === APP_MODE_POSTPROD && current === "Logs" ? "Historique" : current,
    postprodTitleOverride: current === POSTPROD_TAB_USERS ? t('nav.users') : '',
  };
}

function buildPostprodCoreProps({
  userTabKey,
  roleTabKey,
  datasTabKey,
  t,
  postprodAuthenticated,
  postprodAuth,
  showNotice,
  permissions,
  authActions,
}) {
  return {
    userTabKey,
    roleTabKey,
    datasTabKey,
    hideStubNotice: true,
    t,
    isAuthenticated: postprodAuthenticated,
    authBusy: postprodAuth?.busy,
    authError: postprodAuth?.error,
    onLogin: authActions.handlePostprodLogin,
    onLogout: authActions.handlePostprodLogout,
    user: postprodAuth?.user,
    onNotify: showNotice,
    canManageUsers: permissions.postprodCanManageUsers,
    canManageRoles: permissions.postprodCanManageRoles,
    canManageRenderTemplates: permissions.postprodCanManageRenderTemplates,
    canBanUsers: permissions.postprodCanBanUsers,
    canManageProjectPermissions: permissions.postprodCanManageProjectPermissions,
    manageableRoles: permissions.postprodManageableRoles,
  };
}

function buildPostprodUsersProps({ data, userActions, roleActions, postprodActions }) {
  return {
    users: data.postprodUsers?.items,
    usersLoading: data.postprodUsers?.loading,
    usersError: data.postprodUsers?.error,
    roles: data.postprodRoles?.items,
    rolesLoading: data.postprodRoles?.loading,
    rolesError: data.postprodRoles?.error,
    profileSaving: data.postprodProfile?.saving,
    profileError: data.postprodProfile?.error,
    onCreateUser: userActions.handlePostprodCreateUser,
    onUpdateUser: userActions.handlePostprodUpdateUser,
    onDeleteUser: userActions.handlePostprodDeleteUser,
    onUpdateUserProjectPermissions: userActions.handlePostprodUpdateUserProjectPermissions,
    onLoadUserActivity: userActions.handlePostprodLoadUserActivity,
    onLoadUserProjectPermissions: userActions.handlePostprodLoadUserProjectPermissions,
    onToggleUserActive: userActions.handlePostprodToggleUserActive,
    onRefreshUsers: userActions.loadPostprodUsers,
    onCreateRole: roleActions.handlePostprodCreateRole,
    onUpdateRole: roleActions.handlePostprodUpdateRole,
    onDeleteRole: roleActions.handlePostprodDeleteRole,
    onOpenUser: userActions.handlePostprodOpenUser,
    onRefreshRoles: roleActions.loadPostprodRoles,
    onUpdateMe: postprodActions.handlePostprodUpdateMe,
  };
}

function buildPostprodActivityProps({ data, activityActions, permissions }) {
  return {
    myActivity: data.postprodMyActivity?.activities,
    myActivitySummary: data.postprodMyActivity?.summary,
    myActivityLoading: data.postprodMyActivity?.loading,
    myActivityError: data.postprodMyActivity?.error,
    auditEntries: data.postprodAudit?.entries,
    auditLoading: data.postprodAudit?.loading,
    auditError: data.postprodAudit?.error,
    auditTotal: data.postprodAudit?.total,
    auditPage: data.postprodAudit?.page,
    auditPageSize: data.postprodAudit?.pageSize,
    auditHasMore: data.postprodAudit?.hasMore,
    auditFilters: data.postprodAudit?.filters,
    auditLogStore: data.postprodAudit?.auditLogStore,
    onRefreshMyActivity: activityActions.loadPostprodMyActivity,
    onRefreshAudit: activityActions.loadPostprodAudit,
    onRefreshRenderHealthAuditMaintenance: activityActions.loadPostprodRenderHealthAuditMaintenance,
    onPurgeAudit: permissions.postprodCanManageRoles ? activityActions.handlePostprodPurgeAudit : null,
    onPurgeRenderHealthAudit: activityActions.handlePostprodPurgeRenderHealthAudit,
    onExportAuditAll: activityActions.exportPostprodAuditAll,
    onExportAuditAllJson: activityActions.exportPostprodAuditAllJson,
    onExportAuditAllNdjson: activityActions.exportPostprodAuditAllNdjson,
    onPurgeUserActivity: activityActions.handlePostprodPurgeUserActivity,
    onOpenActivityTarget: activityActions.handlePostprodOpenActivityTarget,
  };
}

function buildPostprodTasksProps({ data, taskActions }) {
  return {
    tasks: data.postprodTasks?.items,
    tasksLoading: data.postprodTasks?.loading,
    tasksError: data.postprodTasks?.error,
    taskProjectOptions: data.postprodTaskCatalog?.projects,
    taskResourceOptions: data.postprodTaskCatalog?.resources,
    taskCatalogLoading: data.postprodTaskCatalog?.loading,
    taskCatalogError: data.postprodTaskCatalog?.error,
    onCreateTask: taskActions.handlePostprodCreateTask,
    onUpdateTask: taskActions.handlePostprodUpdateTask,
    onDeleteTask: taskActions.handlePostprodDeleteTask,
    onTransitionTask: taskActions.handlePostprodTransitionTask,
    onRefreshTasks: taskActions.loadPostprodTasks,
    onTaskFormOpenChange: taskActions.setPostprodTaskFormOpen,
    onUserEditorModeChange: taskActions.setPostprodUserEditorOpen,
    onRefreshTaskCatalog: taskActions.loadPostprodTaskCatalog,
    onRefreshProjects: taskActions.loadPostprodProjects,
  };
}

function buildPostprodProjectsResourcesProps({
  data,
  projectActions,
  resourceActions,
}) {
  return {
    projects: data.postprodProjects?.items,
    projectsLoading: data.postprodProjects?.loading,
    projectsError: data.postprodProjects?.error,
    resources: data.postprodResources?.items,
    resourcesLoading: data.postprodResources?.loading,
    resourcesError: data.postprodResources?.error,
    resourcesSource: data.postprodResources?.source,
    resourcesSync: data.postprodResources?.sync,
    onLoadProjectRenderTemplates: projectActions.handlePostprodLoadProjectRenderTemplates,
    onLoadProjectUnrealCatalog: projectActions.handlePostprodLoadProjectUnrealCatalog,
    onLoadProjectWrcFields: projectActions.handlePostprodLoadProjectWrcFields,
    onSyncProject: projectActions.handlePostprodSyncProject,
    onLoadProjectDataTables: projectActions.handlePostprodLoadProjectDataTables,
    onUpsertDataTableRow: projectActions.handlePostprodUpsertDataTableRow,
    onUpdateDataTable: projectActions.handlePostprodUpdateDataTable,
    onNavigateToProject: projectActions.handlePostprodNavigateToProject,
    onRefreshResources: resourceActions.loadPostprodResources,
    onReindexResources: resourceActions.handlePostprodReindexResources,
    onLoadResourceDetail: resourceActions.handlePostprodLoadResourceDetail,
  };
}

function buildPostprodRendersProps({
  data,
  postprodActions,
  renderTemplateActions,
  renderActions,
}) {
  return {
    renderProjectOptions: data.postprodRenderProjectCatalog?.items,
    renderProjectOptionsLoading: data.postprodRenderProjectCatalog?.loading,
    renderProjectOptionsError: data.postprodRenderProjectCatalog?.error,
    renders: data.postprodRenders?.items,
    rendersLoading: data.postprodRenders?.loading,
    rendersError: data.postprodRenders?.error,
    rendersDetectedScan: data.postprodRenders?.detectedScan,
    renderHealth: data.postprodRenderHealthView,
    renderHealthLoading: data.postprodRenderHealth?.loading,
    renderHealthError: data.postprodRenderHealth?.error,
    offlineRenderCreateOutboxItems: data.postprodOfflineOutbox,
    offlineWorkerCompletionOutboxItems: data.postprodWorkerCompletionOutbox,
    renderHealthAuditMaintenance: data.postprodRenderHealthAuditMaintenance?.data,
    renderHealthAuditMaintenanceLoading: data.postprodRenderHealthAuditMaintenance?.loading,
    renderHealthAuditMaintenanceError: data.postprodRenderHealthAuditMaintenance?.error,
    renderHealthAuditPurgeBusy: data.postprodRenderHealthAuditMaintenance?.purging,
    renderHealthAuditPurgeError: data.postprodRenderHealthAuditMaintenance?.purgeError,
    renderHealthAuditLastPurge: data.postprodRenderHealthAuditMaintenance?.lastPurge,
    renderWorkers: data.postprodRenderWorkersForUi,
    renderWorkersLoading: data.postprodRenderWorkers?.loading,
    renderWorkersError: data.postprodRenderWorkers?.error,
    renderTemplates: data.postprodRenderTemplates?.items,
    renderTemplatesLoading: data.postprodRenderTemplates?.loading,
    renderTemplatesError: data.postprodRenderTemplates?.error,
    renderForms: data.postprodRenderForms?.items,
    renderFormsLoading: data.postprodRenderForms?.loading,
    renderFormsError: data.postprodRenderForms?.error,
    renderOutputDir: data.postprodRenderOutputDir,
    renderExportDestinationOptions: data.postprodRenderExportDestinationOptions,
    onCreateRenderTemplate: renderTemplateActions.handlePostprodCreateRenderTemplate,
    onUpdateRenderTemplate: renderTemplateActions.handlePostprodUpdateRenderTemplate,
    onDeleteRenderTemplate: renderTemplateActions.handlePostprodDeleteRenderTemplate,
    onCreateRender: renderActions.handlePostprodCreateRender,
    onReserveRenderId: renderActions.handlePostprodReserveRenderId,
    onTransitionRender: renderActions.handlePostprodTransitionRender,
    onLoadRenderTransitions: renderActions.handlePostprodLoadRenderTransitions,
    onDispatchRenders: renderActions.handlePostprodDispatchRenders,
    onSaveDispatchPolicy: renderActions.handlePostprodSaveDispatchPolicy,
    onScheduleRender: renderActions.handlePostprodScheduleRender,
    onUpdateRenderExportDestinations: renderActions.handlePostprodUpdateRenderExportDestinations,
    onReorderRenders: renderActions.handlePostprodReorderRenders,
    onDeleteRender: renderActions.handlePostprodDeleteRender,
    onGenerateProxy: renderActions.handlePostprodGenerateRenderProxy,
    onPatchWorkerAptitude: renderActions.handlePostprodPatchWorkerAptitude,
    onRefreshRenderTemplates: renderActions.loadPostprodRenderTemplates,
    onRefreshRenderForms: renderActions.loadPostprodRenderForms,
    onCreateRenderForm: renderActions.handlePostprodCreateRenderForm,
    onUpdateRenderForm: renderActions.handlePostprodUpdateRenderForm,
    onDeleteRenderForm: renderActions.handlePostprodDeleteRenderForm,
    onLoadRenderFormFields: renderActions.handlePostprodLoadRenderFormFields,
    onReplaceRenderFormFields: renderActions.handlePostprodReplaceRenderFormFields,
    onRefreshRenders: renderActions.loadPostprodRenders,
    onScanDetectedRenders: postprodActions.handlePostprodScanDetectedRenders,
    onRefreshRenderHealth: renderActions.loadPostprodRenderHealth,
    onRefreshRenderWorkers: renderActions.loadPostprodRenderWorkers,
    renderFocusRequest: data.postprodRenderEditorRequest,
    onRenderFocusHandled: renderActions.handlePostprodRenderEditorHandled,
    editUserIdRequest: data.postprodEditUserRequest,
    onEditUserIdHandled: renderActions.handlePostprodEditUserHandled,
    onRequestOpenRenderEditor: postprodActions.handlePostprodOpenRenderEditor,
    renderFormFocusRequest: data.postprodRenderFormFocusRequest,
    onRenderFormFocusHandled: renderActions.handlePostprodRenderFormFocusHandled,
    onNavigateToRenderForm: renderActions.handlePostprodNavigateToRenderForm,
  };
}

function buildPostprodServerOnlyProps({ permissions }) {
  return {
    canViewResources: permissions.postprodCanAccessResources,
    canCreateTasks: permissions.postprodCanCreateTasks,
    canAssignRenderRequests: permissions.postprodCanAssignRenderRequests,
  };
}

function buildPostprodScreenSharedProps({
  data,
  permissions,
  actionGroups,
  userTabKey,
  roleTabKey,
  datasTabKey,
  t,
  postprodAuthenticated,
  postprodAuth,
  showNotice,
}) {
  return {
    ...buildPostprodCoreProps({
      userTabKey,
      roleTabKey,
      datasTabKey,
      t,
      postprodAuthenticated,
      postprodAuth,
      showNotice,
      permissions,
      authActions: actionGroups.authActions,
    }),
    ...buildPostprodUsersProps({
      data,
      userActions: actionGroups.userActions,
      roleActions: actionGroups.roleActions,
      postprodActions: actionGroups.postprodActions,
    }),
    ...buildPostprodActivityProps({
      data,
      activityActions: actionGroups.activityActions,
      permissions,
    }),
    ...buildPostprodTasksProps({
      data,
      taskActions: actionGroups.taskActions,
    }),
    ...buildPostprodProjectsResourcesProps({
      data,
      projectActions: actionGroups.projectActions,
      resourceActions: actionGroups.resourceActions,
    }),
    ...buildPostprodRendersProps({
      data,
      postprodActions: actionGroups.postprodActions,
      renderTemplateActions: actionGroups.renderTemplateActions,
      renderActions: actionGroups.renderActions,
    }),
  };
}

function buildPostprodScreenProps({
  state,
  actions,
  appMode,
  current,
  t,
  userTabKey,
  roleTabKey,
  datasTabKey,
  postprodAuthenticated,
  postprodAuth,
  showNotice,
}) {
  const safeState = asObject(state);
  const safeActions = asObject(actions);
  const permissions = asObject(safeState.permissions);
  const data = asObject(safeState.data);
  const actionGroups = buildPostprodActionGroups(safeActions);

  const { postprodTabKey, postprodTitleOverride } = buildPostprodTabProps({
    appMode,
    current,
    t,
  });

  const postprodScreenSharedProps = buildPostprodScreenSharedProps({
    data,
    permissions,
    actionGroups,
    userTabKey,
    roleTabKey,
    datasTabKey,
    t,
    postprodAuthenticated,
    postprodAuth,
    showNotice,
  });

  const postprodServerOnlyProps = buildPostprodServerOnlyProps({ permissions });

  return {
    postprodTabKey,
    postprodTitleOverride,
    postprodScreenSharedProps,
    postprodServerOnlyProps,
  };
}

export {
  buildPostprodScreenProps,
  buildPostprodScreenSharedProps,
  buildPostprodUsersProps,
  buildPostprodTasksProps,
  buildPostprodRendersProps,
};
