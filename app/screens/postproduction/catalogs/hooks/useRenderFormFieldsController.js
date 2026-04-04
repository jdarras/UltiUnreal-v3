import { useMemo, useRef, useState } from "react";
import {
  inferFieldValueTypeFromInputKind,
  normalizeLiveOptionList,
  normalizeVectorDefaultForInput,
} from "../helpers/renderFormFields";
import { buildFieldInputKindOptions } from "./renderFormFields/fieldInputKinds";
import { useRenderFormFieldsActions } from "./renderFormFields/useRenderFormFieldsActions";
import { useRenderFormFieldsLoadingEffects } from "./renderFormFields/useRenderFormFieldsLoadingEffects";

export function useRenderFormFieldsController({
  t,
  selectedForm = null,
  selectedProjectRef = "",
  selectedFormProjectRef = "",
  metaPresetName = "",
  canManageRenderTemplates = false,
  onLoadProjectWrcFields = null,
  onLoadRenderFormFields = null,
  onReplaceRenderFormFields = null,
} = {}) {
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState("");
  const [fieldsDraftText, setFieldsDraftText] = useState("[]");
  const [fieldsAdvancedMode, setFieldsAdvancedMode] = useState(false);
  const [fieldsImportBusy, setFieldsImportBusy] = useState(false);
  const [fieldsImportError, setFieldsImportError] = useState("");
  const [fieldsImportInfo, setFieldsImportInfo] = useState("");
  const [fieldsSaveBusy, setFieldsSaveBusy] = useState(false);
  const [fieldsSaveError, setFieldsSaveError] = useState("");
  const [fieldsSaveInfo, setFieldsSaveInfo] = useState("");
  const [liveValues, setLiveValues] = useState({});
  const fieldsRef = useRef([]);
  const selectedFormId = Number(selectedForm?.id || 0);

  useRenderFormFieldsLoadingEffects({
    t,
    selectedFormId,
    onLoadRenderFormFields,
    fields,
    fieldsRef,
    setFields,
    setFieldsLoading,
    setFieldsError,
    setFieldsDraftText,
    setFieldsImportError,
    setFieldsImportInfo,
    setFieldsSaveError,
    setFieldsSaveInfo,
    setLiveValues,
  });

  const {
    persistEditableFields,
    updateEditableField,
    moveEditableField,
    removeEditableField,
    importFieldsFromWrcPreset,
    handleImportFieldsFromWrcPreset,
  } = useRenderFormFieldsActions({
    t,
    selectedForm,
    selectedProjectRef,
    selectedFormProjectRef,
    metaPresetName,
    canManageRenderTemplates,
    onLoadProjectWrcFields,
    onReplaceRenderFormFields,
    fieldsRef,
    inferFieldValueTypeFromInputKind,
    normalizeVectorDefaultForInput,
    setFields,
    setFieldsImportBusy,
    setFieldsImportError,
    setFieldsImportInfo,
    setFieldsSaveBusy,
    setFieldsSaveError,
    setFieldsSaveInfo,
  });

  function resetEditorDraftForCreate() {
    setFields([]);
    setFieldsDraftText("[]");
    setFieldsError("");
    setFieldsImportError("");
    setFieldsImportInfo("");
    setFieldsSaveError("");
    setFieldsSaveInfo("");
    setLiveValues({});
  }

  const editableFields = useMemo(
    () => (
      (Array.isArray(fields) ? fields : [])
        .slice()
        .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
    ),
    [fields]
  );

  const fieldInputKindOptions = useMemo(() => buildFieldInputKindOptions(t), [t]);

  return {
    fields,
    fieldsLoading,
    fieldsError,
    fieldsDraftText,
    setFieldsDraftText,
    fieldsAdvancedMode,
    setFieldsAdvancedMode,
    fieldsImportBusy,
    fieldsImportError,
    fieldsImportInfo,
    fieldsSaveBusy,
    fieldsSaveError,
    fieldsSaveInfo,
    liveValues,
    setLiveValues,
    editableFields,
    fieldInputKindOptions,
    normalizeLiveOptionList,
    inferFieldValueTypeFromInputKind,
    normalizeVectorDefaultForInput,
    persistEditableFields,
    updateEditableField,
    moveEditableField,
    removeEditableField,
    importFieldsFromWrcPreset,
    handleImportFieldsFromWrcPreset,
    resetEditorDraftForCreate,
  };
}

export default useRenderFormFieldsController;
