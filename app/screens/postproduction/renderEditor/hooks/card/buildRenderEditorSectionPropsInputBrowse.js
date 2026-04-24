import { pickKeys } from "../../../shared/objectProps";

const DATA_KEYS = [
  "showCreateForm",
  "isEditingTask",
  "editingTaskVisualStatusKey",
  "listSortKey",
  "listSortDir",
  "setListSortFromSelect",
  "searchQuery",
  "setSearchQuery",
  "hasActiveListFilters",
  "favoriteOnly",
  "showHistory",
  "setShowHistory",
  "viewMode",
  "setViewMode",
  "searchExpanded",
  "displayedTasks",
  "listStatusFilter",
  "setListStatusFilter",
  "listRenderWorkerFilter",
  "setListRenderWorkerFilter",
  "taskRenderWorkerFilterOptions",
  "listProjectFilter",
  "setListProjectFilter",
  "normalizedProjectOptions",
  "listFormFilter",
  "setListFormFilter",
  "taskFormFilterOptions",
  "listRenderModeFilter",
  "setListRenderModeFilter",
  "taskRenderModeFilterOptions",
  "toggleListSort",
  "taskVisualStatus",
  "taskExpectedRenderName",
  "taskRenderWorkerLabel",
  "taskProjectLabel",
  "taskLaunchModeLabel",
  "taskRenderFormLabel",
  "taskRenderModeName",
  "isTaskFavorite",
  "toggleTaskFavorite",
  "resolveTaskVisualStatusKey",
];

const LIFECYCLE_KEYS = [
  "openCreateTaskForm",
  "closeTaskForm",
];

const UI_KEYS = [
  "clearListFilters",
  "openAdvancedSearch",
  "toggleFavoriteOnly",
  "closeAdvancedSearch",
  "renderTaskActions",
];

export function buildRenderEditorSectionPropsInputBrowse({
  data = {},
  lifecycle = {},
  ui = {},
} = {}) {
  return {
    ...pickKeys(data, DATA_KEYS),
    ...pickKeys(lifecycle, LIFECYCLE_KEYS),
    ...pickKeys(ui, UI_KEYS),
  };
}

export default buildRenderEditorSectionPropsInputBrowse;
