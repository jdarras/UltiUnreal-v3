import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineHeaderControlsProps } from '../../app/widgets/timeline/timelineHeaderControlsProps.js';
import { buildTimelineHeaderRowProps } from '../../app/widgets/timeline/timelineHeaderRowProps.js';
import { buildTimelineToolbarProps } from '../../app/widgets/timeline/timelineToolbarProps.js';
import { buildTimelineGraphSectionProps } from '../../app/widgets/timeline/timelineGraphSectionProps.js';
import { buildTimelineInspectorProps } from '../../app/widgets/timeline/timelineInspectorProps.js';
import { buildTimelineInspectorNonLinkedSectionProps } from '../../app/widgets/timeline/timelineInspectorNonLinkedSectionProps.js';
import { buildTimelineEditorComponentProps } from '../../app/widgets/timeline/timelineEditorComponentProps.js';

function sortedKeys(obj) {
  return Object.keys(obj).sort();
}

test('buildTimelineHeaderControlsProps preserves provided references', () => {
  const onModeChange = () => {};
  const props = buildTimelineHeaderControlsProps({
    t: () => '',
    addMenuRef: { current: null },
    showAddMenu: true,
    setShowAddMenu: () => {},
    typeOptions: [{ id: 'a', label: 'A' }],
    onAddTrackType: () => {},
    label: 'Timeline',
    onLabelChange: () => {},
    zoomFactor: 2,
    onZoomOut: () => {},
    onZoomIn: () => {},
    mode: 'loop',
    onModeChange,
  });

  assert.deepEqual(sortedKeys(props), [
    'addMenuRef',
    'label',
    'mode',
    'onAddTrackType',
    'onLabelChange',
    'onModeChange',
    'onZoomIn',
    'onZoomOut',
    'setShowAddMenu',
    'showAddMenu',
    't',
    'typeOptions',
    'zoomFactor',
  ]);
  assert.equal(props.mode, 'loop');
  assert.equal(props.zoomFactor, 2);
  assert.equal(props.onModeChange, onModeChange);
});

test('buildTimelineToolbarProps preserves provided references', () => {
  const onZoomCenter = () => {};
  const props = buildTimelineToolbarProps({
    editorPlaying: false,
    editorPaused: true,
    keyframeType: 'bezier',
    hideKeyframeTypes: false,
    onKeyframeTypeChange: () => {},
    zoomFactor: 1.25,
    onZoomIn: () => {},
    onZoomOut: () => {},
    onZoomCenter,
    keyframeInTanDraft: '1',
    keyframeOutTanDraft: '2',
    onBezierTangentChange: () => {},
    keyframeInSpanDraft: '3',
    keyframeOutSpanDraft: '4',
    onBezierSpanChange: () => {},
    handleEditorCue: () => {},
    handleEditorPlay: () => {},
    handleEditorPause: () => {},
    handleEditorContinue: () => {},
    handleEditorStop: () => {},
    handleEditorStep: () => {},
    useTimecodeView: true,
    durationDisplay: '00:00:10:00',
    handleDurationChange: () => {},
    t: () => '',
  });

  assert.deepEqual(sortedKeys(props), [
    'durationDisplay',
    'editorPaused',
    'editorPlaying',
    'handleDurationChange',
    'handleEditorContinue',
    'handleEditorCue',
    'handleEditorPause',
    'handleEditorPlay',
    'handleEditorStep',
    'handleEditorStop',
    'hideKeyframeTypes',
    'keyframeInSpanDraft',
    'keyframeInTanDraft',
    'keyframeOutSpanDraft',
    'keyframeOutTanDraft',
    'keyframeType',
    'onBezierSpanChange',
    'onBezierTangentChange',
    'onKeyframeTypeChange',
    'onZoomCenter',
    'onZoomIn',
    'onZoomOut',
    't',
    'useTimecodeView',
    'zoomFactor',
  ]);
  assert.equal(props.keyframeType, 'bezier');
  assert.equal(props.durationDisplay, '00:00:10:00');
  assert.equal(props.onZoomCenter, onZoomCenter);
});

