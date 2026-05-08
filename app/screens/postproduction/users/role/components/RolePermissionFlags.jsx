import { safeT } from "../../../shared/helpers";
import { RoleManageableRolesSection } from "./RoleManageableRolesSection";

function PermissionToggleRow({
  label = "",
  checked = false,
  disabled = false,
  onChange = null,
} = {}) {
  return (
    <label className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  );
}

function RolePermissionFlags({
  t,
  draft = {},
  setDraft = null,
  rolesLoading = false,
  editorManageableCandidates = [],
  toggleDraftManageable = null,
} = {}) {
  const applyModeFlag = (field, checked) => {
    setDraft?.((prev) => {
      const next = {
        ...(prev || {}),
        [field]: checked,
      };
      if (next.canUseLiveMode !== false || next.canUsePostprodMode !== false) {
        if (field === "canUseLiveMode" && checked !== true) {
          next.canManageLayouts = false;
        }
        return next;
      }
      if (field === "canUseLiveMode") next.canUsePostprodMode = true;
      else next.canUseLiveMode = true;
      return next;
    });
  };

  const canUseRenderMode = draft?.canUsePostprodMode !== false;
  const canUseLiveMode = draft?.canUseLiveMode !== false;

  return (
    <div className="uu-col mt-12" style={{ gap: "12px" }}>
      <div className="uu-card">
        <h4 className="uu-h3 uu-block-title" style={{ marginBottom: "8px" }}>
          {safeT(t, "postprod.roles.form.sectionUsersProfiles", "Profils et utilisateurs")}
        </h4>
        <div className="uu-col" style={{ gap: "8px" }}>
          <PermissionToggleRow
            label={safeT(t, "postprod.roles.form.canManageRoles", "Peut gérer les profils")}
            checked={draft?.canManageRoles === true}
            disabled={rolesLoading}
            onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageRoles: e.target.checked }))}
          />
          <PermissionToggleRow
            label={safeT(t, "postprod.roles.form.canManageUsers", "Peut gérer les utilisateurs")}
            checked={draft?.canManageUsers === true}
            disabled={rolesLoading}
            onChange={(e) => setDraft?.((prev) => {
              const checked = e.target.checked;
              return {
                ...(prev || {}),
                canManageUsers: checked,
                canBanUsers: checked ? prev?.canBanUsers === true : false,
              };
            })}
          />
          <PermissionToggleRow
            label={safeT(t, "postprod.roles.form.canBanUsers", "Peut bannir un utilisateur")}
            checked={draft?.canBanUsers === true}
            disabled={rolesLoading || draft?.canManageUsers !== true}
            onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canBanUsers: e.target.checked }))}
          />
        </div>
      </div>

      <RoleManageableRolesSection
        t={t}
        draft={draft}
        rolesLoading={rolesLoading}
        editorManageableCandidates={editorManageableCandidates}
        toggleDraftManageable={toggleDraftManageable}
      />

      <div className="uu-card">
        <div className="uu-grid-2" style={{ alignItems: "start" }}>
          <div className="uu-col" style={{ gap: "8px" }}>
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.mode.live", "Mode Live")}
              checked={canUseLiveMode}
              disabled={rolesLoading}
              onChange={(e) => applyModeFlag("canUseLiveMode", e.target.checked)}
            />
          </div>
          <div className="uu-col" style={{ gap: "8px" }}>
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.mode.render", "Mode Rendu")}
              checked={canUseRenderMode}
              disabled={rolesLoading}
              onChange={(e) => applyModeFlag("canUsePostprodMode", e.target.checked)}
            />
          </div>
        </div>
      </div>

      {(canUseLiveMode || canUseRenderMode) && <div className="uu-grid-2">
        {canUseLiveMode && <div className="uu-card">
          <div className="uu-col" style={{ gap: "8px" }}>
            <h4 className="uu-h3 uu-block-title">{safeT(t, "postprod.roles.form.mode.live", "Mode Live")}</h4>
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canManageMachinesLive", "Peut gérer les stations")}
              checked={draft?.canManageMachines === true}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageMachines: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canEditLiveProjects", "Peut éditer les projets")}
              checked={draft?.canEditProjects === true}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canEditProjects: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canViewResources", "Peut voir les ressources")}
              checked={draft?.canViewResources === true}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canViewResources: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canSyncScenes", "Peut synchroniser")}
              checked={draft?.canSyncScenes === true}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canSyncScenes: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(
                t,
                "postprod.roles.form.canLaunchLiveProjects",
                "Peut lancer les projets Unreal (mode Game)"
              )}
              checked={draft?.canLaunchLiveProjects !== false}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canLaunchLiveProjects: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(
                t,
                "postprod.roles.form.canLaunchProjectsLiveEditor",
                "Peut lancer/modifier/supprimer un projet Unreal (mode éditeur)"
              )}
              checked={draft?.canLaunchProjects !== false}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canLaunchProjects: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canManageLayouts", "Peut créer/modifier des Layouts")}
              checked={draft?.canManageLayouts === true}
              disabled={rolesLoading || !canUseLiveMode}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageLayouts: e.target.checked }))}
            />
          </div>
        </div>}

        {canUseRenderMode && <div className="uu-card">
          <div className="uu-col" style={{ gap: "8px" }}>
            <h4 className="uu-h3 uu-block-title">{safeT(t, "postprod.roles.form.mode.render", "Mode Rendu")}</h4>
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canManageMachines", "Peut gérer les stations de rendu")}
              checked={draft?.canManageMachines === true}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageMachines: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canLaunchProjects", "Peut créer/lancer/modifier/supprimer un projet Unreal")}
              checked={draft?.canLaunchProjects !== false}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canLaunchProjects: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canManageProjectPermissions", "Peut éditer un projet")}
              checked={draft?.canManageProjectPermissions === true}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageProjectPermissions: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canViewResources", "Peut voir les ressources")}
              checked={draft?.canViewResources === true}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canViewResources: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canSyncScenes", "Peut synchroniser")}
              checked={draft?.canSyncScenes === true}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canSyncScenes: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canManageForms", "Peut créer des formulaires")}
              checked={draft?.canManageForms === true}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canManageForms: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canCreateTasks", "Peut créer des rendus")}
              checked={draft?.canCreateTasks === true}
              disabled={rolesLoading || !canUseRenderMode}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canCreateTasks: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canAssignRenderRequests", "Peut assigner la demande de rendus")}
              checked={draft?.canAssignRenderRequests === true}
              disabled={rolesLoading || !canUseRenderMode}
              onChange={(e) => setDraft?.((prev) => ({ ...(prev || {}), canAssignRenderRequests: e.target.checked }))}
            />
            <PermissionToggleRow
              label={safeT(t, "postprod.roles.form.canLaunchRenders", "Peut valider les rendus")}
              checked={draft?.canLaunchRenders !== false}
              disabled={rolesLoading}
              onChange={(e) => setDraft?.((prev) => ({
                ...(prev || {}),
                canLaunchRenders: e.target.checked,
                // Permission legacy backend (validation de statut) alignée sur le même toggle.
                canValidate: e.target.checked,
              }))}
            />
          </div>
        </div>}
      </div>}
    </div>
  );
}

export { RolePermissionFlags };
export default RolePermissionFlags;
