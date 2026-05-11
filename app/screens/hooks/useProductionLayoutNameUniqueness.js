import { useCallback } from "react";

function useProductionLayoutNameUniqueness({
  layouts = [],
  layoutDefaultName = (index) => `Layout ${index}`,
} = {}) {
  const isDuplicateLayoutName = useCallback(
    (name, ignoreId = "") => {
      const target = String(name || "").trim().toLowerCase();
      if (!target) return false;
      return layouts.some((layout) => {
        if (!layout) return false;
        if (ignoreId && layout.id === ignoreId) return false;
        const current = String(layout.name || "").trim().toLowerCase();
        return current === target;
      });
    },
    [layouts]
  );

  const makeUniqueName = useCallback(
    (base) => {
      const raw = String(base || "").trim() || layoutDefaultName(layouts.length + 1);
      if (!isDuplicateLayoutName(raw)) return raw;
      let idx = 2;
      let candidate = `${raw} (${idx})`;
      while (isDuplicateLayoutName(candidate)) {
        idx += 1;
        candidate = `${raw} (${idx})`;
      }
      return candidate;
    },
    [layoutDefaultName, layouts.length, isDuplicateLayoutName]
  );

  return {
    isDuplicateLayoutName,
    makeUniqueName,
  };
}

export { useProductionLayoutNameUniqueness };
export default useProductionLayoutNameUniqueness;
