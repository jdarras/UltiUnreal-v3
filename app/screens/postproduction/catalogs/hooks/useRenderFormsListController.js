import { useMemo } from "react";
import {
  normalizeProjectOptions,
  buildProjectLabelByAnyKey,
  buildProjectLookup,
  filterVisibleForms,
  selectedFormProjectRef as deriveSelectedFormProjectRef,
  formProjectLabel as getFormProjectLabel,
} from "./renderFormsList/projectHelpers";
import {
  isFormFavorite as isFavoriteForm,
  toggleFormFavorite as toggleFavoriteForm,
} from "./renderFormsList/favoriteHelpers";
import {
  normalizeFormsSearchQuery,
  hasFormsAdvancedFilters as computeHasFormsAdvancedFilters,
  canClearFormsFilters as computeCanClearFormsFilters,
  filterForms,
  sortForms,
  nextFormsSortState,
  formsSortArrowFor as resolveFormsSortArrowFor,
} from "./renderFormsList/filterSortHelpers";

export function useRenderFormsListController({
  selectedProjectRef = "",
  projectOptions = [],
  renderForms = [],
  selectedFormId = 0,
  formsFavoriteOnly = false,
  formsFavorites = {},
  setFormsFavorites = null,
  formsSearchQuery = "",
  formsSearchExpanded = false,
  formsSearchAdvanced = {},
  formsSortMode = "name",
  formsSortDir = "asc",
  setFormsSortMode = null,
  setFormsSortDir = null,
} = {}) {
  const normalizedProjectOptions = useMemo(
    () => normalizeProjectOptions(projectOptions),
    [projectOptions]
  );

  const projectLabelByAnyKey = useMemo(() => {
    return buildProjectLabelByAnyKey(normalizedProjectOptions);
  }, [normalizedProjectOptions]);

  const projectLookup = useMemo(() => {
    return buildProjectLookup(selectedProjectRef);
  }, [selectedProjectRef]);

  const visibleForms = useMemo(() => {
    return filterVisibleForms(renderForms, projectLookup);
  }, [renderForms, projectLookup]);

  const selectedFormProjectRef = useMemo(() => {
    return deriveSelectedFormProjectRef(visibleForms, selectedFormId);
  }, [visibleForms, selectedFormId]);

  function isFormFavorite(form) {
    return isFavoriteForm(form, formsFavorites, selectedProjectRef);
  }

  function toggleFormFavorite(form) {
    toggleFavoriteForm(form, setFormsFavorites, selectedProjectRef);
  }

  function formProjectLabel(form) {
    return getFormProjectLabel(form, selectedProjectRef, projectLabelByAnyKey);
  }

  function formProjectId(form) {
    const ref = String(form?.projectName || "").trim().toLowerCase();
    if (!ref) return 0;
    const project = normalizedProjectOptions.find(
      (p) => String(p?.ref || "").trim().toLowerCase() === ref
    );
    return Number(project?.id || 0);
  }

  const normalizedFormsSearchQuery = useMemo(
    () => normalizeFormsSearchQuery(formsSearchQuery),
    [formsSearchQuery]
  );

  const hasFormsAdvancedFilters = useMemo(() => {
    return computeHasFormsAdvancedFilters(formsSearchAdvanced);
  }, [formsSearchAdvanced]);

  const canClearFormsFilters = useMemo(
    () => computeCanClearFormsFilters({
      normalizedFormsSearchQuery,
      formsFavoriteOnly,
      hasFormsAdvancedFilters,
      formsSearchExpanded,
    }),
    [normalizedFormsSearchQuery, formsFavoriteOnly, hasFormsAdvancedFilters, formsSearchExpanded]
  );

  const filteredForms = useMemo(() => {
    return filterForms({
      visibleForms,
      formsFavoriteOnly,
      isFormFavorite,
      normalizedFormsSearchQuery,
      formsSearchAdvanced,
      formProjectLabel,
    });
  }, [
    visibleForms,
    formsFavoriteOnly,
    normalizedFormsSearchQuery,
    formsSearchAdvanced,
    formsFavorites,
  ]);

  const sortedForms = useMemo(() => {
    return sortForms({
      filteredForms,
      formsSortMode,
      formsSortDir,
      formProjectLabel,
    });
  }, [filteredForms, formsSortMode, formsSortDir, projectLabelByAnyKey, selectedProjectRef]);

  function handleFormsListSort(modeRaw) {
    const next = nextFormsSortState(modeRaw, formsSortMode, formsSortDir);
    if (!next) return;
    if (typeof setFormsSortMode === "function") setFormsSortMode(next.mode);
    if (typeof setFormsSortDir === "function") setFormsSortDir(next.dir);
  }

  function formsSortArrowFor(modeRaw) {
    return resolveFormsSortArrowFor(modeRaw, formsSortMode, formsSortDir);
  }

  return {
    normalizedProjectOptions,
    projectLabelByAnyKey,
    visibleForms,
    selectedFormProjectRef,
    formProjectLabel,
    formProjectId,
    isFormFavorite,
    toggleFormFavorite,
    hasFormsAdvancedFilters,
    canClearFormsFilters,
    sortedForms,
    handleFormsListSort,
    formsSortArrowFor,
  };
}

export default useRenderFormsListController;
