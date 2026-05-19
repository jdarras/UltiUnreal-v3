export function buildTimelineLinkedChannelHandlers({
  channelId,
  hasKey,
  itemIdx,
  channelFrame,
  setBundleValueDrafts,
  commitBundleValueDraft,
  removeChannelKeyframeAt,
  addChannelKeyframeAt
}) {
  const handleChange = (event) => {
    const nextValue = event.target.value;
    setBundleValueDrafts((prev) => ({
      ...prev,
      [channelId]: nextValue
    }));
  };

  const handleBlur = (event) => {
    if (!hasKey) return;
    commitBundleValueDraft(channelId, event.target.value);
  };

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (hasKey) {
      commitBundleValueDraft(channelId, event.currentTarget.value);
    }
    event.currentTarget.blur();
  };

  const handleToggleKeyframe = () => {
    if (hasKey) {
      removeChannelKeyframeAt(channelId, itemIdx);
      return;
    }
    addChannelKeyframeAt(channelId, channelFrame);
  };

  return {
    handleChange,
    handleBlur,
    handleKeyDown,
    handleToggleKeyframe
  };
}
