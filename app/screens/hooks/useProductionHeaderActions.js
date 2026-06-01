import { useCallback } from 'react';

function useProductionHeaderActions({
  activeId = '',
  canManageLayouts = true,
  editMode = false,
  setEditMode = null,
  loadPreset = null,
} = {}) {
  const editActiveProject = useCallback(() => {
    const projectId = String(activeId || '').trim();
    if (!projectId) return;
    if (typeof window !== 'undefined' && window.goToProjectDetail) {
      window.goToProjectDetail(projectId);
    }
  }, [activeId]);

  const handleEnterEditMode = useCallback(() => {
    if (canManageLayouts !== true || editMode) return;
    setEditMode?.(true);
    loadPreset?.();
  }, [canManageLayouts, editMode, setEditMode, loadPreset]);

  const handleEnterLiveMode = useCallback(() => {
    if (!editMode) return;
    setEditMode?.(false);
  }, [editMode, setEditMode]);

  return {
    editActiveProject,
    handleEnterEditMode,
    handleEnterLiveMode,
  };
}

export { useProductionHeaderActions };
