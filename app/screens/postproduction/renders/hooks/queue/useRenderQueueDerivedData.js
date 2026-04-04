import { useCallback, useMemo } from "react";
import { safeT } from "../../../shared/helpers";
import { resolveAutoRenderTargetWorkerKey } from "../../../shared/autoRenderHelpers";
import { buildTaskAutoRenderStateByTaskId } from "../../../tasks/helpers";
import { buildRenderQueueTasks } from "./buildRenderQueueTasks";
import { filterRenderQueueTasks } from "./filterRenderQueueTasks";
import { sortRenderQueueTasks } from "./sortRenderQueueTasks";
import { summarizeQueueStates } from "./summarizeQueueStates";

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
    const out = new Map();
    const list = Array.isArray(renderWorkers) ? renderWorkers : [];
    for (const worker of list) {
      const workerKey = String(worker?.workerKey || "").trim();
      if (!workerKey) continue;
      const displayName = String(worker?.displayName || "").trim();
      out.set(workerKey, displayName || workerKey);
    }
    return out;
  }, [renderWorkers]);

  const renderQueueTasks = useMemo(() => {
    return buildRenderQueueTasks({
      tasks,
      autoRenderStateByTaskId,
    });
  }, [autoRenderStateByTaskId, tasks]);

  const getQueueEntryLaunchMeta = useCallback((queueEntry) => {
    const renderState = String(queueEntry?.renderState || "waiting").trim().toLowerCase();
    const linkedRenderIdRaw = Number(queueEntry?.linkedRender?.id || 0);
    const linkedRenderId = Number.isFinite(linkedRenderIdRaw) && linkedRenderIdRaw > 0
      ? Math.trunc(linkedRenderIdRaw)
      : 0;
    const canLaunchFromQueue = renderState !== "running";
    return {
      renderState,
      linkedRenderId,
      canLaunchFromQueue,
      isWaitingLaunchable: canLaunchFromQueue && renderState === "waiting",
      isErrorLaunchable: canLaunchFromQueue && renderState === "error",
    };
  }, []);

  const queueTaskPriorityValue = useCallback((task) => {
    const raw = Number(task?.priority || 0);
    if (!Number.isFinite(raw)) return 3;
    const normalized = Math.trunc(raw);
    if (normalized < 1 || normalized > 4) return 3;
    return normalized;
  }, []);

  const queueTaskPriorityLabel = useCallback((priorityRaw) => {
    const priority = queueTaskPriorityValue({ priority: priorityRaw });
    if (priority === 1) return safeT(t, "postprod.renders.queue.priority.p1", "Urgente");
    if (priority === 2) return safeT(t, "postprod.renders.queue.priority.p2", "Haute");
    if (priority === 4) return safeT(t, "postprod.renders.queue.priority.p4", "Basse");
    return safeT(t, "postprod.renders.queue.priority.p3", "Normale");
  }, [queueTaskPriorityValue, t]);

  const queueEntryWorkerLabel = useCallback((queueEntry) => {
    const workerName = String(queueEntry?.workerName || "").trim();
    const workerKey = String(queueEntry?.workerKey || "").trim();
    if (workerName && workerKey && workerName !== workerKey) {
      return `${workerName} (${workerKey})`;
    }
    if (workerName) return workerName;
    if (workerKey) return workerKey;
    const fallbackTargetWorker = resolveAutoRenderTargetWorkerKey(queueEntry?.task);
    if (fallbackTargetWorker) {
      return String(queueWorkerLabelByKey.get(fallbackTargetWorker) || fallbackTargetWorker).trim();
    }
    return safeT(t, "postprod.renders.queue.worker.pending", "Auto (dispatcher)");
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
