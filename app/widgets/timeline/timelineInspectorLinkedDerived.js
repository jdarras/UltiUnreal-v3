import {
  buildTimelineLinkedColorChannels,
  buildTimelineLinkedGenericChannels,
  buildTimelineLinkedTransformGroups
} from './timelineInspectorLinkedChannelHelpers.js';

export function buildTimelineInspectorLinkedDerived({
  selectedMeta,
  selectedBundle,
  playheadFrame
}) {
  const shape = selectedMeta?.shape;
  const isTransformShape = shape === 'transform';
  const isColorShape = shape === 'color';

  return {
    shape,
    isTransformShape,
    isColorShape,
    transformGroups: isTransformShape
      ? buildTimelineLinkedTransformGroups(selectedBundle, playheadFrame)
      : [],
    colorChannels: isColorShape
      ? buildTimelineLinkedColorChannels(selectedBundle, playheadFrame)
      : [],
    genericChannels:
      !isTransformShape && !isColorShape
        ? buildTimelineLinkedGenericChannels(selectedBundle, playheadFrame)
        : []
  };
}
