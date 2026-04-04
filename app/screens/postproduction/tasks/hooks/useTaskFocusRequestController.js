import { useEffect, useMemo } from "react";

function useTaskFocusRequestController({
  taskFocusRequest = null,
  onTaskFocusHandled = null,
  setListProjectFilter = null,
  setListResourceFilter = null,
  setListStatusFilter = null,
  setEditingTaskId = null,
  setShowCreateForm = null,
  setViewMode = null,
  setFormError = null,
}) {
  const normalizedTaskFocusRequest = useMemo(() => {
    if (!taskFocusRequest || typeof taskFocusRequest !== "object") return null;
    const type = String(taskFocusRequest?.type || "").trim().toLowerCase();
    const ref = String(taskFocusRequest?.ref || "").trim();
    if (!ref) return null;
    if (type !== "project" && type !== "resource") return null;
    const id = String(taskFocusRequest?.id || `${type}:${ref}:${Date.now()}`);
    return { id, type, ref };
  }, [taskFocusRequest]);

  useEffect(() => {
    if (!normalizedTaskFocusRequest) return;
    if (normalizedTaskFocusRequest.type === "project") {
      setListProjectFilter?.(normalizedTaskFocusRequest.ref);
      setListResourceFilter?.("all");
    } else if (normalizedTaskFocusRequest.type === "resource") {
      setListResourceFilter?.(normalizedTaskFocusRequest.ref);
      setListProjectFilter?.("all");
    }
    setListStatusFilter?.("all");
    setEditingTaskId?.(0);
    setShowCreateForm?.(false);
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
    setViewMode,
    setFormError,
  ]);

  return {
    normalizedTaskFocusRequest,
  };
}

export { useTaskFocusRequestController };
