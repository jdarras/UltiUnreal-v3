function normalizeTextValue(value) {
  return String(value || "").trim();
}

function normalizeStringArray(val) {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  return [];
}

function buildCreateFormPayload({
  name = "",
  projectRef = "",
  templateName = "",
  mapName = "",
  outputProfile = "",
}) {
  return {
    name: normalizeTextValue(name),
    projectName: normalizeTextValue(projectRef),
    templateName: normalizeTextValue(templateName),
    mapName: normalizeTextValue(mapName),
    outputProfile: normalizeTextValue(outputProfile),
    wrcFiles: [],
    modeDefault: "live",
    isActive: true,
    layout: {},
  };
}

function buildSaveMetaPayload({
  selectedForm = null,
  patch = null,
  metaName = "",
  metaTemplateName = "",
  metaMapName = "",
  metaOutputProfile = "",
  metaWrcFiles = [],
  metaActive = true,
  metaAllowedSequences = [],
  metaAllowedPresets = [],
  metaNote = "",
}) {
  const normalizedPatch = patch && typeof patch === "object" && !Array.isArray(patch) ? patch : {};
  const nextName = normalizeTextValue(
    Object.prototype.hasOwnProperty.call(normalizedPatch, "name") ? normalizedPatch.name : metaName
  );
  const nextTemplateName = normalizeTextValue(
    Object.prototype.hasOwnProperty.call(normalizedPatch, "templateName") ? normalizedPatch.templateName : metaTemplateName
  );
  const nextMapName = normalizeTextValue(
    Object.prototype.hasOwnProperty.call(normalizedPatch, "mapName") ? normalizedPatch.mapName : metaMapName
  );
  const nextOutputProfile = normalizeTextValue(
    Object.prototype.hasOwnProperty.call(normalizedPatch, "outputProfile") ? normalizedPatch.outputProfile : metaOutputProfile
  );
  const nextWrcFiles = Object.prototype.hasOwnProperty.call(normalizedPatch, "wrcFiles")
    ? normalizeStringArray(normalizedPatch.wrcFiles)
    : normalizeStringArray(metaWrcFiles);
  const nextActive = Object.prototype.hasOwnProperty.call(normalizedPatch, "isActive")
    ? normalizedPatch.isActive === true
    : metaActive === true;
  const nextAllowedSequences = Object.prototype.hasOwnProperty.call(normalizedPatch, "allowedSequences")
    ? normalizeStringArray(normalizedPatch.allowedSequences)
    : normalizeStringArray(metaAllowedSequences);
  const nextAllowedPresets = Object.prototype.hasOwnProperty.call(normalizedPatch, "allowedPresets")
    ? normalizeStringArray(normalizedPatch.allowedPresets)
    : normalizeStringArray(metaAllowedPresets);
  const nextNote = normalizeTextValue(
    Object.prototype.hasOwnProperty.call(normalizedPatch, "note") ? normalizedPatch.note : metaNote
  );

  return {
    nextName,
    nextTemplateName,
    nextMapName,
    nextOutputProfile,
    nextWrcFiles,
    nextActive,
    nextAllowedSequences,
    nextAllowedPresets,
    nextNote,
    payload: {
      name: nextName,
      templateName: nextTemplateName,
      mapName: nextMapName,
      outputProfile: nextOutputProfile,
      wrcFiles: nextWrcFiles,
      modeDefault: "live",
      isActive: nextActive,
      allowedSequences: nextAllowedSequences,
      allowedPresets: nextAllowedPresets,
      note: nextNote,
    },
    noChanges: (
      normalizeTextValue(selectedForm?.name) === nextName
      && normalizeTextValue(selectedForm?.templateName) === nextTemplateName
      && normalizeTextValue(selectedForm?.mapName) === nextMapName
      && normalizeTextValue(selectedForm?.outputProfile) === nextOutputProfile
      && JSON.stringify(normalizeStringArray(selectedForm?.wrcFiles)) === JSON.stringify(nextWrcFiles)
      && (selectedForm?.isActive !== false) === nextActive
      && JSON.stringify(normalizeStringArray(selectedForm?.allowedSequences)) === JSON.stringify(nextAllowedSequences)
      && JSON.stringify(normalizeStringArray(selectedForm?.allowedPresets)) === JSON.stringify(nextAllowedPresets)
      && normalizeTextValue(selectedForm?.note) === nextNote
    ),
  };
}

export {
  normalizeTextValue,
  normalizeStringArray,
  buildCreateFormPayload,
  buildSaveMetaPayload,
};
