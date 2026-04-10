import { useCallback } from "react";

function useRendersToolbarActions({
  setSearchQuery = null,
  setProjectFilter = null,
  setStationFilter = null,
  setReviewFilter = null,
  setFavoriteOnly = null,
  setSearchExpanded = null,
}) {
  const clearFilters = useCallback(() => {
    setSearchQuery?.("");
    setProjectFilter?.("all");
    setStationFilter?.("all");
    setReviewFilter?.("all");
    setFavoriteOnly?.(false);
    setSearchExpanded?.(false);
  }, [setSearchQuery, setProjectFilter, setStationFilter, setReviewFilter, setFavoriteOnly, setSearchExpanded]);

  const openAdvancedSearch = useCallback(() => {
    setSearchExpanded?.(true);
  }, [setSearchExpanded]);

  const closeAdvancedSearch = useCallback(() => {
    setSearchExpanded?.(false);
  }, [setSearchExpanded]);

  const toggleFavoriteOnly = useCallback(() => {
    setFavoriteOnly?.((prev) => !prev);
  }, [setFavoriteOnly]);

  return {
    clearFilters,
    openAdvancedSearch,
    closeAdvancedSearch,
    toggleFavoriteOnly,
  };
}

export { useRendersToolbarActions };
