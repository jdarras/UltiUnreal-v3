import { buildProps } from "../../../shared/objectProps";

const DIRECT_KEYS = [
  "t",
  "showCreateForm",
  "isEditingTask",
  "editingTaskVisualStatusKey",
  "tasksLoading",
  "canCreateTasks",
  "listSortKey",
  "listSortDir",
  "searchQuery",
  "hasActiveListFilters",
  "favoriteOnly",
  "showHistory",
  "viewMode",
  "searchExpanded",
  "displayedTasks",
  "listStatusFilter",
  "listRenderWorkerFilter",
  "taskRenderWorkerFilterOptions",
  "listProjectFilter",
  "normalizedProjectOptions",
  "listFormFilter",
  "taskFormFilterOptions",
  "listRenderModeFilter",
  "taskRenderModeFilterOptions",
  "toggleListSort",
  "taskVisualStatus",
  "taskExpectedRenderName",
  "taskRenderWorkerLabel",
  "taskProjectLabel",
  "taskLaunchModeLabel",
  "taskRenderFormLabel",
  "taskRenderModeName",
  "resolveTaskVisualStatusKey",
  "isTaskFavorite",
  "renderTaskActions",
];

const ALIASES = {
  onOpenCreateForm: "openCreateTaskForm",
  onCloseForm: "closeTaskForm",
  onSetListSortFromSelect: "setListSortFromSelect",
  onSetSearchQuery: "setSearchQuery",
  onClearFilters: "clearListFilters",
  onOpenAdvancedSearch: "openAdvancedSearch",
  onToggleFavoriteOnly: "toggleFavoriteOnly",
  onSetShowHistory: "setShowHistory",
  onSetViewMode: "setViewMode",
  onCloseAdvancedSearch: "closeAdvancedSearch",
  onSetListStatusFilter: "setListStatusFilter",
  onSetListRenderWorkerFilter: "setListRenderWorkerFilter",
  onSetListProjectFilter: "setListProjectFilter",
  onSetListFormFilter: "setListFormFilter",
  onSetListRenderModeFilter: "setListRenderModeFilter",
  toggleTaskFavorite: "toggleTaskFavorite",
};

function buildRenderEditorBrowseSectionProps(input = {}) {
  return buildProps(input, {
    keys: DIRECT_KEYS,
    aliases: ALIASES,
  });
}

export {
  buildRenderEditorBrowseSectionProps,
};
