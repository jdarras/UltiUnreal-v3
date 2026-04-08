import { buildProps } from "../../../shared/objectProps";

const DIRECT_KEYS = [
  "t",
  "showCreateForm",
  "tasksLoading",
  "canCreateTasks",
  "listSortKey",
  "listSortDir",
  "searchQuery",
  "hasActiveListFilters",
  "favoriteOnly",
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
  "taskLaunchModeLabel",
  "taskRenderFormLabel",
  "taskRenderModeName",
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
  onSetViewMode: "setViewMode",
  onCloseAdvancedSearch: "closeAdvancedSearch",
  onSetListStatusFilter: "setListStatusFilter",
  onSetListRenderWorkerFilter: "setListRenderWorkerFilter",
  onSetListProjectFilter: "setListProjectFilter",
  onSetListFormFilter: "setListFormFilter",
  onSetListRenderModeFilter: "setListRenderModeFilter",
  toggleTaskFavorite: "toggleTaskFavorite",
};

function buildTasksBrowseSectionProps(input = {}) {
  return buildProps(input, {
    keys: DIRECT_KEYS,
    aliases: ALIASES,
  });
}

export {
  buildTasksBrowseSectionProps,
};

export default buildTasksBrowseSectionProps;
