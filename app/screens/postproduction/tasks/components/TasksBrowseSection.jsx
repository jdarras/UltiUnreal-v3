import { TASK_STATUS_FLOW, taskAutoRenderStateLabel, taskStatusLabel } from "../helpers";
import { TaskListPanel } from "./TaskListPanel";
import { TasksAdvancedSearchPanel } from "./TasksAdvancedSearchPanel";
import { TasksToolbar } from "./TasksToolbar";

function TasksBrowseSection({
  t,
  showCreateForm = false,
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
  viewMode = "thumbs",
  onSetViewMode = null,
  searchExpanded = false,
  onCloseAdvancedSearch = null,
  displayedTasks = [],
  listStatusFilter = "all",
  onSetListStatusFilter = null,
  listRenderWorkerFilter = "all",
  onSetListRenderWorkerFilter = null,
  taskRenderWorkerFilterOptions = [],
  listProjectFilter = "all",
  onSetListProjectFilter = null,
  normalizedProjectOptions = [],
  listFormFilter = "all",
  onSetListFormFilter = null,
  taskFormFilterOptions = [],
  listRenderModeFilter = "all",
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
  isTaskFavorite = null,
  toggleTaskFavorite = null,
  renderTaskActions = null,
}) {
  return (
    <>
      <div className="uu-card">
        <TasksToolbar
          t={t}
          showCreateForm={showCreateForm}
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
          viewMode={viewMode}
          onSetViewMode={onSetViewMode}
        />
      </div>

      {!showCreateForm ? (
        <TasksAdvancedSearchPanel
          t={t}
          visible={searchExpanded}
          displayedCount={displayedTasks.length}
          tasksLoading={tasksLoading}
          listStatusFilter={listStatusFilter}
          onSetListStatusFilter={onSetListStatusFilter}
          taskStatusFlow={TASK_STATUS_FLOW}
          taskStatusLabel={taskStatusLabel}
          taskAutoRenderStateLabel={taskAutoRenderStateLabel}
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
          onClose={onClearFilters}
        />
      ) : null}

      {!showCreateForm ? (
        <div className="uu-card mt-12">
          <TaskListPanel
            t={t}
            displayedTasks={displayedTasks}
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
          />
        </div>
      ) : null}
    </>
  );
}

export { TasksBrowseSection };
