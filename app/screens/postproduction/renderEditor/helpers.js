import { safeT } from "../shared/helpers";
import {
  AUTO_RENDER_STATE_FLOW as TASK_AUTO_RENDER_STATE_FLOW,
  autoRenderStateFromRenderOrStatus,
  autoRenderStateLabel,
  autoRenderStateLevel,
  isQueuedRenderWithError,
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
const TASK_VISUAL_STATUS_FLOW = [
  "planned",
  "waiting",
  "running",
  "error",
  "to_validate",
  "validated",
  "rejected",
];

const TASK_STATUS_TO_VISUAL_KEY = {
  Planifiee: "planned",
  "A faire": "waiting",
  "En cours": "running",
  "A valider": "to_validate",
  Validee: "validated",
  Rejetee: "rejected",
  Termine: "to_validate",
  Terminee: "to_validate",
  Annulee: "rejected",
  Annule: "rejected",
};

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

function normalizeTaskVisualStatusKey(statusRaw = "") {
  const raw = String(statusRaw || "").trim();
  if (!raw) return "planned";
  const direct = TASK_STATUS_TO_VISUAL_KEY[raw];
  if (direct) return direct;
  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized === "planned" || normalized === "planifiee") return "planned";
  if (normalized === "waiting" || normalized === "queued" || normalized === "a_faire" || normalized === "a faire") return "waiting";
  if (normalized === "running" || normalized === "en_cours" || normalized === "en cours") return "running";
  if (normalized === "error" || normalized === "failed" || normalized === "en_erreur" || normalized === "en erreur") return "error";
  if (normalized === "to_validate" || normalized === "a_valider" || normalized === "a valider") return "to_validate";
  if (normalized === "validated" || normalized === "validee") return "validated";
  if (normalized === "rejected" || normalized === "rejetee" || normalized === "to_modify" || normalized === "canceled" || normalized === "cancelled") return "rejected";
  return "planned";
}

function taskVisualStatusFromRender(render = null) {
  const status = String(render?.status || "").trim().toLowerCase();
  const explicitReviewStatus = String(render?.reviewStatus || "").trim().toLowerCase();
  if (status === "running") return "running";
  if (status === "failed") return "error";
  if (status === "canceled") return "rejected";
  if (isQueuedRenderWithError(render)) return "error";
  if (status === "done") {
    if (explicitReviewStatus === "validated") return "validated";
    if (explicitReviewStatus === "to_modify" || explicitReviewStatus === "canceled" || explicitReviewStatus === "rejected") {
      return "rejected";
    }
    const validatedByUserId = Number(render?.validatedByUserId || 0);
    if (Number.isFinite(validatedByUserId) && validatedByUserId > 0) return "validated";
    return "to_validate";
  }
  return "waiting";
}

function taskVisualStatusLabel(t, statusRaw) {
  const status = normalizeTaskVisualStatusKey(statusRaw);
  if (status === "waiting") return safeT(t, "postprod.tasks.renderState.waiting", "En attente");
  if (status === "running") return safeT(t, "postprod.tasks.renderState.running", "En rendu");
  if (status === "error") return safeT(t, "postprod.tasks.renderState.error", "En erreur");
  if (status === "to_validate") return safeT(t, "postprod.tasks.status.aValider", "A valider");
  if (status === "validated") return safeT(t, "postprod.tasks.status.validee", "Validee");
  if (status === "rejected") return safeT(t, "postprod.tasks.status.rejetee", "Rejetee");
  return safeT(t, "postprod.tasks.status.planifiee", "Planifiee");
}

function taskVisualStatusClass(statusRaw) {
  const status = normalizeTaskVisualStatusKey(statusRaw);
  if (status === "waiting") return "status-waiting";
  if (status === "running") return "status-running";
  if (status === "error") return "status-error";
  if (status === "to_validate") return "status-to-validate";
  if (status === "validated") return "status-validated";
  if (status === "rejected") return "status-rejected";
  return "status-planned";
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
    const visualStatus = taskVisualStatusFromRender(render);
    const current = out.get(taskId);
    const shouldReplace = (
      !current
      || updatedStamp > current.updatedStamp
      || (
        updatedStamp === current.updatedStamp
        && renderId > current.renderId
      )
    );
    if (!shouldReplace) continue;
    out.set(taskId, {
      state,
      visualStatus,
      render,
      renderId,
      updatedStamp,
    });
  }
  return out;
}

function resolveTaskAutoRenderState(task, taskRenderStateByTaskId = new Map()) {
  const taskIdRaw = Number(task?.id || 0);
  const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
  if (taskId <= 0) return "waiting";
  const entry = taskRenderStateByTaskId.get(taskId);
  const state = String(entry?.state || "").trim().toLowerCase();
  if (!TASK_AUTO_RENDER_STATE_FLOW.includes(state)) return "waiting";
  return state;
}

function resolveTaskVisualStatus(task, taskRenderStateByTaskId = new Map()) {
  const taskFallbackStatus = normalizeTaskVisualStatusKey(task?.status);
  const taskFallbackIsFinal = taskFallbackStatus === "validated" || taskFallbackStatus === "rejected";
  const taskIdRaw = Number(task?.id || 0);
  const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
  if (taskId > 0) {
    const entry = taskRenderStateByTaskId.get(taskId);
    const visualStatus = normalizeTaskVisualStatusKey(entry?.visualStatus || "");
    if (entry && TASK_VISUAL_STATUS_FLOW.includes(visualStatus)) {
      // If task has already been explicitly closed as validated/rejected,
      // keep this final state in task history even if linked render entry is stale.
      if (
        taskFallbackIsFinal
        && (
          visualStatus === "planned"
          || visualStatus === "waiting"
          || visualStatus === "running"
          || visualStatus === "error"
          || visualStatus === "to_validate"
        )
      ) {
        return taskFallbackStatus;
      }
      return visualStatus;
    }
  }
  return taskFallbackStatus;
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
  TASK_VISUAL_STATUS_FLOW,
  buildTaskAutoRenderStateByTaskId,
  buildTaskExpectedRenderNamesPreview,
  buildTaskRenderNameBase,
  normalizeTaskVisualStatusKey,
  normalizeTaskExpectedRenderCountInput,
  resolveTaskAutoRenderState,
  resolveTaskVisualStatus,
  taskAutoRenderStateLabel,
  taskAutoRenderStateLevel,
  taskAutoRenderStateFromRenderStatus,
  taskVisualStatusClass,
  taskVisualStatusLabel,
  taskStatusLabel,
};
