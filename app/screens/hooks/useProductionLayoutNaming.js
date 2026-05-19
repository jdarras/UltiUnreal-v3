import { useCallback } from "react";

function useProductionLayoutNaming({
  setWidgets = null,
  setValues = null,
  setSelectedId = null,
  t = null,
  maxLayoutNameLen = 24,
  normalizeBrowseWidget = (widget) => widget,
  extractValuesFromLayout = () => ({}),
} = {}) {
  const applyLayout = useCallback(
    (layoutArr = []) => {
      const normalized = Array.isArray(layoutArr)
        ? layoutArr.map(normalizeBrowseWidget)
        : [];
      setWidgets?.(normalized);
      const initialValues = extractValuesFromLayout(normalized);
      setValues?.(initialValues);
      setSelectedId?.(null);
      return initialValues;
    },
    [normalizeBrowseWidget, setWidgets, extractValuesFromLayout, setValues, setSelectedId]
  );

  const layoutDefaultName = useCallback(
    (index) => t?.("production.layouts.defaultName", { index }) || `Layout ${index}`,
    [t]
  );

  const normalizeLayoutName = useCallback(
    (name, fallback) => {
      const trimmed = String(name || "").trim().slice(0, maxLayoutNameLen);
      if (trimmed) return trimmed;
      if (fallback !== undefined) return fallback;
      return layoutDefaultName(1);
    },
    [maxLayoutNameLen, layoutDefaultName]
  );

  return {
    applyLayout,
    layoutDefaultName,
    normalizeLayoutName,
  };
}

export { useProductionLayoutNaming };
