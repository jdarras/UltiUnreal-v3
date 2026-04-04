import { useCallback } from "react";
import { safeT } from "../../../shared/helpers";
import { normalizeFieldsForPersist } from "./fieldListOperations";

export function usePersistRenderFormFields({
  t,
  selectedForm = null,
  canManageRenderTemplates = false,
  onReplaceRenderFormFields = null,
  fieldsRef = null,
  setFields = null,
  setFieldsSaveBusy = null,
  setFieldsSaveError = null,
  setFieldsSaveInfo = null,
} = {}) {
  const persistEditableFields = useCallback(async (candidateFields = null, options = null) => {
    const opts = options && typeof options === "object" && !Array.isArray(options) ? options : {};
    const formId = Number(opts.formId || selectedForm?.id || 0);
    if (!Number.isFinite(formId) || formId <= 0) return false;
    if (!canManageRenderTemplates || typeof onReplaceRenderFormFields !== "function") return false;
    const currentFields = Array.isArray(candidateFields)
      ? candidateFields
      : Array.isArray(fieldsRef?.current)
        ? fieldsRef.current
        : [];
    const fieldsToSave = normalizeFieldsForPersist(currentFields);
    if (fieldsToSave.length <= 0) {
      setFieldsSaveError?.("");
      setFieldsSaveInfo?.("");
      return true;
    }
    setFieldsSaveBusy?.(true);
    setFieldsSaveError?.("");
    try {
      const saved = await Promise.resolve(onReplaceRenderFormFields(formId, fieldsToSave));
      const savedFields = Array.isArray(saved) ? saved : fieldsToSave;
      setFields?.(savedFields);
      setFieldsSaveInfo?.(safeT(t, "postprod.data.forms.msg.fieldsAutosaved", "Champs enregistres automatiquement."));
      return true;
    } catch (e) {
      setFieldsSaveInfo?.("");
      setFieldsSaveError?.(
        String(
          e?.message
          || safeT(t, "postprod.data.forms.error.saveFields", "Enregistrement des champs impossible.")
        )
      );
      return false;
    } finally {
      setFieldsSaveBusy?.(false);
    }
  }, [
    selectedForm?.id,
    canManageRenderTemplates,
    onReplaceRenderFormFields,
    fieldsRef,
    setFields,
    setFieldsSaveBusy,
    setFieldsSaveError,
    setFieldsSaveInfo,
    t,
  ]);

  return { persistEditableFields };
}

export default usePersistRenderFormFields;

