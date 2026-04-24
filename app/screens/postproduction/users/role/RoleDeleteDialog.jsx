import { safeT } from "../../shared/helpers";
import { roleLabel } from "../roleHelpers";

function RoleDeleteDialog({
  t,
  open = false,
  busy = false,
  roleKey = "",
  userCount = 0,
  onCancel = null,
  onConfirm = null,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onCancel?.();
        }
      }}
    >
      <div
        className="uu-card"
        role="dialog"
        aria-modal="true"
        aria-label={safeT(t, "production.confirm.title", "Confirmation")}
        style={{
          width: "min(460px, calc(100vw - 32px))",
          padding: "16px",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={{ fontWeight: 600, marginBottom: "10px" }}>
          {safeT(t, "production.confirm.title", "Confirmation")}
        </div>
        <div style={{ marginBottom: "14px", lineHeight: 1.35 }}>
          {userCount > 0
            ? safeT(
                t,
                "postprod.roles.confirm.deleteWithUsers",
                "Supprimer le profil \"{name}\" ? Les {count} utilisateur(s) associé(s) seront réassignés au profil \"Journaliste\".",
                { name: roleLabel(t, roleKey), count: userCount }
              )
            : safeT(
                t,
                "postprod.roles.confirm.delete",
                "Supprimer le profil \"{name}\" ?",
                { name: roleLabel(t, roleKey) }
              )}
        </div>
        <div className="uu-row" style={{ justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            className="uu-btn"
            disabled={busy}
            onClick={() => onCancel?.()}
          >
            {safeT(t, "production.confirm.cancel", "Annuler")}
          </button>
          <button
            type="button"
            className="uu-btn prod-toggle-active"
            disabled={busy}
            onClick={() => onConfirm?.()}
          >
            {safeT(t, "postprod.roles.action.delete", "Supprimer")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { RoleDeleteDialog };
