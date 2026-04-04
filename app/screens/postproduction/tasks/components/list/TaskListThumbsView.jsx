import { formatDate, safeT } from "../../../shared/helpers";

function TaskListThumbsView({
  t,
  displayedTasks = [],
  taskVisualStatus = null,
  taskRenderWorkerLabel = null,
  taskLaunchModeLabel = null,
  taskRenderFormLabel = null,
  taskRenderModeName = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: "12px",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      }}
    >
      {displayedTasks.map((task) => (
        <TaskThumbCard
          key={`postprod-task-card-${Number(task?.id || 0)}`}
          t={t}
          task={task}
          taskVisualStatus={taskVisualStatus}
          taskRenderWorkerLabel={taskRenderWorkerLabel}
          taskLaunchModeLabel={taskLaunchModeLabel}
          taskRenderFormLabel={taskRenderFormLabel}
          taskRenderModeName={taskRenderModeName}
          isTaskFavorite={isTaskFavorite}
          toggleTaskFavorite={toggleTaskFavorite}
          renderTaskActions={renderTaskActions}
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
  taskLaunchModeLabel = null,
  taskRenderFormLabel = null,
  taskRenderModeName = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
}) {
  const visualStatus = typeof taskVisualStatus === "function"
    ? taskVisualStatus(task)
    : { className: "uu-chip muted", label: "-" };
  const favorite = typeof isTaskFavorite === "function" ? isTaskFavorite(task) : false;

  return (
    <div className="uu-card">
      <div className="uu-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>{String(task?.title || "")}</div>
        <div className="uu-row uu-gap-6 uu-align-center">
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
      </div>

      <div className="uu-muted mt-8">
        {safeT(t, "postprod.tasks.form.autoRenderWorker", "Station de rendu")}:{" "}
        <span style={{ color: "#fff" }}>
          {typeof taskRenderWorkerLabel === "function" ? taskRenderWorkerLabel(task) : "-"}
        </span>
      </div>
      <div className="uu-muted mt-8">
        {safeT(t, "postprod.tasks.form.autoRenderLaunchMode", "Mode de lancement")}:{" "}
        <span style={{ color: "#fff" }}>
          {typeof taskLaunchModeLabel === "function" ? taskLaunchModeLabel(task) : "-"}
        </span>
      </div>
      <div className="uu-muted mt-8">
        {safeT(t, "postprod.tasks.form.autoRenderForm", "Formulaire")}:{" "}
        <span style={{ color: "#fff" }}>
          {typeof taskRenderFormLabel === "function" ? taskRenderFormLabel(task) : "-"}
        </span>
      </div>
      <div className="uu-muted mt-8">
        {safeT(t, "postprod.tasks.form.renderMode", "Mode de rendu")}:{" "}
        <span style={{ color: "#fff" }}>
          {typeof taskRenderModeName === "function" ? String(taskRenderModeName(task) || "-") : "-"}
        </span>
      </div>
      <div className="uu-muted mt-8">
        {safeT(t, "common.updatedAt", "Maj")}:{" "}
        <span style={{ color: "#fff" }}>{formatDate(task?.updatedAt || task?.createdAt)}</span>
      </div>

      {typeof renderTaskActions === "function" ? renderTaskActions(task) : null}
    </div>
  );
}

export { TaskListThumbsView };
export default TaskListThumbsView;
