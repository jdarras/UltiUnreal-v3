import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  onReserveRenderId = null,
  selectedAutoRenderForm = null,
  buildTaskPayloadFromCurrentForm = null,
  setFormError = null,
  setAutoRenderFormValues = null,
  resetCreateForm = null,
  setShowCreateForm = null,
  editAutosaveStateRef = null,
}) {
  const [reservedRenderId, setReservedRenderId] = useState(0);
  const reservationInFlightRef = useRef(false);
  const taskSaveHandler = isEditingTask ? onUpdateTask : onCreateTask;

  useEffect(() => {
    if (!showCreateForm || isEditingTask) {
      reservationInFlightRef.current = false;
      setReservedRenderId(0);
      return;
    }
    if (reservedRenderId > 0 || reservationInFlightRef.current || typeof onReserveRenderId !== "function") return;

    let cancelled = false;
    reservationInFlightRef.current = true;
    Promise.resolve(onReserveRenderId())
      .then((idValue) => {
        if (cancelled) return;
        const idNum = Number(idValue || 0);
        const nextId = Number.isFinite(idNum) && idNum > 0 ? Math.trunc(idNum) : 0;
        setReservedRenderId(nextId);
      })
      .catch(() => {
        if (!cancelled) setReservedRenderId(0);
      })
      .finally(() => {
        if (!cancelled) reservationInFlightRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [showCreateForm, isEditingTask, reservedRenderId, onReserveRenderId]);

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
      reservedRenderId,
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
    reservedRenderId,
  ]);

  return {
    canSubmitTaskForm,
    submitTaskFormLabel,
    handleUpdateAutoRenderFormValue,
    autoSaveEditedTaskOnBlur,
    handleSubmitTaskForm,
    reservedRenderId,
  };
}

export default useTaskEditorController;
