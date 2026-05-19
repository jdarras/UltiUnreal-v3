import { safeT } from "../shared/helpers";
import { resolveUserDisplayName, resolveUserPhoneValue } from "./roleHelpers";

const USER_LIST_SCROLL_STYLE = { overflowX: "auto" };
const USER_LIST_TABLE_STYLE = { width: "100%", minWidth: "1240px" };
const USER_LIST_COL_ACTIVE_STYLE = { width: "72px" };
const USER_LIST_COL_USERNAME_STYLE = { width: "240px" };
const USER_LIST_COL_FIRSTNAME_STYLE = { width: "180px" };
const USER_LIST_COL_LASTNAME_STYLE = { width: "180px" };
const USER_LIST_COL_PHONE_STYLE = { width: "200px" };
const USER_LIST_COL_EMAIL_STYLE = { width: "320px" };
const USER_LIST_COL_ACTIONS_STYLE = { width: "140px" };
const USER_LIST_TH_LEFT_STYLE = { textAlign: "left" };
const USER_LIST_NOWRAP_STYLE = { whiteSpace: "nowrap" };
const USER_LIST_STATUS_DOT_BASE_STYLE = {
  width: "10px",
  height: "10px",
  borderRadius: "999px",
  display: "inline-block",
};
const USER_LIST_STATUS_DOT_ACTIVE_STYLE = {
  ...USER_LIST_STATUS_DOT_BASE_STYLE,
  background: "#22c55e",
};
const USER_LIST_STATUS_DOT_INACTIVE_STYLE = {
  ...USER_LIST_STATUS_DOT_BASE_STYLE,
  background: "#ef4444",
};

function UserListTable({
  t,
  sortedUsersForList = [],
  handleListSort,
  listSortArrowFor,
  openEdit,
  usersLoading = false,
  manageableSet = new Set(),
}) {
  if (!Array.isArray(sortedUsersForList) || sortedUsersForList.length === 0) {
    return <div className="uu-muted">{safeT(t, "postprod.users.empty", "Aucun utilisateur.")}</div>;
  }

  return (
    <div style={USER_LIST_SCROLL_STYLE}>
      <table className="uu-table" style={USER_LIST_TABLE_STYLE}>
        <colgroup>
          <col style={USER_LIST_COL_ACTIVE_STYLE} />
          <col style={USER_LIST_COL_USERNAME_STYLE} />
          <col style={USER_LIST_COL_FIRSTNAME_STYLE} />
          <col style={USER_LIST_COL_LASTNAME_STYLE} />
          <col style={USER_LIST_COL_PHONE_STYLE} />
          <col style={USER_LIST_COL_EMAIL_STYLE} />
          <col style={USER_LIST_COL_ACTIONS_STYLE} />
        </colgroup>
        <thead>
          <tr>
            <th style={USER_LIST_TH_LEFT_STYLE}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("isActive")}>
                {safeT(t, "postprod.users.table.active", "Actif")} {listSortArrowFor?.("isActive")}
              </button>
            </th>
            <th style={USER_LIST_TH_LEFT_STYLE}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("username")}>
                {safeT(t, "postprod.users.form.username", "User")} {listSortArrowFor?.("username")}
              </button>
            </th>
            <th style={USER_LIST_TH_LEFT_STYLE}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("firstName")}>
                {safeT(t, "postprod.users.form.firstName", "Prenom")} {listSortArrowFor?.("firstName")}
              </button>
            </th>
            <th style={USER_LIST_TH_LEFT_STYLE}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("lastName")}>
                {safeT(t, "postprod.users.form.lastName", "Nom")} {listSortArrowFor?.("lastName")}
              </button>
            </th>
            <th style={USER_LIST_TH_LEFT_STYLE}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("phone")}>
                {safeT(t, "postprod.users.table.phone", "Telephone")} {listSortArrowFor?.("phone")}
              </button>
            </th>
            <th style={USER_LIST_TH_LEFT_STYLE}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("email")}>
                {safeT(t, "postprod.users.form.email1", "Mail")} {listSortArrowFor?.("email")}
              </button>
            </th>
            <th style={USER_LIST_TH_LEFT_STYLE}>
              {safeT(t, "common.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedUsersForList.map((entry) => {
            const id = Number(entry?.id || 0);
            const rowRole = String(entry?.role || "").trim();
            const canEditRow = manageableSet.has(rowRole);
            const rowUser = resolveUserDisplayName(entry);
            const rowLastName = String(entry?.lastName || "").trim();
            const rowFirstName = String(entry?.firstName || "").trim();
            const rowPhone = resolveUserPhoneValue(entry);
            const rowEmail = String(entry?.email || "").trim();
            const isActive = entry?.isActive !== false;
            const openMailCompose = () => {
              if (!rowEmail) return;
              const href = `mailto:${rowEmail}`;
              if (typeof window !== "undefined" && typeof window.electron?.openExternal === "function") {
                window.electron.openExternal(href);
                return;
              }
              if (typeof window !== "undefined" && typeof window.open === "function") {
                window.open(href, "_blank", "noopener,noreferrer");
              }
            };
            return (
              <tr key={`users-list-row-${id || rowUser || rowLastName || rowFirstName}`}>
                <td>
                  <span
                    title={isActive
                      ? safeT(t, "postprod.users.status.active", "Disponible")
                      : safeT(t, "postprod.users.status.inactive", "Indisponible")}
                    aria-label={isActive
                      ? safeT(t, "postprod.users.status.active", "Disponible")
                      : safeT(t, "postprod.users.status.inactive", "Indisponible")}
                    style={isActive ? USER_LIST_STATUS_DOT_ACTIVE_STYLE : USER_LIST_STATUS_DOT_INACTIVE_STYLE}
                  />
                </td>
                <td style={USER_LIST_NOWRAP_STYLE}>{rowUser || "-"}</td>
                <td style={USER_LIST_NOWRAP_STYLE}>{rowFirstName || "-"}</td>
                <td style={USER_LIST_NOWRAP_STYLE}>{rowLastName || "-"}</td>
                <td style={USER_LIST_NOWRAP_STYLE}>{rowPhone || "-"}</td>
                <td>
                  {rowEmail ? (
                    <button
                      type="button"
                      className="uu-link"
                      onClick={openMailCompose}
                      title={safeT(t, "postprod.users.actions.mailto", "Ecrire a cet utilisateur")}
                      style={USER_LIST_NOWRAP_STYLE}
                    >
                      {rowEmail}
                    </button>
                  ) : "-"}
                </td>
                <td>
                  <button
                    className="uu-btn-ghost"
                    type="button"
                    onClick={() => openEdit?.(entry)}
                    disabled={usersLoading || !canEditRow}
                    title={!canEditRow
                      ? safeT(
                        t,
                        "postprod.users.error.roleReadonly",
                        "Ce role ne peut pas etre modifie avec tes permissions."
                      )
                      : undefined}
                  >
                    {safeT(t, "postprod.users.actions.edit", "Éditer")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export { UserListTable };
