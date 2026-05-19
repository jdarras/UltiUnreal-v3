import { useCallback } from "react";

export function useTaskFormLifecycleController({
  setEditingTaskId = null,
  setShowCreateForm = null,
  setTitle = null,
  setDescription = null,
  setAssigneeUserId = null,
  defaultAssigneeUserId = null,
  setSelectedResourceRefs = null,
  hydrateAutoRenderFromTask = null,
  resetAutoRenderState = null,
  setFormError = null,
}) {
  const resetCreateForm = useCallback(() => {
    setEditingTaskId?.(0);
    setTitle?.("");
    setDescription?.("");
    setAssigneeUserId?.(defaultAssigneeUserId);
    setSelectedResourceRefs?.([]);
    resetAutoRenderState?.();
    setFormError?.("");
  }, [
    setEditingTaskId,
    setTitle,
    setDescription,
    setAssigneeUserId,
    defaultAssigneeUserId,
    setSelectedResourceRefs,
    resetAutoRenderState,
    setFormError,
  ]);

  const openTaskEditor = useCallback((task) => {
    const taskId = Number(task?.id || 0);
    if (!Number.isFinite(taskId) || taskId <= 0) return;

    setEditingTaskId?.(Math.trunc(taskId));
    setShowCreateForm?.(true);
    setTitle?.(String(task?.title || ""));
    setDescription?.(String(task?.description || ""));
    setAssigneeUserId?.(() => {
      const parsed = Number(task?.assigneeUserId || 0);
      if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed);
      return defaultAssigneeUserId;
    });
    setSelectedResourceRefs?.(
      (Array.isArray(task?.resourceRefs) ? task.resourceRefs : [])
        .map((ref) => String(ref || "").trim())
        .filter(Boolean)
    );
    hydrateAutoRenderFromTask?.(task);
    setFormError?.("");
  }, [
    setEditingTaskId,
    setShowCreateForm,
    setTitle,
    setDescription,
    setAssigneeUserId,
    defaultAssigneeUserId,
    setSelectedResourceRefs,
    hydrateAutoRenderFromTask,
    setFormError,
  ]);

  const openCreateTaskForm = useCallback(() => {
    resetCreateForm();
    setShowCreateForm?.(true);
    setFormError?.("");
  }, [resetCreateForm, setShowCreateForm, setFormError]);

  const closeTaskForm = useCallback(() => {
    resetCreateForm();
    setShowCreateForm?.(false);
    setFormError?.("");
  }, [resetCreateForm, setShowCreateForm, setFormError]);

  return {
    resetCreateForm,
    openTaskEditor,
    openCreateTaskForm,
    closeTaskForm,
  };
}
