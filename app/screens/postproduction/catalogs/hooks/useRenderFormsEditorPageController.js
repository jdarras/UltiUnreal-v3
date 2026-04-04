import { useCallback } from "react";
import { useConfirmDialogState } from "./useConfirmDialogState";
import { useProjectUnrealCatalog } from "./useProjectUnrealCatalog";
import { useRenderFormEditorController } from "./useRenderFormEditorController";
import { useRenderFormsEditorState } from "./useRenderFormsEditorState";
import { useRenderFormsListController } from "./useRenderFormsListController";
import { useRenderFormsPreferences } from "./useRenderFormsPreferences";

function useRenderFormsEditorPageController({
  t,
  selectedProjectRef = "",
  projectOptions = [],
  renderForms = [],
  canManageRenderTemplates = false,
  onCreateRenderForm = null,
  onUpdateRenderForm = null,
  onDeleteRenderForm = null,
  onLoadProjectWrcFields = null,
  onLoadProjectUnrealCatalog = null,
  onLoadRenderFormFields = null,
  onReplaceRenderFormFields = null,
}) {
  const editorState = useRenderFormsEditorState();
  const {
    setShowEditor,
    editorIntent,
    setEditorIntent,
    selectedFormId,
    setSelectedFormId,
  } = editorState;

  const preferences = useRenderFormsPreferences({ selectedProjectRef });
  const {
    formsSortMode,
    formsSortDir,
    formsSearchQuery,
    formsSearchExpanded,
    formsFavoriteOnly,
    formsFavorites,
    setFormsFavorites,
    formsSearchAdvanced,
    setFormsSortMode,
    setFormsSortDir,
  } = preferences;

  const listController = useRenderFormsListController({
    selectedProjectRef,
    projectOptions,
    renderForms,
    selectedFormId,
    formsFavoriteOnly,
    formsFavorites,
    setFormsFavorites,
    formsSearchQuery,
    formsSearchExpanded,
    formsSearchAdvanced,
    formsSortMode,
    formsSortDir,
    setFormsSortMode,
    setFormsSortDir,
  });

  const {
    selectedFormProjectRef,
    visibleForms,
    projectLabelByAnyKey,
  } = listController;

  const projectCatalog = useProjectUnrealCatalog({
    t,
    selectedProjectRef,
    selectedFormProjectRef,
    onLoadProjectUnrealCatalog,
  });

  const editorController = useRenderFormEditorController({
    t,
    selectedProjectRef,
    selectedFormProjectRef,
    visibleForms,
    selectedFormId,
    setSelectedFormId,
    editorIntent,
    setEditorIntent,
    setShowEditor,
    canManageRenderTemplates,
    projectLabelByAnyKey,
    onCreateRenderForm,
    onUpdateRenderForm,
    onDeleteRenderForm,
    onLoadProjectWrcFields,
    onLoadRenderFormFields,
    onReplaceRenderFormFields,
  });

  const { resetEditorDraftForCreate, fieldsImportBusy, metaBusy } = editorController;

  const handleStartCreate = useCallback(() => {
    resetEditorDraftForCreate();
    editorState.startCreate();
  }, [editorState, resetEditorDraftForCreate]);

  const deleteDialog = useConfirmDialogState({
    canOpen: Number.isFinite(Number(selectedFormId || 0)) && Number(selectedFormId || 0) > 0,
    closeBlocked: metaBusy,
  });
  const reimportDialog = useConfirmDialogState({
    canOpen:
      Number.isFinite(Number(selectedFormId || 0)) &&
      Number(selectedFormId || 0) > 0 &&
      canManageRenderTemplates,
    closeBlocked: fieldsImportBusy,
  });

  const clearListFilters = useCallback(() => {
    preferences.setFormsSearchQuery("");
    preferences.setFormsFavoriteOnly(false);
    preferences.setFormsSearchAdvanced({
      active: "all",
      mapName: "",
      sequenceName: "",
      presetName: "",
    });
    preferences.setFormsSearchExpanded(false);
  }, [preferences]);

  return {
    editorState,
    preferences,
    listController,
    projectCatalog,
    editorController,
    deleteDialog,
    reimportDialog,
    handleStartCreate,
    clearListFilters,
  };
}

export { useRenderFormsEditorPageController };
