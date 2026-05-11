import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPostprodScreenProps,
  buildPostprodUsersProps,
  buildPostprodTasksProps,
  buildPostprodRendersProps,
} from "../../app/components/postprodScreenProps.js";

function createScreenPropsFixture() {
  const t = (key) => {
    if (key === "nav.users") return "Users Label";
    return key;
  };

  const showNotice = () => {};
  const postprodAuth = {
    busy: true,
    error: "auth-err",
    user: {
      id: 42,
      username: "julien",
    },
  };

  const state = {
    permissions: {
      postprodCanManageUsers: true,
      postprodCanManageRoles: false,
      postprodCanManageRenderTemplates: true,
      postprodCanBanUsers: false,
      postprodCanManageProjectPermissions: true,
      postprodManageableRoles: ["admin"],
      postprodCanAccessResources: true,
      postprodCanCreateTasks: false,
      postprodCanAssignRenderRequests: true,
    },
    data: {
      postprodUsers: { items: [{ id: 1 }], loading: false, error: "" },
      postprodRoles: { items: [{ id: 2 }], loading: false, error: "" },
      postprodProfile: { saving: false, error: "" },
      postprodMyActivity: { activities: [{ id: 3 }], summary: { total: 1 }, loading: false, error: "" },
      postprodAudit: {
        entries: [{ id: 4 }],
        loading: false,
        error: "",
        total: 1,
        page: 1,
        pageSize: 50,
        hasMore: false,
        filters: {},
        auditLogStore: { count: 0 },
      },
      postprodTasks: { items: [{ id: 5 }], loading: false, error: "" },
      postprodTaskCatalog: { projects: [{ value: "P1" }], resources: [{ value: "R1" }], loading: false, error: "" },
      postprodProjects: { items: [{ id: 6 }], loading: false, error: "" },
      postprodResources: { items: [{ id: 7 }], loading: false, error: "", source: "local", sync: { active: false } },
      postprodRenderProjectCatalog: { items: [{ value: "RP1" }], loading: false, error: "" },
      postprodRenders: { items: [{ id: 8 }], loading: false, error: "", detectedScan: { running: false } },
      postprodRenderHealthView: { entries: [] },
      postprodRenderHealth: { loading: false, error: "" },
      postprodOfflineOutbox: [{ id: 9 }],
      postprodWorkerCompletionOutbox: [{ id: 10 }],
      postprodRenderHealthAuditMaintenance: {
        data: { count: 0 },
        loading: false,
        error: "",
        purging: false,
        purgeError: "",
        lastPurge: "",
      },
      postprodRenderWorkersForUi: [{ key: "worker-1" }],
      postprodRenderWorkers: { loading: false, error: "" },
      postprodRenderTemplates: { items: [{ id: 11 }], loading: false, error: "" },
      postprodRenderForms: { items: [{ id: 12 }], loading: false, error: "" },
      postprodRenderOutputDir: "D:/Renders",
      postprodRenderExportDestinationOptions: [{ value: "disk" }],
      postprodRenderEditorRequest: { type: "edit", id: 100 },
      postprodEditUserRequest: { userId: 200 },
      postprodRenderFormFocusRequest: { formId: 300 },
    },
  };

  const noop = () => {};

  const actions = {
    auth: {
      handlePostprodLogin: noop,
      handlePostprodLogout: noop,
    },
    postprod: {
      handlePostprodUpdateMe: noop,
      handlePostprodScanDetectedRenders: noop,
      handlePostprodOpenRenderEditor: noop,
    },
    users: {
      handlePostprodCreateUser: noop,
      handlePostprodUpdateUser: noop,
      handlePostprodDeleteUser: noop,
      handlePostprodUpdateUserProjectPermissions: noop,
      handlePostprodLoadUserActivity: noop,
      handlePostprodLoadUserProjectPermissions: noop,
      handlePostprodToggleUserActive: noop,
      loadPostprodUsers: noop,
      handlePostprodOpenUser: noop,
    },
    roles: {
      handlePostprodCreateRole: noop,
      handlePostprodUpdateRole: noop,
      handlePostprodDeleteRole: noop,
      loadPostprodRoles: noop,
    },
    activity: {
      loadPostprodMyActivity: noop,
      loadPostprodAudit: noop,
      loadPostprodRenderHealthAuditMaintenance: noop,
      handlePostprodPurgeAudit: noop,
      handlePostprodPurgeRenderHealthAudit: noop,
      exportPostprodAuditAll: noop,
      exportPostprodAuditAllJson: noop,
      exportPostprodAuditAllNdjson: noop,
      handlePostprodPurgeUserActivity: noop,
      handlePostprodOpenActivityTarget: noop,
    },
    tasks: {
      handlePostprodCreateTask: noop,
      handlePostprodUpdateTask: noop,
      handlePostprodDeleteTask: noop,
      handlePostprodTransitionTask: noop,
      loadPostprodTasks: noop,
      setPostprodTaskFormOpen: noop,
      setPostprodUserEditorOpen: noop,
      loadPostprodTaskCatalog: noop,
      loadPostprodProjects: noop,
    },
    projects: {
      handlePostprodLoadProjectRenderTemplates: noop,
      handlePostprodLoadProjectUnrealCatalog: noop,
      handlePostprodLoadProjectWrcFields: noop,
      handlePostprodSyncProject: noop,
      handlePostprodLoadProjectDataTables: noop,
      handlePostprodUpsertDataTableRow: noop,
      handlePostprodUpdateDataTable: noop,
      handlePostprodNavigateToProject: noop,
    },
    resources: {
      loadPostprodResources: noop,
      handlePostprodReindexResources: noop,
      handlePostprodLoadResourceDetail: noop,
    },
    renderTemplates: {
      handlePostprodCreateRenderTemplate: noop,
      handlePostprodUpdateRenderTemplate: noop,
      handlePostprodDeleteRenderTemplate: noop,
    },
    renders: {
      handlePostprodCreateRender: noop,
      handlePostprodReserveRenderId: noop,
      handlePostprodTransitionRender: noop,
      handlePostprodLoadRenderTransitions: noop,
      handlePostprodDispatchRenders: noop,
      handlePostprodSaveDispatchPolicy: noop,
      handlePostprodScheduleRender: noop,
      handlePostprodUpdateRenderExportDestinations: noop,
      handlePostprodReorderRenders: noop,
      handlePostprodDeleteRender: noop,
      handlePostprodGenerateRenderProxy: noop,
      handlePostprodPatchWorkerAptitude: noop,
      loadPostprodRenderTemplates: noop,
      loadPostprodRenderForms: noop,
      handlePostprodCreateRenderForm: noop,
      handlePostprodUpdateRenderForm: noop,
      handlePostprodDeleteRenderForm: noop,
      handlePostprodLoadRenderFormFields: noop,
      handlePostprodReplaceRenderFormFields: noop,
      loadPostprodRenders: noop,
      loadPostprodRenderHealth: noop,
      loadPostprodRenderWorkers: noop,
      handlePostprodRenderEditorHandled: noop,
      handlePostprodEditUserHandled: noop,
      handlePostprodRenderFormFocusHandled: noop,
      handlePostprodNavigateToRenderForm: noop,
    },
  };

  return { t, showNotice, postprodAuth, state, actions };
}

