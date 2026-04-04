import { useState } from "react";
import { useDebouncedLocalStorage } from "../../shared/useDebouncedLocalStorage";
import { readStorageBoolean, readStorageJsonObject, readStorageString } from "../../shared/storage";

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

export function useTasksPreferences({ taskStatusFlow = [] } = {}) {
  const [viewMode, setViewMode] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.view).trim().toLowerCase();
    if (raw === "thumbs" || raw === "list") return raw;
    return "thumbs";
  });
  const [listSortKey, setListSortKey] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.listSortKey).trim();
    if (
      raw === "title"
      || raw === "status"
      || raw === "renderName"
      || raw === "renderWorker"
      || raw === "updatedAt"
    ) {
      return raw;
    }
    return "updatedAt";
  });
  const [listSortDir, setListSortDir] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.listSortDir).trim().toLowerCase();
    if (raw === "asc" || raw === "desc") return raw;
    return "desc";
  });
  const [searchQuery, setSearchQuery] = useState(() => readStorageString(STORAGE_KEYS.searchQuery));
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(() => readStorageBoolean(STORAGE_KEYS.favoriteOnly, false));
  const [taskFavorites, setTaskFavorites] = useState(() => readStorageJsonObject(STORAGE_KEYS.favorites, {}));
  const [listStatusFilter, setListStatusFilter] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.filterStatus).trim();
    if (raw === "all") return "all";
    if (raw === "__render_waiting" || raw === "__render_running" || raw === "__render_error") return raw;
    if (Array.isArray(taskStatusFlow) && taskStatusFlow.includes(raw)) return raw;
    return "all";
  });
  const [listRenderWorkerFilter, setListRenderWorkerFilter] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.filterRenderWorker).trim();
    if (!raw) return "all";
    if (raw === "all" || raw === "__auto") return raw;
    return raw;
  });
  const [listProjectFilter, setListProjectFilter] = useState(() => (
    readStorageString(STORAGE_KEYS.filterProject).trim() || "all"
  ));
  const [listFormFilter, setListFormFilter] = useState(() => (
    readStorageString(STORAGE_KEYS.filterForm).trim() || "all"
  ));
  const [listRenderModeFilter, setListRenderModeFilter] = useState(() => (
    readStorageString(STORAGE_KEYS.filterRenderMode).trim() || "all"
  ));
  const [listResourceFilter, setListResourceFilter] = useState(() => (
    readStorageString(STORAGE_KEYS.filterResource).trim() || "all"
  ));

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

  return {
    viewMode,
    setViewMode,
    listSortKey,
    setListSortKey,
    listSortDir,
    setListSortDir,
    searchQuery,
    setSearchQuery,
    searchExpanded,
    setSearchExpanded,
    favoriteOnly,
    setFavoriteOnly,
    taskFavorites,
    setTaskFavorites,
    listStatusFilter,
    setListStatusFilter,
    listRenderWorkerFilter,
    setListRenderWorkerFilter,
    listProjectFilter,
    setListProjectFilter,
    listFormFilter,
    setListFormFilter,
    listRenderModeFilter,
    setListRenderModeFilter,
    listResourceFilter,
    setListResourceFilter,
  };
}
