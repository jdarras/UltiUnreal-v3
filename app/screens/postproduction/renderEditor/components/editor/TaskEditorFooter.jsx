import MultiSelectDropdown from "../../../../../components/MultiSelectDropdown";
import { safeT } from "../../../shared/helpers";

const DESTINATION_DROPDOWN_STYLE = { flex: "none", minWidth: 0, width: "100%" };
const TASK_EDITOR_FOOTER_TITLE_STYLE = { margin: "0 0 8px 0" };
const TASK_EDITOR_FOOTER_LABEL_STYLE = { width: 160, flex: "0 0 160px" };
const TASK_EDITOR_FOOTER_VALUE_STYLE = { fontWeight: 600 };
const TASK_EDITOR_FOOTER_PATH_SUFFIX_STYLE = { opacity: 0.5 };
const TASK_EDITOR_DEST_ROW_STYLE = { alignItems: "center" };
const TASK_EDITOR_DEST_LABEL_STYLE = { width: 160, marginBottom: 0 };
const TASK_EDITOR_DEST_INPUT_WRAP_STYLE = { flex: 1, minWidth: 0 };

function normalizeExportDestinationOptions(options = []) {
  const source = Array.isArray(options) ? options : [];
  const out = [];
  const seen = new Set();
  for (const entry of source) {
    const rawValue = entry?.value ?? entry?.id ?? "";
    const value = String(rawValue || "").trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const label = String(entry?.label || entry?.name || rawValue || "").trim();
    out.push({
      value,
      label: label || value,
    });
  }
  return out;
}

