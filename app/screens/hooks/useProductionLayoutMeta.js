import { useCallback } from "react";

function useProductionLayoutMeta({
  activeLayoutId = "",
  activeId = "",
  activeName = "",
  activeLayout = null,
  widgets = [],
  values = {},
  hosts = [],
  layouts = [],
  layoutSaveTimeoutMs = 0,
  t = null,
  requestConfirm = null,
  showInfo = null,
  setWidgets = null,
  setLayouts = null,
  setStartLayoutToggleBusy = null,
  saveLayout = null,
  lastSavedLayoutRef = null,
  reportLayoutError = null,
  buildLayoutWithValues = () => [],
  normalizeLayoutName = (value, fallback) => fallback ?? value,
  layoutDefaultName = () => "Layout 1",
  normalizeLayoutColor = (value) => value,
  isDuplicateLayoutName = () => false,
} = {}) {
  const handleUpdateLayoutMeta = useCallback(
    async (changes = {}) => {
      if (!activeLayoutId) return;
      const projectKey = String(activeId || activeName || "").trim();
      if (!projectKey) return;

      const isStartRequested = Object.prototype.hasOwnProperty.call(changes, "isStart")
        ? !!changes.isStart
        : undefined;

      // Si on passe en Start, on doit desactiver le live des widgets
      if (isStartRequested === true) {
        const hasLive = widgets.some((widget) => widget?.ui?.live === true);
        if (hasLive) {
          const confirmMsg = t?.("production.startLayout.disableLiveConfirm") || "";
          const ok = typeof requestConfirm === "function" ? await requestConfirm(confirmMsg) : true;
          if (!ok) return;
          const nextWidgets = widgets.map((widget) => ({
            ...widget,
            ui: { ...(widget.ui || {}), live: false },
          }));
          setWidgets?.(nextWidgets);

          // On force la sauvegarde pour enregistrer l'etat non-live
          const snapshot = buildLayoutWithValues(nextWidgets, values, hosts);
          const serialized = JSON.stringify(snapshot || []);
          try {
            if (typeof saveLayout === "function") {
              await saveLayout(
                projectKey,
                snapshot,
                { layoutId: activeLayoutId },
                layoutSaveTimeoutMs
              );
            }
            if (lastSavedLayoutRef?.current) {
              lastSavedLayoutRef.current[`${projectKey}::${activeLayoutId}`] = serialized;
            }
          } catch (error) {
            reportLayoutError?.("update-meta-live-off", error);
          }
        }
      }

      if (Object.prototype.hasOwnProperty.call(changes, "name")) {
        const nextName = normalizeLayoutName(
          changes.name,
          activeLayout?.name || layoutDefaultName(1)
        );
        if (isDuplicateLayoutName(nextName, activeLayoutId)) {
          showInfo?.(t?.("production.layouts.duplicateName"), "error");
          return;
        }
      }

      const nextLayouts = layouts.map((layout) => {
        if (layout.id !== activeLayoutId) {
          if (isStartRequested === true) return { ...layout, isStart: false };
          return layout;
        }
        return {
          ...layout,
          name: Object.prototype.hasOwnProperty.call(changes, "name") ? changes.name : layout.name,
          color: Object.prototype.hasOwnProperty.call(changes, "color")
            ? normalizeLayoutColor(changes.color)
            : layout.color,
          isStart: Object.prototype.hasOwnProperty.call(changes, "isStart")
            ? !!changes.isStart
            : layout.isStart,
        };
      });
      setLayouts?.(nextLayouts);

      const hasStartChange = Object.prototype.hasOwnProperty.call(changes, "isStart");
      const isStartValue = hasStartChange ? !!changes.isStart : undefined;
      const otherStartLayouts =
        hasStartChange && isStartValue
          ? layouts.filter((layout) => layout?.isStart && layout.id !== activeLayoutId).map((layout) => layout.id)
          : [];

      // Si on touche au Start, on renvoie le layout courant pour forcer l'ecriture immediate
      const layoutPayload = hasStartChange
        ? buildLayoutWithValues(widgets, values, hosts)
        : null;

      const payload = {
        layoutId: activeLayoutId,
        action: "update-meta",
      };
      if (Object.prototype.hasOwnProperty.call(changes, "name")) payload.name = String(changes.name || "");
      if (Object.prototype.hasOwnProperty.call(changes, "color")) payload.color = normalizeLayoutColor(changes.color);
      if (hasStartChange) payload.isStart = isStartValue;

      setStartLayoutToggleBusy?.(true);
      try {
        if (typeof saveLayout === "function") {
          await saveLayout(projectKey, layoutPayload, payload);
        }

        // Si on vient d'activer un Start, on desactive les autres existants cote agent.
        if (otherStartLayouts.length && typeof saveLayout === "function") {
          await Promise.all(
            otherStartLayouts.map((id) =>
              saveLayout(projectKey, null, { layoutId: id, action: "update-meta", isStart: false }).catch(() => {})
            )
          );
        }
      } finally {
        setStartLayoutToggleBusy?.(false);
      }
    },
    [
      activeLayoutId,
      activeId,
      activeName,
      activeLayout,
      widgets,
      values,
      hosts,
      layouts,
      layoutSaveTimeoutMs,
      t,
      requestConfirm,
      showInfo,
      setWidgets,
      setLayouts,
      setStartLayoutToggleBusy,
      saveLayout,
      lastSavedLayoutRef,
      reportLayoutError,
      buildLayoutWithValues,
      normalizeLayoutName,
      layoutDefaultName,
      normalizeLayoutColor,
      isDuplicateLayoutName,
    ]
  );

  return {
    handleUpdateLayoutMeta,
  };
}

export { useProductionLayoutMeta };
export default useProductionLayoutMeta;
