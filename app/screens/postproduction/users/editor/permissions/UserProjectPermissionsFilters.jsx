import { safeT } from "../../../shared/helpers";

function UserProjectPermissionsFilters({
  t,
  usersLoading = false,
  projectsLoading = false,
  permissionLoading = false,
  permissionSaving = false,
  permissionOverridesCount = 0,
  permissionSummaryRows = [],
  permissionTableSearch = "",
  setPermissionTableSearch = null,
  permissionTableScope = "all",
  setPermissionTableScope = null,
  filteredPermissionSummaryRows = [],
}) {
  return (
    <>
      <div className="uu-muted">
        {safeT(t, "postprod.users.permissions.summaryHint", "Overrides projet appliques: {count}/{total}", {
          count: permissionOverridesCount,
          total: permissionSummaryRows.length,
        })}
      </div>
      <div className="uu-row mt-8" style={{ alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <input
          className="uu-input"
          style={{ minWidth: "260px", flex: "1 1 260px" }}
          type="text"
          value={permissionTableSearch}
          onChange={(e) => setPermissionTableSearch?.(e.target.value)}
          disabled={usersLoading || projectsLoading || permissionLoading || permissionSaving}
          placeholder={safeT(
            t,
            "postprod.users.permissions.table.search",
            "Filtrer projets (nom, id, code)"
          )}
        />
        <select
          className="uu-input"
          style={{ width: "220px" }}
          value={permissionTableScope}
          onChange={(e) => setPermissionTableScope?.(String(e.target.value || "all"))}
          disabled={usersLoading || projectsLoading || permissionLoading || permissionSaving}
        >
          <option value="all">
            {safeT(t, "postprod.users.permissions.table.filter.all", "Tous les projets")}
          </option>
          <option value="overrides">
            {safeT(t, "postprod.users.permissions.table.filter.overrides", "Avec override")}
          </option>
          <option value="without_overrides">
            {safeT(t, "postprod.users.permissions.table.filter.withoutOverrides", "Sans override")}
          </option>
        </select>
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={
            usersLoading ||
            projectsLoading ||
            permissionLoading ||
            permissionSaving ||
            (!String(permissionTableSearch || "").trim() && permissionTableScope === "all")
          }
          onClick={() => {
            setPermissionTableSearch?.("");
            setPermissionTableScope?.("all");
          }}
        >
          {safeT(t, "postprod.users.permissions.table.clear", "Effacer filtres")}
        </button>
      </div>
      <div className="uu-muted mt-8">
        {safeT(t, "postprod.users.permissions.table.filtered", "{count}/{total} lignes", {
          count: filteredPermissionSummaryRows.length,
          total: permissionSummaryRows.length,
        })}
      </div>
    </>
  );
}

export { UserProjectPermissionsFilters };
