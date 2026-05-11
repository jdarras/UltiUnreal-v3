import { useCallback } from "react";

function useProductionWidgetUpdate({
  selectedId = null,
  setWidgets = null,
} = {}) {
  const updateSelected = useCallback(
    (updates) => {
      if (!selectedId) return;
      setWidgets?.((prev) => {
        let changed = false;
        const next = prev.map((widget) => {
          if (widget.id !== selectedId) return widget;
          changed = true;
          return { ...widget, ...updates };
        });
        return changed ? next : prev;
      });
    },
    [selectedId, setWidgets]
  );

  const updateBinding = useCallback(
    (updates) => {
      if (!selectedId) return;
      setWidgets?.((prev) => {
        let changed = false;
        const next = prev.map((widget) => {
          if (widget.id !== selectedId) return widget;
          changed = true;

          const nextBinding = { ...(widget.binding || {}), ...updates };
          const hasDisplayNamePatch =
            updates &&
            typeof updates === "object" &&
            Object.prototype.hasOwnProperty.call(updates, "displayName");

          if (widget.type === "button" && hasDisplayNamePatch) {
            nextBinding.argDefaults = {};
            nextBinding.argValues = {};
          }

          return { ...widget, binding: nextBinding };
        });
        return changed ? next : prev;
      });
    },
    [selectedId, setWidgets]
  );

  const updateWidgetById = useCallback(
    (id, updates) => {
      if (!id) return;
      setWidgets?.((prev) => {
        let changed = false;
        const next = prev.map((widget) => {
          if (widget.id !== id) return widget;
          changed = true;
          return { ...widget, ...updates };
        });
        return changed ? next : prev;
      });
    },
    [setWidgets]
  );

  return {
    updateSelected,
    updateBinding,
    updateWidgetById,
  };
}

export { useProductionWidgetUpdate };
export default useProductionWidgetUpdate;
