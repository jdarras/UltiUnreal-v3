export function buildRendersSectionPropsInputBase({
  t,
  rendersLoading = false,
  tasksLoading = false,
  onScanDetectedRenders = null,
  onTransitionRender = null,
  helpers = {},
} = {}) {
  return {
    t,
    rendersLoading,
    tasksLoading,
    onScanDetectedRenders,
    onTransitionRender,
    renderOutputFilename: helpers.renderOutputFilename,
    renderLinkedTaskValue: helpers.renderLinkedTaskValue,
    renderReviewStatusKey: helpers.renderReviewStatusKey,
    renderReviewStatusLabel: helpers.renderReviewStatusLabel,
    reviewFlow: helpers.reviewFlow,
  };
}
