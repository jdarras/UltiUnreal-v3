import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  metaWrcFiles = [],
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
    metaWrcFiles,
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

  // Auto-import from cache only for empty forms with selected WRC files.
  // This keeps "manual refresh from Unreal" via the explicit "Load Preset WRC" button.
  const autoCacheImportDoneRef = useRef(0);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    autoCacheImportDoneRef.current = 0;
    wasLoadingRef.current = false;
  }, [selectedFormId]);

  useEffect(() => {
    if (fieldsLoading) wasLoadingRef.current = true;
  }, [fieldsLoading]);

  const metaWrcFilesKey = Array.isArray(metaWrcFiles) ? metaWrcFiles.join(",") : "";

  useEffect(() => {
    if (fieldsLoading) return;
    if (!wasLoadingRef.current) return;
    if (autoCacheImportDoneRef.current === selectedFormId) return;
    const hasExistingFields = Array.isArray(fieldsRef.current) && fieldsRef.current.length > 0;
    if (hasExistingFields) {
      autoCacheImportDoneRef.current = selectedFormId;
      return;
    }
    const wrcFiles = Array.isArray(metaWrcFiles) ? metaWrcFiles.filter(Boolean) : [];
    const projectRef = String(selectedProjectRef || selectedFormProjectRef || "").trim();
    if (!wrcFiles.length || !projectRef || !selectedFormId) return;
    autoCacheImportDoneRef.current = selectedFormId;
    (async () => {
      for (const wrcFile of wrcFiles) {
        try {
          await importFieldsFromWrcPreset({
            formId: selectedFormId,
            projectRef,
            wrcFile,
            loadOptions: { refreshSnapshot: false },
          });
        } catch {
          // Keep existing behavior: do not crash UI on background import failure.
        }
      }
    })();
  }, [
    fieldsLoading,
    selectedFormId,
    metaWrcFilesKey,
    selectedProjectRef,
    selectedFormProjectRef,
    importFieldsFromWrcPreset,
  ]);

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

  const reloadRenderFormFields = useCallback(async () => {
    const formId = Number(selectedForm?.id || 0);
    if (!Number.isFinite(formId) || formId <= 0 || typeof onLoadRenderFormFields !== "function") return [];
    setFieldsLoading(true);
    setFieldsError("");
    try {
      const loaded = await Promise.resolve(onLoadRenderFormFields(formId));
      const list = Array.isArray(loaded) ? loaded : [];
      setFields(list);
      const defaults = {};
      for (const field of list) {
        const key = String(field?.fieldKey || "").trim();
        if (!key) continue;
        defaults[key] = field?.defaultValue ?? "";
      }
      setLiveValues(defaults);
      return list;
    } catch (e) {
      setFieldsError(String(
        e?.message
        || "Impossible de recharger les champs du formulaire."
      ));
      return [];
    } finally {
      setFieldsLoading(false);
    }
  }, [selectedForm?.id, onLoadRenderFormFields, setLiveValues]);

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
    reloadRenderFormFields,
    resetEditorDraftForCreate,
  };
}

export default useRenderFormFieldsController;