test("buildPostprodUsersProps maps user and role data + callbacks", () => {
  const data = {
    postprodUsers: { items: [{ id: 1 }], loading: true, error: "users-err" },
    postprodRoles: { items: [{ id: 10 }], loading: false, error: "roles-err" },
    postprodProfile: { saving: true, error: "profile-err" },
  };

  const userActions = {
    handlePostprodCreateUser: () => {},
    handlePostprodUpdateUser: () => {},
    handlePostprodDeleteUser: () => {},
    handlePostprodUpdateUserProjectPermissions: () => {},
    handlePostprodLoadUserActivity: () => {},
    handlePostprodLoadUserProjectPermissions: () => {},
    handlePostprodToggleUserActive: () => {},
    loadPostprodUsers: () => {},
    handlePostprodOpenUser: () => {},
  };

  const roleActions = {
    handlePostprodCreateRole: () => {},
    handlePostprodUpdateRole: () => {},
    handlePostprodDeleteRole: () => {},
    loadPostprodRoles: () => {},
  };

  const postprodActions = {
    handlePostprodUpdateMe: () => {},
  };

  const props = buildPostprodUsersProps({ data, userActions, roleActions, postprodActions });

  assert.equal(props.users, data.postprodUsers.items);
  assert.equal(props.usersLoading, true);
  assert.equal(props.usersError, "users-err");
  assert.equal(props.roles, data.postprodRoles.items);
  assert.equal(props.rolesLoading, false);
  assert.equal(props.rolesError, "roles-err");
  assert.equal(props.profileSaving, true);
  assert.equal(props.profileError, "profile-err");
  assert.equal(props.onCreateUser, userActions.handlePostprodCreateUser);
  assert.equal(props.onUpdateUser, userActions.handlePostprodUpdateUser);
  assert.equal(props.onDeleteUser, userActions.handlePostprodDeleteUser);
  assert.equal(props.onUpdateUserProjectPermissions, userActions.handlePostprodUpdateUserProjectPermissions);
  assert.equal(props.onLoadUserActivity, userActions.handlePostprodLoadUserActivity);
  assert.equal(props.onLoadUserProjectPermissions, userActions.handlePostprodLoadUserProjectPermissions);
  assert.equal(props.onToggleUserActive, userActions.handlePostprodToggleUserActive);
  assert.equal(props.onRefreshUsers, userActions.loadPostprodUsers);
  assert.equal(props.onCreateRole, roleActions.handlePostprodCreateRole);
  assert.equal(props.onUpdateRole, roleActions.handlePostprodUpdateRole);
  assert.equal(props.onDeleteRole, roleActions.handlePostprodDeleteRole);
  assert.equal(props.onOpenUser, userActions.handlePostprodOpenUser);
  assert.equal(props.onRefreshRoles, roleActions.loadPostprodRoles);
  assert.equal(props.onUpdateMe, postprodActions.handlePostprodUpdateMe);
});

