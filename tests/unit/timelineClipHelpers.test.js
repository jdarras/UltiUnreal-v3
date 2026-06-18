import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineClipModel } from '../../app/widgets/timeline/timelineClipHelpers.js';

test('buildTimelineClipModel maps normal clip geometry', () => {
  const entry = {
    localMinFrame: 10,
    localMaxFrame: 30,
    localDuration: 20,
  };

  assert.deepEqual(
    buildTimelineClipModel({
      entry,
      contentBounds: { top: 10, bottom: 50 },
      frameToX: (frame) => frame * 2,
      toGlobalFrame: (_entry, frame) => frame,
      minClipPx: 12,
    }),
    {
      visualStartX: 20,
      width: 40,
      clipY: 16,
      clipHeight: 28,
      handleWidth: 8,
      showHandles: true,
    }
  );
});

test('buildTimelineClipModel enforces minimum visual width for tiny clips', () => {
  const entry = {
    localMinFrame: 10,
    localMaxFrame: 12,
    localDuration: 2,
  };

  assert.deepEqual(
    buildTimelineClipModel({
      entry,
      contentBounds: { top: 0, bottom: 20 },
      frameToX: (frame) => frame,
      toGlobalFrame: (_entry, frame) => frame,
      minClipPx: 12,
    }),
    {
      visualStartX: 4,
      width: 12,
      clipY: 4,
      clipHeight: 12,
      handleWidth: 8,
      showHandles: true,
    }
  );
});

test('buildTimelineClipModel hides handles for zero-duration clips', () => {
  const entry = {
    localMinFrame: 10,
    localMaxFrame: 10,
    localDuration: 0,
  };

  assert.equal(
    buildTimelineClipModel({
      entry,
      contentBounds: { top: 0, bottom: 10 },
      frameToX: (frame) => frame,
      toGlobalFrame: (_entry, frame) => frame,
      minClipPx: 12,
    }).showHandles,
    false
  );
});
