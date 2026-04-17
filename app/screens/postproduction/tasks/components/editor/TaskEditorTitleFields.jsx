import { safeT } from "../../../shared/helpers";

function TaskEditorTitleFields({
  t,
  isEditingTask = false,
  editingTaskId = 0,
  tasksLoading = false,
  title = "",
  description = "",
  onTitleChange = null,
  onDescriptionChange = null,
}) {
  const taskIdNum = Number(editingTaskId || 0);
  return (
    <>
      <h4 className="uu-h3 uu-block-title" style={{ marginBottom: "10px" }}>
        {isEditingTask
          ? safeT(t, "postprod.tasks.editTitle", "Modifier tache")
          : safeT(t, "postprod.tasks.createTitle", "Nouvelle tache")}
      </h4>
      <div className="uu-grid-field mt-12">
        <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
          <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
            {safeT(t, "postprod.tasks.form.name", "Nom")}
          </label>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              className="uu-input"
              type="text"
              value={title}
              disabled={tasksLoading}
              onChange={(e) => onTitleChange?.(e.target.value)}
            />
          </div>
          {isEditingTask && taskIdNum > 0 ? (
            <span className="uu-muted" style={{ whiteSpace: "nowrap", fontSize: "0.85em" }}>
              #{taskIdNum}
            </span>
          ) : null}
        </div>
      </div>
      <div className="uu-grid-field mt-12">
        <label className="uu-label">{safeT(t, "postprod.tasks.form.description", "Description")}</label>
        <textarea
          className="uu-input"
          value={description}
          disabled={tasksLoading}
          onChange={(e) => onDescriptionChange?.(e.target.value)}
          rows={4}
        />
      </div>
    </>
  );
}

export { TaskEditorTitleFields };

