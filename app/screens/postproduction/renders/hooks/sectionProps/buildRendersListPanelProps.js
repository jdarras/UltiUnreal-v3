import { buildProps } from "../../../shared/objectProps";

const DIRECT_KEYS = [
  "t",
  "sortedDisplayedRenders",
  "viewMode",
  "listSortIndicator",
  "toggleListSort",
  "buildRenderThumbCandidates",
  "renderOutputFilename",
  "renderLinkedTaskValue",
  "renderReviewStatusKey",
  "renderReviewStatusLabel",
  "reviewFlow",
  "busyRenderId",
  "rendersLoading",
  "onTransitionRender",
  "canReviewRenders",
];

const ALIASES = {
  onApplyReviewStatus: "applyReviewStatus",
  onOpenRenderDetail: "openRenderDetail",
};

function buildListPanelProps(input = {}) {
  return buildProps(input, {
    keys: DIRECT_KEYS,
    aliases: ALIASES,
  });
}

export {
  buildListPanelProps,
};
