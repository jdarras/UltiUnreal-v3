import { useEffect, useMemo } from "react";

function useTaskFocusRequestController({
  taskFocusRequest = null,
  onTaskFocusHandled = null,
  setListProjectFilter = null,
  setListResourceFilter = null,
  setListStatusFilter = null,
  setEditingTaskId = null,
  setShowCreateForm = null,
  setAutoRenderProjectRef = null,
  setAutoRenderFormId = null,
  setAutoRenderTemplateId = null,
  setAutoRenderFormValues = null,
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
    return { id, type, ref, action };
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
      setListProjectFilter?.("all");
      setListResourceFilter?.("all");
    } else if (normalizedTaskFocusRequest.type === "project") {
      setListProjectFilter?.(normalizedTaskFocusRequest.ref);
      setListResourceFilter?.("all");
    } else if (normalizedTaskFocusRequest.type === "resource") {
      setListResourceFilter?.(normalizedTaskFocusRequest.ref);
      setListProjectFilter?.("all");
    } else if (normalizedTaskFocusRequest.type === "task") {
      const taskId = Number(normalizedTaskFocusRequest.ref || 0);
      if (Number.isFinite(taskId) && taskId > 0) {
        setEditingTaskId?.(Math.trunc(taskId));
        setShowCreateForm?.(true);
      } else {
        setEditingTaskId?.(0);
        setShowCreateForm?.(false);
      }
      setListProjectFilter?.("all");
      setListResourceFilter?.("all");
    }
    setListStatusFilter?.("all");
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
    setViewMode,
    setFormError,
  ]);

  return {
    normalizedTaskFocusRequest,
  };
}

export { useTaskFocusRequestController };
