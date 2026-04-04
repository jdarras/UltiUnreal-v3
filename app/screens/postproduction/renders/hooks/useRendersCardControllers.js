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
    renders,
    searchQuery: preferences.searchQuery,
    reviewFilter: preferences.reviewFilter,
    projectFilter: preferences.projectFilter,
    setProjectFilter: preferences.setProjectFilter,
    favoriteOnly: preferences.favoriteOnly,
    renderFavorites: preferences.renderFavorites,
    setRenderFavorites: preferences.setRenderFavorites,
    listSortKey: preferences.listSortKey,
    listSortDir: preferences.listSortDir,
    setListSortKey: preferences.setListSortKey,
    setListSortDir: preferences.setListSortDir,
  });

  const detail = useRenderDetailController({
    t,
    renders,
    onLoadRenderTransitions,
  });

  const queue = useRenderQueueController({
    t,
    tasks,
    renders,
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

