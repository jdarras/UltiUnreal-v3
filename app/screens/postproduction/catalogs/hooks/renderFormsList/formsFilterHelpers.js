function normalizeFormsSearchQuery(formsSearchQuery) {
  return String(formsSearchQuery || "").trim().toLowerCase();
}

function hasFormsAdvancedFilters(formsSearchAdvanced) {
  const active = String(formsSearchAdvanced?.active || "all").trim();
  const mapName = String(formsSearchAdvanced?.mapName || "").trim();
  const sequenceName = String(formsSearchAdvanced?.sequenceName || "").trim();
  const presetName = String(formsSearchAdvanced?.presetName || "").trim();
  return active !== "all" || !!mapName || !!sequenceName || !!presetName;
}

function canClearFormsFilters({
  normalizedFormsSearchQuery = "",
  formsFavoriteOnly = false,
  hasFormsAdvancedFilters: hasAdvanced = false,
  formsSearchExpanded = false,
}) {
  return !!normalizedFormsSearchQuery || formsFavoriteOnly || hasAdvanced || formsSearchExpanded;
}

function filterForms({
  visibleForms = [],
  formsFavoriteOnly = false,
  isFormFavorite = null,
  normalizedFormsSearchQuery = "",
  formsSearchAdvanced = {},
  formProjectLabel = null,
}) {
  const list = Array.isArray(visibleForms) ? visibleForms : [];
  return list.filter((form) => {
    if (formsFavoriteOnly && typeof isFormFavorite === "function" && !isFormFavorite(form)) return false;

    if (normalizedFormsSearchQuery) {
      const projectLabel = typeof formProjectLabel === "function" ? formProjectLabel(form) : "";
      const fields = [
        form?.name,
        projectLabel,
        form?.mapName,
        form?.sequenceName,
        form?.presetName,
        form?.id,
        form?.projectName,
      ]
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean);
      if (!fields.some((value) => value.includes(normalizedFormsSearchQuery))) return false;
    }

    const activeFilter = String(formsSearchAdvanced?.active || "all").trim().toLowerCase();
    if (activeFilter === "yes" && form?.isActive === false) return false;
    if (activeFilter === "no" && form?.isActive !== false) return false;

    const mapFilter = String(formsSearchAdvanced?.mapName || "").trim().toLowerCase();
    if (mapFilter) {
      const currentMap = String(form?.mapName || "").trim().toLowerCase();
      if (!currentMap.includes(mapFilter)) return false;
    }

    const sequenceFilter = String(formsSearchAdvanced?.sequenceName || "").trim().toLowerCase();
    if (sequenceFilter) {
      const currentSequence = String(form?.sequenceName || "").trim().toLowerCase();
      if (!currentSequence.includes(sequenceFilter)) return false;
    }

    const presetFilter = String(formsSearchAdvanced?.presetName || "").trim().toLowerCase();
    if (presetFilter) {
      const currentPreset = String(form?.presetName || "").trim().toLowerCase();
      if (!currentPreset.includes(presetFilter)) return false;
    }

    return true;
  });
}

export {
  normalizeFormsSearchQuery,
  hasFormsAdvancedFilters,
  canClearFormsFilters,
  filterForms,
};

export default filterForms;
