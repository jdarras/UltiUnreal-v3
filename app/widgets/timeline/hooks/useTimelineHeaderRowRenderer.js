import { useCallback } from 'react';
import { TimelineHeaderRow } from '../TimelineHeaderRow.jsx';
import { buildTimelineHeaderMetrics } from '../timelineHeaderHelpers.js';
import { buildTimelineHeaderRowProps } from '../timelineHeaderRowProps.js';

export function useTimelineHeaderRowRenderer({
  buildTargetPastilles,
  hostColorMap,
  graphWidth,
  graphRight,
  collapseX,
  collapseBtnSize,
  selectedTrackId,
  isTrackLinked,
  reorderTrackId,
  handleReorderOver,
  handleReorderEnd,
  selectTrackFromHeader,
  toggleTrackLinkFromHeader,
  handleReorderStart,
  removeTrackById,
  isLinkableEntry,
  t,
}) {
  return useCallback(
    (entry, headerBounds, label, rowIndex) => {
      if (!entry || !headerBounds) return null;
      const pastilles = buildTargetPastilles(entry.widget, hostColorMap);
      const { headerX, headerWidth } = buildTimelineHeaderMetrics({
        graphWidth,
        graphRight,
        collapseX,
        collapseBtnSize,
      });
      const isActive = entry.track.widgetId === selectedTrackId;
      const linked = isTrackLinked(entry);
      const timelineHeaderRowProps = buildTimelineHeaderRowProps({
        entry,
        headerBounds,
        headerX,
        headerWidth,
        label,
        rowIndex,
        pastilles,
        isActive,
        linked,
        reorderTrackId,
        onReorderOver: (targetRowIndex, evt) => {
          handleReorderOver(targetRowIndex)(evt);
        },
        onReorderEnd: handleReorderEnd,
        onSelectTrack: () => selectTrackFromHeader(entry.track.widgetId),
        onToggleLink: () => toggleTrackLinkFromHeader(entry),
        onReorderStart: handleReorderStart(entry.track.widgetId),
        onDeleteTrack: () => {
          removeTrackById(entry.track.widgetId);
        },
        isLinkableEntry,
        t,
      });
      return <TimelineHeaderRow {...timelineHeaderRowProps} />;
    },
    [
      buildTargetPastilles,
      hostColorMap,
      graphWidth,
      graphRight,
      collapseX,
      collapseBtnSize,
      selectedTrackId,
      isTrackLinked,
      reorderTrackId,
      handleReorderOver,
      handleReorderEnd,
      selectTrackFromHeader,
      toggleTrackLinkFromHeader,
      handleReorderStart,
      removeTrackById,
      isLinkableEntry,
      t,
    ]
  );
}
