import { useCallback, useMemo, useState } from "react";
import { safeT } from "../../../shared/helpers";
import {
  buildScheduledTaskCreateRenderInput,
  removeLaunchedTaskIdsFromSelection,
  resolveLinkedQueuedRender,
} from "./queueLaunchHelpers";

export function useRenderQueueLaunch({
  t,
  onCreateRender = null,
  onDispatchRenders = null,
  setSelectedQueueTaskIds = null,
} = {}) {
  const [busyScheduledTaskId, setBusyScheduledTaskId] = useState(0);
  const [queueBatchBusyMode, setQueueBatchBusyMode] = useState("");
  const [queueBatchFeedback, setQueueBatchFeedback] = useState("");
  const [queueBatchError, setQueueBatchError] = useState("");

  const launchScheduledTaskRender = useCallback(async (task, queueEntry = null) => {
    const canDispatchRenders = typeof onDispatchRenders === "function";
    const canCreateRender = typeof onCreateRender === "function";
    if (!canDispatchRenders && !canCreateRender) return;
    const createRenderInput = buildScheduledTaskCreateRenderInput(task);
    const taskId = Number(createRenderInput?.taskId || 0);
    if (!Number.isFinite(taskId) || taskId <= 0) return;
    const { linkedRenderId, linkedRenderStatus } = resolveLinkedQueuedRender(queueEntry);
    if (linkedRenderId > 0 && linkedRenderStatus === "Queued" && canDispatchRenders) {
      setBusyScheduledTaskId(taskId);
      try {
        await Promise.resolve(onDispatchRenders({
          maxJobs: 1,
          renderIds: [linkedRenderId],
        }));
      } finally {
        setBusyScheduledTaskId(0);
      }
      return;
    }
    if (!canCreateRender || !createRenderInput?.createRenderInput) return;

    setBusyScheduledTaskId(taskId);
    try {
      await Promise.resolve(onCreateRender(createRenderInput.createRenderInput));
    } finally {
      setBusyScheduledTaskId(0);
    }
  }, [onCreateRender, onDispatchRenders]);

  const launchQueueBatch = useCallback(async (entriesOverride = null) => {
    if (queueBatchBusyMode) return;
    const queueEntries = Array.isArray(entriesOverride) ? entriesOverride : [];
    if (!Array.isArray(queueEntries) || queueEntries.length <= 0) return;
    setQueueBatchBusyMode("selection");
    setQueueBatchFeedback("");
    setQueueBatchError("");
    let launchedCount = 0;
    let failedCount = 0;
    const launchedTaskIds = new Set();
    for (const entry of queueEntries) {
      try {
        await launchScheduledTaskRender(entry?.task || null, entry);
        launchedCount += 1;
        const launchedTaskId = Number(entry?.task?.id || 0);
        if (Number.isFinite(launchedTaskId) && launchedTaskId > 0) {
          launchedTaskIds.add(Math.trunc(launchedTaskId));
        }
      } catch {
        failedCount += 1;
      }
    }
    if (launchedCount > 0 || failedCount > 0) {
      setQueueBatchFeedback(safeT(
        t,
        "postprod.renders.queue.batch.result",
        "Traitement file: {ok} lance(s), {failed} echec(s).",
        { ok: launchedCount, failed: failedCount }
      ));
    }
    if (failedCount > 0) {
      setQueueBatchError(safeT(
        t,
        "postprod.renders.queue.batch.error",
        "Certaines taches de la file n'ont pas pu etre lancees."
      ));
    }
    if (launchedTaskIds.size > 0 && typeof setSelectedQueueTaskIds === "function") {
      setSelectedQueueTaskIds((prev) => removeLaunchedTaskIdsFromSelection(prev, launchedTaskIds));
    }
    setQueueBatchBusyMode("");
  }, [launchScheduledTaskRender, queueBatchBusyMode, setSelectedQueueTaskIds, t]);

  const canLaunchRenders = useMemo(
    () => typeof onCreateRender === "function" || typeof onDispatchRenders === "function",
    [onCreateRender, onDispatchRenders]
  );

  return {
    busyScheduledTaskId,
    queueBatchBusyMode,
    queueBatchFeedback,
    queueBatchError,
    canLaunchRenders,
    launchScheduledTaskRender,
    launchQueueBatch,
  };
}

export default useRenderQueueLaunch;
