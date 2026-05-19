import { useCallback } from "react";
import { safeT } from "../../../shared/helpers";

export function useDeleteRenderFormAction({
  t,
  selectedForm = null,
  canManageRenderTemplates = false,
  onDeleteRenderForm = null,
  setSelectedFormId = null,
  setEditorIntent = null,
  setShowEditor = null,
  setMetaBusy = null,
  setMetaError = null,
  setMetaInfo = null,
} = {}) {
  const deleteRenderForm = useCallback(async () => {
    if (!canManageRenderTemplates || typeof onDeleteRenderForm !== "function") return false;
    const formId = Number(selectedForm?.id || 0);
    if (!Number.isFinite(formId) || formId <= 0) return false;
    setMetaError?.("");
    setMetaInfo?.("");
    setMetaBusy?.(true);
    try {
      const deleted = await Promise.resolve(onDeleteRenderForm(formId));
      if (deleted === false) {
        setMetaError?.(safeT(t, "postprod.data.forms.error.delete", "Suppression impossible."));
        return false;
      }
      setMetaInfo?.(safeT(t, "postprod.data.forms.msg.deleted", "Formulaire supprime."));
      setSelectedFormId?.(0);
      setEditorIntent?.("edit");
      setShowEditor?.(false);
      return true;
    } catch (e) {
      setMetaError?.(String(e?.message || safeT(t, "postprod.data.forms.error.delete", "Suppression impossible.")));
      return false;
    } finally {
      setMetaBusy?.(false);
    }
  }, [
    canManageRenderTemplates,
    onDeleteRenderForm,
    selectedForm,
    t,
    setMetaError,
    setMetaInfo,
    setMetaBusy,
    setSelectedFormId,
    setEditorIntent,
    setShowEditor,
  ]);

  return { deleteRenderForm };
}
