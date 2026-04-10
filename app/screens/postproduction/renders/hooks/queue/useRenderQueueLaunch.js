import { useCallback, useMemo, useState } from "react";
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
} = {}) {
  const [busyScheduledTaskId, setBusyScheduledTaskId] = useState(0);
  const [queueBatchBusyMode, setQueueBatchBusyMode] = useState("");
  const [queueBatchFeedback, setQueueBatchFeedback] = useState("");
  const [queueBatchError, setQueueBatchError] = useState("");

  const launchScheduledTaskRender = useCallback(async (task, queueEntry = null, launchOptions = null) => {
    await launchScheduledTaskRenderAction({
      task,
      queueEntry,
      launchOptions,
      onCreateRender,
      onDispatchRenders,
      setBusyScheduledTaskId,
    });
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

    setQueueBatchFeedback(buildQueueBatchResultMessage({ t, launchedCount, failedCount }));
    setQueueBatchError(buildQueueBatchErrorMessage({ t, failedCount }));
    applyLaunchedTaskSelectionCleanup({ launchedTaskIds, setSelectedQueueTaskIds });
    setQueueBatchBusyMode("");
  }, [launchScheduledTaskRender, queueBatchBusyMode, setSelectedQueueTaskIds, t]);

  const canLaunchRenders = useMemo(
    () => computeCanLaunchRenders(onCreateRender, onDispatchRenders),
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
