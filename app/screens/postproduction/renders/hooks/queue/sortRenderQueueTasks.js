import { resolveAutoRenderConfig } from "../../../shared/autoRenderHelpers";
import { toSortTimestamp } from "../../../shared/sortUtils";

export function sortRenderQueueTasks({
  filteredRenderQueueTasks = [],
  queueSortDir = "asc",
  queueSortKey = "status",
  queueEntryWorkerLabel = () => "",
  queueTaskPriorityValue = () => 3,
} = {}) {
  const list = [...filteredRenderQueueTasks];
  const dir = queueSortDir === "asc" ? 1 : -1;
  const statusRank = { waiting: 0, running: 1, error: 2 };
  list.sort((a, b) => {
    const taskA = a?.task && typeof a.task === "object" ? a.task : {};
    const taskB = b?.task && typeof b.task === "object" ? b.task : {};
    const configA = resolveAutoRenderConfig(taskA) || {};
    const configB = resolveAutoRenderConfig(taskB) || {};
    const stateA = String(a?.renderState || "").trim().toLowerCase();
    const stateB = String(b?.renderState || "").trim().toLowerCase();
    let cmp = 0;
    if (queueSortKey === "task") {
      cmp = String(taskA?.title || "").localeCompare(String(taskB?.title || ""), undefined, { sensitivity: "base" });
    } else if (queueSortKey === "project") {
      cmp = String(a?.projectName || configA?.projectName || "").localeCompare(
        String(b?.projectName || configB?.projectName || ""),
        undefined,
        { sensitivity: "base" }
      );
    } else if (queueSortKey === "template") {
      cmp = String(a?.templateName || configA?.templateName || "").localeCompare(
        String(b?.templateName || configB?.templateName || ""),
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
    } else if (queueSortKey === "priority") {
      cmp = queueTaskPriorityValue(taskA) - queueTaskPriorityValue(taskB);
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
