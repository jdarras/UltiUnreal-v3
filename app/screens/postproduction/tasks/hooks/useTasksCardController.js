import { useTasksCardDataController } from "./card/useTasksCardDataController";
import { useTasksCardFlowController } from "./card/useTasksCardFlowController";

export function useTasksCardController({
  t,
  tasks = [],
  renders = [],
  projectOptions = [],
  resourceOptions = [],
  renderTemplates = [],
  renderForms = [],
  renderFormsLoading = false,
  renderFormsError = "",
  canManageRenderTemplates = false,
  renderWorkers = [],
  renderWorkersLoading = false,
  renderWorkersError = "",
  renderOutputDir = "",
  taskFocusRequest = null,
  onTaskFocusHandled = null,
  tasksLoading = false,
  tasksError = "",
  onCreateTask = null,
  onUpdateTask = null,
  onDeleteTask = null,
  onCreateRender = null,
  onLoadRenderFormFields = null,
  onLoadProjectUnrealCatalog = null,
  onFormModeChange = null,
} = {}) {
  const data = useTasksCardDataController({
    t,
    tasks,
    renders,
    projectOptions,
    resourceOptions,
    renderTemplates,
    renderForms,
    renderWorkers,
    renderOutputDir,
    taskFocusRequest,
    onTaskFocusHandled,
    onLoadRenderFormFields,
    onLoadProjectUnrealCatalog,
    onFormModeChange,
  });

  const {
    browseSectionProps,
    editorSectionProps,
    statusMessagesProps,
    deleteDialogProps,
  } = useTasksCardFlowController({
    t,
    tasksLoading,
    tasksError,
    renderFormsLoading,
    renderFormsError,
    canManageRenderTemplates,
    renderWorkersLoading,
    renderWorkersError,
    renderOutputDir,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    onCreateRender,
    data,
  });

  return {
    browseSectionProps,
    editorSectionProps,
    statusMessagesProps,
    deleteDialogProps,
  };
}

export default useTasksCardController;
