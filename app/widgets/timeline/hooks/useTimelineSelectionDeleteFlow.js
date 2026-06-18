import { useCallback } from 'react';
import { deleteSelectedKeyframesFromTrack } from '../helpers/selectionHelpers';
import { useTimelineDeleteKeyHandler } from './useTimelineDeleteKeyHandler';

export function useTimelineSelectionDeleteFlow({
  editorRootRef,
  editorActiveRef,
  multiSelection,
  selectedKeyframe,
  updateTrack,
  setSelectedKey,
  setMultiSelection,
  onDeleteSelectedKeyframe,
}) {
  const handleDeleteMultiSelection = useCallback(() => {
    const trackId = multiSelection?.[0]?.trackId;
    if (trackId) {
      updateTrack(trackId, (track) =>
        deleteSelectedKeyframesFromTrack(track, multiSelection)
      );
    }
    setSelectedKey(null);
    setMultiSelection([]);
  }, [multiSelection, setMultiSelection, setSelectedKey, updateTrack]);

  useTimelineDeleteKeyHandler({
    editorRootRef,
    editorActiveRef,
    multiSelection,
    hasSelectedKeyframe: !!selectedKeyframe,
    onDeleteMultiSelection: handleDeleteMultiSelection,
    onDeleteSelectedKeyframe,
  });
}
