import { pickKeys } from "../../../shared/objectProps";

const FORM_STATE_KEYS = [
  "title",
  "setTitle",
  "description",
  "setDescription",
  "selectedResourceRefs",
  "setSelectedResourceRefs",
  "showCreateForm",
  "setShowCreateForm",
  "editingTaskId",
  "setEditingTaskId",
  "formError",
  "setFormError",
  "editAutosaveStateRef",
  "isEditingTask",
];

const BROWSE_PREFERENCE_KEYS = [
  "viewMode",
  "setViewMode",
  "listSortKey",
  "setListSortKey",
  "listSortDir",
  "setListSortDir",
  "searchQuery",
  "setSearchQuery",
  "searchExpanded",
  "setSearchExpanded",
  "favoriteOnly",
  "setFavoriteOnly",
  "listStatusFilter",
  "setListStatusFilter",
  "listRenderWorkerFilter",
  "setListRenderWorkerFilter",
  "listProjectFilter",
  "setListProjectFilter",
  "listFormFilter",
  "setListFormFilter",
  "listRenderModeFilter",
  "setListRenderModeFilter",
  "setListResourceFilter",
];

const CATALOG_KEYS = [
  "normalizedProjectOptions",
  "normalizedRenderTemplateOptions",
  "availableRenderWorkers",
];

const LIST_KEYS = [
  "taskRenderWorkerFilterOptions",
  "taskFormFilterOptions",
  "taskRenderModeFilterOptions",
  "displayedTasks",
  "hasActiveListFilters",
  "isTaskFavorite",
  "toggleTaskFavorite",
  "taskVisualStatus",
  "taskExpectedRenderName",
  "taskRenderWorkerLabel",
  "taskProjectLabel",
  "taskLaunchModeLabel",
  "taskRenderFormLabel",
  "taskRenderModeName",
  "setListSortFromSelect",
  "toggleListSort",
];

function buildTasksFormStateOutput(formState = {}) {
  return pickKeys(formState, FORM_STATE_KEYS);
}

function buildTasksBrowsePreferencesOutput(browsePreferences = {}) {
  return pickKeys(browsePreferences, BROWSE_PREFERENCE_KEYS);
}

function buildTasksCatalogOutput(catalog = {}) {
  return pickKeys(catalog, CATALOG_KEYS);
}

function buildTasksListOutput(list = {}) {
  return pickKeys(list, LIST_KEYS);
}

function buildTasksCardListDataOutput({
  formState = {},
  browsePreferences = {},
  catalog = {},
  list = {},
} = {}) {
  return {
    ...buildTasksFormStateOutput(formState),
    ...buildTasksBrowsePreferencesOutput(browsePreferences),
    ...buildTasksCatalogOutput(catalog),
    ...buildTasksListOutput(list),
  };
}

export {
  buildTasksCardListDataOutput,
  buildTasksCatalogOutput,
  buildTasksFormStateOutput,
  buildTasksBrowsePreferencesOutput,
  buildTasksListOutput,
};

export default buildTasksCardListDataOutput;
