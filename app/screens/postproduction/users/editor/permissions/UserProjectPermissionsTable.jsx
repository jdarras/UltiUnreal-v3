import { safeT } from "../../../shared/helpers";

function UserProjectPermissionsTable({
  t,
  filteredPermissionSummaryRows = [],
  selectedPermissionProjectRef = "",
  usersLoading = false,
  projectsLoading = false,
  permissionLoading = false,
  permissionSaving = false,
  setSelectedPermissionProjectRef = null,
  setPermissionError = null,
  setPermissionInfo = null,
}) {
  return (
    <div className="mt-12" style={{ overflowX: "auto" }}>
      <table className="uu-table">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              {safeT(t, "postprod.users.permissions.table.project", "Projet")}
            </th>
            <th style={{ textAlign: "left" }}>
              {safeT(t, "postprod.users.permissions.isReferent", "isReferent")}
            </th>
            <th style={{ textAlign: "left" }}>
              {safeT(t, "postprod.users.permissions.canValidate", "canValidate")}
            </th>
            <th style={{ textAlign: "left" }}>
              {safeT(t, "postprod.users.permissions.canSync", "canSync")}
            </th>
            <th style={{ textAlign: "left" }}>
              {safeT(t, "postprod.users.permissions.canLaunchRender", "canLaunchRender")}
            </th>
            <th style={{ textAlign: "left" }}>
              {safeT(t, "postprod.users.permissions.canEditData", "canEditData")}
            </th>
            <th style={{ textAlign: "left" }}>
              {safeT(t, "postprod.users.permissions.table.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredPermissionSummaryRows.map((row) => {
            const isCurrent = row.ref === String(selectedPermissionProjectRef || "").trim();
            return (
              <tr
                key={`user-perm-row-${row.ref}`}
                style={isCurrent ? { background: "rgba(25, 120, 255, 0.10)" } : undefined}
              >
                <td>
                  {row.project.name && row.project.id
                    ? `${row.project.name} [${row.project.id}]`
                    : (row.project.name || row.project.id || row.ref)}
                </td>
                <td>{row.isReferent ? "Oui" : "-"}</td>
                <td>{row.canValidate ? "Oui" : "-"}</td>
                <td>{row.canSync ? "Oui" : "-"}</td>
                <td>{row.canLaunchRender ? "Oui" : "-"}</td>
                <td>{row.canEditData ? "Oui" : "-"}</td>
                <td>
                  <button
                    className="uu-btn-ghost"
                    type="button"
                    disabled={usersLoading || projectsLoading || permissionLoading || permissionSaving}
                    onClick={() => {
                      setSelectedPermissionProjectRef?.(row.ref);
                      setPermissionError?.("");
                      setPermissionInfo?.("");
                    }}
                  >
                    {safeT(t, "postprod.users.action.edit", "Editer")}
                  </button>
                </td>
              </tr>
            );
          })}
          {filteredPermissionSummaryRows.length === 0 ? (
            <tr>
              <td colSpan={7} className="uu-muted">
                {safeT(t, "postprod.users.permissions.table.empty", "Aucun projet pour ce filtre.")}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export { UserProjectPermissionsTable };
