import { formatInputNumber } from '../timelinewidget-shared.js';
import {
  coerceNumericValue,
  getNumericRange,
  sampleNumericValue,
} from '../../../utils/timeline';
import { framesToTimecode } from '../formatters';
import { findFrameIndex, isFrameTaken } from '../selection';
import {
  buildIgnoreMap,
  collectLinkedSiblings,
  dedupeSelection,
  sameKey,
} from '../helpers/selectionHelpers';
import {
  GRAPH_BOTTOM,
  GRAPH_LEFT,
  GRAPH_RIGHT,
  GRAPH_TOP,
  GRAPH_WIDTH,
  MIN_SCALE,
} from '../layout';
import {
  getShiftedLocalFrame,
  getTrackOffset,
  getTrackScale,
  toGlobalFrame,
  toLocalFrame,
  toLocalFrameRounded,
} from '../frameUtils';
import { shiftTrackKeyframes } from '../keyframeUtils';
import { isTrackLinked } from '../timelineEntryHelpers';
import { hexToRgb } from '../colorUtils';
import { useTimelineDrag } from './useTimelineDrag';
import { useKeyframeEditing } from './useKeyframeEditing';
import { useInlineDrafts } from './useInlineDrafts';
import { useTimelinePlayheadSyncEffects } from './useTimelinePlayheadSyncEffects';
import { useBundleEditing } from './useBundleEditing';
import { usePlayheadDrag } from './usePlayheadDrag';
import { useKeyframeNavigation } from './useKeyframeNavigation';
import { useTimelineSelectionDeleteFlow } from './useTimelineSelectionDeleteFlow';
import { useTimelineChannelKeyframeActions } from './useTimelineChannelKeyframeActions';
import { useTimelineInlineChannelValue } from './useTimelineInlineChannelValue';
import { useTimelineDurationChange } from './useTimelineDurationChange';
import { useTimelineBezierEditing } from './useTimelineBezierEditing';

