import { useMemo } from "react";
import {
  filterTasksList,
  hasActiveTaskListFilters,
} from "./filterTasksHelpers";

export function useFilteredTasks({
  orderedTasks = [],
  favoriteOnly = false,
  isTaskFavorite = () => false,
  searchQuery = "",
  listStatusFilter = "all",
  listRenderWorkerFilter = "all",
  listProjectFilter = "all",
  listFormFilter = "all",
  listRenderModeFilter = "all",
  taskRenderStateByTaskId = new Map(),
  projectLabelsByRef = new Map(),
  resourceLabelsByRef = new Map(),
  renderFormLabelById = new Map(),
} = {}) {
  const filteredTasks = useMemo(() => {
    return filterTasksList({
      orderedTasks,
      favoriteOnly,
      isTaskFavorite,
      searchQuery,
      listStatusFilter,
      listRenderWorkerFilter,
      listProjectFilter,
      listFormFilter,
      listRenderModeFilter,
      taskRenderStateByTaskId,
      projectLabelsByRef,
      resourceLabelsByRef,
      renderFormLabelById,
    });
  }, [
    orderedTasks,
    favoriteOnly,
    isTaskFavorite,
    searchQuery,
    listStatusFilter,
    listRenderWorkerFilter,
    listProjectFilter,
    listFormFilter,
    listRenderModeFilter,
    taskRenderStateByTaskId,
    projectLabelsByRef,
    resourceLabelsByRef,
    renderFormLabelById,
  ]);

  const hasActiveListFilters = useMemo(() => (
    hasActiveTaskListFilters({
      searchQuery,
      favoriteOnly,
      listStatusFilter,
      listRenderWorkerFilter,
      listProjectFilter,
      listFormFilter,
      listRenderModeFilter,
    })
  ), [searchQuery, favoriteOnly, listStatusFilter, listRenderWorkerFilter, listProjectFilter, listFormFilter, listRenderModeFilter]);

  return {
    filteredTasks,
    hasActiveListFilters,
  };
}

export default useFilteredTasks;
