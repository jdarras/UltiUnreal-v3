import { useCallback } from "react";

function useProductionLayoutStateUpdater({
  setLayouts = null,
  layoutsRef = null,
} = {}) {
  const updateLayoutInState = useCallback(
    (layoutId, nextLayoutArr) => {
      if (!layoutId || !Array.isArray(nextLayoutArr)) return;
      setLayouts?.((prev) =>
        prev.map((layout) =>
          layout.id === layoutId ? { ...layout, layout: nextLayoutArr } : layout
        )
      );
      if (layoutsRef) {
        layoutsRef.current = (layoutsRef.current || []).map((layout) =>
          layout && layout.id === layoutId
            ? { ...layout, layout: nextLayoutArr }
            : layout
        );
      }
    },
    [setLayouts, layoutsRef]
  );

  return {
    updateLayoutInState,
  };
}

export { useProductionLayoutStateUpdater };
