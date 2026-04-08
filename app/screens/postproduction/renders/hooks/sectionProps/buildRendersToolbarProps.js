import { buildProps } from "../../../shared/objectProps";

const DIRECT_KEYS = [
  "t",
  "rendersLoading",
  "onScanDetectedRenders",
  "listSortKey",
  "listSortDir",
  "searchQuery",
  "hasActiveFilters",
  "favoriteOnly",
  "viewMode",
  "searchExpanded",
  "projectFilter",
  "reviewFilter",
  "projectFilterOptions",
];

const ALIASES = {
  onSetListSortFromSelect: "setListSortFromSelect",
  onSetSearchQuery: "setSearchQuery",
  onClearFilters: "clearFilters",
  onOpenAdvancedSearch: "openAdvancedSearch",
  onToggleFavoriteOnly: "toggleFavoriteOnly",
  onSetViewMode: "setViewMode",
  onSetProjectFilter: "setProjectFilter",
  onSetReviewFilter: "setReviewFilter",
};

function buildToolbarProps(input = {}) {
  const openAdvancedSearch = input?.openAdvancedSearch;
  const closeAdvancedSearch = input?.closeAdvancedSearch;
  const sortedDisplayedRenders = input?.sortedDisplayedRenders;

  return {
    ...buildProps(input, {
      keys: DIRECT_KEYS,
      aliases: ALIASES,
    }),
    onSetSearchExpanded: (value) => {
      if (value) {
        if (typeof openAdvancedSearch === "function") openAdvancedSearch();
        return;
      }
      if (typeof closeAdvancedSearch === "function") closeAdvancedSearch();
    },
    sortedDisplayedRendersCount: Array.isArray(sortedDisplayedRenders) ? sortedDisplayedRenders.length : 0,
  };
}

export {
  buildToolbarProps,
};

export default buildToolbarProps;
