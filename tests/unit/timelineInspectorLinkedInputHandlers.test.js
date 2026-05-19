import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineLinkedChannelHandlers } from '../../app/widgets/timeline/timelineInspectorLinkedInputHandlers.js';

test('buildTimelineLinkedChannelHandlers updates draft value on change', () => {
  let nextState = null;
  const handlers = buildTimelineLinkedChannelHandlers({
    channelId: 'tx',
    hasKey: true,
    itemIdx: 2,
    channelFrame: 40,
    setBundleValueDrafts: (updater) => {
      nextState = updater({ existing: 'ok' });
    },
    commitBundleValueDraft: () => {},
    removeChannelKeyframeAt: () => {},
    addChannelKeyframeAt: () => {}
  });

  handlers.handleChange({ target: { value: '12.5' } });
  assert.deepEqual(nextState, { existing: 'ok', tx: '12.5' });
});

test('buildTimelineLinkedChannelHandlers commits on blur only when keyed', () => {
  const committed = [];
  const keyedHandlers = buildTimelineLinkedChannelHandlers({
    channelId: 'ty',
    hasKey: true,
    itemIdx: 0,
    channelFrame: 10,
    setBundleValueDrafts: () => {},
    commitBundleValueDraft: (channelId, value) => committed.push([channelId, value]),
    removeChannelKeyframeAt: () => {},
    addChannelKeyframeAt: () => {}
  });
  keyedHandlers.handleBlur({ target: { value: '9' } });

  const nonKeyedHandlers = buildTimelineLinkedChannelHandlers({
    channelId: 'tz',
    hasKey: false,
    itemIdx: -1,
    channelFrame: 10,
    setBundleValueDrafts: () => {},
    commitBundleValueDraft: (channelId, value) => committed.push([channelId, value]),
    removeChannelKeyframeAt: () => {},
    addChannelKeyframeAt: () => {}
  });
  nonKeyedHandlers.handleBlur({ target: { value: '99' } });

  assert.deepEqual(committed, [['ty', '9']]);
});

test('buildTimelineLinkedChannelHandlers handles Enter key commit and blur', () => {
  const committed = [];
  let prevented = false;
  let blurred = false;
  const handlers = buildTimelineLinkedChannelHandlers({
    channelId: 'rx',
    hasKey: true,
    itemIdx: 3,
    channelFrame: 80,
    setBundleValueDrafts: () => {},
    commitBundleValueDraft: (channelId, value) => committed.push([channelId, value]),
    removeChannelKeyframeAt: () => {},
    addChannelKeyframeAt: () => {}
  });

  handlers.handleKeyDown({
    key: 'Enter',
    preventDefault: () => {
      prevented = true;
    },
    currentTarget: {
      value: '45',
      blur: () => {
        blurred = true;
      }
    }
  });

  assert.equal(prevented, true);
  assert.equal(blurred, true);
  assert.deepEqual(committed, [['rx', '45']]);
});

test('buildTimelineLinkedChannelHandlers ignores non-Enter key', () => {
  const committed = [];
  const handlers = buildTimelineLinkedChannelHandlers({
    channelId: 'ry',
    hasKey: true,
    itemIdx: 1,
    channelFrame: 80,
    setBundleValueDrafts: () => {},
    commitBundleValueDraft: (channelId, value) => committed.push([channelId, value]),
    removeChannelKeyframeAt: () => {},
    addChannelKeyframeAt: () => {}
  });

  handlers.handleKeyDown({
    key: 'Tab',
    preventDefault: () => {
      throw new Error('should not be called');
    },
    currentTarget: {
      value: 'x',
      blur: () => {
        throw new Error('should not be called');
      }
    }
  });

  assert.deepEqual(committed, []);
});

test('buildTimelineLinkedChannelHandlers toggles add/remove keyframe', () => {
  const removed = [];
  const added = [];

  const removeHandlers = buildTimelineLinkedChannelHandlers({
    channelId: 'r',
    hasKey: true,
    itemIdx: 5,
    channelFrame: 22,
    setBundleValueDrafts: () => {},
    commitBundleValueDraft: () => {},
    removeChannelKeyframeAt: (channelId, idx) => removed.push([channelId, idx]),
    addChannelKeyframeAt: (channelId, frame) => added.push([channelId, frame])
  });
  removeHandlers.handleToggleKeyframe();

  const addHandlers = buildTimelineLinkedChannelHandlers({
    channelId: 'g',
    hasKey: false,
    itemIdx: -1,
    channelFrame: 33,
    setBundleValueDrafts: () => {},
    commitBundleValueDraft: () => {},
    removeChannelKeyframeAt: (channelId, idx) => removed.push([channelId, idx]),
    addChannelKeyframeAt: (channelId, frame) => added.push([channelId, frame])
  });
  addHandlers.handleToggleKeyframe();

  assert.deepEqual(removed, [['r', 5]]);
  assert.deepEqual(added, [['g', 33]]);
});
