function buildToolbarProps({
  t,
  rendersLoading = false,
  onScanDetectedRenders = null,
  listSortKey = "",
  listSortDir = "",
  setListSortFromSelect = null,
  searchQuery = "",
  setSearchQuery = null,
  hasActiveFilters = false,
  clearFilters = null,
  openAdvancedSearch = null,
  favoriteOnly = false,
  toggleFavoriteOnly = null,
  viewMode = "thumbs",
  setViewMode = null,
  searchExpanded = false,
  closeAdvancedSearch = null,
  sortedDisplayedRenders = [],
  projectFilter = "all",
  setProjectFilter = null,
  reviewFilter = "all",
  setReviewFilter = null,
  projectFilterOptions = [],
} = {}) {
  return {
    t,
    rendersLoading,
    onScanDetectedRenders,
    listSortKey,
    listSortDir,
    onSetListSortFromSelect: setListSortFromSelect,
    searchQuery,
    onSetSearchQuery: setSearchQuery,
    hasActiveFilters,
    onClearFilters: clearFilters,
    onOpenAdvancedSearch: openAdvancedSearch,
    favoriteOnly,
    onToggleFavoriteOnly: toggleFavoriteOnly,
    viewMode,
    onSetViewMode: setViewMode,
    searchExpanded,
    onSetSearchExpanded: (value) => {
      if (value) {
        if (typeof openAdvancedSearch === "function") openAdvancedSearch();
        return;
      }
      if (typeof closeAdvancedSearch === "function") closeAdvancedSearch();
    },
    sortedDisplayedRendersCount: Array.isArray(sortedDisplayedRenders) ? sortedDisplayedRenders.length : 0,
    projectFilter,
    onSetProjectFilter: setProjectFilter,
    reviewFilter,
    onSetReviewFilter: setReviewFilter,
    projectFilterOptions,
  };
}

export {
  buildToolbarProps,
};

export default buildToolbarProps;

