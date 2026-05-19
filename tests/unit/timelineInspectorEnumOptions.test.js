import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineInspectorEnumOptions } from '../../app/widgets/timeline/timelineInspectorEnumOptions.js';

test('buildTimelineInspectorEnumOptions returns empty array for non-array input', () => {
  assert.deepEqual(buildTimelineInspectorEnumOptions(null), []);
  assert.deepEqual(buildTimelineInspectorEnumOptions(undefined), []);
  assert.deepEqual(buildTimelineInspectorEnumOptions({}), []);
});

test('buildTimelineInspectorEnumOptions normalizes primitive and object options', () => {
  const options = buildTimelineInspectorEnumOptions([
    'One',
    { value: 2, label: 'Two' },
    { id: 'id-3' },
    { label: 'OnlyLabel' },
    null
  ]);

  assert.deepEqual(options, [
    { value: 'One', label: 'One', key: '0-One' },
    { value: '2', label: 'Two', key: '1-2' },
    { value: 'id-3', label: 'id-3', key: '2-id-3' },
    { value: 'OnlyLabel', label: 'OnlyLabel', key: '3-OnlyLabel' },
    { value: '', label: '', key: '4-' }
  ]);
});
