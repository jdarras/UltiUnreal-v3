import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTimelineBindingNoArgsLabel,
  resolveTimelineBindingArgLabel
} from '../../app/widgets/timeline/timelineInspectorBindingArgsI18n.js';

test('getTimelineBindingNoArgsLabel uses translation when available with fallback otherwise', () => {
  assert.equal(
    getTimelineBindingNoArgsLabel((key) =>
      key === 'timeline.binding.noArgs' ? 'No arguments.' : key
    ),
    'No arguments.'
  );
  assert.equal(getTimelineBindingNoArgsLabel(() => 'timeline.binding.noArgs'), 'Aucun argument.');
  assert.equal(getTimelineBindingNoArgsLabel(null), 'Aucun argument.');
});

test('resolveTimelineBindingArgLabel keeps explicit label and falls back to translated unnamed arg', () => {
  assert.equal(resolveTimelineBindingArgLabel(null, 'My Arg'), 'My Arg');
  assert.equal(
    resolveTimelineBindingArgLabel(
      (key) => (key === 'timeline.binding.unnamedArg' ? 'Argument' : key),
      ''
    ),
    'Argument'
  );
  assert.equal(resolveTimelineBindingArgLabel(null, ''), 'Argument');
});
