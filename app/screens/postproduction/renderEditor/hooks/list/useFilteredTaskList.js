import { useMemo } from "react";
import {
  filterTasksList,
  hasActiveTaskListFilters,
} from "./filterTaskListHelpers";

const EMPTY_MAP = new Map();

export function useFilteredTaskList({
  orderedTasks = [],
  favoriteOnly = false,
  isTaskFavorite = () => false,
  searchQuery = "",
  listStatusFilter = [],
  listRenderWorkerFilter = [],
  listProjectFilter = [],
  listFormFilter = [],
  listRenderModeFilter = [],
  taskRenderStateByTaskId = EMPTY_MAP,
  projectLabelsByRef = EMPTY_MAP,
  resourceLabelsByRef = EMPTY_MAP,
  renderFormLabelById = EMPTY_MAP,
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

export default useFilteredTaskList;
