import { useCallback } from "react";

export function useRenderFormEditorActions({
  createRenderForm = null,
  saveRenderFormMeta = null,
  deleteRenderForm = null,
  importFieldsFromWrcPreset = null,
  reloadRenderFormFields = null,
  editableFields = [],
} = {}) {
  const handleCreateForm = useCallback(async () => {
    if (typeof createRenderForm !== "function") return;
    const result = await createRenderForm();
    const formId = Number(result?.createdId || 0);
    const projectRef = String(result?.projectRef || "").trim();
    const wrcFiles = Array.isArray(result?.wrcFiles) ? result.wrcFiles.filter(Boolean) : [];
    if (typeof importFieldsFromWrcPreset !== "function") return;
    if (!Number.isFinite(formId) || formId <= 0 || !projectRef || wrcFiles.length <= 0) return;
    for (const wrcFile of wrcFiles) {
      await importFieldsFromWrcPreset({
        formId,
        projectRef,
        wrcFile,
        loadOptions: { refreshSnapshot: false },
      });
    }
    if (typeof reloadRenderFormFields === "function") {
      await reloadRenderFormFields();
    }
  }, [createRenderForm, importFieldsFromWrcPreset, reloadRenderFormFields]);

  const handleSaveFormMeta = useCallback(async (overrides = null, options = null) => {
    if (typeof saveRenderFormMeta !== "function") return;
    const result = await saveRenderFormMeta(overrides, options);
    if (!result?.saved) return;

    const formId = Number(result?.formId || 0);
    const projectRef = String(result?.projectRef || "").trim();
    const nextWrcFiles = Array.isArray(result?.wrcFiles) ? result.wrcFiles.filter(Boolean) : [];
    const previousWrcFiles = Array.isArray(result?.previousWrcFiles) ? result.previousWrcFiles.filter(Boolean) : [];
    const previousWrcSet = new Set(previousWrcFiles.map((value) => String(value || "").trim().toLowerCase()));
    const addedWrcFiles = nextWrcFiles.filter((value) => !previousWrcSet.has(String(value || "").trim().toLowerCase()));
    const wrcFilesChanged = result?.wrcFilesChanged === true
      || addedWrcFiles.length > 0
      || previousWrcFiles.length !== nextWrcFiles.length;

    if (wrcFilesChanged) {
      if (typeof importFieldsFromWrcPreset === "function" && projectRef && formId) {
        for (const wrcFile of addedWrcFiles) {
          await importFieldsFromWrcPreset({
            formId,
            projectRef,
            wrcFile,
            loadOptions: { refreshSnapshot: false },
          });
        }
      }
      if (typeof reloadRenderFormFields === "function" && formId) {
        await reloadRenderFormFields();
      }
      return;
    }

    if (result?.importIfEmpty !== true) return;
    if (Array.isArray(editableFields) && editableFields.length > 0) return;
    if (typeof importFieldsFromWrcPreset !== "function") return;
    if (!nextWrcFiles.length || !projectRef || !formId) return;
    for (const wrcFile of nextWrcFiles) {
      await importFieldsFromWrcPreset({
        formId,
        projectRef,
        wrcFile,
        loadOptions: { refreshSnapshot: false },
      });
    }
  }, [saveRenderFormMeta, editableFields, importFieldsFromWrcPreset, reloadRenderFormFields]);

  const handleDeleteForm = useCallback(async () => {
    if (typeof deleteRenderForm !== "function") return;
    await deleteRenderForm();
  }, [deleteRenderForm]);

  return {
    handleCreateForm,
    handleSaveFormMeta,
    handleDeleteForm,
  };
}
