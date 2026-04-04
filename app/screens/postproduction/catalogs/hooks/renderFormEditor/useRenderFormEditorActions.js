import { useCallback } from "react";

export function useRenderFormEditorActions({
  createRenderForm = null,
  saveRenderFormMeta = null,
  deleteRenderForm = null,
  importFieldsFromWrcPreset = null,
  editableFields = [],
} = {}) {
  const handleCreateForm = useCallback(async () => {
    if (typeof createRenderForm !== "function") return;
    const created = await createRenderForm();
    if (!created || !Number.isFinite(Number(created?.createdId || 0)) || Number(created.createdId) <= 0) return;
    const presetName = String(created?.presetName || "").trim();
    if (!presetName || typeof importFieldsFromWrcPreset !== "function") return;
    await importFieldsFromWrcPreset({
      formId: Number(created.createdId),
      projectRef: String(created?.projectRef || "").trim(),
      presetName,
    });
  }, [createRenderForm, importFieldsFromWrcPreset]);

  const handleSaveFormMeta = useCallback(async (overrides = null, options = null) => {
    if (typeof saveRenderFormMeta !== "function") return;
    const result = await saveRenderFormMeta(overrides, options);
    if (!result?.saved || result?.importIfEmpty !== true) return;
    if (Array.isArray(editableFields) && editableFields.length > 0) return;
    if (typeof importFieldsFromWrcPreset !== "function") return;
    await importFieldsFromWrcPreset({
      formId: Number(result?.formId || 0),
      projectRef: String(result?.projectRef || "").trim(),
      presetName: String(result?.presetName || "").trim(),
    });
  }, [saveRenderFormMeta, editableFields, importFieldsFromWrcPreset]);

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

export default useRenderFormEditorActions;