function normalizeExportDestinationValues(values = []) {
  const source = Array.isArray(values) ? values : [values];
  const out = [];
  const seen = new Set();
  for (const rawValue of source) {
    const value = String(rawValue || "").trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function TaskEditorFooter({
  t,
  isEditingTask = false,
  editingTaskId = 0,
  taskTitle = "",
  canDeleteTasks = false,
  renderOutputDir = "",
  autoRenderProjectRef = "",
  reservedRenderId = 0,
  autoExpectedRenderName = "",
  autoOutputType = null,
  formError = "",
  submitDisabled = false,
  submitLabel = "",
  tasksLoading = false,
  exportDestinationOptions = [],
  selectedExportDestinationIds = [],
  onChangeExportDestinationIds = null,
  onSubmit = null,
  onRequestDeleteTask = null,
  onCancel = null,
}) {
  const baseDir = String(renderOutputDir || "").trim();
  const projectRef = String(autoRenderProjectRef || "").trim();
  const reservedIdNum = Number(reservedRenderId || 0);
  const hasReservedId = Number.isFinite(reservedIdNum) && reservedIdNum > 0;
  const normalizedDestinationOptions = normalizeExportDestinationOptions(exportDestinationOptions);
  const normalizedDestinationValues = normalizeExportDestinationValues(selectedExportDestinationIds);
  const effectiveSubmitLabel = String(submitLabel || "").trim()
    || safeT(t, "postprod.tasks.form.submit.createRender", "Créer le rendu");
  const canDeleteTask = (
    isEditingTask
    && canDeleteTasks === true
    && typeof onRequestDeleteTask === "function"
    && Number.isFinite(Number(editingTaskId || 0))
    && Number(editingTaskId || 0) > 0
  );

  let outputTypeLabel = null;
  if (autoOutputType === "clip") {
    outputTypeLabel = safeT(t, "postprod.tasks.form.outputType.clip", "Clip vidéo");
  } else if (autoOutputType === "image_sequence") {
    outputTypeLabel = safeT(t, "postprod.tasks.form.outputType.imageSequence", "Suite d'images");
  }

  return (
    <>
      <div className="uu-card mt-12">
        <h4 className="uu-h3 uu-block-title" style={TASK_EDITOR_FOOTER_TITLE_STYLE}>
          {safeT(t, "postprod.tasks.form.output.title", "Output")}
        </h4>
        <div className="uu-grid-2">
          <div className="uu-row uu-row-nowrap">
            <label className="uu-label" style={TASK_EDITOR_FOOTER_LABEL_STYLE}>
              {safeT(t, "postprod.tasks.form.autoRenderOutputDir", "Dossier de sortie")}
            </label>
            <div className="uu-value" style={TASK_EDITOR_FOOTER_VALUE_STYLE}>
              {baseDir ? (
                <>
                  <span className="uu-muted">{baseDir}</span>
                  {projectRef ? (
                    <span className="uu-muted" style={TASK_EDITOR_FOOTER_PATH_SUFFIX_STYLE}>
                      {`\\${hasReservedId ? Math.trunc(reservedIdNum) : "{id}"}_${projectRef}`}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="uu-muted">{safeT(t, "postprod.tasks.form.autoRenderOutputDir.missing", "Non configure")}</span>
              )}
            </div>
          </div>
          <div className="uu-row uu-row-nowrap">
            <label className="uu-label" style={TASK_EDITOR_FOOTER_LABEL_STYLE}>
              {safeT(t, "postprod.tasks.form.expectedRenderNameSingle", "Nom du rendu attendu")}
            </label>
            <div className="uu-muted uu-value" style={TASK_EDITOR_FOOTER_VALUE_STYLE}>
              {autoExpectedRenderName || "-"}
            </div>
          </div>
          {outputTypeLabel ? (
            <div className="uu-row uu-row-nowrap">
              <label className="uu-label" style={TASK_EDITOR_FOOTER_LABEL_STYLE}>
                {safeT(t, "postprod.tasks.form.outputType.label", "Type de média")}
              </label>
              <div className="uu-muted uu-value" style={TASK_EDITOR_FOOTER_VALUE_STYLE}>
                {outputTypeLabel}
              </div>
            </div>
          ) : null}
        </div>
        <div className="uu-grid-2 mt-12">
          <div className="uu-grid-field">
            <div className="uu-row uu-gap-8" style={TASK_EDITOR_DEST_ROW_STYLE}>
              <label className="uu-label" style={TASK_EDITOR_DEST_LABEL_STYLE}>
                {safeT(t, "postprod.tasks.form.exportDestinations", "Destination")}
              </label>
              <div style={TASK_EDITOR_DEST_INPUT_WRAP_STYLE}>
                <MultiSelectDropdown
                  options={normalizedDestinationOptions}
                  values={normalizedDestinationValues}
                  onChange={(nextValues) => {
                    if (tasksLoading) return;
                    onChangeExportDestinationIds?.(normalizeExportDestinationValues(nextValues));
                  }}
                  placeholder={safeT(
                    t,
                    "postprod.tasks.form.exportDestinations.placeholder",
                    "Sélectionner une ou plusieurs destinations"
                  )}
                  noneLabel={safeT(t, "postprod.tasks.form.exportDestinations.none", "Aucune destination")}
                  style={DESTINATION_DROPDOWN_STYLE}
                />
              </div>
            </div>
            {normalizedDestinationOptions.length <= 0 ? (
              <div className="uu-muted mt-8">
                {safeT(
                  t,
                  "postprod.tasks.form.exportDestinations.empty",
                  "Aucune destination configurée. Configurez-les dans la page Configuration."
                )}
              </div>
            ) : null}
          </div>
          <div />
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
          {effectiveSubmitLabel}
        </button>
        {canDeleteTask ? (
          <button
            className="uu-btn-ghost"
            type="button"
            disabled={tasksLoading}
            onClick={() => {
              const taskIdRaw = Number(editingTaskId || 0);
              const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
              if (taskId <= 0) return;
              onRequestDeleteTask?.({
                id: taskId,
                title: String(taskTitle || "").trim(),
              });
            }}
          >
            {safeT(t, "postprod.tasks.action.delete", "Supprimer")}
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
