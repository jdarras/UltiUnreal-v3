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
  onScheduleRender = null,
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
    busyReviewRenderId: data.busyRenderId,
    rejectDialogOpen: data.rejectDialogOpen,
    rejectDialogRender: data.rejectDialogRender,
    rejectDialogReason: data.rejectDialogReason,
    setRejectDialogReason: data.setRejectDialogReason,
    closeRejectDialog: data.closeRejectDialog,
    confirmRejectDialog: data.confirmRejectDialog,
    showHistory: data.showHistory,
    setShowHistory: data.setShowHistory,
    rendersError,
    toolbarProps,
    queuePanelProps,
    listPanelProps,
    detailModalProps: { ...detailModalProps, onScheduleRender },
  };
}
