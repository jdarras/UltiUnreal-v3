import { useCallback } from 'react';
import { TimelineCollapseToggle } from '../TimelineCollapseToggle.jsx';
import { TimelineKeyControls } from '../TimelineKeyControls.jsx';

export function useTimelineRowRenderers({
  updateTrack,
  getCurrentValueDisplay,
  handleKeyControlPointerDown,
  jumpToKeyframeFor,
  addKeyframeFor,
}) {
  const renderKeyControls = useCallback(
    (entry, y, channelId = null, options = {}) => {
      return (
        <TimelineKeyControls
          entry={entry}
          y={y}
          channelId={channelId}
          options={options}
          getCurrentValueDisplay={getCurrentValueDisplay}
          handleKeyControlPointerDown={handleKeyControlPointerDown}
          jumpToKeyframeFor={jumpToKeyframeFor}
          addKeyframeFor={addKeyframeFor}
        />
      );
    },
    [
      getCurrentValueDisplay,
      handleKeyControlPointerDown,
      jumpToKeyframeFor,
      addKeyframeFor,
    ]
  );

  const renderCollapseToggle = useCallback(
    (entry, y) => {
      return (
        <TimelineCollapseToggle
          entry={entry}
          y={y}
          onToggle={() => {
            updateTrack(entry.track.widgetId, (track) => ({
              ...track,
              collapsed: !track.collapsed
            }));
          }}
        />
      );
    },
    [updateTrack]
  );

  return {
    renderKeyControls,
    renderCollapseToggle,
  };
}
