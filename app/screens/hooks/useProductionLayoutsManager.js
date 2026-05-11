import { useCallback } from "react";

function useProductionLayoutsManager({
  editMode = false,
  maxLayouts = 10,
  activeId = "",
  activeName = "",
  activeLayoutId = "",
  layouts = [],
  layoutsRef = null,
  widgets = [],
  values = {},
  hosts = [],
  layoutSaveTimeoutMs = 0,
  t = null,
  showInfo = null,
  saveLayout = null,
  lastSavedLayoutRef = null,
  setLayouts = null,
  setActiveLayoutId = null,
  buildLayoutWithValues = () => [],
  updateLayoutInState = null,
  reportLayoutError = null,
  applyLayout = () => ({}),
  normalizeLayoutList = (value) => value,
  resolveActiveLayoutId = () => "",
  layoutDefaultName = () => "Layout 1",
  makeUniqueName = (value) => value,
} = {}) {
  const flushActiveLayout = useCallback(async () => {
    const projectKey = String(activeId || activeName || "").trim();
    if (!projectKey || !activeLayoutId) return;

    const layoutMeta =
      layoutsRef?.current?.find((layout) => layout?.id === activeLayoutId) ||
      layouts.find((layout) => layout?.id === activeLayoutId) ||
      null;

    const snapshot = buildLayoutWithValues(widgets, values, hosts);
    const serialized = JSON.stringify(snapshot || []);
    const key = `${projectKey}::${activeLayoutId}`;
    if (lastSavedLayoutRef?.current?.[key] === serialized) return;

    try {
      if (typeof saveLayout === "function") {
        await saveLayout(
          projectKey,
          snapshot,
          { layoutId: activeLayoutId, isStart: !!layoutMeta?.isStart },
          layoutSaveTimeoutMs
        );
      }
      if (lastSavedLayoutRef?.current) {
        lastSavedLayoutRef.current[key] = serialized;
      }
      if (typeof updateLayoutInState === "function") {
        updateLayoutInState(activeLayoutId, snapshot);
      }
    } catch (error) {
      if (typeof reportLayoutError === "function") {
        reportLayoutError("flush-active-layout", error);
      }
    }
  }, [
    activeId,
    activeName,
    activeLayoutId,
    layoutsRef,
    layouts,
    buildLayoutWithValues,
    widgets,
    values,
    hosts,
    lastSavedLayoutRef,
    layoutSaveTimeoutMs,
    saveLayout,
    updateLayoutInState,
    reportLayoutError,
  ]);

  const applyLayoutResponse = useCallback((data, projectKeyOverride = "") => {
    const projectKey = String(projectKeyOverride || activeId || activeName || "").trim();
    const normalizedLayouts = normalizeLayoutList(data?.layouts || []);
    if (!Array.isArray(normalizedLayouts) || normalizedLayouts.length === 0) return;

    const nextActiveId = resolveActiveLayoutId(
      data?.activeLayoutId || data?.layoutId,
      normalizedLayouts
    );
    const activeLayout =
      normalizedLayouts.find((layout) => layout.id === nextActiveId) ||
      normalizedLayouts[0];

    setLayouts?.(normalizedLayouts);
    setActiveLayoutId?.(nextActiveId);

    const initialValues = applyLayout(activeLayout?.layout || []);
    if (projectKey && nextActiveId && lastSavedLayoutRef?.current) {
      const serialized = JSON.stringify(
        buildLayoutWithValues(activeLayout?.layout || [], initialValues, hosts)
      );
      lastSavedLayoutRef.current[`${projectKey}::${nextActiveId}`] = serialized;
    }
  }, [
    activeId,
    activeName,
    normalizeLayoutList,
    resolveActiveLayoutId,
    setLayouts,
    setActiveLayoutId,
    applyLayout,
    lastSavedLayoutRef,
    buildLayoutWithValues,
    hosts,
  ]);

  const handleSelectLayout = useCallback(async (nextId) => {
    const projectKey = String(activeId || activeName || "").trim();
    if (!nextId || nextId === activeLayoutId) return;
    const prevId = activeLayoutId;
    const prevLayoutMeta =
      layoutsRef?.current?.find((layout) => layout?.id === prevId) ||
      layouts.find((layout) => layout?.id === prevId) ||
      null;
    const snapshot = buildLayoutWithValues(widgets, values, hosts);
    const serialized = JSON.stringify(snapshot || []);
    const prevKey = `${projectKey}::${prevId}`;

    if (projectKey && prevId && lastSavedLayoutRef?.current) {
      if (lastSavedLayoutRef.current[prevKey] !== serialized) {
        lastSavedLayoutRef.current[prevKey] = serialized;
        updateLayoutInState?.(prevId, snapshot);
        saveLayout?.(projectKey, snapshot, {
          layoutId: prevId,
          isStart: !!prevLayoutMeta?.isStart,
        }).catch((error) => {
          const msg = error?.message || t?.("production.msg.layoutSaveFailed");
          showInfo?.(`${t?.("production.msg.layoutSaveFailed")}: ${msg}`);
        });
      }
    }

    const list = layoutsRef?.current || [];
    const nextLayout = list.find((layout) => layout.id === nextId);
    if (!nextLayout) return;

    setActiveLayoutId?.(nextId);
    const initialValues = applyLayout(nextLayout.layout || []);

    if (projectKey && lastSavedLayoutRef?.current) {
      const nextSerialized = JSON.stringify(
        buildLayoutWithValues(nextLayout.layout || [], initialValues, hosts)
      );
      lastSavedLayoutRef.current[`${projectKey}::${nextId}`] = nextSerialized;
      saveLayout?.(projectKey, null, { action: "set-active", layoutId: nextId }).catch((error) => {
        const msg = error?.message || t?.("production.msg.layoutSaveFailed");
        showInfo?.(`${t?.("production.msg.layoutSaveFailed")}: ${msg}`);
      });
    }
  }, [
    activeId,
    activeName,
    activeLayoutId,
    layoutsRef,
    layouts,
    buildLayoutWithValues,
    widgets,
    values,
    hosts,
    lastSavedLayoutRef,
    updateLayoutInState,
    saveLayout,
    t,
    showInfo,
    setActiveLayoutId,
    applyLayout,
  ]);

  const handleAddLayout = useCallback(async () => {
    if (!editMode) return;
    if ((layoutsRef?.current?.length || 0) >= maxLayouts) {
      showInfo?.(t?.("production.layouts.maxReached", { max: maxLayouts }));
      return;
    }
    const projectKey = String(activeId || activeName || "").trim();
    if (!projectKey) return;
    await flushActiveLayout();
    const baseName = layoutDefaultName((layoutsRef?.current?.length || 0) + 1);
    const name = makeUniqueName(baseName);
    try {
      const res = await saveLayout?.(projectKey, null, { action: "add", name });
      if (res && res.ok !== false) {
        applyLayoutResponse(res, projectKey);
      }
    } catch (error) {
      showInfo?.(error?.message || t?.("production.msg.layoutSaveFailed"));
    }
  }, [
    editMode,
    layoutsRef,
    maxLayouts,
    showInfo,
    t,
    activeId,
    activeName,
    flushActiveLayout,
    layoutDefaultName,
    makeUniqueName,
    saveLayout,
    applyLayoutResponse,
  ]);

  const handleDuplicateLayout = useCallback(async (layoutId) => {
    if (!editMode || !layoutId) return;
    if ((layoutsRef?.current?.length || 0) >= maxLayouts) {
      showInfo?.(t?.("production.layouts.maxReached", { max: maxLayouts }));
      return;
    }
    const projectKey = String(activeId || activeName || "").trim();
    if (!projectKey) return;
    await flushActiveLayout();
    try {
      const src = layoutsRef?.current?.find((layout) => layout.id === layoutId);
      const cloneName = src
        ? makeUniqueName(src.name || layoutDefaultName((layoutsRef?.current?.length || 0) + 1))
        : undefined;
      const res = await saveLayout?.(projectKey, null, {
        action: "duplicate",
        layoutId,
        name: cloneName,
      });
      if (res && res.ok !== false) {
        applyLayoutResponse(res, projectKey);
      }
    } catch (error) {
      showInfo?.(error?.message || t?.("production.msg.layoutSaveFailed"));
    }
  }, [
    editMode,
    layoutsRef,
    maxLayouts,
    showInfo,
    t,
    activeId,
    activeName,
    flushActiveLayout,
    makeUniqueName,
    layoutDefaultName,
    saveLayout,
    applyLayoutResponse,
  ]);

  const handleDeleteLayout = useCallback(async (layoutId) => {
    if (!editMode || !layoutId) return;
    if ((layoutsRef?.current?.length || 0) <= 1) {
      showInfo?.(t?.("production.layouts.minRequired"));
      return;
    }
    const projectKey = String(activeId || activeName || "").trim();
    if (!projectKey) return;
    await flushActiveLayout();
    try {
      const res = await saveLayout?.(projectKey, null, { action: "delete", layoutId });
      if (res && res.ok !== false) {
        applyLayoutResponse(res, projectKey);
      }
    } catch (error) {
      reportLayoutError?.("delete-layout", error);
    }
  }, [
    editMode,
    layoutsRef,
    showInfo,
    t,
    activeId,
    activeName,
    flushActiveLayout,
    saveLayout,
    applyLayoutResponse,
    reportLayoutError,
  ]);

  const handleReorderLayouts = useCallback(async (fromIdx, toIdx) => {
    if (!editMode) return;
    const list = layoutsRef?.current || [];
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const next = list.slice();
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setLayouts?.(next);
    const projectKey = String(activeId || activeName || "").trim();
    if (!projectKey) return;
    try {
      await saveLayout?.(projectKey, null, { action: "reorder", order: next.map((layout) => layout.id) });
    } catch (error) {
      reportLayoutError?.("reorder-layouts", error);
    }
  }, [editMode, layoutsRef, setLayouts, activeId, activeName, saveLayout, reportLayoutError]);

  return {
    handleSelectLayout,
    handleAddLayout,
    handleDuplicateLayout,
    handleDeleteLayout,
    handleReorderLayouts,
  };
}

export { useProductionLayoutsManager };
export default useProductionLayoutsManager;
