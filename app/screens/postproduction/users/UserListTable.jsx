import { safeT } from "../shared/helpers";
import { resolveUserDisplayName, resolveUserPhoneValue } from "./roleHelpers";

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
    <div style={{ overflowX: "auto" }}>
      <table className="uu-table" style={{ width: "100%", minWidth: "1240px" }}>
        <colgroup>
          <col style={{ width: "72px" }} />
          <col style={{ width: "240px" }} />
          <col style={{ width: "180px" }} />
          <col style={{ width: "180px" }} />
          <col style={{ width: "200px" }} />
          <col style={{ width: "320px" }} />
          <col style={{ width: "140px" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("isActive")}>
                {safeT(t, "postprod.users.table.active", "Actif")} {listSortArrowFor?.("isActive")}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("username")}>
                {safeT(t, "postprod.users.form.username", "User")} {listSortArrowFor?.("username")}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("firstName")}>
                {safeT(t, "postprod.users.form.firstName", "Prenom")} {listSortArrowFor?.("firstName")}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("lastName")}>
                {safeT(t, "postprod.users.form.lastName", "Nom")} {listSortArrowFor?.("lastName")}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("phone")}>
                {safeT(t, "postprod.users.table.phone", "Telephone")} {listSortArrowFor?.("phone")}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button className="uu-link" type="button" onClick={() => handleListSort?.("email")}>
                {safeT(t, "postprod.users.form.email1", "Mail")} {listSortArrowFor?.("email")}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              {safeT(t, "common.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedUsersForList.map((entry) => {
            const id = Number(entry?.id || 0);
            const rowRole = String(entry?.role || "").trim();
            const canEditRow = manageableSet.has(rowRole);
            const rowUser = String(entry?.username || "").trim() || resolveUserDisplayName(entry);
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
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "999px",
                      background: isActive ? "#22c55e" : "#ef4444",
                      display: "inline-block",
                    }}
                  />
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{rowUser || "-"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{rowFirstName || "-"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{rowLastName || "-"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{rowPhone || "-"}</td>
                <td>
                  {rowEmail ? (
                    <button
                      type="button"
                      className="uu-link"
                      onClick={openMailCompose}
                      title={safeT(t, "postprod.users.actions.mailto", "Ecrire a cet utilisateur")}
                      style={{ whiteSpace: "nowrap" }}
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
                    {safeT(t, "postprod.users.actions.edit", "Editer")}
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
