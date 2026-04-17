function AptitudeCheckModal({
  t,
  workerDisplayName = "",
  onConfirm = null,
  onCancel = null,
}) {
  const name = String(workerDisplayName || "").trim() || t("postprod.renders.aptitude.unknownStation");

  return (
    <div className="uu-render-detail-overlay" onClick={() => onCancel?.()}>
      <div className="uu-card uu-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="uu-h3 uu-block-title">{t("postprod.renders.aptitude.modalTitle")}</p>
        <p className="uu-confirm-dialog-body">
          {t("postprod.renders.aptitude.modalBody", { name })}
        </p>
        <div className="uu-confirm-dialog-actions">
          <button
            className="uu-btn"
            type="button"
            onClick={() => onCancel?.()}
          >
            {t("postprod.renders.aptitude.cancel")}
          </button>
          <button
            className="uu-btn uu-btn-primary"
            type="button"
            onClick={() => onConfirm?.()}
          >
            {t("postprod.renders.aptitude.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export { AptitudeCheckModal };
