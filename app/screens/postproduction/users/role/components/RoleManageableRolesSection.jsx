import { safeT } from "../../../shared/helpers";
import { roleLabel } from "../../roleHelpers";

function RoleManageableRolesSection({
  t,
  draft = {},
  rolesLoading = false,
  editorManageableCandidates = [],
  toggleDraftManageable = null,
} = {}) {
  return (
    <div className="mt-12">
      <div className="uu-label" style={{ marginBottom: "6px" }}>
        {safeT(t, "postprod.roles.form.manageableRoles", "Roles utilisables pour creer des comptes")}
      </div>
      {draft?.canManageUsers !== true ? (
        <div className="uu-muted">{safeT(t, "postprod.roles.form.manageableDisabled", "Active d'abord la gestion utilisateurs.")}</div>
      ) : (
        <div className="uu-col" style={{ gap: "8px" }}>
          {editorManageableCandidates.map((candidate) => (
            <label key={`draft-${candidate}`} className="uu-row" style={{ gap: "6px", justifyContent: "flex-start" }}>
              <input
                type="checkbox"
                checked={(Array.isArray(draft?.manageableRoles) ? draft.manageableRoles : []).includes(candidate)}
                disabled={rolesLoading}
                onChange={() => toggleDraftManageable?.(candidate)}
              />
              <span>{roleLabel(t, candidate)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export { RoleManageableRolesSection };
export default RoleManageableRolesSection;
