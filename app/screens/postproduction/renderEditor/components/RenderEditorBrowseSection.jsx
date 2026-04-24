import { useMemo } from "react";
import { safeT } from "../../shared/helpers";
import {
  normalizeTaskVisualStatusKey,
  TASK_VISUAL_STATUS_FLOW,
  taskVisualStatusLabel,
} from "../helpers";
import { TaskListPanel } from "./TaskListPanel";
import { RenderEditorAdvancedSearchPanel } from "./RenderEditorAdvancedSearchPanel";
import { RenderEditorToolbar } from "./RenderEditorToolbar";

function RenderEditorBrowseSection({
  t,
  showCreateForm = false,
  isEditingTask = false,
  editingTaskVisualStatusKey = "planned",
  tasksLoading = false,
  canCreateTasks = false,
  onOpenCreateForm = null,
  onCloseForm = null,
  listSortKey = "updatedAt",
  listSortDir = "desc",
  onSetListSortFromSelect = null,
  searchQuery = "",
  onSetSearchQuery = null,
  hasActiveListFilters = false,
  onClearFilters = null,
  onOpenAdvancedSearch = null,
  favoriteOnly = false,
  onToggleFavoriteOnly = null,
  showHistory = false,
  onSetShowHistory = null,
  viewMode = "thumbs",
  onSetViewMode = null,
  searchExpanded = false,
  onCloseAdvancedSearch = null,
  displayedTasks = [],
  listStatusFilter = [],
  onSetListStatusFilter = null,
  listRenderWorkerFilter = [],
  onSetListRenderWorkerFilter = null,
  taskRenderWorkerFilterOptions = [],
  listProjectFilter = [],
  onSetListProjectFilter = null,
  normalizedProjectOptions = [],
  listFormFilter = [],
  onSetListFormFilter = null,
  taskFormFilterOptions = [],
  listRenderModeFilter = [],
  onSetListRenderModeFilter = null,
  taskRenderModeFilterOptions = [],
  toggleListSort = null,
  taskVisualStatus = null,
  taskExpectedRenderName = null,
  taskRenderWorkerLabel = null,
  taskProjectLabel = null,
  taskLaunchModeLabel = null,
  taskRenderFormLabel = null,
  taskRenderModeName = null,
  resolveTaskVisualStatusKey = null,
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
  onNavigateToProject = null,
  onEditRenderForm = null,
}) {
  const { activeDisplayedTasks, historyDisplayedTasks } = useMemo(() => {
    const source = Array.isArray(displayedTasks) ? displayedTasks : [];
    const active = [];
    const history = [];
    for (const task of source) {
      const statusRaw = typeof resolveTaskVisualStatusKey === "function"
        ? resolveTaskVisualStatusKey(task)
        : task?.status;
      const visualStatus = normalizeTaskVisualStatusKey(statusRaw);
      if (visualStatus === "validated") {
        history.push(task);
      } else {
        active.push(task);
      }
    }
    return {
      activeDisplayedTasks: active,
      historyDisplayedTasks: history,
    };
  }, [displayedTasks, resolveTaskVisualStatusKey]);

  const advancedSearchDisplayedCount = showHistory
    ? activeDisplayedTasks.length + historyDisplayedTasks.length
    : activeDisplayedTasks.length;

  return (
    <>
      <div className="uu-card">
        <RenderEditorToolbar
          t={t}
          showCreateForm={showCreateForm}
          isEditingTask={isEditingTask}
          editingTaskVisualStatusKey={editingTaskVisualStatusKey}
          tasksLoading={tasksLoading}
          canCreateTasks={canCreateTasks}
          onOpenCreateForm={onOpenCreateForm}
          onCloseForm={onCloseForm}
          listSortKey={listSortKey}
          listSortDir={listSortDir}
          onSetListSortFromSelect={onSetListSortFromSelect}
          searchQuery={searchQuery}
          onSetSearchQuery={onSetSearchQuery}
          hasActiveListFilters={hasActiveListFilters}
          onClearFilters={onClearFilters}
          onOpenAdvancedSearch={onOpenAdvancedSearch}
          favoriteOnly={favoriteOnly}
          onToggleFavoriteOnly={onToggleFavoriteOnly}
          showHistory={showHistory}
          onSetShowHistory={onSetShowHistory}
          viewMode={viewMode}
          onSetViewMode={onSetViewMode}
        />
      </div>

      {!showCreateForm ? (
        <RenderEditorAdvancedSearchPanel
          t={t}
          visible={searchExpanded}
          displayedCount={advancedSearchDisplayedCount}
          tasksLoading={tasksLoading}
          listStatusFilter={listStatusFilter}
          onSetListStatusFilter={onSetListStatusFilter}
          taskStatusFlow={TASK_VISUAL_STATUS_FLOW}
          taskStatusLabel={taskVisualStatusLabel}
          listRenderWorkerFilter={listRenderWorkerFilter}
          onSetListRenderWorkerFilter={onSetListRenderWorkerFilter}
          taskRenderWorkerFilterOptions={taskRenderWorkerFilterOptions}
          listProjectFilter={listProjectFilter}
          onSetListProjectFilter={onSetListProjectFilter}
          normalizedProjectOptions={normalizedProjectOptions}
          listFormFilter={listFormFilter}
          onSetListFormFilter={onSetListFormFilter}
          taskFormFilterOptions={taskFormFilterOptions}
          listRenderModeFilter={listRenderModeFilter}
          onSetListRenderModeFilter={onSetListRenderModeFilter}
          taskRenderModeFilterOptions={taskRenderModeFilterOptions}
          onClose={onCloseAdvancedSearch}
        />
      ) : null}

      {!showCreateForm ? (
        <div className="uu-card mt-12">
          <TaskListPanel
            t={t}
            displayedTasks={activeDisplayedTasks}
            viewMode={viewMode}
            listSortKey={listSortKey}
            listSortDir={listSortDir}
            toggleListSort={toggleListSort}
            taskVisualStatus={taskVisualStatus}
            taskExpectedRenderName={taskExpectedRenderName}
            taskRenderWorkerLabel={taskRenderWorkerLabel}
            taskProjectLabel={taskProjectLabel}
            taskLaunchModeLabel={taskLaunchModeLabel}
            taskRenderFormLabel={taskRenderFormLabel}
            taskRenderModeName={taskRenderModeName}
            isTaskFavorite={isTaskFavorite}
            toggleTaskFavorite={toggleTaskFavorite}
            renderTaskActions={renderTaskActions}
            normalizedProjectOptions={normalizedProjectOptions}
            onNavigateToProject={onNavigateToProject}
            onEditRenderForm={onEditRenderForm}
            emptyLabel={safeT(t, "postprod.tasks.active.empty", "Aucune tache active.")}
          />
        </div>
      ) : null}

      {!showCreateForm && showHistory ? (
        <div className="uu-card mt-12">
          <h4 className="uu-h3 uu-block-title" style={{ marginBottom: "10px" }}>
            {safeT(t, "postprod.tasks.history.title", "Historique (taches validees)")}
          </h4>
          <TaskListPanel
            t={t}
            displayedTasks={historyDisplayedTasks}
            viewMode={viewMode}
            listSortKey={listSortKey}
            listSortDir={listSortDir}
            toggleListSort={toggleListSort}
            taskVisualStatus={taskVisualStatus}
            taskExpectedRenderName={taskExpectedRenderName}
            taskRenderWorkerLabel={taskRenderWorkerLabel}
            taskProjectLabel={taskProjectLabel}
            taskLaunchModeLabel={taskLaunchModeLabel}
            taskRenderFormLabel={taskRenderFormLabel}
            taskRenderModeName={taskRenderModeName}
            isTaskFavorite={isTaskFavorite}
            toggleTaskFavorite={toggleTaskFavorite}
            renderTaskActions={renderTaskActions}
            normalizedProjectOptions={normalizedProjectOptions}
            onNavigateToProject={onNavigateToProject}
            onEditRenderForm={onEditRenderForm}
            emptyLabel={safeT(t, "postprod.tasks.history.empty", "Aucune tache validee.")}
          />
        </div>
      ) : null}
    </>
  );
}

export { RenderEditorBrowseSection };
