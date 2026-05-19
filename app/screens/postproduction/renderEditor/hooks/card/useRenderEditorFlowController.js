import { useTaskFormLifecycleController } from "../useTaskFormLifecycleController";
import { useTaskDeleteDialogController } from "../useTaskDeleteDialogController";
import { useTaskEditorController } from "../useTaskEditorController";
import { useRenderEditorUiActions } from "../useRenderEditorUiActions";
import { useRenderEditorSectionProps } from "../useRenderEditorSectionProps";
import { buildRenderEditorSectionPropsInput } from "./buildRenderEditorSectionPropsInput";
import {
  buildTaskDeleteDialogControllerInput,
  buildTaskEditorControllerInput,
  buildTaskLifecycleControllerInput,
  buildRenderEditorUiActionsInput,
} from "./buildRenderEditorFlowInputs";

export function useRenderEditorFlowController({
  t,
  tasksLoading = false,
  tasksError = "",
  renderFormsLoading = false,
  renderFormsError = "",
  canManageRenderTemplates = false,
  canCreateTasks = false,
  canAssignRenderRequests = false,
  renderWorkersLoading = false,
  renderWorkersError = "",
  renderOutputDir = "",
  onCreateTask = null,
  onUpdateTask = null,
  onDeleteTask = null,
  onCreateRender = null,
  onReserveRenderId = null,
  data = {},
} = {}) {
  const lifecycle = useTaskFormLifecycleController(
    buildTaskLifecycleControllerInput(data)
  );

  const dialog = useTaskDeleteDialogController(
    buildTaskDeleteDialogControllerInput({ onDeleteTask, data, lifecycle })
  );

  const editor = useTaskEditorController(
    buildTaskEditorControllerInput({
      t,
      tasksLoading,
      canCreateTasks,
      renderOutputDir,
      onCreateTask,
      onUpdateTask,
      onCreateRender,
      onReserveRenderId,
      data,
      lifecycle,
    })
  );

  const ui = useRenderEditorUiActions(
    buildRenderEditorUiActionsInput({
      t,
      tasksLoading,
      canCreateTasks,
      canAssignRenderRequests,
      onDeleteTask,
      data,
      lifecycle,
      dialog,
    })
  );

  const sectionPropsInput = buildRenderEditorSectionPropsInput({
    t,
    tasksLoading,
    tasksError,
    renderFormsLoading,
    renderFormsError,
    canManageRenderTemplates,
    canCreateTasks,
    renderWorkersLoading,
    renderWorkersError,
    renderOutputDir,
    data,
    lifecycle,
    editor,
    ui,
    dialog,
  });

  const sectionProps = useRenderEditorSectionProps(sectionPropsInput);
  return sectionProps;
}
