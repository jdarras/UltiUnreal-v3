import { useCallback } from "react";
import { safeT } from "../../../shared/helpers";
import { importRenderFormFieldsFromWrc } from "./importRenderFormFieldsFromWrc";

export function useRenderFormWrcImportAction({
  t,
  selectedForm = null,
  selectedProjectRef = "",
  selectedFormProjectRef = "",
  metaWrcFiles = [],
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
  // Import fields for a single WRC file (opts.wrcFile) or all metaWrcFiles when reimporting.
  const importFieldsFromWrcPreset = useCallback(async (options = null) => {
    const opts = options && typeof options === "object" && !Array.isArray(options) ? options : {};
    const formId = Number(opts.formId || selectedForm?.id || 0);
    const projectRef = String(opts.projectRef || selectedProjectRef || selectedFormProjectRef || "").trim();
    const wrcFile = String(opts.wrcFile || "").trim();
    const loadOptions = opts.loadOptions && typeof opts.loadOptions === "object" && !Array.isArray(opts.loadOptions)
      ? opts.loadOptions
      : {};
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
        wrcFile,
        loadOptions,
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
          || safeT(t, "postprod.data.forms.error.import.failed", "Import WRC impossible.")
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

  // Reimport all checked WRC files (used by the reimport dialog button)
  const handleImportFieldsFromWrcPreset = useCallback(async () => {
    const formId = Number(selectedForm?.id || 0);
    const projectRef = String(selectedProjectRef || selectedFormProjectRef || "").trim();
    const wrcFiles = Array.isArray(metaWrcFiles) ? metaWrcFiles.filter(Boolean) : [];
    if (!wrcFiles.length) {
      setFieldsImportError?.(safeT(t, "postprod.data.forms.error.import.noWrcFiles", "Aucun fichier WRC selectionne."));
      return;
    }
    setFieldsImportError?.("");
    setFieldsImportInfo?.("");
    setFieldsSaveError?.("");
    setFieldsSaveInfo?.("");
    setFieldsImportBusy?.(true);
    try {
      let lastFields = null;
      let totalCount = 0;
      for (const wrcFile of wrcFiles) {
        const result = await importRenderFormFieldsFromWrc({
          t,
          canManageRenderTemplates,
          onLoadProjectWrcFields,
          onReplaceRenderFormFields,
          formId,
          projectRef,
          wrcFile,
          loadOptions: { refreshSnapshot: true },
        });
        if (result?.ok && Array.isArray(result?.fields)) {
          lastFields = result.fields;
          totalCount = lastFields.length;
        }
      }
      if (lastFields !== null) {
        setFields?.(lastFields);
        setFieldsImportInfo?.(
          safeT(
            t,
            "postprod.data.forms.msg.import.success.multi",
            "Import WRC terminé ({count} champs, {files} fichier(s)).",
            { count: totalCount, files: wrcFiles.length }
          )
        );
      } else {
        setFieldsImportError?.(
          safeT(
            t,
            "postprod.data.forms.msg.import.empty",
            "Aucun champ importable trouvé dans le preset WRC '{wrcFile}'.",
            { wrcFile: "-" }
          )
        );
      }
    } catch (e) {
      setFieldsImportError?.(String(e?.message || safeT(t, "postprod.data.forms.error.import.failed", "Import WRC impossible.")));
    } finally {
      setFieldsImportBusy?.(false);
    }
  }, [
    selectedForm?.id,
    selectedProjectRef,
    selectedFormProjectRef,
    metaWrcFiles,
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

  return {
    importFieldsFromWrcPreset,
    handleImportFieldsFromWrcPreset,
  };
}

export default useRenderFormWrcImportAction;
