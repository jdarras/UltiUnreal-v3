import { resolveAutoRenderConfig } from "../../../shared/autoRenderHelpers";
import { toSortTimestamp } from "../../../shared/sortUtils";

function normalizeQueueSequenceValue(task = {}, config = {}) {
  const raw = String(
    config?.sequenceName
    || config?.payload?.sequenceName
    || task?.payload?.sequenceName
    || ""
  ).trim();
  if (!raw) return "";
  const tail = raw.split("/").filter(Boolean).pop() || raw;
  return String((tail.split(".")[0] || "").trim() || raw);
}

function queueEntryStartTimestamp(queueEntry = null, task = null, config = null) {
  const linkedRender = queueEntry?.linkedRender && typeof queueEntry.linkedRender === "object"
    ? queueEntry.linkedRender
    : {};
  const taskObj = task && typeof task === "object" ? task : {};
  const configObj = config && typeof config === "object" ? config : {};
  const linkedPayload = linkedRender?.payload && typeof linkedRender.payload === "object" && !Array.isArray(linkedRender.payload)
    ? linkedRender.payload
    : {};
  const taskPayload = taskObj?.payload && typeof taskObj.payload === "object" && !Array.isArray(taskObj.payload)
    ? taskObj.payload
    : {};
  const ts = [
    linkedRender?.scheduledAt,
    linkedPayload?.scheduledAt,
    linkedRender?.startedAt,
    linkedRender?.createdAt,
    taskObj?.scheduledAt,
    taskPayload?.scheduledAt,
    configObj?.scheduledAt,
    configObj?.payload?.scheduledAt,
    taskObj?.updatedAt,
    taskObj?.createdAt,
  ]
    .map((value) => toSortTimestamp(value))
    .find((value) => Number.isFinite(value) && value > 0);
  return Number.isFinite(ts) && ts > 0 ? ts : 0;
}

function queueEntryQueuedOrder(queueEntry = null) {
  const linkedRender = queueEntry?.linkedRender && typeof queueEntry.linkedRender === "object"
    ? queueEntry.linkedRender
    : {};
  const renderIdRaw = Number(linkedRender?.id || 0);
  const renderId = Number.isFinite(renderIdRaw) && renderIdRaw > 0 ? Math.trunc(renderIdRaw) : 0;
  const linkedStatus = String(linkedRender?.status || "").trim().toLowerCase();
  const queueOrderRaw = Number(linkedRender?.queueOrder);
  if (renderId <= 0 || linkedStatus !== "queued" || !Number.isFinite(queueOrderRaw)) return null;
  return Math.trunc(queueOrderRaw);
}

export function sortRenderQueueTasks({
  filteredRenderQueueTasks = [],
  queueSortDir = "asc",
  queueSortKey = "startAt",
  queueEntryWorkerLabel = () => "",
} = {}) {
  const list = [...filteredRenderQueueTasks];
  const dir = queueSortDir === "asc" ? 1 : -1;
  const statusRank = { waiting: 0, running: 1, error: 2, to_modify: 3 };
  list.sort((a, b) => {
    const taskA = a?.task && typeof a.task === "object" ? a.task : {};
    const taskB = b?.task && typeof b.task === "object" ? b.task : {};
    const configA = resolveAutoRenderConfig(taskA) || {};
    const configB = resolveAutoRenderConfig(taskB) || {};
    const stateA = String(a?.renderState || "").trim().toLowerCase();
    const stateB = String(b?.renderState || "").trim().toLowerCase();
    let cmp = 0;
    if (queueSortKey === "startAt") {
      const queuedOrderA = queueEntryQueuedOrder(a);
      const queuedOrderB = queueEntryQueuedOrder(b);
      if (queuedOrderA != null || queuedOrderB != null) {
        if (queuedOrderA != null && queuedOrderB != null) {
          cmp = queuedOrderA - queuedOrderB;
        } else {
          cmp = queuedOrderA != null ? -1 : 1;
        }
      } else {
        cmp = queueEntryStartTimestamp(a, taskA, configA) - queueEntryStartTimestamp(b, taskB, configB);
      }
    } else if (queueSortKey === "task") {
      cmp = String(taskA?.title || "").localeCompare(String(taskB?.title || ""), undefined, { sensitivity: "base" });
    } else if (queueSortKey === "sequence") {
      cmp = normalizeQueueSequenceValue(taskA, configA).localeCompare(
        normalizeQueueSequenceValue(taskB, configB),
        undefined,
        { sensitivity: "base" }
      );
    } else if (queueSortKey === "worker") {
      cmp = queueEntryWorkerLabel(a).localeCompare(
        queueEntryWorkerLabel(b),
        undefined,
        { sensitivity: "base" }
      );
    } else if (queueSortKey === "status") {
      const rankA = Object.prototype.hasOwnProperty.call(statusRank, stateA) ? statusRank[stateA] : 999;
      const rankB = Object.prototype.hasOwnProperty.call(statusRank, stateB) ? statusRank[stateB] : 999;
      cmp = rankA - rankB;
    } else {
      cmp = String(taskA?.title || "").localeCompare(String(taskB?.title || ""), undefined, { sensitivity: "base" });
    }
    if (cmp === 0) {
      cmp = toSortTimestamp(taskA?.updatedAt) - toSortTimestamp(taskB?.updatedAt);
    }
    if (cmp === 0) {
      cmp = Number(taskA?.id || 0) - Number(taskB?.id || 0);
    }
    return cmp * dir;
  });
  return list;
}

export default sortRenderQueueTasks;
