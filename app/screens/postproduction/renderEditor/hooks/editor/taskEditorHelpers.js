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
  editingTaskVisualStatusKey = "planned",
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
  const statusKey = normalizeTaskVisualStatusKey(editingTaskVisualStatusKey);
  const createRenderAfterEdit = isEditingTask && (
    statusKey === "planned"
    || statusKey === "error"
    || statusKey === "rejected"
  );
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
    && !(createRenderAfterEdit && !onCreateRender)
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
  editingTaskVisualStatusKey = "planned",
} = {}) {
  const statusKey = normalizeTaskVisualStatusKey(editingTaskVisualStatusKey);
  if (!isEditingTask) {
    return safeT(t, "postprod.tasks.form.submit.createRender", "Créer le rendu");
  }
  if (statusKey === "waiting" || statusKey === "running") {
    return safeT(t, "postprod.tasks.form.submit.renderRunning", "Rendu en cours");
  }
  if (statusKey === "error" || statusKey === "rejected") {
    return safeT(t, "postprod.tasks.form.submit.relaunchRender", "Relancer le rendu");
  }
  if (statusKey === "planned") {
    return safeT(t, "postprod.tasks.form.submit.createRender", "Créer le rendu");
  }
  return safeT(t, "postprod.tasks.form.save", "Enregistrer tâche");
}

function submitTaskFormDisabled({
  isEditingTask = false,
  editingTaskVisualStatusKey = "planned",
} = {}) {
  if (!isEditingTask) return false;
  const statusKey = normalizeTaskVisualStatusKey(editingTaskVisualStatusKey);
  return statusKey === "waiting" || statusKey === "running";
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
