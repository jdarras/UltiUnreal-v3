import { useEffect } from "react";

function useProductionLayoutAutoSave({
  activeId = "",
  activeName = "",
  activeLayoutId = "",
  widgets = [],
  values = {},
  hosts = [],
  layoutReady = false,
  layoutSaveTimeoutMs = 0,
  buildLayoutWithValues = () => [],
  saveLayout = null,
  lastSavedLayoutRef = null,
  updateLayoutInState = null,
  reportLayoutError = null,
} = {}) {
  useEffect(() => {
    const projectKey = String(activeId || activeName || "").trim();
    if (!projectKey || !activeLayoutId || !layoutReady) return;

    const toSave = buildLayoutWithValues(widgets, values, hosts);
    const serialized = JSON.stringify(toSave || []);

    if (!lastSavedLayoutRef) return;
    if (!lastSavedLayoutRef.current) lastSavedLayoutRef.current = {};
    const key = `${projectKey}::${activeLayoutId}`;

    if (lastSavedLayoutRef.current[key] === serialized) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      (async () => {
        try {
          if (typeof saveLayout === "function") {
            await saveLayout(
              projectKey,
              toSave,
              { layoutId: activeLayoutId },
              layoutSaveTimeoutMs
            );
          }
          if (!cancelled) {
            lastSavedLayoutRef.current[key] = serialized;
            updateLayoutInState?.(activeLayoutId, toSave);
          }
        } catch (error) {
          reportLayoutError?.("auto-save", error);
        }
      })();
    }, 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    activeName,
    activeId,
    activeLayoutId,
    widgets,
    values,
    layoutReady,
    buildLayoutWithValues,
    hosts,
    lastSavedLayoutRef,
    layoutSaveTimeoutMs,
    saveLayout,
    updateLayoutInState,
    reportLayoutError,
  ]);
}

export { useProductionLayoutAutoSave };
