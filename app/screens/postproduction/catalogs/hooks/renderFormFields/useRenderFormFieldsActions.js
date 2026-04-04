import { usePersistRenderFormFields } from "./usePersistRenderFormFields";
import { useRenderFormFieldMutations } from "./useRenderFormFieldMutations";
import { useRenderFormWrcImportAction } from "./useRenderFormWrcImportAction";

function useRenderFormFieldsActions({
  t,
  selectedForm = null,
  selectedProjectRef = "",
  selectedFormProjectRef = "",
  metaPresetName = "",
  canManageRenderTemplates = false,
  onLoadProjectWrcFields = null,
  onReplaceRenderFormFields = null,
  fieldsRef = null,
  inferFieldValueTypeFromInputKind = null,
  normalizeVectorDefaultForInput = null,
  setFields,
  setFieldsImportBusy,
  setFieldsImportError,
  setFieldsImportInfo,
  setFieldsSaveBusy,
  setFieldsSaveError,
  setFieldsSaveInfo,
}) {
  const { persistEditableFields } = usePersistRenderFormFields({
    t,
    selectedForm,
    canManageRenderTemplates,
    onReplaceRenderFormFields,
    fieldsRef,
    setFields,
    setFieldsSaveBusy,
    setFieldsSaveError,
    setFieldsSaveInfo,
  });

  const {
    updateEditableField,
    moveEditableField,
    removeEditableField,
  } = useRenderFormFieldMutations({
    setFields,
    inferFieldValueTypeFromInputKind,
    normalizeVectorDefaultForInput,
    setFieldsSaveError,
    setFieldsSaveInfo,
    persistEditableFields,
  });

  const {
    importFieldsFromWrcPreset,
    handleImportFieldsFromWrcPreset,
  } = useRenderFormWrcImportAction({
    t,
    selectedForm,
    selectedProjectRef,
    selectedFormProjectRef,
    metaPresetName,
    canManageRenderTemplates,
    onLoadProjectWrcFields,
    onReplaceRenderFormFields,
    setFields,
    setFieldsImportBusy,
    setFieldsImportError,
    setFieldsImportInfo,
    setFieldsSaveError,
    setFieldsSaveInfo,
  });

  return {
    persistEditableFields,
    updateEditableField,
    moveEditableField,
    removeEditableField,
    importFieldsFromWrcPreset,
    handleImportFieldsFromWrcPreset,
  };
}

export { useRenderFormFieldsActions };
