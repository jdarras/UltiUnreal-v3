import { useCallback } from "react";
import {
  moveFieldList,
  removeFieldFromList,
  updateFieldList,
} from "./fieldListOperations";

export function useRenderFormFieldMutations({
  setFields = null,
  inferFieldValueTypeFromInputKind = null,
  normalizeVectorDefaultForInput = null,
  setFieldsSaveError = null,
  setFieldsSaveInfo = null,
  persistEditableFields = null,
} = {}) {
  const updateEditableField = useCallback((fieldKeyRaw, patchOrUpdater, options = {}) => {
    const fieldKey = String(fieldKeyRaw || "").trim();
    if (!fieldKey || typeof setFields !== "function") return;
    let nextSnapshot = null;
    setFields((prev) => {
      const mapped = updateFieldList({
        source: prev,
        fieldKey,
        patchOrUpdater,
        inferFieldValueTypeFromInputKind,
        normalizeVectorDefaultForInput,
      });
      nextSnapshot = mapped;
      return mapped;
    });
    setFieldsSaveError?.("");
    setFieldsSaveInfo?.("");
    if (options?.saveNow && typeof persistEditableFields === "function") {
      void persistEditableFields(nextSnapshot);
    }
  }, [
    setFields,
    inferFieldValueTypeFromInputKind,
    normalizeVectorDefaultForInput,
    setFieldsSaveError,
    setFieldsSaveInfo,
    persistEditableFields,
  ]);

  const moveEditableField = useCallback((fieldKeyRaw, direction = 1) => {
    const fieldKey = String(fieldKeyRaw || "").trim();
    if (!fieldKey || typeof setFields !== "function") return;
    let nextSnapshot = null;
    setFields((prev) => {
      const moved = moveFieldList({ source: prev, fieldKey, direction });
      nextSnapshot = moved;
      return moved;
    });
    setFieldsSaveError?.("");
    setFieldsSaveInfo?.("");
    if (nextSnapshot && typeof persistEditableFields === "function") {
      void persistEditableFields(nextSnapshot);
    }
  }, [setFields, setFieldsSaveError, setFieldsSaveInfo, persistEditableFields]);

  const removeEditableField = useCallback((fieldKeyRaw) => {
    const fieldKey = String(fieldKeyRaw || "").trim();
    if (!fieldKey || typeof setFields !== "function") return;
    let nextSnapshot = null;
    setFields((prev) => {
      const filtered = removeFieldFromList({ source: prev, fieldKey });
      nextSnapshot = filtered;
      return filtered;
    });
    setFieldsSaveError?.("");
    setFieldsSaveInfo?.("");
    if (nextSnapshot && typeof persistEditableFields === "function") {
      void persistEditableFields(nextSnapshot);
    }
  }, [setFields, setFieldsSaveError, setFieldsSaveInfo, persistEditableFields]);

  return {
    updateEditableField,
    moveEditableField,
    removeEditableField,
  };
}

export default useRenderFormFieldMutations;

