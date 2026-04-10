import { useTaskFormLifecycleController } from "../useTaskFormLifecycleController";
import { useTaskDeleteDialogController } from "../useTaskDeleteDialogController";
import { useTaskEditorController } from "../useTaskEditorController";
import { useTasksUiActions } from "../useTasksUiActions";
import { useTasksSectionProps } from "../useTasksSectionProps";
import { buildTasksSectionPropsInput } from "./buildTasksSectionPropsInput";
import {
  buildTaskDeleteDialogControllerInput,
  buildTaskEditorControllerInput,
  buildTaskLifecycleControllerInput,
  buildTasksUiActionsInput,
} from "./buildTasksCardFlowInputs";

export function useTasksCardFlowController({
  t,
  tasksLoading = false,
  tasksError = "",
  renderFormsLoading = false,
  renderFormsError = "",
  canManageRenderTemplates = false,
  canCreateTasks = false,
  renderWorkersLoading = false,
  renderWorkersError = "",
  renderOutputDir = "",
  onCreateTask = null,
  onUpdateTask = null,
  onDeleteTask = null,
  onCreateRender = null,
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
      data,
      lifecycle,
    })
  );

  const ui = useTasksUiActions(
    buildTasksUiActionsInput({
      t,
      tasksLoading,
      canCreateTasks,
      onDeleteTask,
      data,
      lifecycle,
      dialog,
    })
  );

  const sectionPropsInput = buildTasksSectionPropsInput({
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

  const sectionProps = useTasksSectionProps(sectionPropsInput);
  return {
    ...sectionProps,
    closeTaskForm: lifecycle.closeTaskForm,
  };
}

export default useTasksCardFlowController;
