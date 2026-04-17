import { safeT } from "../../../shared/helpers";

function TaskEditorFooter({
  t,
  isEditingTask = false,
  renderOutputDir = "",
  autoExpectedRenderName = "",
  formError = "",
  submitDisabled = false,
  submitLabel = "",
  tasksLoading = false,
  onSubmit = null,
  onCancel = null,
}) {
  return (
    <>
      <div className="uu-grid-2 mt-12">
        <div className="uu-row uu-row-nowrap">
          <label className="uu-label" style={{ width: 160, flex: "0 0 160px" }}>
            {safeT(t, "postprod.tasks.form.autoRenderOutputDir", "Dossier de sortie")}
          </label>
          <div className="uu-muted uu-value" style={{ fontWeight: 600 }}>
            {String(renderOutputDir || "").trim() || safeT(t, "postprod.tasks.form.autoRenderOutputDir.missing", "Non configure")}
          </div>
        </div>
        <div className="uu-row uu-row-nowrap">
          <label className="uu-label" style={{ width: 180, flex: "0 0 180px" }}>
            {safeT(t, "postprod.tasks.form.expectedRenderNameSingle", "Nom du rendu attendu")}
          </label>
          <div className="uu-muted uu-value" style={{ fontWeight: 600 }}>
            {autoExpectedRenderName || "-"}
          </div>
        </div>
      </div>
      {formError ? (
        <div className="uu-msg error mt-12">{formError}</div>
      ) : null}
      <div className="uu-row uu-gap-4 mt-12">
        {!isEditingTask ? (
          <button
            className="uu-btn"
            type="button"
            disabled={submitDisabled}
            onClick={() => {
              if (typeof onSubmit === "function") {
                void onSubmit();
              }
            }}
          >
            {submitLabel}
          </button>
        ) : null}
        <button
          className="uu-btn-ghost"
          type="button"
          disabled={tasksLoading}
          onClick={() => onCancel?.()}
        >
          {safeT(t, "common.cancel", "Annuler")}
        </button>
      </div>
    </>
  );
}

export { TaskEditorFooter };
