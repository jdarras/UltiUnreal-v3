function buildPreferencesOutput({
  preferences = {},
  toolbar = {},
  list = {},
} = {}) {
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
    listSortKey: preferences.listSortKey,
    listSortDir: preferences.listSortDir,
    setListSortFromSelect: list.setListSortFromSelect,
  };
}

function buildReviewOutput({ review = {} } = {}) {
  return {
    canReviewRenders: review.canReviewRenders,
    busyRenderId: review.busyRenderId,
    applyReviewStatus: review.applyReviewStatus,
  };
}

function buildListOutput({ list = {} } = {}) {
  return {
    projectFilterOptions: list.projectFilterOptions,
    reviewFilterOptions: list.reviewFilterOptions,
    stationFilterOptions: list.stationFilterOptions,
    taskFilterOptions: list.taskFilterOptions,
    formFilterOptions: list.formFilterOptions,
    requesterFilterOptions: list.requesterFilterOptions,
    statusFilterOptions: list.statusFilterOptions,
    sequenceFilterOptions: list.sequenceFilterOptions,
    hasActiveFilters: list.hasActiveFilters,
    sortedDisplayedRenders: list.sortedDisplayedRenders,
    listSortIndicator: list.listSortIndicator,
    toggleListSort: list.toggleListSort,
  };
}

function buildDetailOutput({ detail = {} } = {}) {
  return {
    buildRenderThumbCandidates: detail.buildRenderThumbCandidates,
    openRenderOutputExternally: detail.openRenderOutputExternally,
    openRenderDetail: detail.openRenderDetail,
    closeRenderDetail: detail.closeRenderDetail,
    advancePreviewCandidate: detail.advancePreviewCandidate,
    detailRender: detail.detailRender,
    detailPreviewKind: detail.detailPreviewKind,
    detailPreviewSource: detail.detailPreviewSource,
    detailPreviewError: detail.detailPreviewError,
    detailPreviewCandidatesCount: detail.detailPreviewCandidatesCount,
    detailTransitions: detail.detailTransitions,
    detailTransitionsLoading: detail.detailTransitionsLoading,
    detailTransitionsError: detail.detailTransitionsError,
  };
}

function buildQueueOutput({ queue = {}, preferences = {} } = {}) {
  return {
    busyScheduledTaskId: queue.busyScheduledTaskId,
    queueBatchBusyMode: queue.queueBatchBusyMode,
    queueBatchFeedback: queue.queueBatchFeedback,
    queueBatchError: queue.queueBatchError,
    renderQueueTasks: queue.renderQueueTasks,
    filteredRenderQueueTasks: queue.filteredRenderQueueTasks,
    sortedRenderQueueTasks: queue.sortedRenderQueueTasks,
    selectedQueueEntrySet: queue.selectedQueueEntrySet,
    launchableQueueTaskIdSet: queue.launchableQueueTaskIdSet,
    selectedLaunchableQueueEntries: queue.selectedLaunchableQueueEntries,
    queueStateSummary: queue.queueStateSummary,
    queueSortKey: preferences.queueSortKey,
    queueSortDir: preferences.queueSortDir,
    queueSortIndicator: queue.queueSortIndicator,
    canLaunchRenders: queue.canLaunchRenders,
    queueEntryWorkerLabel: queue.queueEntryWorkerLabel,
    getQueueEntryLaunchMeta: queue.getQueueEntryLaunchMeta,
    toggleSelectAllQueueEntries: queue.toggleSelectAllQueueEntries,
    launchQueueBatch: queue.launchQueueBatch,
    toggleQueueSort: queue.toggleQueueSort,
    toggleQueueTaskSelection: queue.toggleQueueTaskSelection,
    launchScheduledTaskRender: queue.launchScheduledTaskRender,
  };
}

function buildToolbarOutput({ toolbar = {} } = {}) {
  return {
    clearFilters: toolbar.clearFilters,
    openAdvancedSearch: toolbar.openAdvancedSearch,
    closeAdvancedSearch: toolbar.closeAdvancedSearch,
  };
}

export {
  buildDetailOutput,
  buildListOutput,
  buildPreferencesOutput,
  buildQueueOutput,
  buildReviewOutput,
  buildToolbarOutput,
};
