import { safeT } from "../../../shared/helpers";

function TaskEditorFooter({
  t,
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
      <div className="uu-grid-field mt-12">
        <label className="uu-label">{safeT(t, "postprod.tasks.form.autoRenderOutputDir", "Dossier de sortie")}</label>
        <div className="uu-muted mt-8" style={{ fontWeight: 600 }}>
          {String(renderOutputDir || "").trim() || safeT(t, "postprod.tasks.form.autoRenderOutputDir.missing", "Non configure")}
        </div>
      </div>
      <div className="uu-grid-field mt-12">
        <label className="uu-label">{safeT(t, "postprod.tasks.form.expectedRenderNameSingle", "Nom du rendu attendu")}</label>
        <div className="uu-muted mt-8" style={{ fontWeight: 600 }}>
          {autoExpectedRenderName || "-"}
        </div>
      </div>
      {formError ? (
        <div className="uu-msg error mt-12">{formError}</div>
      ) : null}
      <div className="uu-row uu-gap-4 mt-12">
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
