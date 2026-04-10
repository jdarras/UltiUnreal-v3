import { useEffect } from "react";
import { AuditHistoryCard } from "./tasks/components/AuditHistoryCard";
import { TaskDeleteDialog } from "./tasks/components/TaskDeleteDialog";
import { TasksStatusMessages } from "./tasks/components/TasksStatusMessages";
import { TasksBrowseSection } from "./tasks/components/TasksBrowseSection";
import { TasksEditorSection } from "./tasks/components/TasksEditorSection";
import { useTasksCardController } from "./tasks/hooks/useTasksCardController";

function TasksCard({
  t,
  tabKey = 0,
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
}) {
  const {
    browseSectionProps,
    editorSectionProps,
    statusMessagesProps,
    deleteDialogProps,
    closeTaskForm,
  } = useTasksCardController({
    t,
    tasks,
    renders,
    projectOptions,
    resourceOptions,
    renderTemplates,
    renderForms,
    renderFormsLoading,
    renderFormsError,
    canManageRenderTemplates,
    canCreateTasks,
    renderWorkers,
    renderWorkersLoading,
    renderWorkersError,
    renderOutputDir,
    taskFocusRequest,
    onTaskFocusHandled,
    tasksLoading,
    tasksError,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    onCreateRender,
    onLoadRenderFormFields,
    onLoadProjectUnrealCatalog,
    onFormModeChange,
  });

  useEffect(() => {
    closeTaskForm?.();
  }, [tabKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="uu-section">
      <TasksBrowseSection {...browseSectionProps} />
      <TasksEditorSection {...editorSectionProps} />
      <TasksStatusMessages {...statusMessagesProps} />
      <TaskDeleteDialog {...deleteDialogProps} />
    </section>
  );
}

export {
  TasksCard,
  AuditHistoryCard,
};

