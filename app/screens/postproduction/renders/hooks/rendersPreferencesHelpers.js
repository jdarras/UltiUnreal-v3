import { useDebouncedLocalStorage } from "../../shared/useDebouncedLocalStorage";
import { readStorageBoolean, readStorageString } from "../../shared/storage";

const STORAGE_KEYS = Object.freeze({
  view: "uu_postprod_renders_validation_view",
  showHistory: "uu_postprod_renders_validation_show_history",
  listSortKey: "uu_postprod_renders_validation_list_sort_key",
  listSortDir: "uu_postprod_renders_validation_list_sort_dir",
  queueSortKey: "uu_postprod_renders_validation_queue_sort_key",
  queueSortDir: "uu_postprod_renders_validation_queue_sort_dir",
  queueRuntimeMode: "uu_postprod_renders_validation_queue_runtime_mode",
  searchQuery: "uu_postprod_renders_validation_search_query",
  reviewFilter: "uu_postprod_renders_validation_review_filter",
  projectFilter: "uu_postprod_renders_validation_project_filter",
  stationFilter: "uu_postprod_renders_validation_station_filter",
  taskFilter: "uu_postprod_renders_validation_task_filter",
  formFilter: "uu_postprod_renders_validation_form_filter",
  requesterFilter: "uu_postprod_renders_validation_requester_filter",
  statusFilter: "uu_postprod_renders_validation_status_filter",
  sequenceFilter: "uu_postprod_renders_validation_sequence_filter",
});

const LIST_SORT_KEY_SET = new Set(["file", "project", "linkedTask", "requester", "station", "updatedAt", "reviewStatus"]);
const SORT_DIR_SET = new Set(["asc", "desc"]);
const QUEUE_SORT_KEY_SET = new Set(["startAt", "task", "sequence", "worker", "status"]);
const QUEUE_RUNTIME_MODE_SET = new Set(["active", "paused"]);

function normalizeMultiFilterValues(value = []) {
  const source = Array.isArray(value) ? value : [value];
  const seen = new Set();
  const out = [];
  for (const entry of source) {
    const normalized = String(entry || "").trim().toLowerCase();
    if (!normalized || normalized === "all" || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function readEnumLowerStorage(key, allowedSet, fallback) {
  const raw = readStorageString(key).trim().toLowerCase();
  return allowedSet.has(raw) ? raw : fallback;
}

function readEnumStorage(key, allowedSet, fallback) {
  const raw = readStorageString(key).trim();
  return allowedSet.has(raw) ? raw : fallback;
}

function getInitialSearchQuery() {
  return readStorageString(STORAGE_KEYS.searchQuery);
}

function readMultiFilterStorage(key) {
  const raw = readStorageString(key).trim();
  if (!raw || raw.toLowerCase() === "all") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return normalizeMultiFilterValues(parsed);
  } catch {}
  return normalizeMultiFilterValues([raw]);
}

function getInitialReviewFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.reviewFilter);
}

function getInitialProjectFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.projectFilter);
}

function getInitialStationFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.stationFilter);
}

function getInitialTaskFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.taskFilter);
}

function getInitialFormFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.formFilter);
}

function getInitialRequesterFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.requesterFilter);
}

function getInitialStatusFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.statusFilter);
}

function getInitialSequenceFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.sequenceFilter);
}

function getInitialViewMode() {
  const raw = readStorageString(STORAGE_KEYS.view).trim().toLowerCase();
  if (raw === "thumbs" || raw === "list") return raw;
  if (raw === "cards") return "thumbs";
  return "thumbs";
}

function getInitialShowHistory() {
  return readStorageBoolean(STORAGE_KEYS.showHistory, false);
}

function getInitialListSortKey() {
  return readEnumStorage(STORAGE_KEYS.listSortKey, LIST_SORT_KEY_SET, "updatedAt");
}

function getInitialListSortDir() {
  return readEnumLowerStorage(STORAGE_KEYS.listSortDir, SORT_DIR_SET, "desc");
}

function getInitialQueueSortKey() {
  return readEnumStorage(STORAGE_KEYS.queueSortKey, QUEUE_SORT_KEY_SET, "startAt");
}

function getInitialQueueSortDir() {
  return readEnumLowerStorage(STORAGE_KEYS.queueSortDir, SORT_DIR_SET, "asc");
}

function getInitialQueueRuntimeMode() {
  return readEnumLowerStorage(STORAGE_KEYS.queueRuntimeMode, QUEUE_RUNTIME_MODE_SET, "active");
}

function usePersistRendersPreferences({
  searchQuery = "",
  viewMode = "thumbs",
  showHistory = false,
  reviewFilter = [],
  projectFilter = [],
  stationFilter = [],
  taskFilter = [],
  formFilter = [],
  requesterFilter = [],
  statusFilter = [],
  sequenceFilter = [],
  listSortKey = "updatedAt",
  listSortDir = "desc",
  queueSortKey = "startAt",
  queueSortDir = "asc",
  queueRuntimeMode = "active",
} = {}) {
  useDebouncedLocalStorage(STORAGE_KEYS.searchQuery, String(searchQuery || ""), 280);
  useDebouncedLocalStorage(STORAGE_KEYS.view, String(viewMode || "thumbs"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.showHistory, showHistory ? "true" : "false", 180);
  useDebouncedLocalStorage(STORAGE_KEYS.reviewFilter, JSON.stringify(normalizeMultiFilterValues(reviewFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.projectFilter, JSON.stringify(normalizeMultiFilterValues(projectFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.stationFilter, JSON.stringify(normalizeMultiFilterValues(stationFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.taskFilter, JSON.stringify(normalizeMultiFilterValues(taskFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.formFilter, JSON.stringify(normalizeMultiFilterValues(formFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.requesterFilter, JSON.stringify(normalizeMultiFilterValues(requesterFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.statusFilter, JSON.stringify(normalizeMultiFilterValues(statusFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.sequenceFilter, JSON.stringify(normalizeMultiFilterValues(sequenceFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortKey, String(listSortKey || "updatedAt"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortDir, String(listSortDir || "desc"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.queueSortKey, String(queueSortKey || "startAt"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.queueSortDir, String(queueSortDir || "asc"), 180);
  useDebouncedLocalStorage(
    STORAGE_KEYS.queueRuntimeMode,
    QUEUE_RUNTIME_MODE_SET.has(String(queueRuntimeMode || "").trim().toLowerCase())
      ? String(queueRuntimeMode).trim().toLowerCase()
      : "active",
    180
  );
}

export {
  getInitialFormFilter,
  getInitialListSortDir,
  getInitialListSortKey,
  getInitialProjectFilter,
  getInitialRequesterFilter,
  getInitialStationFilter,
  getInitialStatusFilter,
  getInitialTaskFilter,
  getInitialQueueSortDir,
  getInitialQueueSortKey,
  getInitialQueueRuntimeMode,
  getInitialReviewFilter,
  getInitialSequenceFilter,
  getInitialSearchQuery,
  getInitialShowHistory,
  getInitialViewMode,
  normalizeMultiFilterValues,
  STORAGE_KEYS,
  usePersistRendersPreferences,
};
