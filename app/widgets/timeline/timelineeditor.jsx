import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  formatInputNumber,
  formatNumber,
  getT,
  getWidgetLabel
} from './timelinewidget-shared.js';
import { colorClass } from '../../utils/colors';
import { getTimelineWidgetTypeOptions, syncTimelineWidgetTargets } from './timelinewidget-config.js';
import {
  coerceNumericValue,
  getNumericRange,
  getTimelineMaxFrame,
  getWidgetValueMeta,
  normalizeTimeline,
  resolveTimelineFps,
  sampleNumericValue
} from '../../utils/timeline';
import { framesToTimecode, parseTcShorthand } from './formatters';
import { findFrameIndex, isFrameTaken } from './selection';
import { sameKey, dedupeSelection, collectLinkedSiblings, buildIgnoreMap } from './helpers/selectionHelpers';
import { useTimelineDrag } from './hooks/useTimelineDrag';
import { useTimelineDraft } from './hooks/useTimelineDraft';
import { useKeyframeEditing } from './hooks/useKeyframeEditing';
import { useBundleEditing } from './hooks/useBundleEditing';
import { useKeyframeNavigation } from './hooks/useKeyframeNavigation';
import { usePlayheadDrag } from './hooks/usePlayheadDrag';
import { useInlineDrafts } from './hooks/useInlineDrafts';
import { useTrackReorder } from './hooks/useTrackReorder';
import { useTimelinePlaybackControls } from './hooks/useTimelinePlaybackControls';
import { useTimelineLivePreview } from './hooks/useTimelineLivePreview';
import { useTimelineViewportControls } from './hooks/useTimelineViewportControls';
import { useTimelineRowRenderers } from './hooks/useTimelineRowRenderers';
import { useTimelineHeaderActions } from './hooks/useTimelineHeaderActions';
import { useTimelineHeaderRowRenderer } from './hooks/useTimelineHeaderRowRenderer';
import { TimelineToolbar } from './TimelineToolbar.jsx';
import { TimelineInspector } from './TimelineInspector.jsx';
import { TimelineEditorHeaderControls } from './TimelineEditorHeaderControls.jsx';
import { TimelineGraphSection } from './TimelineGraphSection.jsx';
import { buildTimelineHeaderControlsProps } from './timelineHeaderControlsProps.js';
import { buildTimelineInspectorProps } from './timelineInspectorProps.js';
import { buildTimelineGraphSectionProps } from './timelineGraphSectionProps.js';
import { buildTimelineToolbarProps } from './timelineToolbarProps.js';
import { hexToRgb, rgbToHex } from './colorUtils';
import { getChannelColor } from './uiDisplayUtils';
import {
  GRAPH_WIDTH,
  GRAPH_LEFT,
  GRAPH_RIGHT,
  GRAPH_TOP,
  GRAPH_BOTTOM,
  TRACK_HEIGHT,
  CHANNEL_ROW_HEIGHT,
  GRID_COLS,
  MIN_CLIP_PX,
  MIN_SCALE,
  COLLAPSE_BTN_SIZE,
  SQUARE_POINT_KINDS,
  LABEL_RIGHT_X,
  COLLAPSE_X,
  buildTrackLayout
} from './layout';
import {
  toGlobalFrame,
  toLocalFrame,
  toLocalFrameRounded,
  getTrackOffset,
  getTrackScale,
  getShiftedLocalFrame
} from './frameUtils';
import { shiftTrackKeyframes } from './keyframeUtils';
import {
  getLocalMaxFrame,
  getLocalMinFrame,
  getLocalMaxFrameFromChannels,
  getLocalMinFrameFromChannels,
  isLinkableEntry,
  isTrackLinked,
  shouldRenderSquare,
  shouldShowEye,
  isCurveHidden,
} from './timelineEntryHelpers';
import {
  getTrackValueSummaryAtFrame,
  getCurrentValueDisplayAtFrame,
} from './timelineValueDisplayHelpers';
import {
  buildHostColorMap,
  buildTargetPastilles,
} from './timelineTargetHelpers';
import {
  buildCurveVisibilityTrackPatch,
} from './timelineKeyControlsHelpers';
import { buildSelectionAfterUnlink } from './timelineHeaderHelpers';

const KEYFRAME_LOCKED_TYPES = new Set(['button', 'toggle', 'enum', 'dropdown', 'browse']);

// Fallback global offset to avoid accidental reference errors in runtime

