import { safeT } from "../../shared/helpers";
import { UserProjectPermissionsEditor } from "./permissions/UserProjectPermissionsEditor";
import { UserProjectPermissionsFilters } from "./permissions/UserProjectPermissionsFilters";
import { UserProjectPermissionsTable } from "./permissions/UserProjectPermissionsTable";

function UserProjectPermissionsBlock({
  t,
  usersLoading = false,
  projectsLoading = false,
  projectsError = "",
  projectOptions = [],
  permissionOverridesCount = 0,
  permissionSummaryRows = [],
  permissionTableSearch = "",
  setPermissionTableSearch,
  permissionTableScope = "all",
  setPermissionTableScope,
  permissionLoading = false,
  permissionSaving = false,
  filteredPermissionSummaryRows = [],
  selectedPermissionProjectRef = "",
  setSelectedPermissionProjectRef,
  setPermissionError,
  setPermissionInfo,
  selectedPermissionProject = null,
  permissionDraft = {},
  setPermissionDraft,
  submitProjectPermissions,
  onUpdateUserProjectPermissions = null,
  permissionError = "",
  permissionInfo = "",
}) {
  return (
    <div className="uu-card mt-12">
      <div className="uu-row uu-align-center" style={{ justifyContent: "space-between" }}>
        <h3 className="uu-h3 uu-block-title" style={{ margin: 0 }}>
          {safeT(t, "postprod.users.permissions.title", "Droits fins par projet")}
        </h3>
      </div>
      {projectsLoading ? (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.projects.loading", "Chargement des projets...")}
        </div>
      ) : null}
      {!projectsLoading && String(projectsError || "").trim() ? (
        <div className="uu-msg warn mt-8">{String(projectsError || "").trim()}</div>
      ) : null}
      {!projectsLoading && projectOptions.length === 0 ? (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.users.permissions.emptyProjects", "Aucun projet disponible.")}
        </div>
      ) : null}
      {projectOptions.length > 0 ? (
        <div className="uu-col mt-8">
          <UserProjectPermissionsFilters
            t={t}
            usersLoading={usersLoading}
            projectsLoading={projectsLoading}
            permissionLoading={permissionLoading}
            permissionSaving={permissionSaving}
            permissionOverridesCount={permissionOverridesCount}
            permissionSummaryRows={permissionSummaryRows}
            permissionTableSearch={permissionTableSearch}
            setPermissionTableSearch={setPermissionTableSearch}
            permissionTableScope={permissionTableScope}
            setPermissionTableScope={setPermissionTableScope}
            filteredPermissionSummaryRows={filteredPermissionSummaryRows}
          />

          <UserProjectPermissionsTable
            t={t}
            filteredPermissionSummaryRows={filteredPermissionSummaryRows}
            selectedPermissionProjectRef={selectedPermissionProjectRef}
            usersLoading={usersLoading}
            projectsLoading={projectsLoading}
            permissionLoading={permissionLoading}
            permissionSaving={permissionSaving}
            setSelectedPermissionProjectRef={setSelectedPermissionProjectRef}
            setPermissionError={setPermissionError}
            setPermissionInfo={setPermissionInfo}
          />

          <UserProjectPermissionsEditor
            t={t}
            usersLoading={usersLoading}
            projectsLoading={projectsLoading}
            permissionLoading={permissionLoading}
            permissionSaving={permissionSaving}
            selectedPermissionProjectRef={selectedPermissionProjectRef}
            setSelectedPermissionProjectRef={setSelectedPermissionProjectRef}
            setPermissionError={setPermissionError}
            setPermissionInfo={setPermissionInfo}
            projectOptions={projectOptions}
            selectedPermissionProject={selectedPermissionProject}
            permissionDraft={permissionDraft}
            setPermissionDraft={setPermissionDraft}
            onUpdateUserProjectPermissions={onUpdateUserProjectPermissions}
            submitProjectPermissions={submitProjectPermissions}
            permissionError={permissionError}
            permissionInfo={permissionInfo}
          />
        </div>
      ) : null}
    </div>
  );
}

export { UserProjectPermissionsBlock };
