import { TASK_VISUAL_STATUS_FLOW } from "../../helpers";
import { useRenderEditorPreferences } from "../useRenderEditorPreferences";
import { useRenderEditorCatalogOptions } from "../useRenderEditorCatalogOptions";
import { useRenderEditorListController } from "../useRenderEditorListController";
import { useRenderEditorFormUiState } from "../useRenderEditorFormUiState";
import {
  buildRenderEditorCatalogOptionsInput,
  buildRenderEditorListControllerCardInput,
} from "./buildRenderEditorListDataInput";
import { buildRenderEditorListDataOutput } from "./buildRenderEditorListDataOutput";

export function useRenderEditorCardListData({
  t,
  tasks = [],
  renders = [],
  projectOptions = [],
  resourceOptions = [],
  renderTemplates = [],
  renderForms = [],
  renderWorkers = [],
  defaultAssigneeUserId = null,
  onFormModeChange = null,
} = {}) {
  const formState = useRenderEditorFormUiState({
    defaultAssigneeUserId,
    onFormModeChange,
  });

  const browsePreferences = useRenderEditorPreferences({ taskStatusFlow: TASK_VISUAL_STATUS_FLOW });

  const catalog = useRenderEditorCatalogOptions(buildRenderEditorCatalogOptionsInput({
    renderWorkers,
    projectOptions,
    renderTemplates,
    resourceOptions,
    formState,
    preferences: browsePreferences,
  }));

  const list = useRenderEditorListController(buildRenderEditorListControllerCardInput({
    t,
    tasks,
    renders,
    renderForms,
    catalog,
    preferences: browsePreferences,
  }));

  return buildRenderEditorListDataOutput({
    formState,
    browsePreferences,
    catalog,
    list,
  });
}

export default useRenderEditorCardListData;
