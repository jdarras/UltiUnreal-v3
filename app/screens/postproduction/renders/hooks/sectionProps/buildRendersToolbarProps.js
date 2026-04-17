import { buildProps } from "../../../shared/objectProps";

const DIRECT_KEYS = [
  "t",
  "rendersLoading",
  "onScanDetectedRenders",
  "listSortKey",
  "listSortDir",
  "searchQuery",
  "hasActiveFilters",
  "viewMode",
  "searchExpanded",
  "projectFilter",
  "stationFilter",
  "reviewFilter",
  "taskFilter",
  "formFilter",
  "requesterFilter",
  "statusFilter",
  "sequenceFilter",
  "projectFilterOptions",
  "reviewFilterOptions",
  "stationFilterOptions",
  "taskFilterOptions",
  "formFilterOptions",
  "requesterFilterOptions",
  "statusFilterOptions",
  "sequenceFilterOptions",
];

const ALIASES = {
  onSetListSortFromSelect: "setListSortFromSelect",
  onSetSearchQuery: "setSearchQuery",
  onClearFilters: "clearFilters",
  onOpenAdvancedSearch: "openAdvancedSearch",
  onSetViewMode: "setViewMode",
  onSetProjectFilter: "setProjectFilter",
  onSetStationFilter: "setStationFilter",
  onSetReviewFilter: "setReviewFilter",
  onSetTaskFilter: "setTaskFilter",
  onSetFormFilter: "setFormFilter",
  onSetRequesterFilter: "setRequesterFilter",
  onSetStatusFilter: "setStatusFilter",
  onSetSequenceFilter: "setSequenceFilter",
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
