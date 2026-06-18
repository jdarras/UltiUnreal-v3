import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimelineCurvePath,
  buildTimelineKeyframePoints,
  buildTimelinePointStyle,
  buildTimelineStrokeStyle,
  extendTimelineCurvePoints,
  resolveTimelinePointSelection,
  resolveTimelinePointShape,
} from '../../app/widgets/timeline/timelineCurveHelpers.js';

test('resolveTimelinePointShape maps interpolation types', () => {
  assert.equal(resolveTimelinePointShape('constant'), 'square');
  assert.equal(resolveTimelinePointShape('bezier'), 'diamond');
  assert.equal(resolveTimelinePointShape('linear'), 'circle');
  assert.equal(resolveTimelinePointShape('linear', true), 'square');
});

test('resolveTimelinePointSelection handles active and multi-selected points', () => {
  assert.deepEqual(
    resolveTimelinePointSelection({
      selectedKey: { trackId: 'track-a', channelId: 'x', idx: 1 },
      multiSelection: [{ trackId: 'track-a', channelId: 'x', idx: 2 }],
      trackId: 'track-a',
      channelId: 'x',
      idx: 1,
    }),
    { active: true, multiActive: false }
  );

  assert.deepEqual(
    resolveTimelinePointSelection({
      selectedKey: null,
      multiSelection: [{ trackId: 'track-a', channelId: undefined, idx: 2 }],
      trackId: 'track-a',
      channelId: null,
      idx: 2,
    }),
    { active: false, multiActive: true }
  );

  assert.deepEqual(
    resolveTimelinePointSelection({
      selectedKey: { trackId: 'track-a', channelId: null, idx: 2 },
      multiSelection: [{ trackId: 'track-a', channelId: undefined, idx: 2 }],
      trackId: 'track-a',
      channelId: null,
      idx: 2,
    }),
    { active: true, multiActive: false }
  );
});

test('extendTimelineCurvePoints adds graph boundary points', () => {
  const points = [
    { x: 10, y: 20, shape: 'circle' },
    { x: 30, y: 40, shape: 'square' },
  ];

  assert.deepEqual(extendTimelineCurvePoints(points, 0, 100), [
    { x: 0, y: 20, shape: 'circle' },
    { x: 10, y: 20, shape: 'circle' },
    { x: 30, y: 40, shape: 'square' },
    { x: 100, y: 40, shape: 'square' },
  ]);
  assert.deepEqual(extendTimelineCurvePoints([], 0, 100), []);
});

test('buildTimelineKeyframePoints maps keyframes to sorted SVG points', () => {
  const entry = { offset: 0 };
  const bounds = { top: 0, bottom: 100, mid: 50 };
  const frameToX = (frame) => frame * 2;
  const toGlobalFrame = (_entry, frame) => frame + 1;

  assert.deepEqual(
    buildTimelineKeyframePoints({
      keyframes: [
        { frame: 9, value: 0.5, interp: 'bezier', inTangent: -1, outSpan: 3 },
        { frame: 1, value: 0, interp: 'constant' },
      ],
      entry,
      bounds,
      range: { min: 0, max: 1 },
      frameToX,
      toGlobalFrame,
    }),
    [
      {
        idx: 1,
        x: 4,
        y: 100,
        value: 0,
        shape: 'square',
        inTangent: undefined,
        outTangent: undefined,
        inSpan: undefined,
        outSpan: undefined,
      },
      {
        idx: 0,
        x: 20,
        y: 50,
        value: 0.5,
        shape: 'diamond',
        inTangent: -1,
        outTangent: undefined,
        inSpan: undefined,
        outSpan: 3,
      },
    ]
  );
});

test('buildTimelineKeyframePoints preserves discrete midpoint and finite value filtering', () => {
  const baseArgs = {
    keyframes: [
      { frame: 1, value: 'off' },
      { frame: 2, value: 0.25 },
    ],
    entry: {},
    bounds: { top: 0, bottom: 100, mid: 50 },
    range: { min: 0, max: 1 },
    frameToX: (frame) => frame,
    toGlobalFrame: (_entry, frame) => frame,
  };

  assert.deepEqual(buildTimelineKeyframePoints({ ...baseArgs, isSquareKind: true }), [
    { idx: 0, x: 1, y: 50, value: 'off', shape: 'square' },
    { idx: 1, x: 2, y: 50, value: 0.25, shape: 'square' },
  ]);

  assert.deepEqual(
    buildTimelineKeyframePoints({ ...baseArgs, requireFiniteValue: true }),
    [
      {
        idx: 1,
        x: 2,
        y: 75,
        value: 0.25,
        shape: 'circle',
        inTangent: undefined,
        outTangent: undefined,
        inSpan: undefined,
        outSpan: undefined,
      },
    ]
  );
});

test('buildTimelineCurvePath preserves constant steps and bezier tangents', () => {
  assert.equal(
    buildTimelineCurvePath([
      { x: 0, y: 10, shape: 'square' },
      { x: 20, y: 30, shape: 'circle' },
    ]),
    'M 0 10 L 20 10 L 20 30'
  );

  assert.equal(
    buildTimelineCurvePath([
      { x: 0, y: 10, shape: 'diamond', outTangent: 1, outSpan: 5 },
      { x: 20, y: 30, shape: 'diamond', inTangent: -1, inSpan: 4 },
    ]),
    'M 0 10 C 5 15 16 34 20 30'
  );
});

test('timeline style helpers return SVG style objects', () => {
  assert.deepEqual(buildTimelineStrokeStyle('#fff'), { stroke: '#fff' });
  assert.deepEqual(buildTimelinePointStyle('#fff', '#000', 2), {
    stroke: '#fff',
    fill: '#000',
    strokeWidth: 2,
  });
});
