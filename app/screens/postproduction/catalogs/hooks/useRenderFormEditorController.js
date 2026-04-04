import { useMemo } from "react";
import { useRenderFormMetaController } from "./useRenderFormMetaController";
import { useRenderFormFieldsController } from "./useRenderFormFieldsController";
import { buildRenderFormEditorOutput } from "./renderFormEditor/buildRenderFormEditorOutput";
import { useRenderFormSelectionSync } from "./renderFormEditor/useRenderFormSelectionSync";
import { resolveSelectedFormProjectDisplayLabel } from "./renderFormEditor/selectedFormProjectLabel";
import { useRenderFormEditorActions } from "./renderFormEditor/useRenderFormEditorActions";

export function useRenderFormEditorController({
  t,
  selectedProjectRef = "",
  selectedFormProjectRef = "",
  visibleForms = [],
  selectedFormId = 0,
  setSelectedFormId = null,
  editorIntent = "edit",
  setEditorIntent = null,
  setShowEditor = null,
  canManageRenderTemplates = false,
  projectLabelByAnyKey = new Map(),
  onCreateRenderForm = null,
  onUpdateRenderForm = null,
  onDeleteRenderForm = null,
  onLoadProjectWrcFields = null,
  onLoadRenderFormFields = null,
  onReplaceRenderFormFields = null,
} = {}) {
  const { selectedForm } = useRenderFormSelectionSync({
    visibleForms,
    selectedFormId,
    setSelectedFormId,
    editorIntent,
  });

  const selectedFormProjectDisplayLabel = useMemo(() => {
    return resolveSelectedFormProjectDisplayLabel({
      selectedForm,
      selectedProjectRef,
      projectLabelByAnyKey,
    });
  }, [selectedForm?.projectName, selectedProjectRef, projectLabelByAnyKey]);

  const metaController = useRenderFormMetaController({
    t,
    selectedForm,
    selectedProjectRef,
    canManageRenderTemplates,
    onCreateRenderForm,
    onUpdateRenderForm,
    onDeleteRenderForm,
    setSelectedFormId,
    setEditorIntent,
    setShowEditor,
  });

  const fieldsController = useRenderFormFieldsController({
    t,
    selectedForm,
    selectedProjectRef,
    selectedFormProjectRef,
    metaPresetName: metaController.metaPresetName,
    canManageRenderTemplates,
    onLoadProjectWrcFields,
    onLoadRenderFormFields,
    onReplaceRenderFormFields,
  });

  const {
    handleCreateForm,
    handleSaveFormMeta,
    handleDeleteForm,
  } = useRenderFormEditorActions({
    createRenderForm: metaController.createRenderForm,
    saveRenderFormMeta: metaController.saveRenderFormMeta,
    deleteRenderForm: metaController.deleteRenderForm,
    importFieldsFromWrcPreset: fieldsController.importFieldsFromWrcPreset,
    editableFields: fieldsController.editableFields,
  });

  return buildRenderFormEditorOutput({
    selectedForm,
    selectedFormProjectDisplayLabel,
    meta: metaController,
    fieldsController,
    handlers: {
      handleCreateForm,
      handleSaveFormMeta,
      handleDeleteForm,
    },
  });
}

export default useRenderFormEditorController;
