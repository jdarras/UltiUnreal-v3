import { AuditHistoryCard } from "./components/AuditHistoryCard";
import { TaskDeleteDialog } from "./components/TaskDeleteDialog";
import { RenderEditorStatusMessages } from "./components/RenderEditorStatusMessages";
import { RenderEditorBrowseSection } from "./components/RenderEditorBrowseSection";
import { RenderEditorSection } from "./components/RenderEditorSection";
import { useRenderEditorController } from "./hooks/useRenderEditorController";

function RenderEditorCard({
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
  canAssignRenderRequests = false,
  currentUser = null,
  users = [],
  renderWorkers = [],
  renderWorkersLoading = false,
  renderWorkersError = "",
  renderOutputDir = "",
  renderExportDestinationOptions = [],
  renderFocusRequest = null,
  onRenderFocusHandled = null,
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
  onNavigateToProject = null,
  onNavigateToRenderForm = null,
}) {
  const {
    browseSectionProps,
    editorSectionProps,
    statusMessagesProps,
    deleteDialogProps,
  } = useRenderEditorController({
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
    canAssignRenderRequests,
    currentUser,
    users,
    renderWorkers,
    renderWorkersLoading,
    renderWorkersError,
    renderOutputDir,
    renderExportDestinationOptions,
    renderFocusRequest,
    onRenderFocusHandled,
    tasksLoading,
    tasksError,
    onCreateTask,
    onUpdateTask,
    onDeleteTask,
    onCreateRender,
    onReserveRenderId,
    onLoadRenderFormFields,
    onLoadProjectUnrealCatalog,
    onFormModeChange,
  });

  return (
    <section className="uu-section">
      <RenderEditorBrowseSection
        {...browseSectionProps}
        onNavigateToProject={onNavigateToProject}
        onEditRenderForm={onNavigateToRenderForm}
      />
      <RenderEditorSection {...editorSectionProps} />
      <RenderEditorStatusMessages {...statusMessagesProps} />
      <TaskDeleteDialog {...deleteDialogProps} />
    </section>
  );
}

export {
  RenderEditorCard,
  AuditHistoryCard,
};
