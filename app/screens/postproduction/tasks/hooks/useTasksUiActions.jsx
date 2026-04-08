import { useCallback } from "react";
import { TaskRowActions } from "../components/TaskRowActions";

function useTasksUiActions({
  t,
  tasksLoading = false,
  canCreateTasks = false,
  showCreateForm = false,
  onDeleteTask = null,
  openTaskEditor = null,
  openDeleteTaskDialog = null,
  setSearchQuery = null,
  setListStatusFilter = null,
  setListRenderWorkerFilter = null,
  setListProjectFilter = null,
  setListFormFilter = null,
  setListRenderModeFilter = null,
  setFavoriteOnly = null,
  setSearchExpanded = null,
  setAutoRenderProjectRef = null,
  setAutoRenderFormId = null,
  setAutoRenderTemplateId = null,
  setAutoRenderFormValues = null,
  setFormError = null,
  setAutoRenderWorkerKey = null,
  setAutoRenderLaunchMode = null,
}) {
  const renderTaskActions = useCallback((task) => (
    <TaskRowActions
      t={t}
      task={task}
      disabledEdit={!canCreateTasks || (tasksLoading && !showCreateForm)}
      disabledDelete={!canCreateTasks || tasksLoading || typeof onDeleteTask !== "function"}
      onEdit={openTaskEditor}
      onDelete={openDeleteTaskDialog}
    />
  ), [t, canCreateTasks, tasksLoading, showCreateForm, onDeleteTask, openTaskEditor, openDeleteTaskDialog]);

  const clearListFilters = useCallback(() => {
    setSearchQuery?.("");
    setListStatusFilter?.("all");
    setListRenderWorkerFilter?.("all");
    setListProjectFilter?.("all");
    setListFormFilter?.("all");
    setListRenderModeFilter?.("all");
    setFavoriteOnly?.(false);
    setSearchExpanded?.(false);
  }, [
    setSearchQuery,
    setListStatusFilter,
    setListRenderWorkerFilter,
    setListProjectFilter,
    setListFormFilter,
    setListRenderModeFilter,
    setFavoriteOnly,
    setSearchExpanded,
  ]);

  const openAdvancedSearch = useCallback(() => {
    setSearchExpanded?.(true);
  }, [setSearchExpanded]);

  const closeAdvancedSearch = useCallback(() => {
    setSearchExpanded?.(false);
  }, [setSearchExpanded]);

  const toggleFavoriteOnly = useCallback(() => {
    setFavoriteOnly?.((prev) => !prev);
  }, [setFavoriteOnly]);

  const changeAutoRenderForm = useCallback((value) => {
    setAutoRenderFormId?.(value);
    setAutoRenderTemplateId?.("");
    setAutoRenderFormValues?.({});
    setFormError?.("");
  }, [setAutoRenderFormId, setAutoRenderTemplateId, setAutoRenderFormValues, setFormError]);

  const changeAutoRenderProject = useCallback((value) => {
    const nextRef = String(value || "").trim();
    setAutoRenderProjectRef?.(nextRef);
    setAutoRenderFormId?.("");
    setAutoRenderTemplateId?.("");
    setAutoRenderFormValues?.({});
    setFormError?.("");
  }, [
    setAutoRenderProjectRef,
    setAutoRenderFormId,
    setAutoRenderTemplateId,
    setAutoRenderFormValues,
    setFormError,
  ]);

  const changeAutoRenderTemplate = useCallback((value) => {
    setAutoRenderTemplateId?.(value);
    setFormError?.("");
  }, [setAutoRenderTemplateId, setFormError]);

  const changeAutoRenderWorker = useCallback((value) => {
    setAutoRenderWorkerKey?.(value);
    setFormError?.("");
  }, [setAutoRenderWorkerKey, setFormError]);

  const changeAutoRenderLaunchMode = useCallback((value) => {
    setAutoRenderLaunchMode?.(value === "now" ? "now" : "scheduled");
  }, [setAutoRenderLaunchMode]);

  return {
    renderTaskActions,
    clearListFilters,
    openAdvancedSearch,
    closeAdvancedSearch,
    toggleFavoriteOnly,
    changeAutoRenderProject,
    changeAutoRenderForm,
    changeAutoRenderTemplate,
    changeAutoRenderWorker,
    changeAutoRenderLaunchMode,
  };
}

export { useTasksUiActions };
