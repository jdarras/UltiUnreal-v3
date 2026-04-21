import { safeT } from "./helpers";

const AUTO_RENDER_STATE_FLOW = ["waiting", "running", "error", "done", "canceled"];

const AUTO_RENDER_STATE_PRIORITY = {
  running: 5,
  error: 4,
  waiting: 3,
  done: 2,
  canceled: 1,
};

function isQueuedRenderWithError(render) {
  const status = String(render?.status || "").trim().toLowerCase();
  if (status !== "queued") return false;
  const errorMessage = String(render?.errorMessage || render?.error || "").trim();
  return errorMessage.length > 0;
}

function autoRenderStateFromRenderOrStatus(renderOrStatus) {
  const render = renderOrStatus && typeof renderOrStatus === "object" && !Array.isArray(renderOrStatus)
    ? renderOrStatus
    : null;
  const status = String(render ? render?.status : renderOrStatus || "").trim().toLowerCase();
  if (status === "running") return "running";
  if (status === "failed") return "error";
  if (status === "done") return "done";
  if (status === "canceled") return "canceled";
  if (isQueuedRenderWithError(render)) return "error";
  return "waiting";
}

function autoRenderStateLabel(t, stateRaw) {
  const state = String(stateRaw || "").trim().toLowerCase();
  if (state === "running") {
    return safeT(t, "postprod.tasks.renderState.running", "En rendu");
  }
  if (state === "error") {
    return safeT(t, "postprod.tasks.renderState.error", "En erreur");
  }
  if (state === "done") {
    return safeT(t, "postprod.tasks.renderState.done", "Termine");
  }
  if (state === "canceled") {
    return safeT(t, "postprod.tasks.renderState.canceled", "Annule");
  }
  return safeT(t, "postprod.tasks.renderState.waiting", "En attente");
}

function autoRenderStateShortLabel(t, stateRaw) {
  const state = String(stateRaw || "").trim().toLowerCase();
  if (state === "running") return safeT(t, "postprod.renders.queue.state.short.running", "Rendu");
  if (state === "error") return safeT(t, "postprod.renders.queue.state.short.error", "Erreur");
  return safeT(t, "postprod.renders.queue.state.short.waiting", "En attente");
}

function autoRenderStateLevel(stateRaw) {
  const state = String(stateRaw || "").trim().toLowerCase();
  if (state === "error") return "error";
  if (state === "running") return "warn";
  return "info";
}

export {
  AUTO_RENDER_STATE_FLOW,
  AUTO_RENDER_STATE_PRIORITY,
  autoRenderStateFromRenderOrStatus,
  autoRenderStateLabel,
  autoRenderStateLevel,
  autoRenderStateShortLabel,
  isQueuedRenderWithError,
};

export default {
  AUTO_RENDER_STATE_FLOW,
  AUTO_RENDER_STATE_PRIORITY,
  autoRenderStateFromRenderOrStatus,
  autoRenderStateLabel,
  autoRenderStateLevel,
  autoRenderStateShortLabel,
  isQueuedRenderWithError,
};
