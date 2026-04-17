import { safeT } from "../../../shared/helpers";
import { toPayloadSignature } from "./taskEditorAutosaveHelpers";

function resolveSavedTaskId(savedTask) {
  const value = Number(savedTask?.id || 0);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function buildImmediateRenderRequest({
  basePayload = {},
  savedTask = null,
  fallbackTaskTitle = "",
  expectedRenderNames = [],
  expectedRenderCount = 1,
  effectiveTemplateName = "",
  projectRef = "",
  selectedAutoRenderForm = null,
  renderStation = "local",
  renderStationName = "",
  scheduledAt = null,
} = {}) {
  const taskTitle = String(savedTask?.title || fallbackTaskTitle || "").trim();
  const taskStatus = String(savedTask?.status || "A faire").trim();
  const matchedExpectedRenderName = String(expectedRenderNames?.[0] || "").trim() || undefined;
  const createdTaskId = resolveSavedTaskId(savedTask);
  const projectName = String(projectRef || selectedAutoRenderForm?.projectName || "");
  const isScheduled = !!scheduledAt;

  return {
    templateName: effectiveTemplateName,
    projectName,
    render_station: String(renderStation || "local").trim() || "local",
    render_station_name: String(renderStationName || "").trim(),
    ...(scheduledAt ? { scheduledAt } : {}),
    payload: {
      ...(basePayload && typeof basePayload === "object" ? basePayload : {}),
      source: isScheduled ? "task_auto_render_scheduled" : "task_auto_render_now",
      taskId: createdTaskId > 0 ? createdTaskId : undefined,
      taskTitle,
      taskStatus,
      matchedExpectedRenderName,
      taskExpectedRenderCount: expectedRenderCount,
    },
    requiresValidation: false,
  };
}

async function runTaskSubmit({
  t,
  isEditingTask = false,
  editingTaskId = 0,
  autoRenderLaunchMode = "",
  autoRenderScheduledMode = "",
  autoRenderScheduledAt = "",
  onCreateTask = null,
  onUpdateTask = null,
  onCreateRender = null,
  selectedAutoRenderForm = null,
  title = "",
  buildTaskPayloadFromCurrentForm = null,
  editAutosaveStateRef = null,
  setFormError = null,
  resetCreateForm = null,
  setShowCreateForm = null,
} = {}) {
  if (typeof setFormError === "function") setFormError("");
  if (typeof buildTaskPayloadFromCurrentForm !== "function") return;

  const launchMode = autoRenderLaunchMode;
  const scheduledMode = autoRenderScheduledMode;
  const scheduledAt = String(autoRenderScheduledAt || "").trim();
  const built = buildTaskPayloadFromCurrentForm();
  if (!built?.ok) {
    if (typeof setFormError === "function") {
      setFormError(String(built?.error || safeT(t, "postprod.tasks.error.generic", "Impossible d'enregistrer la tache.")));
    }
    return;
  }

  const {
    taskPayload,
    expectedRenderCount,
    expectedRenderNames,
    basePayload,
    effectiveTemplateName,
    projectRef,
    renderStation,
    renderStationName,
  } = built;

  if (!isEditingTask && launchMode) {
    taskPayload.autoRenderConfig = {
      ...(taskPayload.autoRenderConfig || {}),
      launchMode,
      scheduledMode: scheduledMode || "",
    };
  }

  const savedTask = isEditingTask
    ? await Promise.resolve(onUpdateTask?.(editingTaskId, taskPayload))
    : await Promise.resolve(onCreateTask?.(taskPayload));
  if (savedTask === false) return;

  if (editAutosaveStateRef?.current) {
    editAutosaveStateRef.current.signature = toPayloadSignature(taskPayload);
  }

  const shouldCreateRenderNow = !isEditingTask && launchMode === "now";
  const shouldCreateRenderScheduled = !isEditingTask
    && launchMode === "scheduled"
    && scheduledMode === "datetime"
    && !!scheduledAt;

  if (shouldCreateRenderNow || shouldCreateRenderScheduled) {
    const createRenderInput = buildImmediateRenderRequest({
      basePayload,
      savedTask,
      fallbackTaskTitle: title,
      expectedRenderNames,
      expectedRenderCount,
      effectiveTemplateName,
      projectRef,
      selectedAutoRenderForm,
      renderStation,
      renderStationName,
      scheduledAt: shouldCreateRenderScheduled ? scheduledAt : null,
    });
    await Promise.resolve(onCreateRender?.(createRenderInput));
  }

  if (typeof resetCreateForm === "function") resetCreateForm();
  if (typeof setShowCreateForm === "function") setShowCreateForm(false);
}

export {
  resolveSavedTaskId,
  buildImmediateRenderRequest,
  runTaskSubmit,
};

export default runTaskSubmit;
