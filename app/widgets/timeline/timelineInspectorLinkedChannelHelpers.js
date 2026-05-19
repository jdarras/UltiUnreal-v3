const TRANSFORM_GROUPS = [
  { label: 'Location', ids: ['tx', 'ty', 'tz'] },
  { label: 'Rotation', ids: ['rroll', 'rpitch', 'ryaw'] },
  { label: 'Scale', ids: ['sx', 'sy', 'sz'] }
];

const AXIS_LABELS = ['X', 'Y', 'Z'];
const COLOR_CHANNEL_IDS = ['r', 'g', 'b', 'a'];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function isTimelineBundleItemKeyed(item) {
  return item?.idx != null && item.idx >= 0 && !!item.keyframe;
}

export function getTimelineBundleChannelFrame(selectedBundle, playheadFrame) {
  return selectedBundle?.frame ?? playheadFrame;
}

export function findTimelineBundleChannelItem(items, channelId) {
  return (
    asArray(items).find((it) => it?.channel?.id === channelId) || {}
  );
}

export function buildTimelineLinkedTransformGroups(selectedBundle, playheadFrame) {
  const items = asArray(selectedBundle?.items);
  const channelFrame = getTimelineBundleChannelFrame(selectedBundle, playheadFrame);

  return TRANSFORM_GROUPS.map((group) => ({
    label: group.label,
    channels: group.ids.map((channelId, axisIdx) => {
      const item = findTimelineBundleChannelItem(items, channelId);
      return {
        channelId,
        item,
        hasKey: isTimelineBundleItemKeyed(item),
        channelFrame,
        axisLabel: AXIS_LABELS[axisIdx] || String(channelId || '').toUpperCase()
      };
    })
  }));
}

export function buildTimelineLinkedColorChannels(selectedBundle, playheadFrame) {
  const items = asArray(selectedBundle?.items);
  const channelFrame = getTimelineBundleChannelFrame(selectedBundle, playheadFrame);

  return COLOR_CHANNEL_IDS.map((channelId) => {
    const item = findTimelineBundleChannelItem(items, channelId);
    return {
      channelId,
      item,
      hasKey: isTimelineBundleItemKeyed(item),
      channelFrame,
      label: String(item.channel?.label || channelId || '').toUpperCase()
    };
  });
}

export function buildTimelineLinkedGenericChannels(selectedBundle, playheadFrame) {
  const items = asArray(selectedBundle?.items);
  const channelFrame = getTimelineBundleChannelFrame(selectedBundle, playheadFrame);

  return items.map((item) => {
    const channelId = item?.channel?.id || '';
    return {
      channelId,
      item,
      hasKey: isTimelineBundleItemKeyed(item),
      channelFrame,
      label: item?.channel?.label || channelId || '-'
    };
  });
}
