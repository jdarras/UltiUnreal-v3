function buildListPanelProps({
  t,
  sortedDisplayedRenders = [],
  viewMode = "thumbs",
  listSortIndicator = null,
  toggleListSort = null,
  buildRenderThumbCandidates = null,
  renderOutputFilename = null,
  renderLinkedTaskValue = null,
  renderReviewStatusKey = null,
  renderReviewStatusLabel = null,
  reviewFlow = [],
  busyRenderId = 0,
  rendersLoading = false,
  onTransitionRender = null,
  canReviewRenders = false,
  applyReviewStatus = null,
  openRenderDetail = null,
  isRenderFavorite = null,
  toggleRenderFavorite = null,
} = {}) {
  return {
    t,
    sortedDisplayedRenders,
    viewMode,
    listSortIndicator,
    toggleListSort,
    buildRenderThumbCandidates,
    renderOutputFilename,
    renderLinkedTaskValue,
    renderReviewStatusKey,
    renderReviewStatusLabel,
    reviewFlow,
    busyRenderId,
    rendersLoading,
    onTransitionRender,
    canReviewRenders,
    onApplyReviewStatus: applyReviewStatus,
    onOpenRenderDetail: openRenderDetail,
    isRenderFavorite,
    onToggleRenderFavorite: toggleRenderFavorite,
  };
}

export {
  buildListPanelProps,
};

export default buildListPanelProps;

