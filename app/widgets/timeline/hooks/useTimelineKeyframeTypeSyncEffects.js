import { useEffect } from 'react';

export function useTimelineKeyframeTypeSyncEffects({
  lockKeyframeTypes,
  keyframeType,
  applyKeyframeType,
  multiSelection,
  selectedKey,
  trackEntries,
  setKeyframeType,
}) {
  useEffect(() => {
    if (lockKeyframeTypes && keyframeType !== 'constant') {
      applyKeyframeType('constant');
    }
  }, [lockKeyframeTypes]); // keep deps minimal to avoid loops

  // Synchronise le selecteur d'interpolation avec le/les keyframes selectionnes.
  useEffect(() => {
    const pivot = multiSelection.length ? multiSelection[0] : selectedKey;
    if (!pivot) return;
    const track = trackEntries.find((t) => t.track.widgetId === pivot.trackId);
    if (!track) return;
    const getKf = () => {
      if (track.meta.kind === 'multi') {
        const list = track.channels?.[pivot.channelId] || [];
        return list[pivot.idx] || null;
      }
      const list = track.keyframes || [];
      return list[pivot.idx] || null;
    };
    const kf = getKf();
    if (!kf) return;
    setKeyframeType(kf.interp || 'linear');
  }, [multiSelection, selectedKey, setKeyframeType, trackEntries]);
}
