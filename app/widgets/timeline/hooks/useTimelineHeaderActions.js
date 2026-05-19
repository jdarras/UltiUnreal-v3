import { useCallback } from 'react';

export function useTimelineHeaderActions({
  setSelectedTrackId,
  setSelectedKey,
  updateTrack,
  setMultiSelection,
  selectedKey,
  selectedChannelId,
  buildSelectionAfterUnlink,
}) {
  const selectTrackFromHeader = useCallback(
    (trackId) => {
      setSelectedTrackId(trackId);
      setSelectedKey(null);
    },
    [setSelectedTrackId, setSelectedKey]
  );

  const toggleTrackLinkFromHeader = useCallback(
    (entry) => {
      if (!entry?.track?.widgetId) return;
      const trackId = entry.track.widgetId;
      selectTrackFromHeader(trackId);
      const nextLinked = !entry.track.linkChannels;
      updateTrack(trackId, (track) => ({
        ...track,
        linkChannels: nextLinked
      }));
      if (!nextLinked) {
        // Si on vient de déverrouiller, on évite de garder une multi‑sélection héritée
        // (sinon un drag continue de bouger tous les axes).
        setMultiSelection((prev) =>
          buildSelectionAfterUnlink({
            selectedKey,
            previousSelection: prev,
            selectedChannelId,
            trackId,
          })
        );
      }
    },
    [
      selectTrackFromHeader,
      updateTrack,
      setMultiSelection,
      buildSelectionAfterUnlink,
      selectedKey,
      selectedChannelId,
    ]
  );

  return {
    selectTrackFromHeader,
    toggleTrackLinkFromHeader,
  };
}
