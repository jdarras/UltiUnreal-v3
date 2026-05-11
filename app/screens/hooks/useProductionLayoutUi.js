import { useCallback, useEffect } from "react";

function useProductionLayoutUi({
  editingLayoutId = "",
  layoutNameInputRef = null,
  setWidgets = null,
  setSelectedId = null,
} = {}) {
  useEffect(() => {
    if (!editingLayoutId) return;
    const el = layoutNameInputRef?.current;
    if (el && typeof el.focus === "function") {
      el.focus();
      el.select?.();
    }
  }, [editingLayoutId, layoutNameInputRef]);

  const removeWidget = useCallback(
    (id) => {
      if (!id) return;
      setWidgets?.((prev) => {
        const next = prev.filter((widget) => widget.id !== id);
        return next.length === prev.length ? prev : next;
      });
      setSelectedId?.((prev) => (prev === id ? null : prev));
    },
    [setWidgets, setSelectedId]
  );

  return {
    removeWidget,
  };
}

export { useProductionLayoutUi };
export default useProductionLayoutUi;
