import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildFormsScopeKey,
  buildFormsStorageKeys,
  buildInitialFormsState,
  normalizeFormsSortSelect,
  stringifyFormsFavorites,
  stringifyFormsSort,
  usePersistRenderFormsPreferences,
} from "./renderFormsPreferencesHelpers";

function useRenderFormsPreferences({ selectedProjectRef = "" } = {}) {
  const formsScopeKey = buildFormsScopeKey(selectedProjectRef);
  const {
    formsViewStorageKey,
    formsSortStorageKey,
    formsFavoritesStorageKey,
    formsFavoriteOnlyStorageKey,
  } = useMemo(() => buildFormsStorageKeys(formsScopeKey), [formsScopeKey]);

  const [formsViewMode, setFormsViewMode] = useState("thumbs");
  const [formsSortMode, setFormsSortMode] = useState("name");
  const [formsSortDir, setFormsSortDir] = useState("asc");
  const [formsSearchQuery, setFormsSearchQuery] = useState("");
  const [formsSearchExpanded, setFormsSearchExpanded] = useState(false);
  const [formsFavoriteOnly, setFormsFavoriteOnly] = useState(false);
  const [formsFavorites, setFormsFavorites] = useState({});
  const [formsSearchAdvanced, setFormsSearchAdvanced] = useState({
    active: "all",
    projects: [],
    mapNames: [],
    sequences: [],
    presets: [],
    wrcFiles: [],
  });

  useEffect(() => {
    const nextState = buildInitialFormsState({
      formsViewStorageKey,
      formsSortStorageKey,
      formsFavoritesStorageKey,
      formsFavoriteOnlyStorageKey,
    });
    setFormsViewMode(nextState.formsViewMode);
    setFormsSortMode(nextState.formsSortMode);
    setFormsSortDir(nextState.formsSortDir);
    setFormsFavoriteOnly(nextState.formsFavoriteOnly);
    setFormsFavorites(nextState.formsFavorites);
  }, [formsViewStorageKey, formsSortStorageKey, formsFavoriteOnlyStorageKey, formsFavoritesStorageKey]);

  const formsSortStorageValue = useMemo(
    () => stringifyFormsSort(formsSortMode, formsSortDir),
    [formsSortMode, formsSortDir]
  );
  const formsFavoritesStorageValue = useMemo(
    () => stringifyFormsFavorites(formsFavorites),
    [formsFavorites]
  );

  usePersistRenderFormsPreferences({
    formsViewStorageKey,
    formsSortStorageKey,
    formsFavoriteOnlyStorageKey,
    formsFavoritesStorageKey,
    formsViewMode,
    formsSortStorageValue,
    formsFavoriteOnly,
    formsFavoritesStorageValue,
  });

  const setSortFromSelect = useCallback((valueRaw) => {
    const parsed = normalizeFormsSortSelect(valueRaw);
    if (!parsed) return;
    setFormsSortMode(parsed.mode);
    setFormsSortDir(parsed.dir);
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
