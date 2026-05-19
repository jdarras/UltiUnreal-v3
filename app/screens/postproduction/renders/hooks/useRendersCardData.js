import { useRendersPreferences } from "./useRendersPreferences";
import { useRendersCardControllers } from "./useRendersCardControllers";
import { buildRendersCardDataOutput } from "./buildRendersCardDataOutput";
import {
  buildRendersCardControllersInput,
  buildRendersCardDataPreferences,
} from "./buildRendersCardDataInput";

export function useRendersCardData({
  t,
  user = null,
  renders = [],
  tasks = [],
  renderWorkers = [],
  onTransitionRender = null,
  onLoadRenderTransitions = null,
  onCreateRender = null,
  onDispatchRenders = null,
} = {}) {
  const preferences = useRendersPreferences();
  const {
    searchQuery,
    setSearchQuery,
    reviewFilter,
    setReviewFilter,
    projectFilter,
    setProjectFilter,
    stationFilter,
    setStationFilter,
    taskFilter,
    setTaskFilter,
    formFilter,
    setFormFilter,
    requesterFilter,
    setRequesterFilter,
    statusFilter,
    setStatusFilter,
    sequenceFilter,
    setSequenceFilter,
    searchExpanded,
    setSearchExpanded,
    listSortKey,
    setListSortKey,
    listSortDir,
    setListSortDir,
    queueSortKey,
    setQueueSortKey,
    queueSortDir,
    setQueueSortDir,
    queueRuntimeMode,
    setQueueRuntimeMode,
  } = preferences;

  const controllersInput = buildRendersCardControllersInput({
    t,
    user,
    renders,
    tasks,
    renderWorkers,
    onTransitionRender,
    onLoadRenderTransitions,
    onCreateRender,
    onDispatchRenders,
    preferences: {
      searchQuery,
      setSearchQuery,
      reviewFilter,
      setReviewFilter,
      projectFilter,
      setProjectFilter,
      stationFilter,
      setStationFilter,
      taskFilter,
      setTaskFilter,
      formFilter,
      setFormFilter,
      requesterFilter,
      setRequesterFilter,
      statusFilter,
      setStatusFilter,
      sequenceFilter,
      setSequenceFilter,
      searchExpanded,
      setSearchExpanded,
      listSortKey,
      setListSortKey,
      listSortDir,
      setListSortDir,
      queueSortKey,
      setQueueSortKey,
      queueSortDir,
      setQueueSortDir,
      queueRuntimeMode,
      setQueueRuntimeMode,
    },
  });

  const { review, list, detail, queue, toolbar } = useRendersCardControllers(controllersInput);

  return buildRendersCardDataOutput({
    preferences: buildRendersCardDataPreferences(preferences),
    review,
    list,
    detail,
    queue,
    toolbar,
  });
}
