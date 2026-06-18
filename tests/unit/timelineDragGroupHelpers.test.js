import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyTimelineGroupDragToTrack,
  TIMELINE_FRAME_TAKEN_MESSAGE,
  TIMELINE_VALUE_OUT_OF_RANGE_MESSAGE,
} from '../../app/widgets/timeline/timelineDragGroupHelpers.js';

function makeCoerce({ min = -Infinity, max = Infinity } = {}) {
  return (value) => (value < min || value > max ? null : value);
}

test('applyTimelineGroupDragToTrack moves simple keyframes and coerces value delta', () => {
  const track = {
    keyframes: [
      { frame: 1, value: 10 },
      { frame: 5, value: 20 },
    ],
  };

  const result = applyTimelineGroupDragToTrack({
    track,
    trackInfo: {
      meta: { kind: 'number', numericKind: 'float' },
      numericRange: { min: 0, max: 100 },
    },
    selection: [
      {
        trackId: 'track-a',
        channelId: null,
        idx: 0,
        startLocalFrame: 1,
        startValueNum: 10,
      },
    ],
    deltaFrame: 2,
    deltaValue: 5,
    ignoreMap: new Map([['track-a:', new Set([0])]]),
    getNumericRange: () => ({ min: 0, max: 100 }),
    coerceNumericValue: makeCoerce({ min: 0, max: 100 }),
  });

  assert.equal(result.blockedReason, '');
  assert.deepEqual(result.track.keyframes, [
    { frame: 3, value: 15 },
    { frame: 5, value: 20 },
  ]);
  assert.deepEqual(track.keyframes, [
    { frame: 1, value: 10 },
    { frame: 5, value: 20 },
  ]);
});

test('applyTimelineGroupDragToTrack moves multi-channel keyframes', () => {
  const track = {
    channels: {
      x: [
        { frame: 1, value: 0 },
        { frame: 5, value: 1 },
      ],
    },
  };

  const result = applyTimelineGroupDragToTrack({
    track,
    trackInfo: {
      meta: { kind: 'multi' },
      channelRanges: { x: { min: -1, max: 1 } },
    },
    selection: [
      {
        trackId: 'track-a',
        channelId: 'x',
        idx: 0,
        startLocalFrame: 1,
        startValueNum: 0,
      },
    ],
    deltaFrame: 3,
    deltaValue: 0.5,
    ignoreMap: new Map([['track-a:x', new Set([0])]]),
    getNumericRange: () => ({ min: -1, max: 1 }),
    coerceNumericValue: makeCoerce({ min: -1, max: 1 }),
  });

  assert.equal(result.blockedReason, '');
  assert.deepEqual(result.track.channels.x, [
    { frame: 4, value: 0.5 },
    { frame: 5, value: 1 },
  ]);
});

test('applyTimelineGroupDragToTrack blocks occupied target frame', () => {
  const track = {
    keyframes: [
      { frame: 1, value: 10 },
      { frame: 3, value: 20 },
    ],
  };

  const result = applyTimelineGroupDragToTrack({
    track,
    trackInfo: { meta: { kind: 'number' } },
    selection: [
      {
        trackId: 'track-a',
        channelId: null,
        idx: 0,
        startLocalFrame: 1,
        startValueNum: 10,
      },
    ],
    deltaFrame: 2,
    deltaValue: null,
    ignoreMap: new Map([['track-a:', new Set([0])]]),
    getNumericRange: () => ({ min: 0, max: 100 }),
    coerceNumericValue: makeCoerce(),
  });

  assert.equal(result.blockedReason, TIMELINE_FRAME_TAKEN_MESSAGE);
  assert.equal(result.track, track);
});

test('applyTimelineGroupDragToTrack blocks out-of-range coerced values', () => {
  const track = {
    keyframes: [{ frame: 1, value: 10 }],
  };

  const result = applyTimelineGroupDragToTrack({
    track,
    trackInfo: {
      meta: { kind: 'number' },
      numericRange: { min: 0, max: 10 },
    },
    selection: [
      {
        trackId: 'track-a',
        channelId: null,
        idx: 0,
        startLocalFrame: 1,
        startValueNum: 10,
      },
    ],
    deltaFrame: 0,
    deltaValue: 1,
    ignoreMap: new Map([['track-a:', new Set([0])]]),
    getNumericRange: () => ({ min: 0, max: 10 }),
    coerceNumericValue: makeCoerce({ min: 0, max: 10 }),
  });

  assert.equal(result.blockedReason, TIMELINE_VALUE_OUT_OF_RANGE_MESSAGE);
  assert.equal(result.track, track);
});
