import test from 'node:test';
import assert from 'node:assert/strict';

import { isTimelineInspectorMultiMode } from '../../app/widgets/timeline/timelineInspectorModeHelpers.js';

test('isTimelineInspectorMultiMode returns false when selectedMeta is missing', () => {
  assert.equal(isTimelineInspectorMultiMode(undefined), false);
  assert.equal(isTimelineInspectorMultiMode(null), false);
});

test('isTimelineInspectorMultiMode returns false for non-multi kinds', () => {
  assert.equal(isTimelineInspectorMultiMode({}), false);
  assert.equal(isTimelineInspectorMultiMode({ kind: 'single' }), false);
  assert.equal(isTimelineInspectorMultiMode({ kind: 'linked' }), false);
});

test("isTimelineInspectorMultiMode returns true only for 'multi' kind", () => {
  assert.equal(isTimelineInspectorMultiMode({ kind: 'multi' }), true);
});
