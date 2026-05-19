import test from 'node:test';
import assert from 'node:assert/strict';

import { hasTimelineBindingParameters } from '../../app/widgets/timeline/timelineInspectorBindingArgsParamListHelpers.js';

test('hasTimelineBindingParameters returns true only with non-empty parameters array', () => {
  assert.equal(hasTimelineBindingParameters(null), false);
  assert.equal(hasTimelineBindingParameters({}), false);
  assert.equal(hasTimelineBindingParameters({ parameters: null }), false);
  assert.equal(hasTimelineBindingParameters({ parameters: [] }), false);
  assert.equal(hasTimelineBindingParameters({ parameters: [{}] }), true);
});
