import { safeT } from "../../../shared/helpers";

function RolePermissionFlags({
  t,
  draft = {},
  setDraft = null,
  rolesLoading = false,
} = {}) {
  return (
    <div className="uu-col mt-12" style={{ gap: "8px" }}>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canValidate === true}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canValidate: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.roles.form.canValidate", "Peut valider")}</span>
      </label>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canSyncScenes === true}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canSyncScenes: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.roles.form.canSyncScenes", "Peut synchroniser")}</span>
      </label>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canManageUsers === true}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => {
            const checked = e.target.checked;
            return {
              ...(prev || {}),
              canManageUsers: checked,
              canBanUsers: checked ? prev?.canBanUsers === true : false,
              canManageProjectPermissions: checked ? prev?.canManageProjectPermissions === true : false,
            };
          })}
        />
        <span>{safeT(t, "postprod.roles.form.canManageUsers", "Peut gerer utilisateurs")}</span>
      </label>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canManageRoles === true}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageRoles: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.roles.form.canManageRoles", "Peut gerer profils")}</span>
      </label>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canManageForms === true}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageForms: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.roles.form.canManageForms", "Peut creer des formulaires")}</span>
      </label>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canManageMachines === true}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageMachines: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.roles.form.canManageMachines", "Peut gerer machines post-production")}</span>
      </label>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canBanUsers === true}
          disabled={rolesLoading || draft?.canManageUsers !== true}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canBanUsers: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.roles.form.canBanUsers", "Peut bannir utilisateur")}</span>
      </label>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canManageProjectPermissions === true}
          disabled={rolesLoading || draft?.canManageUsers !== true}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageProjectPermissions: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.roles.form.canManageProjectPermissions", "Peut editer droits projet post-production")}</span>
      </label>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canLaunchRenders !== false}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canLaunchRenders: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.roles.form.canLaunchRenders", "Peut lancer rendus")}</span>
      </label>
      <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
        <input
          type="checkbox"
          checked={draft?.canLaunchProjects !== false}
          disabled={rolesLoading}
          onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canLaunchProjects: e.target.checked }))}
        />
        <span>{safeT(t, "postprod.roles.form.canLaunchProjects", "Peut lancer/modifier/supprimer projet Unreal")}</span>
      </label>
    </div>
  );
}

export { RolePermissionFlags };
export default RolePermissionFlags;
