export function buildTimelineInspectorNonMultiSectionProps({
  t,
  useTimecodeView,
  keyframeFrameDraft,
  setKeyframeFrameDraft,
  commitKeyframeFrameDraft,
  handleRemoveKeyframe,
  selectedMeta,
  selectedKeyframe,
  selectedWidget,
  isNumericValue,
  keyframeValueDraft,
  setKeyframeValueDraft,
  commitKeyframeValueDraft,
  handleValueChange,
  enumOptions,
  enumWidthPx,
  browseFileInputRef,
  selectedKeyframeArgs,
  presetData,
  updateSelectedKeyframeArgs,
  argColorPicker,
  setArgColorPicker,
  setColorPickerOpen
}) {
  return {
    frameRowProps: {
      t,
      useTimecodeView,
      keyframeFrameDraft,
      setKeyframeFrameDraft,
      commitKeyframeFrameDraft,
      rowClassName: 'uu-row mt-6 uu-align-center uu-gap-8',
      showDelete: true,
      deleteTitle: t('widgets.common.deleteKeyframe'),
      onDelete: handleRemoveKeyframe
    },
    valueInputProps: {
      t,
      selectedMeta,
      selectedKeyframe,
      selectedWidget,
      isNumericValue,
      keyframeValueDraft,
      setKeyframeValueDraft,
      commitKeyframeValueDraft,
      handleValueChange,
      enumOptions,
      enumWidthPx,
      browseFileInputRef
    },
    bindingArgsSectionProps: {
      t,
      selectedWidget,
      selectedKeyframeArgs,
      presetData,
      updateSelectedKeyframeArgs,
      argColorPicker,
      setArgColorPicker,
      setColorPickerOpen
    }
  };
}
