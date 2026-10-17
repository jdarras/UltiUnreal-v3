import { TASK_VISUAL_STATUS_FLOW } from "../../helpers";
import { toSortTimestamp } from "./taskListUtils";

export const TASK_LIST_ALLOWED_SORT_KEYS = new Set([
  "title",
  "status",
  "renderName",
  "renderWorker",
  "updatedAt",
]);

function taskStatusRank(task, taskRenderStateByTaskId, resolveTaskVisualStatus) {
  const visualStatus = String(resolveTaskVisualStatus(task, taskRenderStateByTaskId) || "").trim().toLowerCase();
  const idx = TASK_VISUAL_STATUS_FLOW.indexOf(visualStatus);
  return idx >= 0 ? idx : TASK_VISUAL_STATUS_FLOW.length + 1;
}

export function compareTasksBySortKey({
  a,
  b,
  listSortKey = "updatedAt",
  taskRenderStateByTaskId = new Map(),
  resolveTaskVisualStatus = () => "",
  taskExpectedRenderName = () => "",
  taskRenderWorkerLabel = () => "",
} = {}) {
  if (listSortKey === "status") {
    return (
      taskStatusRank(a, taskRenderStateByTaskId, resolveTaskVisualStatus)
      - taskStatusRank(b, taskRenderStateByTaskId, resolveTaskVisualStatus)
    );
  }
  if (listSortKey === "renderName") {
    const aRenderName = String(taskExpectedRenderName(a) || "").toLowerCase();
    const bRenderName = String(taskExpectedRenderName(b) || "").toLowerCase();
    return aRenderName.localeCompare(bRenderName);
  }
  if (listSortKey === "renderWorker") {
    const aWorker = String(taskRenderWorkerLabel(a) || "").toLowerCase();
    const bWorker = String(taskRenderWorkerLabel(b) || "").toLowerCase();
    return aWorker.localeCompare(bWorker);
  }
  if (listSortKey === "updatedAt") {
    return toSortTimestamp(a?.updatedAt) - toSortTimestamp(b?.updatedAt);
  }
  const aTitle = String(a?.title || "").toLowerCase();
  const bTitle = String(b?.title || "").toLowerCase();
  return aTitle.localeCompare(bTitle);
}
