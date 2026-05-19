import { TimelineInspectorBindingArgsSection } from './TimelineInspectorBindingArgsSection.jsx';
import { TimelineInspectorFrameRow } from './TimelineInspectorFrameRow.jsx';
import { TimelineInspectorValueInput } from './TimelineInspectorValueInput.jsx';
import { useTimelineInspectorEnumOptions } from './timelineInspectorEnumOptions.js';
import { buildTimelineInspectorNonMultiSectionProps } from './timelineInspectorNonMultiSectionProps.js';

export function TimelineInspectorNonMultiSection({
  t,
  isMulti,
  selectedMeta,
  selectedWidget,
  selectedKeyframe,
  selectedKeyframeArgs,
  isNumericValue,
  useTimecodeView,
  keyframeFrameDraft,
  setKeyframeFrameDraft,
  commitKeyframeFrameDraft,
  keyframeValueDraft,
  setKeyframeValueDraft,
  commitKeyframeValueDraft,
  handleRemoveKeyframe,
  handleValueChange,
  presetData,
  updateSelectedKeyframeArgs,
  argColorPicker,
  setArgColorPicker,
  setColorPickerOpen,
  browseFileInputRef
}) {
  const { enumOptions, enumWidthPx } = useTimelineInspectorEnumOptions(
    selectedMeta?.options
  );
  const { frameRowProps, valueInputProps, bindingArgsSectionProps } =
    buildTimelineInspectorNonMultiSectionProps({
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
    });

  if (isMulti) return null;

  return (
    <>
      <TimelineInspectorFrameRow {...frameRowProps} />

      <TimelineInspectorValueInput {...valueInputProps} />

      <TimelineInspectorBindingArgsSection {...bindingArgsSectionProps} />
    </>
  );
}
