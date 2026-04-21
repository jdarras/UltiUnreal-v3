import { useEffect, useMemo } from "react";

function useTaskFocusRequestController({
  taskFocusRequest = null,
  tasks = [],
  onTaskFocusHandled = null,
  setListProjectFilter = null,
  setListResourceFilter = null,
  setListStatusFilter = null,
  setEditingTaskId = null,
  setShowCreateForm = null,
  setTitle = null,
  setDescription = null,
  setSelectedResourceRefs = null,
  setAutoRenderProjectRef = null,
  setAutoRenderFormId = null,
  setAutoRenderTemplateId = null,
  setAutoRenderFormValues = null,
  hydrateAutoRenderFromTask = null,
  setViewMode = null,
  setFormError = null,
}) {
  const normalizedTaskFocusRequest = useMemo(() => {
    if (!taskFocusRequest || typeof taskFocusRequest !== "object") return null;
    const type = String(taskFocusRequest?.type || "").trim().toLowerCase();
    const ref = String(taskFocusRequest?.ref || "").trim();
    const action = String(taskFocusRequest?.action || "").trim().toLowerCase();
    if (!ref) return null;
    if (type !== "project" && type !== "resource" && type !== "task" && type !== "project_create") return null;
    const id = String(taskFocusRequest?.id || `${type}:${action}:${ref}:${Date.now()}`);
    const task = taskFocusRequest?.task && typeof taskFocusRequest.task === "object" && !Array.isArray(taskFocusRequest.task)
      ? taskFocusRequest.task
      : null;
    return { id, type, ref, action, task };
  }, [taskFocusRequest]);

  useEffect(() => {
    if (!normalizedTaskFocusRequest) return;
    const isCreateFromProject = (
      normalizedTaskFocusRequest.type === "project_create"
      || (
        normalizedTaskFocusRequest.type === "project"
        && normalizedTaskFocusRequest.action === "create"
      )
    );

    if (isCreateFromProject) {
      setEditingTaskId?.(0);
      setShowCreateForm?.(true);
      setAutoRenderProjectRef?.(normalizedTaskFocusRequest.ref);
      setAutoRenderFormId?.("");
      setAutoRenderTemplateId?.("");
      setAutoRenderFormValues?.({});
      setListProjectFilter?.([]);
      setListResourceFilter?.("all");
    } else if (normalizedTaskFocusRequest.type === "project") {
      setListProjectFilter?.([String(normalizedTaskFocusRequest.ref || "").trim().toLowerCase()]);
      setListResourceFilter?.("all");
    } else if (normalizedTaskFocusRequest.type === "resource") {
      setListResourceFilter?.(normalizedTaskFocusRequest.ref);
      setListProjectFilter?.([]);
    } else if (normalizedTaskFocusRequest.type === "task") {
      const taskId = Number(normalizedTaskFocusRequest.ref || 0);
      if (Number.isFinite(taskId) && taskId > 0) {
        const taskFromPayload = normalizedTaskFocusRequest.task;
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
    setListStatusFilter?.([]);
    if (normalizedTaskFocusRequest.type !== "task" && !isCreateFromProject) {
      setEditingTaskId?.(0);
      setShowCreateForm?.(false);
    }
    setViewMode?.("list");
    setFormError?.("");
    if (typeof onTaskFocusHandled === "function") {
      onTaskFocusHandled(normalizedTaskFocusRequest.id);
    }
  }, [
    normalizedTaskFocusRequest,
    onTaskFocusHandled,
    setListProjectFilter,
    setListResourceFilter,
    setListStatusFilter,
    setEditingTaskId,
    setShowCreateForm,
    setAutoRenderProjectRef,
    setAutoRenderFormId,
    setAutoRenderTemplateId,
    setAutoRenderFormValues,
    setTitle,
    setDescription,
    setSelectedResourceRefs,
    hydrateAutoRenderFromTask,
    tasks,
    setViewMode,
    setFormError,
  ]);

  return {
    normalizedTaskFocusRequest,
  };
}

export { useTaskFocusRequestController };
