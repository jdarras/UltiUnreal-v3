import { useDebouncedLocalStorage } from "../../shared/useDebouncedLocalStorage";
import {
  readStorageBoolean,
  readStorageJsonObject,
  readStorageString,
} from "../../shared/storage";

const STORAGE_KEYS = Object.freeze({
  view: "uu_postprod_tasks_view",
  showHistory: "uu_postprod_tasks_show_history",
  searchQuery: "uu_postprod_tasks_search_query",
  listSortKey: "uu_postprod_tasks_list_sort_key",
  listSortDir: "uu_postprod_tasks_list_sort_dir",
  filterStatus: "uu_postprod_tasks_filter_status",
  filterRenderWorker: "uu_postprod_tasks_filter_render_worker",
  filterProject: "uu_postprod_tasks_filter_project",
  filterForm: "uu_postprod_tasks_filter_form",
  filterRenderMode: "uu_postprod_tasks_filter_render_mode",
  filterResource: "uu_postprod_tasks_filter_resource",
  favorites: "uu_postprod_tasks_favorites",
  favoriteOnly: "uu_postprod_tasks_favorite_only",
});

const LIST_SORT_KEY_SET = new Set([
  "title",
  "status",
  "renderName",
  "renderWorker",
  "updatedAt",
]);

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

function getInitialViewMode() {
  const raw = readStorageString(STORAGE_KEYS.view).trim().toLowerCase();
  if (raw === "thumbs" || raw === "list") return raw;
  return "thumbs";
}

function getInitialShowHistory() {
  return readStorageBoolean(STORAGE_KEYS.showHistory, false);
}

function getInitialListSortKey() {
  const raw = readStorageString(STORAGE_KEYS.listSortKey).trim();
  if (LIST_SORT_KEY_SET.has(raw)) return raw;
  return "updatedAt";
}

function getInitialListSortDir() {
  const raw = readStorageString(STORAGE_KEYS.listSortDir).trim().toLowerCase();
  if (raw === "asc" || raw === "desc") return raw;
  return "desc";
}

function getInitialSearchQuery() {
  return readStorageString(STORAGE_KEYS.searchQuery);
}

function getInitialFavoriteOnly() {
  return readStorageBoolean(STORAGE_KEYS.favoriteOnly, false);
}

function getInitialTaskFavorites() {
  return readStorageJsonObject(STORAGE_KEYS.favorites, {});
}

function getInitialListStatusFilter(taskStatusFlow = []) {
  const raw = readStorageString(STORAGE_KEYS.filterStatus).trim();
  if (!raw || raw.toLowerCase() === "all") return [];
  const legacyMap = {
    __render_waiting: "waiting",
    __render_running: "running",
    __render_error: "error",
    Planifiee: "planned",
    "A faire": "waiting",
    "En cours": "running",
    "A valider": "to_validate",
    Validee: "validated",
    Rejetee: "rejected",
  };
  try {
    const parsed = JSON.parse(raw);
    const normalizedList = normalizeMultiFilterValues(
      (Array.isArray(parsed) ? parsed : []).map((entry) => (
        legacyMap[String(entry || "").trim()] || entry
      ))
    );
    if (!Array.isArray(taskStatusFlow) || taskStatusFlow.length <= 0) return normalizedList;
    return normalizedList.filter((entry) => taskStatusFlow.includes(entry));
  } catch {}
  const normalized = String(legacyMap[raw] || raw).trim().toLowerCase();
  if (Array.isArray(taskStatusFlow) && taskStatusFlow.includes(normalized)) return [normalized];
  return [];
}

function getInitialListRenderWorkerFilter() {
  const raw = readStorageString(STORAGE_KEYS.filterRenderWorker).trim();
  if (!raw || raw.toLowerCase() === "all") return [];
  try {
    const parsed = JSON.parse(raw);
    return normalizeMultiFilterValues(Array.isArray(parsed) ? parsed : []);
  } catch {}
  return normalizeMultiFilterValues([raw]);
}

function getInitialProjectFilter() {
  const raw = readStorageString(STORAGE_KEYS.filterProject).trim();
  if (!raw || raw.toLowerCase() === "all") return [];
  try {
    const parsed = JSON.parse(raw);
    return normalizeMultiFilterValues(Array.isArray(parsed) ? parsed : []);
  } catch {}
  return normalizeMultiFilterValues([raw]);
}

function getInitialFormFilter() {
  const raw = readStorageString(STORAGE_KEYS.filterForm).trim();
  if (!raw || raw.toLowerCase() === "all") return [];
  try {
    const parsed = JSON.parse(raw);
    return normalizeMultiFilterValues(Array.isArray(parsed) ? parsed : []);
  } catch {}
  return normalizeMultiFilterValues([raw]);
}

function getInitialRenderModeFilter() {
  const raw = readStorageString(STORAGE_KEYS.filterRenderMode).trim();
  if (!raw || raw.toLowerCase() === "all") return [];
  try {
    const parsed = JSON.parse(raw);
    return normalizeMultiFilterValues(Array.isArray(parsed) ? parsed : []);
  } catch {}
  return normalizeMultiFilterValues([raw]);
}

function getInitialResourceFilter() {
  return readStorageString(STORAGE_KEYS.filterResource).trim() || "all";
}

function usePersistRenderEditorPreferences({
  viewMode,
  showHistory = false,
  searchQuery,
  favoriteOnly,
  taskFavorites,
  listSortKey,
  listSortDir,
  listStatusFilter = [],
  listRenderWorkerFilter = [],
  listProjectFilter = [],
  listFormFilter = [],
  listRenderModeFilter = [],
  listResourceFilter,
} = {}) {
  useDebouncedLocalStorage(STORAGE_KEYS.view, String(viewMode || "thumbs"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.showHistory, showHistory ? "true" : "false", 180);
  useDebouncedLocalStorage(STORAGE_KEYS.searchQuery, String(searchQuery || ""), 280);
  useDebouncedLocalStorage(STORAGE_KEYS.favoriteOnly, favoriteOnly ? "true" : "false", 180);
  useDebouncedLocalStorage(STORAGE_KEYS.favorites, JSON.stringify(taskFavorites || {}), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortKey, String(listSortKey || "updatedAt"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortDir, String(listSortDir || "desc"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterStatus, JSON.stringify(normalizeMultiFilterValues(listStatusFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterRenderWorker, JSON.stringify(normalizeMultiFilterValues(listRenderWorkerFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterProject, JSON.stringify(normalizeMultiFilterValues(listProjectFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterForm, JSON.stringify(normalizeMultiFilterValues(listFormFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterRenderMode, JSON.stringify(normalizeMultiFilterValues(listRenderModeFilter)), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterResource, String(listResourceFilter || "all"), 180);
}

export {
  STORAGE_KEYS,
  getInitialViewMode,
  getInitialShowHistory,
  getInitialListSortKey,
  getInitialListSortDir,
  getInitialSearchQuery,
  getInitialFavoriteOnly,
  getInitialTaskFavorites,
  getInitialListStatusFilter,
  getInitialListRenderWorkerFilter,
  getInitialProjectFilter,
  getInitialFormFilter,
  getInitialRenderModeFilter,
  getInitialResourceFilter,
  normalizeMultiFilterValues,
  usePersistRenderEditorPreferences,
};

export default usePersistRenderEditorPreferences;
