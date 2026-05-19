import { TimelineInspectorLinkedKeyframeEditor } from './TimelineInspectorLinkedKeyframeEditor.jsx';
import { TimelineInspectorNonLinkedKeyframeEditor } from './TimelineInspectorNonLinkedKeyframeEditor.jsx';

export function TimelineInspectorKeyframeEditor({
  t,
  selectedMeta,
  selectedWidget,
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
  updateSelectedKeyframeArgs,
  browseFileInputRef
}) {
  if (!selectedKeyframe) return null;

  return (
    <>
      {isLinkedSelected ? (
        <TimelineInspectorLinkedKeyframeEditor
          t={t}
          selectedWidget={selectedWidget}
          selectedMeta={selectedMeta}
          useTimecodeView={useTimecodeView}
          bundleFrameDraft={bundleFrameDraft}
          setBundleFrameDraft={setBundleFrameDraft}
          commitBundleFrameDraft={commitBundleFrameDraft}
          handleRemoveKeyframe={handleRemoveKeyframe}
          colorPickerState={colorPickerState}
          setArgColorPicker={setArgColorPicker}
          setColorPickerOpen={setColorPickerOpen}
          selectedBundle={selectedBundle}
          playheadFrame={playheadFrame}
          bundleValueDrafts={bundleValueDrafts}
          setBundleValueDrafts={setBundleValueDrafts}
          commitBundleValueDraft={commitBundleValueDraft}
          removeChannelKeyframeAt={removeChannelKeyframeAt}
          addChannelKeyframeAt={addChannelKeyframeAt}
          applyColorToBundle={applyColorToBundle}
          colorPickerOpen={colorPickerOpen}
          argColorPicker={argColorPicker}
        />
      ) : (
        <TimelineInspectorNonLinkedKeyframeEditor
          t={t}
          selectedMeta={selectedMeta}
          selectedWidget={selectedWidget}
          selectedKeyframe={selectedKeyframe}
          selectedKeyframeArgs={selectedKeyframeArgs}
          selectedKey={selectedKey}
          selectedChannelId={selectedChannelId}
          selectedChannelLabel={selectedChannelLabel}
          isNumericValue={isNumericValue}
          useTimecodeView={useTimecodeView}
          keyframeFrameDraft={keyframeFrameDraft}
          setKeyframeFrameDraft={setKeyframeFrameDraft}
          commitKeyframeFrameDraft={commitKeyframeFrameDraft}
          keyframeValueDraft={keyframeValueDraft}
          setKeyframeValueDraft={setKeyframeValueDraft}
          commitKeyframeValueDraft={commitKeyframeValueDraft}
          handleRemoveKeyframe={handleRemoveKeyframe}
          handleValueChange={handleValueChange}
          removeChannelKeyframeAt={removeChannelKeyframeAt}
          presetData={presetData}
          updateSelectedKeyframeArgs={updateSelectedKeyframeArgs}
          argColorPicker={argColorPicker}
          setArgColorPicker={setArgColorPicker}
          setColorPickerOpen={setColorPickerOpen}
          browseFileInputRef={browseFileInputRef}
        />
      )}
    </>
  );
}
