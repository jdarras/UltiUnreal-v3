import { safeT } from "../../shared/helpers";
import { roleLabel } from "../roleHelpers";

function RoleListPanel({
  t,
  roleRows = [],
  rolesLoading = false,
  rolePermissionsSummary,
  openEdit,
}) {
  return (
    <div className="uu-col mt-12">
      {roleRows.length === 0 ? (
        <div className="uu-muted">-</div>
      ) : roleRows.map((role) => {
        const roleKey = String(role?.key || "").trim();
        const manageableRoles = Array.isArray(role?.manageableRoles) ? role.manageableRoles : [];
        return (
          <div key={roleKey} className="uu-card">
            <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{roleLabel(t, roleKey)}</div>
                <div className="uu-muted">{rolePermissionsSummary?.(role)}</div>
                <div className="uu-muted">
                  {safeT(t, "postprod.roles.form.manageableRoles", "Roles utilisables pour creer des comptes")}:{" "}
                  {manageableRoles.length > 0
                    ? manageableRoles.map((candidate) => roleLabel(t, candidate)).join(", ")
                    : "-"}
                </div>
                <div className="uu-muted">
                  {safeT(t, "postprod.roles.form.note", "Note")}: {String(role?.note || "-")}
                </div>
              </div>
              <div className="uu-row" style={{ gap: "8px", alignItems: "center" }}>
                <button
                  className="uu-btn-ghost"
                  type="button"
                  disabled={rolesLoading}
                  onClick={() => openEdit?.(role)}
                >
                  {safeT(t, "postprod.roles.action.edit", "Editer")}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { RoleListPanel };
