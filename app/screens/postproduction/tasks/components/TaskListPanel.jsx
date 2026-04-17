import { safeT } from "../../shared/helpers";
import { TaskListTableView } from "./list/TaskListTableView";
import { TaskListThumbsView } from "./list/TaskListThumbsView";

function TaskListPanel({
  t,
  displayedTasks = [],
  viewMode = "thumbs",
  listSortKey = "updatedAt",
  listSortDir = "desc",
  toggleListSort = null,
  taskVisualStatus = null,
  taskExpectedRenderName = null,
  taskRenderWorkerLabel = null,
  taskProjectLabel = null,
  taskLaunchModeLabel = null,
  taskRenderFormLabel = null,
  taskRenderModeName = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
}) {
  if (!Array.isArray(displayedTasks) || displayedTasks.length <= 0) {
    return <div className="uu-muted">{safeT(t, "postprod.tasks.empty", "Aucune tache.")}</div>;
  }

  if (viewMode === "list") {
    return (
      <TaskListTableView
        t={t}
        displayedTasks={displayedTasks}
        listSortKey={listSortKey}
        listSortDir={listSortDir}
        toggleListSort={toggleListSort}
        taskVisualStatus={taskVisualStatus}
        taskExpectedRenderName={taskExpectedRenderName}
        taskRenderWorkerLabel={taskRenderWorkerLabel}
        taskProjectLabel={taskProjectLabel}
        isTaskFavorite={isTaskFavorite}
        toggleTaskFavorite={toggleTaskFavorite}
        renderTaskActions={renderTaskActions}
      />
    );
  }

  return (
    <TaskListThumbsView
      t={t}
      displayedTasks={displayedTasks}
      taskVisualStatus={taskVisualStatus}
      taskRenderWorkerLabel={taskRenderWorkerLabel}
      taskLaunchModeLabel={taskLaunchModeLabel}
      taskRenderFormLabel={taskRenderFormLabel}
      taskRenderModeName={taskRenderModeName}
      isTaskFavorite={isTaskFavorite}
      toggleTaskFavorite={toggleTaskFavorite}
      renderTaskActions={renderTaskActions}
    />
  );
}

export { TaskListPanel };
