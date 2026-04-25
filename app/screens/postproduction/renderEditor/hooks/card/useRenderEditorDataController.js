import { useEffect, useMemo } from "react";
import { useRenderFocusRequestController } from "../useTaskFocusRequestController";
import { useRenderEditorCardListData } from "./useRenderEditorCardListData";
import { useRenderEditorCardAutoRenderData } from "./useRenderEditorCardAutoRenderData";
import { normalizeTaskVisualStatusKey } from "../../helpers";

function toPositiveTaskId(value = 0) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function resolveRenderLinkedTaskId(render = null) {
  const payload = render?.payload && typeof render.payload === "object" && !Array.isArray(render.payload)
    ? render.payload
    : {};
  return toPositiveTaskId(render?.linkedTaskId || payload?.taskId || 0);
}

function toRenderSortStamp(render = null) {
  const candidates = [
    render?.updatedAt,
    render?.finishedAt,
    render?.startedAt,
    render?.createdAt,
  ];
  for (const candidate of candidates) {
    const parsed = Date.parse(String(candidate || "").trim());
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

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

  const editingTaskRejectionInfo = useMemo(() => {
    if (listData?.isEditingTask !== true) return null;
    if (normalizeTaskVisualStatusKey(editingTaskVisualStatusKey) !== "rejected") return null;
    const editingTaskId = toPositiveTaskId(listData?.editingTaskId);
    if (editingTaskId <= 0) return null;

    let latestRejectedRender = null;
    let latestRejectedStamp = 0;
    let latestRejectedId = 0;
    const renderList = Array.isArray(renders) ? renders : [];
    for (const render of renderList) {
      if (resolveRenderLinkedTaskId(render) !== editingTaskId) continue;
      const reviewStatus = String(render?.reviewStatus || "").trim().toLowerCase();
      if (reviewStatus !== "to_modify") continue;
      const renderStamp = toRenderSortStamp(render);
      const renderIdRaw = Number(render?.id || 0);
      const renderId = Number.isFinite(renderIdRaw) && renderIdRaw > 0 ? Math.trunc(renderIdRaw) : 0;
      const shouldReplace = (
        !latestRejectedRender
        || renderStamp > latestRejectedStamp
        || (renderStamp === latestRejectedStamp && renderId > latestRejectedId)
      );
      if (!shouldReplace) continue;
      latestRejectedRender = render;
      latestRejectedStamp = renderStamp;
      latestRejectedId = renderId;
    }

    if (!latestRejectedRender) return null;
    const payload = latestRejectedRender?.payload
      && typeof latestRejectedRender.payload === "object"
      && !Array.isArray(latestRejectedRender.payload)
      ? latestRejectedRender.payload
      : {};
    const rejection = payload?.rejection
      && typeof payload.rejection === "object"
      && !Array.isArray(payload.rejection)
      ? payload.rejection
      : {};

    const rejectedByUsername = String(rejection?.byUsername || "").trim();
    const rejectedByUserId = toPositiveTaskId(rejection?.byUserId || 0);
    const rejectedAt = String(
      rejection?.at
      || latestRejectedRender?.updatedAt
      || latestRejectedRender?.finishedAt
      || latestRejectedRender?.createdAt
      || ""
    ).trim();
    const reason = String(rejection?.reason || "").trim();

    return {
      renderId: latestRejectedId,
      rejectedByUsername,
      rejectedByUserId: rejectedByUserId > 0 ? rejectedByUserId : null,
      rejectedAt,
      reason,
    };
  }, [
    editingTaskVisualStatusKey,
    listData?.editingTaskId,
    listData?.isEditingTask,
    renders,
  ]);

  useRenderFocusRequestController({
    renderFocusRequest,
    onRenderFocusHandled,
    tasks,
    renders,
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
    editingTaskRejectionInfo,
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
