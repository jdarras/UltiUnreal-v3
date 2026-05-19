const CONFIRM_DIALOG_OVERLAY_BASE_STYLE = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const CONFIRM_DIALOG_CARD_STYLE = {
  width: "min(460px, calc(100vw - 32px))",
  padding: "16px",
};
const CONFIRM_DIALOG_TITLE_STYLE = { fontWeight: 600, marginBottom: "10px" };
const CONFIRM_DIALOG_MESSAGE_STYLE = { marginBottom: "14px", lineHeight: 1.35 };
const CONFIRM_DIALOG_ACTIONS_STYLE = { justifyContent: "flex-end", gap: "8px" };

function buildConfirmDialogOverlayStyle(overlayZIndex) {
  return { ...CONFIRM_DIALOG_OVERLAY_BASE_STYLE, zIndex: overlayZIndex };
}

function ConfirmDialog({
  open = false,
  busy = false,
  title = "Confirmation",
  message = "",
  cancelLabel = "Annuler",
  confirmLabel = "OK",
  onCancel = null,
  onConfirm = null,
  confirmRef = null,
  overlayZIndex = 2000,
}) {
  if (!open) return null;

  return (
    <div
      style={buildConfirmDialogOverlayStyle(overlayZIndex)}
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
        aria-label={String(title || "").trim() || "Confirmation"}
        style={CONFIRM_DIALOG_CARD_STYLE}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={CONFIRM_DIALOG_TITLE_STYLE}>
          {String(title || "").trim() || "Confirmation"}
        </div>
        <div style={CONFIRM_DIALOG_MESSAGE_STYLE}>
          {String(message || "").trim()}
        </div>
        <div className="uu-row" style={CONFIRM_DIALOG_ACTIONS_STYLE}>
          <button
            type="button"
            className="uu-btn"
            disabled={busy}
            onClick={() => onCancel?.()}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="uu-btn prod-toggle-active"
            disabled={busy}
            onClick={() => onConfirm?.()}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export { ConfirmDialog };
