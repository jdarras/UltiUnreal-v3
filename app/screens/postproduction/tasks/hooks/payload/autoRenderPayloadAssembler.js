function assignIfDefined(target, key, value) {
  if (value === undefined || value === null) return;
  if (typeof value === "string" && !value.trim()) return;
  target[key] = value;
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

export default buildAutoRenderPayloads;
