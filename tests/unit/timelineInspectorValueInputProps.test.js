import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimelineInspectorEnumSelectProps,
  buildTimelineInspectorTextInputProps,
  resolveTimelineInspectorValueInputVariant
} from '../../app/widgets/timeline/timelineInspectorValueInputProps.js';

test('resolveTimelineInspectorValueInputVariant picks expected branch', () => {
  assert.equal(
    resolveTimelineInspectorValueInputVariant({
      selectedMeta: { kind: 'text' },
      selectedWidget: { type: 'button' }
    }),
    'none'
  );
  assert.equal(
    resolveTimelineInspectorValueInputVariant({
      selectedMeta: { kind: 'enum' },
      selectedWidget: { type: 'slider' }
    }),
    'enum'
  );
  assert.equal(
    resolveTimelineInspectorValueInputVariant({
      selectedMeta: { kind: 'text' },
      selectedWidget: { type: 'browse' }
    }),
    'browse'
  );
  assert.equal(
    resolveTimelineInspectorValueInputVariant({
      selectedMeta: { kind: 'bool' },
      selectedWidget: { type: 'toggle' }
    }),
    'bool'
  );
  assert.equal(
    resolveTimelineInspectorValueInputVariant({
      selectedMeta: { kind: 'text' },
      selectedWidget: { type: 'text' }
    }),
    'text'
  );
});

test('buildTimelineInspectorTextInputProps derives class/inputMode/style by numeric flag', () => {
  const numeric = buildTimelineInspectorTextInputProps(true);
  assert.equal(numeric.className, 'uu-input uu-input-arg');
  assert.equal(numeric.inputMode, 'decimal');
  assert.deepEqual(numeric.style, { width: '180px' });

  const nonNumeric = buildTimelineInspectorTextInputProps(false);
  assert.equal(nonNumeric.className, 'uu-input');
  assert.equal(nonNumeric.inputMode, undefined);
  assert.deepEqual(nonNumeric.style, { width: '220px' });
});

test('buildTimelineInspectorEnumSelectProps builds min-width style from enum width', () => {
  const props = buildTimelineInspectorEnumSelectProps(240);
  assert.deepEqual(props, {
    style: { width: 'auto', minWidth: '240px' }
  });
});
