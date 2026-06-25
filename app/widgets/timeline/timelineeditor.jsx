import {
  formatNumber,
  getT,
  getWidgetLabel,
} from './timelinewidget-shared.js';
import { getNumericRange } from '../../utils/timeline';
import { framesToTimecode } from './formatters';
import { useTimelineDraft } from './hooks/useTimelineDraft';
import { useTrackReorder } from './hooks/useTrackReorder';
import { useTimelinePlaybackControls } from './hooks/useTimelinePlaybackControls';
import { useTimelineLivePreview } from './hooks/useTimelineLivePreview';
import { useTimelineViewportControls } from './hooks/useTimelineViewportControls';
import { useTimelineKeyframeTypeApply } from './hooks/useTimelineKeyframeTypeApply';
import { useTimelineStatusMessage } from './hooks/useTimelineStatusMessage';
import { useTimelineKeyframePatchActions } from './hooks/useTimelineKeyframePatchActions';
import { useTimelineKeyframeTypeSyncEffects } from './hooks/useTimelineKeyframeTypeSyncEffects';
import { useTimelineSelectionStateEffects } from './hooks/useTimelineSelectionStateEffects';
import { useTimelineInspectorDraftEffects } from './hooks/useTimelineInspectorDraftEffects';
import { useTimelineColorPickerSync } from './hooks/useTimelineColorPickerSync';
import { useTimelineDraftSyncEffects } from './hooks/useTimelineDraftSyncEffects';
import { useTimelinePointerUiEffects } from './hooks/useTimelinePointerUiEffects';
import { useTimelineSelectionDerived } from './hooks/useTimelineSelectionDerived';
import { useTimelineLayoutDerived } from './hooks/useTimelineLayoutDerived';
import { useTimelineValueDisplayActions } from './hooks/useTimelineValueDisplayActions';
import { useTimelineLookupMaps } from './hooks/useTimelineLookupMaps';
import { useTimelineTimingDerived } from './hooks/useTimelineTimingDerived';
import { useTimelineEditorCueAction } from './hooks/useTimelineEditorCueAction';
import { useTimelineTrackEntries } from './hooks/useTimelineTrackEntries';
import { useTimelineInitialDraft } from './hooks/useTimelineInitialDraft';
import { useTimelineEditorRefs } from './hooks/useTimelineEditorRefs';
import { useTimelineEditorState } from './hooks/useTimelineEditorState';
import { useTimelineEditorInteractions } from './hooks/useTimelineEditorInteractions';
import { useTimelineEditorRenderers } from './hooks/useTimelineEditorRenderers';
import { TimelineToolbar } from './TimelineToolbar.jsx';
import { TimelineInspector } from './TimelineInspector.jsx';
import { TimelineEditorHeaderControls } from './TimelineEditorHeaderControls.jsx';
import { TimelineGraphSection } from './TimelineGraphSection.jsx';
import { buildTimelineEditorComponentProps } from './timelineEditorComponentProps.js';
import {
  GRAPH_WIDTH,
  GRAPH_LEFT,
  GRAPH_RIGHT,
  GRID_COLS,
} from './layout';
import { toGlobalFrame } from './frameUtils';
import {
  shouldRenderSquare,
  shouldShowEye,
  isCurveHidden,
} from './timelineEntryHelpers';
import {
  getTimelineChannelBounds as getChannelBounds,
  getTimelineWidgetCurrentValue as getWidgetCurrentValue,
} from './timelineEditorDerivedHelpers';

