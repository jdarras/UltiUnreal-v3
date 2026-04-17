import { useMemo } from "react";
import {
  buildTaskAutoRenderStateByTaskId,
} from "../helpers";
import { useTaskFilterOptions } from "./list/useTaskFilterOptions";
import { useFilteredTasks } from "./list/useFilteredTasks";
import { useTaskListSorting } from "./list/useTaskListSorting";
import { useTaskFavorites } from "./list/useTaskFavorites";
import {
  buildOptionLabelMap,
} from "./list/taskListControllerHelpers";
import { buildTaskListLabelResolvers } from "./list/buildTaskListLabelResolvers";
import {
  buildFilteredTasksInput,
  buildTaskFilterOptionsInput,
  buildTaskListSortingInput,
  buildTasksListControllerOutput,
} from "./list/buildTasksListControllerSections";

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

  const filterOptions = useTaskFilterOptions(
    buildTaskFilterOptionsInput({
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
    })
  );

  const {
    taskRenderWorkerFilterOptions,
    renderFormLabelById,
    taskFormFilterOptions,
    taskRenderModeFilterOptions,
    taskRenderWorkerLabelByKey,
  } = filterOptions;

  const taskRenderStateByTaskId = useMemo(
    () => buildTaskAutoRenderStateByTaskId(renders),
    [renders]
  );

  const { isTaskFavorite, toggleTaskFavorite } = useTaskFavorites({
    taskFavorites,
    setTaskFavorites,
  });

  const { filteredTasks, hasActiveListFilters } = useFilteredTasks(
    buildFilteredTasksInput({
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
    })
  );

  const labels = useMemo(() => buildTaskListLabelResolvers({
    t,
    taskRenderStateByTaskId,
    taskRenderWorkerLabelByKey,
    renderFormLabelById,
    projectLabelsByRef,
  }), [t, taskRenderStateByTaskId, taskRenderWorkerLabelByKey, renderFormLabelById, projectLabelsByRef]);

  const sorting = useTaskListSorting(
    buildTaskListSortingInput({
      filteredTasks,
      listSortKey,
      listSortDir,
      setListSortKey,
      setListSortDir,
      taskRenderStateByTaskId,
      resolveTaskAutoRenderState: labels.resolveTaskAutoRenderState,
      taskExpectedRenderName: labels.taskExpectedRenderName,
      taskRenderWorkerLabel: labels.taskRenderWorkerLabel,
    })
  );

  return buildTasksListControllerOutput({
    filters: {
      taskRenderWorkerFilterOptions,
      taskFormFilterOptions,
      taskRenderModeFilterOptions,
    },
    listing: {
      hasActiveListFilters,
    },
    sorting,
    labels,
    favorites: {
      isTaskFavorite,
      toggleTaskFavorite,
    },
  });
}

export default useTasksListController;
