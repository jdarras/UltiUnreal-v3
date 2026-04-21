export function resolveAutoRenderContext({
  selectedForm = null,
  selectedAutoRenderTemplate = null,
  selectedAutoRenderProjectRef = "",
  projectOptionByRef = new Map(),
  projectLookupByAny = new Map(),
  renderWorkerLookupByKey = new Map(),
  autoRenderWorkerKey = "",
  renderOutputDir = "",
  autoRenderFormId = "",
  taskSequenceName = "",
} = {}) {
  const extractPresetNameFromPath = (rawPath) => {
    const pathValue = String(rawPath || "").trim();
    if (!pathValue) return "";
    const normalized = pathValue.replace(/\\/g, "/");
    const tail = normalized.split("/").filter(Boolean).pop() || normalized;
    if (!tail) return "";
    if (tail.includes(".")) {
      const parts = tail.split(".");
      return String(parts[parts.length - 1] || "").trim();
    }
    return String(tail).trim();
  };
  const selectedFormWrcFiles = Array.isArray(selectedForm?.wrcFiles)
    ? selectedForm.wrcFiles
    : (Array.isArray(selectedForm?.wrc_files) ? selectedForm.wrc_files : []);
  const effectiveWrcPresetPath = (() => {
    const explicitPath = String(
      selectedForm?.presetPath
      || selectedForm?.preset_path
      || ""
    ).trim();
    if (explicitPath) return explicitPath;
    for (const entry of selectedFormWrcFiles) {
      const candidate = String(entry || "").trim();
      if (!candidate) continue;
      return candidate;
    }
    return "";
  })();
  const explicitWrcPresetName = String(
    selectedForm?.presetName
    || selectedForm?.preset_name
    || ""
  ).trim();
  const effectiveWrcPresetName = explicitWrcPresetName || extractPresetNameFromPath(effectiveWrcPresetPath);
  const formProjectRef = String(selectedAutoRenderProjectRef || selectedForm?.projectName || "").trim();
  const effectiveMapName = String(selectedForm?.mapName || selectedAutoRenderTemplate?.mapName || "").trim();
  const effectiveSequenceName = String(taskSequenceName || selectedAutoRenderTemplate?.sequenceName || "").trim();
  const effectiveOutputProfile = String(selectedAutoRenderTemplate?.outputProfile || selectedForm?.outputProfile || "").trim();
  const effectiveRenderPresetName = String(selectedAutoRenderTemplate?.presetName || "").trim();
  const requestedStationRaw = String(autoRenderWorkerKey || "").trim().toLowerCase();
  let renderStation = "local";
  if (requestedStationRaw === "auto") {
    renderStation = "auto";
  } else if (requestedStationRaw && requestedStationRaw !== "local") {
    renderStation = String(autoRenderWorkerKey || "").trim();
  }
  const stationOption = renderWorkerLookupByKey instanceof Map
    ? renderWorkerLookupByKey.get(String(renderStation || "").trim())
    : null;
  const renderStationName = String(
    stationOption?.displayName
    || stationOption?.name
    || (renderStation !== "auto" && renderStation !== "local" ? renderStation : "")
  ).trim();
  const effectiveWorkerKey = renderStation !== "auto" && renderStation !== "local"
    ? String(renderStation || "").trim()
    : "";
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
    effectiveWrcPresetPath,
    effectiveRenderPresetName,
    effectiveWorkerKey,
    renderStation,
    renderStationName,
    effectiveOutputDir,
    effectiveTemplateName,
    effectiveProjectPath,
    selectedFormIdNum,
  };
}

export default resolveAutoRenderContext;
