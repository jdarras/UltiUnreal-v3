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
  taskProjectLabel = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
  normalizedProjectOptions = [],
  onNavigateToProject = null,
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="uu-table" style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "25%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "22%" }} />
          <col style={{ width: "22%" }} />
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
              taskProjectLabel={taskProjectLabel}
              isTaskFavorite={isTaskFavorite}
              toggleTaskFavorite={toggleTaskFavorite}
              renderTaskActions={renderTaskActions}
              normalizedProjectOptions={normalizedProjectOptions}
              onNavigateToProject={onNavigateToProject}
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
  taskProjectLabel = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
  normalizedProjectOptions = [],
  onNavigateToProject = null,
}) {
  const visualStatus = typeof taskVisualStatus === "function"
    ? taskVisualStatus(task)
    : { className: "uu-chip muted", label: "-" };
  const favorite = typeof isTaskFavorite === "function" ? isTaskFavorite(task) : false;

  const id = Number(task?.id || 0);

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

  return (
    <tr>
      <td style={{ overflowWrap: "anywhere" }}>
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: "6px" }}>
          <span style={{ fontWeight: 600 }}>{String(task?.title || "")}</span>
          {id > 0 && <span style={{ opacity: 0.4, fontWeight: 600, flexShrink: 0 }}>#{String(id).padStart(4, "0")}</span>}
        </div>
      </td>
      <td>
        <span className={visualStatus.className}>{visualStatus.label}</span>
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {projectLabel ? (
          <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: "6px" }}>
            <span
              onClick={typeof onNavigateToProject === "function" ? () => onNavigateToProject(projectRef) : undefined}
              style={typeof onNavigateToProject === "function" ? { cursor: "pointer" } : undefined}
            >
              {projectLabel}
            </span>
            {projectId > 0 && <span style={{ opacity: 0.4, flexShrink: 0 }}>#{String(projectId).padStart(4, "0")}</span>}
          </div>
        ) : (
          typeof taskProjectLabel === "function" ? taskProjectLabel(task) : getTaskProjectName(task)
        )}
      </td>
      <td style={{ overflowWrap: "anywhere" }}>
        {getTaskSequenceName(task)}
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