export function useTimelineEditorInteractions({
  refs,
  state,
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
}) {
  const {
    svgRef,
    lassoRef,
    pointMapRef,
    dragRef,
    clipDragRef,
    timecodeRef,
    timecodeDragRef,
    editorPlayheadRef,
  } = refs;
  const {
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
    timecodeEditing,
    setTimelineDraft,
    setTimecodeInput,
    useTimecodeView,
    setBundleFrameDraft,
    setBundleValueDrafts,
    setKeyframeFrameDraft,
    setKeyframeValueDraft,
    setKeyframeInTanDraft,
    setKeyframeOutTanDraft,
    setKeyframeInSpanDraft,
    setKeyframeOutSpanDraft,
    setColorPickerState,
    lassoBox,
    setLassoBox,
    keyframeType,
  } = state;
  const clampFrame = (frame) => Math.max(0, Math.min(clampedMaxFrame, frame));

  pointMapRef.current = [];

  const {
    registerPoint,
    handlePointerDown,
    handlePointerUp,
    handleSvgPointerDown,
    updateFromPointer,
    handleClipPointerDown,
  } = useTimelineDrag({
    svgRef,
    lassoRef,
    pointMapRef,
    dragRef,
    clipDragRef,
    lassoBox,
    setLassoBox,
    trackById,
    trackEntries,
    selectedTrackId,
    setSelectedTrackId,
    selectedChannelId,
    setSelectedChannelId,
    selectedKey,
    setSelectedKey,
    multiSelection,
    setMultiSelection,
    playheadFrame,
    setPlayheadFrame,
    clampedMaxFrame,
    graphHeight,
    innerWidth,
    clampFrame,
    xToFrame,
    GRAPH_WIDTH,
    GRAPH_LEFT,
    GRAPH_RIGHT,
    GRAPH_TOP,
    GRAPH_BOTTOM,
    MIN_SCALE,
    toLocalFrame,
    toGlobalFrame,
    getChannelBounds,
    getNumericRange,
    coerceNumericValue,
    shiftTrackKeyframes,
    updateTrack,
    updateChannelKeyframe,
    updateKeyframe,
    showStatus,
    dedupeSelection,
    collectLinkedSiblings,
    buildIgnoreMap,
    sameKey,
    getTrackOffset,
    getTrackScale,
    isFrameTaken,
  });

  const {
    handleRemoveKeyframe,
    handleValueChange,
    commitKeyframeFrameDraft,
    commitKeyframeValueDraft,
    pickDefaultValue,
    pickDefaultChannelValue,
  } = useKeyframeEditing({
    selectedTrack,
    selectedKey,
    selectedChannelId,
    selectedKeyframe,
    selectedBundle,
    setSelectedKey,
    setPlayheadFrame,
    useTimecodeView,
    fps,
    playheadFrame,
    updateTrack,
    updateKeyframe,
    updateChannelKeyframe,
    showStatus,
    toGlobalFrame,
    toLocalFrameRounded,
    coerceNumericValue,
    getNumericRange,
    isFrameTaken,
    getWidgetCurrentValue,
  });

  const {
    inlineDrafts,
    setInlineDrafts,
    resetInlineDrafts,
    getInlineDraftKey,
    getInlineDraftValue,
  } = useInlineDrafts({
    toLocalFrame,
    playheadFrame,
    selectedKey,
    pickDefaultChannelValue,
    sampleNumericValue,
    formatInputNumber,
  });

  useTimelinePlayheadSyncEffects({
    playheadFrame,
    clampedMaxFrame,
    timecodeEditing,
    useTimecodeView,
    fps,
    editorPlayheadRef,
    setPlayheadFrame,
    setTimecodeInput,
    resetInlineDrafts,
    framesToTimecode,
  });

  const {
    addKeyframeFor,
    commitBundleFrameDraft,
    commitBundleValueDraft,
    applyColorToBundle,
  } = useBundleEditing({
    selectedTrack,
    selectedChannelId,
    selectedBundle,
    selectedKey,
    setSelectedKey,
    setSelectedTrackId,
    setSelectedChannelId,
    setMultiSelection,
    playheadFrame,
    useTimecodeView,
    fps,
    toLocalFrameRounded,
    toGlobalFrame,
    showStatus,
    updateTrack,
    getShiftedLocalFrame,
    shiftTrackKeyframes,
    findFrameIndex,
    isFrameTaken,
    sampleNumericValue,
    pickDefaultValue,
    pickDefaultChannelValue,
    dedupeSelection,
    setBundleFrameDraft,
    setKeyframeFrameDraft,
    setBundleValueDrafts,
    setKeyframeValueDraft,
    setColorPickerState,
    hexToRgb,
    formatInputNumber,
    isTrackLinked,
    coerceNumericValue,
    defaultInterp: keyframeType,
  });

  const { onTimecodeDown, onTimecodeMove, onTimecodeUp } = usePlayheadDrag({
    timecodeRef,
    timecodeDragRef,
    clampedMaxFrame,
    fps,
    useTimecodeView,
    framesToTimecode,
    setPlayheadFrame,
    setTimecodeInput,
  });

  const { jumpToKeyframeFor, handleKeyControlPointerDown } =
    useKeyframeNavigation({
      playheadFrame,
      toLocalFrame,
      toGlobalFrame,
      setPlayheadFrame,
      setSelectedChannelId,
      setSelectedTrackId,
      setSelectedKey,
      showStatus,
    });

  useTimelineSelectionDeleteFlow({
    editorRootRef: refs.editorRootRef,
    editorActiveRef: refs.editorActiveRef,
    multiSelection,
    selectedKeyframe,
    updateTrack,
    setSelectedKey,
    setMultiSelection,
    onDeleteSelectedKeyframe: handleRemoveKeyframe,
  });

  const { addChannelKeyframeAt, removeChannelKeyframeAt } =
    useTimelineChannelKeyframeActions({
      selectedTrack,
      selectedBundle,
      keyframeType,
      updateTrack,
      setSelectedKey,
      pickDefaultChannelValue,
    });

  const handleInlineChannelValueChange = useTimelineInlineChannelValue({
    selectedKey,
    playheadFrame,
    keyframeType,
    updateTrack,
    updateChannelKeyframe,
    showStatus,
    setSelectedTrackId,
    setSelectedChannelId,
    setSelectedKey,
  });

  const handleDurationChange = useTimelineDurationChange({
    setTimelineDraft,
    useTimecodeView,
    fps,
  });

  const { handleBezierTangentChange, handleBezierSpanChange } =
    useTimelineBezierEditing({
      selectedTrack,
      selectedKeyframe,
      selectedKey,
      selectedChannelId,
      updateChannelKeyframe,
      updateKeyframe,
      setKeyframeInTanDraft,
      setKeyframeOutTanDraft,
      setKeyframeInSpanDraft,
      setKeyframeOutSpanDraft,
    });

  return {
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
  };
}
