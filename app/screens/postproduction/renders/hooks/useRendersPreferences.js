import { useState } from "react";
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
  favoriteOnly: "uu_postprod_renders_validation_favorite_only",
  favorites: "uu_postprod_renders_validation_favorites",
});

export function useRendersPreferences() {
  const [searchQuery, setSearchQuery] = useState(() => readStorageString(STORAGE_KEYS.searchQuery));
  const [reviewFilter, setReviewFilter] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.reviewFilter).trim().toLowerCase();
    if (raw === "to_validate" || raw === "validated" || raw === "to_modify" || raw === "canceled") return raw;
    return "all";
  });
  const [projectFilter, setProjectFilter] = useState(() => (
    readStorageString(STORAGE_KEYS.projectFilter).trim().toLowerCase() || "all"
  ));
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(() => (
    readStorageString(STORAGE_KEYS.favoriteOnly).trim() === "true"
  ));
  const [renderFavorites, setRenderFavorites] = useState(() => readStorageJsonObject(STORAGE_KEYS.favorites, {}));
  const [viewMode, setViewMode] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.view).trim().toLowerCase();
    if (raw === "thumbs" || raw === "list") return raw;
    if (raw === "cards") return "thumbs";
    return "thumbs";
  });
  const [listSortKey, setListSortKey] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.listSortKey).trim();
    if (
      raw === "file"
      || raw === "project"
      || raw === "linkedTask"
      || raw === "requester"
      || raw === "updatedAt"
      || raw === "reviewStatus"
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
  const [queueSortKey, setQueueSortKey] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.queueSortKey).trim();
    if (
      raw === "task"
      || raw === "project"
      || raw === "template"
      || raw === "worker"
      || raw === "status"
      || raw === "priority"
    ) {
      return raw;
    }
    return "status";
  });
  const [queueSortDir, setQueueSortDir] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.queueSortDir).trim().toLowerCase();
    if (raw === "asc" || raw === "desc") return raw;
    return "asc";
  });

  useDebouncedLocalStorage(STORAGE_KEYS.searchQuery, String(searchQuery || ""), 280);
  useDebouncedLocalStorage(STORAGE_KEYS.view, String(viewMode || "thumbs"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.reviewFilter, String(reviewFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.projectFilter, String(projectFilter || "all"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.favoriteOnly, favoriteOnly ? "true" : "false", 180);
  useDebouncedLocalStorage(STORAGE_KEYS.favorites, JSON.stringify(renderFavorites || {}), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortKey, String(listSortKey || "updatedAt"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortDir, String(listSortDir || "desc"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.queueSortKey, String(queueSortKey || "status"), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.queueSortDir, String(queueSortDir || "asc"), 180);

  return {
    searchQuery,
    setSearchQuery,
    reviewFilter,
    setReviewFilter,
    projectFilter,
    setProjectFilter,
    searchExpanded,
    setSearchExpanded,
    favoriteOnly,
    setFavoriteOnly,
    renderFavorites,
    setRenderFavorites,
    viewMode,
    setViewMode,
    listSortKey,
    setListSortKey,
    listSortDir,
    setListSortDir,
    queueSortKey,
    setQueueSortKey,
    queueSortDir,
    setQueueSortDir,
  };
}
