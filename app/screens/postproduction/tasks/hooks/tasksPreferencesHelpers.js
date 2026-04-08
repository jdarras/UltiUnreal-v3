import { useDebouncedLocalStorage } from "../../shared/useDebouncedLocalStorage";
import {
  readStorageBoolean,
  readStorageJsonObject,
  readStorageString,
} from "../../shared/storage";

const STORAGE_KEYS = Object.freeze({
  view: "uu_postprod_tasks_view",
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

function getInitialViewMode() {
  const raw = readStorageString(STORAGE_KEYS.view).trim().toLowerCase();
  if (raw === "thumbs" || raw === "list") return raw;
  return "thumbs";
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
  if (raw === "all") return "all";
  if (raw === "__render_waiting" || raw === "__render_running" || raw === "__render_error") return raw;
  if (Array.isArray(taskStatusFlow) && taskStatusFlow.includes(raw)) return raw;
  return "all";
}

function getInitialListRenderWorkerFilter() {
  const raw = readStorageString(STORAGE_KEYS.filterRenderWorker).trim();
  if (!raw) return "all";
  if (raw === "all" || raw === "__auto") return raw;
  return raw;
}

function getInitialProjectFilter() {
  return readStorageString(STORAGE_KEYS.filterProject).trim() || "all";
}

function getInitialFormFilter() {
  return readStorageString(STORAGE_KEYS.filterForm).trim() || "all";
}

function getInitialRenderModeFilter() {
  return readStorageString(STORAGE_KEYS.filterRenderMode).trim() || "all";
}

function getInitialResourceFilter() {
  return readStorageString(STORAGE_KEYS.filterResource).trim() || "all";
}

function usePersistTasksPreferences({
  viewMode,
  searchQuery,
  favoriteOnly,
  taskFavorites,
  listSortKey,
  listSortDir,
  listStatusFilter,
  listRenderWorkerFilter,
  listProjectFilter,
  listFormFilter,
  listRenderModeFilter,
  listResourceFilter,
} = {}) {
  useDebouncedLocalStorage(STORAGE_KEYS.view, String(viewMode || "thumbs"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.searchQuery, String(searchQuery || ""), 280);
  useDebouncedLocalStorage(STORAGE_KEYS.favoriteOnly, favoriteOnly ? "true" : "false", 180);
  useDebouncedLocalStorage(STORAGE_KEYS.favorites, JSON.stringify(taskFavorites || {}), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortKey, String(listSortKey || "updatedAt"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortDir, String(listSortDir || "desc"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterStatus, String(listStatusFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterRenderWorker, String(listRenderWorkerFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterProject, String(listProjectFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterForm, String(listFormFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterRenderMode, String(listRenderModeFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.filterResource, String(listResourceFilter || "all"), 180);
}

export {
  STORAGE_KEYS,
  getInitialViewMode,
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
  usePersistTasksPreferences,
};

export default usePersistTasksPreferences;
