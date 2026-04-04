import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedLocalStorage } from "../../shared/useDebouncedLocalStorage";
import { readStorageJsonObject, readStorageString } from "../../shared/storage";

function useRenderFormsPreferences({ selectedProjectRef = "" } = {}) {
  const formsScopeKey = String(selectedProjectRef || "global").trim().toLowerCase() || "global";
  const formsViewStorageKey = `uu_postprod_forms_view_${formsScopeKey}`;
  const formsSortStorageKey = `uu_postprod_forms_sort_${formsScopeKey}`;
  const formsFavoritesStorageKey = `uu_postprod_forms_favorites_${formsScopeKey}`;
  const formsFavoriteOnlyStorageKey = `uu_postprod_forms_favorite_only_${formsScopeKey}`;

  const [formsViewMode, setFormsViewMode] = useState("thumbs");
  const [formsSortMode, setFormsSortMode] = useState("name");
  const [formsSortDir, setFormsSortDir] = useState("asc");
  const [formsSearchQuery, setFormsSearchQuery] = useState("");
  const [formsSearchExpanded, setFormsSearchExpanded] = useState(false);
  const [formsFavoriteOnly, setFormsFavoriteOnly] = useState(false);
  const [formsFavorites, setFormsFavorites] = useState({});
  const [formsSearchAdvanced, setFormsSearchAdvanced] = useState({
    active: "all",
    mapName: "",
    sequenceName: "",
    presetName: "",
  });

  useEffect(() => {
    let nextView = "thumbs";
    let nextSortMode = "name";
    let nextSortDir = "asc";
    let nextFavoriteOnly = false;
    let nextFavorites = {};
    try {
      const storedView = readStorageString(formsViewStorageKey).trim().toLowerCase();
      if (storedView === "thumbs" || storedView === "list") nextView = storedView;

      const rawSort = readStorageString(formsSortStorageKey).trim();
      if (rawSort) {
        const parsed = JSON.parse(rawSort);
        const mode = String(parsed?.mode || "").trim();
        const dir = String(parsed?.dir || "").trim().toLowerCase();
        if (
          mode === "name"
          || mode === "updatedAt"
          || mode === "projectName"
          || mode === "mapName"
          || mode === "templateName"
          || mode === "modeDefault"
          || mode === "presetName"
          || mode === "isActive"
        ) {
          nextSortMode = mode;
        }
        if (dir === "asc" || dir === "desc") nextSortDir = dir;
      }
      nextFavoriteOnly = readStorageString(formsFavoriteOnlyStorageKey).trim().toLowerCase() === "true";
      nextFavorites = readStorageJsonObject(formsFavoritesStorageKey, {});
    } catch {}
    setFormsViewMode(nextView);
    setFormsSortMode(nextSortMode);
    setFormsSortDir(nextSortDir);
    setFormsFavoriteOnly(nextFavoriteOnly);
    setFormsFavorites(nextFavorites);
  }, [formsViewStorageKey, formsSortStorageKey, formsFavoriteOnlyStorageKey, formsFavoritesStorageKey]);

  const formsSortStorageValue = useMemo(() => (
    JSON.stringify({
      mode: formsSortMode,
      dir: formsSortDir,
    })
  ), [formsSortMode, formsSortDir]);
  const formsFavoritesStorageValue = useMemo(() => {
    try {
      return JSON.stringify(formsFavorites || {});
    } catch {
      return "{}";
    }
  }, [formsFavorites]);

  useDebouncedLocalStorage(formsViewStorageKey, String(formsViewMode || "thumbs"), 180);
  useDebouncedLocalStorage(formsSortStorageKey, formsSortStorageValue, 220);
  useDebouncedLocalStorage(formsFavoriteOnlyStorageKey, formsFavoriteOnly ? "true" : "false", 180);
  useDebouncedLocalStorage(formsFavoritesStorageKey, formsFavoritesStorageValue, 280);

  const setSortFromSelect = useCallback((valueRaw) => {
    const raw = String(valueRaw || "").trim();
    if (!raw) return;
    const [modeCandidate, dirCandidate] = raw.split(":");
    const mode = String(modeCandidate || "").trim();
    const dir = String(dirCandidate || "").trim().toLowerCase();
    if (
      mode !== "name"
      && mode !== "updatedAt"
      && mode !== "projectName"
      && mode !== "mapName"
      && mode !== "templateName"
      && mode !== "modeDefault"
      && mode !== "presetName"
      && mode !== "isActive"
    ) {
      return;
    }
    setFormsSortMode(mode);
    setFormsSortDir(dir === "desc" ? "desc" : "asc");
  }, []);

  return {
    formsViewMode,
    setFormsViewMode,
    formsSortMode,
    setFormsSortMode,
    formsSortDir,
    setFormsSortDir,
    formsSearchQuery,
    setFormsSearchQuery,
    formsSearchExpanded,
    setFormsSearchExpanded,
    formsFavoriteOnly,
    setFormsFavoriteOnly,
    formsFavorites,
    setFormsFavorites,
    formsSearchAdvanced,
    setFormsSearchAdvanced,
    setSortFromSelect,
  };
}

export { useRenderFormsPreferences };
