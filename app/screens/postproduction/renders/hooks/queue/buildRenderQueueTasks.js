import { resolveTaskAutoRenderState } from "../../../renderEditor/helpers";
import { resolveAutoRenderConfig } from "../../../shared/autoRenderHelpers";

function isAssignmentDraftTask(task = null) {
  const autoRenderConfig = resolveAutoRenderConfig(task) || {};
  const raw = autoRenderConfig?.assignmentDraft;
  if (raw === true) return true;
  return String(raw || "").trim().toLowerCase() === "true";
}

export function buildRenderQueueTasks({
  tasks = [],
  autoRenderStateByTaskId = new Map(),
} = {}) {
  const CLOSED_TASK_STATUS_SET = new Set([
    "a valider",
    "à valider",
    "validee",
    "rejetee",
  ]);
  const taskList = Array.isArray(tasks) ? tasks : [];
  if (taskList.length <= 0) return [];
  const out = [];
  for (const task of taskList) {
    const taskId = Number(task?.id || 0);
    if (!Number.isFinite(taskId) || taskId <= 0) continue;
    const renderStateEntry = autoRenderStateByTaskId.get(Math.trunc(taskId));
    const visualStatus = String(renderStateEntry?.visualStatus || "").trim().toLowerCase();
    const linkedRender = renderStateEntry?.render || null;
    // Queue is strictly render-jobs based: a task without linked render job
    // belongs to assignment/todo panels, never to queue.
    if (!linkedRender) continue;
    const assignmentDraft = isAssignmentDraftTask(task);
    if (assignmentDraft) continue;
    const explicitReviewStatus = String(linkedRender?.reviewStatus || "").trim().toLowerCase();
    const isToModify = visualStatus === "rejected" && explicitReviewStatus === "to_modify";
    const taskStatus = String(task?.status || "").trim().toLowerCase();
    if (CLOSED_TASK_STATUS_SET.has(taskStatus) && !isToModify) continue;
    if (!isToModify && (visualStatus === "validated" || visualStatus === "rejected")) continue;
    const renderState = isToModify ? "to_modify" : resolveTaskAutoRenderState(task, autoRenderStateByTaskId);
    if (renderState !== "waiting" && renderState !== "running" && renderState !== "error" && renderState !== "to_modify") continue;
    const autoRenderConfig = resolveAutoRenderConfig(task);
    const projectName = String(autoRenderConfig?.projectName || linkedRender?.projectName || "").trim();
    const templateName = String(autoRenderConfig?.templateName || linkedRender?.templateName || "").trim();
    if (!projectName || !templateName) continue;
    const workerName = String(linkedRender?.assignedWorkerName || "").trim();
    const workerKey = String(linkedRender?.assignedWorkerKey || "").trim();
    out.push({
      task,
      renderState,
      linkedRender,
      projectName,
      templateName,
      workerName,
      workerKey,
    });
  }
  const rankByState = { waiting: 0, running: 1, error: 2, to_modify: 3 };
  out.sort((a, b) => {
    const stateA = String(a?.renderState || "").trim().toLowerCase();
    const stateB = String(b?.renderState || "").trim().toLowerCase();
    const rankA = Object.prototype.hasOwnProperty.call(rankByState, stateA) ? rankByState[stateA] : 999;
    const rankB = Object.prototype.hasOwnProperty.call(rankByState, stateB) ? rankByState[stateB] : 999;
    if (rankA !== rankB) return rankA - rankB;
    const updatedA = String(a?.task?.updatedAt || "").trim();
    const updatedB = String(b?.task?.updatedAt || "").trim();
    return updatedB.localeCompare(updatedA);
  });
  return out;
}

export default buildRenderQueueTasks;
