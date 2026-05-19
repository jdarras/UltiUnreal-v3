import { TimelineInspectorLinkedChannelsList } from './TimelineInspectorLinkedChannelsList.jsx';
import {
  INSPECTOR_WIDTH_100_STYLE,
  INSPECTOR_WIDTH_140_STYLE,
  INSPECTOR_MIN_WIDTH_520_STYLE,
  INSPECTOR_FLEX_ITEM_200_STYLE
} from './timelineInspectorStyles.js';

export function TimelineInspectorLinkedTransformSection({
  t,
  transformGroups,
  bundleValueDrafts,
  setBundleValueDrafts,
  commitBundleValueDraft,
  removeChannelKeyframeAt,
  addChannelKeyframeAt
}) {
  return transformGroups.map((group) => (
    <div
      key={`grp-${group.label}`}
      className="uu-row uu-align-center uu-gap-12 uu-wrap"
      style={INSPECTOR_MIN_WIDTH_520_STYLE}
    >
      <label className="uu-label" style={INSPECTOR_WIDTH_100_STYLE}>
        {group.label}
      </label>
      <TimelineInspectorLinkedChannelsList
        t={t}
        channels={group.channels}
        getLabel={({ axisLabel }) => axisLabel}
        labelClassName="uu-muted"
        inputWidthStyle={INSPECTOR_WIDTH_140_STYLE}
        rowStyle={INSPECTOR_FLEX_ITEM_200_STYLE}
        bundleValueDrafts={bundleValueDrafts}
        setBundleValueDrafts={setBundleValueDrafts}
        commitBundleValueDraft={commitBundleValueDraft}
        removeChannelKeyframeAt={removeChannelKeyframeAt}
        addChannelKeyframeAt={addChannelKeyframeAt}
      />
    </div>
  ));
}
