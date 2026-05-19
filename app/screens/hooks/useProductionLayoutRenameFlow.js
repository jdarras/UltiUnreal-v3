import { useCallback, useRef } from "react";

function useProductionLayoutRenameFlow({
  editMode = false,
  handleRenameLayout = null,
  setEditingLayoutId = null,
  setLayoutNameDraft = null,
} = {}) {
  const layoutRenameCancelRef = useRef(false);

  const beginLayoutRename = useCallback(
    (layout) => {
      if (!editMode || !layout?.id) return;
      layoutRenameCancelRef.current = false;
      setEditingLayoutId?.(layout.id);
      setLayoutNameDraft?.(String(layout.name || ""));
    },
    [editMode, setEditingLayoutId, setLayoutNameDraft]
  );

  const cancelLayoutRename = useCallback(() => {
    layoutRenameCancelRef.current = true;
    setEditingLayoutId?.("");
    setLayoutNameDraft?.("");
  }, [setEditingLayoutId, setLayoutNameDraft]);

  const commitLayoutRename = useCallback(
    (layoutId, draft) => {
      if (layoutRenameCancelRef.current) {
        layoutRenameCancelRef.current = false;
        return;
      }
      handleRenameLayout?.(layoutId, draft);
    },
    [handleRenameLayout]
  );

  return {
    beginLayoutRename,
    cancelLayoutRename,
    commitLayoutRename,
  };
}

export { useProductionLayoutRenameFlow };
