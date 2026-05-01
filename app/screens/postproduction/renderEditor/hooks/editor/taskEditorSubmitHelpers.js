import { safeT } from "../../../shared/helpers";
import { normalizeTaskVisualStatusKey } from "../../helpers";
import { toPayloadSignature } from "./taskEditorAutosaveHelpers";

function normalizeLaunchMode(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "now" || normalized === "scheduled") return normalized;
  return "";
}

function normalizeScheduledMode(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "specific_station") return "any_station";
  if (normalized === "datetime" || normalized === "any_station") {
    return normalized;
  }
  return "";
}

function normalizeScheduledAt(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) && parsed > 0 ? raw : "";
}

function resolveSavedTaskId(savedTask) {
  const value = Number(savedTask?.id || 0);
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function asRecord(value = null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function normalizeFormDataRecord(value = null) {
  const candidate = asRecord(value);
  if (!candidate || typeof candidate !== "object") return {};
  return candidate;
}

function readTaskLikeFormData(taskLike = null) {
  const source = asRecord(taskLike);
  const autoRenderConfig = asRecord(source?.autoRenderConfig);
  const autoRenderPayload = asRecord(autoRenderConfig?.payload);
  const payload = asRecord(source?.payload);
  const candidates = [
    autoRenderConfig?.formData,
    autoRenderPayload?.formData,
    payload?.formData,
    source?.formData,
  ];
  for (const entry of candidates) {
    const normalized = normalizeFormDataRecord(entry);
    if (Object.keys(normalized).length > 0) return normalized;
  }
  return {};
}

function normalizeComparableValue(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map((entry) => normalizeComparableValue(entry));
  if (typeof value === "object") {
    const source = asRecord(value);
    const normalized = {};
    const keys = Object.keys(source).sort((a, b) => String(a || "").localeCompare(String(b || "")));
    for (const key of keys) {
      normalized[key] = normalizeComparableValue(source[key]);
    }
    return normalized;
  }
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

function comparableValueSignature(value) {
  try {
    return JSON.stringify(normalizeComparableValue(value));
  } catch {
    return String(value ?? "");
  }
}

function buildRelaunchMeta({
  editingTask = null,
  taskPayload = null,
  basePayload = null,
} = {}) {
  const previousFormData = readTaskLikeFormData(editingTask);
  const nextFormData = (() => {
    const payloadRecord = asRecord(basePayload);
    const fromPayload = normalizeFormDataRecord(payloadRecord?.formData);
    if (Object.keys(fromPayload).length > 0) return fromPayload;
    return readTaskLikeFormData(taskPayload);
  })();

  const keySet = new Set([
    ...Object.keys(previousFormData),
    ...Object.keys(nextFormData),
  ]);
  const changedFields = Array.from(keySet)
    .sort((a, b) => String(a || "").localeCompare(String(b || "")))
    .filter((fieldKey) => (
      comparableValueSignature(previousFormData[fieldKey])
      !== comparableValueSignature(nextFormData[fieldKey])
    ));

  return {
    comparedAt: new Date().toISOString(),
    previousFieldCount: Object.keys(previousFormData).length,
    nextFieldCount: Object.keys(nextFormData).length,
    changedFieldCount: changedFields.length,
    changedFields: changedFields.slice(0, 24),
    hasMoreChangedFields: changedFields.length > 24,
    noChanges: changedFields.length <= 0,
  };
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
  reservedRenderId = 0,
  source = "",
  relaunchMeta = null,
} = {}) {
  const taskTitle = String(savedTask?.title || fallbackTaskTitle || "").trim();
  const taskStatus = String(savedTask?.status || "A faire").trim();
  const matchedExpectedRenderName = String(expectedRenderNames?.[0] || "").trim() || undefined;
  const createdTaskId = resolveSavedTaskId(savedTask);
  const projectName = String(projectRef || selectedAutoRenderForm?.projectName || "");
  const isScheduled = !!scheduledAt;
  const reservedIdNum = Number(reservedRenderId || 0);
  const normalizedReservedRenderId = Number.isFinite(reservedIdNum) && reservedIdNum > 0
    ? Math.trunc(reservedIdNum)
    : 0;
  const normalizedRelaunchMeta = relaunchMeta && typeof relaunchMeta === "object" && !Array.isArray(relaunchMeta)
    ? relaunchMeta
    : null;

  return {
    templateName: effectiveTemplateName,
    projectName,
    ...(normalizedReservedRenderId > 0 ? { reservedRenderId: normalizedReservedRenderId } : {}),
    render_station: String(renderStation || "local").trim() || "local",
    render_station_name: String(renderStationName || "").trim(),
    ...(scheduledAt ? { scheduledAt } : {}),
    payload: {
      ...(basePayload && typeof basePayload === "object" ? basePayload : {}),
      source: String(source || "").trim() || (isScheduled ? "task_auto_render_scheduled" : "task_auto_render_now"),
      ...(normalizedRelaunchMeta ? { relaunchMeta: normalizedRelaunchMeta } : {}),
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
  editingTaskVisualStatusKey = "planned",
  assigneeIsCurrentUser = true,
  editingTaskId = 0,
  editingTask = null,
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
  reservedRenderId = 0,
} = {}) {
  if (typeof setFormError === "function") setFormError("");
  if (typeof buildTaskPayloadFromCurrentForm !== "function") return;

  const assigneeOwnsRender = assigneeIsCurrentUser === true;
  const launchMode = assigneeOwnsRender ? normalizeLaunchMode(autoRenderLaunchMode) : "";
  const scheduledMode = launchMode === "scheduled"
    ? normalizeScheduledMode(autoRenderScheduledMode)
    : "";
  const scheduledAt = (
    launchMode === "scheduled" && scheduledMode === "datetime"
      ? normalizeScheduledAt(autoRenderScheduledAt)
      : ""
  );
  const normalizedEditingStatus = normalizeTaskVisualStatusKey(editingTaskVisualStatusKey);
  const shouldCreateRenderAfterEdit = isEditingTask && (
    normalizedEditingStatus === "planned"
    || normalizedEditingStatus === "error"
    || normalizedEditingStatus === "rejected"
  );
  const shouldRelaunchAfterEdit = isEditingTask && (
    normalizedEditingStatus === "error"
    || normalizedEditingStatus === "rejected"
  );
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

  const autoRenderConfig = (
    taskPayload?.autoRenderConfig && typeof taskPayload.autoRenderConfig === "object" && !Array.isArray(taskPayload.autoRenderConfig)
      ? { ...taskPayload.autoRenderConfig }
      : {}
  );
  if (launchMode) {
    autoRenderConfig.launchMode = launchMode;
  } else {
    delete autoRenderConfig.launchMode;
  }
  if (scheduledMode) {
    autoRenderConfig.scheduledMode = scheduledMode;
  } else {
    delete autoRenderConfig.scheduledMode;
  }
  if (scheduledAt) {
    autoRenderConfig.scheduledAt = scheduledAt;
  } else {
    delete autoRenderConfig.scheduledAt;
  }
  const autoRenderPayload = (
    autoRenderConfig?.payload && typeof autoRenderConfig.payload === "object" && !Array.isArray(autoRenderConfig.payload)
      ? { ...autoRenderConfig.payload }
      : null
  );
  if (autoRenderPayload) {
    if (launchMode) {
      autoRenderPayload.launchMode = launchMode;
    } else {
      delete autoRenderPayload.launchMode;
    }
    if (scheduledMode) {
      autoRenderPayload.scheduledMode = scheduledMode;
    } else {
      delete autoRenderPayload.scheduledMode;
    }
    if (scheduledAt) {
      autoRenderPayload.scheduledAt = scheduledAt;
    } else {
      delete autoRenderPayload.scheduledAt;
    }
    autoRenderConfig.payload = autoRenderPayload;
  }
  taskPayload.autoRenderConfig = autoRenderConfig;

  const savedTask = isEditingTask
    ? await Promise.resolve(onUpdateTask?.(editingTaskId, taskPayload))
    : await Promise.resolve(onCreateTask?.(taskPayload));
  if (savedTask === false) return;

  if (editAutosaveStateRef?.current) {
    editAutosaveStateRef.current.signature = toPayloadSignature(taskPayload);
  }

  const wantsScheduledRender = (
    launchMode === "scheduled"
    && scheduledMode === "datetime"
    && !!scheduledAt
  );
  const shouldCreateRenderNow = (
    assigneeOwnsRender
    && (
    (!isEditingTask && launchMode === "now")
    || (shouldCreateRenderAfterEdit && !wantsScheduledRender)
    )
  );
  const shouldCreateRenderScheduled = (
    assigneeOwnsRender
    && (
    wantsScheduledRender
    && (!isEditingTask || shouldCreateRenderAfterEdit)
    )
  );
  const relaunchMeta = shouldRelaunchAfterEdit
    ? buildRelaunchMeta({
      editingTask,
      taskPayload,
      basePayload,
    })
    : null;

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
      reservedRenderId,
      source: shouldRelaunchAfterEdit ? "task_auto_render_relaunch" : "",
      relaunchMeta,
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
