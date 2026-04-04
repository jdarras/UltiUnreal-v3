const FORMS_SORT_MODES = new Set([
  "name",
  "projectName",
  "mapName",
  "templateName",
  "presetName",
  "modeDefault",
  "isActive",
  "updatedAt",
]);

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

function sortForms({
  filteredForms = [],
  formsSortMode = "name",
  formsSortDir = "asc",
  formProjectLabel = null,
}) {
  const list = [...(Array.isArray(filteredForms) ? filteredForms : [])];
  const direction = formsSortDir === "desc" ? -1 : 1;
  const compareText = (a, b) => String(a || "").localeCompare(String(b || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
  const compareDate = (a, b) => {
    const da = new Date(String(a || "").trim());
    const db = new Date(String(b || "").trim());
    const ta = Number.isFinite(da.getTime()) ? da.getTime() : 0;
    const tb = Number.isFinite(db.getTime()) ? db.getTime() : 0;
    return ta - tb;
  };
  list.sort((a, b) => {
    let compare = 0;
    if (formsSortMode === "updatedAt") {
      compare = compareDate(a?.updatedAt || a?.createdAt, b?.updatedAt || b?.createdAt);
    } else if (formsSortMode === "isActive") {
      const aActive = a?.isActive !== false ? 1 : 0;
      const bActive = b?.isActive !== false ? 1 : 0;
      compare = aActive - bActive;
    } else if (formsSortMode === "projectName") {
      compare = compareText(
        typeof formProjectLabel === "function" ? formProjectLabel(a) : "",
        typeof formProjectLabel === "function" ? formProjectLabel(b) : ""
      );
    } else if (formsSortMode === "mapName") {
      compare = compareText(a?.mapName, b?.mapName);
    } else if (formsSortMode === "templateName") {
      compare = compareText(a?.templateName, b?.templateName);
    } else if (formsSortMode === "presetName") {
      compare = compareText(a?.presetName, b?.presetName);
    } else if (formsSortMode === "modeDefault") {
      compare = compareText(a?.modeDefault, b?.modeDefault);
    } else {
      compare = compareText(a?.name, b?.name);
    }
    if (compare === 0) {
      compare = compareText(a?.name, b?.name);
    }
    return compare * direction;
  });
  return list;
}

function nextFormsSortState(modeRaw, formsSortMode, formsSortDir) {
  const mode = String(modeRaw || "").trim();
  if (!FORMS_SORT_MODES.has(mode)) return null;

  if (mode === "presetName") {
    if (formsSortMode === "presetName") {
      return { mode: "presetName", dir: formsSortDir === "asc" ? "desc" : "asc" };
    }
    return { mode: "presetName", dir: "asc" };
  }

  if (mode === "isActive") {
    if (formsSortMode === "isActive") {
      return { mode: "isActive", dir: formsSortDir === "asc" ? "desc" : "asc" };
    }
    return { mode: "isActive", dir: "desc" };
  }

  if (formsSortMode === mode) {
    return { mode, dir: formsSortDir === "asc" ? "desc" : "asc" };
  }

  return { mode, dir: mode === "updatedAt" ? "desc" : "asc" };
}

function formsSortArrowFor(modeRaw, formsSortMode, formsSortDir) {
  const mode = String(modeRaw || "").trim();
  if (formsSortMode !== mode) return "";
  return formsSortDir === "asc" ? "▲" : "▼";
}

export {
  FORMS_SORT_MODES,
  normalizeFormsSearchQuery,
  hasFormsAdvancedFilters,
  canClearFormsFilters,
  filterForms,
  sortForms,
  nextFormsSortState,
  formsSortArrowFor,
};
