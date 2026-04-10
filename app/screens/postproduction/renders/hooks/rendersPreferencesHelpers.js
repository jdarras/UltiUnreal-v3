import { useDebouncedLocalStorage } from "../../shared/useDebouncedLocalStorage";
import { readStorageJsonObject, readStorageString } from "../../shared/storage";

const STORAGE_KEYS = Object.freeze({
  view: "uu_postprod_renders_validation_view",
  listSortKey: "uu_postprod_renders_validation_list_sort_key",
  listSortDir: "uu_postprod_renders_validation_list_sort_dir",
  queueSortKey: "uu_postprod_renders_validation_queue_sort_key",
  queueSortDir: "uu_postprod_renders_validation_queue_sort_dir",
  searchQuery: "uu_postprod_renders_validation_search_query",
  reviewFilter: "uu_postprod_renders_validation_review_filter",
  projectFilter: "uu_postprod_renders_validation_project_filter",
  stationFilter: "uu_postprod_renders_validation_station_filter",
  favoriteOnly: "uu_postprod_renders_validation_favorite_only",
  favorites: "uu_postprod_renders_validation_favorites",
});

const REVIEW_FILTER_SET = new Set(["to_validate", "validated", "to_modify", "canceled"]);
const LIST_SORT_KEY_SET = new Set(["file", "project", "linkedTask", "requester", "station", "updatedAt", "reviewStatus"]);
const SORT_DIR_SET = new Set(["asc", "desc"]);
const QUEUE_SORT_KEY_SET = new Set(["task", "project", "template", "worker", "status", "priority"]);

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

function getInitialReviewFilter() {
  return readEnumLowerStorage(STORAGE_KEYS.reviewFilter, REVIEW_FILTER_SET, "all");
}

function getInitialProjectFilter() {
  return readStorageString(STORAGE_KEYS.projectFilter).trim().toLowerCase() || "all";
}

function getInitialStationFilter() {
  return readStorageString(STORAGE_KEYS.stationFilter).trim().toLowerCase() || "all";
}

function getInitialFavoriteOnly() {
  return readStorageString(STORAGE_KEYS.favoriteOnly).trim() === "true";
}

function getInitialRenderFavorites() {
  return readStorageJsonObject(STORAGE_KEYS.favorites, {});
}

function getInitialViewMode() {
  const raw = readStorageString(STORAGE_KEYS.view).trim().toLowerCase();
  if (raw === "thumbs" || raw === "list") return raw;
  if (raw === "cards") return "thumbs";
  return "thumbs";
}

function getInitialListSortKey() {
  return readEnumStorage(STORAGE_KEYS.listSortKey, LIST_SORT_KEY_SET, "updatedAt");
}

function getInitialListSortDir() {
  return readEnumLowerStorage(STORAGE_KEYS.listSortDir, SORT_DIR_SET, "desc");
}

function getInitialQueueSortKey() {
  return readEnumStorage(STORAGE_KEYS.queueSortKey, QUEUE_SORT_KEY_SET, "status");
}

function getInitialQueueSortDir() {
  return readEnumLowerStorage(STORAGE_KEYS.queueSortDir, SORT_DIR_SET, "asc");
}

function usePersistRendersPreferences({
  searchQuery = "",
  viewMode = "thumbs",
  reviewFilter = "all",
  projectFilter = "all",
  stationFilter = "all",
  favoriteOnly = false,
  renderFavorites = {},
  listSortKey = "updatedAt",
  listSortDir = "desc",
  queueSortKey = "status",
  queueSortDir = "asc",
} = {}) {
  useDebouncedLocalStorage(STORAGE_KEYS.searchQuery, String(searchQuery || ""), 280);
  useDebouncedLocalStorage(STORAGE_KEYS.view, String(viewMode || "thumbs"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.reviewFilter, String(reviewFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.projectFilter, String(projectFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.stationFilter, String(stationFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.favoriteOnly, favoriteOnly ? "true" : "false", 180);
  useDebouncedLocalStorage(STORAGE_KEYS.favorites, JSON.stringify(renderFavorites || {}), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortKey, String(listSortKey || "updatedAt"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortDir, String(listSortDir || "desc"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.queueSortKey, String(queueSortKey || "status"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.queueSortDir, String(queueSortDir || "asc"), 180);
}

export {
  getInitialFavoriteOnly,
  getInitialListSortDir,
  getInitialListSortKey,
  getInitialProjectFilter,
  getInitialStationFilter,
  getInitialQueueSortDir,
  getInitialQueueSortKey,
  getInitialRenderFavorites,
  getInitialReviewFilter,
  getInitialSearchQuery,
  getInitialViewMode,
  STORAGE_KEYS,
  usePersistRendersPreferences,
};
