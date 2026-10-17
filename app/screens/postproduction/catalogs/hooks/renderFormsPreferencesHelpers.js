import { useDebouncedLocalStorage } from "../../shared/useDebouncedLocalStorage";
import { readStorageJsonObject, readStorageString } from "../../shared/storage";

const FORMS_SORT_MODE_SET = new Set([
  "name",
  "updatedAt",
  "projectName",
  "mapName",
  "templateName",
  "modeDefault",
  "presetName",
  "isActive",
]);

function buildFormsScopeKey(selectedProjectRef = "") {
  return String(selectedProjectRef || "global").trim().toLowerCase() || "global";
}

function buildFormsStorageKeys(formsScopeKey = "global") {
  return {
    formsViewStorageKey: `uu_postprod_forms_view_${formsScopeKey}`,
    formsSortStorageKey: `uu_postprod_forms_sort_${formsScopeKey}`,
    formsFavoritesStorageKey: `uu_postprod_forms_favorites_${formsScopeKey}`,
    formsFavoriteOnlyStorageKey: `uu_postprod_forms_favorite_only_${formsScopeKey}`,
  };
}

function buildInitialFormsState({
  formsViewStorageKey = "",
  formsSortStorageKey = "",
  formsFavoritesStorageKey = "",
  formsFavoriteOnlyStorageKey = "",
} = {}) {
  let formsViewMode = "thumbs";
  let formsSortMode = "name";
  let formsSortDir = "asc";
  let formsFavoriteOnly = false;
  let formsFavorites = {};

  try {
    const storedView = readStorageString(formsViewStorageKey).trim().toLowerCase();
    if (storedView === "thumbs" || storedView === "list") formsViewMode = storedView;

    const rawSort = readStorageString(formsSortStorageKey).trim();
    if (rawSort) {
      const parsed = JSON.parse(rawSort);
      const mode = String(parsed?.mode || "").trim();
      const dir = String(parsed?.dir || "").trim().toLowerCase();
      if (FORMS_SORT_MODE_SET.has(mode)) formsSortMode = mode;
      if (dir === "asc" || dir === "desc") formsSortDir = dir;
    }

    formsFavoriteOnly = readStorageString(formsFavoriteOnlyStorageKey).trim().toLowerCase() === "true";
    formsFavorites = readStorageJsonObject(formsFavoritesStorageKey, {});
  } catch {}

  return {
    formsViewMode,
    formsSortMode,
    formsSortDir,
    formsFavoriteOnly,
    formsFavorites,
  };
}

function stringifyFormsSort(formsSortMode, formsSortDir) {
  return JSON.stringify({
    mode: formsSortMode,
    dir: formsSortDir,
  });
}

function stringifyFormsFavorites(formsFavorites) {
  try {
    return JSON.stringify(formsFavorites || {});
  } catch {
    return "{}";
  }
}

function usePersistRenderFormsPreferences({
  formsViewStorageKey = "",
  formsSortStorageKey = "",
  formsFavoriteOnlyStorageKey = "",
  formsFavoritesStorageKey = "",
  formsViewMode = "thumbs",
  formsSortStorageValue = "",
  formsFavoriteOnly = false,
  formsFavoritesStorageValue = "{}",
} = {}) {
  useDebouncedLocalStorage(formsViewStorageKey, String(formsViewMode || "thumbs"), 180);
  useDebouncedLocalStorage(formsSortStorageKey, formsSortStorageValue, 220);
  useDebouncedLocalStorage(formsFavoriteOnlyStorageKey, formsFavoriteOnly ? "true" : "false", 180);
  useDebouncedLocalStorage(formsFavoritesStorageKey, formsFavoritesStorageValue, 280);
}

function normalizeFormsSortSelect(valueRaw) {
  const raw = String(valueRaw || "").trim();
  if (!raw) return null;
  const [modeCandidate, dirCandidate] = raw.split(":");
  const mode = String(modeCandidate || "").trim();
  const dir = String(dirCandidate || "").trim().toLowerCase();
  if (!FORMS_SORT_MODE_SET.has(mode)) return null;
  return {
    mode,
    dir: dir === "desc" ? "desc" : "asc",
  };
}

export {
  buildFormsScopeKey,
  buildFormsStorageKeys,
  buildInitialFormsState,
  stringifyFormsSort,
  stringifyFormsFavorites,
  usePersistRenderFormsPreferences,
  normalizeFormsSortSelect,
};
