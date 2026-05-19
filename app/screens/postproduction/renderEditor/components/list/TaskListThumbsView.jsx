import { formatDate, safeT } from "../../../shared/helpers";

const TASK_LIST_THUMBS_GRID_STYLE = {
  display: "grid",
  gap: "12px",
  gridTemplateColumns: "repeat(4, 1fr)",
};
const TASK_THUMB_HEADER_ROW_STYLE = { justifyContent: "space-between", alignItems: "center" };
const TASK_THUMB_META_ROW_STYLE = { display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: "6px" };
const TASK_THUMB_TITLE_STYLE = { fontWeight: 600 };
const TASK_THUMB_ID_STYLE = { opacity: 0.4, fontWeight: 600, flexShrink: 0 };
const TASK_THUMB_SUB_ID_STYLE = { opacity: 0.4, flexShrink: 0 };
const TASK_THUMB_LINK_ID_STYLE = { marginLeft: "6px", opacity: 0.4 };
const TASK_THUMB_POINTER_STYLE = { cursor: "pointer" };
const TASK_THUMB_VALUE_STYLE = { color: "#fff" };

function getTaskSequenceName(task) {
  const raw = String(
    task?.autoRenderConfig?.sequenceName
    || task?.autoRenderConfig?.payload?.sequenceName
    || ""
  ).trim();
  if (!raw) return "-";
  const tail = raw.split("/").filter(Boolean).pop() || raw;
  return (tail.split(".")[0] || "").trim() || raw;
}

function TaskListThumbsView({
  t,
  displayedTasks = [],
  taskVisualStatus = null,
  taskRenderWorkerLabel = null,
  taskRenderFormLabel = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
  normalizedProjectOptions = [],
  onNavigateToProject = null,
  onEditRenderForm = null,
}) {
  return (
    <div style={TASK_LIST_THUMBS_GRID_STYLE}>
      {displayedTasks.map((task) => (
        <TaskThumbCard
          key={`postprod-task-card-${Number(task?.id || 0)}`}
          t={t}
          task={task}
          taskVisualStatus={taskVisualStatus}
          taskRenderWorkerLabel={taskRenderWorkerLabel}
          taskRenderFormLabel={taskRenderFormLabel}
          isTaskFavorite={isTaskFavorite}
          toggleTaskFavorite={toggleTaskFavorite}
          renderTaskActions={renderTaskActions}
          normalizedProjectOptions={normalizedProjectOptions}
          onNavigateToProject={onNavigateToProject}
          onEditRenderForm={onEditRenderForm}
        />
      ))}
    </div>
  );
}

function TaskThumbCard({
  t,
  task = null,
  taskVisualStatus = null,
  taskRenderWorkerLabel = null,
  taskRenderFormLabel = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
  normalizedProjectOptions = [],
  onNavigateToProject = null,
  onEditRenderForm = null,
}) {
  const visualStatus = typeof taskVisualStatus === "function"
    ? taskVisualStatus(task)
    : { className: "uu-chip muted", label: "-" };
  const favorite = typeof isTaskFavorite === "function" ? isTaskFavorite(task) : false;

  const projectRef = String(
    task?.autoRenderConfig?.projectName
    || (Array.isArray(task?.projectRefs) ? task.projectRefs[0] : "")
    || ""
  ).trim();
  const projectOption = projectRef
    ? normalizedProjectOptions.find((p) => String(p?.ref || "").trim().toLowerCase() === projectRef.toLowerCase())
    : null;
  const projectLabel = projectOption?.name || projectOption?.ref || projectRef || null;
  const projectId = Number(projectOption?.id || 0);

  const id = Number(task?.id || 0);
  const canNavigateToProject = typeof onNavigateToProject === "function";

  return (
    <div className="uu-card">
      <div className="uu-row" style={TASK_THUMB_HEADER_ROW_STYLE}>
        <span className={visualStatus.className}>{visualStatus.label}</span>
        <button
          type="button"
          className={`uu-fav-filter ${favorite ? "active" : ""}`}
          onClick={() => toggleTaskFavorite?.(task)}
          aria-pressed={favorite ? "true" : "false"}
          title={favorite
            ? safeT(t, "postprod.tasks.favorite.remove", "Retirer des favoris")
            : safeT(t, "postprod.tasks.favorite.add", "Ajouter aux favoris")}
        >
          ★
        </button>
      </div>
      <div className="mt-8" style={TASK_THUMB_META_ROW_STYLE}>
        <span style={TASK_THUMB_TITLE_STYLE}>{String(task?.title || "")}</span>
        {id > 0 && <span style={TASK_THUMB_ID_STYLE}>#{String(id).padStart(4, "0")}</span>}
      </div>

      {projectLabel && (
        <div className="mt-8" style={TASK_THUMB_META_ROW_STYLE}>
          <span className="uu-muted">{safeT(t, "postprod.data.project", "Projet")}:</span>
          <span
            onClick={canNavigateToProject ? () => onNavigateToProject(projectRef) : undefined}
            style={canNavigateToProject ? TASK_THUMB_POINTER_STYLE : undefined}
          >
            {projectLabel}
          </span>
          {projectId > 0 && <span style={TASK_THUMB_SUB_ID_STYLE}>#{String(projectId).padStart(4, "0")}</span>}
        </div>
      )}

      <div className="mt-8">
        <span className="uu-muted">{safeT(t, "postprod.tasks.form.autoRenderForm", "Formulaire")}:{" "}</span>
        {(() => {
          const raw = typeof taskRenderFormLabel === "function" ? taskRenderFormLabel(task) : "-";
          const match = raw.match(/^(.*?)\s*\(#(\d+)\)\s*$/);
          const name = match ? match[1].trim() : raw;
          const fid = match ? match[2] : null;
          return (
            <>
              <span
                onClick={typeof onEditRenderForm === "function" && fid ? () => onEditRenderForm({ id: parseInt(fid, 10) }) : undefined}
                style={typeof onEditRenderForm === "function" && fid ? TASK_THUMB_POINTER_STYLE : undefined}
              >
                {name}
              </span>
              {fid && <span style={TASK_THUMB_LINK_ID_STYLE}>#{fid}</span>}
            </>
          );
        })()}
      </div>
      <div className="mt-8">
        <span className="uu-muted">{safeT(t, "postprod.data.forms.levelSequence", "LS")}:{" "}</span>
        <span style={TASK_THUMB_VALUE_STYLE}>{getTaskSequenceName(task)}</span>
      </div>
      <div className="mt-8">
        <span className="uu-muted">{safeT(t, "postprod.tasks.form.autoRenderWorker.short", "Station")}:{" "}</span>
        <span style={TASK_THUMB_VALUE_STYLE}>
          {typeof taskRenderWorkerLabel === "function" ? taskRenderWorkerLabel(task) : "-"}
        </span>
      </div>
      <div className="mt-8">
        <span className="uu-muted">{safeT(t, "common.updatedAt", "Maj")}:{" "}</span>
        <span style={TASK_THUMB_VALUE_STYLE}>{formatDate(task?.updatedAt || task?.createdAt)}</span>
      </div>

      <div className="mt-12">
        {typeof renderTaskActions === "function" ? renderTaskActions(task) : null}
      </div>
    </div>
  );
}

export { TaskListThumbsView };
