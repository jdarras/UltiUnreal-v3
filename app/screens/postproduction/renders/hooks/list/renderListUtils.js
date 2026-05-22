import {
  renderLinkedTaskValue,
  renderOutputFilename,
  renderReviewStatusKey,
} from "../../helpers";
import { normalizeRenderReviewStatus } from "../../../shared/reviewStatusHelpers.js";
import { normalizeMultiFilterValues } from "../../../shared/filterValues";
import { toSortTimestamp } from "../../../shared/sortUtils";

export const RENDER_LIST_ALLOWED_SORT_KEYS = new Set([
  "updatedAt",
  "file",
  "project",
  "linkedTask",
  "requester",
  "station",
  "reviewStatus",
]);

const REVIEW_STATUS_RANK = {
  to_validate: 0,
  validated: 1,
  to_modify: 2,
  canceled: 3,
};

function resolveRenderPayload(render = null) {
  const payload = render?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  return payload;
}

function firstNonEmptyString(values = []) {
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

function normalizeFilterValue(value = "") {
  return String(value || "").trim().toLowerCase();
}

function simplifySequenceName(raw = "") {
  const source = String(raw || "").trim();
  if (!source) return "";
  const tail = source.split("/").filter(Boolean).pop() || source;
  const shortName = (tail.split(".")[0] || "").trim();
  return shortName || source;
}

export function resolveRenderProjectMeta(render = null) {
  const payload = resolveRenderPayload(render);
  const projectName = firstNonEmptyString([
    render?.projectName,
    payload?.projectName,
  ]);
  const projectRef = firstNonEmptyString([
    render?.projectId,
    render?.projectRef,
    payload?.projectId,
    payload?.projectRef,
  ]);
  const key = normalizeFilterValue(projectRef || projectName);
  const normalizedName = normalizeFilterValue(projectName);
  const normalizedRef = normalizeFilterValue(projectRef);
  const label = (
    projectName
    && projectRef
    && normalizedName
    && normalizedRef
    && normalizedName !== normalizedRef
  )
    ? `${projectName} [${projectRef}]`
    : (projectName || projectRef || "-");
  return { key, label, projectName, projectRef };
}

export function resolveRenderTaskMeta(render = null) {
  const payload = resolveRenderPayload(render);
  const taskIdRaw = Number(render?.linkedTaskId || payload?.taskId || 0);
  const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
  const taskTitle = firstNonEmptyString([
    render?.linkedTaskTitle,
    payload?.taskTitle,
  ]);
  const key = taskId > 0 ? `id:${taskId}` : normalizeFilterValue(taskTitle);
  const label = taskId > 0
    ? (taskTitle ? `${taskTitle} (${taskId})` : `(${taskId})`)
    : (taskTitle || "-");
  return { key, label, taskId, taskTitle };
}

export function resolveRenderFormMeta(render = null) {
  const payload = resolveRenderPayload(render);
  const formIdRaw = Number(
    render?.formId
    || render?.renderFormId
    || payload?.formId
    || payload?.renderFormId
    || 0
  );
  const formId = Number.isFinite(formIdRaw) && formIdRaw > 0 ? Math.trunc(formIdRaw) : 0;
  const formName = firstNonEmptyString([
    render?.formName,
    render?.renderFormName,
    payload?.formName,
    payload?.renderFormName,
    payload?.formLabel,
  ]);
  const key = formId > 0 ? `id:${formId}` : normalizeFilterValue(formName);
  const label = formId > 0
    ? (formName ? `${formName} (#${formId})` : `#${formId}`)
    : (formName || "-");
  return { key, label, formId, formName };
}

export function resolveRenderRequesterMeta(render = null) {
  const requester = firstNonEmptyString([
    render?.requestedByUsername,
    render?.requestedByDisplayName,
    render?.requestedBy,
  ]);
  return {
    key: normalizeFilterValue(requester),
    label: requester || "-",
    requester,
  };
}

export function resolveRenderStatusMeta(render = null) {
  const status = String(render?.status || "").trim();
  return {
    key: normalizeFilterValue(status),
    label: status || "-",
    status,
  };
}

export function resolveRenderStationMeta(render = null) {
  const name = firstNonEmptyString([
    render?.stationName,
    render?.renderStationName,
    render?.assignedWorkerName,
  ]);
  const fallbackStationKey = String(
    render?.assignedWorkerKey
    || render?.renderStation
    || ""
  ).trim();
  const stationLabel = name || (normalizeFilterValue(fallbackStationKey) === "local" ? "" : fallbackStationKey);
  return {
    key: normalizeFilterValue(stationLabel),
    label: stationLabel || "-",
    station: stationLabel,
  };
}

export function resolveRenderSequenceMeta(render = null) {
  const payload = resolveRenderPayload(render);
  const rawSequence = firstNonEmptyString([
    render?.sequenceName,
    payload?.sequenceName,
    payload?.levelSequence,
    payload?.levelSequenceName,
  ]);
  const sequenceName = simplifySequenceName(rawSequence);
  return {
    key: normalizeFilterValue(sequenceName),
    label: sequenceName || "-",
    sequenceName,
  };
}

export function buildRenderSearchHaystack(render) {
  const payload = resolveRenderPayload(render);
  const projectMeta = resolveRenderProjectMeta(render);
  const taskMeta = resolveRenderTaskMeta(render);
  const formMeta = resolveRenderFormMeta(render);
  const requesterMeta = resolveRenderRequesterMeta(render);
  const statusMeta = resolveRenderStatusMeta(render);
  const stationMeta = resolveRenderStationMeta(render);
  const sequenceMeta = resolveRenderSequenceMeta(render);
  return [
    renderOutputFilename(render),
    String(render?.templateName || ""),
    String(render?.projectName || ""),
    String(projectMeta?.projectRef || ""),
    String(projectMeta?.label || ""),
    String(render?.requestedByUsername || ""),
    String(requesterMeta?.label || ""),
    String(render?.outputPath || ""),
    renderLinkedTaskValue(render),
    String(taskMeta?.label || ""),
    String(render?.matchedExpectedRenderName || ""),
    String(render?.errorMessage || ""),
    String(render?.stationName || ""),
    String(render?.stationIp || ""),
    String(render?.stationStatus || ""),
    String(stationMeta?.label || ""),
    String(statusMeta?.status || ""),
    String(formMeta?.label || ""),
    String(sequenceMeta?.label || ""),
    String(payload?.sequenceName || ""),
  ]
    .join(" ")
    .toLowerCase();
}

function renderStationLabel(render) {
  const name = String(render?.stationName || "").trim();
  if (name) return name;
  const ip = String(render?.stationIp || "").trim();
  if (ip) return ip;
  return "-";
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
  if (listSortKey === "station") {
    return renderStationLabel(a).localeCompare(renderStationLabel(b), undefined, { sensitivity: "base" });
  }
  if (listSortKey === "reviewStatus") {
    const rankA = REVIEW_STATUS_RANK[normalizeRenderReviewStatus(renderReviewStatusKey(a))] ?? 999;
    const rankB = REVIEW_STATUS_RANK[normalizeRenderReviewStatus(renderReviewStatusKey(b))] ?? 999;
    return rankA - rankB;
  }
  return toSortTimestamp(a?.updatedAt) - toSortTimestamp(b?.updatedAt);
}

export {
  normalizeMultiFilterValues,
  toSortTimestamp,
};
