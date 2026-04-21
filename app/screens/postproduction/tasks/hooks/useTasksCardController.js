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
  canCreateTasks = false,
  renderWorkers = [],
  renderWorkersLoading = false,
  renderWorkersError = "",
  renderOutputDir = "",
  renderExportDestinationOptions = [],
  taskFocusRequest = null,
  onTaskFocusHandled = null,
  tasksLoading = false,
  tasksError = "",
  onCreateTask = null,
  onUpdateTask = null,
  onDeleteTask = null,
  onCreateRender = null,
  onReserveRenderId = null,
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
    renderExportDestinationOptions,
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
    closeTaskForm,
  } = useTasksCardFlowController({
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
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    onCreateRender,
    onReserveRenderId,
    data,
  });

  return {
    browseSectionProps,
    editorSectionProps,
    statusMessagesProps,
    deleteDialogProps,
    closeTaskForm,
  };
}

export default useTasksCardController;
