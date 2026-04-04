import { useMemo } from "react";
import {
  buildTaskAutoRenderStateByTaskId,
  resolveTaskAutoRenderState,
} from "../helpers";
import { useTaskFilterOptions } from "./list/useTaskFilterOptions";
import { useFilteredTasks } from "./list/useFilteredTasks";
import { useTaskListSorting } from "./list/useTaskListSorting";
import { useTaskFavorites } from "./list/useTaskFavorites";
import {
  buildOptionLabelMap,
  buildTaskExpectedRenderName,
  buildTaskLaunchModeLabel,
  buildTaskRenderFormLabel,
  buildTaskRenderWorkerLabel,
  buildTaskVisualStatus,
} from "./list/taskListControllerHelpers";
import {
  taskRenderModeName,
} from "./list/taskListUtils";

export function useTasksListController({
  t,
  tasks = [],
  renders = [],
  renderForms = [],
  normalizedProjectOptions = [],
  normalizedResourceOptions = [],
  normalizedRenderWorkers = [],
  favoriteOnly = false,
  taskFavorites = {},
  setTaskFavorites = null,
  searchQuery = "",
  listStatusFilter = "all",
  listRenderWorkerFilter = "all",
  setListRenderWorkerFilter = null,
  listProjectFilter = "all",
  setListProjectFilter = null,
  listFormFilter = "all",
  setListFormFilter = null,
  listRenderModeFilter = "all",
  setListRenderModeFilter = null,
  listSortKey = "updatedAt",
  setListSortKey = null,
  listSortDir = "desc",
  setListSortDir = null,
}) {
  const projectLabelsByRef = useMemo(() => {
    return buildOptionLabelMap(normalizedProjectOptions);
  }, [normalizedProjectOptions]);

  const resourceLabelsByRef = useMemo(() => {
    return buildOptionLabelMap(normalizedResourceOptions);
  }, [normalizedResourceOptions]);

  const orderedTasks = useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    return [...list].sort((a, b) => String(b?.updatedAt || "").localeCompare(String(a?.updatedAt || "")));
  }, [tasks]);

  const {
    taskRenderWorkerFilterOptions,
    renderFormLabelById,
    taskFormFilterOptions,
    taskRenderModeFilterOptions,
    taskRenderWorkerLabelByKey,
  } = useTaskFilterOptions({
    orderedTasks,
    normalizedRenderWorkers,
    renderForms,
    normalizedProjectOptions,
    listRenderWorkerFilter,
    setListRenderWorkerFilter,
    listProjectFilter,
    setListProjectFilter,
    listFormFilter,
    setListFormFilter,
    listRenderModeFilter,
    setListRenderModeFilter,
  });

  const taskRenderStateByTaskId = useMemo(
    () => buildTaskAutoRenderStateByTaskId(renders),
    [renders]
  );

  const { isTaskFavorite, toggleTaskFavorite } = useTaskFavorites({
    taskFavorites,
    setTaskFavorites,
  });

  const { filteredTasks, hasActiveListFilters } = useFilteredTasks({
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

  function taskVisualStatus(task) {
    return buildTaskVisualStatus(task, t, taskRenderStateByTaskId, resolveTaskAutoRenderState);
  }

  function taskRenderFormLabel(task) {
    return buildTaskRenderFormLabel(task, renderFormLabelById);
  }

  function taskLaunchModeLabel(task) {
    return buildTaskLaunchModeLabel(task, t, taskRenderStateByTaskId, resolveTaskAutoRenderState);
  }

  function taskRenderWorkerLabel(task) {
    return buildTaskRenderWorkerLabel(task, t, taskRenderWorkerLabelByKey);
  }

  function taskExpectedRenderName(task) {
    return buildTaskExpectedRenderName(task);
  }

  const {
    displayedTasks,
    setListSortFromSelect,
    toggleListSort,
  } = useTaskListSorting({
    filteredTasks,
    listSortKey,
    listSortDir,
    setListSortKey,
    setListSortDir,
    taskRenderStateByTaskId,
    resolveTaskAutoRenderState,
    taskExpectedRenderName,
    taskRenderWorkerLabel,
  });

  return {
    taskRenderWorkerFilterOptions,
    taskFormFilterOptions,
    taskRenderModeFilterOptions,
    displayedTasks,
    hasActiveListFilters,
    isTaskFavorite,
    toggleTaskFavorite,
    taskVisualStatus,
    taskExpectedRenderName,
    taskRenderWorkerLabel,
    taskLaunchModeLabel,
    taskRenderFormLabel,
    taskRenderModeName,
    setListSortFromSelect,
    toggleListSort,
  };
}

export default useTasksListController;
