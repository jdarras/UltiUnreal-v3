import { useEffect } from 'react';

export function useTimelinePointerUiEffects({
  showAddMenu,
  addMenuRef,
  editorRootRef,
  editorActiveRef,
  setShowAddMenu,
}) {
  useEffect(() => {
    if (!showAddMenu) return undefined;
    const handlePointerDown = (evt) => {
      if (!addMenuRef.current) return;
      if (addMenuRef.current.contains(evt.target)) return;
      setShowAddMenu(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [addMenuRef, setShowAddMenu, showAddMenu]);

  useEffect(() => {
    const handlePointerDown = (evt) => {
      const root = editorRootRef.current;
      if (!root) return;
      editorActiveRef.current = root.contains(evt.target);
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [editorActiveRef, editorRootRef]);
}
