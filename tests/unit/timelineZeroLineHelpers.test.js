import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimelineZeroLineModels,
  resolveTimelineZeroLineY,
} from '../../app/widgets/timeline/timelineZeroLineHelpers.js';

test('resolveTimelineZeroLineY returns null when zero is outside the range', () => {
  const bounds = { top: 10, bottom: 110 };

  assert.equal(resolveTimelineZeroLineY({ min: 1, max: 2 }, bounds), null);
  assert.equal(resolveTimelineZeroLineY({ min: -2, max: -1 }, bounds), null);
  assert.equal(resolveTimelineZeroLineY({ min: -1, max: 1 }, bounds), 60);
});

test('buildTimelineZeroLineModels builds simple track zero line', () => {
  const entry = {
    track: { widgetId: 'track-a' },
    meta: { kind: 'number' },
    keyframes: [{ value: 0 }],
  };

  assert.deepEqual(
    buildTimelineZeroLineModels({
      entry,
      contentBounds: { top: 0, bottom: 100 },
      getNumericRange: () => ({ min: -1, max: 1 }),
    }),
    [{ key: 'zero-track-a', y: 50 }]
  );
});

test('buildTimelineZeroLineModels uses shared vector graph zero line once', () => {
  const entry = {
    track: { widgetId: 'track-vector' },
    meta: { kind: 'multi', shape: 'vector' },
    sharedRange: { min: -10, max: 10 },
  };

  assert.deepEqual(
    buildTimelineZeroLineModels({
      entry,
      rowLines: [{ channel: { id: 'x' }, bounds: { top: 0, bottom: 20 } }],
      contentBounds: { top: 0, bottom: 100 },
      getNumericRange: () => ({ min: -1, max: 1 }),
    }),
    [{ key: 'zero-track-vector', y: 50 }]
  );
});

test('buildTimelineZeroLineModels groups transform and color zero lines', () => {
  const transformEntry = {
    track: { widgetId: 'track-transform' },
    meta: { kind: 'multi', shape: 'transform' },
    channelRanges: {
      tx: { min: -1, max: 1 },
      ty: { min: -1, max: 1 },
      rroll: { min: -180, max: 180 },
    },
  };

  assert.deepEqual(
    buildTimelineZeroLineModels({
      entry: transformEntry,
      rowLines: [
        { channel: { id: 'tx' }, bounds: { top: 0, bottom: 20 } },
        { channel: { id: 'ty' }, bounds: { top: 20, bottom: 40 } },
        { channel: { id: 'rroll' }, bounds: { top: 40, bottom: 60 } },
      ],
      contentBounds: { top: 0, bottom: 60 },
      getNumericRange: () => ({ min: -1, max: 1 }),
    }),
    [
      { key: 'zero-track-transform-tx', y: 10 },
      { key: 'zero-track-transform-rroll', y: 50 },
    ]
  );

  const colorEntry = {
    track: { widgetId: 'track-color' },
    meta: { kind: 'multi', shape: 'color' },
    channelRanges: {
      r: { min: 0, max: 1 },
      g: { min: 0, max: 1 },
      a: { min: 0, max: 1 },
    },
  };

  assert.deepEqual(
    buildTimelineZeroLineModels({
      entry: colorEntry,
      rowLines: [
        { channel: { id: 'r' }, bounds: { top: 0, bottom: 20 } },
        { channel: { id: 'g' }, bounds: { top: 20, bottom: 40 } },
        { channel: { id: 'a' }, bounds: { top: 40, bottom: 60 } },
      ],
      contentBounds: { top: 0, bottom: 60 },
      getNumericRange: () => ({ min: -1, max: 1 }),
    }),
    [
      { key: 'zero-track-color-r', y: 20 },
      { key: 'zero-track-color-a', y: 60 },
    ]
  );
});
