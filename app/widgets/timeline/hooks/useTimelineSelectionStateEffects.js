import { useEffect } from 'react';
import { sameKey } from '../helpers/selectionHelpers';

export function useTimelineSelectionStateEffects({
  trackEntries,
  selectedTrackId,
  selectedTrack,
  selectedKey,
  selectedChannelId,
  multiSelection,
  setSelectedTrackId,
  setSelectedKey,
  setSelectedChannelId,
  setMultiSelection,
}) {
  useEffect(() => {
    if (!selectedTrackId) return;
    const exists = trackEntries.some((entry) => entry.track.widgetId === selectedTrackId);
    if (!exists) {
      setSelectedTrackId(trackEntries?.[0]?.track?.widgetId || '');
      setSelectedKey(null);
    }
  }, [selectedTrackId, setSelectedKey, setSelectedTrackId, trackEntries]);

  useEffect(() => {
    if (!selectedTrack || selectedTrack.meta.kind !== 'multi') {
      if (selectedChannelId) setSelectedChannelId('');
      return;
    }

    const channelIds = Array.isArray(selectedTrack.meta.channels)
      ? selectedTrack.meta.channels.map((channel) => channel.id)
      : [];
    if (!channelIds.length) return;

    const preferred =
      selectedKey?.channelId && channelIds.includes(selectedKey.channelId)
        ? selectedKey.channelId
        : selectedChannelId;
    const next = channelIds.includes(preferred) ? preferred : channelIds[0];
    if (next !== selectedChannelId) setSelectedChannelId(next);
  }, [selectedChannelId, selectedKey, selectedTrack, setSelectedChannelId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setSelectedKey(null);
      setMultiSelection([]);
      setSelectedTrackId('');
      setSelectedChannelId('');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setMultiSelection, setSelectedChannelId, setSelectedKey, setSelectedTrackId]);

  useEffect(() => {
    if (!selectedKey) return;
    const exists = multiSelection.some((item) => sameKey(item, selectedKey));
    if (!exists) {
      setMultiSelection([selectedKey]);
    }
  }, [multiSelection, selectedKey, setMultiSelection]);
}
