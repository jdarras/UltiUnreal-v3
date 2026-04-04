import { useTaskFormLifecycleController } from "../useTaskFormLifecycleController";
import { useTaskDeleteDialogController } from "../useTaskDeleteDialogController";
import { useTaskEditorController } from "../useTaskEditorController";
import { useTasksUiActions } from "../useTasksUiActions";
import { useTasksSectionProps } from "../useTasksSectionProps";
import { buildTasksSectionPropsInput } from "./buildTasksSectionPropsInput";

export function useTasksCardFlowController({
  t,
  tasksLoading = false,
  tasksError = "",
  renderFormsLoading = false,
  renderFormsError = "",
  canManageRenderTemplates = false,
  renderWorkersLoading = false,
  renderWorkersError = "",
  renderOutputDir = "",
  onCreateTask = null,
  onUpdateTask = null,
  onDeleteTask = null,
  onCreateRender = null,
  data = {},
} = {}) {
  const lifecycle = useTaskFormLifecycleController({
    setEditingTaskId: data.setEditingTaskId,
    setShowCreateForm: data.setShowCreateForm,
    setTitle: data.setTitle,
    setDescription: data.setDescription,
    setSelectedResourceRefs: data.setSelectedResourceRefs,
    hydrateAutoRenderFromTask: data.hydrateAutoRenderFromTask,
    resetAutoRenderState: data.resetAutoRenderState,
    setFormError: data.setFormError,
  });

  const dialog = useTaskDeleteDialogController({
    onDeleteTask,
    editingTaskId: data.editingTaskId,
    onDeleteEditingTask: lifecycle.closeTaskForm,
  });

  const editor = useTaskEditorController({
    t,
    showCreateForm: data.showCreateForm,
    isEditingTask: data.isEditingTask,
    tasksLoading,
    editingTaskId: data.editingTaskId,
    title: data.title,
    autoRenderLaunchMode: data.autoRenderLaunchMode,
    filteredAutoRenderForms: data.filteredAutoRenderForms,
    autoRenderFormId: data.autoRenderFormId,
    renderOutputDir,
    onCreateTask,
    onUpdateTask,
    onCreateRender,
    selectedAutoRenderForm: data.selectedAutoRenderForm,
    buildTaskPayloadFromCurrentForm: data.buildTaskPayloadFromCurrentForm,
    setFormError: data.setFormError,
    setAutoRenderFormValues: data.setAutoRenderFormValues,
    resetCreateForm: lifecycle.resetCreateForm,
    setShowCreateForm: data.setShowCreateForm,
    editAutosaveStateRef: data.editAutosaveStateRef,
  });

  const ui = useTasksUiActions({
    t,
    tasksLoading,
    showCreateForm: data.showCreateForm,
    onDeleteTask,
    openTaskEditor: lifecycle.openTaskEditor,
    openDeleteTaskDialog: dialog.openDeleteTaskDialog,
    setSearchQuery: data.setSearchQuery,
    setListStatusFilter: data.setListStatusFilter,
    setListRenderWorkerFilter: data.setListRenderWorkerFilter,
    setListProjectFilter: data.setListProjectFilter,
    setListFormFilter: data.setListFormFilter,
    setListRenderModeFilter: data.setListRenderModeFilter,
    setFavoriteOnly: data.setFavoriteOnly,
    setSearchExpanded: data.setSearchExpanded,
    setAutoRenderFormId: data.setAutoRenderFormId,
    setAutoRenderTemplateId: data.setAutoRenderTemplateId,
    setAutoRenderFormValues: data.setAutoRenderFormValues,
    setFormError: data.setFormError,
    setAutoRenderWorkerKey: data.setAutoRenderWorkerKey,
    setAutoRenderLaunchMode: data.setAutoRenderLaunchMode,
  });

  const sectionPropsInput = buildTasksSectionPropsInput({
    t,
    tasksLoading,
    tasksError,
    renderFormsLoading,
    renderFormsError,
    canManageRenderTemplates,
    renderWorkersLoading,
    renderWorkersError,
    renderOutputDir,
    data,
    lifecycle,
    editor,
    ui,
    dialog,
  });

  return useTasksSectionProps(sectionPropsInput);
}

export default useTasksCardFlowController;

