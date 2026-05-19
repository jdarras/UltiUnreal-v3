import { TimelineInspectorLinkedChannelRow } from './TimelineInspectorLinkedChannelRow.jsx';
import { buildTimelineLinkedChannelHandlers } from './timelineInspectorLinkedInputHandlers.js';

export function TimelineInspectorLinkedChannelsList({
  t,
  channels,
  getLabel,
  labelClassName,
  inputWidthStyle,
  rowStyle,
  deleteTitleFallback = '',
  bundleValueDrafts,
  setBundleValueDrafts,
  commitBundleValueDraft,
  removeChannelKeyframeAt,
  addChannelKeyframeAt
}) {
  return channels.map(({ channelId, item, hasKey, channelFrame, label, axisLabel }) => {
    const {
      handleChange,
      handleBlur,
      handleKeyDown,
      handleToggleKeyframe
    } = buildTimelineLinkedChannelHandlers({
      channelId,
      hasKey,
      itemIdx: item.idx,
      channelFrame,
      setBundleValueDrafts,
      commitBundleValueDraft,
      removeChannelKeyframeAt,
      addChannelKeyframeAt
    });

    const resolvedLabel =
      typeof getLabel === 'function'
        ? getLabel({ channelId, item, hasKey, channelFrame, label, axisLabel })
        : (axisLabel ?? label ?? channelId ?? '-');

    return (
      <TimelineInspectorLinkedChannelRow
        key={`bundle-${channelId}`}
        t={t}
        label={resolvedLabel}
        labelClassName={labelClassName}
        hasKey={hasKey}
        value={bundleValueDrafts[channelId] ?? ''}
        inputWidthStyle={inputWidthStyle}
        rowStyle={rowStyle}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onToggleKeyframe={handleToggleKeyframe}
        deleteTitleFallback={deleteTitleFallback}
      />
    );
  });
}
