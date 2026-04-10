import { safeT } from "../shared/helpers";
import {
  AUTO_RENDER_STATE_FLOW as TASK_AUTO_RENDER_STATE_FLOW,
  AUTO_RENDER_STATE_PRIORITY as TASK_AUTO_RENDER_STATE_PRIORITY,
  autoRenderStateFromRenderOrStatus,
  autoRenderStateLabel,
  autoRenderStateLevel,
} from "../shared/renderStateHelpers";

const TASK_STATUS_TO_KEY = {
  Planifiee: "planifiee",
  "A faire": "aFaire",
  "En cours": "enCours",
  "A valider": "aValider",
  Validee: "validee",
  Rejetee: "rejetee",
};

const TASK_STATUS_FLOW = ["Planifiee", "A faire", "En cours", "A valider", "Validee", "Rejetee"];
function taskStatusLabel(t, value) {
  const status = String(value || "").trim();
  const key = TASK_STATUS_TO_KEY[status];
  if (!key) return status || "-";
  return safeT(t, `postprod.tasks.status.${key}`, status);
}

function taskAutoRenderStateFromRenderStatus(renderOrStatus) {
  return autoRenderStateFromRenderOrStatus(renderOrStatus);
}

function taskAutoRenderStateLabel(t, stateRaw) {
  return autoRenderStateLabel(t, stateRaw);
}

function taskAutoRenderStateLevel(stateRaw) {
  return autoRenderStateLevel(stateRaw);
}

function buildTaskAutoRenderStateByTaskId(renders = []) {
  const out = new Map();
  const list = Array.isArray(renders) ? renders : [];
  for (const render of list) {
    if (render?.stationIsRemote === true) continue;
    const taskIdRaw = Number(render?.linkedTaskId || 0);
    const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
    if (taskId <= 0) continue;
    const renderIdRaw = Number(render?.id || 0);
    const renderId = Number.isFinite(renderIdRaw) && renderIdRaw > 0 ? Math.trunc(renderIdRaw) : 0;
    const updatedStampRaw = Date.parse(String(
      render?.updatedAt
      || render?.finishedAt
      || render?.startedAt
      || render?.createdAt
      || ""
    ).trim());
    const updatedStamp = Number.isFinite(updatedStampRaw) ? updatedStampRaw : 0;
    const state = taskAutoRenderStateFromRenderStatus(render);
    const priority = Number(TASK_AUTO_RENDER_STATE_PRIORITY[state] || 0);
    const current = out.get(taskId);
    const shouldReplace = (
      !current
      || priority > current.priority
      || (
        priority === current.priority
        && (
          updatedStamp > current.updatedStamp
          || (updatedStamp === current.updatedStamp && renderId > current.renderId)
        )
      )
    );
    if (!shouldReplace) continue;
    out.set(taskId, {
      state,
      render,
      renderId,
      updatedStamp,
      priority,
    });
  }
  return out;
}

function resolveTaskAutoRenderState(task, taskRenderStateByTaskId = new Map()) {
  const requestType = String(task?.requestType || "").trim().toLowerCase();
  if (requestType !== "auto_render") return "";
  const taskIdRaw = Number(task?.id || 0);
  const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
  if (taskId <= 0) return "waiting";
  const entry = taskRenderStateByTaskId.get(taskId);
  const state = String(entry?.state || "").trim().toLowerCase();
  if (!TASK_AUTO_RENDER_STATE_FLOW.includes(state)) return "waiting";
  return state;
}

function normalizeTaskExpectedRenderCountInput() {
  // 2026.3 scope: auto render only => one expected output per task.
  return 1;
}

function buildTaskRenderNameBase(title = "") {
  const normalized = String(title || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return normalized || "rendu";
}

function buildTaskExpectedRenderNamesPreview(title = "", expectedRenderCount = 1) {
  const count = Math.max(1, Math.min(50, Math.trunc(Number(expectedRenderCount) || 1)));
  const base = buildTaskRenderNameBase(title);
  const out = [];
  for (let idx = 1; idx <= count; idx += 1) {
    out.push(`${base}-r${String(idx).padStart(3, "0")}`);
  }
  return out;
}

export {
  TASK_AUTO_RENDER_STATE_FLOW,
  TASK_STATUS_FLOW,
  buildTaskAutoRenderStateByTaskId,
  buildTaskExpectedRenderNamesPreview,
  buildTaskRenderNameBase,
  normalizeTaskExpectedRenderCountInput,
  resolveTaskAutoRenderState,
  taskAutoRenderStateLabel,
  taskAutoRenderStateLevel,
  taskAutoRenderStateFromRenderStatus,
  taskStatusLabel,
};
