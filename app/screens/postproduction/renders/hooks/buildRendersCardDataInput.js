function buildRendersCardControllersInput({
  t,
  user = null,
  renders = [],
  tasks = [],
  renderWorkers = [],
  onTransitionRender = null,
  onLoadRenderTransitions = null,
  onCreateRender = null,
  onDispatchRenders = null,
  preferences = {},
} = {}) {
  return {
    t,
    user,
    renders,
    tasks,
    renderWorkers,
    onTransitionRender,
    onLoadRenderTransitions,
    onCreateRender,
    onDispatchRenders,
    preferences,
  };
}

function buildRendersCardDataPreferences(preferences = {}) {
  return {
    searchQuery: preferences.searchQuery,
    setSearchQuery: preferences.setSearchQuery,
    reviewFilter: preferences.reviewFilter,
    setReviewFilter: preferences.setReviewFilter,
    projectFilter: preferences.projectFilter,
    setProjectFilter: preferences.setProjectFilter,
    stationFilter: preferences.stationFilter,
    setStationFilter: preferences.setStationFilter,
    searchExpanded: preferences.searchExpanded,
    favoriteOnly: preferences.favoriteOnly,
    viewMode: preferences.viewMode,
    setViewMode: preferences.setViewMode,
    listSortKey: preferences.listSortKey,
    listSortDir: preferences.listSortDir,
  };
}

export {
  buildRendersCardControllersInput,
  buildRendersCardDataPreferences,
};

export default buildRendersCardControllersInput;
