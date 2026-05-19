import { useEffect } from "react";

function useProductionLayoutValueSync({
  activeId = "",
  activeName = "",
  activeLayoutId = "",
  layoutReady = false,
  commonRefreshSec = 3,
  aliveRef = null,
  widgetsRef = null,
  getLayout = async () => ({}),
  extractValuesFromLayout = () => ({}),
  isEqualWidgetValue = () => false,
  setValues = null,
} = {}) {
  useEffect(() => {
    const projectKey = String(activeId || activeName || "").trim();
    if (!projectKey || !activeLayoutId || !layoutReady) return undefined;

    let cancelled = false;
    let timer = null;
    const pollMs = Math.max(1000, Number(commonRefreshSec || 3) * 1000);
    const isDocumentHidden = () =>
      typeof document !== "undefined" && document.hidden;

    const pickActiveLayoutArray = (payload) => {
      const allLayouts = Array.isArray(payload?.layouts) ? payload.layouts : [];
      if (!allLayouts.length) {
        return Array.isArray(payload?.layout) ? payload.layout : [];
      }

      const desiredId = String(activeLayoutId || "").trim();
      const remoteActiveId = String(
        payload?.activeLayoutId || payload?.layoutId || ""
      ).trim();
      const byDesiredId = allLayouts.find(
        (layout) => String(layout?.id || "").trim() === desiredId
      );
      const byRemoteActiveId = allLayouts.find(
        (layout) => String(layout?.id || "").trim() === remoteActiveId
      );
      const selected = byDesiredId || byRemoteActiveId || allLayouts[0];
      return Array.isArray(selected?.layout) ? selected.layout : [];
    };

    const syncValues = async () => {
      if (cancelled || (aliveRef && !aliveRef.current)) return;
      if (isDocumentHidden()) return;
      try {
        const payload = await getLayout(projectKey);
        if (cancelled || (aliveRef && !aliveRef.current)) return;

        const remoteLayout = pickActiveLayoutArray(payload);
        const remoteValues = extractValuesFromLayout(remoteLayout);
        const currentWidgets = Array.isArray(widgetsRef?.current)
          ? widgetsRef.current
          : [];
        const widgetById = new Map(
          currentWidgets
            .map((widget) => [String(widget?.id || "").trim(), widget])
            .filter(([id]) => !!id)
        );
        const widgetIds = new Set(
          currentWidgets
            .map((widget) => String(widget?.id || "").trim())
            .filter(Boolean)
        );

        if (!widgetIds.size) return;

        setValues?.((prev) => {
          const base = prev && typeof prev === "object" ? prev : {};
          let changed = false;
          const next = { ...base };

          widgetIds.forEach((id) => {
            if (!Object.prototype.hasOwnProperty.call(remoteValues, id)) return;
            const incoming = remoteValues[id];
            const widget = widgetById.get(id) || null;
            if (isEqualWidgetValue(widget, base[id], incoming)) return;
            next[id] = incoming;
            changed = true;
          });

          return changed ? next : base;
        });
      } catch {
        // Ignore polling errors.
      }
    };

    const schedule = () => {
      if (cancelled || (aliveRef && !aliveRef.current)) return;
      timer = setTimeout(async () => {
        if (!isDocumentHidden()) {
          await syncValues();
        }
        schedule();
      }, pollMs);
    };

    const handleVisibilityChange = () => {
      if (cancelled || (aliveRef && !aliveRef.current)) return;
      if (!isDocumentHidden()) {
        syncValues();
      }
    };

    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    syncValues();
    schedule();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (typeof document !== "undefined" && document.removeEventListener) {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [
    activeId,
    activeName,
    activeLayoutId,
    layoutReady,
    commonRefreshSec,
    aliveRef,
    widgetsRef,
    getLayout,
    extractValuesFromLayout,
    isEqualWidgetValue,
    setValues,
  ]);
}

export { useProductionLayoutValueSync };
