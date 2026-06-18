import { useEffect } from 'react';

function isEditableTarget(target) {
  return !!(
    target &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable)
  );
}

function isInsideEditor(root, target, activeElement, editorActiveRef) {
  if (!root) return true;
  return (
    root.contains(target) ||
    (activeElement && root.contains(activeElement)) ||
    !!editorActiveRef?.current
  );
}

export function useTimelineDeleteKeyHandler({
  editorRootRef,
  editorActiveRef,
  multiSelection,
  hasSelectedKeyframe,
  onDeleteMultiSelection,
  onDeleteSelectedKeyframe,
}) {
  useEffect(() => {
    const handleKeyDown = (evt) => {
      if (evt.key !== 'Delete') return;
      const target = evt.target;
      if (isEditableTarget(target)) return;

      const root = editorRootRef?.current;
      const activeElement = document.activeElement;
      if (!isInsideEditor(root, target, activeElement, editorActiveRef)) return;

      evt.preventDefault();
      if (Array.isArray(multiSelection) && multiSelection.length > 1) {
        onDeleteMultiSelection?.();
      } else if (hasSelectedKeyframe) {
        onDeleteSelectedKeyframe?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editorActiveRef,
    editorRootRef,
    hasSelectedKeyframe,
    multiSelection,
    onDeleteMultiSelection,
    onDeleteSelectedKeyframe,
  ]);
}
