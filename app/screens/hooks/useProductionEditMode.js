import { useEffect, useState } from 'react';

const DEFAULT_STORAGE_KEY = 'uu_production_edit_mode';

export function useProductionEditMode({ canManageLayouts = true, storageKey = DEFAULT_STORAGE_KEY }) {
  const [editMode, setEditMode] = useState(() => {
    if (canManageLayouts !== true) return false;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, editMode ? 'true' : 'false');
    } catch {}
  }, [editMode, storageKey]);

  useEffect(() => {
    if (canManageLayouts !== true && editMode) {
      setEditMode(false);
    }
  }, [canManageLayouts, editMode]);

  return { editMode, setEditMode };
}
