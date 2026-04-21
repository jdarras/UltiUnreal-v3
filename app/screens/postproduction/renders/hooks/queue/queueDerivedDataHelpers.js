import { resolveAutoRenderTargetWorkerKey } from "../../../shared/autoRenderHelpers";
import { safeT } from "../../../shared/helpers";

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
  queueEntryWorkerLabel,
};

export default buildQueueWorkerLabelByKey;
