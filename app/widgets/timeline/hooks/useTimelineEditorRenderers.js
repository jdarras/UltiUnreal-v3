import { getTimelineWidgetTypeOptions } from '../timelinewidget-config.js';
import { useTimelineRowRenderers } from './useTimelineRowRenderers';
import { useTimelineHeaderActions } from './useTimelineHeaderActions';
import { useTimelineHeaderRowRenderer } from './useTimelineHeaderRowRenderer';
import { useTimelineHeaderControlActions } from './useTimelineHeaderControlActions';
import {
  COLLAPSE_BTN_SIZE,
  COLLAPSE_X,
  GRAPH_RIGHT,
  GRAPH_WIDTH,
} from '../layout';
import { isLinkableEntry, isTrackLinked } from '../timelineEntryHelpers';
import { buildTargetPastilles } from '../timelineTargetHelpers';
import { buildSelectionAfterUnlink } from '../timelineHeaderHelpers';

export function useTimelineEditorRenderers({
  t,
  timelineDraft,
  updateTrack,
  getCurrentValueDisplay,
  handleKeyControlPointerDown,
  jumpToKeyframeFor,
  addKeyframeFor,
  hostColorMap,
  selectedTrackId,
  reorderTrackId,
  handleReorderOver,
  handleReorderEnd,
  handleReorderStart,
  removeTrackById,
  setSelectedTrackId,
  setSelectedKey,
  setMultiSelection,
  selectedKey,
  selectedChannelId,
  setZoomFactor,
  setViewStart,
  clampViewStart,
  viewFrames,
  updateWidget,
  widgetId,
  setTimelineDraft,
}) {
  const typeOptions = getTimelineWidgetTypeOptions(t);
  const mode = timelineDraft.mode || 'single';
  const { renderKeyControls, renderCollapseToggle } = useTimelineRowRenderers({
    updateTrack,
    getCurrentValueDisplay,
    handleKeyControlPointerDown,
    jumpToKeyframeFor,
    addKeyframeFor,
  });

  const { selectTrackFromHeader, toggleTrackLinkFromHeader } =
    useTimelineHeaderActions({
      setSelectedTrackId,
      setSelectedKey,
      updateTrack,
      setMultiSelection,
      selectedKey,
      selectedChannelId,
      buildSelectionAfterUnlink,
    });

  const renderHeaderRow = useTimelineHeaderRowRenderer({
    buildTargetPastilles,
    hostColorMap,
    graphWidth: GRAPH_WIDTH,
    graphRight: GRAPH_RIGHT,
    collapseX: COLLAPSE_X,
    collapseBtnSize: COLLAPSE_BTN_SIZE,
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
  });

  const {
    handleZoomOut,
    handleZoomIn,
    handleZoomCenter,
    handleTimelineHeaderLabelChange,
    handleTimelineModeChange,
  } = useTimelineHeaderControlActions({
    setZoomFactor,
    setViewStart,
    clampViewStart,
    viewFrames,
    updateWidget,
    widgetId,
    setTimelineDraft,
  });

  return {
    typeOptions,
    mode,
    renderKeyControls,
    renderCollapseToggle,
    renderHeaderRow,
    handleZoomOut,
    handleZoomIn,
    handleZoomCenter,
    handleTimelineHeaderLabelChange,
    handleTimelineModeChange,
  };
}
