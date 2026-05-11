import { useCallback } from "react";

function useProductionLayoutRename({
  activeId = "",
  activeName = "",
  t = null,
  showInfo = null,
  saveLayout = null,
  reportLayoutError = null,
  normalizeLayoutName = (value) => value,
  isDuplicateLayoutName = () => false,
  setLayouts = null,
  setEditingLayoutId = null,
  setLayoutNameDraft = null,
} = {}) {
  const handleRenameLayout = useCallback(
    async (layoutId, name) => {
      if (!layoutId) return;
      const nextName = normalizeLayoutName(name, "");
      if (!nextName) {
        setEditingLayoutId?.("");
        setLayoutNameDraft?.("");
        return;
      }
      if (isDuplicateLayoutName(nextName, layoutId)) {
        showInfo?.(t?.("production.layouts.duplicateName"), "error");
        return;
      }

      setLayouts?.((prev) =>
        prev.map((layout) => (layout.id === layoutId ? { ...layout, name: nextName } : layout))
      );
      setEditingLayoutId?.("");
      setLayoutNameDraft?.("");

      const projectKey = String(activeId || activeName || "").trim();
      if (!projectKey) return;
      try {
        if (typeof saveLayout === "function") {
          await saveLayout(projectKey, null, { action: "rename", layoutId, name: nextName });
        }
      } catch (error) {
        reportLayoutError?.("rename-layout", error);
      }
    },
    [
      normalizeLayoutName,
      setEditingLayoutId,
      setLayoutNameDraft,
      isDuplicateLayoutName,
      showInfo,
      t,
      setLayouts,
      activeId,
      activeName,
      saveLayout,
      reportLayoutError,
    ]
  );

  return {
    handleRenameLayout,
  };
}

export { useProductionLayoutRename };
export default useProductionLayoutRename;
