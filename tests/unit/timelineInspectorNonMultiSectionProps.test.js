import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTimelineInspectorNonMultiSectionProps } from '../../app/widgets/timeline/timelineInspectorNonMultiSectionProps.js';

function sortedKeys(obj) {
  return Object.keys(obj).sort();
}

test('buildTimelineInspectorNonMultiSectionProps builds frame/value/binding prop bags', () => {
  const t = (key) => key;
  const setKeyframeFrameDraft = () => {};
  const commitKeyframeFrameDraft = () => {};
  const handleRemoveKeyframe = () => {};
  const setKeyframeValueDraft = () => {};
  const commitKeyframeValueDraft = () => {};
  const handleValueChange = () => {};
  const updateSelectedKeyframeArgs = () => {};
  const setArgColorPicker = () => {};
  const setColorPickerOpen = () => {};
  const selectedMeta = { kind: 'number' };
  const selectedKeyframe = { frame: 12 };
  const selectedWidget = { type: 'slider' };
  const browseFileInputRef = { current: null };
  const selectedKeyframeArgs = { speed: 10 };
  const presetData = { funcs: [] };
  const argColorPicker = { open: false };
  const enumOptions = [{ value: 'A', label: 'A', key: '0-A' }];

  const result = buildTimelineInspectorNonMultiSectionProps({
    t,
    useTimecodeView: false,
    keyframeFrameDraft: '12',
    setKeyframeFrameDraft,
    commitKeyframeFrameDraft,
    handleRemoveKeyframe,
    selectedMeta,
    selectedKeyframe,
    selectedWidget,
    isNumericValue: true,
    keyframeValueDraft: '99',
    setKeyframeValueDraft,
    commitKeyframeValueDraft,
    handleValueChange,
    enumOptions,
    enumWidthPx: 180,
    browseFileInputRef,
    selectedKeyframeArgs,
    presetData,
    updateSelectedKeyframeArgs,
    argColorPicker,
    setArgColorPicker,
    setColorPickerOpen
  });

  assert.deepEqual(sortedKeys(result), [
    'bindingArgsSectionProps',
    'frameRowProps',
    'valueInputProps'
  ]);

  assert.equal(result.frameRowProps.t, t);
  assert.equal(result.frameRowProps.rowClassName, 'uu-row mt-6 uu-align-center uu-gap-8');
  assert.equal(result.frameRowProps.showDelete, true);
  assert.equal(result.frameRowProps.deleteTitle, 'widgets.common.deleteKeyframe');
  assert.equal(result.frameRowProps.onDelete, handleRemoveKeyframe);

  assert.equal(result.valueInputProps.selectedMeta, selectedMeta);
  assert.equal(result.valueInputProps.selectedKeyframe, selectedKeyframe);
  assert.equal(result.valueInputProps.selectedWidget, selectedWidget);
  assert.equal(result.valueInputProps.enumOptions, enumOptions);
  assert.equal(result.valueInputProps.enumWidthPx, 180);
  assert.equal(result.valueInputProps.browseFileInputRef, browseFileInputRef);

  assert.equal(result.bindingArgsSectionProps.selectedWidget, selectedWidget);
  assert.equal(result.bindingArgsSectionProps.selectedKeyframeArgs, selectedKeyframeArgs);
  assert.equal(result.bindingArgsSectionProps.presetData, presetData);
  assert.equal(result.bindingArgsSectionProps.updateSelectedKeyframeArgs, updateSelectedKeyframeArgs);
  assert.equal(result.bindingArgsSectionProps.argColorPicker, argColorPicker);
  assert.equal(result.bindingArgsSectionProps.setArgColorPicker, setArgColorPicker);
  assert.equal(result.bindingArgsSectionProps.setColorPickerOpen, setColorPickerOpen);
});
