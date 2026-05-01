function assignIfDefined(target, key, value) {
  if (value === undefined || value === null) return;
  if (typeof value === "string" && !value.trim()) return;
  target[key] = value;
}

function normalizeExportDestinationIds(value) {
  const src = Array.isArray(value)
    ? value
    : (typeof value === "string" ? value.split(/[,\r\n;]+/g) : []);
  const out = [];
  const seen = new Set();
  for (const raw of src) {
    const id = String(raw || "").trim().toLowerCase();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function withRenderOffscreenExecution(execution = null, renderOffscreen = false) {
  if (!execution || typeof execution !== "object" || Array.isArray(execution)) return null;
  const offscreen = renderOffscreen === true;
  const cloned = {
    ...execution,
    renderOffscreen: offscreen,
  };
  const args = Array.isArray(execution?.args) ? execution.args : [];
  if (args.length <= 0) {
    if (offscreen) cloned.args = ["-RenderOffscreen"];
    return cloned;
  }
  const nextArgs = args
    .map((arg) => String(arg || "").trim())
    .filter(Boolean)
    .filter((arg) => String(arg || "").trim().toLowerCase() !== "-renderoffscreen");
  if (offscreen) nextArgs.push("-RenderOffscreen");
  cloned.args = nextArgs;
  return cloned;
}

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

export function buildAutoRenderPayloads({
  selectedTemplatePayload = {},
  selectedFormData = {},
  formProjectRef = "",
  effectiveMapName = "",
  effectiveSequenceName = "",
  effectiveOutputProfile = "",
  effectiveWrcPresetName = "",
  effectiveWrcPresetPath = "",
  effectiveRenderPresetName = "",
  effectiveWorkerKey = "",
  renderStation = "local",
  renderStationName = "",
  effectiveOutputDir = "",
  effectiveTemplateName = "",
  effectiveProjectPath = "",
  selectedFormIdNum = 0,
  autoRenderOffscreen = false,
  autoRenderExportDestinationIds = [],
  autoRenderLaunchMode = "",
  autoRenderScheduledMode = "",
  autoRenderScheduledAt = "",
} = {}) {
  const offscreenEnabled = autoRenderOffscreen === true;
  const exportDestinationIds = normalizeExportDestinationIds(autoRenderExportDestinationIds);
  const renderModeName = String(effectiveRenderPresetName || effectiveTemplateName || "").trim();
  const hasFormData = Object.keys(selectedFormData || {}).length > 0;
  const basePayload = { ...selectedTemplatePayload };

  assignIfDefined(basePayload, "projectPath", effectiveProjectPath);
  assignIfDefined(basePayload, "uprojectPath", effectiveProjectPath);
  assignIfDefined(basePayload, "mapName", effectiveMapName);
  assignIfDefined(basePayload, "sequenceName", effectiveSequenceName);
  assignIfDefined(basePayload, "outputProfile", effectiveOutputProfile);
  assignIfDefined(basePayload, "presetName", effectiveWrcPresetName);
  assignIfDefined(basePayload, "presetPath", effectiveWrcPresetPath);
  assignIfDefined(basePayload, "renderModeName", renderModeName);
  assignIfDefined(basePayload, "outputDir", effectiveOutputDir);
  assignIfDefined(basePayload, "renderStation", renderStation);
  assignIfDefined(basePayload, "render_station", renderStation);
  assignIfDefined(basePayload, "renderStationName", renderStationName);
  assignIfDefined(basePayload, "render_station_name", renderStationName);
  basePayload.renderOffscreen = offscreenEnabled;
  basePayload.exportDestinationIds = exportDestinationIds;
  const normalizedExecution = withRenderOffscreenExecution(basePayload?.execution, offscreenEnabled);
  if (normalizedExecution) {
    basePayload.execution = normalizedExecution;
  }
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

  const launchMode = normalizeLaunchMode(autoRenderLaunchMode);
  const scheduledMode = launchMode === "scheduled"
    ? normalizeScheduledMode(autoRenderScheduledMode)
    : "";
  const scheduledAt = (
    launchMode === "scheduled" && scheduledMode === "datetime"
      ? normalizeScheduledAt(autoRenderScheduledAt)
      : ""
  );
  if (launchMode) {
    basePayload.launchMode = launchMode;
  }
  if (scheduledMode) {
    basePayload.scheduledMode = scheduledMode;
  }
  if (scheduledAt) {
    basePayload.scheduledAt = scheduledAt;
  }

  const autoRenderConfig = {
    projectName: formProjectRef,
    templateName: effectiveTemplateName,
    requiresValidation: false,
    renderOffscreen: offscreenEnabled,
    exportDestinationIds,
    payload: basePayload,
  };
  assignIfDefined(autoRenderConfig, "projectPath", effectiveProjectPath);
  assignIfDefined(autoRenderConfig, "uprojectPath", effectiveProjectPath);
  assignIfDefined(autoRenderConfig, "presetName", effectiveWrcPresetName);
  assignIfDefined(autoRenderConfig, "presetPath", effectiveWrcPresetPath);
  assignIfDefined(autoRenderConfig, "renderModeName", renderModeName);
  assignIfDefined(autoRenderConfig, "renderStation", renderStation);
  assignIfDefined(autoRenderConfig, "renderStationName", renderStationName);
  assignIfDefined(autoRenderConfig, "targetWorkerKey", effectiveWorkerKey);
  assignIfDefined(autoRenderConfig, "mapName", effectiveMapName);
  assignIfDefined(autoRenderConfig, "sequenceName", effectiveSequenceName);
  assignIfDefined(autoRenderConfig, "outputProfile", effectiveOutputProfile);
  assignIfDefined(autoRenderConfig, "outputDir", effectiveOutputDir);
  if (normalizedExecution) {
    autoRenderConfig.execution = normalizedExecution;
  }
  if (Number(selectedFormIdNum || 0) > 0) autoRenderConfig.formId = Number(selectedFormIdNum || 0);
  if (hasFormData) autoRenderConfig.formData = selectedFormData;
  if (launchMode) {
    autoRenderConfig.launchMode = launchMode;
  }
  if (scheduledMode) {
    autoRenderConfig.scheduledMode = scheduledMode;
  }
  if (scheduledAt) {
    autoRenderConfig.scheduledAt = scheduledAt;
  }

  return { basePayload, autoRenderConfig };
}

export default buildAutoRenderPayloads;
