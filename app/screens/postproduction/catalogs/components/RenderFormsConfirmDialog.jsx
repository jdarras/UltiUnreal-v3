import { safeT } from "../../shared/helpers";

const FORMS_CONFIRM_DIALOG_OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
};
const FORMS_CONFIRM_DIALOG_CARD_BASE_STYLE = {
  padding: "16px",
};
const FORMS_CONFIRM_DIALOG_TITLE_STYLE = { fontWeight: 600, marginBottom: "10px" };
const FORMS_CONFIRM_DIALOG_MESSAGE_STYLE = { marginBottom: "14px", lineHeight: 1.35 };
const FORMS_CONFIRM_DIALOG_ACTIONS_STYLE = { justifyContent: "flex-end", gap: "8px" };

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
  const dialogCardStyle = { ...FORMS_CONFIRM_DIALOG_CARD_BASE_STYLE, width };

  return (
    <div
      style={FORMS_CONFIRM_DIALOG_OVERLAY_STYLE}
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
        style={dialogCardStyle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title ? (
          <div style={FORMS_CONFIRM_DIALOG_TITLE_STYLE}>{title}</div>
        ) : null}
        <div style={FORMS_CONFIRM_DIALOG_MESSAGE_STYLE}>
          {message}
        </div>
        <div className="uu-row" style={FORMS_CONFIRM_DIALOG_ACTIONS_STYLE}>
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
