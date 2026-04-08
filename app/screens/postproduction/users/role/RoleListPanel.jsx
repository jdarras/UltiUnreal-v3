import { safeT } from "../../shared/helpers";
import { roleLabel } from "../roleHelpers";

function resolveRoleModeLabel(t, role = {}) {
  const canUseLive = role?.canUseLiveMode !== false;
  const canUseRender = role?.canUsePostprodMode !== false;
  if (canUseLive && canUseRender) {
    return safeT(t, "postprod.roles.list.mode.both", "Live + rendu");
  }
  if (canUseLive) {
    return safeT(t, "postprod.roles.list.mode.live", "Live");
  }
  if (canUseRender) {
    return safeT(t, "postprod.roles.list.mode.render", "Rendu");
  }
  return safeT(t, "postprod.roles.list.mode.none", "Aucun");
}

function RoleListPanel({
  t,
  roleRows = [],
  users = [],
  rolesLoading = false,
  openEdit,
}) {
  const usersByRole = new Map();
  const usersList = Array.isArray(users) ? users : [];
  for (const user of usersList) {
    const roleKey = String(user?.role || "").trim().toLowerCase();
    if (!roleKey) continue;
    usersByRole.set(roleKey, Number(usersByRole.get(roleKey) || 0) + 1);
  }

  return (
    <div className="uu-col mt-12">
      {roleRows.length === 0 ? (
        <div className="uu-muted">-</div>
      ) : roleRows.map((role) => {
        const roleKey = String(role?.key || "").trim();
        const roleKeyLookup = roleKey.toLowerCase();
        const userCount = Number(usersByRole.get(roleKeyLookup) || 0);
        const modeLabel = resolveRoleModeLabel(t, role);
        const noteText = String(role?.note || "").trim() || "-";
        return (
          <div key={roleKey} className="uu-card">
            <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{roleLabel(t, roleKey)}</div>
                <div className="uu-muted">
                  {safeT(t, "postprod.roles.list.modeLabel", "Modes")}: {modeLabel}
                </div>
                <div className="uu-muted">
                  {safeT(t, "postprod.roles.list.userCount", "Utilisateurs")}: {userCount}
                </div>
                <div className="uu-muted">
                  {safeT(t, "postprod.roles.form.note", "Note")}: {noteText}
                </div>
              </div>
              <div className="uu-row" style={{ gap: "8px", alignItems: "center" }}>
                <button
                  className="uu-btn-ghost"
                  type="button"
                  disabled={rolesLoading}
                  onClick={() => openEdit?.(role)}
                >
                  {safeT(t, "postprod.roles.action.edit", "Éditer")}
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
