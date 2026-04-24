import { useCallback } from "react";
import { TaskRowActions } from "../components/TaskRowActions";

function useRenderEditorUiActions({
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
  setAssigneeUserId = null,
  setAutoRenderLaunchMode = null,
  setAutoRenderScheduledMode = null,
  setAutoRenderScheduledAt = null,
  setTaskSequenceName = null,
  setAutoRenderOffscreen = null,
  setAutoRenderExportDestinationIds = null,
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
    setListStatusFilter?.([]);
    setListRenderWorkerFilter?.([]);
    setListProjectFilter?.([]);
    setListFormFilter?.([]);
    setListRenderModeFilter?.([]);
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

  const changeAssigneeUserId = useCallback((value) => {
    const raw = String(value || "").trim();
    if (!raw) {
      setAssigneeUserId?.(null);
      setFormError?.("");
      return;
    }
    const parsed = Number(raw);
    const nextValue = Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
    setAssigneeUserId?.(nextValue);
    setFormError?.("");
  }, [setAssigneeUserId, setFormError]);

  const changeAutoRenderLaunchMode = useCallback((value) => {
    const next = value === "now" ? "now" : (value === "scheduled" ? "scheduled" : "");
    setAutoRenderLaunchMode?.(next);
    if (next !== "scheduled") {
      setAutoRenderScheduledMode?.("");
      setAutoRenderScheduledAt?.("");
    }
  }, [setAutoRenderLaunchMode, setAutoRenderScheduledMode, setAutoRenderScheduledAt]);

  const changeAutoRenderScheduledMode = useCallback((value) => {
    const VALID = ["datetime", "any_station", "specific_station"];
    const next = VALID.includes(value) ? value : "";
    setAutoRenderScheduledMode?.(next);
    if (next !== "datetime") {
      setAutoRenderScheduledAt?.("");
    }
    if (next === "any_station") {
      setAutoRenderWorkerKey?.("auto");
    }
  }, [setAutoRenderScheduledMode, setAutoRenderScheduledAt, setAutoRenderWorkerKey]);

  const changeAutoRenderScheduledAt = useCallback((value) => {
    setAutoRenderScheduledAt?.(String(value || "").trim());
  }, [setAutoRenderScheduledAt]);

  const changeAutoRenderSequence = useCallback((value) => {
    setTaskSequenceName?.(String(value || "").trim());
  }, [setTaskSequenceName]);

  const changeAutoRenderOffscreen = useCallback((value) => {
    setAutoRenderOffscreen?.(value === true);
    setFormError?.("");
  }, [setAutoRenderOffscreen, setFormError]);

  const changeAutoRenderExportDestinationIds = useCallback((values) => {
    const src = Array.isArray(values) ? values : [];
    const out = [];
    const seen = new Set();
    for (const raw of src) {
      const id = String(raw || "").trim().toLowerCase();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    setAutoRenderExportDestinationIds?.(out);
    setFormError?.("");
  }, [setAutoRenderExportDestinationIds, setFormError]);

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
    changeAssigneeUserId,
    changeAutoRenderLaunchMode,
    changeAutoRenderScheduledMode,
    changeAutoRenderScheduledAt,
    changeAutoRenderSequence,
    changeAutoRenderOffscreen,
    changeAutoRenderExportDestinationIds,
  };
}

export { useRenderEditorUiActions };
