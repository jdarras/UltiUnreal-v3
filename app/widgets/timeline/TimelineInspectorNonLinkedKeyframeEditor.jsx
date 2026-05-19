import { TimelineInspectorMultiSection } from './TimelineInspectorMultiSection.jsx';
import { TimelineInspectorNonMultiSection } from './TimelineInspectorNonMultiSection.jsx';
import { isTimelineInspectorMultiMode } from './timelineInspectorModeHelpers.js';
import { buildTimelineInspectorNonLinkedSectionProps } from './timelineInspectorNonLinkedSectionProps.js';

export function TimelineInspectorNonLinkedKeyframeEditor({
  t,
  selectedMeta,
  selectedWidget,
  selectedKeyframe,
  selectedKeyframeArgs,
  selectedKey,
  selectedChannelId,
  selectedChannelLabel,
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
  removeChannelKeyframeAt,
  presetData,
  updateSelectedKeyframeArgs,
  argColorPicker,
  setArgColorPicker,
  setColorPickerOpen,
  browseFileInputRef
}) {
  const isMulti = isTimelineInspectorMultiMode(selectedMeta);
  const { multiSectionProps, nonMultiSectionProps } =
    buildTimelineInspectorNonLinkedSectionProps({
      t,
      isMulti,
      selectedMeta,
      selectedWidget,
      selectedKeyframe,
      selectedKeyframeArgs,
      selectedKey,
      selectedChannelId,
      selectedChannelLabel,
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
      removeChannelKeyframeAt,
      presetData,
      updateSelectedKeyframeArgs,
      argColorPicker,
      setArgColorPicker,
      setColorPickerOpen,
      browseFileInputRef
    });

  return (
    <>
      <TimelineInspectorMultiSection {...multiSectionProps} />

      <TimelineInspectorNonMultiSection {...nonMultiSectionProps} />
    </>
  );
}
