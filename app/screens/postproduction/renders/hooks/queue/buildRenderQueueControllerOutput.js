function buildRenderQueueControllerOutput({
  derived = {},
  selection = {},
  sorting = {},
  launch = {},
} = {}) {
  return {
    selectedQueueTaskIds: selection.selectedQueueTaskIds,
    busyScheduledTaskId: launch.busyScheduledTaskId,
    queueBatchBusyMode: launch.queueBatchBusyMode,
    queueBatchFeedback: launch.queueBatchFeedback,
    queueBatchError: launch.queueBatchError,
    renderQueueTasks: derived.renderQueueTasks,
    filteredRenderQueueTasks: derived.filteredRenderQueueTasks,
    sortedRenderQueueTasks: derived.sortedRenderQueueTasks,
    selectedQueueEntrySet: selection.selectedQueueEntrySet,
    launchableQueueTaskIdSet: selection.launchableQueueTaskIdSet,
    selectedLaunchableQueueEntries: selection.selectedLaunchableQueueEntries,
    queueStateSummary: derived.queueStateSummary,
    queueSortIndicator: sorting.queueSortIndicator,
    canLaunchRenders: launch.canLaunchRenders,
    queueEntryWorkerLabel: derived.queueEntryWorkerLabel,
    getQueueEntryLaunchMeta: derived.getQueueEntryLaunchMeta,
    queueTaskPriorityLabel: derived.queueTaskPriorityLabel,
    toggleSelectAllQueueEntries: selection.toggleSelectAllQueueEntries,
    launchQueueBatch: launch.launchQueueBatch,
    toggleQueueSort: sorting.toggleQueueSort,
    toggleQueueTaskSelection: selection.toggleQueueTaskSelection,
    launchScheduledTaskRender: launch.launchScheduledTaskRender,
  };
}

export {
  buildRenderQueueControllerOutput,
};

export default buildRenderQueueControllerOutput;
