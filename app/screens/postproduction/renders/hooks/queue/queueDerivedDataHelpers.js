import { safeT } from "../../../shared/helpers";
import { resolveAutoRenderTargetWorkerKey } from "../../../shared/autoRenderHelpers";

function buildQueueWorkerLabelByKey(renderWorkers = []) {
  const out = new Map();
  const list = Array.isArray(renderWorkers) ? renderWorkers : [];
  for (const worker of list) {
    const workerKey = String(worker?.workerKey || "").trim();
    if (!workerKey) continue;
    const displayName = String(worker?.displayName || "").trim();
    out.set(workerKey, displayName || workerKey);
  }
  return out;
}

function getQueueEntryLaunchMeta(queueEntry = null) {
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
}

function queueTaskPriorityValue(task = null) {
  const raw = Number(task?.priority || 0);
  if (!Number.isFinite(raw)) return 3;
  const normalized = Math.trunc(raw);
  if (normalized < 1 || normalized > 4) return 3;
  return normalized;
}

function queueTaskPriorityLabel(priorityRaw, t) {
  const priority = queueTaskPriorityValue({ priority: priorityRaw });
  if (priority === 1) return safeT(t, "postprod.renders.queue.priority.p1", "Urgente");
  if (priority === 2) return safeT(t, "postprod.renders.queue.priority.p2", "Haute");
  if (priority === 4) return safeT(t, "postprod.renders.queue.priority.p4", "Basse");
  return safeT(t, "postprod.renders.queue.priority.p3", "Normale");
}

function queueEntryWorkerLabel(queueEntry = null, queueWorkerLabelByKey = new Map(), t) {
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
}

export {
  buildQueueWorkerLabelByKey,
  getQueueEntryLaunchMeta,
  queueTaskPriorityValue,
  queueTaskPriorityLabel,
  queueEntryWorkerLabel,
};

export default buildQueueWorkerLabelByKey;
