import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimelineLinkedColorChannels,
  buildTimelineLinkedGenericChannels,
  buildTimelineLinkedTransformGroups,
  findTimelineBundleChannelItem,
  getTimelineBundleChannelFrame,
  isTimelineBundleItemKeyed
} from '../../app/widgets/timeline/timelineInspectorLinkedChannelHelpers.js';

test('isTimelineBundleItemKeyed detects keyed items only', () => {
  assert.equal(isTimelineBundleItemKeyed(null), false);
  assert.equal(isTimelineBundleItemKeyed({ idx: -1, keyframe: {} }), false);
  assert.equal(isTimelineBundleItemKeyed({ idx: 0, keyframe: null }), false);
  assert.equal(isTimelineBundleItemKeyed({ idx: 2, keyframe: { frame: 10 } }), true);
});

test('getTimelineBundleChannelFrame uses bundle frame with fallback to playhead', () => {
  assert.equal(getTimelineBundleChannelFrame({ frame: 42 }, 10), 42);
  assert.equal(getTimelineBundleChannelFrame({}, 10), 10);
  assert.equal(getTimelineBundleChannelFrame(null, 10), 10);
});

test('findTimelineBundleChannelItem returns matching item or empty object', () => {
  const items = [{ channel: { id: 'x' }, idx: 1 }];
  assert.deepEqual(findTimelineBundleChannelItem(items, 'x'), items[0]);
  assert.deepEqual(findTimelineBundleChannelItem(items, 'y'), {});
  assert.deepEqual(findTimelineBundleChannelItem(null, 'x'), {});
});

test('buildTimelineLinkedTransformGroups builds grouped channel specs', () => {
  const selectedBundle = {
    frame: 120,
    items: [
      { channel: { id: 'tx' }, idx: 0, keyframe: { frame: 120 } },
      { channel: { id: 'ryaw' }, idx: 3, keyframe: { frame: 120 } },
    ],
  };

  const groups = buildTimelineLinkedTransformGroups(selectedBundle, 10);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].label, 'Location');
  assert.equal(groups[0].channels[0].channelId, 'tx');
  assert.equal(groups[0].channels[0].hasKey, true);
  assert.equal(groups[0].channels[0].channelFrame, 120);
  assert.equal(groups[1].channels[2].channelId, 'ryaw');
  assert.equal(groups[1].channels[2].axisLabel, 'Z');
});

test('buildTimelineLinkedColorChannels normalizes labels and key state', () => {
  const selectedBundle = {
    items: [
      { channel: { id: 'r', label: 'Red' }, idx: 0, keyframe: { frame: 1 } },
      { channel: { id: 'a' }, idx: -1, keyframe: null },
    ],
  };

  const channels = buildTimelineLinkedColorChannels(selectedBundle, 55);
  assert.equal(channels.length, 4);
  assert.equal(channels[0].channelId, 'r');
  assert.equal(channels[0].label, 'RED');
  assert.equal(channels[0].hasKey, true);
  assert.equal(channels[3].channelId, 'a');
  assert.equal(channels[3].hasKey, false);
  assert.equal(channels[3].channelFrame, 55);
});

test('buildTimelineLinkedGenericChannels keeps item labels with fallback', () => {
  const selectedBundle = {
    frame: 7,
    items: [
      { channel: { id: 'foo', label: 'Foo' }, idx: 1, keyframe: {} },
      { channel: {}, idx: -1, keyframe: null },
    ],
  };

  const channels = buildTimelineLinkedGenericChannels(selectedBundle, 99);
  assert.equal(channels.length, 2);
  assert.equal(channels[0].channelId, 'foo');
  assert.equal(channels[0].label, 'Foo');
  assert.equal(channels[0].channelFrame, 7);
  assert.equal(channels[1].label, '-');
});
