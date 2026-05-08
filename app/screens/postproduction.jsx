import {
  resolveTitle,
  safeT,
  AuthCard,
  UserManagementCard,
  RoleManagementCard,
  RenderEditorCard,
  ProjectsCatalogCard,
  ResourcesCatalogCard,
  DatasCard,
  RendersValidationCard,
  AuditHistoryCard,
} from "./postproduction/cards";
import { SelfProfileCard } from "./postproduction/users/SelfProfileCard.jsx";

export default function PostProductionScreen({
  tabKey = "Utilisateurs",
  userTabKey = 0,
  roleTabKey = 0,
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
  canAssignRenderRequests = false,
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
  auditLogStore = null,
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
  onDeleteRole = null,
  onOpenUser = null,
  onRefreshRoles = null,
  onUpdateMe = null,
  onRefreshMyActivity = null,
  onRefreshAudit = null,
  onPurgeAudit = null,
  onRefreshRenderHealthAuditMaintenance = null,
  onPurgeRenderHealthAudit = null,
  onExportAuditAll = null,
  onExportAuditAllJson = null,
  onExportAuditAllNdjson = null,
  onCreateTask = null,
  onUpdateTask = null,
  onDeleteTask = null,
  onTransitionTask = null,
  onReserveRenderId = null,
  onTaskFormOpenChange = null,
  renderFocusRequest = null,
  onRenderFocusHandled = null,
  editUserIdRequest = null,
  onEditUserIdHandled = null,
  onPurgeUserActivity = null,
  onOpenActivityTarget = null,
  onNavigateToProject = null,
  renderFormFocusRequest = null,
  onRenderFormFocusHandled = null,
  onNavigateToRenderForm = null,
  onRequestOpenRenderEditor = null,
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
  onUpdateRenderExportDestinations = null,
  onReorderRenders = null,
  onDeleteRender = null,
  onGenerateProxy = null,
  onPatchWorkerAptitude = null,
  onCreateRenderForm = null,
  onUpdateRenderForm = null,
  onDeleteRenderForm = null,
  onLoadRenderFormFields = null,
  onReplaceRenderFormFields = null,
  renderOutputDir = "",
  renderExportDestinationOptions = [],
}) {
  const normalizedRenderFocusRequest = (
    renderFocusRequest && typeof renderFocusRequest === "object"
      ? renderFocusRequest
      : null
  );
  const handleRenderFocusHandled = onRenderFocusHandled;
  const handleRequestOpenRenderEditor = onRequestOpenRenderEditor;

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
        <SelfProfileCard
          t={t}
          user={user}
          roles={roles}
          saving={profileSaving}
          onUpdateMe={onUpdateMe}
          myActivity={myActivity}
          myActivitySummary={myActivitySummary}
          myActivityLoading={myActivityLoading}
          myActivityError={myActivityError}
          onRefreshMyActivity={onRefreshMyActivity}
          projects={projects}
          projectsLoading={projectsLoading}
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
          onPurgeUserActivity={onPurgeUserActivity}
          onOpenActivityTarget={onOpenActivityTarget}
        />
      ) : null}

      {tabKey === "RendusCreate" ? (
        <RenderEditorCard
          t={t}
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
          canAssignRenderRequests={canAssignRenderRequests}
          currentUser={user}
          users={users}
          renderWorkers={renderWorkers}
          renderWorkersLoading={renderWorkersLoading}
          renderWorkersError={renderWorkersError}
          renderOutputDir={renderOutputDir}
          renderExportDestinationOptions={renderExportDestinationOptions}
          renderFocusRequest={normalizedRenderFocusRequest}
          onRenderFocusHandled={handleRenderFocusHandled}
          tasksLoading={tasksLoading || taskCatalogLoading}
          tasksError={tasksError}
          onCreateTask={onCreateTask}
          onUpdateTask={onUpdateTask}
          onDeleteTask={canAssignRenderRequests ? onDeleteTask : null}
          onCreateRender={onCreateRender}
          onReserveRenderId={onReserveRenderId}
          onLoadRenderFormFields={onLoadRenderFormFields}
          onLoadProjectUnrealCatalog={onLoadProjectUnrealCatalog}
          onTransitionTask={onTransitionTask}
          onFormModeChange={onTaskFormOpenChange}
          onNavigateToProject={onNavigateToProject}
          onNavigateToRenderForm={onNavigateToRenderForm}
        />
      ) : null}

      {tabKey === "Projets" ? (
        <ProjectsCatalogCard
          t={t}
          projects={projects}
          tasks={tasks}
          loading={projectsLoading}
          error={projectsError}
          onOpenLinkedTasks={handleRequestOpenRenderEditor}
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
          onOpenLinkedTasks={handleRequestOpenRenderEditor}
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
          onNavigateToProject={onNavigateToProject}
          renderFormFocusRequest={renderFormFocusRequest}
          onRenderFormFocusHandled={onRenderFormFocusHandled}
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
          projects={projects}
          renderForms={renderForms}
          tasks={tasks}
          tasksLoading={tasksLoading}
          renderWorkers={renderWorkers}
          renderWorkersLoading={renderWorkersLoading}
          onPatchWorkerAptitude={onPatchWorkerAptitude}
          health={renderHealth}
          onCreateRender={onCreateRender}
          onTransitionRender={onTransitionRender}
          onLoadRenderTransitions={onLoadRenderTransitions}
          onLoadRenderFormFields={onLoadRenderFormFields}
          onScanDetectedRenders={onScanDetectedRenders}
          onDispatchRenders={onDispatchRenders}
          onSaveDispatchPolicy={onSaveDispatchPolicy}
          onScheduleRender={onScheduleRender}
          onUpdateRenderExportDestinations={onUpdateRenderExportDestinations}
          onReorderRenders={onReorderRenders}
          onDeleteTask={canAssignRenderRequests ? onDeleteTask : null}
          onDeleteRender={onDeleteRender}
          onGenerateProxy={onGenerateProxy}
          onRequestOpenRenderEditor={handleRequestOpenRenderEditor}
          onNavigateToProject={onNavigateToProject}
          onNavigateToRenderForm={onNavigateToRenderForm}
          renderExportDestinationOptions={renderExportDestinationOptions}
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
          auditLogStore={auditLogStore}
          canManageRetention={canManageRoles}
          renderHealthAuditMaintenance={renderHealthAuditMaintenance}
          renderHealthAuditMaintenanceLoading={renderHealthAuditMaintenanceLoading}
          renderHealthAuditMaintenanceError={renderHealthAuditMaintenanceError}
          renderHealthAuditPurgeBusy={renderHealthAuditPurgeBusy}
          renderHealthAuditPurgeError={renderHealthAuditPurgeError}
          renderHealthAuditLastPurge={renderHealthAuditLastPurge}
          onRefreshAudit={onRefreshAudit}
          onPurgeAudit={onPurgeAudit}
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
          onDeleteRole={onDeleteRole}
          onOpenUser={onOpenUser}
          onRefreshRoles={onRefreshRoles}
        />
      ) : null}
    </div>
  );
}
