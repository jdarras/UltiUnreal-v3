import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimelineInspectorBindingArgsSectionProps,
  shouldRenderTimelineInspectorBindingArgsSection
} from '../../app/widgets/timeline/timelineInspectorBindingArgsSectionHelpers.js';

test('shouldRenderTimelineInspectorBindingArgsSection returns false without binding displayName', () => {
  assert.equal(shouldRenderTimelineInspectorBindingArgsSection(null), false);
  assert.equal(shouldRenderTimelineInspectorBindingArgsSection({}), false);
  assert.equal(
    shouldRenderTimelineInspectorBindingArgsSection({ binding: {} }),
    false
  );
  assert.equal(
    shouldRenderTimelineInspectorBindingArgsSection({ binding: { displayName: '' } }),
    false
  );
});

test('shouldRenderTimelineInspectorBindingArgsSection returns true with binding displayName', () => {
  assert.equal(
    shouldRenderTimelineInspectorBindingArgsSection({
      binding: { displayName: 'MyFunction' }
    }),
    true
  );
});

test('buildTimelineInspectorBindingArgsSectionProps keeps references unchanged', () => {
  const t = () => '';
  const selectedWidget = { binding: { displayName: 'X' } };
  const selectedKeyframeArgs = { a: 1 };
  const presetData = { funcs: [] };
  const updateSelectedKeyframeArgs = () => {};
  const argColorPicker = { open: false };
  const setArgColorPicker = () => {};
  const setColorPickerOpen = () => {};

  const result = buildTimelineInspectorBindingArgsSectionProps({
    t,
    selectedWidget,
    selectedKeyframeArgs,
    presetData,
    updateSelectedKeyframeArgs,
    argColorPicker,
    setArgColorPicker,
    setColorPickerOpen
  });

  assert.deepEqual(Object.keys(result).sort(), [
    'argColorPicker',
    'presetData',
    'selectedKeyframeArgs',
    'selectedWidget',
    'setArgColorPicker',
    'setColorPickerOpen',
    't',
    'updateSelectedKeyframeArgs'
  ]);
  assert.equal(result.t, t);
  assert.equal(result.selectedWidget, selectedWidget);
  assert.equal(result.selectedKeyframeArgs, selectedKeyframeArgs);
  assert.equal(result.presetData, presetData);
  assert.equal(result.updateSelectedKeyframeArgs, updateSelectedKeyframeArgs);
  assert.equal(result.argColorPicker, argColorPicker);
  assert.equal(result.setArgColorPicker, setArgColorPicker);
  assert.equal(result.setColorPickerOpen, setColorPickerOpen);
});