export function TimelineEditorRight({
  widget,
  hosts,
  presetData,
  updateWidget,
  common,
  layoutId = ''
}) {
  if (!widget) return null;

  const t = getT();
  const initial = useMemo(
    () => normalizeTimeline(widget.ui?.timeline),
    [widget.ui?.timeline]
  );
  const [timelineDraft, setTimelineDraft] = useState(initial);
  const [selectedTrackId, setSelectedTrackId] = useState(
    initial.tracks?.[0]?.widgetId || ''
  );
  const [selectedKey, setSelectedKey] = useState(null);
  const selectedTrackIdRef = useRef(initial.tracks?.[0]?.widgetId || '');
  const [multiSelection, setMultiSelection] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [playheadFrame, setPlayheadFrame] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [editorPlaying, setEditorPlaying] = useState(false);
  const [editorPaused, setEditorPaused] = useState(false);
  const [timecodeInput, setTimecodeInput] = useState('0');
  const [useTimecodeView, setUseTimecodeView] = useState(false);
  const [timecodeEditing, setTimecodeEditing] = useState(false);
  const [keyframeFrameDraft, setKeyframeFrameDraft] = useState('');
  const [keyframeValueDraft, setKeyframeValueDraft] = useState('');
  const [keyframeInTanDraft, setKeyframeInTanDraft] = useState('');
  const [keyframeOutTanDraft, setKeyframeOutTanDraft] = useState('');
  const [keyframeInSpanDraft, setKeyframeInSpanDraft] = useState('');
  const [keyframeOutSpanDraft, setKeyframeOutSpanDraft] = useState('');
  const [keyframeType, setKeyframeType] = useState('linear');
  // Zoom / viewport (horizontal only)
  const [zoomFactor, setZoomFactor] = useState(1);
  const [viewStart, setViewStart] = useState(0); // frame index of viewport start
  const [bundleFrameDraft, setBundleFrameDraft] = useState('');
  const [bundleValueDrafts, setBundleValueDrafts] = useState({});
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [lassoBox, setLassoBox] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerState, setColorPickerState] = useState({
    hex: '#ffffff',
    alpha: 1
  });
  const browseFileInputRef = useRef(null);
  const [argColorPicker, setArgColorPicker] = useState({
    open: false,
    name: '',
    hex: '#ffffff',
    alpha: 1
  });

  const statusTimerRef = useRef(null);
  const sendTimerRef = useRef(null);
  const lastSentRef = useRef('');
  const livePlayerRef = useRef(null);
  const liveSigRef = useRef('');
  const liveThrottleRef = useRef(0);
  const editorPlayerRef = useRef(null);
  const editorPlayheadRef = useRef(0);
  const editorPausedRef = useRef(false);
  const editorDirectionRef = useRef(1);
  const boundaryRef = useRef(null);
  const editorRootRef = useRef(null);
  const editorActiveRef = useRef(false);
  const addMenuRef = useRef(null);
  const svgRef = useRef(null);
  const timecodeRef = useRef(null);
  const timecodeDragRef = useRef(false);
  const viewportDragRef = useRef(null);
  const lassoRef = useRef({
    active: false,
    start: null,
    current: null
  });
  const pointMapRef = useRef([]);
  const dragRef = useRef({
    active: false,
    trackId: null,
    idx: null,
    channelId: null,
    selection: [],
    ignoreMap: new Map(),
    forceGroup: false
  });
  const clipDragRef = useRef({
    active: false,
    trackId: null,
    mode: null,
    startFrame: 0,
    startOffset: 0,
    startScale: 1,
    localMin: 0,
    localMax: 0,
    localDuration: 0,
    clipStartFrame: 0,
    clipEndFrame: 0
  });

  const getTrackValueSummary = useCallback(
    (entry) => getTrackValueSummaryAtFrame(entry, playheadFrame),
    [playheadFrame]
  );

  const getCurrentValueDisplay = useCallback(
    (entry, channelId = null) => getCurrentValueDisplayAtFrame(entry, playheadFrame, channelId),
    [playheadFrame]
  );

  const toggleCurveVisibility = useCallback((entry, channelId = null) => {
    if (!entry) return;
    updateTrack(entry.track.widgetId, (track) => {
      return buildCurveVisibilityTrackPatch(track, entry.meta.kind, channelId);
    });
  }, [updateTrack]);

  const widgetMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(timelineDraft.widgets) ? timelineDraft.widgets : [])
      .filter((w) => w && w.id)
      .forEach((w) => map.set(w.id, w));
    return map;
  }, [timelineDraft.widgets]);

  const hostColorMap = useMemo(() => buildHostColorMap(hosts), [hosts]);

  useEffect(() => {
    const next = normalizeTimeline(widget.ui?.timeline);
    const serialized = JSON.stringify(next);
    if (serialized === lastSentRef.current) return;
    setTimelineDraft(next);
    const preferred = selectedTrackIdRef.current;
    const exists = next.tracks?.some((t) => t.widgetId === preferred);
    const fallback = next.tracks?.[0]?.widgetId || '';
    setSelectedTrackId(exists ? preferred : fallback);
    if (!exists) setSelectedKey(null);
    lastSentRef.current = serialized;
  }, [widget.ui?.timeline, widget.id]);

  useEffect(() => {
    selectedTrackIdRef.current = selectedTrackId;
  }, [selectedTrackId]);

  useEffect(() => {
    if (!hosts || hosts.length === 0) return;
    setTimelineDraft((prev) => {
      const widgets = prev.widgets || [];
      let changed = false;
      const nextWidgets = widgets.map((item) => {
        const synced = syncTimelineWidgetTargets(item, hosts);
        const prevTargets = item?.targets || {};
        const nextTargets = synced?.targets || {};
        const nextKeys = Object.keys(nextTargets);
        if (!changed) {
          if (nextKeys.length !== Object.keys(prevTargets).length) {
            changed = true;
          } else {
            changed = nextKeys.some((key) => !(key in prevTargets));
          }
        }
        return synced;
      });
      return changed ? { ...prev, widgets: nextWidgets } : prev;
    });
  }, [hosts]);

  useEffect(() => {
    if (!updateWidget || !widget?.id) return;
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    const serialized = JSON.stringify(timelineDraft);
    if (serialized === lastSentRef.current) return;
    sendTimerRef.current = setTimeout(() => {
      updateWidget(widget.id, {
        ui: {
          ...(widget.ui || {}),
          timeline: timelineDraft
        }
      });
      lastSentRef.current = serialized;
    }, 200);
    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    };
  }, [timelineDraft, updateWidget, widget.id, widget.ui]);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      if (livePlayerRef.current) {
        livePlayerRef.current.stop?.();
        livePlayerRef.current = null;
      }
      editorPlayerRef.current?.stop?.();
    };
  }, []);

  useEffect(() => {
    if (!showAddMenu) return undefined;
    const handlePointerDown = (evt) => {
      if (!addMenuRef.current) return;
      if (addMenuRef.current.contains(evt.target)) return;
      setShowAddMenu(false);
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [showAddMenu]);

  useEffect(() => {
    const handlePointerDown = (evt) => {
      const root = editorRootRef.current;
      if (!root) return;
      editorActiveRef.current = root.contains(evt.target);
    };
    window.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, []);

  const showStatus = (msg) => {
    setStatusMsg(msg);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatusMsg('');
    }, 2000);
  };

  const { fps, warnings: fpsWarnings } = useMemo(
    () => resolveTimelineFps(hosts),
    [hosts]
  );

  const maxFrame = useMemo(
    () => getTimelineMaxFrame(timelineDraft),
    [timelineDraft]
  );
  const clampedMaxFrame = Math.max(1, maxFrame);
  const durationValue = Number.isFinite(timelineDraft.duration)
    ? timelineDraft.duration
    : '';
  const durationDisplay =
    useTimecodeView && Number.isFinite(timelineDraft.duration)
      ? framesToTimecode(timelineDraft.duration, fps)
      : durationValue;

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

  useEffect(() => {
    setPlayheadFrame((prev) => {
      const next = Number.isFinite(prev) ? prev : 0;
      if (next < 0) return 0;
      if (next > clampedMaxFrame) return clampedMaxFrame;
      return next;
    });
  }, [clampedMaxFrame]);

  useEffect(() => {
    editorPlayheadRef.current = playheadFrame;
  }, [playheadFrame]);

  useEffect(() => {
    if (timecodeEditing) return;
    setTimecodeInput(
      useTimecodeView ? framesToTimecode(playheadFrame, fps) : String(playheadFrame)
    );
  }, [playheadFrame, timecodeEditing, useTimecodeView, fps]);

  useEffect(() => {
    resetInlineDrafts();
  }, [playheadFrame]);

  const trackEntries = useMemo(() => {
    const validRange = (range) => {
      if (!range) return null;
      const min = Number(range.min);
      const max = Number(range.max);
      const step = Number(range.step);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
      return {
        min,
        max,
        step: Number.isFinite(step) && step > 0 ? step : null
      };
    };

    const channelRangeFromUi = (widgetInfo, meta, channelId) => {
      if (!meta || !widgetInfo) return null;
      const ui = widgetInfo.ui || {};

      if (meta.shape === 'vector') {
        return validRange(ui.range) || { min: -10, max: 10, step: 0.1 };
      }

      if (meta.shape === 'joystick') {
        const axisRange =
          channelId === 'x'
            ? validRange(ui.rangeX) || validRange(ui.range)
            : channelId === 'y'
            ? validRange(ui.rangeY) || validRange(ui.range)
            : validRange(ui.range);
        return axisRange || { min: -10, max: 10, step: 0.1 };
      }

      if (meta.shape === 'color') {
        if (channelId === 'a') {
          return validRange(ui.rangeAlpha) || { min: 0, max: 1, step: 0.1 };
        }
        return validRange(ui.range) || { min: 0, max: 1, step: 0.1 };
      }

      if (meta.shape === 'transform') {
        const map = {
          tx: { key: 'rangeLocation', fallback: { min: -1000, max: 1000, step: 1 } },
          ty: { key: 'rangeLocation', fallback: { min: -1000, max: 1000, step: 1 } },
          tz: { key: 'rangeLocation', fallback: { min: -1000, max: 1000, step: 1 } },
          rroll: { key: 'rangeRotation', fallback: { min: -180, max: 180, step: 1 } },
          rpitch: { key: 'rangeRotation', fallback: { min: -180, max: 180, step: 1 } },
          ryaw: { key: 'rangeRotation', fallback: { min: -180, max: 180, step: 1 } },
          sx: { key: 'rangeScale', fallback: { min: 0, max: 10, step: 0.1 } },
          sy: { key: 'rangeScale', fallback: { min: 0, max: 10, step: 0.1 } },
          sz: { key: 'rangeScale', fallback: { min: 0, max: 10, step: 0.1 } }
        };
        const conf = map[channelId];
        if (!conf) return null;
        return validRange(ui[conf.key]) || conf.fallback;
      }

      return null;
    };

    return (timelineDraft.tracks || []).map((track, index) => {
      const widgetInfo = widgetMap.get(track.widgetId);
      const meta = getWidgetValueMeta(widgetInfo);
      const keyframes = Array.isArray(track.keyframes)
        ? [...track.keyframes].sort((a, b) => a.frame - b.frame)
        : [];
      const numericRange =
        meta.kind === 'number' ? getNumericRange(meta, keyframes) : null;
      const rawChannels =
        track?.channels && typeof track.channels === 'object'
          ? track.channels
          : {};
      const channels =
        meta.kind === 'multi' && Array.isArray(meta.channels)
          ? Object.fromEntries(
              meta.channels.map((channel) => [
                channel.id,
                Array.isArray(rawChannels[channel.id])
                  ? [...rawChannels[channel.id]].sort((a, b) => a.frame - b.frame)
                  : []
              ])
            )
          : {};
      const channelRanges =
        meta.kind === 'multi' && Array.isArray(meta.channels)
          ? Object.fromEntries(
              meta.channels.map((channel) => [
                channel.id,
                channelRangeFromUi(widgetInfo, meta, channel.id) ||
                  getNumericRange({ numericKind: 'float' }, channels[channel.id])
              ])
            )
          : {};
      let sharedRange = null;
      if (
        meta.kind === 'multi' &&
        (meta.shape === 'vector' || meta.shape === 'color' || meta.shape === 'joystick')
      ) {
        const firstChannel = meta.channels?.[0]?.id;
        sharedRange =
          (firstChannel && channelRangeFromUi(widgetInfo, meta, firstChannel)) ||
          getNumericRange(
            { numericKind: 'float' },
            Object.values(channels).flat()
          );
      }
      const offset = getTrackOffset(track);
      const scale = getTrackScale(track);
      let localMinFrame =
        meta.kind === 'multi'
          ? getLocalMinFrameFromChannels(channels)
          : getLocalMinFrame(keyframes);
      let localMaxFrame =
        meta.kind === 'multi'
          ? getLocalMaxFrameFromChannels(channels)
          : getLocalMaxFrame(keyframes);
      if (meta.kind === 'multi') {
        const minFromKeyframes = getLocalMinFrame(keyframes);
        if (Number.isFinite(minFromKeyframes)) {
          localMinFrame =
            localMinFrame === null
              ? minFromKeyframes
              : Math.min(localMinFrame, minFromKeyframes);
        }
        const maxFromKeyframes = getLocalMaxFrame(keyframes);
        if (Number.isFinite(maxFromKeyframes)) {
          localMaxFrame =
            localMaxFrame === null
              ? maxFromKeyframes
              : Math.max(localMaxFrame, maxFromKeyframes);
        }
      }
      const hasFrames =
        Number.isFinite(localMinFrame) && Number.isFinite(localMaxFrame);
      if (!hasFrames) {
        localMinFrame = 0;
        localMaxFrame = 0;
      }
      const localDuration = hasFrames
        ? Math.max(0, localMaxFrame - localMinFrame)
        : 0;
      const hasContainer = hasFrames && localDuration > 0;
      return {
        track,
        index,
        widget: widgetInfo,
        meta,
        keyframes,
        numericRange,
        channels,
        channelRanges,
        sharedRange,
        offset,
        scale,
        localMinFrame,
        localMaxFrame,
        localDuration,
        hasFrames,
        hasContainer
      };
    });
  }, [timelineDraft.tracks, widgetMap]);

  useEffect(() => {
    if (!selectedTrackId) return;
    const exists = trackEntries.some((t) => t.track.widgetId === selectedTrackId);
    if (!exists) {
      setSelectedTrackId(trackEntries?.[0]?.track?.widgetId || '');
      setSelectedKey(null);
    }
  }, [trackEntries, selectedTrackId]);

  const selectedTrack =
    trackEntries.find((t) => t.track.widgetId === selectedTrackId) || null;
  const selectedMeta = selectedTrack?.meta || null;
  const selectedKeyframe = useMemo(() => {
    if (!selectedTrack || selectedKey?.trackId !== selectedTrackId) return null;
    if (selectedTrack.meta.kind === 'multi') {
      const channelId = selectedKey?.channelId || selectedChannelId;
      const list = selectedTrack.channels?.[channelId] || [];
      return list[selectedKey?.idx] || null;
    }
    return selectedTrack.keyframes?.[selectedKey?.idx] || null;
  }, [selectedTrack, selectedKey, selectedTrackId, selectedChannelId]);
  const selectedWidget = useMemo(() => {
    return (timelineDraft.widgets || []).find(
      (item) => item.id === selectedTrackId
    ) || null;
  }, [timelineDraft.widgets, selectedTrackId]);
  const selectedKeyframeArgs = useMemo(() => {
    const args =
      selectedKeyframe && typeof selectedKeyframe.args === 'object'
        ? selectedKeyframe.args
        : null;
    if (args) return args;
    const fallback =
      selectedWidget?.binding && typeof selectedWidget.binding.argValues === 'object'
        ? selectedWidget.binding.argValues
        : null;
    return fallback || {};
  }, [selectedKeyframe, selectedWidget]);
  const selectedWidgetType = String(selectedWidget?.type || '').toLowerCase();
  const lockKeyframeTypes =
    !!selectedWidget &&
    (
      KEYFRAME_LOCKED_TYPES.has(selectedWidgetType) ||
      (selectedWidgetType === 'text' && selectedMeta?.kind !== 'number')
    );

  useEffect(() => {
    if (lockKeyframeTypes && keyframeType !== 'constant') {
      applyKeyframeType('constant');
    }
  }, [lockKeyframeTypes]); // keep deps minimal to avoid loops
  const isLinkedSelected = isTrackLinked(selectedTrack);
  const selectedBundle = useMemo(() => {
    if (!isLinkedSelected || !selectedKeyframe) return null;
    const frame = Number(selectedKeyframe.frame);
    if (!Number.isFinite(frame)) return null;
    const items = (selectedTrack.meta.channels || []).map((channel) => {
      const list = selectedTrack.channels?.[channel.id] || [];
      const idx = list.findIndex((kf) => Number(kf?.frame) === frame);
      return {
        channel,
        idx,
        keyframe: idx >= 0 ? list[idx] : null
      };
    });
    return { frame, items };
  }, [isLinkedSelected, selectedKeyframe, selectedTrack]);

  // synchronise le sélecteur d'interpolation avec le/les keyframes sélectionnés
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
  }, [multiSelection, selectedKey, trackEntries]);

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
  }, [selectedTrack, selectedKey, selectedChannelId]);

  useEffect(() => {
    if (!selectedTrack || !selectedKeyframe) {
      setKeyframeFrameDraft('');
      setKeyframeValueDraft('');
      setKeyframeInTanDraft('');
      setKeyframeOutTanDraft('');
      setKeyframeInSpanDraft('');
      setKeyframeOutSpanDraft('');
      return;
    }
    const frameLocal = Number(selectedKeyframe?.frame);
    const frameGlobal =
      Number.isFinite(frameLocal) && selectedTrack
        ? toGlobalFrame(selectedTrack, frameLocal)
        : null;
    const displayFrame =
      Number.isFinite(frameGlobal)
        ? useTimecodeView
          ? framesToTimecode(Math.round(frameGlobal), fps)
          : Math.round(frameGlobal)
        : null;
  setKeyframeFrameDraft(displayFrame !== null ? String(displayFrame) : '');
  setKeyframeInTanDraft(
    Number.isFinite(selectedKeyframe?.inTangent)
      ? String(Math.round(selectedKeyframe.inTangent * 100))
      : '0'
  );
  setKeyframeOutTanDraft(
    Number.isFinite(selectedKeyframe?.outTangent)
      ? String(Math.round(-selectedKeyframe.outTangent * 100))
      : '0'
  );
  setKeyframeInSpanDraft(
    Number.isFinite(selectedKeyframe?.inSpan)
      ? String(Math.round(selectedKeyframe.inSpan / 10))
      : ''
  );
  setKeyframeOutSpanDraft(
    Number.isFinite(selectedKeyframe?.outSpan)
      ? String(Math.round(selectedKeyframe.outSpan / 10))
      : ''
  );
  const meta = selectedTrack.meta;
    if (meta?.kind === 'number') {
      const value = Number(selectedKeyframe?.value);
      setKeyframeValueDraft(
        Number.isFinite(value)
          ? formatInputNumber(value, meta.numericKind)
          : ''
      );
      return;
    }
    if (meta?.kind === 'multi') {
      const value = Number(selectedKeyframe?.value);
      setKeyframeValueDraft(
        Number.isFinite(value) ? formatInputNumber(value, 'float') : ''
      );
      return;
    }
    if (meta?.kind === 'bool') {
      setKeyframeValueDraft(selectedKeyframe?.value ? '1' : '0');
      return;
    }
    if (meta?.kind === 'enum' || meta?.kind === 'text') {
      setKeyframeValueDraft(String(selectedKeyframe?.value ?? ''));
      return;
    }
    setKeyframeValueDraft(String(selectedKeyframe?.value ?? ''));
  }, [selectedTrack, selectedKeyframe, selectedChannelId, useTimecodeView, fps]);

  useEffect(() => {
    if (!selectedBundle) {
      setBundleFrameDraft('');
      setBundleValueDrafts({});
      return;
    }
    const frameLocal = Number(selectedBundle.frame);
    const frameGlobal =
      Number.isFinite(frameLocal) && selectedTrack
        ? toGlobalFrame(selectedTrack, frameLocal)
        : null;
    const displayFrame =
      Number.isFinite(frameGlobal)
        ? useTimecodeView
          ? framesToTimecode(Math.round(frameGlobal), fps)
          : Math.round(frameGlobal)
        : null;
    setBundleFrameDraft(displayFrame !== null ? String(displayFrame) : '');
    const next = {};
    selectedBundle.items.forEach((item) => {
      const channelId = item.channel?.id;
      if (!channelId) return;
      if (!item.keyframe) {
        next[channelId] = '';
        return;
      }
      const valNum = Number(item.keyframe.value);
      next[channelId] = Number.isFinite(valNum)
        ? formatInputNumber(valNum, 'float')
        : String(item.keyframe.value ?? '');
    });
    setBundleValueDrafts(next);
  }, [selectedBundle, selectedTrack, useTimecodeView, fps]);

  // ESC : désélectionner tous les keyframes / bundles
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedKey(null);
        setMultiSelection([]);
        setSelectedTrackId('');
        setSelectedChannelId('');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!isLinkedSelected || selectedMeta?.shape !== 'color' || !selectedBundle) {
      return;
    }
    const getVal = (id, fallback = 0) => {
      const item = selectedBundle.items.find((it) => it.channel?.id === id);
      const val = Number(item?.keyframe?.value);
      return Number.isFinite(val) ? val : fallback;
    };
    const r = getVal('r', 1);
    const g = getVal('g', 1);
    const b = getVal('b', 1);
    const a = getVal('a', 1);
    const hex = rgbToHex(r * 255, g * 255, b * 255);
    setColorPickerState({ hex, alpha: a });
  }, [isLinkedSelected, selectedMeta?.shape, selectedBundle]);

  useEffect(() => {
    if (!selectedKey) return;
    const exists = multiSelection.some((item) => sameKey(item, selectedKey));
    if (!exists) {
      setMultiSelection([selectedKey]);
    }
  }, [multiSelection, selectedKey]);

  const layoutEntries = useMemo(() => {
    return buildTrackLayout(trackEntries, selectedTrackId);
  }, [trackEntries, selectedTrackId]);

  const trackById = useMemo(() => {
    const map = new Map();
    layoutEntries.forEach((entry) => {
      map.set(entry.track.widgetId, entry);
    });
    return map;
  }, [layoutEntries]);

  const trackAreaHeight = layoutEntries.length
    ? layoutEntries[layoutEntries.length - 1].bounds.bottom - GRAPH_TOP
    : TRACK_HEIGHT;
  const graphHeight = GRAPH_TOP + trackAreaHeight + GRAPH_BOTTOM;
  const innerWidth = GRAPH_WIDTH - GRAPH_LEFT - GRAPH_RIGHT;
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
  const clampFrame = (frame) => {
    return Math.max(0, Math.min(clampedMaxFrame, frame));
  };

  const getChannelBounds = (entry, channelId) => {
    if (!entry || entry.meta?.kind !== 'multi') return entry?.bounds || null;
    if (
      entry.meta?.shape === 'vector' ||
      entry.meta?.shape === 'color' ||
      entry.meta?.shape === 'joystick' ||
      entry.meta?.shape === 'transform'
    ) {
      return entry.vectorBounds || entry.bounds;
    }
    const row = (entry.channelRows || []).find(
      (item) => item.channel?.id === channelId
    );
    return row?.bounds || entry.bounds;
  };

  const getWidgetCurrentValue = (w) => {
    if (!w) return null;
    if (w.currentValue !== undefined) return w.currentValue;
    if (w.value !== undefined) return w.value;
    return null;
  };

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

  const handleEditorCue = useCallback(() => {
    editorPlayheadRef.current = 0;
    editorPlayerRef.current?.seek?.(0);
    setPlayheadFrame(0);
    sendLiveFrame(0, { force: true });
  }, [editorPlayheadRef, editorPlayerRef, setPlayheadFrame, sendLiveFrame]);

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

  const { reorderTrackId, handleReorderStart, handleReorderOver, handleReorderEnd } =
    useTrackReorder({
      layoutEntries,
      moveTrack
    });

  const updateKeyframe = (trackId, idx, patch) => {
    updateTrack(trackId, (track) => {
      const list = Array.isArray(track.keyframes) ? [...track.keyframes] : [];
      if (!list[idx]) return track;
      list[idx] = { ...list[idx], ...patch };
      return { ...track, keyframes: list };
    });
  };

  const updateSelectedKeyframeArgs = useCallback(
    (next) => {
      if (!selectedTrack || !selectedKey || selectedKey.idx == null) return;
      const base =
        typeof next === 'function'
          ? next(selectedKeyframeArgs || {})
          : next || {};
      const nextArgs = base && typeof base === 'object' ? { ...base } : {};
      updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, {
        args: nextArgs
      });
    },
    [selectedKey, selectedKeyframeArgs, selectedTrack, updateKeyframe]
  );

  const updateChannelKeyframe = (trackId, channelId, idx, patch) => {
    updateTrack(trackId, (track) => {
      const channels = { ...(track.channels || {}) };
      const list = Array.isArray(channels[channelId])
        ? [...channels[channelId]]
        : [];
      if (!list[idx]) return track;
      list[idx] = { ...list[idx], ...patch };
      channels[channelId] = list;
      return { ...track, channels };
    });
  };

  pointMapRef.current = [];

  const {
    registerPoint,
    handlePointerDown,
    handlePointerUp,
    handleSvgPointerDown,
    updateFromPointer,
    handleClipPointerDown
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
    isFrameTaken
  });

  const {
    handleRemoveKeyframe,
    handleValueChange,
    commitKeyframeFrameDraft,
    commitKeyframeValueDraft,
    pickDefaultValue,
    pickDefaultChannelValue
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
    getWidgetCurrentValue
  });

  const {
    inlineDrafts,
    setInlineDrafts,
    resetInlineDrafts,
    getInlineDraftKey,
    getInlineDraftValue
  } = useInlineDrafts({
    toLocalFrame,
    playheadFrame,
    selectedKey,
    pickDefaultChannelValue,
    sampleNumericValue,
    formatInputNumber
  });

  const {
    addKeyframeFor,
    commitBundleFrameDraft,
    commitBundleValueDraft,
    applyColorToBundle
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
    defaultInterp: keyframeType
  });

  const { handleTimecodeDown, handleTimecodeMove, handleTimecodeUp } =
    usePlayheadDrag({
      timecodeRef,
      clampedMaxFrame,
      fps,
      useTimecodeView,
      framesToTimecode,
      setPlayheadFrame,
      setTimecodeInput
    });

  const { jumpToKeyframeFor, handleKeyControlPointerDown } = useKeyframeNavigation({
    playheadFrame,
    toLocalFrame,
    toGlobalFrame,
    setPlayheadFrame,
    setSelectedChannelId,
    setSelectedTrackId,
    setSelectedKey,
    showStatus
  });

  const onTimecodeDown = (evt) => handleTimecodeDown(evt, timecodeDragRef);
  const onTimecodeMove = (evt) => handleTimecodeMove(evt, timecodeDragRef);
  const onTimecodeUp = (evt) => handleTimecodeUp(evt, timecodeDragRef);

  useEffect(() => {
    const handleKeyDown = (evt) => {
      if (evt.key !== 'Delete') return;
      const target = evt.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const root = editorRootRef.current;
      const activeEl = document.activeElement;
      if (root) {
        const inEditor =
          root.contains(target) ||
          (activeEl && root.contains(activeEl)) ||
          editorActiveRef.current;
        if (!inEditor) return;
      }
      evt.preventDefault();
      if (multiSelection && multiSelection.length > 1) {
        const trackId = multiSelection[0]?.trackId;
        if (trackId) {
          updateTrack(trackId, (track) => {
            const next = { ...track };
            const isMulti = track.meta?.kind === 'multi';
            if (isMulti) {
              const grouped = {};
              multiSelection.forEach((sel) => {
                if (!sel || sel.channelId === null || sel.channelId === undefined) return;
                grouped[sel.channelId] = grouped[sel.channelId] || [];
                grouped[sel.channelId].push(sel.idx);
              });
              Object.entries(grouped).forEach(([cid, idxs]) => {
                const list = Array.isArray(next.channels?.[cid]) ? [...next.channels[cid]] : [];
                idxs
                  .filter((i) => i >= 0 && i < list.length)
                  .sort((a, b) => b - a)
                  .forEach((i) => {
                    list.splice(i, 1);
                  });
                if (!next.channels) next.channels = {};
                next.channels[cid] = list;
              });
            } else {
              const list = Array.isArray(track.keyframes) ? [...track.keyframes] : [];
              multiSelection
                .map((sel) => sel?.idx)
                .filter((i) => Number.isInteger(i) && i >= 0 && i < list.length)
                .sort((a, b) => b - a)
                .forEach((i) => list.splice(i, 1));
              next.keyframes = list;
            }
            return next;
          });
        }
        setSelectedKey(null);
        setMultiSelection([]);
      } else if (selectedKeyframe) {
        handleRemoveKeyframe();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRemoveKeyframe, selectedKeyframe, multiSelection, updateTrack]);

  const addChannelKeyframeAt = (channelId, frame) => {
    if (!selectedTrack || !selectedBundle || !channelId) return;
    updateTrack(selectedTrack.track.widgetId, (track) => {
      const channels = { ...(track.channels || {}) };
      const list = Array.isArray(channels[channelId]) ? [...channels[channelId]] : [];
      const existingIdx = findFrameIndex(list, frame);
      if (existingIdx >= 0) return track;
      const sourceList = Array.isArray(selectedTrack.channels?.[channelId])
        ? [...selectedTrack.channels[channelId]].sort((a, b) => a.frame - b.frame)
        : [];
      let value = sampleNumericValue(sourceList, frame);
      if (!Number.isFinite(value)) {
        value = pickDefaultChannelValue(selectedTrack, channelId, frame);
      }
      list.push({ frame, value, interp: keyframeType });
      list.sort((a, b) => a.frame - b.frame);
      channels[channelId] = list;
      return { ...track, channels };
    });
    // ciblage du nouveau keyframe pour la sélection
    const list = selectedTrack.channels?.[channelId] || [];
    const idx = findFrameIndex(list, frame);
    const nextIdx = idx >= 0 ? idx : list.length;
    setSelectedKey({
      trackId: selectedTrack.track.widgetId,
      channelId,
      idx: nextIdx
    });
  };

  const removeChannelKeyframeAt = (channelId, idx) => {
    if (!selectedTrack || selectedTrack.meta.kind !== 'multi') return;
    updateTrack(selectedTrack.track.widgetId, (track) => {
      const channels = { ...(track.channels || {}) };
      const list = Array.isArray(channels[channelId]) ? [...channels[channelId]] : [];
      if (!list[idx]) return track;
      list.splice(idx, 1);
      channels[channelId] = list;
      return { ...track, channels };
    });
    setSelectedKey(null);
  };

  const handleInlineChannelValueChange = (
    entry,
    channelId,
    raw,
    options = {}
  ) => {
    if (!entry || !channelId) return;
    if (raw === '') return;
    const sanitized = String(raw).trim().replace(/,/g, '.');
    if (!sanitized || sanitized === '-' || sanitized === '.') return;
    const next = Number(sanitized);
    if (!Number.isFinite(next)) return;
    const useSelected =
      (options.useSelected ||
        (selectedKey &&
          selectedKey.trackId === entry.track.widgetId &&
          selectedKey.channelId === channelId &&
          Number.isFinite(selectedKey.idx))) &&
      selectedKey;
    const list = entry.channels?.[channelId] || [];
    const range =
      entry.sharedRange && (entry.meta?.shape === 'vector' || entry.meta?.shape === 'color' || entry.meta?.shape === 'joystick')
        ? entry.sharedRange
        : entry.channelRanges?.[channelId] ||
          getNumericRange({ numericKind: 'float' }, list);
    const coerced = coerceNumericValue(next, { numericKind: 'float' }, range);
    if (coerced === null) {
      showStatus('Valeur hors limite.');
      return;
    }
    if (useSelected) {
      updateChannelKeyframe(entry.track.widgetId, channelId, selectedKey.idx, {
        value: coerced
      });
      return;
    }
    const playhead = Number.isFinite(playheadFrame) ? Math.round(playheadFrame) : 0;
    let nextIndex = null;
    updateTrack(entry.track.widgetId, (track) => {
      const shiftInfo = getShiftedLocalFrame(track, playhead);
      if (!shiftInfo) return track;
      const { offset, scale, localFrame: _localFrame, shiftFrames } = shiftInfo;
      const localFrameRounded = toLocalFrameRounded(track, playhead);
      const baseTrack = shiftTrackKeyframes(track, shiftFrames, offset, scale);
      const channels =
        baseTrack.channels && typeof baseTrack.channels === 'object'
          ? { ...baseTrack.channels }
          : {};
      const nextList = Array.isArray(channels[channelId])
        ? [...channels[channelId]]
        : [];
      const idx = findFrameIndex(nextList, localFrameRounded);
      nextIndex = idx >= 0 ? idx : nextList.length;
      if (idx >= 0 && nextList[idx]) {
        nextList[idx] = { ...nextList[idx], frame: localFrameRounded, value: coerced };
      } else {
        nextList.push({ frame: localFrameRounded, value: coerced, interp: keyframeType });
      }
      channels[channelId] = nextList;
      return { ...baseTrack, channels };
    });
    if (nextIndex === null) return;
    setSelectedTrackId(entry.track.widgetId);
    setSelectedChannelId(channelId);
    setSelectedKey({
      trackId: entry.track.widgetId,
      channelId,
      idx: nextIndex
    });
  };

  const handleDurationChange = (raw) => {
    const value = String(raw ?? '').trim();
    if (!value) {
      setTimelineDraft((prev) => {
        if (!('duration' in prev)) return prev;
        const next = { ...prev };
        delete next.duration;
        return next;
      });
      return;
    }
    let frame = null;
    if (useTimecodeView) {
      const tcFrames = parseTcShorthand(value, fps, 0, false);
      if (tcFrames === null) return;
      frame = tcFrames;
    } else {
      const next = Number(value);
      if (!Number.isFinite(next)) return;
      frame = Math.max(0, Math.round(next));
    }
    setTimelineDraft((prev) => ({ ...prev, duration: frame }));
  };

  const handleBezierTangentChange = (dir, raw) => {
    if (!selectedTrack || !selectedKeyframe) return;
    const val = Number(String(raw ?? '').trim().replace(/,/g, '.'));
    if (!Number.isFinite(val)) return;
    const intVal = Math.round(val);
    const stored = (dir === 'out' ? -intVal : intVal) / 100;
    if (selectedTrack.meta.kind === 'multi') {
      const channelId = selectedKey?.channelId || selectedChannelId;
      if (!channelId) return;
      updateChannelKeyframe(selectedTrack.track.widgetId, channelId, selectedKey.idx, {
        [dir === 'in' ? 'inTangent' : 'outTangent']: stored
      });
    } else {
      updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, {
        [dir === 'in' ? 'inTangent' : 'outTangent']: stored
      });
    }
    if (dir === 'in') setKeyframeInTanDraft(String(intVal));
    else setKeyframeOutTanDraft(String(intVal));
  };

  const handleBezierSpanChange = (dir, raw) => {
    if (!selectedTrack || !selectedKeyframe) return;
    const val = Number(String(raw ?? '').trim().replace(/,/g, '.'));
    if (!Number.isFinite(val)) return;
    const intVal = Math.max(0, Math.round(val));
    const stored = intVal * 10; // plus sensible en interne
    if (selectedTrack.meta.kind === 'multi') {
      const channelId = selectedKey?.channelId || selectedChannelId;
      if (!channelId) return;
      updateChannelKeyframe(selectedTrack.track.widgetId, channelId, selectedKey.idx, {
        [dir === 'in' ? 'inSpan' : 'outSpan']: stored
      });
    } else {
      updateKeyframe(selectedTrack.track.widgetId, selectedKey.idx, {
        [dir === 'in' ? 'inSpan' : 'outSpan']: stored
      });
    }
    if (dir === 'in') setKeyframeInSpanDraft(String(intVal));
    else setKeyframeOutSpanDraft(String(intVal));
  };

  const applyKeyframeType = (type) => {
    setKeyframeType(type);
    const targets =
      (multiSelection && multiSelection.length) ? multiSelection : (selectedKey ? [selectedKey] : []);
    if (!targets.length) return;
    const grouped = targets.reduce((acc, sel) => {
      if (!sel || sel.idx === null || sel.idx === undefined || !sel.trackId) return acc;
      const key = sel.channelId ?? '_single';
      acc[sel.trackId] = acc[sel.trackId] || {};
      acc[sel.trackId][key] = acc[sel.trackId][key]
        ? [...acc[sel.trackId][key], sel.idx]
        : [sel.idx];
      return acc;
    }, {});
    Object.entries(grouped).forEach(([trackId, perChan]) => {
      updateTrack(trackId, (track) => {
        let changed = false;
        const nextTrack = { ...track };
        const cleanKeyframe = (kf) => {
          if (!kf) return kf;
          if (type === 'bezier') {
            if (!Number.isFinite(kf.inTangent)) kf.inTangent = 0;
            if (!Number.isFinite(kf.outTangent)) kf.outTangent = 0;
            // spans optional, leave undefined for auto
          } else {
            delete kf.inTangent;
            delete kf.outTangent;
            delete kf.inSpan;
            delete kf.outSpan;
          }
          kf.interp = type;
          return kf;
        };
        if (perChan._single && Array.isArray(track.keyframes)) {
          const list = [...track.keyframes];
          perChan._single.forEach((idx) => {
            if (!list[idx]) return;
            list[idx] = cleanKeyframe({ ...list[idx] });
            changed = true;
          });
          if (changed) nextTrack.keyframes = list;
        }
        Object.entries(perChan).forEach(([cid, idxs]) => {
          if (cid === '_single') return;
          const baseList = Array.isArray(track.channels?.[cid]) ? [...track.channels[cid]] : null;
          if (!baseList) return;
          let chanChanged = false;
          idxs.forEach((idx) => {
            if (!baseList[idx]) return;
            baseList[idx] = cleanKeyframe({ ...baseList[idx] });
            chanChanged = true;
            changed = true;
          });
          if (chanChanged) {
            nextTrack.channels = { ...(nextTrack.channels || {}), [cid]: baseList };
          }
        });
        return changed ? nextTrack : track;
      });
    });
  };

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

  const handleZoomOut = useCallback(() => {
    setZoomFactor((z) => Math.max(1, z / 1.25));
    setViewStart((prev) => clampViewStart(prev));
  }, [setZoomFactor, setViewStart, clampViewStart]);

  const handleZoomIn = useCallback(() => {
    setZoomFactor((z) => Math.min(30, z * 1.25));
  }, [setZoomFactor]);

  const handleZoomCenter = useCallback(
    (frame) => {
      const newStart = clampViewStart(frame - viewFrames / 2);
      setViewStart(newStart);
    },
    [clampViewStart, viewFrames, setViewStart]
  );
  const handleTimelineHeaderLabelChange = useCallback(
    (nextLabel) => {
      updateWidget?.(widget.id, { label: nextLabel });
    },
    [updateWidget, widget.id]
  );
  const handleTimelineModeChange = useCallback(
    (nextMode) => {
      setTimelineDraft((prev) => ({ ...prev, mode: nextMode }));
    },
    [setTimelineDraft]
  );

  const timelineHeaderControlsProps = buildTimelineHeaderControlsProps({
    t,
    addMenuRef,
    showAddMenu,
    setShowAddMenu,
    typeOptions,
    onAddTrackType: handleAddTrackType,
    label: widget.label ?? '',
    onLabelChange: handleTimelineHeaderLabelChange,
    zoomFactor,
    onZoomOut: handleZoomOut,
    onZoomIn: handleZoomIn,
    mode,
    onModeChange: handleTimelineModeChange,
  });

  const timelineInspectorProps = buildTimelineInspectorProps({
    t,
    timelineWidgetId: widget.id,
    layoutId,
    selectedTrackId,
    selectedWidget,
    selectedTrack,
    selectedMeta,
    selectedKeyframe,
    selectedKeyframeArgs,
    selectedKey,
    selectedChannelId,
    selectedBundle,
    isLinkedSelected,
    useTimecodeView,
    playheadFrame,
    bundleFrameDraft,
    setBundleFrameDraft,
    commitBundleFrameDraft,
    bundleValueDrafts,
    setBundleValueDrafts,
    commitBundleValueDraft,
    removeChannelKeyframeAt,
    addChannelKeyframeAt,
    keyframeFrameDraft,
    setKeyframeFrameDraft,
    commitKeyframeFrameDraft,
    keyframeValueDraft,
    setKeyframeValueDraft,
    commitKeyframeValueDraft,
    handleRemoveKeyframe,
    handleValueChange,
    applyColorToBundle,
    colorPickerState,
    colorPickerOpen,
    setColorPickerOpen,
    argColorPicker,
    setArgColorPicker,
    presetData,
    updateSelectedBinding,
    updateSelectedWidget,
    updateSelectedKeyframeArgs,
    hosts,
    syncTimelineWidgetTargets,
    colorClass,
    browseFileInputRef,
  });

  const timelineGraphSectionProps = buildTimelineGraphSectionProps({
    fps,
    fpsWarnings,
    timecodeInput,
    setTimecodeInput,
    timecodeEditing,
    setTimecodeEditing,
    commitTimecodeInput,
    useTimecodeView,
    toggleTimecodeView,
    timecodeRef,
    clampedMaxFrame,
    playheadFrame,
    framesToTimecode,
    onTimecodeDown,
    onTimecodeMove,
    onTimecodeUp,
    graphLeft: GRAPH_LEFT,
    graphRight: GRAPH_RIGHT,
    graphWidth: GRAPH_WIDTH,
    viewStart,
    viewFrames,
    onViewportPointerDown: handleViewportPointerDown,
    svgRef,
    graphHeight,
    innerWidth,
    trackAreaHeight,
    frameLines,
    layoutEntries,
    xTicks,
    selectedTrackId,
    selectedKey,
    frameToX,
    toGlobalFrame,
    getChannelBounds,
    getChannelColor,
    getTrackValueSummary,
    getInlineDraftValue,
    getInlineDraftKey,
    getNumericRange,
    formatNumber,
    shouldRenderSquare,
    renderCollapseToggle,
    renderHeaderRow,
    renderKeyControls,
    shouldShowEye,
    isCurveHidden,
    toggleCurveVisibility,
    registerPoint,
    handleSvgPointerDown,
    updateFromPointer,
    handlePointerUp,
    handleClipPointerDown,
    handlePointerDown,
    onWheel: handleWheel,
    setSelectedTrackId,
    setSelectedChannelId,
    setSelectedKey,
    handleInlineChannelValueChange,
    inlineDrafts,
    setInlineDrafts,
    multiSelection,
    SQUARE_POINT_KINDS,
    lassoBox,
    CHANNEL_ROW_HEIGHT,
    GRAPH_TOP,
    MIN_CLIP_PX,
    LABEL_RIGHT_X,
    getWidgetLabel,
  });

  const timelineToolbarProps = buildTimelineToolbarProps({
    editorPlaying,
    editorPaused,
    keyframeType,
    hideKeyframeTypes: lockKeyframeTypes,
    onKeyframeTypeChange: applyKeyframeType,
    zoomFactor,
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onZoomCenter: handleZoomCenter,
    keyframeInTanDraft,
    keyframeOutTanDraft,
    onBezierTangentChange: handleBezierTangentChange,
    keyframeInSpanDraft,
    keyframeOutSpanDraft,
    onBezierSpanChange: handleBezierSpanChange,
    handleEditorCue,
    handleEditorPlay,
    handleEditorPause,
    handleEditorContinue,
    handleEditorStop,
    handleEditorStep,
    useTimecodeView,
    durationDisplay,
    handleDurationChange,
    t,
  });

  return (
    <div className="uu-timeline-widget" ref={editorRootRef}>
      {statusMsg && <div className="uu-alert uu-alert-error">{statusMsg}</div>}

      <div className="uu-timeline-section">
        <TimelineEditorHeaderControls {...timelineHeaderControlsProps} />

        <TimelineGraphSection {...timelineGraphSectionProps} />

      {/* Bottom range removed per request; viewport is draggable via purple window in top bar */}

      <TimelineToolbar {...timelineToolbarProps} />
    </div>

      <TimelineInspector {...timelineInspectorProps} />
    </div>
  );
}
