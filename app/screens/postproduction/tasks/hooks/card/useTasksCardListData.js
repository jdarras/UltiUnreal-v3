import { TASK_VISUAL_STATUS_FLOW } from "../../helpers";
import { useTasksPreferences } from "../useTasksPreferences";
import { useTasksCatalogOptions } from "../useTasksCatalogOptions";
import { useTasksListController } from "../useTasksListController";
import { useTasksFormUiState } from "../useTasksFormUiState";
import {
  buildTasksCatalogOptionsInput,
  buildTasksListControllerCardInput,
} from "./buildTasksCardListDataInput";
import { buildTasksCardListDataOutput } from "./buildTasksCardListDataOutput";

export function useTasksCardListData({
  t,
  tasks = [],
  renders = [],
  projectOptions = [],
  resourceOptions = [],
  renderTemplates = [],
  renderForms = [],
  renderWorkers = [],
  onFormModeChange = null,
} = {}) {
  const formState = useTasksFormUiState({
    onFormModeChange,
  });

  const browsePreferences = useTasksPreferences({ taskStatusFlow: TASK_VISUAL_STATUS_FLOW });

  const catalog = useTasksCatalogOptions(buildTasksCatalogOptionsInput({
    renderWorkers,
    projectOptions,
    renderTemplates,
    resourceOptions,
    formState,
    preferences: browsePreferences,
  }));

  const list = useTasksListController(buildTasksListControllerCardInput({
    t,
    tasks,
    renders,
    renderForms,
    catalog,
    preferences: browsePreferences,
  }));

  return buildTasksCardListDataOutput({
    formState,
    browsePreferences,
    catalog,
    list,
  });
}

export default useTasksCardListData;
