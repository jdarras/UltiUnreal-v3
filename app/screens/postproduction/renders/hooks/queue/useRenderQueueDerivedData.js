import { useCallback, useMemo } from "react";
import { buildTaskAutoRenderStateByTaskId } from "../../../tasks/helpers";
import { buildRenderQueueTasks } from "./buildRenderQueueTasks";
import { filterRenderQueueTasks } from "./filterRenderQueueTasks";
import { sortRenderQueueTasks } from "./sortRenderQueueTasks";
import { summarizeQueueStates } from "./summarizeQueueStates";
import {
  buildQueueWorkerLabelByKey,
  getQueueEntryLaunchMeta as deriveQueueEntryLaunchMeta,
  queueEntryWorkerLabel as deriveQueueEntryWorkerLabel,
  queueTaskPriorityLabel as deriveQueueTaskPriorityLabel,
  queueTaskPriorityValue,
} from "./queueDerivedDataHelpers";

export function useRenderQueueDerivedData({
  t,
  tasks = [],
  renders = [],
  renderWorkers = [],
  searchQuery = "",
  queueSortKey = "status",
  queueSortDir = "asc",
} = {}) {
  const autoRenderStateByTaskId = useMemo(
    () => buildTaskAutoRenderStateByTaskId(renders),
    [renders]
  );

  const queueWorkerLabelByKey = useMemo(() => {
    return buildQueueWorkerLabelByKey(renderWorkers);
  }, [renderWorkers]);

  const renderQueueTasks = useMemo(() => {
    return buildRenderQueueTasks({
      tasks,
      autoRenderStateByTaskId,
    });
  }, [autoRenderStateByTaskId, tasks]);

  const getQueueEntryLaunchMeta = useCallback((queueEntry) => {
    return deriveQueueEntryLaunchMeta(queueEntry);
  }, []);

  const queueTaskPriorityLabel = useCallback((priorityRaw) => {
    return deriveQueueTaskPriorityLabel(priorityRaw, t);
  }, [t]);

  const queueEntryWorkerLabel = useCallback((queueEntry) => {
    return deriveQueueEntryWorkerLabel(queueEntry, queueWorkerLabelByKey, t);
  }, [queueWorkerLabelByKey, t]);

  const filteredRenderQueueTasks = useMemo(() => {
    return filterRenderQueueTasks({
      searchQuery,
      renderQueueTasks,
      queueWorkerLabelByKey,
    });
  }, [searchQuery, renderQueueTasks, queueWorkerLabelByKey]);

  const sortedRenderQueueTasks = useMemo(() => {
    return sortRenderQueueTasks({
      filteredRenderQueueTasks,
      queueSortDir,
      queueSortKey,
      queueEntryWorkerLabel,
      queueTaskPriorityValue,
    });
  }, [filteredRenderQueueTasks, queueSortDir, queueSortKey, queueEntryWorkerLabel, queueTaskPriorityValue]);

  const queueStateSummary = useMemo(() => {
    return summarizeQueueStates({
      renderQueueTasks,
      getQueueEntryLaunchMeta,
    });
  }, [renderQueueTasks, getQueueEntryLaunchMeta]);

  return {
    renderQueueTasks,
    filteredRenderQueueTasks,
    sortedRenderQueueTasks,
    queueStateSummary,
    queueEntryWorkerLabel,
    getQueueEntryLaunchMeta,
    queueTaskPriorityLabel,
  };
}

export default useRenderQueueDerivedData;
