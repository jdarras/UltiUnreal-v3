import { normalizeThumbnailPath } from "../../../../../utils/projects-helpers";
import { normalizeThumbCandidates, safeT } from "../../../shared/helpers";
import { buildRenderPreviewCandidates, isImagePath, isVideoPath } from "../../helpers";

const EMPTY_PREVIEW_STATE = Object.freeze({ index: 0, error: "" });
const EMPTY_TRANSITIONS_STATE = Object.freeze({
  items: [],
  loading: false,
  error: "",
  loaded: false,
});

function toRenderId(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.trunc(numeric);
}

function resolveDetailRender(renders = [], detailRenderId = 0) {
  const renderId = toRenderId(detailRenderId);
  if (renderId <= 0) return null;
  const list = Array.isArray(renders) ? renders : [];
  return list.find((entry) => toRenderId(entry?.id) === renderId) || null;
}

function resolveDetailPreviewState(previewStateByRenderId = {}, detailRender = null) {
  const renderId = toRenderId(detailRender?.id);
  if (renderId <= 0) return EMPTY_PREVIEW_STATE;
  const state = previewStateByRenderId?.[renderId];
  if (!state || typeof state !== "object") return EMPTY_PREVIEW_STATE;
  return state;
}

function resolveDetailPreview({
  detailRender = null,
  detailPreviewState = EMPTY_PREVIEW_STATE,
} = {}) {
  const candidates = detailRender ? buildRenderPreviewCandidates(detailRender) : [];
  const detailPreviewIndexRaw = Number(detailPreviewState?.index || 0);
  const detailPreviewIndex = Number.isFinite(detailPreviewIndexRaw) && detailPreviewIndexRaw >= 0
    ? Math.min(Math.trunc(detailPreviewIndexRaw), Math.max(0, candidates.length - 1))
    : 0;
  const source = String(candidates[detailPreviewIndex] || "").trim();
  const kind = isVideoPath(source) ? "video" : (isImagePath(source) ? "image" : "none");
  const error = String(detailPreviewState?.error || "").trim();
  return {
    candidates,
    source,
    kind,
    error,
  };
}

function resolveDetailTransitionsState(renderTransitionsByRenderId = {}, detailRenderId = 0) {
  const renderId = toRenderId(detailRenderId);
  if (renderId <= 0) return EMPTY_TRANSITIONS_STATE;
  const state = renderTransitionsByRenderId?.[renderId];
  if (!state || typeof state !== "object") return EMPTY_TRANSITIONS_STATE;
  return state;
}

function buildPreviewStateOnOpen(previousState = {}, renderId = 0) {
  const normalizedRenderId = toRenderId(renderId);
  if (normalizedRenderId <= 0) return previousState || {};
  return {
    ...(previousState || {}),
    [normalizedRenderId]: { index: 0, error: "" },
  };
}

function buildPreviewStateAfterAdvance({
  previousState = {},
  renderId = 0,
  candidateCount = 0,
  unsupportedMessage = "",
} = {}) {
  const normalizedRenderId = toRenderId(renderId);
  if (normalizedRenderId <= 0) return previousState || {};
  const state = previousState || {};
  const current = (
    state?.[normalizedRenderId]
    && typeof state[normalizedRenderId] === "object"
  ) ? state[normalizedRenderId] : { index: 0, error: "" };
  const total = Number(candidateCount || 0);
  const nextIndex = Number(current.index || 0) + 1;
  if (nextIndex < total) {
    return {
      ...state,
      [normalizedRenderId]: { index: nextIndex, error: "" },
    };
  }
  return {
    ...state,
    [normalizedRenderId]: {
      index: Number(current.index || 0),
      error: String(unsupportedMessage || "").trim(),
    },
  };
}

function buildTransitionLoadError(t, error) {
  return String(error?.message || safeT(t, "postprod.renders.logs.error", "Impossible de charger les logs d'execution."));
}

function collectRenderThumbCandidates(render = null) {
  const payload = render?.payload && typeof render.payload === "object" && !Array.isArray(render.payload)
    ? render.payload
    : {};
  const candidates = normalizeThumbCandidates([
    payload?.thumbnailPath,
    payload?.thumbPath,
    payload?.previewPath,
    payload?.previewImage,
    payload?.imagePath,
    payload?.image,
    payload?.outputThumbnail,
    payload?.outputPreview,
  ]);
  const normalized = [];
  for (const entry of candidates) {
    const source = normalizeThumbnailPath(entry);
    if (source) normalized.push(source);
  }
  const outputPath = String(render?.outputPath || "").trim();
  if (outputPath && isImagePath(outputPath)) {
    const normalizedOutput = normalizeThumbnailPath(outputPath);
    if (normalizedOutput) normalized.push(normalizedOutput);
  }
  return normalizeThumbCandidates(normalized);
}

export {
  EMPTY_PREVIEW_STATE,
  EMPTY_TRANSITIONS_STATE,
  buildPreviewStateAfterAdvance,
  buildPreviewStateOnOpen,
  buildTransitionLoadError,
  collectRenderThumbCandidates,
  resolveDetailPreview,
  resolveDetailPreviewState,
  resolveDetailRender,
  resolveDetailTransitionsState,
  toRenderId,
};
