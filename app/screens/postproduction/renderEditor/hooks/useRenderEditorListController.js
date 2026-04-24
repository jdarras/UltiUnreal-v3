import { useMemo } from "react";
import {
  buildTaskAutoRenderStateByTaskId,
} from "../helpers";
import { useTaskFilterOptions } from "./list/useTaskFilterOptions";
import { useFilteredTaskList } from "./list/useFilteredTaskList";
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
  buildRenderEditorListControllerOutput,
} from "./list/buildRenderEditorListControllerSections";

export function useRenderEditorListController({
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
  listStatusFilter = [],
  listRenderWorkerFilter = [],
  setListRenderWorkerFilter = null,
  listProjectFilter = [],
  setListProjectFilter = null,
  listFormFilter = [],
  setListFormFilter = null,
  listRenderModeFilter = [],
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

  const { filteredTasks, hasActiveListFilters } = useFilteredTaskList(
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
      resolveTaskVisualStatus: labels.resolveTaskVisualStatus,
      taskExpectedRenderName: labels.taskExpectedRenderName,
      taskRenderWorkerLabel: labels.taskRenderWorkerLabel,
    })
  );

  return buildRenderEditorListControllerOutput({
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

export default useRenderEditorListController;
