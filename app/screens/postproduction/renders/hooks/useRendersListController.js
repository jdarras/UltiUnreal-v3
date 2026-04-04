import { useCallback, useMemo } from "react";
import { useFilteredRenders } from "./list/useFilteredRenders";
import { useRenderListSorting } from "./list/useRenderListSorting";
import { useRenderProjectFilterOptions } from "./list/useRenderProjectFilterOptions";
import {
  isDetectedRender,
  renderFavoriteStorageKey,
} from "./list/renderListUtils";

export function useRendersListController({
  renders = [],
  searchQuery = "",
  reviewFilter = "all",
  projectFilter = "all",
  setProjectFilter = null,
  favoriteOnly = false,
  renderFavorites = {},
  setRenderFavorites = null,
  listSortKey = "updatedAt",
  listSortDir = "desc",
  setListSortKey = null,
  setListSortDir = null,
} = {}) {
  const detectedRenders = useMemo(() => {
    const list = Array.isArray(renders) ? renders : [];
    return list.filter((render) => isDetectedRender(render));
  }, [renders]);

  const { projectFilterOptions } = useRenderProjectFilterOptions({
    detectedRenders,
    projectFilter,
    setProjectFilter,
  });

  const renderFavoriteKey = useCallback((render) => {
    return renderFavoriteStorageKey(render);
  }, []);

  const isRenderFavorite = useCallback((render) => {
    const key = renderFavoriteKey(render);
    if (!key) return false;
    return !!renderFavorites?.[key];
  }, [renderFavoriteKey, renderFavorites]);

  const toggleRenderFavorite = useCallback((render) => {
    const key = renderFavoriteKey(render);
    if (!key || typeof setRenderFavorites !== "function") return;
    setRenderFavorites((prev) => {
      const current = prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {};
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: true };
    });
  }, [renderFavoriteKey, setRenderFavorites]);

  const { displayedRenders, hasActiveFilters } = useFilteredRenders({
    detectedRenders,
    searchQuery,
    reviewFilter,
    projectFilter,
    favoriteOnly,
    isRenderFavorite,
  });

  const {
    sortedDisplayedRenders,
    listSortIndicator,
    toggleListSort,
    setListSortFromSelect,
  } = useRenderListSorting({
    displayedRenders,
    listSortKey,
    listSortDir,
    setListSortKey,
    setListSortDir,
  });

  return {
    projectFilterOptions,
    hasActiveFilters,
    sortedDisplayedRenders,
    isRenderFavorite,
    toggleRenderFavorite,
    listSortIndicator,
    toggleListSort,
    setListSortFromSelect,
  };
}

export default useRendersListController;
