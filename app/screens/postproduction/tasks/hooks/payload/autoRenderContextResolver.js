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
} = {}) {
  const formProjectRef = String(selectedAutoRenderProjectRef || selectedForm?.projectName || "").trim();
  const effectiveMapName = String(selectedForm?.mapName || selectedAutoRenderTemplate?.mapName || "").trim();
  const effectiveSequenceName = String(selectedForm?.sequenceName || selectedAutoRenderTemplate?.sequenceName || "").trim();
  const effectiveOutputProfile = String(selectedAutoRenderTemplate?.outputProfile || selectedForm?.outputProfile || "").trim();
  const effectiveWrcPresetName = String(selectedForm?.presetName || "").trim();
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