test("buildPostprodTasksProps maps task data + callbacks", () => {
  const data = {
    postprodTasks: { items: [{ id: 7 }], loading: true, error: "tasks-err" },
    postprodTaskCatalog: {
      projects: [{ value: "P1" }],
      resources: [{ value: "R1" }],
      loading: false,
      error: "catalog-err",
    },
  };

  const taskActions = {
    handlePostprodCreateTask: () => {},
    handlePostprodUpdateTask: () => {},
    handlePostprodDeleteTask: () => {},
    handlePostprodTransitionTask: () => {},
    loadPostprodTasks: () => {},
    setPostprodTaskFormOpen: () => {},
    setPostprodUserEditorOpen: () => {},
    loadPostprodTaskCatalog: () => {},
    loadPostprodProjects: () => {},
  };

  const props = buildPostprodTasksProps({ data, taskActions });

  assert.equal(props.tasks, data.postprodTasks.items);
  assert.equal(props.tasksLoading, true);
  assert.equal(props.tasksError, "tasks-err");
  assert.equal(props.taskProjectOptions, data.postprodTaskCatalog.projects);
  assert.equal(props.taskResourceOptions, data.postprodTaskCatalog.resources);
  assert.equal(props.taskCatalogLoading, false);
  assert.equal(props.taskCatalogError, "catalog-err");
  assert.equal(props.onCreateTask, taskActions.handlePostprodCreateTask);
  assert.equal(props.onUpdateTask, taskActions.handlePostprodUpdateTask);
  assert.equal(props.onDeleteTask, taskActions.handlePostprodDeleteTask);
  assert.equal(props.onTransitionTask, taskActions.handlePostprodTransitionTask);
  assert.equal(props.onRefreshTasks, taskActions.loadPostprodTasks);
  assert.equal(props.onTaskFormOpenChange, taskActions.setPostprodTaskFormOpen);
  assert.equal(props.onUserEditorModeChange, taskActions.setPostprodUserEditorOpen);
  assert.equal(props.onRefreshTaskCatalog, taskActions.loadPostprodTaskCatalog);
  assert.equal(props.onRefreshProjects, taskActions.loadPostprodProjects);
});

