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
    searchExpanded: preferences.searchExpanded,
    favoriteOnly: preferences.favoriteOnly,
    toggleFavoriteOnly: toolbar.toggleFavoriteOnly,
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
    hasActiveFilters: list.hasActiveFilters,
    sortedDisplayedRenders: list.sortedDisplayedRenders,
    isRenderFavorite: list.isRenderFavorite,
    toggleRenderFavorite: list.toggleRenderFavorite,
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

function buildQueueOutput({ queue = {} } = {}) {
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
    queueSortIndicator: queue.queueSortIndicator,
    canLaunchRenders: queue.canLaunchRenders,
    queueEntryWorkerLabel: queue.queueEntryWorkerLabel,
    getQueueEntryLaunchMeta: queue.getQueueEntryLaunchMeta,
    queueTaskPriorityLabel: queue.queueTaskPriorityLabel,
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

