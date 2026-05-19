import { useDebouncedLocalStorage } from "../../shared/useDebouncedLocalStorage";
import {
  readStorageBoolean,
  readStorageJsonObject,
  readStorageString,
} from "../../shared/storage";
import { normalizeMultiFilterValues } from "../../shared/filterValues";
import {
  readEnumLowerStorage,
  readEnumStorage,
  readMultiFilterStorage,
  serializeMultiFilterStorage,
} from "../../shared/preferencesStorage";

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
const SORT_DIR_SET = new Set(["asc", "desc"]);

function getInitialViewMode() {
  const raw = readStorageString(STORAGE_KEYS.view).trim().toLowerCase();
  if (raw === "thumbs" || raw === "list") return raw;
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
  return readMultiFilterStorage(STORAGE_KEYS.filterRenderWorker);
}

function getInitialProjectFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.filterProject);
}

function getInitialFormFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.filterForm);
}

function getInitialRenderModeFilter() {
  return readMultiFilterStorage(STORAGE_KEYS.filterRenderMode);
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
  useDebouncedLocalStorage(STORAGE_KEYS.filterStatus, serializeMultiFilterStorage(listStatusFilter), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterRenderWorker, serializeMultiFilterStorage(listRenderWorkerFilter), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterProject, serializeMultiFilterStorage(listProjectFilter), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterForm, serializeMultiFilterStorage(listFormFilter), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterRenderMode, serializeMultiFilterStorage(listRenderModeFilter), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterResource, String(listResourceFilter || "all"), 180);
}

export {
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
  usePersistRenderEditorPreferences,
};
