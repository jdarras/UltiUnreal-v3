function buildTaskFilterOptionsInput({
  orderedTasks = [],
  normalizedRenderWorkers = [],
  renderForms = [],
  normalizedProjectOptions = [],
  listRenderWorkerFilter = "all",
  setListRenderWorkerFilter = null,
  listProjectFilter = "all",
  setListProjectFilter = null,
  listFormFilter = "all",
  setListFormFilter = null,
  listRenderModeFilter = "all",
  setListRenderModeFilter = null,
} = {}) {
  return {
    orderedTasks,
    normalizedRenderWorkers,
    renderForms,
    normalizedProjectOptions,
    listRenderWorkerFilter,
    setListRenderWorkerFilter,
    listProjectFilter,
    setListProjectFilter,
    listFormFilter,
    setListFormFilter,
    listRenderModeFilter,
    setListRenderModeFilter,
  };
}

function buildFilteredTasksInput({
  orderedTasks = [],
  favoriteOnly = false,
  isTaskFavorite = () => false,
  searchQuery = "",
  listStatusFilter = "all",
  listRenderWorkerFilter = "all",
  listProjectFilter = "all",
  listFormFilter = "all",
  listRenderModeFilter = "all",
  taskRenderStateByTaskId = new Map(),
  projectLabelsByRef = new Map(),
  resourceLabelsByRef = new Map(),
  renderFormLabelById = new Map(),
} = {}) {
  return {
    orderedTasks,
    favoriteOnly,
    isTaskFavorite,
    searchQuery,
    listStatusFilter,
    listRenderWorkerFilter,
    listProjectFilter,
    listFormFilter,
    listRenderModeFilter,
    taskRenderStateByTaskId,
    projectLabelsByRef,
    resourceLabelsByRef,
    renderFormLabelById,
  };
}

function buildTaskListSortingInput({
  filteredTasks = [],
  listSortKey = "updatedAt",
  listSortDir = "desc",
  setListSortKey = null,
  setListSortDir = null,
  taskRenderStateByTaskId = new Map(),
  resolveTaskAutoRenderState = null,
  taskExpectedRenderName = null,
  taskRenderWorkerLabel = null,
} = {}) {
  return {
    filteredTasks,
    listSortKey,
    listSortDir,
    setListSortKey,
    setListSortDir,
    taskRenderStateByTaskId,
    resolveTaskAutoRenderState,
    taskExpectedRenderName,
    taskRenderWorkerLabel,
  };
}

function buildTasksListControllerOutput({
  filters = {},
  listing = {},
  sorting = {},
  labels = {},
  favorites = {},
} = {}) {
  return {
    taskRenderWorkerFilterOptions: filters.taskRenderWorkerFilterOptions,
    taskFormFilterOptions: filters.taskFormFilterOptions,
    taskRenderModeFilterOptions: filters.taskRenderModeFilterOptions,
    displayedTasks: sorting.displayedTasks,
    hasActiveListFilters: listing.hasActiveListFilters,
    isTaskFavorite: favorites.isTaskFavorite,
    toggleTaskFavorite: favorites.toggleTaskFavorite,
    taskVisualStatus: labels.taskVisualStatus,
    taskExpectedRenderName: labels.taskExpectedRenderName,
    taskRenderWorkerLabel: labels.taskRenderWorkerLabel,
    taskLaunchModeLabel: labels.taskLaunchModeLabel,
    taskRenderFormLabel: labels.taskRenderFormLabel,
    taskRenderModeName: labels.taskRenderModeName,
    setListSortFromSelect: sorting.setListSortFromSelect,
    toggleListSort: sorting.toggleListSort,
  };
}

export {
  buildTaskFilterOptionsInput,
  buildFilteredTasksInput,
  buildTaskListSortingInput,
  buildTasksListControllerOutput,
};

export default buildTaskFilterOptionsInput;
