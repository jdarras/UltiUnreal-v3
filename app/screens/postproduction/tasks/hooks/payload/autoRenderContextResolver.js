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

export default resolveAutoRenderContext;
