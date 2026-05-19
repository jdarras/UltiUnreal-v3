import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineInspectorLinkedDerived } from '../../app/widgets/timeline/timelineInspectorLinkedDerived.js';

test('buildTimelineInspectorLinkedDerived resolves transform mode only', () => {
  const result = buildTimelineInspectorLinkedDerived({
    selectedMeta: { shape: 'transform' },
    selectedBundle: {
      frame: 12,
      items: [{ channel: { id: 'tx' }, idx: 0, keyframe: { frame: 12 } }]
    },
    playheadFrame: 5
  });

  assert.equal(result.shape, 'transform');
  assert.equal(result.isTransformShape, true);
  assert.equal(result.isColorShape, false);
  assert.equal(result.transformGroups.length, 3);
  assert.equal(result.colorChannels.length, 0);
  assert.equal(result.genericChannels.length, 0);
});

test('buildTimelineInspectorLinkedDerived resolves color mode only', () => {
  const result = buildTimelineInspectorLinkedDerived({
    selectedMeta: { shape: 'color' },
    selectedBundle: {
      items: [{ channel: { id: 'r' }, idx: 0, keyframe: { frame: 1 } }]
    },
    playheadFrame: 8
  });

  assert.equal(result.shape, 'color');
  assert.equal(result.isTransformShape, false);
  assert.equal(result.isColorShape, true);
  assert.equal(result.transformGroups.length, 0);
  assert.equal(result.colorChannels.length, 4);
  assert.equal(result.genericChannels.length, 0);
});

test('buildTimelineInspectorLinkedDerived resolves generic mode when shape is neither transform nor color', () => {
  const result = buildTimelineInspectorLinkedDerived({
    selectedMeta: { shape: 'number' },
    selectedBundle: {
      items: [{ channel: { id: 'value', label: 'Value' }, idx: 0, keyframe: {} }]
    },
    playheadFrame: 20
  });

  assert.equal(result.shape, 'number');
  assert.equal(result.isTransformShape, false);
  assert.equal(result.isColorShape, false);
  assert.equal(result.transformGroups.length, 0);
  assert.equal(result.colorChannels.length, 0);
  assert.equal(result.genericChannels.length, 1);
});
