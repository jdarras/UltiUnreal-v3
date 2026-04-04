function normalizeTextValue(value) {
  return String(value || "").trim();
}

function buildCreateFormPayload({
  name = "",
  projectRef = "",
  templateName = "",
  mapName = "",
  sequenceName = "",
  outputProfile = "",
  presetName = "",
}) {
  return {
    name: normalizeTextValue(name),
    projectName: normalizeTextValue(projectRef),
    templateName: normalizeTextValue(templateName),
    mapName: normalizeTextValue(mapName),
    sequenceName: normalizeTextValue(sequenceName),
    outputProfile: normalizeTextValue(outputProfile),
    presetName: normalizeTextValue(presetName),
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
  metaSequenceName = "",
  metaOutputProfile = "",
  metaPresetName = "",
  metaActive = true,
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
  const nextSequenceName = normalizeTextValue(
    Object.prototype.hasOwnProperty.call(normalizedPatch, "sequenceName") ? normalizedPatch.sequenceName : metaSequenceName
  );
  const nextOutputProfile = normalizeTextValue(
    Object.prototype.hasOwnProperty.call(normalizedPatch, "outputProfile") ? normalizedPatch.outputProfile : metaOutputProfile
  );
  const nextPresetName = normalizeTextValue(
    Object.prototype.hasOwnProperty.call(normalizedPatch, "presetName") ? normalizedPatch.presetName : metaPresetName
  );
  const nextActive = Object.prototype.hasOwnProperty.call(normalizedPatch, "isActive")
    ? normalizedPatch.isActive === true
    : metaActive === true;

  return {
    nextName,
    nextTemplateName,
    nextMapName,
    nextSequenceName,
    nextOutputProfile,
    nextPresetName,
    nextActive,
    payload: {
      name: nextName,
      templateName: nextTemplateName,
      mapName: nextMapName,
      sequenceName: nextSequenceName,
      outputProfile: nextOutputProfile,
      presetName: nextPresetName,
      modeDefault: "live",
      isActive: nextActive,
    },
    noChanges: (
      normalizeTextValue(selectedForm?.name) === nextName
      && normalizeTextValue(selectedForm?.templateName) === nextTemplateName
      && normalizeTextValue(selectedForm?.mapName) === nextMapName
      && normalizeTextValue(selectedForm?.sequenceName) === nextSequenceName
      && normalizeTextValue(selectedForm?.outputProfile) === nextOutputProfile
      && normalizeTextValue(selectedForm?.presetName) === nextPresetName
      && (selectedForm?.isActive !== false) === nextActive
    ),
  };
}

export {
  normalizeTextValue,
  buildCreateFormPayload,
  buildSaveMetaPayload,
};
