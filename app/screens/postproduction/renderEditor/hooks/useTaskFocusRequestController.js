import { useEffect, useMemo, useRef } from "react";
import {
  toTrimmedString,
  toPositiveInt,
  firstNonEmptyString,
  firstPositiveInt,
} from "../../../../utils/coerce";
import {
  extractFormIdFromTemplateLike,
} from "../../renders/renderLookupHelpers";

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}

function resolveRenderPayload(render = null) {
  return asRecord(render?.payload) || {};
}

function resolveRenderSourceToken(render = null) {
  const payload = resolveRenderPayload(render);
  return toTrimmedString(
    render?.origin
    || payload?.source
  ).toLowerCase();
}

function isDetectedRenderSource(source = "") {
  const token = toTrimmedString(source).toLowerCase();
  return token === "detected" || token === "detected_file";
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

function resolveRenderLinkedTaskId(render = null) {
  const item = asRecord(render);
  if (!item) return 0;
  const payload = resolveRenderPayload(item);
  return firstPositiveInt([item.linkedTaskId, payload.taskId]);
}

function resolveLatestRenderForTask(taskId = 0, renders = []) {
  const normalizedTaskId = toPositiveInt(taskId);
  if (normalizedTaskId <= 0) return null;
  let bestPreferredRender = null;
  let bestPreferredStamp = 0;
  let bestPreferredId = 0;
  let bestFallbackRender = null;
  let bestFallbackStamp = 0;
  let bestFallbackId = 0;
  for (const render of Array.isArray(renders) ? renders : []) {
    if (resolveRenderLinkedTaskId(render) !== normalizedTaskId) continue;
    const stamp = toRenderSortStamp(render);
    const renderId = toPositiveInt(render?.id || 0);
    const shouldReplaceFallback = (
      !bestFallbackRender
      || stamp > bestFallbackStamp
      || (stamp === bestFallbackStamp && renderId > bestFallbackId)
    );
    if (shouldReplaceFallback) {
      bestFallbackRender = render;
      bestFallbackStamp = stamp;
      bestFallbackId = renderId;
    }

    const source = resolveRenderSourceToken(render);
    if (isDetectedRenderSource(source)) continue;
    const shouldReplacePreferred = (
      !bestPreferredRender
      || stamp > bestPreferredStamp
      || (stamp === bestPreferredStamp && renderId > bestPreferredId)
    );
    if (!shouldReplacePreferred) continue;
    bestPreferredRender = render;
    bestPreferredStamp = stamp;
    bestPreferredId = renderId;
  }
  return bestPreferredRender || bestFallbackRender;
}

function resolveMergedAutoRenderConfig(task = null, latestRender = null) {
  const sourceTask = asRecord(task) || {};
  const sourceRender = asRecord(latestRender) || {};
  const taskAutoConfig = asRecord(sourceTask.autoRenderConfig) || {};
  const taskAutoPayload = asRecord(taskAutoConfig.payload) || {};
  const renderPayload = resolveRenderPayload(sourceRender);

  const mergedFormData = (
    asRecord(taskAutoConfig.formData)
    || asRecord(taskAutoPayload.formData)
    || asRecord(sourceRender.formData)
    || asRecord(renderPayload.formData)
    || {}
  );
  const mergedFormId = firstPositiveInt([
    taskAutoConfig.formId,
    taskAutoConfig.renderFormId,
    taskAutoConfig.formRef,
    taskAutoConfig.renderFormRef,
    taskAutoPayload.formId,
    taskAutoPayload.renderFormId,
    taskAutoPayload.formRef,
    taskAutoPayload.renderFormRef,
    sourceRender.formId,
    sourceRender.renderFormId,
    sourceRender.formRef,
    sourceRender.renderFormRef,
    renderPayload.formId,
    renderPayload.renderFormId,
    renderPayload.formRef,
    renderPayload.renderFormRef,
    extractFormIdFromTemplateLike(taskAutoConfig.templateName),
    extractFormIdFromTemplateLike(taskAutoPayload.templateName),
    extractFormIdFromTemplateLike(sourceRender.templateName),
    extractFormIdFromTemplateLike(renderPayload.templateName),
    extractFormIdFromTemplateLike(taskAutoConfig.renderModeName),
    extractFormIdFromTemplateLike(taskAutoPayload.renderModeName),
    extractFormIdFromTemplateLike(renderPayload.renderModeName),
  ]);

  const mergedPayload = {
    ...renderPayload,
    ...taskAutoPayload,
  };
  if (mergedFormId > 0) mergedPayload.formId = mergedFormId;
  if (Object.keys(mergedFormData).length > 0) mergedPayload.formData = mergedFormData;

  const projectRef = firstNonEmptyString(
    Array.isArray(sourceTask.projectRefs) ? sourceTask.projectRefs : []
  );
  const mergedProjectName = firstNonEmptyString([
    taskAutoConfig.projectName,
    projectRef,
    sourceRender.projectName,
    renderPayload.projectName,
    renderPayload.projectRef,
  ]);
  const mergedTemplateName = firstNonEmptyString([
    taskAutoConfig.templateName,
    taskAutoPayload.templateName,
    sourceRender.templateName,
    renderPayload.templateName,
    taskAutoConfig.renderModeName,
    taskAutoPayload.renderModeName,
    renderPayload.renderModeName,
  ]);
  const mergedOutputProfile = firstNonEmptyString([
    taskAutoConfig.outputProfile,
    taskAutoPayload.outputProfile,
    sourceRender.outputProfile,
    renderPayload.outputProfile,
  ]);
  const mergedMapName = firstNonEmptyString([
    taskAutoConfig.mapName,
    taskAutoPayload.mapName,
    renderPayload.mapName,
  ]);
  const mergedSequenceName = firstNonEmptyString([
    taskAutoConfig.sequenceName,
    taskAutoPayload.sequenceName,
    renderPayload.sequenceName,
  ]);
  const mergedPresetName = firstNonEmptyString([
    taskAutoConfig.presetName,
    taskAutoPayload.presetName,
    sourceRender.presetName,
    renderPayload.presetName,
  ]);
  const mergedPresetPath = firstNonEmptyString([
    taskAutoConfig.presetPath,
    taskAutoPayload.presetPath,
    sourceRender.presetPath,
    renderPayload.presetPath,
  ]);
  const mergedLaunchMode = firstNonEmptyString([
    taskAutoConfig.launchMode,
    taskAutoPayload.launchMode,
    renderPayload.launchMode,
    sourceRender.launchMode,
  ]);
  const mergedScheduledMode = firstNonEmptyString([
    taskAutoConfig.scheduledMode,
    taskAutoPayload.scheduledMode,
    renderPayload.scheduledMode,
    sourceTask.scheduledMode,
  ]);
  const mergedScheduledAt = firstNonEmptyString([
    taskAutoConfig.scheduledAt,
    taskAutoPayload.scheduledAt,
    sourceRender.scheduledAt,
    renderPayload.scheduledAt,
    sourceTask.scheduledAt,
  ]);

  if (mergedProjectName) mergedPayload.projectName = mergedProjectName;
  if (mergedTemplateName) mergedPayload.templateName = mergedTemplateName;
  if (mergedOutputProfile) mergedPayload.outputProfile = mergedOutputProfile;
  if (mergedMapName) mergedPayload.mapName = mergedMapName;
  if (mergedSequenceName) mergedPayload.sequenceName = mergedSequenceName;
  if (mergedPresetName) mergedPayload.presetName = mergedPresetName;
  if (mergedPresetPath) mergedPayload.presetPath = mergedPresetPath;
  if (mergedLaunchMode) mergedPayload.launchMode = mergedLaunchMode;
  if (mergedScheduledMode) mergedPayload.scheduledMode = mergedScheduledMode;
  if (mergedScheduledAt) mergedPayload.scheduledAt = mergedScheduledAt;

  const mergedConfig = {
    ...taskAutoConfig,
    payload: mergedPayload,
  };
  if (mergedFormId > 0) mergedConfig.formId = mergedFormId;
  if (Object.keys(mergedFormData).length > 0) mergedConfig.formData = mergedFormData;
  if (mergedProjectName) mergedConfig.projectName = mergedProjectName;
  if (mergedTemplateName) mergedConfig.templateName = mergedTemplateName;
  if (mergedOutputProfile) mergedConfig.outputProfile = mergedOutputProfile;
  if (mergedMapName) mergedConfig.mapName = mergedMapName;
  if (mergedSequenceName) mergedConfig.sequenceName = mergedSequenceName;
  if (mergedPresetName) mergedConfig.presetName = mergedPresetName;
  if (mergedPresetPath) mergedConfig.presetPath = mergedPresetPath;
  if (mergedLaunchMode) mergedConfig.launchMode = mergedLaunchMode;
  if (mergedScheduledMode) mergedConfig.scheduledMode = mergedScheduledMode;
  if (mergedScheduledAt) mergedConfig.scheduledAt = mergedScheduledAt;

  return mergedConfig;
}

function buildHydrationTaskSnapshot(task = null, taskId = 0, renders = []) {
  const sourceTask = asRecord(task);
  if (!sourceTask) return null;
  const latestRender = resolveLatestRenderForTask(taskId, renders);
  if (!latestRender) return sourceTask;
  return {
    ...sourceTask,
    autoRenderConfig: resolveMergedAutoRenderConfig(sourceTask, latestRender),
  };
}

function useRenderFocusRequestController({
  renderFocusRequest = null,
  onRenderFocusHandled = null,
  tasks = [],
  renders = [],
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

  const ctxRef = useRef({});
  ctxRef.current = {
    handleFocusHandled,
    tasks,
    renders,
    defaultAssigneeUserId,
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
    setSelectedResourceRefs,
    hydrateAutoRenderFromTask,
    setViewMode,
    setFormError,
  };

  useEffect(() => {
    if (!normalizedRenderFocusRequest) return;
    const ctx = ctxRef.current;
    const isCreateFromProject = (
      normalizedRenderFocusRequest.type === "project_create"
      || (
        normalizedRenderFocusRequest.type === "project"
        && normalizedRenderFocusRequest.action === "create"
      )
    );

    if (isCreateFromProject) {
      ctx.setEditingTaskId?.(0);
      ctx.setShowCreateForm?.(true);
      ctx.setAutoRenderProjectRef?.(normalizedRenderFocusRequest.ref);
      ctx.setAutoRenderFormId?.("");
      ctx.setAutoRenderTemplateId?.("");
      ctx.setAutoRenderFormValues?.({});
      ctx.setAssigneeUserId?.(ctx.defaultAssigneeUserId);
      ctx.setListProjectFilter?.([]);
      ctx.setListResourceFilter?.("all");
    } else if (normalizedRenderFocusRequest.type === "project") {
      ctx.setListProjectFilter?.([String(normalizedRenderFocusRequest.ref || "").trim().toLowerCase()]);
      ctx.setListResourceFilter?.("all");
    } else if (normalizedRenderFocusRequest.type === "resource") {
      ctx.setListResourceFilter?.(normalizedRenderFocusRequest.ref);
      ctx.setListProjectFilter?.([]);
    } else if (normalizedRenderFocusRequest.type === "task") {
      const isCreateTaskRequest = normalizedRenderFocusRequest.action === "create";
      if (isCreateTaskRequest) {
        ctx.setEditingTaskId?.(0);
        ctx.setShowCreateForm?.(true);
        ctx.setTitle?.("");
        ctx.setDescription?.("");
        ctx.setAssigneeUserId?.(ctx.defaultAssigneeUserId);
        ctx.setSelectedResourceRefs?.([]);
        if (typeof ctx.resetAutoRenderState === "function") {
          ctx.resetAutoRenderState();
        } else {
          ctx.setAutoRenderProjectRef?.("");
          ctx.setAutoRenderFormId?.("");
          ctx.setAutoRenderTemplateId?.("");
          ctx.setAutoRenderFormValues?.({});
        }
        ctx.setListProjectFilter?.([]);
        ctx.setListResourceFilter?.("all");
      } else {
        const taskId = Number(normalizedRenderFocusRequest.ref || 0);
        if (Number.isFinite(taskId) && taskId > 0) {
          const taskFromPayload = normalizedRenderFocusRequest.task;
          const taskFromList = (Array.isArray(ctx.tasks) ? ctx.tasks : []).find((entry) => {
            const entryId = Number(entry?.id || 0);
            return Number.isFinite(entryId) && Math.trunc(entryId) === Math.trunc(taskId);
          }) || null;
          const taskToEdit = taskFromList && typeof taskFromList === "object"
            ? taskFromList
            : (
              taskFromPayload && typeof taskFromPayload === "object"
                ? taskFromPayload
                : null
            );

          ctx.setEditingTaskId?.(Math.trunc(taskId));
          ctx.setShowCreateForm?.(true);
          if (taskToEdit && typeof taskToEdit === "object") {
            ctx.setTitle?.(String(taskToEdit?.title || ""));
            ctx.setDescription?.(String(taskToEdit?.description || ""));
            ctx.setAssigneeUserId?.(() => {
              const parsed = Number(taskToEdit?.assigneeUserId || 0);
              if (Number.isFinite(parsed) && parsed > 0) return Math.trunc(parsed);
              return ctx.defaultAssigneeUserId;
            });
            ctx.setSelectedResourceRefs?.(
              (Array.isArray(taskToEdit?.resourceRefs) ? taskToEdit.resourceRefs : [])
                .map((value) => String(value || "").trim())
                .filter(Boolean)
            );
            const hydrationTask = buildHydrationTaskSnapshot(taskToEdit, Math.trunc(taskId), ctx.renders) || taskToEdit;
            ctx.hydrateAutoRenderFromTask?.(hydrationTask);
          }
        } else {
          ctx.setEditingTaskId?.(0);
          ctx.setShowCreateForm?.(false);
        }
        ctx.setListProjectFilter?.([]);
        ctx.setListResourceFilter?.("all");
      }
    }
    ctx.setListStatusFilter?.([]);
    if (normalizedRenderFocusRequest.type !== "task" && !isCreateFromProject) {
      ctx.setEditingTaskId?.(0);
      ctx.setShowCreateForm?.(false);
    }
    ctx.setViewMode?.("list");
    ctx.setFormError?.("");
    if (typeof ctx.handleFocusHandled === "function") {
      ctx.handleFocusHandled(normalizedRenderFocusRequest.id);
    }
  }, [normalizedRenderFocusRequest]);

  return {
    normalizedRenderFocusRequest,
  };
}

export { useRenderFocusRequestController };