test('buildTimelineHeaderRowProps preserves provided references', () => {
  const onDeleteTrack = () => {};
  const props = buildTimelineHeaderRowProps({
    entry: { track: { widgetId: 'w1' } },
    headerBounds: { top: 1, bottom: 2 },
    headerX: 10,
    headerWidth: 100,
    label: 'Widget',
    rowIndex: 0,
    pastilles: [],
    isActive: true,
    linked: false,
    reorderTrackId: 'w1',
    onReorderOver: () => {},
    onReorderEnd: () => {},
    onSelectTrack: () => {},
    onToggleLink: () => {},
    onReorderStart: () => {},
    onDeleteTrack,
    isLinkableEntry: () => true,
    t: () => '',
  });

  assert.deepEqual(sortedKeys(props), [
    'entry',
    'headerBounds',
    'headerWidth',
    'headerX',
    'isActive',
    'isLinkableEntry',
    'label',
    'linked',
    'onDeleteTrack',
    'onReorderEnd',
    'onReorderOver',
    'onReorderStart',
    'onSelectTrack',
    'onToggleLink',
    'pastilles',
    'reorderTrackId',
    'rowIndex',
    't',
  ]);
  assert.equal(props.headerWidth, 100);
  assert.equal(props.onDeleteTrack, onDeleteTrack);
});

test('buildTimelineGraphSectionProps splits props and remaps graph geometry', () => {
  const result = buildTimelineGraphSectionProps({
    graphLeft: 11,
    graphRight: 22,
    graphWidth: 333,
    viewStart: 5,
    viewFrames: 25,
    getWidgetLabel: () => 'x',
  });

  assert.deepEqual(sortedKeys(result), ['timecodeBarProps', 'tracksProps']);
  assert.equal(result.timecodeBarProps.graphLeft, 11);
  assert.equal(result.timecodeBarProps.graphRight, 22);
  assert.equal(result.timecodeBarProps.graphWidth, 333);

  assert.equal(result.tracksProps.GRAPH_LEFT, 11);
  assert.equal(result.tracksProps.GRAPH_RIGHT, 22);
  assert.equal(result.tracksProps.GRAPH_WIDTH, 333);
  assert.equal(result.tracksProps.viewStart, 5);
  assert.equal(result.tracksProps.viewFrames, 25);
  assert.equal('graphLeft' in result.tracksProps, false);
  assert.equal('t' in result.tracksProps, false);
});

test('buildTimelineInspectorProps derives channel label and selection flags', () => {
  const selectedWidget = {
    targets: {
      '127.0.0.1': false,
      '192.168.1.20': true,
    },
  };
  const selectedMeta = {
    kind: 'multi',
    channels: [
      { id: 'x', label: 'X' },
      { id: 'y', label: 'Yaw' },
    ],
  };

  const result = buildTimelineInspectorProps({
    t: () => '',
    timelineWidgetId: 'wid',
    layoutId: 'layout',
    selectedTrackId: 'track-1',
    selectedWidget,
    selectedMeta,
    selectedKey: { channelId: 'y' },
    selectedChannelId: 'x',
  });

  assert.equal(result.selectedChannelLabel, 'Yaw');
  assert.equal(result.isNumericValue, true);
  assert.equal(result.hasSelectedTargets, true);
  assert.equal(result.missingSelectedWidget, false);
  assert.deepEqual(result.selectedTargets, selectedWidget.targets);
});

test('buildTimelineInspectorProps reports missing selected widget', () => {
  const result = buildTimelineInspectorProps({
    selectedTrackId: 'track-2',
    selectedWidget: null,
    selectedMeta: { kind: 'text' },
    selectedKey: null,
    selectedChannelId: '',
  });

  assert.equal(result.missingSelectedWidget, true);
  assert.equal(result.hasSelectedTargets, false);
  assert.deepEqual(result.selectedTargets, {});
  assert.equal(result.isNumericValue, false);
});

