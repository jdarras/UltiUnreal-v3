function buildTaskLifecycleControllerInput(data = {}) {
  return {
    setEditingTaskId: data.setEditingTaskId,
    setShowCreateForm: data.setShowCreateForm,
    setTitle: data.setTitle,
    setDescription: data.setDescription,
    setSelectedResourceRefs: data.setSelectedResourceRefs,
    hydrateAutoRenderFromTask: data.hydrateAutoRenderFromTask,
    resetAutoRenderState: data.resetAutoRenderState,
    setFormError: data.setFormError,
  };
}

function buildTaskDeleteDialogControllerInput({
  onDeleteTask = null,
  data = {},
  lifecycle = {},
} = {}) {
  return {
    onDeleteTask,
    editingTaskId: data.editingTaskId,
    onDeleteEditingTask: lifecycle.closeTaskForm,
  };
}

function buildTaskEditorControllerInput({
  t,
  tasksLoading = false,
  canCreateTasks = false,
  renderOutputDir = "",
  onCreateTask = null,
  onUpdateTask = null,
  onCreateRender = null,
  data = {},
  lifecycle = {},
} = {}) {
  return {
    t,
    showCreateForm: data.showCreateForm,
    isEditingTask: data.isEditingTask,
    tasksLoading,
    canCreateTasks,
    editingTaskId: data.editingTaskId,
    title: data.title,
    autoRenderProjectRef: data.autoRenderProjectRef,
    autoRenderLaunchMode: data.autoRenderLaunchMode,
    autoRenderScheduledMode: data.autoRenderScheduledMode,
    autoRenderScheduledAt: data.autoRenderScheduledAt,
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
  };
}

function buildTasksUiActionsInput({
  t,
  tasksLoading = false,
  canCreateTasks = false,
  onDeleteTask = null,
  data = {},
  lifecycle = {},
  dialog = {},
} = {}) {
  return {
    t,
    tasksLoading,
    canCreateTasks,
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
    setAutoRenderProjectRef: data.setAutoRenderProjectRef,
    setAutoRenderFormId: data.setAutoRenderFormId,
    setAutoRenderTemplateId: data.setAutoRenderTemplateId,
    setAutoRenderFormValues: data.setAutoRenderFormValues,
    setFormError: data.setFormError,
    setAutoRenderWorkerKey: data.setAutoRenderWorkerKey,
    setAutoRenderLaunchMode: data.setAutoRenderLaunchMode,
    setAutoRenderScheduledMode: data.setAutoRenderScheduledMode,
    setAutoRenderScheduledAt: data.setAutoRenderScheduledAt,
    setTaskSequenceName: data.setTaskSequenceName,
  };
}

export {
  buildTaskLifecycleControllerInput,
  buildTaskDeleteDialogControllerInput,
  buildTaskEditorControllerInput,
  buildTasksUiActionsInput,
};

export default buildTaskLifecycleControllerInput;
