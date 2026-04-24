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
  createTimelinePlayer,
  getNumericRange,
  getTimelineMaxFrame,
  getWidgetValueMeta,
  normalizeTimeline,
  resolveTimelineFps,
  sampleDiscreteValue,
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
import { TimelineToolbar } from './TimelineToolbar.jsx';
import { TimelineTracks } from './TimelineTracks.jsx';
import { TimelineInspector } from './TimelineInspector.jsx';
import { TimelineTimecodeBar } from './TimelineTimecodeBar.jsx';
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
  KEY_EYE_GAP,
  KEY_EYE_BOX,
  COLLAPSE_BTN_SIZE,
  LINKABLE_MULTI_SHAPES,
  SQUARE_POINT_KINDS,
  LABEL_RIGHT_X,
  COLLAPSE_X,
  KEY_CONTROL_START_X,
  KEY_CONTROL_GAP,
  KEY_VALUE_WIDTH,
  KEY_VALUE_HEIGHT,
  KEY_VALUE_OFFSET_Y,
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
  // backward-compatible alias for extracted TimelineTracks props
  const setSelectedKeyframeValueDraft = setKeyframeValueDraft;
  const [bundleFrameDraft, setBundleFrameDraft] = useState('');
  const [bundleValueDrafts, setBundleValueDrafts] = useState({});
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [lassoBox, setLassoBox] = useState(null);
  // backward-compatible alias for extracted TimelineTracks props
  const setSelectionBox = setLassoBox;
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

  const getLocalMaxFrame = (keyframes) => {
    let max = null;
    (keyframes || []).forEach((kf) => {
      const frame = Number(kf?.frame);
      if (!Number.isFinite(frame)) return;
      max = max === null ? frame : Math.max(max, frame);
    });
    return max;
  };

  const getLocalMinFrame = (keyframes) => {
    let min = null;
    (keyframes || []).forEach((kf) => {
      const frame = Number(kf?.frame);
      if (!Number.isFinite(frame)) return;
      min = min === null ? frame : Math.min(min, frame);
    });
    return min;
  };

  const getLocalMaxFrameFromChannels = (channels) => {
    if (!channels) return null;
    let max = null;
    Object.values(channels).forEach((list) => {
      if (!Array.isArray(list)) return;
      const localMax = getLocalMaxFrame(list);
      if (!Number.isFinite(localMax)) return;
      max = max === null ? localMax : Math.max(max, localMax);
    });
    return max;
  };

  const getLocalMinFrameFromChannels = (channels) => {
    if (!channels) return null;
    let min = null;
    Object.values(channels).forEach((list) => {
      if (!Array.isArray(list)) return;
      const localMin = getLocalMinFrame(list);
      if (!Number.isFinite(localMin)) return;
      min = min === null ? localMin : Math.min(min, localMin);
    });
    return min;
  };

  const getChannelValueAt = (entry, channelId, localFrame) => {
    const list = entry.channels?.[channelId] || [];
    if (!list.length) return null;
    const value = sampleNumericValue(list, localFrame);
    return Number.isFinite(value) ? value : null;
  };

  const isLinkableEntry = (entry) => {
    if (!entry) return false;
    const shape = String(entry.meta?.shape || '').toLowerCase();
    return entry.meta?.kind === 'multi' && LINKABLE_MULTI_SHAPES.has(shape);
  };

  const isTrackLinked = (entry) => {
    if (!isLinkableEntry(entry)) return false;
    return !!entry.track?.linkChannels;
  };

  const getTrackValueSummary = (entry) => {
    const localFrame = toLocalFrame(entry, playheadFrame);
    if (!Number.isFinite(localFrame)) return '';

    if (entry.meta.kind === 'number') {
      const value = sampleNumericValue(entry.keyframes || [], localFrame);
      if (!Number.isFinite(value)) return '';
      return formatNumber(value, entry.meta.numericKind);
    }

    if (entry.meta.kind === 'multi') {
      const channels = Array.isArray(entry.meta.channels)
        ? entry.meta.channels
        : [];
      if (!channels.length) return '';
      const hasChannelData = channels.some(
        (channel) => (entry.channels?.[channel.id] || []).length
      );
      if (!hasChannelData) return '';
      if (
        entry.meta.shape === 'vector' ||
        entry.meta.shape === 'color' ||
        entry.meta.shape === 'joystick'
      ) {
        const parts = channels.map((channel) => {
          const value = getChannelValueAt(entry, channel.id, localFrame);
          const label = channel.label || channel.id;
          const display = value === null ? '-' : formatNumber(value, 'float');
          return `${label}:${display}`;
        });
        return parts.join(' ');
      }
      if (entry.meta.shape === 'transform') {
        const getVal = (id) => {
          const value = getChannelValueAt(entry, id, localFrame);
          return value === null ? '-' : formatNumber(value, 'float');
        };
        return `T(${getVal('tx')},${getVal('ty')},${getVal('tz')}) R(${getVal('rroll')},${getVal('rpitch')},${getVal('ryaw')}) S(${getVal('sx')},${getVal('sy')},${getVal('sz')})`;
      }
    }

    if (entry.meta.kind === 'bool') {
      const value = sampleDiscreteValue(entry.keyframes || [], localFrame);
      if (value === null || value === undefined) return '';
      return value ? 'On' : 'Off';
    }

    if (
      entry.meta.kind === 'text' ||
      entry.meta.kind === 'color' ||
      entry.meta.kind === 'enum'
    ) {
      const value = sampleDiscreteValue(entry.keyframes || [], localFrame);
      if (value === null || value === undefined) return '';
      return String(value);
    }

    return '';
  };

  const getCurrentValueDisplay = (entry, channelId = null) => {
    if (!entry) return '-';
    const localFrame = toLocalFrame(entry, playheadFrame);
    if (!Number.isFinite(localFrame)) return '-';

    if (entry.meta.kind === 'multi') {
      const effectiveChannelId =
        channelId || entry.meta.channels?.[0]?.id || '';
      if (!effectiveChannelId) return '-';
      const value = getChannelValueAt(entry, effectiveChannelId, localFrame);
      return value === null ? '-' : formatNumber(value, 'float');
    }

    if (entry.meta.kind === 'number') {
      const value = sampleNumericValue(entry.keyframes || [], localFrame);
      return Number.isFinite(value)
        ? formatNumber(value, entry.meta.numericKind)
        : '-';
    }

    if (entry.meta.kind === 'bool') {
      const value = sampleDiscreteValue(entry.keyframes || [], localFrame);
      if (value === null || value === undefined) return '-';
      return value ? 'On' : 'Off';
    }

    if (
      entry.meta.kind === 'text' ||
      entry.meta.kind === 'color' ||
      entry.meta.kind === 'enum'
    ) {
      const value = sampleDiscreteValue(entry.keyframes || [], localFrame);
      if (value === null || value === undefined) return '-';
      return String(value);
    }

    return '-';
  };

  const shouldRenderSquare = (entry) => {
    if (!entry) return false;
    return SQUARE_POINT_KINDS.has(entry.meta.kind);
  };

  const shouldShowEye = (entry) => {
    if (!entry) return false;
    if (entry.meta.kind === 'multi') {
      const count = Array.isArray(entry.meta.channels)
        ? entry.meta.channels.length
        : 0;
      return count > 1;
    }
    if (entry.meta.kind === 'color') return true;
    if (entry.meta.kind === 'object' && entry.meta.shape === 'joystick') {
      return true;
    }
    return false;
  };

  const isCurveHidden = (entry, channelId = null) => {
    if (!entry) return false;
    if (entry.meta.kind === 'multi') {
      const hidden = entry.track.hiddenChannels || {};
      return !!hidden[channelId];
    }
    return !!entry.track.hidden;
  };

  const toggleCurveVisibility = (entry, channelId = null) => {
    if (!entry) return;
    updateTrack(entry.track.widgetId, (track) => {
      if (entry.meta.kind === 'multi') {
        const hiddenChannels = { ...(track.hiddenChannels || {}) };
        if (hiddenChannels[channelId]) {
          delete hiddenChannels[channelId];
        } else {
          hiddenChannels[channelId] = true;
        }
        return { ...track, hiddenChannels };
      }
      return { ...track, hidden: !track.hidden };
    });
  };

  const getTargetPastilles = (timelineWidget) => {
    const targets = timelineWidget?.targets || {};
    return Object.entries(targets)
      .filter(([, enabled]) => enabled)
      .map(([ip]) => ({
        ip,
        className: colorClass(hostColorMap.get(ip) || '')
      }));
  };

  const widgetMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(timelineDraft.widgets) ? timelineDraft.widgets : [])
      .filter((w) => w && w.id)
      .forEach((w) => map.set(w.id, w));
    return map;
  }, [timelineDraft.widgets]);

  const hostColorMap = useMemo(() => {
    const map = new Map();
    (hosts || []).forEach((host) => {
      if (!host?.ip) return;
      map.set(host.ip, host.color || '');
    });
    return map;
  }, [hosts]);

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

  const startEditorPlayback = (requestedStartFrame, initialDirection = 1) => {
    if (fpsWarnings.includes('missing')) {
      showStatus('FPS manquant sur la station serveur.');
      return;
    }
    if (!timelineDraft.tracks || timelineDraft.tracks.length === 0) {
      showStatus('Aucune piste.');
      return;
    }

    let startFrame = Number.isFinite(requestedStartFrame)
      ? requestedStartFrame
      : 0;
    if (timelineDraft.mode === 'single' && startFrame >= maxFrame) {
      startFrame = 0;
    }

    editorPlayerRef.current?.stop?.();
    editorPausedRef.current = false;
    setEditorPaused(false);
    editorPlayheadRef.current = startFrame;
    setPlayheadFrame(startFrame);
    editorDirectionRef.current = initialDirection || 1;
    const player = createTimelinePlayer({
      timeline: timelineDraft,
      widgets: Array.isArray(timelineDraft.widgets) ? timelineDraft.widgets : [],
      hosts,
      common,
      fps,
      startFrame,
      onFrame: (frame) => {
        editorPlayheadRef.current = frame;
        setPlayheadFrame(frame);
      },
      onError: (err) => {
        if (err?.type === 'fps') showStatus('FPS invalide.');
        if (err?.type === 'parse') showStatus('Valeur JSON invalide.');
        if (err?.type === 'transform') showStatus('Valeur Transform invalide.');
        if (err?.type === 'value') showStatus('Valeur hors limite.');
      },
      onStop: () => {
        setEditorPlaying(false);
        if (!editorPausedRef.current) setEditorPaused(false);
      },
      onBoundaryPause: (dir, frameAtBoundary) => {
        editorDirectionRef.current = dir;
        editorPlayheadRef.current = frameAtBoundary;
        setPlayheadFrame(frameAtBoundary);
        editorPausedRef.current = true;
        setEditorPlaying(false);
        setEditorPaused(true);
        boundaryRef.current = dir < 0 ? 'end' : 'start';
      },
      initialDirection
    });
    editorPlayerRef.current = player;
    setEditorPlaying(true);
    player.start();
  };

  const handleEditorPlay = () => {
    editorDirectionRef.current = 1;
    startEditorPlayback(0, 1);
  };

  const handleEditorPause = () => {
    if (!editorPlaying) return;
    editorPausedRef.current = true;
    editorPlayerRef.current?.pause?.();
    setEditorPlaying(false);
    setEditorPaused(true);
  };

  const handleEditorContinue = () => {
    if (editorPlaying) return;
    let dir = editorDirectionRef.current || 1;
    let startF = editorPlayheadRef.current || 0;
    if (timelineDraft.mode === 'flipstopflop') {
      if (boundaryRef.current === 'end') {
        dir = -1;
        startF = Math.max(0, clampedMaxFrame - 1);
      } else if (boundaryRef.current === 'start') {
        dir = 1;
        startF = Math.min(clampedMaxFrame, 1);
      }
      boundaryRef.current = null;
    }
    editorPausedRef.current = false;
    setEditorPaused(false);
    startEditorPlayback(startF, dir);
  };

  const handleEditorStop = () => {
    editorPausedRef.current = false;
    editorPlayerRef.current?.stop?.();
    editorPlayerRef.current?.seek?.(0);
    editorPlayheadRef.current = 0;
    setPlayheadFrame(0);
    setEditorPlaying(false);
    setEditorPaused(false);
  };

  const handleEditorCue = () => {
    editorPlayheadRef.current = 0;
    editorPlayerRef.current?.seek?.(0);
    setPlayheadFrame(0);
    sendLiveFrame(0, { force: true });
  };

  const handleEditorStep = (delta) => {
    if (editorPlaying) return;
    setPlayheadFrame((prev) => {
      const base = Number.isFinite(prev) ? prev : 0;
      const next = Math.max(0, Math.min(clampedMaxFrame, base + delta));
      editorPlayheadRef.current = next;
      editorPlayerRef.current?.seek?.(next);
      return next;
    });
  };

  const commitTimecodeInput = (raw) => {
    const value = String(raw ?? '').trim();
    if (!value) {
      setTimecodeInput(useTimecodeView ? framesToTimecode(playheadFrame, fps) : String(playheadFrame));
      return;
    }
    let next = null;
    if (useTimecodeView) {
      // Support shorthand & deltas
      const frames = parseTcShorthand(value, fps, playheadFrame, true);
      if (frames === null) {
        setTimecodeInput(framesToTimecode(playheadFrame, fps));
        return;
      }
      next = frames;
    } else {
      if (/^[+-]/.test(value)) {
        const delta = Number(value);
        if (!Number.isFinite(delta)) {
          setTimecodeInput(String(playheadFrame));
          return;
        }
        next = Math.round(playheadFrame + delta);
      } else {
        const absolute = Number(value);
        if (!Number.isFinite(absolute)) {
          setTimecodeInput(String(playheadFrame));
          return;
        }
        next = Math.round(absolute);
      }
    }
    const clamped = clampFrame(next);
    editorPlayheadRef.current = clamped;
    editorPlayerRef.current?.seek?.(clamped);
    setPlayheadFrame(clamped);
    setTimecodeInput(useTimecodeView ? framesToTimecode(clamped, fps) : String(clamped));
  };

  const toggleTimecodeView = () => {
    setUseTimecodeView((prev) => {
      const next = !prev;
      setTimecodeInput(
        next ? framesToTimecode(playheadFrame, fps) : String(playheadFrame)
      );
      return next;
    });
  };

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


  const viewFrames = useMemo(() => {
    const base = Math.max(10, clampedMaxFrame || 10);
    return Math.max(10, Math.round(base / zoomFactor));
  }, [clampedMaxFrame, zoomFactor]);

  const clampViewStart = useCallback(
    (start) => {
      const maxStart = Math.max(0, clampedMaxFrame - viewFrames);
      if (!Number.isFinite(start)) return 0;
      return Math.min(Math.max(0, start), maxStart);
    },
    [clampedMaxFrame, viewFrames]
  );

  useEffect(() => {
    setViewStart((prev) => clampViewStart(prev));
  }, [clampedMaxFrame, viewFrames, clampViewStart]);

  const applyZoom = useCallback(
    (centerFrame, factor) => {
    const nextZoom = Math.min(30, Math.max(1, zoomFactor * factor));
      const prevViewFrames = viewFrames;
      const nextViewFrames = Math.max(10, (clampedMaxFrame || 10) / nextZoom);
      const ratio =
        prevViewFrames > 0 ? (centerFrame - viewStart) / prevViewFrames : 0.5;
      const nextStart = clampViewStart(centerFrame - ratio * nextViewFrames);
      setZoomFactor(nextZoom);
      setViewStart(nextStart);
    },
    [zoomFactor, viewFrames, viewStart, clampedMaxFrame, clampViewStart]
  );

  const trackAreaHeight = layoutEntries.length
    ? layoutEntries[layoutEntries.length - 1].bounds.bottom - GRAPH_TOP
    : TRACK_HEIGHT;
  const graphHeight = GRAPH_TOP + trackAreaHeight + GRAPH_BOTTOM;
  const innerWidth = GRAPH_WIDTH - GRAPH_LEFT - GRAPH_RIGHT;
  const clampFrame = (frame) => {
    return Math.max(0, Math.min(clampedMaxFrame, frame));
  };

  const frameToX = (frame) => {
    const ratio = viewFrames ? (frame - viewStart) / viewFrames : 0;
    return GRAPH_LEFT + ratio * innerWidth;
  };

  const xToFrame = (x) => {
    const clampedX = Math.min(
      GRAPH_WIDTH - GRAPH_RIGHT,
      Math.max(GRAPH_LEFT, x)
    );
    const ratio = innerWidth > 0 ? (clampedX - GRAPH_LEFT) / innerWidth : 0;
    return viewStart + ratio * viewFrames;
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
  const getLiveSignature = useCallback(() => {
    const hostSig = (hosts || [])
      .map((h) => h && h.ip)
      .filter(Boolean)
      .join('|');
    return `${hostSig}::${JSON.stringify(timelineDraft)}`;
  }, [hosts, timelineDraft]);

  const ensureLivePlayer = useCallback(
    (frame) => {
      const sig = getLiveSignature();
      if (livePlayerRef.current && liveSigRef.current === sig) return;
      livePlayerRef.current?.stop?.();
      try {
        const timeline = normalizeTimeline(timelineDraft);
        const innerWidgets = Array.isArray(timeline.widgets) ? timeline.widgets : [];
        if (!innerWidgets.length) {
          livePlayerRef.current = null;
          liveSigRef.current = '';
          return;
        }
        const { fps: liveFps } = resolveTimelineFps(hosts);
        livePlayerRef.current = createTimelinePlayer({
          timeline,
          widgets: innerWidgets,
          hosts,
          common,
          fps: liveFps,
          startFrame: Number.isFinite(frame) ? frame : 0,
          onError: () => {},
        });
        liveSigRef.current = sig;
      } catch {
        livePlayerRef.current = null;
        liveSigRef.current = '';
      }
    },
    [timelineDraft, hosts, common, getLiveSignature]
  );

  const sendLiveFrame = useCallback(
    (frame, { force = false } = {}) => {
      const now = Date.now();
      if (!force && now - liveThrottleRef.current < 80) return; // ~12.5 fps
      liveThrottleRef.current = now;
      if (!hosts || !hosts.length || !common) return;
      ensureLivePlayer(frame);
      if (!livePlayerRef.current) return;
      try {
        livePlayerRef.current.seek?.(Math.max(0, Math.round(frame)), {
          triggerEvents: true,
          eventMode: 'state',
          forceEvents: force,
        });
      } catch {
        // ignore live preview errors
      }
    },
    [hosts, common, ensureLivePlayer]
  );

  useEffect(() => {
    sendLiveFrame(playheadFrame);
  }, [playheadFrame, sendLiveFrame]);

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
    getInlineDraftChannelKey,
    getInlineChannelValue,
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

  const xTicks = useMemo(() => {
    const cols = GRID_COLS || 10;
    return Array.from({ length: cols + 1 }).map((_, i) => {
      const ratio = cols ? i / cols : 0;
      const frame = Math.round(viewStart + ratio * viewFrames);
      return {
        x: GRAPH_LEFT + ratio * innerWidth,
        label: String(frame)
      };
    });
  }, [innerWidth, viewFrames, viewStart]);

  const frameLines = useMemo(() => {
    const count = Math.max(0, Math.round(viewFrames));
    if (count <= 1) return [];
    const start = Math.round(viewStart);
    return Array.from({ length: count - 1 }, (_, i) => start + i + 1);
  }, [viewFrames, viewStart]);

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

  const handleViewportDrag = useCallback(
    (evt) => {
      const drag = viewportDragRef.current;
      if (!drag || !drag.width || !Number.isFinite(clampedMaxFrame)) return;
      if (!(evt.buttons & 1)) return; // only while left button held
      const dx = evt.clientX - drag.startX;
      const ratio = drag.width ? dx / drag.width : 0;
      if (!drag.dragging && Math.abs(dx) < 4) return; // small click -> ignore
      drag.dragging = true;
      const deltaFrame = ratio * clampedMaxFrame;
      const nextStart = clampViewStart(drag.startViewStart + deltaFrame);
      setViewStart(nextStart);
    },
    [clampedMaxFrame, clampViewStart]
  );

  const handleViewportPointerDown = useCallback(
    (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      const rect = timecodeRef.current?.getBoundingClientRect();
      if (!rect) return;
      viewportDragRef.current = {
        startX: evt.clientX,
        startViewStart: viewStart,
        width: rect.width,
        dragging: false
      };
      const move = (e) => handleViewportDrag(e);
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', up, true);
        window.removeEventListener('pointerleave', up, true);
        viewportDragRef.current = null;
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up, true);
      window.addEventListener('pointercancel', up, true);
      // stop drag if pointer leaves the window (while still over the purple zone)
      window.addEventListener('pointerleave', up, true);
    },
    [viewStart, handleViewportDrag]
  );

  const handleWheel = (evt) => {
    if (!evt.ctrlKey) return;
    evt.preventDefault();
    const rect = svgRef.current?.getBoundingClientRect();
    const x = rect ? evt.clientX - rect.left : innerWidth / 2;
    const frameUnderCursor = xToFrame(GRAPH_LEFT + Math.max(0, Math.min(innerWidth, x - GRAPH_LEFT)));
    const factor = evt.deltaY > 0 ? 0.9 : 1.1;
    applyZoom(frameUnderCursor, factor);
  };

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

  const renderKeyControls = (
    entry,
    y,
    channelId = null,
    options = {}
  ) => {
    const {
      editable = false,
      value = '',
      onChange = null,
      onBlur = null,
      onKeyDown = null,
      hidden = false,
      onToggleHidden = null,
      hideValue = false
    } = options;
    const centerY = y - 4;
    const rawValueText = editable
      ? value
      : getCurrentValueDisplay(entry, channelId);
    const valueText = String(rawValueText ?? '');
    const displayValue =
      valueText.length > 8 ? `${valueText.slice(0, 8)}` : valueText;
    const eyeX = KEY_CONTROL_START_X - KEY_EYE_GAP;
    const eyeBoxX = eyeX - KEY_EYE_BOX / 2;
    const eyeBoxY = centerY - KEY_EYE_BOX / 2;
    const leftArrowX = KEY_CONTROL_START_X;
    const dotX = leftArrowX + KEY_CONTROL_GAP;
    const rightArrowX = dotX + KEY_CONTROL_GAP;
    const valueBoxX = rightArrowX + KEY_CONTROL_GAP;
    const valueCenterY = centerY + KEY_VALUE_OFFSET_Y;
    const valueBoxY = valueCenterY - KEY_VALUE_HEIGHT / 2;
    return (
      <g className="uu-timeline-key-controls">
        {onToggleHidden && (
          <g
            className={`uu-timeline-eye${hidden ? ' is-hidden' : ''}`}
            onPointerDown={(evt) =>
              handleKeyControlPointerDown(evt, onToggleHidden)
            }
          >
            <rect
              className="uu-timeline-eye-box"
              x={eyeBoxX}
              y={eyeBoxY}
              width={KEY_EYE_BOX}
              height={KEY_EYE_BOX}
              rx={4}
            />
            <ellipse
              className="uu-timeline-eye-shape"
              cx={eyeX}
              cy={centerY}
              rx={6}
              ry={3}
            />
            <circle className="uu-timeline-eye-dot" cx={eyeX} cy={centerY} r={1.5} />
            {hidden && (
              <line
                className="uu-timeline-eye-slash"
                x1={eyeX - 6}
                y1={centerY - 4}
                x2={eyeX + 6}
                y2={centerY + 4}
              />
            )}
          </g>
        )}
        <text
          className="uu-timeline-key-control"
          x={leftArrowX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          onPointerDown={(evt) =>
            handleKeyControlPointerDown(evt, () =>
              jumpToKeyframeFor(entry, -1, channelId)
            )
          }
        >
          {'<'}
        </text>
        <circle
          className="uu-timeline-key-dot-btn"
          cx={dotX}
          cy={centerY}
          r={4}
          onPointerDown={(evt) =>
            handleKeyControlPointerDown(evt, () =>
              addKeyframeFor(entry, channelId)
            )
          }
        />
        <text
          className="uu-timeline-key-control"
          x={rightArrowX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          onPointerDown={(evt) =>
            handleKeyControlPointerDown(evt, () =>
              jumpToKeyframeFor(entry, 1, channelId)
            )
          }
        >
          {'>'}
        </text>
        {hideValue ? null : editable ? (
          <foreignObject
            x={valueBoxX}
            y={valueBoxY}
            width={KEY_VALUE_WIDTH}
            height={KEY_VALUE_HEIGHT}
            style={{ overflow: 'visible' }}
            pointerEvents="all"
          >
            <input
              className="uu-timeline-key-input"
              type="text"
              inputMode="decimal"
              value={valueText}
              step="0.1"
              onPointerDown={(evt) => {
                evt.stopPropagation();
              }}
              onChange={(evt) => {
                evt.stopPropagation();
                if (onChange) onChange(evt.target.value);
              }}
              onBlur={(evt) => {
                if (onBlur) onBlur(evt.target.value);
              }}
              onKeyDown={(evt) => {
                evt.stopPropagation();
                if (onKeyDown) onKeyDown(evt);
              }}
            />
          </foreignObject>
        ) : (
          <>
            <rect
              className="uu-timeline-key-value-box"
              x={valueBoxX}
              y={valueBoxY}
              width={KEY_VALUE_WIDTH}
              height={KEY_VALUE_HEIGHT}
              rx={3}
              pointerEvents="none"
            />
            <text
              className="uu-timeline-key-value-text"
              x={valueBoxX + KEY_VALUE_WIDTH / 2}
              y={valueCenterY}
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
            >
              {displayValue}
            </text>
          </>
        )}
      </g>
    );
  };

  const renderCollapseToggle = (entry, y) => {
    if (!entry) return null;
    const adjustedY = y - 4;
    const half = COLLAPSE_BTN_SIZE / 2;
    const boxX = COLLAPSE_X;
    const boxY = adjustedY - half;
    return (
      <g
        className="uu-timeline-collapse-btn"
        onPointerDown={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
          updateTrack(entry.track.widgetId, (track) => ({
            ...track,
            collapsed: !track.collapsed
          }));
        }}
      >
        <rect
          className="uu-timeline-collapse-box"
          x={boxX}
          y={boxY}
          width={COLLAPSE_BTN_SIZE}
          height={COLLAPSE_BTN_SIZE}
          rx={4}
        />
        <text
          className="uu-timeline-collapse-icon"
          x={boxX + half}
          y={adjustedY}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {entry.collapsed ? '>' : 'v'}
        </text>
      </g>
    );
  };

  const renderHeaderRow = (entry, headerBounds, label, rowIndex) => {
    if (!entry || !headerBounds) return null;
    const pastilles = getTargetPastilles(entry.widget);
    const headerX = COLLAPSE_X + COLLAPSE_BTN_SIZE + 8;
    const headerWidth = GRAPH_WIDTH - headerX - GRAPH_RIGHT;
    const isActive = entry.track.widgetId === selectedTrackId;
    const linked = isTrackLinked(entry);
    return (
      <foreignObject
        x={headerX}
        y={headerBounds.top + 2}
        width={headerWidth}
        height={headerBounds.bottom - headerBounds.top - 4}
      >
        <div
          className="uu-timeline-header-row"
          onDragOver={(evt) => {
            if (reorderTrackId) {
              evt.preventDefault();
              handleReorderOver(rowIndex)(evt);
            }
          }}
          onDrop={(evt) => {
            evt.preventDefault();
            handleReorderEnd();
          }}
          onPointerDown={(evt) => {
            evt.stopPropagation();
            setSelectedTrackId(entry.track.widgetId);
            setSelectedKey(null);
          }}
        >
          <div className="uu-timeline-header-left">
            <button
              type="button"
              className={`uu-btn uu-timeline-header-edit${
                isActive ? ' prod-toggle-active' : ''
              }`}
              onPointerDown={(evt) => {
                evt.stopPropagation();
              }}
              onClick={(evt) => {
                evt.stopPropagation();
                setSelectedTrackId(entry.track.widgetId);
                setSelectedKey(null);
              }}
            >
              edit
            </button>
            <div className="uu-timeline-header-label" title={label}>
              {label}
            </div>
            {isLinkableEntry(entry) ? (
            <button
              type="button"
              className={`uu-timeline-lock-btn${linked ? ' is-active' : ''}`}
              title={t('timeline.linkAxes') || 'Lier les axes (X/Y/Z)'}
              onPointerDown={(evt) => evt.stopPropagation()}
              onClick={(evt) => {
                evt.stopPropagation();
                setSelectedTrackId(entry.track.widgetId);
                const nextLinked = !entry.track.linkChannels;
                updateTrack(entry.track.widgetId, (track) => ({
                  ...track,
                  linkChannels: nextLinked
                }));
                if (!nextLinked) {
                  // Si on vient de déverrouiller, on évite de garder une multi‑sélection héritée
                  // (sinon un drag continue de bouger tous les axes).
                  setMultiSelection((prev) => {
                    const primary =
                      selectedKey ||
                      prev?.[0] ||
                      (selectedChannelId
                        ? {
                            trackId: entry.track.widgetId,
                            channelId: selectedChannelId,
                            idx: selectedKey?.idx ?? 0
                          }
                        : null);
                    return primary ? [primary] : [];
                  });
                }
              }}
            >
              <span className="uu-lock-letter" aria-hidden="true">
                L
              </span>
              </button>
            ) : null}
          </div>
          <div className="uu-timeline-header-targets">
            {pastilles.map((pastille) => (
              <span
                key={pastille.ip}
                className={`uu-pastille ${pastille.className}`}
                title={pastille.ip}
              />
            ))}
          </div>
          <div className="uu-timeline-header-spacer" />
          <button
            type="button"
            className="uu-timeline-header-handle"
            title={t('timeline.reorder') || 'Glisser pour réordonner'}
            draggable
            onDragStart={handleReorderStart(entry.track.widgetId)}
            onDragEnd={handleReorderEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            ⋯
          </button>
          <button
            type="button"
            className="uu-timeline-header-delete"
            onPointerDown={(evt) => {
              evt.stopPropagation();
            }}
            onClick={(evt) => {
              evt.stopPropagation();
              removeTrackById(entry.track.widgetId);
            }}
          >
            X
          </button>
        </div>
      </foreignObject>
    );
  };

  const selectedTargets = selectedWidget?.targets || {};
  const hasSelectedTargets = Object.values(selectedTargets).some(Boolean);
  const missingSelectedWidget = !!selectedTrackId && !selectedWidget;
  const activeChannelId = selectedKey?.channelId || selectedChannelId;
  const selectedChannel =
    selectedMeta?.kind === 'multi'
      ? (selectedMeta.channels || []).find(
          (channel) => channel.id === activeChannelId
        )
      : null;
  const selectedChannelLabel =
    selectedChannel?.label || selectedChannel?.id || '';
  const isNumericValue =
    selectedMeta?.kind === 'number' || selectedMeta?.kind === 'multi';

  return (
    <div className="uu-timeline-widget" ref={editorRootRef}>
      {statusMsg && <div className="uu-alert uu-alert-error">{statusMsg}</div>}

      <div className="uu-timeline-section">
        <div className="uu-row uu-align-center uu-gap-12 uu-timeline-header">
          <div className="uu-timeline-add" ref={addMenuRef}>
            <button
              type="button"
              className="uu-btn uu-btn-sm"
              onClick={() => setShowAddMenu((prev) => !prev)}
            >
              + Add Widget
            </button>
            {showAddMenu && (
              <div className="uu-timeline-add-menu">
                {typeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="uu-timeline-add-item"
                    onClick={() => handleAddTrackType(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        <div className="uu-row uu-align-center uu-gap-8 uu-timeline-title">
          <label className="uu-label">{t('widgets.common.label')}</label>
          <input
            className="uu-input uu-input-label uu-timeline-title-input"
            value={widget.label ?? ''}
              onChange={(e) =>
                updateWidget?.(widget.id, { label: e.target.value })
              }
            />
          </div>
          <div className="uu-row uu-align-center uu-gap-6" style={{ flex: 1, justifyContent: 'flex-start', marginLeft: -110 }}>
            <span className="uu-muted">{t('timeline.zoom') || 'Zoom'}</span>
            <button
              type="button"
              className="uu-btn uu-btn-secondary uu-btn-sm uu-timeline-btn"
              onClick={() => {
                setZoomFactor((z) => Math.max(1, z / 1.25));
                setViewStart((prev) => clampViewStart(prev));
              }}
              onMouseDown={(e) => e.stopPropagation()}
              title={t('timeline.zoomOut') || 'Zoom out'}
            >
              −
            </button>
            <button
              type="button"
              className="uu-btn uu-btn-secondary uu-btn-sm uu-timeline-btn"
              onClick={() => setZoomFactor((z) => Math.min(30, z * 1.25))}
              onMouseDown={(e) => e.stopPropagation()}
              title={t('timeline.zoomIn') || 'Zoom in'}
            >
              +
            </button>
            <span className="uu-muted" style={{ minWidth: 40, textAlign: 'right' }}>
              {zoomFactor.toFixed ? zoomFactor.toFixed(2) : zoomFactor}
            </span>
          </div>
          <div className="uu-row uu-align-center uu-gap-8 uu-timeline-modes">
            <span className="uu-muted">{t('timeline.mode') || 'Mode'}</span>
            <div className="uu-row">
              {['single', 'loop', 'flipflop', 'flipstopflop'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`uu-btn uu-btn-sm uu-timeline-mode-btn${
                    mode === opt ? ' is-active prod-toggle-active' : ''
                  }`}
                  onClick={() =>
                    setTimelineDraft((prev) => ({ ...prev, mode: opt }))
                  }
                >
                  {opt === 'single'
                    ? 'Single'
                    : opt === 'loop'
                    ? 'Loop'
                    : opt === 'flipflop'
                    ? 'Flip/Flop'
                    : 'FF/Stop'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="uu-timeline-graph">
          <TimelineTimecodeBar
            fps={fps}
            fpsWarnings={fpsWarnings}
            timecodeInput={timecodeInput}
            setTimecodeInput={setTimecodeInput}
            timecodeEditing={timecodeEditing}
            setTimecodeEditing={setTimecodeEditing}
            commitTimecodeInput={commitTimecodeInput}
            useTimecodeView={useTimecodeView}
            toggleTimecodeView={toggleTimecodeView}
        timecodeRef={timecodeRef}
        clampedMaxFrame={clampedMaxFrame}
        playheadFrame={playheadFrame}
        framesToTimecode={framesToTimecode}
        onTimecodeDown={onTimecodeDown}
        onTimecodeMove={onTimecodeMove}
        onTimecodeUp={onTimecodeUp}
        graphLeft={GRAPH_LEFT}
        graphRight={GRAPH_RIGHT}
        graphWidth={GRAPH_WIDTH}
        viewStart={viewStart}
        viewFrames={viewFrames}
        onViewportPointerDown={handleViewportPointerDown}
      />
          <TimelineTracks
            svgRef={svgRef}
            graphHeight={graphHeight}
            innerWidth={innerWidth}
            trackAreaHeight={trackAreaHeight}
            frameLines={frameLines}
            layoutEntries={layoutEntries}
            xTicks={xTicks}
            clampedMaxFrame={clampedMaxFrame}
            playheadFrame={playheadFrame}
            selectedTrackId={selectedTrackId}
            selectedChannelId={selectedChannelId}
            selectedKey={selectedKey}
            selectedMeta={selectedMeta}
            frameToX={frameToX}
            toGlobalFrame={toGlobalFrame}
            getChannelBounds={getChannelBounds}
            getChannelColor={getChannelColor}
            getTrackValueSummary={getTrackValueSummary}
            getInlineDraftValue={getInlineDraftValue}
            getInlineDraftKey={getInlineDraftKey}
            getInlineDraftChannelKey={getInlineDraftChannelKey}
            getInlineChannelValue={getInlineChannelValue}
            getNumericRange={getNumericRange}
            formatNumber={formatNumber}
            shouldRenderSquare={shouldRenderSquare}
            renderCollapseToggle={renderCollapseToggle}
            renderHeaderRow={renderHeaderRow}
          renderKeyControls={renderKeyControls}
          shouldShowEye={shouldShowEye}
          isCurveHidden={isCurveHidden}
          toggleCurveVisibility={toggleCurveVisibility}
          registerPoint={registerPoint}
          handleSvgPointerDown={handleSvgPointerDown}
          updateFromPointer={updateFromPointer}
          handlePointerUp={handlePointerUp}
          handleClipPointerDown={handleClipPointerDown}
          handlePointerDown={handlePointerDown}
          onWheel={handleWheel}
          viewStart={viewStart}
          viewFrames={viewFrames}
          setSelectedTrackId={setSelectedTrackId}
          setSelectedChannelId={setSelectedChannelId}
          setSelectedKey={setSelectedKey}
          setSelectedKeyframeValueDraft={setSelectedKeyframeValueDraft}
          setMultiSelection={setMultiSelection}
            setSelectionBox={setSelectionBox}
            setColorPickerState={setColorPickerState}
            setArgColorPicker={setArgColorPicker}
            updateTrack={updateTrack}
            handleInlineChannelValueChange={handleInlineChannelValueChange}
            keyframeType={keyframeType}
            inlineDrafts={inlineDrafts}
            setInlineDrafts={setInlineDrafts}
            selectedTrack={selectedTrack}
            timelineDraft={timelineDraft}
            multiSelection={multiSelection}
            SQUARE_POINT_KINDS={SQUARE_POINT_KINDS}
            lassoBox={lassoBox}
            CHANNEL_ROW_HEIGHT={CHANNEL_ROW_HEIGHT}
            GRAPH_LEFT={GRAPH_LEFT}
            GRAPH_TOP={GRAPH_TOP}
            GRAPH_RIGHT={GRAPH_RIGHT}
            GRAPH_WIDTH={GRAPH_WIDTH}
            MIN_CLIP_PX={MIN_CLIP_PX}
            LABEL_RIGHT_X={LABEL_RIGHT_X}
            getWidgetLabel={getWidgetLabel}
            t={t}
          />
      </div>

      {/* Bottom range removed per request; viewport is draggable via purple window in top bar */}

      <TimelineToolbar
        editorPlaying={editorPlaying}
        editorPaused={editorPaused}
        keyframeType={keyframeType}
        hideKeyframeTypes={lockKeyframeTypes}
        onKeyframeTypeChange={applyKeyframeType}
        zoomFactor={zoomFactor}
        onZoomIn={() => setZoomFactor((z) => Math.min(30, z * 1.25))}
        onZoomOut={() => {
          setZoomFactor((z) => Math.max(1, z / 1.25));
          setViewStart((prev) => clampViewStart(prev));
        }}
        onZoomCenter={(frame) => {
          const newStart = clampViewStart(frame - viewFrames / 2);
          setViewStart(newStart);
        }}
        keyframeInTanDraft={keyframeInTanDraft}
        keyframeOutTanDraft={keyframeOutTanDraft}
        onBezierTangentChange={handleBezierTangentChange}
        keyframeInSpanDraft={keyframeInSpanDraft}
        keyframeOutSpanDraft={keyframeOutSpanDraft}
        onBezierSpanChange={handleBezierSpanChange}
        handleEditorCue={handleEditorCue}
        handleEditorPlay={handleEditorPlay}
        handleEditorPause={handleEditorPause}
        handleEditorContinue={handleEditorContinue}
        handleEditorStop={handleEditorStop}
        handleEditorStep={handleEditorStep}
        useTimecodeView={useTimecodeView}
        durationDisplay={durationDisplay}
        handleDurationChange={handleDurationChange}
        t={t}
      />
    </div>

      <TimelineInspector
        t={t}
        timelineWidgetId={widget.id}
        layoutId={layoutId}
        missingSelectedWidget={missingSelectedWidget}
        selectedWidget={selectedWidget}
        selectedTrack={selectedTrack}
        selectedMeta={selectedMeta}
        selectedKeyframe={selectedKeyframe}
        selectedKeyframeArgs={selectedKeyframeArgs}
        selectedKey={selectedKey}
        selectedChannelId={selectedChannelId}
        selectedChannelLabel={selectedChannelLabel}
        selectedBundle={selectedBundle}
        isLinkedSelected={isLinkedSelected}
        isNumericValue={isNumericValue}
        useTimecodeView={useTimecodeView}
        playheadFrame={playheadFrame}
        bundleFrameDraft={bundleFrameDraft}
        setBundleFrameDraft={setBundleFrameDraft}
        commitBundleFrameDraft={commitBundleFrameDraft}
        bundleValueDrafts={bundleValueDrafts}
        setBundleValueDrafts={setBundleValueDrafts}
        commitBundleValueDraft={commitBundleValueDraft}
        removeChannelKeyframeAt={removeChannelKeyframeAt}
        addChannelKeyframeAt={addChannelKeyframeAt}
        keyframeFrameDraft={keyframeFrameDraft}
        setKeyframeFrameDraft={setKeyframeFrameDraft}
        commitKeyframeFrameDraft={commitKeyframeFrameDraft}
        keyframeValueDraft={keyframeValueDraft}
        setKeyframeValueDraft={setKeyframeValueDraft}
        commitKeyframeValueDraft={commitKeyframeValueDraft}
        keyframeInTanDraft={keyframeInTanDraft}
        setKeyframeInTanDraft={setKeyframeInTanDraft}
        keyframeOutTanDraft={keyframeOutTanDraft}
        setKeyframeOutTanDraft={setKeyframeOutTanDraft}
        handleBezierTangentChange={handleBezierTangentChange}
        handleRemoveKeyframe={handleRemoveKeyframe}
        handleValueChange={handleValueChange}
        applyColorToBundle={applyColorToBundle}
        colorPickerState={colorPickerState}
        colorPickerOpen={colorPickerOpen}
        setColorPickerOpen={setColorPickerOpen}
        argColorPicker={argColorPicker}
        setArgColorPicker={setArgColorPicker}
        presetData={presetData}
        updateSelectedBinding={updateSelectedBinding}
        updateSelectedWidget={updateSelectedWidget}
        updateSelectedKeyframeArgs={updateSelectedKeyframeArgs}
        hosts={hosts}
        hasSelectedTargets={hasSelectedTargets}
        selectedTargets={selectedTargets}
        syncTimelineWidgetTargets={syncTimelineWidgetTargets}
        colorClass={colorClass}
        browseFileInputRef={browseFileInputRef}
      />
    </div>
  );
}