test("buildPostprodRendersProps maps render data + callbacks", () => {
  const data = {
    postprodRenderProjectCatalog: { items: [{ value: "PRJ" }], loading: true, error: "project-catalog-err" },
    postprodRenders: { items: [{ id: 900 }], loading: false, error: "renders-err", detectedScan: { running: false } },
    postprodRenderHealthView: { entries: [] },
    postprodRenderHealth: { loading: true, error: "health-err" },
    postprodOfflineOutbox: [{ id: 1 }],
    postprodWorkerCompletionOutbox: [{ id: 2 }],
    postprodRenderHealthAuditMaintenance: {
      data: { count: 3 },
      loading: false,
      error: "audit-maintenance-err",
      purging: true,
      purgeError: "purge-err",
      lastPurge: "2026-05-09T10:00:00.000Z",
    },
    postprodRenderWorkersForUi: [{ key: "local" }],
    postprodRenderWorkers: { loading: false, error: "workers-err" },
    postprodRenderTemplates: { items: [{ id: 1 }], loading: false, error: "templates-err" },
    postprodRenderForms: { items: [{ id: 2 }], loading: true, error: "forms-err" },
    postprodRenderOutputDir: "D:/Renders",
    postprodRenderExportDestinationOptions: [{ value: "disk" }],
    postprodRenderEditorRequest: { type: "create" },
    postprodEditUserRequest: { userId: 42 },
    postprodRenderFormFocusRequest: { formId: 99 },
  };

  const postprodActions = {
    handlePostprodScanDetectedRenders: () => {},
    handlePostprodOpenRenderEditor: () => {},
  };

  const renderTemplateActions = {
    handlePostprodCreateRenderTemplate: () => {},
    handlePostprodUpdateRenderTemplate: () => {},
    handlePostprodDeleteRenderTemplate: () => {},
  };

  const renderActions = {
    handlePostprodCreateRender: () => {},
    handlePostprodReserveRenderId: () => {},
    handlePostprodTransitionRender: () => {},
    handlePostprodLoadRenderTransitions: () => {},
    handlePostprodDispatchRenders: () => {},
    handlePostprodSaveDispatchPolicy: () => {},
    handlePostprodScheduleRender: () => {},
    handlePostprodUpdateRenderExportDestinations: () => {},
    handlePostprodReorderRenders: () => {},
    handlePostprodDeleteRender: () => {},
    handlePostprodGenerateRenderProxy: () => {},
    handlePostprodPatchWorkerAptitude: () => {},
    loadPostprodRenderTemplates: () => {},
    loadPostprodRenderForms: () => {},
    handlePostprodCreateRenderForm: () => {},
    handlePostprodUpdateRenderForm: () => {},
    handlePostprodDeleteRenderForm: () => {},
    handlePostprodLoadRenderFormFields: () => {},
    handlePostprodReplaceRenderFormFields: () => {},
    loadPostprodRenders: () => {},
    loadPostprodRenderHealth: () => {},
    loadPostprodRenderWorkers: () => {},
    handlePostprodRenderEditorHandled: () => {},
    handlePostprodEditUserHandled: () => {},
    handlePostprodRenderFormFocusHandled: () => {},
    handlePostprodNavigateToRenderForm: () => {},
  };

  const props = buildPostprodRendersProps({
    data,
    postprodActions,
    renderTemplateActions,
    renderActions,
  });

  assert.equal(props.renderProjectOptions, data.postprodRenderProjectCatalog.items);
  assert.equal(props.renderProjectOptionsLoading, true);
  assert.equal(props.renderProjectOptionsError, "project-catalog-err");
  assert.equal(props.renders, data.postprodRenders.items);
  assert.equal(props.rendersLoading, false);
  assert.equal(props.rendersError, "renders-err");
  assert.equal(props.rendersDetectedScan, data.postprodRenders.detectedScan);
  assert.equal(props.renderHealth, data.postprodRenderHealthView);
  assert.equal(props.renderHealthLoading, true);
  assert.equal(props.renderHealthError, "health-err");
  assert.equal(props.offlineRenderCreateOutboxItems, data.postprodOfflineOutbox);
  assert.equal(props.offlineWorkerCompletionOutboxItems, data.postprodWorkerCompletionOutbox);
  assert.equal(props.renderHealthAuditMaintenance, data.postprodRenderHealthAuditMaintenance.data);
  assert.equal(props.renderHealthAuditMaintenanceLoading, false);
  assert.equal(props.renderHealthAuditMaintenanceError, "audit-maintenance-err");
  assert.equal(props.renderHealthAuditPurgeBusy, true);
  assert.equal(props.renderHealthAuditPurgeError, "purge-err");
  assert.equal(props.renderHealthAuditLastPurge, "2026-05-09T10:00:00.000Z");
  assert.equal(props.renderWorkers, data.postprodRenderWorkersForUi);
  assert.equal(props.renderWorkersLoading, false);
  assert.equal(props.renderWorkersError, "workers-err");
  assert.equal(props.renderTemplates, data.postprodRenderTemplates.items);
  assert.equal(props.renderTemplatesLoading, false);
  assert.equal(props.renderTemplatesError, "templates-err");
  assert.equal(props.renderForms, data.postprodRenderForms.items);
  assert.equal(props.renderFormsLoading, true);
  assert.equal(props.renderFormsError, "forms-err");
  assert.equal(props.renderOutputDir, "D:/Renders");
  assert.equal(props.renderExportDestinationOptions, data.postprodRenderExportDestinationOptions);
  assert.equal(props.onCreateRenderTemplate, renderTemplateActions.handlePostprodCreateRenderTemplate);
  assert.equal(props.onUpdateRenderTemplate, renderTemplateActions.handlePostprodUpdateRenderTemplate);
  assert.equal(props.onDeleteRenderTemplate, renderTemplateActions.handlePostprodDeleteRenderTemplate);
  assert.equal(props.onCreateRender, renderActions.handlePostprodCreateRender);
  assert.equal(props.onSaveDispatchPolicy, renderActions.handlePostprodSaveDispatchPolicy);
  assert.equal(props.onScheduleRender, renderActions.handlePostprodScheduleRender);
  assert.equal(props.onRefreshRenders, renderActions.loadPostprodRenders);
  assert.equal(props.onScanDetectedRenders, postprodActions.handlePostprodScanDetectedRenders);
  assert.equal(props.onRequestOpenRenderEditor, postprodActions.handlePostprodOpenRenderEditor);
  assert.equal(props.renderFocusRequest, data.postprodRenderEditorRequest);
  assert.equal(props.editUserIdRequest, data.postprodEditUserRequest);
  assert.equal(props.renderFormFocusRequest, data.postprodRenderFormFocusRequest);
  assert.equal(props.onNavigateToRenderForm, renderActions.handlePostprodNavigateToRenderForm);
});

