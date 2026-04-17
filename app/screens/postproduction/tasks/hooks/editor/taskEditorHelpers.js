import { safeT } from "../../../shared/helpers";
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
  const launchModeOk = isEditingTask || !!String(autoRenderLaunchMode || "").trim();
  const scheduledModeOk = isEditingTask
    || autoRenderLaunchMode !== "scheduled"
    || !!String(autoRenderScheduledMode || "").trim();
  const scheduledAtOk = isEditingTask
    || !(autoRenderLaunchMode === "scheduled" && autoRenderScheduledMode === "datetime")
    || isValidFutureDate(autoRenderScheduledAt);
  return (
    !tasksLoading
    && canCreateTasks === true
    && !!taskSaveHandler
    && !(!isEditingTask && autoRenderLaunchMode === "now" && !onCreateRender)
    && launchModeOk
    && scheduledModeOk
    && scheduledAtOk
    && !!String(title || "").trim()
    && !!String(autoRenderProjectRef || "").trim()
    && !(filteredAutoRenderForms.length > 0 && !String(autoRenderFormId || "").trim())
    && !!String(renderOutputDir || "").trim()
  );
}

function submitTaskFormLabel({
  t,
  isEditingTask = false,
  autoRenderLaunchMode = "scheduled",
} = {}) {
  if (isEditingTask) {
    return safeT(t, "postprod.tasks.form.save", "Enregistrer tache");
  }
  if (autoRenderLaunchMode === "now") {
    return safeT(t, "postprod.tasks.form.autoRender.createNow", "Créer et lancer rendu auto");
  }
  return safeT(t, "postprod.tasks.form.autoRender.createScheduled", "Programmer rendu auto");
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
  submitTaskFormLabel,
  toPayloadSignature,
};
