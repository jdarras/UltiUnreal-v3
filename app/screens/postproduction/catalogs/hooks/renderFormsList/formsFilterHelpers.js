function normalizeFormsSearchQuery(formsSearchQuery) {
  return String(formsSearchQuery || "").trim().toLowerCase();
}

function simplifyName(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const tail = s.split("/").filter(Boolean).pop() || s;
  return (tail.split(".")[0] || "").trim() || s;
}

function hasFormsAdvancedFilters(formsSearchAdvanced) {
  const active = String(formsSearchAdvanced?.active || "all").trim();
  const projects = Array.isArray(formsSearchAdvanced?.projects) ? formsSearchAdvanced.projects : [];
  const mapNames = Array.isArray(formsSearchAdvanced?.mapNames) ? formsSearchAdvanced.mapNames : [];
  const sequences = Array.isArray(formsSearchAdvanced?.sequences) ? formsSearchAdvanced.sequences : [];
  const presets = Array.isArray(formsSearchAdvanced?.presets) ? formsSearchAdvanced.presets : [];
  const wrcFiles = Array.isArray(formsSearchAdvanced?.wrcFiles) ? formsSearchAdvanced.wrcFiles : [];
  return (
    active !== "all" ||
    projects.length > 0 ||
    mapNames.length > 0 ||
    sequences.length > 0 ||
    presets.length > 0 ||
    wrcFiles.length > 0
  );
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
      const wrcFilesText = Array.isArray(form?.wrcFiles) ? form.wrcFiles.join(" ") : String(form?.wrcFiles || "");
      const fields = [
        form?.name,
        projectLabel,
        form?.mapName,
        wrcFilesText,
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

    const projectsFilter = Array.isArray(formsSearchAdvanced?.projects) ? formsSearchAdvanced.projects : [];
    if (projectsFilter.length > 0) {
      const key = String(form?.projectName || "").trim().toLowerCase();
      if (!projectsFilter.includes(key)) return false;
    }

    const mapNamesFilter = Array.isArray(formsSearchAdvanced?.mapNames) ? formsSearchAdvanced.mapNames : [];
    if (mapNamesFilter.length > 0) {
      if (!mapNamesFilter.includes(simplifyName(form?.mapName))) return false;
    }

    const sequencesFilter = Array.isArray(formsSearchAdvanced?.sequences) ? formsSearchAdvanced.sequences : [];
    if (sequencesFilter.length > 0) {
      const formSeqs = Array.isArray(form?.allowedSequences) ? form.allowedSequences : [];
      const allowsAll = formSeqs.length === 0;
      if (!allowsAll) {
        const simplified = formSeqs.map(simplifyName);
        if (!sequencesFilter.some((s) => simplified.includes(s))) return false;
      }
    }

    const presetsFilter = Array.isArray(formsSearchAdvanced?.presets) ? formsSearchAdvanced.presets : [];
    if (presetsFilter.length > 0) {
      const formPresets = Array.isArray(form?.allowedPresets) ? form.allowedPresets : [];
      const allowsAll = formPresets.length === 0;
      if (!allowsAll) {
        const simplified = formPresets.map(simplifyName);
        if (!presetsFilter.some((p) => simplified.includes(p))) return false;
      }
    }

    const wrcFilesFilter = Array.isArray(formsSearchAdvanced?.wrcFiles) ? formsSearchAdvanced.wrcFiles : [];
    if (wrcFilesFilter.length > 0) {
      const formWrc = Array.isArray(form?.wrcFiles) ? form.wrcFiles : [];
      const simplified = formWrc.map(simplifyName);
      if (!wrcFilesFilter.some((w) => simplified.includes(w))) return false;
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