test("buildPostprodScreenProps aggregates shared props and server-only props", () => {
  const { t, showNotice, postprodAuth, state, actions } = createScreenPropsFixture();

  const result = buildPostprodScreenProps({
    state,
    actions,
    appMode: "postprod",
    current: "Logs",
    t,
    userTabKey: "users-tab",
    roleTabKey: "roles-tab",
    datasTabKey: "datas-tab",
    postprodAuthenticated: true,
    postprodAuth,
    showNotice,
  });

  assert.equal(result.postprodTabKey, "Historique");
  assert.equal(result.postprodTitleOverride, "");
  assert.deepEqual(result.postprodServerOnlyProps, {
    canViewResources: true,
    canCreateTasks: false,
    canAssignRenderRequests: true,
  });

  const shared = result.postprodScreenSharedProps;
  assert.equal(shared.userTabKey, "users-tab");
  assert.equal(shared.roleTabKey, "roles-tab");
  assert.equal(shared.datasTabKey, "datas-tab");
  assert.equal(shared.hideStubNotice, true);
  assert.equal(shared.isAuthenticated, true);
  assert.equal(shared.authBusy, true);
  assert.equal(shared.authError, "auth-err");
  assert.equal(shared.user, postprodAuth.user);
  assert.equal(shared.onNotify, showNotice);
  assert.equal(shared.onLogin, actions.auth.handlePostprodLogin);
  assert.equal(shared.onLogout, actions.auth.handlePostprodLogout);
  assert.equal(shared.users, state.data.postprodUsers.items);
  assert.equal(shared.tasks, state.data.postprodTasks.items);
  assert.equal(shared.renders, state.data.postprodRenders.items);
  assert.equal(shared.renderForms, state.data.postprodRenderForms.items);
  assert.equal(shared.renderFocusRequest, state.data.postprodRenderEditorRequest);
  assert.equal(shared.editUserIdRequest, state.data.postprodEditUserRequest);
  assert.equal(shared.renderFormFocusRequest, state.data.postprodRenderFormFocusRequest);
  assert.equal(shared.onCreateUser, actions.users.handlePostprodCreateUser);
  assert.equal(shared.onCreateTask, actions.tasks.handlePostprodCreateTask);
  assert.equal(shared.onCreateRender, actions.renders.handlePostprodCreateRender);
});

test("buildPostprodScreenProps computes users title override", () => {
  const { t, showNotice, postprodAuth, state, actions } = createScreenPropsFixture();

  const result = buildPostprodScreenProps({
    state,
    actions,
    appMode: "postprod",
    current: "Utilisateurs",
    t,
    userTabKey: "users-tab",
    roleTabKey: "roles-tab",
    datasTabKey: "datas-tab",
    postprodAuthenticated: true,
    postprodAuth,
    showNotice,
  });

  assert.equal(result.postprodTabKey, "Utilisateurs");
  assert.equal(result.postprodTitleOverride, "Users Label");
});
