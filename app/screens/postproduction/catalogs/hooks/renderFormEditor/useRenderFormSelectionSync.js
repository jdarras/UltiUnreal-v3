import { useEffect, useMemo } from "react";

export function useRenderFormSelectionSync({
  visibleForms = [],
  selectedFormId = 0,
  setSelectedFormId = null,
  editorIntent = "edit",
} = {}) {
  useEffect(() => {
    if (editorIntent === "create") {
      if (Number(selectedFormId || 0) !== 0 && typeof setSelectedFormId === "function") {
        setSelectedFormId(0);
      }
      return;
    }
    if (!Array.isArray(visibleForms) || visibleForms.length <= 0) {
      if (typeof setSelectedFormId === "function") setSelectedFormId(0);
      return;
    }
    const hasCurrent = visibleForms.some((form) => Number(form?.id || 0) === Number(selectedFormId || 0));
    if (hasCurrent) return;
    if (typeof setSelectedFormId === "function") {
      setSelectedFormId(Number(visibleForms[0]?.id || 0));
    }
  }, [visibleForms, selectedFormId, editorIntent, setSelectedFormId]);

  const selectedForm = useMemo(
    () => visibleForms.find((form) => Number(form?.id || 0) === Number(selectedFormId || 0)) || null,
    [visibleForms, selectedFormId]
  );

  return { selectedForm };
}

export default useRenderFormSelectionSync;
