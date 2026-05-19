export function buildTimelineInspectorLinkedSectionCommonProps({
  t,
  bundleValueDrafts,
  setBundleValueDrafts,
  commitBundleValueDraft,
  removeChannelKeyframeAt,
  addChannelKeyframeAt
}) {
  return {
    t,
    bundleValueDrafts,
    setBundleValueDrafts,
    commitBundleValueDraft,
    removeChannelKeyframeAt,
    addChannelKeyframeAt
  };
}
