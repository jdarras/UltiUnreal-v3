import { useState } from "react";
import { safeT } from "../../shared/helpers";
import { roleLabel } from "../roleHelpers";
import { RoleDeleteDialog } from "./RoleDeleteDialog";

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
  onDeleteRole = null,
}) {
  const [pendingDelete, setPendingDelete] = useState(null);

  const usersByRole = new Map();
  const usersList = Array.isArray(users) ? users : [];
  for (const user of usersList) {
    const roleKey = String(user?.role || "").trim().toLowerCase();
    if (!roleKey) continue;
    usersByRole.set(roleKey, Number(usersByRole.get(roleKey) || 0) + 1);
  }

  return (
    <>
      <RoleDeleteDialog
        t={t}
        open={pendingDelete !== null}
        busy={rolesLoading}
        roleKey={pendingDelete?.roleKey ?? ""}
        userCount={pendingDelete?.userCount ?? 0}
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          await onDeleteRole?.(pendingDelete.roleKey);
          setPendingDelete(null);
        }}
      />
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
                  <h4 className="uu-h3 uu-block-title" style={{ margin: 0 }}>{roleLabel(t, roleKey)}</h4>
                  <div>
                    <span className="uu-muted">{safeT(t, "postprod.roles.list.modeLabel", "Modes")}:</span>{" "}
                    {modeLabel}
                  </div>
                  <div>
                    <span className="uu-muted">{safeT(t, "postprod.roles.list.userCount", "Utilisateurs")}:</span>{" "}
                    {userCount}
                  </div>
                  <div>
                    <span className="uu-muted">{safeT(t, "postprod.roles.form.note", "Note")}:</span>{" "}
                    {noteText}
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
                  {typeof onDeleteRole === "function" ? (
                    <button
                      className="uu-btn-ghost"
                      type="button"
                      disabled={rolesLoading}
                      onClick={() => setPendingDelete({ roleKey, userCount })}
                    >
                      {safeT(t, "postprod.roles.action.delete", "Supprimer")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export { RoleListPanel };
