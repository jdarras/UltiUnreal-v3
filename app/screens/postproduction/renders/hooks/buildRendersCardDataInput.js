function buildRendersCardControllersInput({
  t,
  user = null,
  renders = [],
  tasks = [],
  renderWorkers = [],
  onTransitionRender = null,
  onLoadRenderTransitions = null,
  onCreateRender = null,
  onDispatchRenders = null,
  preferences = {},
} = {}) {
  return {
    t,
    user,
    renders,
    tasks,
    renderWorkers,
    onTransitionRender,
    onLoadRenderTransitions,
    onCreateRender,
    onDispatchRenders,
    preferences,
  };
}

function buildRendersCardDataPreferences(preferences = {}) {
  return {
    searchQuery: preferences.searchQuery,
    setSearchQuery: preferences.setSearchQuery,
    reviewFilter: preferences.reviewFilter,
    setReviewFilter: preferences.setReviewFilter,
    projectFilter: preferences.projectFilter,
    setProjectFilter: preferences.setProjectFilter,
    stationFilter: preferences.stationFilter,
    setStationFilter: preferences.setStationFilter,
    taskFilter: preferences.taskFilter,
    setTaskFilter: preferences.setTaskFilter,
    formFilter: preferences.formFilter,
    setFormFilter: preferences.setFormFilter,
    requesterFilter: preferences.requesterFilter,
    setRequesterFilter: preferences.setRequesterFilter,
    statusFilter: preferences.statusFilter,
    setStatusFilter: preferences.setStatusFilter,
    sequenceFilter: preferences.sequenceFilter,
    setSequenceFilter: preferences.setSequenceFilter,
    searchExpanded: preferences.searchExpanded,
    viewMode: preferences.viewMode,
    setViewMode: preferences.setViewMode,
    showHistory: preferences.showHistory,
    setShowHistory: preferences.setShowHistory,
    listSortKey: preferences.listSortKey,
    listSortDir: preferences.listSortDir,
    queueSortKey: preferences.queueSortKey,
    queueSortDir: preferences.queueSortDir,
    queueRuntimeMode: preferences.queueRuntimeMode,
    setQueueRuntimeMode: preferences.setQueueRuntimeMode,
  };
}

export {
  buildRendersCardControllersInput,
  buildRendersCardDataPreferences,
};

export default buildRendersCardControllersInput;
