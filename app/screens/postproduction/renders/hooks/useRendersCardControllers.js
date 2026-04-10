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
  const review = useRenderReviewController({
    user,
    onTransitionRender,
  });

  const list = useRendersListController({
    t,
    renders,
    searchQuery: preferences.searchQuery,
    reviewFilter: preferences.reviewFilter,
    projectFilter: preferences.projectFilter,
    setProjectFilter: preferences.setProjectFilter,
    stationFilter: preferences.stationFilter,
    setStationFilter: preferences.setStationFilter,
    favoriteOnly: preferences.favoriteOnly,
    renderFavorites: preferences.renderFavorites,
    setRenderFavorites: preferences.setRenderFavorites,
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
    setQueueSortKey: preferences.setQueueSortKey,
    setQueueSortDir: preferences.setQueueSortDir,
    onCreateRender,
    onDispatchRenders,
  });

  const toolbar = useRendersToolbarActions({
    setSearchQuery: preferences.setSearchQuery,
    setProjectFilter: preferences.setProjectFilter,
    setStationFilter: preferences.setStationFilter,
    setReviewFilter: preferences.setReviewFilter,
    setFavoriteOnly: preferences.setFavoriteOnly,
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

export default useRendersCardControllers;
