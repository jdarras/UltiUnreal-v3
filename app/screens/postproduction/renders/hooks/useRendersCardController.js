import { useRendersSectionProps } from "./useRendersSectionProps";
import { useRendersCardData } from "./useRendersCardData";
import { buildRendersSectionPropsInput } from "./sectionProps/buildRendersSectionPropsInput";
import {
  renderLinkedTaskValue,
  renderOutputFilename,
  renderReviewStatusKey,
  renderReviewStatusLabel,
} from "../helpers";

const RENDER_REVIEW_FLOW = ["to_validate", "validated", "to_modify", "canceled"];

export function useRendersCardController({
  t,
  user = null,
  renders = [],
  rendersLoading = false,
  rendersError = "",
  tasks = [],
  tasksLoading = false,
  renderWorkers = [],
  onScanDetectedRenders = null,
  onTransitionRender = null,
  onLoadRenderTransitions = null,
  onCreateRender = null,
  onDispatchRenders = null,
} = {}) {
  const data = useRendersCardData({
    t,
    user,
    renders,
    tasks,
    renderWorkers,
    onTransitionRender,
    onLoadRenderTransitions,
    onCreateRender,
    onDispatchRenders,
  });

  const {
    toolbarProps,
    queuePanelProps,
    listPanelProps,
    detailModalProps,
  } = useRendersSectionProps(buildRendersSectionPropsInput({
    t,
    rendersLoading,
    tasksLoading,
    onScanDetectedRenders,
    onTransitionRender,
    data,
    helpers: {
      renderOutputFilename,
      renderLinkedTaskValue,
      renderReviewStatusKey,
      renderReviewStatusLabel,
      reviewFlow: RENDER_REVIEW_FLOW,
    },
  }));

  return {
    canReviewRenders: data.canReviewRenders,
    rendersError,
    toolbarProps,
    queuePanelProps,
    listPanelProps,
    detailModalProps,
  };
}

export default useRendersCardController;
