import { TimelineInspectorLinkedColorChannelsSection } from './TimelineInspectorLinkedColorChannelsSection.jsx';
import { TimelineInspectorLinkedColorRow } from './TimelineInspectorLinkedColorRow.jsx';
import { TimelineInspectorLinkedColorPopover } from './TimelineInspectorLinkedColorPopover.jsx';
import { TimelineInspectorFrameRow } from './TimelineInspectorFrameRow.jsx';
import { TimelineInspectorLinkedGenericChannelsSection } from './TimelineInspectorLinkedGenericChannelsSection.jsx';
import { TimelineInspectorLinkedTransformSection } from './TimelineInspectorLinkedTransformSection.jsx';
import { buildTimelineInspectorLinkedDerived } from './timelineInspectorLinkedDerived.js';
import { buildTimelineInspectorLinkedSectionCommonProps } from './timelineInspectorLinkedSectionProps.js';
import {
  INSPECTOR_COL_GAP_12_STYLE
} from './timelineInspectorStyles.js';

export function TimelineInspectorLinkedKeyframeEditor({
  t,
  selectedWidget,
  selectedMeta,
  useTimecodeView,
  bundleFrameDraft,
  setBundleFrameDraft,
  commitBundleFrameDraft,
  handleRemoveKeyframe,
  colorPickerState,
  setArgColorPicker,
  setColorPickerOpen,
  selectedBundle,
  playheadFrame,
  bundleValueDrafts,
  setBundleValueDrafts,
  commitBundleValueDraft,
  removeChannelKeyframeAt,
  addChannelKeyframeAt,
  applyColorToBundle,
  colorPickerOpen,
  argColorPicker
}) {
  const {
    isTransformShape,
    isColorShape,
    transformGroups,
    colorChannels,
    genericChannels
  } = buildTimelineInspectorLinkedDerived({
    selectedMeta,
    selectedBundle,
    playheadFrame
  });
  const linkedSectionCommonProps = buildTimelineInspectorLinkedSectionCommonProps({
    t,
    bundleValueDrafts,
    setBundleValueDrafts,
    commitBundleValueDraft,
    removeChannelKeyframeAt,
    addChannelKeyframeAt
  });

  return (
    <>
      <TimelineInspectorFrameRow
        t={t}
        useTimecodeView={useTimecodeView}
        keyframeFrameDraft={bundleFrameDraft}
        setKeyframeFrameDraft={setBundleFrameDraft}
        commitKeyframeFrameDraft={commitBundleFrameDraft}
        rowClassName="uu-row mt-4 uu-align-center uu-gap-8"
        labelClassName="uu-label w-80"
        labelStyle={null}
        showDelete={selectedWidget?.type === 'button'}
        deleteTitle={t('widgets.common.deleteKeyframe')}
        onDelete={handleRemoveKeyframe}
      />

      {isColorShape ? (
        <TimelineInspectorLinkedColorRow
          t={t}
          colorPickerState={colorPickerState}
          setArgColorPicker={setArgColorPicker}
          setColorPickerOpen={setColorPickerOpen}
        />
      ) : null}

      <div className="uu-col mt-10" style={INSPECTOR_COL_GAP_12_STYLE}>
        {isTransformShape
          ? (
            <TimelineInspectorLinkedTransformSection
              {...linkedSectionCommonProps}
              transformGroups={transformGroups}
            />
          )
          : isColorShape
          ? (
            <TimelineInspectorLinkedColorChannelsSection
              {...linkedSectionCommonProps}
              colorChannels={colorChannels}
            />
          ) : (
            <TimelineInspectorLinkedGenericChannelsSection
              {...linkedSectionCommonProps}
              genericChannels={genericChannels}
            />
          )}
      </div>

      {isColorShape && colorPickerOpen && !argColorPicker.open ? (
        <TimelineInspectorLinkedColorPopover
          colorPickerState={colorPickerState}
          applyColorToBundle={applyColorToBundle}
          setColorPickerOpen={setColorPickerOpen}
        />
      ) : null}
    </>
  );
}
