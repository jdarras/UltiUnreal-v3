import { useMemo } from "react";
import { useFilteredRenders } from "./list/useFilteredRenders";
import { useRenderListSorting } from "./list/useRenderListSorting";
import { useRenderProjectFilterOptions } from "./list/useRenderProjectFilterOptions";
import { useRenderStationFilterOptions } from "./list/useRenderStationFilterOptions";
import { useRenderFavorites } from "./list/useRenderFavorites";

export function useRendersListController({
  t,
  renders = [],
  searchQuery = "",
  reviewFilter = "all",
  projectFilter = "all",
  setProjectFilter = null,
  stationFilter = "all",
  setStationFilter = null,
  favoriteOnly = false,
  renderFavorites = {},
  setRenderFavorites = null,
  listSortKey = "updatedAt",
  listSortDir = "desc",
  setListSortKey = null,
  setListSortDir = null,
} = {}) {
  const renderJobs = useMemo(() => {
    return Array.isArray(renders) ? renders : [];
  }, [renders]);

  const { projectFilterOptions } = useRenderProjectFilterOptions({
    detectedRenders: renderJobs,
    projectFilter,
    setProjectFilter,
  });
  const { stationFilterOptions } = useRenderStationFilterOptions({
    t,
    renders: renderJobs,
    stationFilter,
    setStationFilter,
  });

  const { isRenderFavorite, toggleRenderFavorite } = useRenderFavorites({
    renderFavorites,
    setRenderFavorites,
  });

  const { displayedRenders, hasActiveFilters } = useFilteredRenders({
    detectedRenders: renderJobs,
    searchQuery,
    reviewFilter,
    projectFilter,
    stationFilter,
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
    stationFilterOptions,
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
