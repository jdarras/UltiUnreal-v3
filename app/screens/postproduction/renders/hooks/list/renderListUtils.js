import {
  renderLinkedTaskValue,
  renderOutputFilename,
  renderReviewStatusKey,
} from "../../helpers";
import { toSortTimestamp } from "../../../shared/sortUtils";

export const RENDER_LIST_ALLOWED_SORT_KEYS = new Set([
  "updatedAt",
  "file",
  "project",
  "linkedTask",
  "requester",
  "reviewStatus",
]);

const REVIEW_STATUS_RANK = {
  to_validate: 0,
  validated: 1,
  to_modify: 2,
  canceled: 3,
};

export function isDetectedRender(render) {
  return String(render?.origin || "").trim().toLowerCase() === "detected";
}

export function buildProjectFilterOptions(renders = []) {
  const map = new Map();
  const list = Array.isArray(renders) ? renders : [];
  for (const render of list) {
    const raw = String(render?.projectName || "").trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!map.has(key)) map.set(key, raw);
  }
  return [...map.entries()]
    .sort((a, b) => String(a[1] || "").localeCompare(String(b[1] || "")))
    .map(([key, label]) => ({ key, label }));
}

export function renderFavoriteStorageKey(render) {
  const renderId = Number(render?.id || 0);
  if (Number.isFinite(renderId) && renderId > 0) return `render:${Math.trunc(renderId)}`;
  const projectName = String(render?.projectName || "").trim().toLowerCase();
  const fileName = String(renderOutputFilename(render) || "").trim().toLowerCase();
  const outputPath = String(render?.outputPath || "").trim().toLowerCase();
  return `render:${projectName}|${fileName}|${outputPath}`;
}

export function buildRenderSearchHaystack(render) {
  return [
    renderOutputFilename(render),
    String(render?.templateName || ""),
    String(render?.projectName || ""),
    String(render?.requestedByUsername || ""),
    String(render?.outputPath || ""),
    renderLinkedTaskValue(render),
    String(render?.matchedExpectedRenderName || ""),
    String(render?.errorMessage || ""),
  ]
    .join(" ")
    .toLowerCase();
}

export function compareRendersBySortKey(a, b, listSortKey) {
  if (listSortKey === "file") {
    return renderOutputFilename(a).localeCompare(renderOutputFilename(b), undefined, { sensitivity: "base" });
  }
  if (listSortKey === "project") {
    return String(a?.projectName || "").localeCompare(String(b?.projectName || ""), undefined, { sensitivity: "base" });
  }
  if (listSortKey === "linkedTask") {
    return String(renderLinkedTaskValue(a) || "").localeCompare(String(renderLinkedTaskValue(b) || ""), undefined, { sensitivity: "base" });
  }
  if (listSortKey === "requester") {
    return String(a?.requestedByUsername || "").localeCompare(String(b?.requestedByUsername || ""), undefined, { sensitivity: "base" });
  }
  if (listSortKey === "reviewStatus") {
    const rankA = REVIEW_STATUS_RANK[renderReviewStatusKey(a)] ?? 999;
    const rankB = REVIEW_STATUS_RANK[renderReviewStatusKey(b)] ?? 999;
    return rankA - rankB;
  }
  return toSortTimestamp(a?.updatedAt) - toSortTimestamp(b?.updatedAt);
}

export { toSortTimestamp };
