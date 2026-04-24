import { useCallback, useMemo } from "react";
import { buildTaskAutoRenderStateByTaskId } from "../../../renderEditor/helpers";
import { buildRenderQueueTasks } from "./buildRenderQueueTasks";
import { filterRenderQueueTasks } from "./filterRenderQueueTasks";
import { sortRenderQueueTasks } from "./sortRenderQueueTasks";
import { summarizeQueueStates } from "./summarizeQueueStates";
import {
  buildQueueWorkerLabelByKey,
  getQueueEntryLaunchMeta as deriveQueueEntryLaunchMeta,
  queueEntryWorkerLabel as deriveQueueEntryWorkerLabel,
} from "./queueDerivedDataHelpers";

export function useRenderQueueDerivedData({
  t,
  tasks = [],
  renders = [],
  renderWorkers = [],
  searchQuery = "",
  queueSortKey = "startAt",
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
    });
  }, [filteredRenderQueueTasks, queueSortDir, queueSortKey, queueEntryWorkerLabel]);

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
  };
}

export default useRenderQueueDerivedData;
