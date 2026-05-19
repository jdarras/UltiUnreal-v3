import { useCallback } from "react";

function slugifyFilename(name = "") {
  const base = String(name || "layout")
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || "layout";
}

function decodeDataUrlToText(dataUrl = "") {
  const parts = String(dataUrl || "").split(",");
  if (parts.length < 2) return "";
  const base64 = parts.slice(1).join(",");
  try {
    return atob(base64);
  } catch {
    return "";
  }
}

function useProductionLayoutTransfer({
  activeLayoutId = "",
  activeId = "",
  activeName = "",
  activeLayout = null,
  widgets = [],
  values = {},
  hosts = [],
  normalizeLayoutColor = (value) => value,
  normalizeLayoutName = (value) => value,
  layoutDefaultName = () => "Layout 1",
  makeUniqueName = (value) => value,
  requestConfirm = null,
  showInfo = null,
  t = null,
  setWidgets = null,
  setValues = null,
  setSelectedId = null,
  setLayouts = null,
  setExportImportBusy = null,
  normalizeBrowseWidget = (value) => value,
  extractValuesFromLayout = () => ({}),
  buildLayoutWithValues = () => [],
  layoutSaveTimeoutMs = 0,
  saveLayout = null,
  lastSavedLayoutRef = null,
  updateLayoutInState = null,
  reportLayoutError = null,
} = {}) {
  const handleExportLayout = useCallback(async () => {
    if (!activeLayoutId) return;
    const snapshot = buildLayoutWithValues(widgets, values, hosts);
    const payload = {
      name: activeLayout?.name || "",
      color: normalizeLayoutColor(activeLayout?.color),
      isStart: !!activeLayout?.isStart,
      layout: snapshot || [],
    };
    const content = JSON.stringify(payload, null, 2);
    const defaultName = `${slugifyFilename(activeLayout?.name)}.json`;

    if (window.electron?.exportFile) {
      await window.electron.exportFile({
        defaultName,
        content,
        filters: [{ name: "Layout JSON", extensions: ["json"] }],
      });
      return;
    }

    // Browser fallback.
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = defaultName;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [
    activeLayoutId,
    buildLayoutWithValues,
    widgets,
    values,
    hosts,
    activeLayout,
    normalizeLayoutColor,
  ]);

  const handleImportLayout = useCallback(async () => {
    if (!activeLayoutId) return;
    const projectKey = String(activeId || activeName || "").trim();
    if (!projectKey) return;

    if (typeof window.electron?.chooseFile !== "function") {
      showInfo?.(t?.("production.layout.importError"), "error");
      return;
    }

    const filePath = await window.electron.chooseFile({
      title: t?.("production.layout.importTitle"),
      filters: [{ name: "Layout JSON", extensions: ["json"] }],
    });
    if (!filePath) return;

    let text = "";
    if (typeof window.electron?.readFileText === "function") {
      text = (await window.electron.readFileText(filePath)) || "";
    }
    if (!text && typeof window.electron?.readFileAsDataUrl === "function") {
      try {
        const dataUrl = await window.electron.readFileAsDataUrl(filePath);
        text = decodeDataUrlToText(dataUrl);
      } catch {}
    }
    if (!text) {
      showInfo?.(t?.("production.layout.importError"), "error");
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      showInfo?.(t?.("production.layout.importErrorParse"), "error");
      return;
    }

    if (!Array.isArray(data?.layout)) {
      showInfo?.(t?.("production.layout.importErrorFormat"), "error");
      return;
    }

    const confirmMsg = t?.("production.layout.importConfirm");
    if (typeof requestConfirm === "function") {
      const ok = await requestConfirm(confirmMsg);
      if (!ok) return;
    }

    const nextLayoutArr = data.layout.map(normalizeBrowseWidget);
    const nextValues = extractValuesFromLayout(nextLayoutArr);

    const nextName = normalizeLayoutName(data.name, activeLayout?.name || layoutDefaultName(1));
    const uniqueName = makeUniqueName(nextName);
    const nextColor = normalizeLayoutColor(data.color);

    setWidgets?.(nextLayoutArr);
    setValues?.(nextValues);
    setSelectedId?.(null);

    setLayouts?.((prev) =>
      prev.map((layout) =>
        layout.id === activeLayoutId
          ? {
              ...layout,
              name: uniqueName,
              color: nextColor,
              isStart: false,
              layout: nextLayoutArr,
            }
          : layout
      )
    );

    const snapshot = buildLayoutWithValues(nextLayoutArr, nextValues, hosts);
    const serialized = JSON.stringify(snapshot || []);
    setExportImportBusy?.(true);
    try {
      if (typeof saveLayout === "function") {
        await saveLayout(
          projectKey,
          snapshot,
          {
            layoutId: activeLayoutId,
            name: uniqueName,
            color: nextColor,
            isStart: false,
          },
          layoutSaveTimeoutMs
        );
      }
      if (lastSavedLayoutRef?.current) {
        lastSavedLayoutRef.current[`${projectKey}::${activeLayoutId}`] = serialized;
      }
      if (typeof updateLayoutInState === "function") {
        updateLayoutInState(activeLayoutId, snapshot);
      }
    } catch (error) {
      if (typeof reportLayoutError === "function") {
        reportLayoutError("import-layout", error);
      }
    } finally {
      setExportImportBusy?.(false);
    }
  }, [
    activeLayoutId,
    activeId,
    activeName,
    showInfo,
    t,
    requestConfirm,
    normalizeBrowseWidget,
    extractValuesFromLayout,
    normalizeLayoutName,
    activeLayout,
    layoutDefaultName,
    makeUniqueName,
    normalizeLayoutColor,
    setWidgets,
    setValues,
    setSelectedId,
    setLayouts,
    buildLayoutWithValues,
    hosts,
    setExportImportBusy,
    layoutSaveTimeoutMs,
    saveLayout,
    lastSavedLayoutRef,
    updateLayoutInState,
    reportLayoutError,
  ]);

  return {
    handleExportLayout,
    handleImportLayout,
  };
}

export { useProductionLayoutTransfer };
