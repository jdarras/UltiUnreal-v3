import { resolveAutoRenderConfig } from "../../../shared/autoRenderHelpers";
import { resolveTaskAutoRenderState } from "../../../tasks/helpers";

export function buildRenderQueueTasks({
  tasks = [],
  autoRenderStateByTaskId = new Map(),
} = {}) {
  const taskList = Array.isArray(tasks) ? tasks : [];
  if (taskList.length <= 0) return [];
  const out = [];
  for (const task of taskList) {
    const taskId = Number(task?.id || 0);
    if (!Number.isFinite(taskId) || taskId <= 0) continue;
    if (String(task?.requestType || "").trim().toLowerCase() !== "auto_render") continue;
    const taskStatus = String(task?.status || "").trim();
    if (taskStatus === "Validee" || taskStatus === "Rejetee") continue;
    const renderState = resolveTaskAutoRenderState(task, autoRenderStateByTaskId);
    if (renderState !== "waiting" && renderState !== "running" && renderState !== "error") continue;
    const autoRenderConfig = resolveAutoRenderConfig(task);
    const renderStateEntry = autoRenderStateByTaskId.get(Math.trunc(taskId));
    const linkedRender = renderStateEntry?.render || null;
    const projectName = String(autoRenderConfig?.projectName || linkedRender?.projectName || "").trim();
    const templateName = String(autoRenderConfig?.templateName || linkedRender?.templateName || "").trim();
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
  const rankByState = { waiting: 0, running: 1, error: 2 };
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
