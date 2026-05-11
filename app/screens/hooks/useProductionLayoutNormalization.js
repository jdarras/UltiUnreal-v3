import { useCallback } from "react";

function useProductionLayoutNormalization({
  normalizeLayoutName = (value, fallback) => fallback ?? value,
  layoutDefaultName = (index) => `Layout ${index}`,
} = {}) {
  const normalizeLayoutList = useCallback(
    (raw = []) => {
      const list = Array.isArray(raw) ? raw : [];
      return list.map((layout, idx) => {
        const id = String(layout?.id || "").trim() || `layout-${idx + 1}`;
        const fallbackName = layoutDefaultName(idx + 1);
        const name = normalizeLayoutName(layout?.name, fallbackName);
        const layoutItems = Array.isArray(layout?.layout) ? layout.layout : [];
        const color = String(layout?.color || "#1F2937").trim() || "#1F2937";
        const isStart = !!layout?.isStart;
        return { id, name, layout: layoutItems, color, isStart };
      });
    },
    [normalizeLayoutName, layoutDefaultName]
  );

  const resolveActiveLayoutId = useCallback((rawId, list) => {
    const val = String(rawId || "").trim();
    if (val && list.some((layout) => layout.id === val)) return val;
    return list[0]?.id || "";
  }, []);

  return {
    normalizeLayoutList,
    resolveActiveLayoutId,
  };
}

export { useProductionLayoutNormalization };
export default useProductionLayoutNormalization;
