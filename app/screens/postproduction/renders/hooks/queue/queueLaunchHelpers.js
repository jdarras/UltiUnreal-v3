import {
  resolveAutoRenderConfig,
  resolveAutoRenderPayload,
  resolveAutoRenderTargetWorkerKey,
  withRenderOffscreenExecution,
} from "../../../shared/autoRenderHelpers";

function toPositiveInt(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return Math.trunc(fallback);
  return Math.trunc(parsed);
}

function toTrimmedString(value) {
  return String(value || "").trim();
}

function resolveLinkedQueuedRender(queueEntry = null) {
  const linkedRenderId = toPositiveInt(
    queueEntry?.linkedRender?.id
    || queueEntry?.linkedRenderId
    || 0,
    0
  );
  const linkedRenderStatus = toTrimmedString(queueEntry?.linkedRender?.status);
  return {
    linkedRenderId,
    linkedRenderStatus,
  };
}

function buildScheduledTaskCreateRenderInput(task = null) {
  const taskId = toPositiveInt(task?.id, 0);
  if (taskId <= 0) return null;

  const autoRenderConfig = resolveAutoRenderConfig(task);
  const projectName = toTrimmedString(autoRenderConfig?.projectName);
  const templateName = toTrimmedString(autoRenderConfig?.templateName);
  if (!projectName || !templateName) return null;

  const basePayloadSource = resolveAutoRenderPayload(task);
  const basePayload = basePayloadSource ? { ...basePayloadSource } : {};
  const preferredWorkerKey = resolveAutoRenderTargetWorkerKey(task);
  const normalizedPreferredWorkerKey = String(preferredWorkerKey || "").trim();
  const isAutoDispatcherWorker = (
    normalizedPreferredWorkerKey === ""
    || normalizedPreferredWorkerKey.toLowerCase() === "auto"
    || normalizedPreferredWorkerKey.toLowerCase() === "local"
    || normalizedPreferredWorkerKey.toLowerCase() === "auto_dispatcher"
    || normalizedPreferredWorkerKey.toLowerCase() === "__auto"
  );

  const mapName = toTrimmedString(autoRenderConfig?.mapName || basePayload?.mapName);
  const sequenceName = toTrimmedString(autoRenderConfig?.sequenceName || basePayload?.sequenceName);
  const outputProfile = toTrimmedString(autoRenderConfig?.outputProfile || basePayload?.outputProfile);
  const outputDir = toTrimmedString(autoRenderConfig?.outputDir || basePayload?.outputDir);
  const textValue = toTrimmedString(autoRenderConfig?.textValue || basePayload?.textValue);
  const execution =
    autoRenderConfig?.execution
    && typeof autoRenderConfig.execution === "object"
    && !Array.isArray(autoRenderConfig.execution)
      ? autoRenderConfig.execution
      : (
        basePayload?.execution
        && typeof basePayload.execution === "object"
        && !Array.isArray(basePayload.execution)
          ? basePayload.execution
          : null
      );
  const renderOffscreen = (
    autoRenderConfig?.renderOffscreen === true
      || basePayload?.renderOffscreen === true
      || execution?.renderOffscreen === true
  ) === true;
  const normalizedExecution = withRenderOffscreenExecution(execution, renderOffscreen);

  if (!isAutoDispatcherWorker) {
    basePayload.preferredWorkerKey = normalizedPreferredWorkerKey;
    basePayload.targetWorkerKey = normalizedPreferredWorkerKey;
  }
  if (mapName) basePayload.mapName = mapName;
  if (sequenceName) basePayload.sequenceName = sequenceName;
  if (outputProfile) basePayload.outputProfile = outputProfile;
  if (outputDir) basePayload.outputDir = outputDir;
  if (textValue) basePayload.textValue = textValue;
  basePayload.renderOffscreen = renderOffscreen;
  if (normalizedExecution) {
    basePayload.execution = { ...normalizedExecution };
  }

  const expectedRenderNames = Array.isArray(task?.expectedRenderNames) ? task.expectedRenderNames : [];
  const matchedExpectedRenderName = toTrimmedString(expectedRenderNames[0]);
  const expectedRenderCount = toPositiveInt(task?.expectedRenderCount || 1, 1);

  return {
    taskId,
    createRenderInput: {
      templateName,
      projectName,
      launchMode: "",
      scheduledAt: undefined, // overridden by caller when scheduled
      payload: {
        ...basePayload,
        source: "scheduled_task_auto_render",
        taskId,
        taskTitle: toTrimmedString(task?.title),
        taskStatus: toTrimmedString(task?.status),
        matchedExpectedRenderName: matchedExpectedRenderName || undefined,
        taskExpectedRenderCount: expectedRenderCount,
      },
      requiresValidation: autoRenderConfig?.requiresValidation === true,
    },
  };
}

function removeLaunchedTaskIdsFromSelection(previousSelection, launchedTaskIds) {
  const selectedTaskIds = Array.isArray(previousSelection) ? previousSelection : [];
  return selectedTaskIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0 && !launchedTaskIds.has(Math.trunc(id)))
    .map((id) => Math.trunc(id));
}

export {
  buildScheduledTaskCreateRenderInput,
  removeLaunchedTaskIdsFromSelection,
  resolveLinkedQueuedRender,
};
