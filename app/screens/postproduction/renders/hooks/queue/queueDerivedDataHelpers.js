import { resolveAutoRenderTargetWorkerKey } from "../../../shared/autoRenderHelpers";
import { safeT } from "../../../shared/helpers";

function toTrimmedString(value = "") {
  return String(value || "").trim();
}

function toScheduleTimestamp(value = "") {
  const raw = toTrimmedString(value);
  if (!raw) return 0;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function firstNonEmptyString(values = []) {
  const list = Array.isArray(values) ? values : [];
  for (const value of list) {
    const normalized = toTrimmedString(value);
    if (normalized) return normalized;
  }
  return "";
}

function normalizeLaunchMode(value = "") {
  const normalized = toTrimmedString(value).toLowerCase();
  if (normalized === "now" || normalized === "scheduled") return normalized;
  return "";
}

function normalizeScheduledMode(value = "") {
  const normalized = toTrimmedString(value).toLowerCase();
  if (normalized === "specific_station") return "any_station";
  if (normalized === "datetime" || normalized === "any_station") {
    return normalized;
  }
  return "";
}

function resolveQueueScheduleMeta(queueEntry = null) {
  const task = queueEntry?.task && typeof queueEntry.task === "object"
    ? queueEntry.task
    : {};
  const linkedRender = queueEntry?.linkedRender && typeof queueEntry.linkedRender === "object"
    ? queueEntry.linkedRender
    : {};
  const config = task?.autoRenderConfig && typeof task.autoRenderConfig === "object" && !Array.isArray(task.autoRenderConfig)
    ? task.autoRenderConfig
    : {};
  const linkedPayload = linkedRender?.payload && typeof linkedRender.payload === "object" && !Array.isArray(linkedRender.payload)
    ? linkedRender.payload
    : {};
  const taskPayload = task?.payload && typeof task.payload === "object" && !Array.isArray(task.payload)
    ? task.payload
    : {};
  const configPayload = config?.payload && typeof config.payload === "object" && !Array.isArray(config.payload)
    ? config.payload
    : {};

  const launchMode = normalizeLaunchMode(firstNonEmptyString([
    linkedRender?.launchMode,
    linkedPayload?.launchMode,
    task?.launchMode,
    taskPayload?.launchMode,
    config?.launchMode,
    configPayload?.launchMode,
  ]));

  const scheduledMode = normalizeScheduledMode(firstNonEmptyString([
    linkedRender?.scheduledMode,
    linkedPayload?.scheduledMode,
    task?.scheduledMode,
    taskPayload?.scheduledMode,
    config?.scheduledMode,
    configPayload?.scheduledMode,
  ]));

  const scheduledAtRaw = firstNonEmptyString([
    linkedRender?.scheduledAt,
    linkedPayload?.scheduledAt,
    task?.scheduledAt,
    taskPayload?.scheduledAt,
    config?.scheduledAt,
    configPayload?.scheduledAt,
  ]);
  const scheduledAtMs = toScheduleTimestamp(scheduledAtRaw);
  const scheduledAt = scheduledAtMs > 0 ? scheduledAtRaw : "";
  const hasScheduledAt = scheduledAtMs > 0;
  const isStationWaitMode = (
    scheduledMode === "any_station"
    || (launchMode === "scheduled" && !hasScheduledAt)
  );
  const isAutoLaunchDue = !hasScheduledAt || Date.now() >= scheduledAtMs;

  return {
    launchMode,
    scheduledMode,
    scheduledAt,
    scheduledAtMs,
    hasScheduledAt,
    isStationWaitMode,
    isAutoLaunchDue,
  };
}

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
  const scheduleMeta = resolveQueueScheduleMeta(queueEntry);
  const renderState = String(queueEntry?.renderState || "waiting").trim().toLowerCase();
  const linkedRenderIdRaw = Number(queueEntry?.linkedRender?.id || 0);
  const linkedRenderId = Number.isFinite(linkedRenderIdRaw) && linkedRenderIdRaw > 0
    ? Math.trunc(linkedRenderIdRaw)
    : 0;
  const hasLinkedRender = linkedRenderId > 0;
  const effectiveRenderState = (!hasLinkedRender && renderState === "waiting")
    ? "not_started"
    : renderState;
  // A queue entry without linked render means "task prepared but render not created yet":
  // this must go through the render editor submit flow, never queue launch.
  const canLaunchFromQueue = (
    hasLinkedRender
    && effectiveRenderState !== "running"
    && effectiveRenderState !== "to_modify"
  );
  return {
    ...scheduleMeta,
    renderState: effectiveRenderState,
    linkedRenderId,
    canLaunchFromQueue,
    isWaitingLaunchable: (
      canLaunchFromQueue
      && effectiveRenderState === "waiting"
      && scheduleMeta.isAutoLaunchDue
    ),
    isErrorLaunchable: canLaunchFromQueue && effectiveRenderState === "error",
  };
}

function queueEntryWorkerLabel(queueEntry = null, queueWorkerLabelByKey = new Map(), t) {
  const workerName = String(queueEntry?.workerName || "").trim();
  const workerKey = String(queueEntry?.workerKey || "").trim();

  if (workerName) return workerName;

  if (workerKey) {
    const mappedWorkerLabel = String(queueWorkerLabelByKey.get(workerKey) || "").trim();
    if (mappedWorkerLabel && mappedWorkerLabel !== workerKey) {
      return mappedWorkerLabel;
    }
  }

  const fallbackTargetWorker = resolveAutoRenderTargetWorkerKey(queueEntry?.task);
  if (fallbackTargetWorker) {
    const fallbackWorkerLabel = String(queueWorkerLabelByKey.get(fallbackTargetWorker) || "").trim();
    if (fallbackWorkerLabel && fallbackWorkerLabel !== fallbackTargetWorker) {
      return fallbackWorkerLabel;
    }
  }
  return safeT(t, "postprod.renders.queue.worker.pending", "Auto (dispatcher)");
}

export {
  buildQueueWorkerLabelByKey,
  getQueueEntryLaunchMeta,
  queueEntryWorkerLabel,
};

export default buildQueueWorkerLabelByKey;
