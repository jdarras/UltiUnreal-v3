import { useCallback, useMemo } from "react";
import { safeT } from "../../shared/helpers";

export function useTaskEditorController({
  t,
  showCreateForm = false,
  isEditingTask = false,
  tasksLoading = false,
  editingTaskId = 0,
  title = "",
  autoRenderLaunchMode = "scheduled",
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
    !tasksLoading
    && !!taskSaveHandler
    && !(!isEditingTask && autoRenderLaunchMode === "now" && !onCreateRender)
    && !!String(title || "").trim()
    && !(filteredAutoRenderForms.length > 0 && !String(autoRenderFormId || "").trim())
    && !!String(renderOutputDir || "").trim()
  ), [
    tasksLoading,
    taskSaveHandler,
    isEditingTask,
    autoRenderLaunchMode,
    onCreateRender,
    title,
    filteredAutoRenderForms,
    autoRenderFormId,
    renderOutputDir,
  ]);

  const submitTaskFormLabel = useMemo(() => (
    isEditingTask
      ? safeT(t, "postprod.tasks.form.save", "Enregistrer tache")
      : (
        autoRenderLaunchMode === "now"
          ? safeT(t, "postprod.tasks.form.autoRender.createNow", "Creer et lancer rendu auto")
          : safeT(t, "postprod.tasks.form.autoRender.createScheduled", "Programmer rendu auto")
      )
  ), [isEditingTask, autoRenderLaunchMode, t]);

  const handleUpdateAutoRenderFormValue = useCallback((fieldKey, nextValue) => {
    const key = String(fieldKey || "").trim();
    if (!key || typeof setAutoRenderFormValues !== "function") return;
    setAutoRenderFormValues((prev) => ({
      ...(prev && typeof prev === "object" && !Array.isArray(prev) ? prev : {}),
      [key]: nextValue,
    }));
  }, [setAutoRenderFormValues]);

  const autoSaveEditedTaskOnBlur = useCallback(async () => {
    if (!showCreateForm || !isEditingTask || typeof onUpdateTask !== "function") return;
    if (tasksLoading || typeof buildTaskPayloadFromCurrentForm !== "function") return;
    const built = buildTaskPayloadFromCurrentForm();
    if (!built?.ok) return;
    let signature = "";
    try {
      signature = JSON.stringify(built.taskPayload);
    } catch {
      signature = "";
    }
    if (!signature || !editAutosaveStateRef?.current) return;
    const state = editAutosaveStateRef.current;
    if (state.signature === signature) return;
    if (state.inFlight) {
      state.pending = true;
      return;
    }
    state.inFlight = true;
    try {
      const saved = await Promise.resolve(onUpdateTask(editingTaskId, built.taskPayload));
      if (saved !== false) {
        state.signature = signature;
        if (typeof setFormError === "function") setFormError("");
      }
    } finally {
      state.inFlight = false;
      if (state.pending) {
        state.pending = false;
        void autoSaveEditedTaskOnBlur();
      }
    }
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
    if (typeof setFormError === "function") setFormError("");
    if (typeof buildTaskPayloadFromCurrentForm !== "function") return;
    const launchMode = autoRenderLaunchMode === "now" ? "now" : "scheduled";
    const built = buildTaskPayloadFromCurrentForm();
    if (!built?.ok) {
      if (typeof setFormError === "function") {
        setFormError(String(built?.error || safeT(t, "postprod.tasks.error.generic", "Impossible d'enregistrer la tache.")));
      }
      return;
    }
    const {
      taskPayload,
      expectedRenderCount,
      expectedRenderNames,
      basePayload,
      effectiveTemplateName,
      projectRef,
    } = built;
    const savedTask = isEditingTask
      ? await Promise.resolve(onUpdateTask?.(editingTaskId, taskPayload))
      : await Promise.resolve(onCreateTask?.(taskPayload));
    if (savedTask === false) return;
    try {
      if (editAutosaveStateRef?.current) {
        editAutosaveStateRef.current.signature = JSON.stringify(taskPayload);
      }
    } catch {}
    if (!isEditingTask && launchMode === "now") {
      const createdTaskIdRaw = Number(savedTask?.id || 0);
      const createdTaskId = Number.isFinite(createdTaskIdRaw) && createdTaskIdRaw > 0
        ? Math.trunc(createdTaskIdRaw)
        : 0;
      const immediatePayload = {
        ...basePayload,
        source: "task_auto_render_now",
        taskId: createdTaskId > 0 ? createdTaskId : undefined,
        taskTitle: String(savedTask?.title || title || "").trim(),
        taskStatus: String(savedTask?.status || "A faire").trim(),
        matchedExpectedRenderName: String(expectedRenderNames[0] || "").trim() || undefined,
        taskExpectedRenderCount: expectedRenderCount,
      };
      await Promise.resolve(onCreateRender?.({
        templateName: effectiveTemplateName,
        projectName: String(projectRef || selectedAutoRenderForm?.projectName || ""),
        payload: immediatePayload,
        requiresValidation: false,
      }));
    }
    if (typeof resetCreateForm === "function") resetCreateForm();
    if (typeof setShowCreateForm === "function") setShowCreateForm(false);
  }, [
    setFormError,
    buildTaskPayloadFromCurrentForm,
    autoRenderLaunchMode,
    t,
    isEditingTask,
    onUpdateTask,
    editingTaskId,
    onCreateTask,
    editAutosaveStateRef,
    onCreateRender,
    title,
    selectedAutoRenderForm,
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
