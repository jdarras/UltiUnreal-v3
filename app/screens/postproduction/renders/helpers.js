import { normalizeThumbnailPath } from "../../../utils/projects-helpers.js";
import { normalizeThumbCandidates, safeT } from "../shared/helpers.js";
import {
  normalizeRenderReviewStatus,
  renderReviewStatusClassName as sharedRenderReviewStatusClassName,
} from "../shared/reviewStatusHelpers.js";
import {
  autoRenderStateShortLabel,
  isQueuedRenderWithError,
} from "../shared/renderStateHelpers.js";

function isRenderQueuedWithError(render) {
  return isQueuedRenderWithError(render);
}

function renderReviewStatusKey(render) {
  const explicit = normalizeRenderReviewStatus(render?.reviewStatus);
  if (explicit) return explicit;
  const status = String(render?.status || "").trim().toLowerCase();
  if (status === "canceled" || status === "cancelled") return "canceled";
  if (status === "failed") return "to_modify";
  if (isRenderQueuedWithError(render)) return "to_modify";
  const validatedByUserId = Number(render?.validatedByUserId || 0);
  if (status === "done" && Number.isFinite(validatedByUserId) && validatedByUserId > 0) {
    return "validated";
  }
  return "to_validate";
}

function renderReviewStatusLabel(t, reviewStatus) {
  const key = normalizeRenderReviewStatus(reviewStatus) || String(reviewStatus || "").trim().toLowerCase();
  if (key === "validated") {
    return safeT(t, "postprod.renders.review.validated", "Validee");
  }
  if (key === "to_modify") {
    return safeT(t, "postprod.renders.review.toModify", "A modifier");
  }
  if (key === "canceled") {
    return safeT(t, "postprod.renders.review.canceled", "Annulee");
  }
  return safeT(t, "postprod.renders.review.toValidate", "A valider");
}

function renderReviewStatusClassName(reviewStatus = "") {
  return sharedRenderReviewStatusClassName(reviewStatus);
}

function renderOutputFilename(render) {
  const isTemplateToken = (value = "") => (
    /^\s*\{\{[^{}]+\}\}\s*$/i.test(String(value || "").trim())
  );
  const rawOutputPath = String(render?.outputPath || "").trim();
  if (rawOutputPath) {
    const parts = rawOutputPath.split(/[\\/]+/g).filter(Boolean);
    const fileName = String(parts[parts.length - 1] || "").trim();
    if (fileName && !isTemplateToken(fileName)) return fileName;
  }
  const matchedExpected = String(render?.matchedExpectedRenderName || "").trim();
  if (matchedExpected && !isTemplateToken(matchedExpected)) return matchedExpected;
  const templateName = String(render?.templateName || "").trim();
  if (templateName && !isTemplateToken(templateName)) return templateName;
  return "-";
}

function renderLinkedTaskValue(render) {
  const taskIdRaw = Number(render?.linkedTaskId || 0);
  const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
  const taskTitle = String(render?.linkedTaskTitle || "").trim();
  if (taskId > 0 && taskTitle) return `${taskTitle} (${taskId})`;
  if (taskId > 0) return String(taskId);
  return taskTitle;
}

function queueRenderStateShortLabel(t, state) {
  const normalized = String(state || "").trim().toLowerCase();
  if (normalized === "not_started") {
    return safeT(t, "postprod.renders.queue.state.short.notStarted", "Non lancé");
  }
  if (normalized === "to_modify") {
    return safeT(t, "postprod.renders.queue.state.short.toModify", "A modifier");
  }
  return autoRenderStateShortLabel(t, normalized);
}

function isImagePath(pathValue) {
  const path = String(pathValue || "").trim().toLowerCase();
  return /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(path);
}

function isVideoPath(pathValue) {
  const path = String(pathValue || "").trim().toLowerCase();
  return /\.(mp4|m4v|mov|webm|mkv|avi)$/i.test(path);
}

function swapPathExtension(pathValue, ext) {
  const raw = String(pathValue || "").trim();
  const nextExt = String(ext || "").trim();
  if (!raw || !nextExt) return "";
  if (/^data:/i.test(raw)) return "";
  const replaced = raw.replace(/(\.[a-z0-9]{2,6})(\?.*)?$/i, `${nextExt}$2`);
  if (replaced === raw) return "";
  return replaced;
}

function normalizeRenderMediaSource(pathValue) {
  return normalizeThumbnailPath(pathValue);
}

function buildRenderPreviewCandidates(render) {
  const payload = render?.payload && typeof render.payload === "object" && !Array.isArray(render.payload)
    ? render.payload
    : {};
  const outputPath = String(render?.outputPath || "").trim();
  const candidates = normalizeThumbCandidates([
    payload?.previewPath,
    payload?.previewVideoPath,
    payload?.proxyPath,
    payload?.proxyVideoPath,
    payload?.outputPreview,
    payload?.outputProxy,
    payload?.outputPath,
    outputPath,
    swapPathExtension(outputPath, ".mp4"),
    swapPathExtension(outputPath, ".webm"),
  ]);
  return normalizeThumbCandidates(
    candidates
      .map((entry) => normalizeRenderMediaSource(entry))
      .filter(Boolean)
  );
}

export {
  buildRenderPreviewCandidates,
  isImagePath,
  isVideoPath,
  queueRenderStateShortLabel,
  renderLinkedTaskValue,
  renderOutputFilename,
  renderReviewStatusKey,
  renderReviewStatusClassName,
  renderReviewStatusLabel,
};
