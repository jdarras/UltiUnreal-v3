import {
  isAutoRenderFormFieldMissing,
  normalizeAutoRenderFormFieldValue,
} from "./autoRenderFieldNormalization";

function assignIfDefined(target, key, value) {
  if (value === undefined || value === null) return;
  if (typeof value === "string" && !value.trim()) return;
  target[key] = value;
}

export function resolveAutoRenderContext({
  selectedForm = null,
  selectedAutoRenderTemplate = null,
  selectedAutoRenderProjectRef = "",
  projectOptionByRef = new Map(),
  projectLookupByAny = new Map(),
  autoRenderWorkerKey = "",
  renderOutputDir = "",
  autoRenderFormId = "",
} = {}) {
  const formProjectRef = String(selectedAutoRenderProjectRef || selectedForm?.projectName || "").trim();
  const effectiveMapName = String(selectedForm?.mapName || selectedAutoRenderTemplate?.mapName || "").trim();
  const effectiveSequenceName = String(selectedForm?.sequenceName || selectedAutoRenderTemplate?.sequenceName || "").trim();
  const effectiveOutputProfile = String(selectedAutoRenderTemplate?.outputProfile || selectedForm?.outputProfile || "").trim();
  const effectiveWrcPresetName = String(selectedForm?.presetName || "").trim();
  const effectiveRenderPresetName = String(selectedAutoRenderTemplate?.presetName || "").trim();
  const effectiveWorkerKey = String(autoRenderWorkerKey || "").trim();
  const effectiveOutputDir = String(renderOutputDir || "").trim();
  const effectiveTemplateName = String(selectedAutoRenderTemplate?.templateName || selectedForm?.templateName || "").trim();
  const projectOption =
    projectOptionByRef.get(formProjectRef)
    || projectLookupByAny.get(String(formProjectRef || "").toLowerCase())
    || null;
  const effectiveProjectPath = String(
    selectedForm?.projectPath
    || selectedForm?.uprojectPath
    || projectOption?.uprojectPath
    || ""
  ).trim();
  const selectedFormIdNum = Number(autoRenderFormId || 0);
  return {
    formProjectRef,
    effectiveMapName,
    effectiveSequenceName,
    effectiveOutputProfile,
    effectiveWrcPresetName,
    effectiveRenderPresetName,
    effectiveWorkerKey,
    effectiveOutputDir,
    effectiveTemplateName,
    effectiveProjectPath,
    selectedFormIdNum,
  };
}

export function buildSelectedFormData({
  autoRenderFormFields = [],
  autoRenderFormValues = {},
} = {}) {
  const selectedFormFieldsList = Array.isArray(autoRenderFormFields) ? autoRenderFormFields : [];
  const selectedFormData = {};
  let invalidFormField = null;
  let missingRequiredField = null;

  for (const field of selectedFormFieldsList) {
    const fieldKey = String(field?.fieldKey || "").trim();
    if (!fieldKey) continue;
    const payloadKey = String(field?.payloadKey || fieldKey).trim() || fieldKey;
    const hasManualValue = Object.prototype.hasOwnProperty.call(autoRenderFormValues || {}, fieldKey);
    const rawValue = hasManualValue
      ? autoRenderFormValues[fieldKey]
      : (field?.defaultValue ?? "");
    const normalizedFieldValue = normalizeAutoRenderFormFieldValue(field, rawValue);
    if ((normalizedFieldValue === "__invalid_json__" || normalizedFieldValue === "__invalid_vector__") && !invalidFormField) {
      invalidFormField = field;
    }
    if (isAutoRenderFormFieldMissing(field, normalizedFieldValue) && !missingRequiredField) {
      missingRequiredField = field;
    }
    if (normalizedFieldValue === "__invalid_json__" || normalizedFieldValue === "__invalid_vector__") continue;
    selectedFormData[payloadKey] = normalizedFieldValue;
  }

  return {
    selectedFormData,
    invalidFormField,
    missingRequiredField,
  };
}

export function buildAutoRenderPayloads({
  selectedTemplatePayload = {},
  selectedFormData = {},
  formProjectRef = "",
  effectiveMapName = "",
  effectiveSequenceName = "",
  effectiveOutputProfile = "",
  effectiveWrcPresetName = "",
  effectiveRenderPresetName = "",
  effectiveWorkerKey = "",
  effectiveOutputDir = "",
  effectiveTemplateName = "",
  effectiveProjectPath = "",
  selectedFormIdNum = 0,
} = {}) {
  const renderModeName = String(effectiveRenderPresetName || effectiveTemplateName || "").trim();
  const hasFormData = Object.keys(selectedFormData || {}).length > 0;
  const basePayload = { ...selectedTemplatePayload };

  assignIfDefined(basePayload, "projectPath", effectiveProjectPath);
  assignIfDefined(basePayload, "uprojectPath", effectiveProjectPath);
  assignIfDefined(basePayload, "mapName", effectiveMapName);
  assignIfDefined(basePayload, "sequenceName", effectiveSequenceName);
  assignIfDefined(basePayload, "outputProfile", effectiveOutputProfile);
  assignIfDefined(basePayload, "presetName", effectiveWrcPresetName);
  assignIfDefined(basePayload, "renderModeName", renderModeName);
  assignIfDefined(basePayload, "outputDir", effectiveOutputDir);
  if (effectiveWorkerKey) {
    basePayload.preferredWorkerKey = effectiveWorkerKey;
    basePayload.targetWorkerKey = effectiveWorkerKey;
  }
  if (Number(selectedFormIdNum || 0) > 0) basePayload.formId = Number(selectedFormIdNum || 0);
  if (hasFormData) {
    basePayload.formData = selectedFormData;
    for (const [key, value] of Object.entries(selectedFormData)) {
      if (!key) continue;
      basePayload[key] = value;
    }
  }

  const autoRenderConfig = {
    projectName: formProjectRef,
    templateName: effectiveTemplateName,
    requiresValidation: false,
    payload: basePayload,
  };
  assignIfDefined(autoRenderConfig, "projectPath", effectiveProjectPath);
  assignIfDefined(autoRenderConfig, "uprojectPath", effectiveProjectPath);
  assignIfDefined(autoRenderConfig, "presetName", effectiveWrcPresetName);
  assignIfDefined(autoRenderConfig, "renderModeName", renderModeName);
  assignIfDefined(autoRenderConfig, "targetWorkerKey", effectiveWorkerKey);
  assignIfDefined(autoRenderConfig, "mapName", effectiveMapName);
  assignIfDefined(autoRenderConfig, "sequenceName", effectiveSequenceName);
  assignIfDefined(autoRenderConfig, "outputProfile", effectiveOutputProfile);
  assignIfDefined(autoRenderConfig, "outputDir", effectiveOutputDir);
  if (Number(selectedFormIdNum || 0) > 0) autoRenderConfig.formId = Number(selectedFormIdNum || 0);
  if (hasFormData) autoRenderConfig.formData = selectedFormData;

  return { basePayload, autoRenderConfig };
}

export default {
  resolveAutoRenderContext,
  buildSelectedFormData,
  buildAutoRenderPayloads,
};
