import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineHeaderControlsProps } from '../../app/widgets/timeline/timelineHeaderControlsProps.js';
import { buildTimelineHeaderRowProps } from '../../app/widgets/timeline/timelineHeaderRowProps.js';
import { buildTimelineToolbarProps } from '../../app/widgets/timeline/timelineToolbarProps.js';
import { buildTimelineGraphSectionProps } from '../../app/widgets/timeline/timelineGraphSectionProps.js';
import { buildTimelineInspectorProps } from '../../app/widgets/timeline/timelineInspectorProps.js';
import { buildTimelineInspectorNonLinkedSectionProps } from '../../app/widgets/timeline/timelineInspectorNonLinkedSectionProps.js';

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
