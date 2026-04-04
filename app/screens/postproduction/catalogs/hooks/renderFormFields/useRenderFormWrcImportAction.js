import { useCallback } from "react";
import { safeT } from "../../../shared/helpers";
import { importRenderFormFieldsFromWrc } from "./importRenderFormFieldsFromWrc";

export function useRenderFormWrcImportAction({
  t,
  selectedForm = null,
  selectedProjectRef = "",
  selectedFormProjectRef = "",
  metaPresetName = "",
  canManageRenderTemplates = false,
  onLoadProjectWrcFields = null,
  onReplaceRenderFormFields = null,
  setFields = null,
  setFieldsImportBusy = null,
  setFieldsImportError = null,
  setFieldsImportInfo = null,
  setFieldsSaveError = null,
  setFieldsSaveInfo = null,
} = {}) {
  const importFieldsFromWrcPreset = useCallback(async (options = null) => {
    const opts = options && typeof options === "object" && !Array.isArray(options) ? options : {};
    const formId = Number(opts.formId || selectedForm?.id || 0);
    const projectRef = String(opts.projectRef || selectedProjectRef || selectedFormProjectRef || "").trim();
    const presetName = String(opts.presetName || metaPresetName || selectedForm?.presetName || "").trim();
    setFieldsImportError?.("");
    setFieldsImportInfo?.("");
    setFieldsSaveError?.("");
    setFieldsSaveInfo?.("");
    setFieldsImportBusy?.(true);
    try {
      const result = await importRenderFormFieldsFromWrc({
        t,
        canManageRenderTemplates,
        onLoadProjectWrcFields,
        onReplaceRenderFormFields,
        formId,
        projectRef,
        presetName,
      });
      if (!result?.ok) {
        if (result?.error) setFieldsImportError?.(String(result.error));
        return false;
      }
      const savedFields = Array.isArray(result?.fields) ? result.fields : [];
      setFields?.(savedFields);
      setFieldsImportInfo?.(String(result?.info || ""));
      return true;
    } catch (e) {
      setFieldsImportError?.(
        String(
          e?.message
          || safeT(
            t,
            "postprod.data.forms.error.import.failed",
            "Import WRC impossible."
          )
        )
      );
      return false;
    } finally {
      setFieldsImportBusy?.(false);
    }
  }, [
    selectedForm?.id,
    selectedProjectRef,
    selectedFormProjectRef,
    metaPresetName,
    selectedForm?.presetName,
    t,
    canManageRenderTemplates,
    onLoadProjectWrcFields,
    onReplaceRenderFormFields,
    setFieldsImportError,
    setFieldsImportInfo,
    setFieldsSaveError,
    setFieldsSaveInfo,
    setFieldsImportBusy,
    setFields,
  ]);

  const handleImportFieldsFromWrcPreset = useCallback(async () => {
    await importFieldsFromWrcPreset();
  }, [importFieldsFromWrcPreset]);

  return {
    importFieldsFromWrcPreset,
    handleImportFieldsFromWrcPreset,
  };
}

export default useRenderFormWrcImportAction;

