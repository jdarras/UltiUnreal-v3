import { safeT } from "../../../shared/helpers";
import {
  buildScheduledTaskCreateRenderInput,
  removeLaunchedTaskIdsFromSelection,
  resolveLinkedQueuedRender,
} from "./queueLaunchHelpers";

function canLaunchRenders(onCreateRender = null, onDispatchRenders = null) {
  return typeof onCreateRender === "function" || typeof onDispatchRenders === "function";
}

async function launchScheduledTaskRenderAction({
  task = null,
  queueEntry = null,
  launchOptions = null,
  onCreateRender = null,
  onDispatchRenders = null,
  setBusyScheduledTaskId = null,
} = {}) {
  const canDispatchRenders = typeof onDispatchRenders === "function";
  const canCreateRender = typeof onCreateRender === "function";
  if (!canDispatchRenders && !canCreateRender) return false;

  const createRenderInput = buildScheduledTaskCreateRenderInput(task);
  const taskId = Number(createRenderInput?.taskId || 0);
  if (!Number.isFinite(taskId) || taskId <= 0) return false;

  const { linkedRenderId, linkedRenderStatus } = resolveLinkedQueuedRender(queueEntry);
  if (linkedRenderId > 0 && linkedRenderStatus === "Queued" && canDispatchRenders) {
    if (typeof setBusyScheduledTaskId === "function") setBusyScheduledTaskId(taskId);
    try {
      await Promise.resolve(onDispatchRenders({
        maxJobs: 1,
        renderIds: [linkedRenderId],
      }));
    } finally {
      if (typeof setBusyScheduledTaskId === "function") setBusyScheduledTaskId(0);
    }
    return true;
  }

  if (!canCreateRender || !createRenderInput?.createRenderInput) return false;

  // Inject scheduledAt + launchMode from launchOptions
  const scheduledAt = launchOptions?.scheduledAt ?? null;
  const finalInput = scheduledAt
    ? { ...createRenderInput.createRenderInput, scheduledAt, launchMode: "scheduled" }
    : createRenderInput.createRenderInput;

  if (typeof setBusyScheduledTaskId === "function") setBusyScheduledTaskId(taskId);
  try {
    await Promise.resolve(onCreateRender(finalInput));
  } finally {
    if (typeof setBusyScheduledTaskId === "function") setBusyScheduledTaskId(0);
  }
  return true;
}

function buildQueueBatchResultMessage({ t, launchedCount = 0, failedCount = 0 } = {}) {
  if (launchedCount <= 0 && failedCount <= 0) return "";
  return safeT(
    t,
    "postprod.renders.queue.batch.result",
    "Traitement file: {ok} lance(s), {failed} echec(s).",
    { ok: launchedCount, failed: failedCount }
  );
}

function buildQueueBatchErrorMessage({ t, failedCount = 0 } = {}) {
  if (failedCount <= 0) return "";
  return safeT(
    t,
    "postprod.renders.queue.batch.error",
    "Certaines taches de la file n'ont pas pu etre lancees."
  );
}

function applyLaunchedTaskSelectionCleanup({
  launchedTaskIds = new Set(),
  setSelectedQueueTaskIds = null,
} = {}) {
  if (launchedTaskIds.size <= 0 || typeof setSelectedQueueTaskIds !== "function") return;
  setSelectedQueueTaskIds((prev) => removeLaunchedTaskIdsFromSelection(prev, launchedTaskIds));
}

export {
  canLaunchRenders,
  launchScheduledTaskRenderAction,
  buildQueueBatchResultMessage,
  buildQueueBatchErrorMessage,
  applyLaunchedTaskSelectionCleanup,
};

export default canLaunchRenders;
