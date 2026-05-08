import { safeT } from "../../../shared/helpers";
import { normalizeTaskVisualStatusKey } from "../../helpers";
import {
  buildImmediateRenderRequest,
  resolveSavedTaskId,
  runTaskSubmit,
} from "./taskEditorSubmitHelpers";
import {
  runTaskEditAutosaveCycle,
  toPayloadSignature,
} from "./taskEditorAutosaveHelpers";

function isValidFutureDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime()) && d.getTime() > Date.now();
}

function canSubmitTaskForm({
  tasksLoading = false,
  canCreateTasks = false,
  taskSaveHandler = null,
  isEditingTask = false,
  editingTaskHasQueuedOrRunningRender = false,
  editingTaskVisualStatusKey = "planned",
  assigneeIsCurrentUser = true,
  autoRenderLaunchMode = "",
  autoRenderScheduledMode = "",
  autoRenderScheduledAt = "",
  onCreateRender = null,
  title = "",
  autoRenderProjectRef = "",
  filteredAutoRenderForms = [],
  autoRenderFormId = "",
  renderOutputDir = "",
} = {}) {
  const blockByLoading = isEditingTask ? false : tasksLoading;
  const assigneeOwnsRender = assigneeIsCurrentUser === true;
  const requireCompleteRenderConfig = assigneeOwnsRender;
  const launchModeOk = isEditingTask || !assigneeOwnsRender || !!String(autoRenderLaunchMode || "").trim();
  const statusKey = normalizeTaskVisualStatusKey(editingTaskVisualStatusKey);
  const waitingWithoutQueuedOrRunningRender = statusKey === "waiting" && editingTaskHasQueuedOrRunningRender !== true;
  const createRenderAfterEdit = isEditingTask && (
    statusKey === "planned"
    || waitingWithoutQueuedOrRunningRender
    || statusKey === "error"
    || statusKey === "rejected"
  );
  const scheduledModeOk = isEditingTask
    || !assigneeOwnsRender
    || autoRenderLaunchMode !== "scheduled"
    || !!String(autoRenderScheduledMode || "").trim();
  const scheduledAtOk = isEditingTask
    || !assigneeOwnsRender
    || !(autoRenderLaunchMode === "scheduled" && autoRenderScheduledMode === "datetime")
    || isValidFutureDate(autoRenderScheduledAt);
  return (
    !blockByLoading
    && canCreateTasks === true
    && !!taskSaveHandler
    && !(assigneeOwnsRender && !isEditingTask && autoRenderLaunchMode === "now" && !onCreateRender)
    && !(assigneeOwnsRender && createRenderAfterEdit && !onCreateRender)
    && launchModeOk
    && scheduledModeOk
    && scheduledAtOk
    && !!String(title || "").trim()
    && (
      !requireCompleteRenderConfig
      || (
        !!String(autoRenderProjectRef || "").trim()
        && !(filteredAutoRenderForms.length > 0 && !String(autoRenderFormId || "").trim())
        && !!String(renderOutputDir || "").trim()
      )
    )
  );
}

function submitTaskFormLabel({
  t,
  isEditingTask = false,
  editingTaskHasQueuedOrRunningRender = false,
  assigneeIsCurrentUser = true,
  editingTaskVisualStatusKey = "planned",
} = {}) {
  const statusKey = normalizeTaskVisualStatusKey(editingTaskVisualStatusKey);
  if (!isEditingTask && assigneeIsCurrentUser !== true) {
    return safeT(t, "postprod.tasks.form.submit.assignRender", "Assigner le rendu");
  }
  if (!isEditingTask) {
    return safeT(t, "postprod.tasks.form.submit.createRender", "Créer le rendu");
  }
  if (statusKey === "running") {
    return safeT(t, "postprod.tasks.form.submit.renderRunning", "Rendu en cours");
  }
  if (statusKey === "waiting" && editingTaskHasQueuedOrRunningRender === true) {
    return safeT(t, "postprod.tasks.form.submit.renderQueued", "Rendu en attente");
  }
  if (assigneeIsCurrentUser !== true) {
    return safeT(t, "postprod.tasks.form.submit.assignRender", "Assigner le rendu");
  }
  if (statusKey === "error" || statusKey === "rejected") {
    return safeT(t, "postprod.tasks.form.submit.relaunchRender", "Relancer le rendu");
  }
  if (statusKey === "planned") {
    return safeT(t, "postprod.tasks.form.submit.createRender", "Créer le rendu");
  }
  if (statusKey === "waiting") {
    return safeT(t, "postprod.tasks.form.submit.createRender", "Créer le rendu");
  }
  return safeT(t, "postprod.tasks.form.save", "Enregistrer tâche");
}

function submitTaskFormDisabled({
  isEditingTask = false,
  editingTaskHasQueuedOrRunningRender = false,
  editingTaskVisualStatusKey = "planned",
} = {}) {
  if (!isEditingTask) return false;
  const statusKey = normalizeTaskVisualStatusKey(editingTaskVisualStatusKey);
  if (statusKey === "running") return true;
  if (statusKey === "waiting" && editingTaskHasQueuedOrRunningRender === true) return true;
  return false;
}

function mergeAutoRenderFormValue(previousValues, fieldKey, nextValue) {
  const key = String(fieldKey || "").trim();
  if (!key) {
    return previousValues && typeof previousValues === "object" && !Array.isArray(previousValues)
      ? previousValues
      : {};
  }
  const current = previousValues && typeof previousValues === "object" && !Array.isArray(previousValues)
    ? previousValues
    : {};
  return {
    ...current,
    [key]: nextValue,
  };
}

export {
  buildImmediateRenderRequest,
  canSubmitTaskForm,
  mergeAutoRenderFormValue,
  runTaskEditAutosaveCycle,
  runTaskSubmit,
  resolveSavedTaskId,
  submitTaskFormDisabled,
  submitTaskFormLabel,
  toPayloadSignature,
};
