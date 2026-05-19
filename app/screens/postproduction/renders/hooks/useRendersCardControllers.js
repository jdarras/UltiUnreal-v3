import { useRenderQueueController } from "./useRenderQueueController";
import { useRendersListController } from "./useRendersListController";
import { useRenderDetailController } from "./useRenderDetailController";
import { useRenderReviewController } from "./useRenderReviewController";
import { useRendersToolbarActions } from "./useRendersToolbarActions";

export function useRendersCardControllers({
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
  const canLaunchRendersForUser = user?.permissions?.canLaunchRenders === true;

  const review = useRenderReviewController({
    user,
    onTransitionRender,
  });

  const list = useRendersListController({
    t,
    renders,
    searchQuery: preferences.searchQuery,
    reviewFilter: preferences.reviewFilter,
    setReviewFilter: preferences.setReviewFilter,
    projectFilter: preferences.projectFilter,
    setProjectFilter: preferences.setProjectFilter,
    stationFilter: preferences.stationFilter,
    setStationFilter: preferences.setStationFilter,
    taskFilter: preferences.taskFilter,
    setTaskFilter: preferences.setTaskFilter,
    formFilter: preferences.formFilter,
    setFormFilter: preferences.setFormFilter,
    requesterFilter: preferences.requesterFilter,
    setRequesterFilter: preferences.setRequesterFilter,
    statusFilter: preferences.statusFilter,
    setStatusFilter: preferences.setStatusFilter,
    sequenceFilter: preferences.sequenceFilter,
    setSequenceFilter: preferences.setSequenceFilter,
    listSortKey: preferences.listSortKey,
    listSortDir: preferences.listSortDir,
    setListSortKey: preferences.setListSortKey,
    setListSortDir: preferences.setListSortDir,
  });

  const localRenders = Array.isArray(renders)
    ? renders.filter((render) => render?.stationIsRemote !== true)
    : [];

  const detail = useRenderDetailController({
    t,
    renders,
    onLoadRenderTransitions,
  });

  const queue = useRenderQueueController({
    t,
    tasks,
    renders: localRenders,
    renderWorkers,
    searchQuery: preferences.searchQuery,
    queueSortKey: preferences.queueSortKey,
    queueSortDir: preferences.queueSortDir,
    queueRuntimeMode: preferences.queueRuntimeMode,
    setQueueSortKey: preferences.setQueueSortKey,
    setQueueSortDir: preferences.setQueueSortDir,
    onCreateRender,
    onDispatchRenders,
    canLaunchRendersForUser,
  });

  const toolbar = useRendersToolbarActions({
    setSearchQuery: preferences.setSearchQuery,
    setProjectFilter: preferences.setProjectFilter,
    setStationFilter: preferences.setStationFilter,
    setReviewFilter: preferences.setReviewFilter,
    setTaskFilter: preferences.setTaskFilter,
    setFormFilter: preferences.setFormFilter,
    setRequesterFilter: preferences.setRequesterFilter,
    setStatusFilter: preferences.setStatusFilter,
    setSequenceFilter: preferences.setSequenceFilter,
    setSearchExpanded: preferences.setSearchExpanded,
  });

  return {
    review,
    list,
    detail,
    queue,
    toolbar,
  };
}
