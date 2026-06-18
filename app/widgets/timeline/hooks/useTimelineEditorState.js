import { useState } from 'react';

export function useTimelineEditorState(initial) {
  const [timelineDraft, setTimelineDraft] = useState(initial);
  const [selectedTrackId, setSelectedTrackId] = useState(
    initial.tracks?.[0]?.widgetId || ''
  );
  const [selectedKey, setSelectedKey] = useState(null);
  const [multiSelection, setMultiSelection] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [playheadFrame, setPlayheadFrame] = useState(0);
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
  const [zoomFactor, setZoomFactor] = useState(1);
  const [viewStart, setViewStart] = useState(0);
  const [bundleFrameDraft, setBundleFrameDraft] = useState('');
  const [bundleValueDrafts, setBundleValueDrafts] = useState({});
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [lassoBox, setLassoBox] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerState, setColorPickerState] = useState({
    hex: '#ffffff',
    alpha: 1,
  });
  const [argColorPicker, setArgColorPicker] = useState({
    open: false,
    name: '',
    hex: '#ffffff',
    alpha: 1,
  });

  return {
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
    editorPaused,
    setEditorPaused,
    timecodeInput,
    setTimecodeInput,
    useTimecodeView,
    setUseTimecodeView,
    timecodeEditing,
    setTimecodeEditing,
    keyframeFrameDraft,
    setKeyframeFrameDraft,
    keyframeValueDraft,
    setKeyframeValueDraft,
    keyframeInTanDraft,
    setKeyframeInTanDraft,
    keyframeOutTanDraft,
    setKeyframeOutTanDraft,
    keyframeInSpanDraft,
    setKeyframeInSpanDraft,
    keyframeOutSpanDraft,
    setKeyframeOutSpanDraft,
    keyframeType,
    setKeyframeType,
    zoomFactor,
    setZoomFactor,
    viewStart,
    setViewStart,
    bundleFrameDraft,
    setBundleFrameDraft,
    bundleValueDrafts,
    setBundleValueDrafts,
    showAddMenu,
    setShowAddMenu,
    lassoBox,
    setLassoBox,
    colorPickerOpen,
    setColorPickerOpen,
    colorPickerState,
    setColorPickerState,
    argColorPicker,
    setArgColorPicker,
  };
}
