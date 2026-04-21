import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyLaunchedTaskSelectionCleanup,
  buildQueueBatchErrorMessage,
  buildQueueBatchResultMessage,
  canLaunchRenders as computeCanLaunchRenders,
  launchScheduledTaskRenderAction,
} from "./queueLaunchControllerHelpers";

export function useRenderQueueLaunch({
  t,
  onCreateRender = null,
  onDispatchRenders = null,
  setSelectedQueueTaskIds = null,
  canLaunchRendersForUser = false,
  queueRuntimeMode = "active",
  sortedRenderQueueTasks = [],
  getQueueEntryLaunchMeta = null,
} = {}) {
  const [busyScheduledTaskId, setBusyScheduledTaskId] = useState(0);
  const [queueBatchBusyMode, setQueueBatchBusyMode] = useState("");
  const [queueBatchFeedback, setQueueBatchFeedback] = useState("");
  const [queueBatchError, setQueueBatchError] = useState("");
  const autoDispatchKickAtRef = useRef(0);
  const autoDispatchBusyRef = useRef(false);

  const launchScheduledTaskRender = useCallback(async (task, queueEntry = null, launchOptions = null) => {
    if (!canLaunchRendersForUser) return false;
    await launchScheduledTaskRenderAction({
      task,
      queueEntry,
      launchOptions,
      onCreateRender,
      onDispatchRenders,
      setBusyScheduledTaskId,
    });
    return true;
  }, [canLaunchRendersForUser, onCreateRender, onDispatchRenders]);

  const launchQueueBatch = useCallback(async (entriesOverride = null) => {
    if (!canLaunchRendersForUser) return;
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

    setQueueBatchFeedback(buildQueueBatchResultMessage({ t, launchedCount, failedCount }));
    setQueueBatchError(buildQueueBatchErrorMessage({ t, failedCount }));
    applyLaunchedTaskSelectionCleanup({ launchedTaskIds, setSelectedQueueTaskIds });
    setQueueBatchBusyMode("");
  }, [canLaunchRendersForUser, launchScheduledTaskRender, queueBatchBusyMode, setSelectedQueueTaskIds, t]);

  const canLaunchRenders = useMemo(
    () => canLaunchRendersForUser && computeCanLaunchRenders(onCreateRender, onDispatchRenders),
    [canLaunchRendersForUser, onCreateRender, onDispatchRenders]
  );

  const queueRuntimeModeNormalized = String(queueRuntimeMode || "").trim().toLowerCase() === "paused"
    ? "paused"
    : "active";

  const firstAutoLaunchEntry = useMemo(() => {
    const entries = Array.isArray(sortedRenderQueueTasks) ? sortedRenderQueueTasks : [];
    for (const entry of entries) {
      const launchMeta = typeof getQueueEntryLaunchMeta === "function"
        ? getQueueEntryLaunchMeta(entry)
        : null;
      if (!launchMeta?.isWaitingLaunchable) continue;
      const taskIdRaw = Number(entry?.task?.id || 0);
      const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0
        ? Math.trunc(taskIdRaw)
        : 0;
      if (taskId <= 0) continue;
      return entry;
    }
    return null;
  }, [getQueueEntryLaunchMeta, sortedRenderQueueTasks]);

  useEffect(() => {
    if (!canLaunchRenders) return;
    if (queueRuntimeModeNormalized !== "active") return;
    if (!firstAutoLaunchEntry) return;
    if (busyScheduledTaskId > 0 || queueBatchBusyMode) return;
    if (autoDispatchBusyRef.current) return;

    const now = Date.now();
    const AUTO_QUEUE_DISPATCH_COOLDOWN_MS = 4_000;
    if ((now - autoDispatchKickAtRef.current) < AUTO_QUEUE_DISPATCH_COOLDOWN_MS) return;

    autoDispatchBusyRef.current = true;
    autoDispatchKickAtRef.current = now;
    Promise.resolve(launchScheduledTaskRender(firstAutoLaunchEntry?.task || null, firstAutoLaunchEntry))
      .catch(() => ({}))
      .finally(() => {
        autoDispatchBusyRef.current = false;
      });
  }, [
    busyScheduledTaskId,
    firstAutoLaunchEntry,
    canLaunchRenders,
    launchScheduledTaskRender,
    queueBatchBusyMode,
    queueRuntimeModeNormalized,
  ]);

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