export function TimelineEditorRight({
  widget,
  hosts,
  presetData,
  updateWidget,
  common,
  layoutId = ''
}) {
  // widget est garanti non-null par l'appelant (rendu uniquement si type === 'timeline').
  const t = getT();
  const initial = useTimelineInitialDraft(widget.ui?.timeline);
  const editorState = useTimelineEditorState(initial);
  const {
    timelineDraft,
    setTimelineDraft,
    selectedTrackId,
    setSelectedTrackId,
    selectedKey,
    setSelectedKey,
    multiSelection,
    setMultiSelection,
    selectedChannelId,
    setSelectedChannelId,
    playheadFrame,
    setPlayheadFrame,
    editorPlaying,
    setEditorPlaying,
    setEditorPaused,
    setTimecodeInput,
    useTimecodeView,
    setUseTimecodeView,
    setKeyframeFrameDraft,
    setKeyframeValueDraft,
    setKeyframeInTanDraft,
    setKeyframeOutTanDraft,
    setKeyframeInSpanDraft,
    setKeyframeOutSpanDraft,
    keyframeType,
    setKeyframeType,
    zoomFactor,
    setZoomFactor,
    viewStart,
    setViewStart,
    setBundleFrameDraft,
    setBundleValueDrafts,
    showAddMenu,
    setShowAddMenu,
    setColorPickerState,
  } = editorState;

  const editorRefs = useTimelineEditorRefs(initial.tracks?.[0]?.widgetId || '');
  const {
    selectedTrackIdRef,
    sendTimerRef,
    lastSentRef,
    livePlayerRef,
    liveSigRef,
    liveThrottleRef,
    editorPlayerRef,
    editorPlayheadRef,
    editorPausedRef,
    editorDirectionRef,
    boundaryRef,
    editorRootRef,
    editorActiveRef,
    addMenuRef,
    svgRef,
    timecodeRef,
    viewportDragRef,
  } = editorRefs;

  const {
    updateTrack,
    updateSelectedWidget,
    updateSelectedBinding,
    handleAddTrackType,
    removeTrackById,
    moveTrack
  } = useTimelineDraft({
    setTimelineDraft,
    selectedTrackId,
    setSelectedTrackId,
    setSelectedKey,
    setShowAddMenu,
    hosts,
    t
  });

  const {
    getTrackValueSummary,
    getCurrentValueDisplay,
    toggleCurveVisibility,
  } = useTimelineValueDisplayActions({
    playheadFrame,
    updateTrack,
  });

  const { widgetMap, hostColorMap } = useTimelineLookupMaps({
    widgets: timelineDraft.widgets,
    hosts,
  });

  useTimelineDraftSyncEffects({
    widget,
    hosts,
    timelineDraft,
    selectedTrackId,
    setTimelineDraft,
    setSelectedTrackId,
    setSelectedKey,
    updateWidget,
    selectedTrackIdRef,
    sendTimerRef,
    lastSentRef,
    livePlayerRef,
    editorPlayerRef,
  });

  useTimelinePointerUiEffects({
    showAddMenu,
    addMenuRef,
    editorRootRef,
    editorActiveRef,
    setShowAddMenu,
  });

  const { statusMsg, showStatus } = useTimelineStatusMessage();

  const {
    fps,
    fpsWarnings,
    maxFrame,
    clampedMaxFrame,
    durationDisplay,
  } = useTimelineTimingDerived({
    hosts,
    timelineDraft,
    useTimecodeView,
  });

  const {
    handleEditorPlay,
    handleEditorPause,
    handleEditorContinue,
    handleEditorStop,
    handleEditorStep,
    commitTimecodeInput,
    toggleTimecodeView,
  } = useTimelinePlaybackControls({
    fpsWarnings,
    showStatus,
    timelineDraft,
    maxFrame,
    hosts,
    common,
    fps,
    editorPlayerRef,
    editorPausedRef,
    setEditorPaused,
    editorPlayheadRef,
    setPlayheadFrame,
    editorDirectionRef,
    setEditorPlaying,
    boundaryRef,
    editorPlaying,
    clampedMaxFrame,
    setTimecodeInput,
    useTimecodeView,
    playheadFrame,
    setUseTimecodeView,
    framesToTimecode,
  });

  const trackEntries = useTimelineTrackEntries({
    tracks: timelineDraft.tracks,
    widgetMap,
  });

  const {
    selectedTrack,
    selectedMeta,
    selectedKeyframe,
    selectedWidget,
    selectedKeyframeArgs,
    lockKeyframeTypes,
    isLinkedSelected,
    selectedBundle,
  } = useTimelineSelectionDerived({
    trackEntries,
    widgets: timelineDraft.widgets,
    selectedTrackId,
    selectedKey,
    selectedChannelId,
  });

  useTimelineSelectionStateEffects({
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
  });

  const applyKeyframeType = useTimelineKeyframeTypeApply({
    setKeyframeType,
    multiSelection,
    selectedKey,
    updateTrack,
  });

  useTimelineKeyframeTypeSyncEffects({
    lockKeyframeTypes,
    keyframeType,
    applyKeyframeType,
    multiSelection,
    selectedKey,
    trackEntries,
    setKeyframeType,
  });

  useTimelineInspectorDraftEffects({
    selectedTrack,
    selectedKeyframe,
    selectedChannelId,
    selectedBundle,
    useTimecodeView,
    fps,
    toGlobalFrame,
    setKeyframeFrameDraft,
    setKeyframeValueDraft,
    setKeyframeInTanDraft,
    setKeyframeOutTanDraft,
    setKeyframeInSpanDraft,
    setKeyframeOutSpanDraft,
    setBundleFrameDraft,
    setBundleValueDrafts,
  });

  useTimelineColorPickerSync({
    isLinkedSelected,
    selectedMeta,
    selectedBundle,
    setColorPickerState,
  });

  const {
    layoutEntries,
    trackById,
    trackAreaHeight,
    graphHeight,
    innerWidth,
  } = useTimelineLayoutDerived({
    trackEntries,
    selectedTrackId,
  });
  const {
    viewFrames,
    clampViewStart,
    frameToX,
    xToFrame,
    xTicks,
    frameLines,
    handleViewportPointerDown,
    handleWheel,
  } = useTimelineViewportControls({
    clampedMaxFrame,
    zoomFactor,
    setZoomFactor,
    viewStart,
    setViewStart,
    graphLeft: GRAPH_LEFT,
    graphRight: GRAPH_RIGHT,
    graphWidth: GRAPH_WIDTH,
    gridCols: GRID_COLS,
    innerWidth,
    svgRef,
    timecodeRef,
    viewportDragRef,
  });
  // --- Live preview during scrubbing (production) ---
  const { sendLiveFrame } = useTimelineLivePreview({
    hosts,
    common,
    timelineDraft,
    playheadFrame,
    livePlayerRef,
    liveSigRef,
    liveThrottleRef,
  });

  const handleEditorCue = useTimelineEditorCueAction({
    editorPlayheadRef,
    editorPlayerRef,
    setPlayheadFrame,
    sendLiveFrame,
  });

  const { reorderTrackId, handleReorderStart, handleReorderOver, handleReorderEnd } =
    useTrackReorder({
      layoutEntries,
      moveTrack
    });

  const {
    updateKeyframe,
    updateChannelKeyframe,
    updateSelectedKeyframeArgs,
  } = useTimelineKeyframePatchActions({
    selectedTrack,
    selectedKey,
    selectedKeyframeArgs,
    updateTrack,
  });

  const {
    registerPoint,
    handlePointerDown,
    handlePointerUp,
    handleSvgPointerDown,
    updateFromPointer,
    handleClipPointerDown,
    handleRemoveKeyframe,
    handleValueChange,
    commitKeyframeFrameDraft,
    commitKeyframeValueDraft,
    inlineDrafts,
    setInlineDrafts,
    getInlineDraftKey,
    getInlineDraftValue,
    addKeyframeFor,
    commitBundleFrameDraft,
    commitBundleValueDraft,
    applyColorToBundle,
    onTimecodeDown,
    onTimecodeMove,
    onTimecodeUp,
    jumpToKeyframeFor,
    handleKeyControlPointerDown,
    addChannelKeyframeAt,
    removeChannelKeyframeAt,
    handleInlineChannelValueChange,
    handleDurationChange,
    handleBezierTangentChange,
    handleBezierSpanChange,
  } = useTimelineEditorInteractions({
    refs: editorRefs,
    state: editorState,
    trackById,
    trackEntries,
    selectedTrack,
    selectedKeyframe,
    selectedBundle,
    fps,
    clampedMaxFrame,
    graphHeight,
    innerWidth,
    xToFrame,
    getChannelBounds,
    getWidgetCurrentValue,
    updateTrack,
    updateKeyframe,
    updateChannelKeyframe,
    showStatus,
  });

  const {
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
  } = useTimelineEditorRenderers({
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
    widgetId: widget.id,
    setTimelineDraft,
  });

  const {
    timelineHeaderControlsProps,
    timelineInspectorProps,
    timelineGraphSectionProps,
    timelineToolbarProps,
  } = buildTimelineEditorComponentProps({
    t,
    widget,
    layoutId,
    hosts,
    presetData,
    editorState,
    editorRefs,
    typeOptions,
    mode,
    selectedWidget,
    selectedTrack,
    selectedMeta,
    selectedKeyframe,
    selectedKeyframeArgs,
    selectedBundle,
    isLinkedSelected,
    fps,
    fpsWarnings,
    clampedMaxFrame,
    viewFrames,
    graphHeight,
    innerWidth,
    trackAreaHeight,
    frameLines,
    layoutEntries,
    xTicks,
    frameToX,
    getChannelBounds,
    getTrackValueSummary,
    getInlineDraftValue,
    getInlineDraftKey,
    formatNumber,
    getWidgetLabel,
    getNumericRange,
    shouldRenderSquare,
    shouldShowEye,
    isCurveHidden,
    renderCollapseToggle,
    renderHeaderRow,
    renderKeyControls,
    commitBundleFrameDraft,
    commitBundleValueDraft,
    removeChannelKeyframeAt,
    addChannelKeyframeAt,
    commitKeyframeFrameDraft,
    commitKeyframeValueDraft,
    handleRemoveKeyframe,
    handleValueChange,
    applyColorToBundle,
    updateSelectedBinding,
    updateSelectedWidget,
    updateSelectedKeyframeArgs,
    commitTimecodeInput,
    toggleTimecodeView,
    onTimecodeDown,
    onTimecodeMove,
    onTimecodeUp,
    handleViewportPointerDown,
    toggleCurveVisibility,
    registerPoint,
    handleSvgPointerDown,
    updateFromPointer,
    handlePointerUp,
    handleClipPointerDown,
    handlePointerDown,
    handleWheel,
    handleInlineChannelValueChange,
    inlineDrafts,
    setInlineDrafts,
    lockKeyframeTypes,
    applyKeyframeType,
    handleZoomOut,
    handleZoomIn,
    handleZoomCenter,
    handleTimelineHeaderLabelChange,
    handleTimelineModeChange,
    handleBezierTangentChange,
    handleBezierSpanChange,
    handleEditorCue,
    handleEditorPlay,
    handleEditorPause,
    handleEditorContinue,
    handleEditorStop,
    handleEditorStep,
    durationDisplay,
    handleDurationChange,
    handleAddTrackType,
  });

  return (
    <div className="uu-timeline-widget" ref={editorRootRef}>
      {statusMsg && <div className="uu-alert uu-alert-error">{statusMsg}</div>}

      <div className="uu-timeline-section">
        <TimelineEditorHeaderControls {...timelineHeaderControlsProps} />

        <TimelineGraphSection {...timelineGraphSectionProps} />

        <TimelineToolbar {...timelineToolbarProps} />
      </div>

      <TimelineInspector {...timelineInspectorProps} />
    </div>
  );
}
