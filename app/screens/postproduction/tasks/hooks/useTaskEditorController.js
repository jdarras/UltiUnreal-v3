import { useCallback, useMemo } from "react";
import {
  canSubmitTaskForm as buildCanSubmitTaskForm,
  mergeAutoRenderFormValue,
  runTaskEditAutosaveCycle,
  runTaskSubmit,
  submitTaskFormLabel as buildSubmitTaskFormLabel,
} from "./editor/taskEditorHelpers";

export function useTaskEditorController({
  t,
  showCreateForm = false,
  isEditingTask = false,
  tasksLoading = false,
  canCreateTasks = false,
  editingTaskId = 0,
  title = "",
  autoRenderProjectRef = "",
  autoRenderLaunchMode = "",
  autoRenderScheduledMode = "",
  autoRenderScheduledAt = "",
  filteredAutoRenderForms = [],
  autoRenderFormId = "",
  renderOutputDir = "",
  onCreateTask = null,
  onUpdateTask = null,
  onCreateRender = null,
  selectedAutoRenderForm = null,
  buildTaskPayloadFromCurrentForm = null,
  setFormError = null,
  setAutoRenderFormValues = null,
  resetCreateForm = null,
  setShowCreateForm = null,
  editAutosaveStateRef = null,
}) {
  const taskSaveHandler = isEditingTask ? onUpdateTask : onCreateTask;

  const canSubmitTaskForm = useMemo(() => (
    buildCanSubmitTaskForm({
      tasksLoading,
      canCreateTasks,
      taskSaveHandler,
      isEditingTask,
      autoRenderLaunchMode,
      autoRenderScheduledMode,
      autoRenderScheduledAt,
      onCreateRender,
      title,
      autoRenderProjectRef,
      filteredAutoRenderForms,
      autoRenderFormId,
      renderOutputDir,
    })
  ), [
    tasksLoading,
    canCreateTasks,
    taskSaveHandler,
    isEditingTask,
    autoRenderLaunchMode,
    autoRenderScheduledMode,
    autoRenderScheduledAt,
    onCreateRender,
    title,
    autoRenderProjectRef,
    filteredAutoRenderForms,
    autoRenderFormId,
    renderOutputDir,
  ]);

  const submitTaskFormLabel = useMemo(() => (
    buildSubmitTaskFormLabel({ t, isEditingTask, autoRenderLaunchMode })
  ), [isEditingTask, autoRenderLaunchMode, t]);

  const handleUpdateAutoRenderFormValue = useCallback((fieldKey, nextValue) => {
    if (typeof setAutoRenderFormValues !== "function") return;
    setAutoRenderFormValues((prev) => mergeAutoRenderFormValue(prev, fieldKey, nextValue));
  }, [setAutoRenderFormValues]);

  const autoSaveEditedTaskOnBlur = useCallback(async () => {
    await runTaskEditAutosaveCycle({
      showCreateForm,
      isEditingTask,
      onUpdateTask,
      tasksLoading,
      buildTaskPayloadFromCurrentForm,
      editAutosaveStateRef,
      editingTaskId,
      setFormError,
      rerun: autoSaveEditedTaskOnBlur,
    });
  }, [
    showCreateForm,
    isEditingTask,
    onUpdateTask,
    tasksLoading,
    buildTaskPayloadFromCurrentForm,
    editAutosaveStateRef,
    editingTaskId,
    setFormError,
  ]);

  const handleSubmitTaskForm = useCallback(async () => {
    await runTaskSubmit({
      t,
      isEditingTask,
      editingTaskId,
      autoRenderLaunchMode,
      autoRenderScheduledMode,
      autoRenderScheduledAt,
      onCreateTask,
      onUpdateTask,
      onCreateRender,
      selectedAutoRenderForm,
      title,
      buildTaskPayloadFromCurrentForm,
      editAutosaveStateRef,
      setFormError,
      resetCreateForm,
      setShowCreateForm,
    });
  }, [
    t,
    isEditingTask,
    editingTaskId,
    autoRenderLaunchMode,
    autoRenderScheduledMode,
    autoRenderScheduledAt,
    onCreateTask,
    onUpdateTask,
    onCreateRender,
    selectedAutoRenderForm,
    title,
    buildTaskPayloadFromCurrentForm,
    editAutosaveStateRef,
    setFormError,
    resetCreateForm,
    setShowCreateForm,
  ]);

  return {
    canSubmitTaskForm,
    submitTaskFormLabel,
    handleUpdateAutoRenderFormValue,
    autoSaveEditedTaskOnBlur,
    handleSubmitTaskForm,
  };
}

export default useTaskEditorController;
