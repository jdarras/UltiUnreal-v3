function buildTimelineInspectorDerived({
  selectedTrackId,
  selectedWidget,
  selectedMeta,
  selectedKey,
  selectedChannelId,
}) {
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

  return {
    selectedTargets,
    hasSelectedTargets,
    missingSelectedWidget,
    selectedChannelLabel,
    isNumericValue,
  };
}

export function buildTimelineInspectorProps({
  t,
  timelineWidgetId,
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
}) {
  const {
    selectedTargets,
    hasSelectedTargets,
    missingSelectedWidget,
    selectedChannelLabel,
    isNumericValue,
  } = buildTimelineInspectorDerived({
    selectedTrackId,
    selectedWidget,
    selectedMeta,
    selectedKey,
    selectedChannelId,
  });

  return {
    t,
    timelineWidgetId,
    layoutId,
    missingSelectedWidget,
    selectedWidget,
    selectedTrack,
    selectedMeta,
    selectedKeyframe,
    selectedKeyframeArgs,
    selectedKey,
    selectedChannelId,
    selectedChannelLabel,
    selectedBundle,
    isLinkedSelected,
    isNumericValue,
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
    hasSelectedTargets,
    selectedTargets,
    syncTimelineWidgetTargets,
    colorClass,
    browseFileInputRef,
  };
}