test('buildTimelineEditorComponentProps assembles child prop bags', () => {
  const noop = () => {};
  const handleAddTrackType = () => {};
  const handleZoomCenter = () => {};
  const setSelectedTrackId = () => {};
  const setSelectedChannelId = () => {};
  const setSelectedKey = () => {};
  const editorState = {
    selectedTrackId: 'track-1',
    selectedKey: { trackId: 'track-1', idx: 2 },
    multiSelection: [],
    selectedChannelId: 'x',
    playheadFrame: 24,
    editorPlaying: true,
    editorPaused: false,
    timecodeInput: '24',
    setTimecodeInput: noop,
    useTimecodeView: true,
    timecodeEditing: false,
    setTimecodeEditing: noop,
    keyframeFrameDraft: '24',
    setKeyframeFrameDraft: noop,
    keyframeValueDraft: '42',
    setKeyframeValueDraft: noop,
    keyframeInTanDraft: '1',
    keyframeOutTanDraft: '2',
    keyframeInSpanDraft: '3',
    keyframeOutSpanDraft: '4',
    keyframeType: 'bezier',
    zoomFactor: 2,
    viewStart: 12,
    bundleFrameDraft: '24',
    setBundleFrameDraft: noop,
    bundleValueDrafts: { x: '42' },
    setBundleValueDrafts: noop,
    showAddMenu: true,
    setShowAddMenu: noop,
    lassoBox: null,
    colorPickerOpen: false,
    setColorPickerOpen: noop,
    colorPickerState: { hex: '#ffffff', alpha: 1 },
    argColorPicker: { open: false },
    setArgColorPicker: noop,
    setSelectedTrackId,
    setSelectedChannelId,
    setSelectedKey,
  };
  const editorRefs = {
    addMenuRef: { current: null },
    browseFileInputRef: { current: null },
    timecodeRef: { current: null },
    svgRef: { current: null },
  };

  const result = buildTimelineEditorComponentProps({
    t: () => '',
    widget: { id: 'timeline-1', label: 'Timeline' },
    layoutId: 'layout-1',
    hosts: [],
    presetData: {},
    editorState,
    editorRefs,
    typeOptions: [{ id: 'number', label: 'Number' }],
    mode: 'single',
    selectedWidget: { targets: {} },
    selectedTrack: { track: { widgetId: 'track-1' }, meta: { kind: 'number' } },
    selectedMeta: { kind: 'number' },
    selectedKeyframe: { frame: 24, value: 42 },
    selectedKeyframeArgs: {},
    selectedBundle: null,
    isLinkedSelected: false,
    fps: 24,
    fpsWarnings: [],
    clampedMaxFrame: 100,
    viewFrames: 50,
    graphHeight: 300,
    innerWidth: 800,
    trackAreaHeight: 200,
    frameLines: [],
    layoutEntries: [],
    xTicks: [],
    frameToX: (frame) => frame,
    getChannelBounds: noop,
    getTrackValueSummary: noop,
    getInlineDraftValue: noop,
    getInlineDraftKey: noop,
    formatNumber: (value) => String(value),
    getWidgetLabel: () => 'Widget',
    getNumericRange: noop,
    shouldRenderSquare: () => false,
    shouldShowEye: () => true,
    isCurveHidden: () => false,
    renderCollapseToggle: noop,
    renderHeaderRow: noop,
    renderKeyControls: noop,
    commitBundleFrameDraft: noop,
    commitBundleValueDraft: noop,
    removeChannelKeyframeAt: noop,
    addChannelKeyframeAt: noop,
    commitKeyframeFrameDraft: noop,
    commitKeyframeValueDraft: noop,
    handleRemoveKeyframe: noop,
    handleValueChange: noop,
    applyColorToBundle: noop,
    updateSelectedBinding: noop,
    updateSelectedWidget: noop,
    updateSelectedKeyframeArgs: noop,
    commitTimecodeInput: noop,
    toggleTimecodeView: noop,
    onTimecodeDown: noop,
    onTimecodeMove: noop,
    onTimecodeUp: noop,
    handleViewportPointerDown: noop,
    toggleCurveVisibility: noop,
    registerPoint: noop,
    handleSvgPointerDown: noop,
    updateFromPointer: noop,
    handlePointerUp: noop,
    handleClipPointerDown: noop,
    handlePointerDown: noop,
    handleWheel: noop,
    handleInlineChannelValueChange: noop,
    inlineDrafts: {},
    setInlineDrafts: noop,
    lockKeyframeTypes: false,
    applyKeyframeType: noop,
    handleZoomOut: noop,
    handleZoomIn: noop,
    handleZoomCenter,
    handleTimelineHeaderLabelChange: noop,
    handleTimelineModeChange: noop,
    handleBezierTangentChange: noop,
    handleBezierSpanChange: noop,
    handleEditorCue: noop,
    handleEditorPlay: noop,
    handleEditorPause: noop,
    handleEditorContinue: noop,
    handleEditorStop: noop,
    handleEditorStep: noop,
    durationDisplay: '00:00:01:00',
    handleDurationChange: noop,
    handleAddTrackType,
  });

  assert.equal(result.timelineHeaderControlsProps.label, 'Timeline');
  assert.equal(result.timelineHeaderControlsProps.onAddTrackType, handleAddTrackType);
  assert.equal(result.timelineToolbarProps.onZoomCenter, handleZoomCenter);
  assert.equal(result.timelineInspectorProps.timelineWidgetId, 'timeline-1');
  assert.equal(result.timelineInspectorProps.layoutId, 'layout-1');
  assert.equal(result.timelineGraphSectionProps.timecodeBarProps.viewStart, 12);
  assert.equal(result.timelineGraphSectionProps.tracksProps.setSelectedTrackId, setSelectedTrackId);
  assert.equal(result.timelineGraphSectionProps.tracksProps.setSelectedChannelId, setSelectedChannelId);
  assert.equal(result.timelineGraphSectionProps.tracksProps.setSelectedKey, setSelectedKey);
});

