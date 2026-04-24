import { useEffect, useMemo } from "react";

function useRenderFocusRequestController({
  renderFocusRequest = null,
  onRenderFocusHandled = null,
  tasks = [],
  setListProjectFilter = null,
  setListResourceFilter = null,
  setListStatusFilter = null,
  setEditingTaskId = null,
  setShowCreateForm = null,
  setTitle = null,
  setDescription = null,
  setAssigneeUserId = null,
  defaultAssigneeUserId = null,
  setSelectedResourceRefs = null,
  setAutoRenderProjectRef = null,
  setAutoRenderFormId = null,
  setAutoRenderTemplateId = null,
  setAutoRenderFormValues = null,
  resetAutoRenderState = null,
  hydrateAutoRenderFromTask = null,
  setViewMode = null,
  setFormError = null,
}) {
  const rawFocusRequest = (
    renderFocusRequest && typeof renderFocusRequest === "object"
      ? renderFocusRequest
      : null
  );
  const handleFocusHandled = onRenderFocusHandled;

  const normalizedRenderFocusRequest = useMemo(() => {
    if (!rawFocusRequest || typeof rawFocusRequest !== "object") return null;
    const typeRaw = String(rawFocusRequest?.type || "").trim().toLowerCase();
    const typeNormalized = typeRaw === "rendu" ? "render" : typeRaw;
    const type = typeNormalized === "render" ? "task" : typeNormalized;
    const ref = String(rawFocusRequest?.ref || "").trim();
    const action = String(rawFocusRequest?.action || "").trim().toLowerCase();
    if (!ref) return null;
    if (type !== "project" && type !== "resource" && type !== "task" && type !== "project_create") return null;
    const id = String(rawFocusRequest?.id || `${type}:${action}:${ref}:${Date.now()}`);
    const task = rawFocusRequest?.task && typeof rawFocusRequest.task === "object" && !Array.isArray(rawFocusRequest.task)
      ? rawFocusRequest.task
      : null;
    return { id, type, ref, action, task };
  }, [rawFocusRequest]);

  useEffect(() => {
    if (!normalizedRenderFocusRequest) return;
    const isCreateFromProject = (
      normalizedRenderFocusRequest.type === "project_create"
      || (
        normalizedRenderFocusRequest.type === "project"
        && normalizedRenderFocusRequest.action === "create"
      )
    );

    if (isCreateFromProject) {
      setEditingTaskId?.(0);
      setShowCreateForm?.(true);
      setAutoRenderProjectRef?.(normalizedRenderFocusRequest.ref);
      setAutoRenderFormId?.("");
      setAutoRenderTemplateId?.("");
      setAutoRenderFormValues?.({});
      setAssigneeUserId?.(defaultAssigneeUserId);
      setListProjectFilter?.([]);
      setListResourceFilter?.("all");
    } else if (normalizedRenderFocusRequest.type === "project") {
      setListProjectFilter?.([String(normalizedRenderFocusRequest.ref || "").trim().toLowerCase()]);
      setListResourceFilter?.("all");
    } else if (normalizedRenderFocusRequest.type === "resource") {
      setListResourceFilter?.(normalizedRenderFocusRequest.ref);
      setListProjectFilter?.([]);
    } else if (normalizedRenderFocusRequest.type === "task") {
      const isCreateTaskRequest = normalizedRenderFocusRequest.action === "create";
      if (isCreateTaskRequest) {
        setEditingTaskId?.(0);
        setShowCreateForm?.(true);
        setTitle?.("");
        setDescription?.("");
        setAssigneeUserId?.(defaultAssigneeUserId);
        setSelectedResourceRefs?.([]);
        if (typeof resetAutoRenderState === "function") {
          resetAutoRenderState();
        } else {
          setAutoRenderProjectRef?.("");
          setAutoRenderFormId?.("");
          setAutoRenderTemplateId?.("");
          setAutoRenderFormValues?.({});
        }
        setListProjectFilter?.([]);
        setListResourceFilter?.("all");
      } else {
        const taskId = Number(normalizedRenderFocusRequest.ref || 0);
        if (Number.isFinite(taskId) && taskId > 0) {
          const taskFromPayload = normalizedRenderFocusRequest.task;
          const taskFromList = (Array.isArray(tasks) ? tasks : []).find((entry) => {
            const entryId = Number(entry?.id || 0);
            return Number.isFinite(entryId) && Math.trunc(entryId) === Math.trunc(taskId);
          }) || null;
          const taskToEdit = taskFromPayload && typeof taskFromPayload === "object"
            ? taskFromPayload
            : taskFromList;

          setEditingTaskId?.(Math.trunc(taskId));
          setShowCreateForm?.(true);
          if (taskToEdit && typeof taskToEdit === "object") {
            setTitle?.(String(taskToEdit?.title || ""));
            setDescription?.(String(taskToEdit?.description || ""));
            setAssigneeUserId?.(() => {
              const parsed = Number(taskToEdit?.assigneeUserId || 0);
              if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed);
              return defaultAssigneeUserId;
            });
            setSelectedResourceRefs?.(
              (Array.isArray(taskToEdit?.resourceRefs) ? taskToEdit.resourceRefs : [])
                .map((value) => String(value || "").trim())
                .filter(Boolean)
            );
            hydrateAutoRenderFromTask?.(taskToEdit);
          }
        } else {
          setEditingTaskId?.(0);
          setShowCreateForm?.(false);
        }
        setListProjectFilter?.([]);
        setListResourceFilter?.("all");
      }
    }
    setListStatusFilter?.([]);
    if (normalizedRenderFocusRequest.type !== "task" && !isCreateFromProject) {
      setEditingTaskId?.(0);
      setShowCreateForm?.(false);
    }
    setViewMode?.("list");
    setFormError?.("");
    if (typeof handleFocusHandled === "function") {
      handleFocusHandled(normalizedRenderFocusRequest.id);
    }
  }, [
    normalizedRenderFocusRequest,
    handleFocusHandled,
    setListProjectFilter,
    setListResourceFilter,
    setListStatusFilter,
    setEditingTaskId,
    setShowCreateForm,
    setAutoRenderProjectRef,
    setAutoRenderFormId,
    setAutoRenderTemplateId,
    setAutoRenderFormValues,
    resetAutoRenderState,
    setTitle,
    setDescription,
    setAssigneeUserId,
    defaultAssigneeUserId,
    setSelectedResourceRefs,
    hydrateAutoRenderFromTask,
    tasks,
    setViewMode,
    setFormError,
  ]);

  return {
    normalizedRenderFocusRequest,
  };
}

export { useRenderFocusRequestController };
