import { safeT } from "../../../shared/helpers";

function TaskEditorTitleFields({
  t,
  isEditingTask = false,
  editingTaskId = 0,
  tasksLoading = false,
  title = "",
  description = "",
  assigneeUserId = null,
  assigneeOptions = [],
  assigneeUserIdLocked = false,
  onTitleChange = null,
  onDescriptionChange = null,
  onChangeAssigneeUserId = null,
}) {
  const taskIdNum = Number(editingTaskId || 0);
  const selectedAssigneeValue = (() => {
    const parsed = Number(assigneeUserId || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return "";
    return String(Math.trunc(parsed));
  })();
  return (
    <>
      <h4 className="uu-h3 uu-block-title" style={{ marginBottom: "10px" }}>
        {isEditingTask
          ? safeT(t, "postprod.tasks.editTitle", "Modifier tache")
          : safeT(t, "postprod.tasks.createTitle", "Nouvelle tache")}
      </h4>
      <div className="uu-grid-2 mt-12">
        <div className="uu-grid-field">
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
        <div className="uu-grid-field">
          <div className="uu-row uu-gap-8" style={{ alignItems: "center" }}>
            <label className="uu-label" style={{ width: "140px", marginBottom: 0 }}>
              {safeT(t, "postprod.tasks.form.assignee", "Assigné à")}
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <select
                className="uu-input"
                value={selectedAssigneeValue}
                disabled={tasksLoading || assigneeUserIdLocked}
                onChange={(e) => onChangeAssigneeUserId?.(e.target.value)}
              >
                <option value="">{safeT(t, "postprod.tasks.form.assignee.none", "Non assigné")}</option>
                {(Array.isArray(assigneeOptions) ? assigneeOptions : []).map((option) => {
                  const optionId = Number(option?.id || 0);
                  if (!Number.isFinite(optionId) || optionId <= 0) return null;
                  const value = String(Math.trunc(optionId));
                  const displayName = String(option?.displayName || "").trim();
                  const username = String(option?.username || "").trim();
                  const label = String(option?.label || displayName || username || value).trim();
                  return (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  );
                })}
              </select>
              {assigneeUserIdLocked ? (
                <div className="uu-muted mt-4" style={{ fontSize: "0.85em" }}>
                  {safeT(
                    t,
                    "postprod.tasks.form.assignee.selfOnlyHint",
                    "Assignation verrouillée sur votre utilisateur."
                  )}
                </div>
              ) : null}
            </div>
          </div>
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
