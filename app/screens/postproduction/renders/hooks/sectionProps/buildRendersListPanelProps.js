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
  "isRenderFavorite",
];

const ALIASES = {
  onApplyReviewStatus: "applyReviewStatus",
  onOpenRenderDetail: "openRenderDetail",
  onToggleRenderFavorite: "toggleRenderFavorite",
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

export default buildListPanelProps;
