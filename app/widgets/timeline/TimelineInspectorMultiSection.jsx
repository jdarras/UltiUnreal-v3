import { TimelineInspectorFrameRow } from './TimelineInspectorFrameRow.jsx';
import { TimelineInspectorMultiChannelValueRow } from './TimelineInspectorMultiChannelValueRow.jsx';

export function TimelineInspectorMultiSection({
  t,
  isMulti,
  useTimecodeView,
  keyframeFrameDraft,
  setKeyframeFrameDraft,
  commitKeyframeFrameDraft,
  selectedChannelLabel,
  isNumericValue,
  keyframeValueDraft,
  setKeyframeValueDraft,
  commitKeyframeValueDraft,
  selectedChannelId,
  selectedKeyIndex,
  removeChannelKeyframeAt
}) {
  if (!isMulti) return null;

  return (
    <>
      <TimelineInspectorFrameRow
        t={t}
        useTimecodeView={useTimecodeView}
        keyframeFrameDraft={keyframeFrameDraft}
        setKeyframeFrameDraft={setKeyframeFrameDraft}
        commitKeyframeFrameDraft={commitKeyframeFrameDraft}
        rowClassName="uu-row mt-4 uu-align-center uu-gap-8"
      />

      <TimelineInspectorMultiChannelValueRow
        t={t}
        selectedChannelLabel={selectedChannelLabel}
        isNumericValue={isNumericValue}
        keyframeValueDraft={keyframeValueDraft}
        setKeyframeValueDraft={setKeyframeValueDraft}
        commitKeyframeValueDraft={commitKeyframeValueDraft}
        selectedChannelId={selectedChannelId}
        selectedKeyIndex={selectedKeyIndex}
        removeChannelKeyframeAt={removeChannelKeyframeAt}
      />
    </>
  );
}
