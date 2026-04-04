import { TASK_AUTO_RENDER_STATE_FLOW, TASK_STATUS_FLOW } from "../../helpers";
import { toSortTimestamp } from "./taskListUtils";

export const TASK_LIST_ALLOWED_SORT_KEYS = new Set([
  "title",
  "status",
  "renderName",
  "renderWorker",
  "updatedAt",
]);

export function taskStatusRank(task, taskRenderStateByTaskId, resolveTaskAutoRenderState) {
  const autoState = resolveTaskAutoRenderState(task, taskRenderStateByTaskId);
  if (autoState) {
    const idx = TASK_AUTO_RENDER_STATE_FLOW.indexOf(autoState);
    return idx >= 0 ? idx : TASK_AUTO_RENDER_STATE_FLOW.length + 1;
  }
  const status = String(task?.status || "").trim();
  const idx = TASK_STATUS_FLOW.indexOf(status);
  return idx >= 0
    ? idx + TASK_AUTO_RENDER_STATE_FLOW.length + 1
    : TASK_STATUS_FLOW.length + TASK_AUTO_RENDER_STATE_FLOW.length + 1;
}

export function compareTasksBySortKey({
  a,
  b,
  listSortKey = "updatedAt",
  taskRenderStateByTaskId = new Map(),
  resolveTaskAutoRenderState = () => "",
  taskExpectedRenderName = () => "",
  taskRenderWorkerLabel = () => "",
} = {}) {
  if (listSortKey === "status") {
    return (
      taskStatusRank(a, taskRenderStateByTaskId, resolveTaskAutoRenderState)
      - taskStatusRank(b, taskRenderStateByTaskId, resolveTaskAutoRenderState)
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

export default {
  TASK_LIST_ALLOWED_SORT_KEYS,
  taskStatusRank,
  compareTasksBySortKey,
};
