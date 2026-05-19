import { TimelineInspectorLinkedChannelsList } from './TimelineInspectorLinkedChannelsList.jsx';
import {
  INSPECTOR_WIDTH_120_STYLE,
  INSPECTOR_ROW_WRAP_GAP_16_STYLE,
  INSPECTOR_FLEX_ITEM_180_STYLE
} from './timelineInspectorStyles.js';

export function TimelineInspectorLinkedGenericChannelsSection({
  t,
  genericChannels,
  bundleValueDrafts,
  setBundleValueDrafts,
  commitBundleValueDraft,
  removeChannelKeyframeAt,
  addChannelKeyframeAt
}) {
  return (
    <div className="uu-row uu-align-center uu-gap-6 uu-wrap" style={INSPECTOR_ROW_WRAP_GAP_16_STYLE}>
      <TimelineInspectorLinkedChannelsList
        t={t}
        channels={genericChannels}
        getLabel={({ label }) => label}
        labelClassName="uu-axis-inline"
        inputWidthStyle={INSPECTOR_WIDTH_120_STYLE}
        rowStyle={INSPECTOR_FLEX_ITEM_180_STYLE}
        bundleValueDrafts={bundleValueDrafts}
        setBundleValueDrafts={setBundleValueDrafts}
        commitBundleValueDraft={commitBundleValueDraft}
        removeChannelKeyframeAt={removeChannelKeyframeAt}
        addChannelKeyframeAt={addChannelKeyframeAt}
      />
    </div>
  );
}