test('buildTimelineInspectorNonLinkedSectionProps builds multi and non-multi prop bags', () => {
  const t = () => '';
  const selectedMeta = { kind: 'number' };
  const selectedWidget = { id: 'w1' };
  const selectedKeyframe = { frame: 12 };
  const selectedKeyframeArgs = { a: 1 };
  const selectedKey = { idx: 4 };
  const selectedChannelId = 'x';
  const selectedChannelLabel = 'X';
  const keyframeFrameDraft = '12';
  const setKeyframeFrameDraft = () => {};
  const commitKeyframeFrameDraft = () => {};
  const keyframeValueDraft = '99';
  const setKeyframeValueDraft = () => {};
  const commitKeyframeValueDraft = () => {};
  const handleRemoveKeyframe = () => {};
  const handleValueChange = () => {};
  const removeChannelKeyframeAt = () => {};
  const presetData = { preset: true };
  const updateSelectedKeyframeArgs = () => {};
  const argColorPicker = { current: '#fff' };
  const setArgColorPicker = () => {};
  const setColorPickerOpen = () => {};
  const browseFileInputRef = { current: null };

  const result = buildTimelineInspectorNonLinkedSectionProps({
    t,
    isMulti: true,
    selectedMeta,
    selectedWidget,
    selectedKeyframe,
    selectedKeyframeArgs,
    selectedKey,
    selectedChannelId,
    selectedChannelLabel,
    isNumericValue: true,
    useTimecodeView: false,
    keyframeFrameDraft,
    setKeyframeFrameDraft,
    commitKeyframeFrameDraft,
    keyframeValueDraft,
    setKeyframeValueDraft,
    commitKeyframeValueDraft,
    handleRemoveKeyframe,
    handleValueChange,
    removeChannelKeyframeAt,
    presetData,
    updateSelectedKeyframeArgs,
    argColorPicker,
    setArgColorPicker,
    setColorPickerOpen,
    browseFileInputRef,
  });

  assert.deepEqual(sortedKeys(result), ['multiSectionProps', 'nonMultiSectionProps']);
  assert.equal(result.multiSectionProps.selectedKeyIndex, 4);
  assert.equal(result.multiSectionProps.removeChannelKeyframeAt, removeChannelKeyframeAt);
  assert.equal(result.nonMultiSectionProps.handleRemoveKeyframe, handleRemoveKeyframe);
  assert.equal(result.nonMultiSectionProps.updateSelectedKeyframeArgs, updateSelectedKeyframeArgs);
});

test('buildTimelineInspectorNonLinkedSectionProps falls back selectedKeyIndex to -1', () => {
  const result = buildTimelineInspectorNonLinkedSectionProps({
    t: () => '',
    isMulti: false,
    selectedMeta: null,
    selectedWidget: null,
    selectedKeyframe: null,
    selectedKeyframeArgs: null,
    selectedKey: null,
    selectedChannelId: '',
    selectedChannelLabel: '',
    isNumericValue: false,
    useTimecodeView: false,
    keyframeFrameDraft: '',
    setKeyframeFrameDraft: () => {},
    commitKeyframeFrameDraft: () => {},
    keyframeValueDraft: '',
    setKeyframeValueDraft: () => {},
    commitKeyframeValueDraft: () => {},
    handleRemoveKeyframe: () => {},
    handleValueChange: () => {},
    removeChannelKeyframeAt: () => {},
    presetData: null,
    updateSelectedKeyframeArgs: () => {},
    argColorPicker: null,
    setArgColorPicker: () => {},
    setColorPickerOpen: () => {},
    browseFileInputRef: { current: null },
  });

  assert.equal(result.multiSectionProps.selectedKeyIndex, -1);
});
