function buildRenderDetailControllerOutput({
  actions = {},
  detail = {},
  preview = {},
  transitions = {},
} = {}) {
  return {
    buildRenderThumbCandidates: actions.buildRenderThumbCandidates,
    openRenderOutputExternally: actions.openRenderOutputExternally,
    openRenderDetail: actions.openRenderDetail,
    closeRenderDetail: actions.closeRenderDetail,
    advancePreviewCandidate: actions.advancePreviewCandidate,
    detailRender: detail.detailRender,
    detailPreviewKind: preview.kind,
    detailPreviewSource: preview.source,
    detailPreviewError: preview.error,
    detailPreviewCandidatesCount: preview.candidatesCount,
    detailTransitions: transitions.items,
    detailTransitionsLoading: transitions.loading,
    detailTransitionsError: transitions.error,
  };
}

export {
  buildRenderDetailControllerOutput,
};

export default buildRenderDetailControllerOutput;
