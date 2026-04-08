import { safeT } from "../../shared/helpers";

function UserDeleteDialog({
  t,
  open = false,
  busy = false,
  targetName = "",
  onCancel = null,
  onConfirm = null,
  confirmRef = null,
}) {
  if (!open) return null;

  const resolvedName = String(targetName || "").trim()
    || safeT(t, "postprod.users.form.displayName", "Nom affiché");

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
          {safeT(
            t,
            "postprod.users.confirm.delete",
            "Supprimer l'utilisateur \"{name}\" ?",
            { name: resolvedName }
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
            ref={confirmRef}
            type="button"
            className="uu-btn prod-toggle-active"
            disabled={busy}
            onClick={() => onConfirm?.()}
          >
            {safeT(t, "postprod.users.action.deleteUser", "Supprimer utilisateur")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { UserDeleteDialog };
