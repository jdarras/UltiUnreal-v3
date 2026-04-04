import { safeT } from "../../../shared/helpers";

function UserProjectPermissionsEditor({
  t,
  usersLoading = false,
  projectsLoading = false,
  permissionLoading = false,
  permissionSaving = false,
  selectedPermissionProjectRef = "",
  setSelectedPermissionProjectRef = null,
  setPermissionError = null,
  setPermissionInfo = null,
  projectOptions = [],
  selectedPermissionProject = null,
  permissionDraft = {},
  setPermissionDraft = null,
  onUpdateUserProjectPermissions = null,
  submitProjectPermissions = null,
  permissionError = "",
  permissionInfo = "",
}) {
  return (
    <>
      <div className="uu-grid-field">
        <label className="uu-label">
          {safeT(t, "postprod.users.permissions.project", "Projet")}
        </label>
        <select
          className="uu-input"
          value={String(selectedPermissionProjectRef || "")}
          onChange={(e) => {
            setSelectedPermissionProjectRef?.(String(e.target.value || ""));
            setPermissionError?.("");
            setPermissionInfo?.("");
          }}
          disabled={usersLoading || projectsLoading || permissionLoading || permissionSaving}
        >
          {projectOptions.map((project) => (
            <option key={`user-perm-project-${project.ref}`} value={project.ref}>
              {project.name && project.id ? `${project.name} [${project.id}]` : (project.name || project.id || project.ref)}
            </option>
          ))}
        </select>
        {selectedPermissionProject ? (
          <div className="uu-muted mt-8">
            {safeT(t, "postprod.users.permissions.projectCode", "Code: {value}", {
              value: selectedPermissionProject.code || "-",
            })}
          </div>
        ) : null}
      </div>

      <div className="uu-grid-2 mt-12">
        <label className="uu-check">
          <input
            type="checkbox"
            checked={permissionDraft?.isReferent === true}
            onChange={(e) =>
              setPermissionDraft?.((prev) => ({
                ...(prev || {}),
                isReferent: e.target.checked,
              }))
            }
            disabled={usersLoading || permissionLoading || permissionSaving}
          />
          <span>{safeT(t, "postprod.users.permissions.isReferent", "isReferent")}</span>
        </label>
        <label className="uu-check">
          <input
            type="checkbox"
            checked={permissionDraft?.canValidate === true}
            onChange={(e) =>
              setPermissionDraft?.((prev) => ({
                ...(prev || {}),
                canValidate: e.target.checked,
              }))
            }
            disabled={usersLoading || permissionLoading || permissionSaving}
          />
          <span>{safeT(t, "postprod.users.permissions.canValidate", "canValidate")}</span>
        </label>
        <label className="uu-check">
          <input
            type="checkbox"
            checked={permissionDraft?.canSync === true}
            onChange={(e) =>
              setPermissionDraft?.((prev) => ({
                ...(prev || {}),
                canSync: e.target.checked,
                isReferent: e.target.checked ? true : (prev?.isReferent === true),
              }))
            }
            disabled={usersLoading || permissionLoading || permissionSaving}
          />
          <span>{safeT(t, "postprod.users.permissions.canSync", "canSync")}</span>
        </label>
        <label className="uu-check">
          <input
            type="checkbox"
            checked={permissionDraft?.canLaunchRender === true}
            onChange={(e) =>
              setPermissionDraft?.((prev) => ({
                ...(prev || {}),
                canLaunchRender: e.target.checked,
              }))
            }
            disabled={usersLoading || permissionLoading || permissionSaving}
          />
          <span>{safeT(t, "postprod.users.permissions.canLaunchRender", "canLaunchRender")}</span>
        </label>
        <label className="uu-check">
          <input
            type="checkbox"
            checked={permissionDraft?.canEditData === true}
            onChange={(e) =>
              setPermissionDraft?.((prev) => ({
                ...(prev || {}),
                canEditData: e.target.checked,
              }))
            }
            disabled={usersLoading || permissionLoading || permissionSaving}
          />
          <span>{safeT(t, "postprod.users.permissions.canEditData", "canEditData")}</span>
        </label>
      </div>
      <div className="uu-row mt-12">
        <button
          className="uu-btn"
          type="button"
          disabled={
            usersLoading ||
            projectsLoading ||
            permissionLoading ||
            permissionSaving ||
            !selectedPermissionProjectRef ||
            typeof onUpdateUserProjectPermissions !== "function"
          }
          onClick={() => {
            void submitProjectPermissions?.();
          }}
        >
          {permissionSaving
            ? safeT(t, "common.loading", "Chargement…")
            : safeT(t, "postprod.users.permissions.save", "Enregistrer droits projet")}
        </button>
      </div>
      {permissionLoading ? (
        <div className="uu-muted mt-8">
          {safeT(t, "postprod.users.permissions.loading", "Chargement des droits projet...")}
        </div>
      ) : null}
      {permissionError ? <div className="uu-msg warn mt-8">{permissionError}</div> : null}
      {permissionInfo ? <div className="uu-msg ok mt-8">{permissionInfo}</div> : null}
    </>
  );
}

export { UserProjectPermissionsEditor };
