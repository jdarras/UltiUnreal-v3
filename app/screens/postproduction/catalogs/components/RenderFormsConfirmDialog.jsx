import { safeT } from "../../shared/helpers";

function RenderFormsConfirmDialog({
  t,
  open = false,
  title = "",
  message = "",
  busy = false,
  cancelLabel = "",
  confirmLabel = "",
  onCancel = null,
  onConfirm = null,
  confirmRef = null,
  width = "min(460px, calc(100vw - 32px))",
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
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && typeof onCancel === "function") {
          onCancel();
        }
      }}
    >
      <div
        className="uu-card"
        role="dialog"
        aria-modal="true"
        aria-label={title || safeT(t, "common.confirmation", "Confirmation")}
        style={{
          width,
          padding: "16px",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 600, marginBottom: "10px" }}>
          {title || safeT(t, "common.confirmation", "Confirmation")}
        </div>
        <div style={{ marginBottom: "14px", lineHeight: 1.35 }}>
          {message}
        </div>
        <div className="uu-row" style={{ justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            className="uu-btn"
            disabled={busy}
            onClick={() => {
              if (typeof onCancel === "function") {
                onCancel();
              }
            }}
          >
            {cancelLabel || safeT(t, "common.cancel", "Annuler")}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="uu-btn prod-toggle-active"
            disabled={busy}
            onClick={() => {
              if (typeof onConfirm === "function") {
                onConfirm();
              }
            }}
          >
            {confirmLabel || safeT(t, "common.confirm", "Confirmer")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { RenderFormsConfirmDialog };
