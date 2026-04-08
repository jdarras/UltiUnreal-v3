import { safeT } from "../../../shared/helpers";
import { roleLabel } from "../../roleHelpers";

function RoleManageableRolesSection({
  t,
  draft = {},
  rolesLoading = false,
  editorManageableCandidates = [],
  toggleDraftManageable = null,
} = {}) {
  if (draft?.canManageUsers !== true) {
    return null;
  }

  return (
    <div className="uu-card">
      <h4 className="uu-h3 uu-block-title" style={{ marginBottom: "6px" }}>
        {safeT(t, "postprod.roles.form.manageableRoles", "Roles utilisables pour creer des comptes")}
      </h4>
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
    </div>
  );
}

export { RoleManageableRolesSection };
export default RoleManageableRolesSection;
