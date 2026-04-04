import { safeT } from "../../shared/helpers";

function TaskDeleteDialog({
  t,
  task,
  busy = false,
  onCancel = null,
  onConfirm = null,
  confirmRef = null,
}) {
  if (!task) return null;

  const taskTitle = String(task?.title || "").trim() || `#${Number(task?.id || 0)}`;

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
            "postprod.tasks.confirm.delete",
            "Supprimer la tache \"{title}\" ?",
            { title: taskTitle }
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
            {safeT(t, "postprod.tasks.action.delete", "Supprimer")}
          </button>
        </div>
      </div>
    </div>
  );
}

export {
  TaskDeleteDialog,
};
