function AptitudeCheckModal({
  t,
  workerDisplayName = "",
  title = "",
  body = "",
  confirmLabel = "",
  cancelLabel = "",
  onConfirm = null,
  onCancel = null,
}) {
  const name = String(workerDisplayName || "").trim() || t("postprod.renders.aptitude.unknownStation");
  const resolvedTitle = String(title || "").trim() || t("postprod.renders.aptitude.modalTitle");
  const resolvedBody = String(body || "").trim() || t("postprod.renders.aptitude.modalBody", { name });
  const resolvedConfirmLabel = String(confirmLabel || "").trim() || t("postprod.renders.aptitude.confirm");
  const resolvedCancelLabel = String(cancelLabel || "").trim() || t("postprod.renders.aptitude.cancel");

  return (
    <div className="uu-render-detail-overlay" onClick={() => onCancel?.()}>
      <div className="uu-card uu-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="uu-h3 uu-block-title">{resolvedTitle}</p>
        <p className="uu-confirm-dialog-body">
          {resolvedBody}
        </p>
        <div className="uu-confirm-dialog-actions">
          <button
            className="uu-btn"
            type="button"
            onClick={() => onCancel?.()}
          >
            {resolvedCancelLabel}
          </button>
          <button
            className="uu-btn uu-btn-primary"
            type="button"
            onClick={() => onConfirm?.()}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export { AptitudeCheckModal };
