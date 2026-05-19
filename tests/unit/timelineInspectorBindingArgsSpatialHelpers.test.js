import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TIMELINE_BINDING_ROTATOR_AXES,
  TIMELINE_BINDING_TRANSFORM_BLOCKS,
  TIMELINE_BINDING_VECTOR_AXES,
  normalizeTimelineBindingArgObject,
  parseTimelineBindingArgNumeric,
  updateTimelineBindingRotatorAxis,
  updateTimelineBindingTransformPart,
  updateTimelineBindingVectorAxis
} from '../../app/widgets/timeline/timelineInspectorBindingArgsSpatialHelpers.js';

test('spatial constants expose expected axis definitions', () => {
  assert.deepEqual(TIMELINE_BINDING_VECTOR_AXES, ['X', 'Y', 'Z']);
  assert.equal(TIMELINE_BINDING_ROTATOR_AXES.length, 3);
  assert.equal(TIMELINE_BINDING_TRANSFORM_BLOCKS.length, 3);
});

test('normalizeTimelineBindingArgObject returns object fallback', () => {
  const obj = { a: 1 };
  assert.equal(normalizeTimelineBindingArgObject(obj), obj);
  assert.deepEqual(normalizeTimelineBindingArgObject(null), {});
  assert.deepEqual(normalizeTimelineBindingArgObject('x'), {});
});

test('parseTimelineBindingArgNumeric preserves empty and parses numbers', () => {
  assert.equal(parseTimelineBindingArgNumeric(''), '');
  assert.equal(parseTimelineBindingArgNumeric('12.5'), 12.5);
});

test('updateTimelineBindingVectorAxis updates axis value immutably', () => {
  const current = { X: 1, Y: 2 };
  const next = updateTimelineBindingVectorAxis(current, 'Z', '3');
  assert.deepEqual(next, { X: 1, Y: 2, Z: 3 });
  assert.notEqual(next, current);
});

test('updateTimelineBindingRotatorAxis updates rotator property immutably', () => {
  const current = { Pitch: 1, Yaw: 2 };
  const next = updateTimelineBindingRotatorAxis(current, 'Roll', '4');
  assert.deepEqual(next, { Pitch: 1, Yaw: 2, Roll: 4 });
  assert.notEqual(next, current);
});

test('updateTimelineBindingTransformPart updates nested part while preserving others', () => {
  const current = {
    Translation: { X: 1, Y: 2, Z: 3 },
    Rotation: { Roll: 10, Pitch: 20, Yaw: 30 },
    Scale3D: { X: 1, Y: 1, Z: 1 }
  };
  const next = updateTimelineBindingTransformPart(
    current,
    'Rotation',
    'Yaw',
    '45'
  );

  assert.deepEqual(next.Rotation, { Roll: 10, Pitch: 20, Yaw: 45 });
  assert.deepEqual(next.Translation, current.Translation);
  assert.deepEqual(next.Scale3D, current.Scale3D);
  assert.notEqual(next, current);
  assert.notEqual(next.Rotation, current.Rotation);
});

test('updateTimelineBindingTransformPart keeps structure on invalid part', () => {
  const current = { Translation: { X: 1 } };
  const next = updateTimelineBindingTransformPart(current, 'Unknown', 'X', '2');
  assert.deepEqual(next, {
    Translation: { X: 1 },
    Rotation: {},
    Scale3D: {}
  });
});
