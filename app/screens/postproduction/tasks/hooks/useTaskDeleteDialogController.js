import { useCallback, useEffect, useRef, useState } from "react";

export function useTaskDeleteDialogController({
  onDeleteTask = null,
  editingTaskId = 0,
  onDeleteEditingTask = null,
}) {
  const [deleteDialogTask, setDeleteDialogTask] = useState(null);
  const [deleteDialogBusy, setDeleteDialogBusy] = useState(false);
  const deleteDialogOkBtnRef = useRef(null);
  const deleteDialogPrevFocusRef = useRef(null);

  const restoreDeleteDialogFocus = useCallback(() => {
    const prev = deleteDialogPrevFocusRef.current;
    deleteDialogPrevFocusRef.current = null;
    if (prev && typeof prev.focus === "function") {
      setTimeout(() => {
        try {
          prev.focus();
        } catch {}
      }, 0);
    }
  }, []);

  const closeDeleteTaskDialog = useCallback(async (shouldDelete) => {
    const dialogTask =
      deleteDialogTask && typeof deleteDialogTask === "object"
        ? deleteDialogTask
        : null;
    if (!dialogTask) return;
    if (!shouldDelete) {
      setDeleteDialogBusy(false);
      setDeleteDialogTask(null);
      restoreDeleteDialogFocus();
      return;
    }
    if (deleteDialogBusy) return;
    setDeleteDialogBusy(true);
    const deleted = await Promise.resolve(onDeleteTask?.(dialogTask.id));
    if (deleted === false) {
      setDeleteDialogBusy(false);
      return;
    }
    if (Number(editingTaskId || 0) === Number(dialogTask.id || 0)) {
      await Promise.resolve(onDeleteEditingTask?.(dialogTask.id));
    }
    setDeleteDialogBusy(false);
    setDeleteDialogTask(null);
    restoreDeleteDialogFocus();
  }, [deleteDialogTask, deleteDialogBusy, onDeleteTask, editingTaskId, onDeleteEditingTask, restoreDeleteDialogFocus]);

  useEffect(() => {
    if (!deleteDialogTask) return undefined;
    const onKeyDown = (event) => {
      const key = String(event?.key || "").trim().toLowerCase();
      if (key === "escape") {
        event.preventDefault();
        event.stopPropagation();
        void closeDeleteTaskDialog(false);
        return;
      }
      if (key === "enter" && !deleteDialogBusy) {
        event.preventDefault();
        event.stopPropagation();
        void closeDeleteTaskDialog(true);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", onKeyDown, true);
    }
    const timer = setTimeout(() => {
      deleteDialogOkBtnRef.current?.focus?.();
    }, 0);
    return () => {
      clearTimeout(timer);
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", onKeyDown, true);
      }
    };
  }, [deleteDialogTask, deleteDialogBusy, closeDeleteTaskDialog]);

  const openDeleteTaskDialog = useCallback((task) => {
    const taskIdRaw = Number(task?.id || 0);
    const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
    if (taskId <= 0) return;
    const activeEl =
      typeof document !== "undefined" && document?.activeElement
        ? document.activeElement
        : null;
    deleteDialogPrevFocusRef.current =
      activeEl && typeof activeEl.focus === "function" ? activeEl : null;
    setDeleteDialogBusy(false);
    setDeleteDialogTask({
      id: taskId,
      title: String(task?.title || "").trim(),
    });
  }, []);

  return {
    deleteDialogTask,
    deleteDialogBusy,
    deleteDialogOkBtnRef,
    openDeleteTaskDialog,
    closeDeleteTaskDialog,
  };
}

export default useTaskDeleteDialogController;
