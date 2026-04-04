import { safeT, sortIndicator as sortArrowIndicator } from "../../../shared/helpers";

function TaskListTableView({
  t,
  displayedTasks = [],
  listSortKey = "updatedAt",
  listSortDir = "desc",
  toggleListSort = null,
  taskVisualStatus = null,
  taskExpectedRenderName = null,
  taskRenderWorkerLabel = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="uu-table" style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "30%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "4%" }} />
          <col style={{ width: "22%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              <button
                type="button"
                className="uu-link"
                onClick={() => toggleListSort?.("title")}
              >
                {safeT(t, "postprod.tasks.form.title", "Titre")}
                {sortArrowIndicator("title", listSortKey, listSortDir, true)}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button
                type="button"
                className="uu-link"
                onClick={() => toggleListSort?.("status")}
              >
                {safeT(t, "postprod.tasks.currentStatusShort", "Statut")}
                {sortArrowIndicator("status", listSortKey, listSortDir, true)}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button
                type="button"
                className="uu-link"
                onClick={() => toggleListSort?.("renderName")}
              >
                {safeT(t, "postprod.tasks.table.renderName", "Nom du rendu")}
                {sortArrowIndicator("renderName", listSortKey, listSortDir, true)}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button
                type="button"
                className="uu-link"
                onClick={() => toggleListSort?.("renderWorker")}
              >
                {safeT(t, "postprod.tasks.form.autoRenderWorker", "Station de rendu")}
                {sortArrowIndicator("renderWorker", listSortKey, listSortDir, true)}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              {safeT(t, "resources.detail.labels.favorite", "Favoris")}
            </th>
            <th style={{ textAlign: "left", paddingLeft: "8px" }}>
              {safeT(t, "postprod.tasks.table.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {displayedTasks.map((task) => (
            <TaskListTableRow
              key={`postprod-task-list-${Number(task?.id || 0)}`}
              t={t}
              task={task}
              taskVisualStatus={taskVisualStatus}
              taskExpectedRenderName={taskExpectedRenderName}
              taskRenderWorkerLabel={taskRenderWorkerLabel}
              isTaskFavorite={isTaskFavorite}
              toggleTaskFavorite={toggleTaskFavorite}
              renderTaskActions={renderTaskActions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TaskListTableRow({
  t,
  task = null,
  taskVisualStatus = null,
  taskExpectedRenderName = null,
  taskRenderWorkerLabel = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
}) {
  const visualStatus = typeof taskVisualStatus === "function"
    ? taskVisualStatus(task)
    : { className: "uu-chip muted", label: "-" };
  const favorite = typeof isTaskFavorite === "function" ? isTaskFavorite(task) : false;

  return (
    <tr>
      <td style={{ overflowWrap: "anywhere" }}>
        <div style={{ fontWeight: 600 }}>{String(task?.title || "")}</div>
      </td>
      <td>
        <span className={visualStatus.className}>{visualStatus.label}</span>
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {typeof taskExpectedRenderName === "function" ? taskExpectedRenderName(task) : "-"}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {typeof taskRenderWorkerLabel === "function" ? taskRenderWorkerLabel(task) : "-"}
      </td>
      <td>
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
      </td>
      <td style={{ paddingLeft: "8px", whiteSpace: "nowrap" }}>
        {typeof renderTaskActions === "function" ? renderTaskActions(task) : null}
      </td>
    </tr>
  );
}

export { TaskListTableView };
export default TaskListTableView;
