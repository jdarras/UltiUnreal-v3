import { safeT } from "../../shared/helpers";

function RenderRejectDialog({
  t,
  open = false,
  render = null,
  reason = "",
  busy = false,
  renderOutputFilename = null,
  onChangeReason = null,
  onCancel = null,
  onConfirm = null,
}) {
  if (!open) return null;

  const fileLabel = typeof renderOutputFilename === "function"
    ? String(renderOutputFilename(render) || "").trim()
    : "";
  const dialogTitle = safeT(t, "postprod.renders.reject.modalTitle", "Rejeter le rendu");
  const dialogMessage = fileLabel
    ? safeT(t, "postprod.renders.reject.modalMessageWithName", "Motif du rejet pour {name} (optionnel).", { name: fileLabel })
    : safeT(t, "postprod.renders.reject.modalMessage", "Motif du rejet (optionnel).");

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
        aria-label={dialogTitle}
        style={{
          width: "min(560px, calc(100vw - 32px))",
          padding: "16px",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={{ fontWeight: 600, marginBottom: "10px" }}>
          {dialogTitle}
        </div>
        <div style={{ marginBottom: "10px", lineHeight: 1.35 }}>
          {dialogMessage}
        </div>
        <textarea
          className="uu-input"
          rows={5}
          value={String(reason || "")}
          disabled={busy}
          placeholder={safeT(t, "postprod.renders.reject.reasonPlaceholder", "Ajouter un motif (facultatif)")}
          onChange={(event) => onChangeReason?.(event.target.value)}
        />
        <div className="uu-row mt-12" style={{ justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            className="uu-btn"
            disabled={busy}
            onClick={() => onCancel?.()}
          >
            {safeT(t, "common.cancel", "Annuler")}
          </button>
          <button
            type="button"
            className="uu-btn prod-toggle-active"
            disabled={busy}
            onClick={() => onConfirm?.()}
          >
            {safeT(t, "postprod.renders.action.reject", "Rejeter")}
          </button>
        </div>
      </div>
    </div>
  );
}

export {
  RenderRejectDialog,
};

export default RenderRejectDialog;
