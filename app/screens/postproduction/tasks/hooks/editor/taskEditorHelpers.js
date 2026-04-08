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

function canSubmitTaskForm({
  tasksLoading = false,
  canCreateTasks = false,
  taskSaveHandler = null,
  isEditingTask = false,
  autoRenderLaunchMode = "scheduled",
  onCreateRender = null,
  title = "",
  autoRenderProjectRef = "",
  filteredAutoRenderForms = [],
  autoRenderFormId = "",
  renderOutputDir = "",
} = {}) {
  return (
    !tasksLoading
    && canCreateTasks === true
    && !!taskSaveHandler
    && !(!isEditingTask && autoRenderLaunchMode === "now" && !onCreateRender)
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
