import { safeT } from "../../../shared/helpers";
import { roleLabel } from "../../roleHelpers";

const ROLE_MANAGEABLE_TITLE_STYLE = { marginBottom: "6px" };
const ROLE_MANAGEABLE_LIST_STYLE = { gap: "8px" };
const ROLE_MANAGEABLE_ROW_STYLE = { gap: "6px", justifyContent: "flex-start" };

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
      <h4 className="uu-h3 uu-block-title" style={ROLE_MANAGEABLE_TITLE_STYLE}>
        {safeT(t, "postprod.roles.form.manageableRoles", "Roles utilisables pour creer des comptes")}
      </h4>
      <div className="uu-col" style={ROLE_MANAGEABLE_LIST_STYLE}>
        {editorManageableCandidates.map((candidate) => (
          <label key={`draft-${candidate}`} className="uu-row" style={ROLE_MANAGEABLE_ROW_STYLE}>
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
