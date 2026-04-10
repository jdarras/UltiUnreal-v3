import {
  resolveTitle,
  safeT,
  AuthCard,
  ProfileCard,
  UserManagementCard,
  RoleManagementCard,
  TasksCard,
  ProjectsCatalogCard,
  ResourcesCatalogCard,
  DatasCard,
  RendersValidationCard,
  AuditHistoryCard,
} from "./postproduction/cards";

export default function PostProductionScreen({
  tabKey = "Utilisateurs",
  userTabKey = 0,
  roleTabKey = 0,
  taskTabKey = 0,
  datasTabKey = 0,
  titleOverride = "",
  hideStubNotice = false,
  t,
  isAuthenticated = false,
  authBusy = false,
  authError = "",
  onLogin = null,
  user = null,
  appLang = "fr",
  onChangeAppLanguage = null,
  canManageUsers = false,
  canManageRoles = false,
  canManageRenderTemplates = false,
  canBanUsers = false,
  canManageProjectPermissions = false,
  canViewResources = false,
  canCreateTasks = false,
  canEditProjects = false,
  canManageLayouts = false,
  onNotify = null,
  manageableRoles = [],
  users = [],
  usersLoading = false,
  usersError = "",
  roles = [],
  rolesLoading = false,
  rolesError = "",
  profileSaving = false,
  profileError = "",
  myActivity = [],
  myActivitySummary = null,
  myActivityLoading = false,
  myActivityError = "",
  auditEntries = [],
  auditLoading = false,
  auditError = "",
  auditTotal = 0,
  auditPage = 1,
  auditPageSize = 100,
  auditHasMore = false,
  auditFilters = null,
  tasks = [],
  tasksLoading = false,
  taskCatalogLoading = false,
  tasksError = "",
  projects = [],
  projectsLoading = false,
  projectsError = "",
  resources = [],
  resourcesSource = "",
  resourcesSync = null,
  resourcesLoading = false,
  resourcesError = "",
  taskProjectOptions = [],
  taskResourceOptions = [],
  renders = [],
  rendersLoading = false,
  rendersError = "",
  renderTemplates = [],
  renderForms = [],
  renderFormsLoading = false,
  renderFormsError = "",
  renderWorkers = [],
  renderWorkersLoading = false,
  renderWorkersError = "",
  renderHealth = null,
  renderHealthAuditMaintenance = null,
  renderHealthAuditMaintenanceLoading = false,
  renderHealthAuditMaintenanceError = "",
  renderHealthAuditPurgeBusy = false,
  renderHealthAuditPurgeError = "",
  renderHealthAuditLastPurge = null,
  onCreateUser = null,
  onUpdateUser = null,
  onDeleteUser = null,
  onUpdateUserProjectPermissions = null,
  onLoadUserActivity = null,
  onLoadUserProjectPermissions = null,
  onToggleUserActive = null,
  onRefreshUsers = null,
  onCreateRole = null,
  onUpdateRole = null,
  onOpenUser = null,
  onRefreshRoles = null,
  onUpdateMe = null,
  onRefreshMyActivity = null,
  onRefreshAudit = null,
  onRefreshRenderHealthAuditMaintenance = null,
  onPurgeRenderHealthAudit = null,
  onExportAuditAll = null,
  onExportAuditAllJson = null,
  onExportAuditAllNdjson = null,
  onCreateTask = null,
  onUpdateTask = null,
  onDeleteTask = null,
  onTransitionTask = null,
  onTaskFormOpenChange = null,
  taskFocusRequest = null,
  onTaskFocusHandled = null,
  editUserIdRequest = null,
  onEditUserIdHandled = null,
  onOpenActivityTarget = null,
  onRequestOpenTasks = null,
  onRefreshProjects = null,
  onUserEditorModeChange = null,
  onLoadProjectRenderTemplates = null,
  onLoadProjectUnrealCatalog = null,
  onLoadProjectWrcFields = null,
  onSyncProject = null,
  onLoadProjectDataTables = null,
  onRefreshResources = null,
  onReindexResources = null,
  onLoadResourceDetail = null,
  onCreateRender = null,
  onTransitionRender = null,
  onLoadRenderTransitions = null,
  onScanDetectedRenders = null,
  onDispatchRenders = null,
  onSaveDispatchPolicy = null,
  onScheduleRender = null,
  onReorderRenders = null,
  onCreateRenderForm = null,
  onUpdateRenderForm = null,
  onDeleteRenderForm = null,
  onLoadRenderFormFields = null,
  onReplaceRenderFormFields = null,
  renderOutputDir = "",
}) {
  const title = String(titleOverride || "").trim() || resolveTitle(tabKey, t);
  const intro = safeT(t, "postprod.stub.intro", "Workspace under construction (v2026.3).");
  const description = safeT(
    t,
    "postprod.stub.description",
    "This tab will be connected to the post-production workflow.",
    { tab: title }
  );
  const nextStep = safeT(
    t,
    "postprod.stub.next",
    "Next step: connect SQLite + authentication + audit."
  );

  if (!isAuthenticated) {
    return (
      <div className="uu-page uu-page-compact">
        <AuthCard t={t} busy={authBusy} error={authError} onLogin={onLogin} />
      </div>
    );
  }

  return (
    <div className="uu-page uu-page-compact">
      {!hideStubNotice ? (
        <section className="uu-section">
          <p className="uu-muted" style={{ marginTop: "8px", marginBottom: "0" }}>
            {intro}
          </p>
          <p style={{ marginTop: "10px", marginBottom: "0" }}>{description}</p>
          <div className="uu-msg info mt-12">{nextStep}</div>
        </section>
      ) : null}

      {tabKey === "Utilisateurs" && !canManageUsers ? (
        <ProfileCard
          t={t}
          user={user}
          appLang={appLang}
          onChangeAppLanguage={onChangeAppLanguage}
          saving={profileSaving}
          error={profileError}
          projects={projects}
          projectsLoading={projectsLoading}
          myActivity={myActivity}
          myActivitySummary={myActivitySummary}
          activityLoading={myActivityLoading}
          activityError={myActivityError}
          onRefreshActivity={onRefreshMyActivity}
          onUpdateMe={onUpdateMe}
        />
      ) : null}

      {tabKey === "Utilisateurs" && canManageUsers ? (
        <UserManagementCard
          t={t}
          tabKey={userTabKey}
          manageableRoles={manageableRoles}
          canBanUsers={canBanUsers}
          canManageProjectPermissions={canManageProjectPermissions}
          roles={roles}
          users={users}
          usersLoading={usersLoading}
          usersError={usersError}
          projects={projects}
          projectsLoading={projectsLoading}
          projectsError={projectsError}
          onCreateUser={onCreateUser}
          onUpdateUser={onUpdateUser}
          onDeleteUser={onDeleteUser}
          onUpdateUserProjectPermissions={onUpdateUserProjectPermissions}
          onLoadUserActivity={onLoadUserActivity}
          onLoadUserProjectPermissions={onLoadUserProjectPermissions}
          onToggleUserActive={onToggleUserActive}
          onRefreshUsers={onRefreshUsers}
          onRefreshProjects={onRefreshProjects}
          onEditorModeChange={onUserEditorModeChange}
          onNotify={onNotify}
          editUserIdRequest={editUserIdRequest}
          onEditUserIdHandled={onEditUserIdHandled}
          onOpenActivityTarget={onOpenActivityTarget}
        />
      ) : null}

      {tabKey === "Taches" ? (
        <TasksCard
          t={t}
          tabKey={taskTabKey}
          tasks={tasks}
          renders={renders}
          projectOptions={taskProjectOptions}
          resourceOptions={taskResourceOptions}
          renderTemplates={renderTemplates}
          renderForms={renderForms}
          renderFormsLoading={renderFormsLoading}
          renderFormsError={renderFormsError}
          canManageRenderTemplates={canManageRenderTemplates}
          canCreateTasks={canCreateTasks}
          renderWorkers={renderWorkers}
          renderWorkersLoading={renderWorkersLoading}
          renderWorkersError={renderWorkersError}
          renderOutputDir={renderOutputDir}
          taskFocusRequest={taskFocusRequest}
          onTaskFocusHandled={onTaskFocusHandled}
          tasksLoading={tasksLoading || taskCatalogLoading}
          tasksError={tasksError}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onCreateRender={onCreateRender}
          onLoadRenderFormFields={onLoadRenderFormFields}
          onLoadProjectUnrealCatalog={onLoadProjectUnrealCatalog}
          onTransitionTask={onTransitionTask}
          onFormModeChange={onTaskFormOpenChange}
        />
      ) : null}

      {tabKey === "Projets" ? (
        <ProjectsCatalogCard
          t={t}
          projects={projects}
          tasks={tasks}
          loading={projectsLoading}
          error={projectsError}
          onOpenLinkedTasks={onRequestOpenTasks}
          onLoadProjectRenderTemplates={onLoadProjectRenderTemplates}
          onSyncProject={onSyncProject}
          onLoadProjectDataTables={onLoadProjectDataTables}
        />
      ) : null}

      {tabKey === "Ressources" && canViewResources ? (
        <ResourcesCatalogCard
          t={t}
          resources={resources}
          tasks={tasks}
          source={resourcesSource}
          sync={resourcesSync}
          loading={resourcesLoading}
          error={resourcesError}
          onOpenLinkedTasks={onRequestOpenTasks}
          onRefreshResources={onRefreshResources}
          onReindexResources={onReindexResources}
          onLoadResourceDetail={onLoadResourceDetail}
        />
      ) : null}
      {tabKey === "Ressources" && !canViewResources ? (
        <section className="uu-section">
          <div className="uu-msg warn">
            {safeT(
              t,
              "postprod.resources.forbidden",
              "Tu n'es pas autorise a voir les ressources."
            )}
          </div>
        </section>
      ) : null}

      {tabKey === "Datas" && canManageRenderTemplates ? (
        <DatasCard
          t={t}
          tabKey={datasTabKey}
          projects={projects}
          projectsLoading={projectsLoading}
          projectsError={projectsError}
          onLoadProjectWrcFields={onLoadProjectWrcFields}
          onLoadProjectUnrealCatalog={onLoadProjectUnrealCatalog}
          renderForms={renderForms}
          renderFormsLoading={renderFormsLoading}
          renderFormsError={renderFormsError}
          canManageRenderTemplates={canManageRenderTemplates}
          onCreateRenderForm={onCreateRenderForm}
          onUpdateRenderForm={onUpdateRenderForm}
          onDeleteRenderForm={onDeleteRenderForm}
          onLoadRenderFormFields={onLoadRenderFormFields}
          onReplaceRenderFormFields={onReplaceRenderFormFields}
        />
      ) : null}
      {tabKey === "Datas" && !canManageRenderTemplates ? (
        <section className="uu-section">
          <div className="uu-msg warn">
            {safeT(
              t,
              "postprod.data.forms.forbidden",
              "Tu n'es pas autorise a gerer les formulaires."
            )}
          </div>
        </section>
      ) : null}

      {tabKey === "Rendus" ? (
        <RendersValidationCard
          t={t}
          user={user}
          renders={renders}
          rendersLoading={rendersLoading}
          rendersError={rendersError}
          tasks={tasks}
          tasksLoading={tasksLoading}
          renderWorkers={renderWorkers}
          health={renderHealth}
          onCreateRender={onCreateRender}
          onTransitionRender={onTransitionRender}
          onLoadRenderTransitions={onLoadRenderTransitions}
          onScanDetectedRenders={onScanDetectedRenders}
          onDispatchRenders={onDispatchRenders}
          onSaveDispatchPolicy={onSaveDispatchPolicy}
          onScheduleRender={onScheduleRender}
          onReorderRenders={onReorderRenders}
        />
      ) : null}

      {tabKey === "Historique" ? (
        <AuditHistoryCard
          t={t}
          entries={auditEntries}
          loading={auditLoading}
          error={auditError}
          total={auditTotal}
          page={auditPage}
          pageSize={auditPageSize}
          hasMore={auditHasMore}
          filters={auditFilters}
          canManageRetention={canManageRoles}
          renderHealthAuditMaintenance={renderHealthAuditMaintenance}
          renderHealthAuditMaintenanceLoading={renderHealthAuditMaintenanceLoading}
          renderHealthAuditMaintenanceError={renderHealthAuditMaintenanceError}
          renderHealthAuditPurgeBusy={renderHealthAuditPurgeBusy}
          renderHealthAuditPurgeError={renderHealthAuditPurgeError}
          renderHealthAuditLastPurge={renderHealthAuditLastPurge}
          onRefreshAudit={onRefreshAudit}
          onRefreshRenderHealthAuditMaintenance={onRefreshRenderHealthAuditMaintenance}
          onPurgeRenderHealthAudit={onPurgeRenderHealthAudit}
          onExportAuditAll={onExportAuditAll}
          onExportAuditAllJson={onExportAuditAllJson}
          onExportAuditAllNdjson={onExportAuditAllNdjson}
          onOpenActivityTarget={onOpenActivityTarget}
        />
      ) : null}

      {tabKey === "Profils" && canManageRoles ? (
        <RoleManagementCard
          t={t}
          tabKey={roleTabKey}
          roles={roles}
          rolesLoading={rolesLoading}
          rolesError={rolesError}
          users={users}
          onCreateRole={onCreateRole}
          onUpdateRole={onUpdateRole}
          onOpenUser={onOpenUser}
          onRefreshRoles={onRefreshRoles}
        />
      ) : null}
    </div>
  );
}
