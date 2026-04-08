import { useMemo } from "react";
import { useFilteredRenders } from "./list/useFilteredRenders";
import { useRenderListSorting } from "./list/useRenderListSorting";
import { useRenderProjectFilterOptions } from "./list/useRenderProjectFilterOptions";
import { useRenderFavorites } from "./list/useRenderFavorites";
import { isDetectedRender } from "./list/renderListUtils";

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

  const { isRenderFavorite, toggleRenderFavorite } = useRenderFavorites({
    renderFavorites,
    setRenderFavorites,
  });

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
