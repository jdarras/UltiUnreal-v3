import { useCallback, useState, useEffect } from 'react';

/**
 * Small helper to reorder tracks via drag handles.
 */
export function useTrackReorder({ layoutEntries: _layoutEntries, moveTrack }) {
  const [reorderTrackId, setReorderTrackId] = useState('');

  const handleReorderStart = useCallback(
    (trackId) => (evt) => {
      evt.stopPropagation();
      setReorderTrackId(trackId);
      if (evt.dataTransfer) {
        evt.dataTransfer.effectAllowed = 'move';
        evt.dataTransfer.setData('text/plain', trackId);
      }
    },
    []
  );

  const handleReorderOver = useCallback(
    (idx) => (evt) => {
      if (!reorderTrackId) return;
      evt.preventDefault();
      moveTrack(reorderTrackId, idx);
    },
    [reorderTrackId, moveTrack]
  );

  const handleReorderEnd = useCallback(() => {
    setReorderTrackId('');
  }, []);

  useEffect(() => {
    return () => setReorderTrackId('');
  }, []);

  return {
    reorderTrackId,
    handleReorderStart,
    handleReorderOver,
    handleReorderEnd
  };
}
