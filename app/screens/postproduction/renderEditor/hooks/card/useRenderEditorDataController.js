import { useEffect, useMemo } from "react";
import { useRenderFocusRequestController } from "../useTaskFocusRequestController";
import { useRenderEditorCardListData } from "./useRenderEditorCardListData";
import { useRenderEditorCardAutoRenderData } from "./useRenderEditorCardAutoRenderData";
import { normalizeTaskVisualStatusKey } from "../../helpers";

export function useRenderEditorDataController({
  t,
  tasks = [],
  renders = [],
  projectOptions = [],
  resourceOptions = [],
  renderTemplates = [],
  renderForms = [],
  currentUser = null,
  users = [],
  canAssignRenderRequests = false,
  renderWorkers = [],
  renderOutputDir = "",
  renderExportDestinationOptions = [],
  renderFocusRequest = null,
  onRenderFocusHandled = null,
  onLoadRenderFormFields = null,
  onLoadProjectUnrealCatalog = null,
  onFormModeChange = null,
} = {}) {
  const currentUserId = useMemo(() => {
    const value = Number(currentUser?.id || 0);
    return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null;
  }, [currentUser?.id]);
  const defaultAssigneeUserId = currentUserId;
  const assigneeOptions = useMemo(() => {
    const source = Array.isArray(users) ? users : [];
    const byId = new Map();
    for (const user of source) {
      const idValue = Number(user?.id || 0);
      const id = Number.isFinite(idValue) && idValue > 0 ? Math.trunc(idValue) : 0;
      if (id <= 0) continue;
      if (user?.isActive === false) continue;
      const displayName = String(user?.displayName || "").trim();
      const username = String(user?.username || "").trim();
      const label = displayName || username || String(id);
      if (!label) continue;
      byId.set(id, {
        id,
        displayName,
        username,
        label,
      });
    }
    if (defaultAssigneeUserId != null && !byId.has(defaultAssigneeUserId)) {
      const fallbackDisplayName = String(currentUser?.displayName || "").trim();
      const fallbackUsername = String(currentUser?.username || "").trim();
      const fallbackLabel = fallbackDisplayName || fallbackUsername || String(defaultAssigneeUserId);
      byId.set(defaultAssigneeUserId, {
        id: defaultAssigneeUserId,
        displayName: fallbackDisplayName,
        username: fallbackUsername,
        label: fallbackLabel,
      });
    }
    return Array.from(byId.values()).sort((a, b) =>
      String(a?.label || "").localeCompare(String(b?.label || ""), undefined, { sensitivity: "base" })
    );
  }, [
    users,
    defaultAssigneeUserId,
    currentUser?.displayName,
    currentUser?.username,
  ]);

  const listData = useRenderEditorCardListData({
    t,
    tasks,
    renders,
    projectOptions,
    resourceOptions,
    renderTemplates,
    renderForms,
    renderWorkers,
    defaultAssigneeUserId,
    onFormModeChange,
  });

  useEffect(() => {
    if (canAssignRenderRequests === true) return;
    if (typeof listData?.setAssigneeUserId !== "function") return;
    listData.setAssigneeUserId((prev) => {
      const prevNum = Number(prev || 0);
      const prevId = Number.isFinite(prevNum) && prevNum > 0 ? Math.trunc(prevNum) : null;
      if (prevId === defaultAssigneeUserId) return prev;
      return defaultAssigneeUserId;
    });
  }, [
    canAssignRenderRequests,
    defaultAssigneeUserId,
    listData?.setAssigneeUserId,
  ]);

  const autoRenderData = useRenderEditorCardAutoRenderData({
    t,
    title: listData.title,
    description: listData.description,
    assigneeUserId: listData.assigneeUserId,
    renderOutputDir,
    renderForms,
    normalizedProjectOptions: listData.normalizedProjectOptions,
    normalizedRenderTemplateOptions: listData.normalizedRenderTemplateOptions,
    availableRenderWorkers: listData.availableRenderWorkers,
    selectedResourceRefs: listData.selectedResourceRefs,
    onLoadRenderFormFields,
    onLoadProjectUnrealCatalog,
  });

  const editingTaskVisualStatusKey = useMemo(() => {
    if (listData?.isEditingTask !== true) return "planned";
    const taskIdRaw = Number(listData?.editingTaskId || 0);
    const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
    if (taskId <= 0) return "planned";
    const task = (Array.isArray(tasks) ? tasks : []).find((entry) => {
      const entryIdRaw = Number(entry?.id || 0);
      const entryId = Number.isFinite(entryIdRaw) && entryIdRaw > 0 ? Math.trunc(entryIdRaw) : 0;
      return entryId === taskId;
    });
    if (!task) return "planned";
    const statusRaw = typeof listData?.resolveTaskVisualStatusKey === "function"
      ? listData.resolveTaskVisualStatusKey(task)
      : task?.status;
    return normalizeTaskVisualStatusKey(statusRaw);
  }, [
    listData?.isEditingTask,
    listData?.editingTaskId,
    listData?.resolveTaskVisualStatusKey,
    tasks,
  ]);

  useRenderFocusRequestController({
    renderFocusRequest,
    onRenderFocusHandled,
    tasks,
    setListProjectFilter: listData.setListProjectFilter,
    setListResourceFilter: listData.setListResourceFilter,
    setListStatusFilter: listData.setListStatusFilter,
    setEditingTaskId: listData.setEditingTaskId,
    setShowCreateForm: listData.setShowCreateForm,
    setTitle: listData.setTitle,
    setDescription: listData.setDescription,
    setAssigneeUserId: listData.setAssigneeUserId,
    defaultAssigneeUserId,
    setSelectedResourceRefs: listData.setSelectedResourceRefs,
    setAutoRenderProjectRef: autoRenderData.setAutoRenderProjectRef,
    setAutoRenderFormId: autoRenderData.setAutoRenderFormId,
    setAutoRenderTemplateId: autoRenderData.setAutoRenderTemplateId,
    setAutoRenderFormValues: autoRenderData.setAutoRenderFormValues,
    resetAutoRenderState: autoRenderData.resetAutoRenderState,
    hydrateAutoRenderFromTask: autoRenderData.hydrateAutoRenderFromTask,
    setViewMode: listData.setViewMode,
    setFormError: listData.setFormError,
  });

  return {
    ...listData,
    ...autoRenderData,
    editingTaskVisualStatusKey,
    canAssignRenderRequests: canAssignRenderRequests === true,
    assigneeUserIdLocked: canAssignRenderRequests !== true,
    defaultAssigneeUserId,
    assigneeOptions,
    renderExportDestinationOptions: Array.isArray(renderExportDestinationOptions)
      ? renderExportDestinationOptions
      : [],
  };
}

export default useRenderEditorDataController;
