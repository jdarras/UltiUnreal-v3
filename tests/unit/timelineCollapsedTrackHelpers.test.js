import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineCollapsedFrameModel } from '../../app/widgets/timeline/timelineCollapsedTrackHelpers.js';

test('buildTimelineCollapsedFrameModel collects simple track frames', () => {
  const entry = {
    meta: { kind: 'number' },
    keyframes: [{ frame: 5 }, { frame: 'bad' }, { frame: 1 }],
  };

  assert.deepEqual(
    buildTimelineCollapsedFrameModel(entry, (_entry, frame) => frame + 10),
    {
      frames: [15, 11],
      minFrame: 11,
      maxFrame: 15,
      hasRange: true,
    }
  );
});

test('buildTimelineCollapsedFrameModel collects multi-channel frames in channel order', () => {
  const entry = {
    meta: {
      kind: 'multi',
      channels: [{ id: 'x' }, { id: 'y' }],
    },
    channels: {
      x: [{ frame: 3 }],
      y: [{ frame: 1 }, { frame: 3 }],
    },
  };

  assert.deepEqual(
    buildTimelineCollapsedFrameModel(entry, (_entry, frame) => frame),
    {
      frames: [3, 1, 3],
      minFrame: 1,
      maxFrame: 3,
      hasRange: true,
    }
  );
});

test('buildTimelineCollapsedFrameModel reports no range for identical or missing frames', () => {
  assert.deepEqual(
    buildTimelineCollapsedFrameModel(
      { meta: { kind: 'number' }, keyframes: [{ frame: 4 }, { frame: 4 }] },
      (_entry, frame) => frame
    ),
    {
      frames: [4, 4],
      minFrame: 4,
      maxFrame: 4,
      hasRange: false,
    }
  );

  assert.deepEqual(
    buildTimelineCollapsedFrameModel(
      { meta: { kind: 'number' }, keyframes: [{ frame: 'bad' }] },
      (_entry, frame) => frame
    ),
    {
      frames: [],
      minFrame: null,
      maxFrame: null,
      hasRange: false,
    }
  );
});
