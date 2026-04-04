import { useRenderQueueDerivedData } from "./queue/useRenderQueueDerivedData";
import { useRenderQueueSelection } from "./queue/useRenderQueueSelection";
import { useRenderQueueSorting } from "./queue/useRenderQueueSorting";
import { useRenderQueueLaunch } from "./queue/useRenderQueueLaunch";

export function useRenderQueueController({
  t,
  tasks = [],
  renders = [],
  renderWorkers = [],
  searchQuery = "",
  queueSortKey = "status",
  queueSortDir = "asc",
  setQueueSortKey = null,
  setQueueSortDir = null,
  onCreateRender = null,
  onDispatchRenders = null,
}) {
  const {
    renderQueueTasks,
    filteredRenderQueueTasks,
    sortedRenderQueueTasks,
    queueStateSummary,
    queueEntryWorkerLabel,
    getQueueEntryLaunchMeta,
    queueTaskPriorityLabel,
  } = useRenderQueueDerivedData({
    t,
    tasks,
    renders,
    renderWorkers,
    searchQuery,
    queueSortKey,
    queueSortDir,
  });

  const {
    selectedQueueTaskIds,
    setSelectedQueueTaskIds,
    selectedQueueEntrySet,
    launchableQueueTaskIdSet,
    selectedLaunchableQueueEntries,
    toggleQueueTaskSelection,
    toggleSelectAllQueueEntries,
  } = useRenderQueueSelection({
    filteredRenderQueueTasks,
    getQueueEntryLaunchMeta,
  });

  const {
    queueSortIndicator,
    toggleQueueSort,
  } = useRenderQueueSorting({
    queueSortKey,
    queueSortDir,
    setQueueSortKey,
    setQueueSortDir,
  });

  const {
    busyScheduledTaskId,
    queueBatchBusyMode,
    queueBatchFeedback,
    queueBatchError,
    canLaunchRenders,
    launchScheduledTaskRender,
    launchQueueBatch,
  } = useRenderQueueLaunch({
    t,
    onCreateRender,
    onDispatchRenders,
    setSelectedQueueTaskIds,
  });

  return {
    selectedQueueTaskIds,
    busyScheduledTaskId,
    queueBatchBusyMode,
    queueBatchFeedback,
    queueBatchError,
    renderQueueTasks,
    filteredRenderQueueTasks,
    sortedRenderQueueTasks,
    selectedQueueEntrySet,
    launchableQueueTaskIdSet,
    selectedLaunchableQueueEntries,
    queueStateSummary,
    queueSortIndicator,
    canLaunchRenders,
    queueEntryWorkerLabel,
    getQueueEntryLaunchMeta,
    queueTaskPriorityLabel,
    toggleSelectAllQueueEntries,
    launchQueueBatch,
    toggleQueueSort,
    toggleQueueTaskSelection,
    launchScheduledTaskRender,
  };
}

export default useRenderQueueController;
