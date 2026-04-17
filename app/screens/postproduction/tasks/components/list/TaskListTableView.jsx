import { safeT, sortIndicator as sortArrowIndicator } from "../../../shared/helpers";

function simplifySequenceName(raw) {
  const s = String(raw || "").trim();
  if (!s) return "-";
  const tail = s.split("/").filter(Boolean).pop() || s;
  return (tail.split(".")[0] || "").trim() || s;
}

function getTaskSequenceName(task) {
  const raw = String(
    task?.autoRenderConfig?.sequenceName
    || task?.autoRenderConfig?.payload?.sequenceName
    || ""
  ).trim();
  return simplifySequenceName(raw);
}

function getTaskProjectName(task) {
  const raw = String(
    task?.autoRenderConfig?.projectName
    || (Array.isArray(task?.projectRefs) ? task.projectRefs[0] : "")
    || ""
  ).trim();
  return raw || "-";
}

function TaskListTableView({
  t,
  displayedTasks = [],
  listSortKey = "updatedAt",
  listSortDir = "desc",
  toggleListSort = null,
  taskVisualStatus = null,
  taskRenderWorkerLabel = null,
  taskProjectLabel = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="uu-table" style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "18%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "17%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("title")}>
                {safeT(t, "postprod.tasks.form.title", "Titre")}
                {sortArrowIndicator("title", listSortKey, listSortDir, true)}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("status")}>
                {safeT(t, "postprod.tasks.currentStatusShort", "Statut")}
                {sortArrowIndicator("status", listSortKey, listSortDir, true)}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("projectName")}>
                {safeT(t, "postprod.data.project", "Projet")}
                {sortArrowIndicator("projectName", listSortKey, listSortDir, true)}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("sequenceName")}>
                {safeT(t, "postprod.data.forms.levelSequence", "LS")}
                {sortArrowIndicator("sequenceName", listSortKey, listSortDir, true)}
              </button>
            </th>
            <th style={{ textAlign: "left" }}>
              <button type="button" className="uu-link" onClick={() => toggleListSort?.("renderWorker")}>
                {safeT(t, "postprod.tasks.form.autoRenderWorker", "Station de rendu")}
                {sortArrowIndicator("renderWorker", listSortKey, listSortDir, true)}
              </button>
            </th>
            <th style={{ textAlign: "right" }}>
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
              taskRenderWorkerLabel={taskRenderWorkerLabel}
              taskProjectLabel={taskProjectLabel}
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
  taskRenderWorkerLabel = null,
  taskProjectLabel = null,
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
        {typeof taskProjectLabel === "function" ? taskProjectLabel(task) : getTaskProjectName(task)}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {getTaskSequenceName(task)}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {typeof taskRenderWorkerLabel === "function" ? taskRenderWorkerLabel(task) : "-"}
      </td>
      <td>
        <div className="uu-row" style={{ gap: "6px", justifyContent: "flex-end", flexWrap: "nowrap" }}>
          {typeof renderTaskActions === "function" ? renderTaskActions(task) : null}
          <button
            type="button"
            className={`uu-fav-btn ${favorite ? "active" : ""}`}
            onClick={() => toggleTaskFavorite?.(task)}
            aria-pressed={favorite ? "true" : "false"}
            title={favorite
              ? safeT(t, "postprod.tasks.favorite.remove", "Retirer des favoris")
              : safeT(t, "postprod.tasks.favorite.add", "Ajouter aux favoris")}
          >
            ★
          </button>
        </div>
      </td>
    </tr>
  );
}

export { TaskListTableView };
export default TaskListTableView;
