import { useCallback } from "react";

function useRendersToolbarActions({
  setSearchQuery = null,
  setProjectFilter = null,
  setStationFilter = null,
  setReviewFilter = null,
  setTaskFilter = null,
  setFormFilter = null,
  setRequesterFilter = null,
  setStatusFilter = null,
  setSequenceFilter = null,
  setSearchExpanded = null,
}) {
  const clearFilters = useCallback(() => {
    setSearchQuery?.("");
    setProjectFilter?.([]);
    setStationFilter?.([]);
    setReviewFilter?.([]);
    setTaskFilter?.([]);
    setFormFilter?.([]);
    setRequesterFilter?.([]);
    setStatusFilter?.([]);
    setSequenceFilter?.([]);
    setSearchExpanded?.(false);
  }, [
    setSearchQuery,
    setProjectFilter,
    setStationFilter,
    setReviewFilter,
    setTaskFilter,
    setFormFilter,
    setRequesterFilter,
    setStatusFilter,
    setSequenceFilter,
    setSearchExpanded,
  ]);

  const openAdvancedSearch = useCallback(() => {
    setSearchExpanded?.(true);
  }, [setSearchExpanded]);

  const closeAdvancedSearch = useCallback(() => {
    setSearchExpanded?.(false);
  }, [setSearchExpanded]);

  return {
    clearFilters,
    openAdvancedSearch,
    closeAdvancedSearch,
  };
}

export { useRendersToolbarActions };
