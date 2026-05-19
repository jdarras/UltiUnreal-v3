export function shouldRenderTimelineInspectorBindingArgsSection(selectedWidget) {
  return Boolean(selectedWidget?.binding?.displayName);
}

export function buildTimelineInspectorBindingArgsSectionProps({
  t,
  selectedWidget,
  selectedKeyframeArgs,
  presetData,
  updateSelectedKeyframeArgs,
  argColorPicker,
  setArgColorPicker,
  setColorPickerOpen
}) {
  return {
    t,
    selectedWidget,
    selectedKeyframeArgs,
    presetData,
    updateSelectedKeyframeArgs,
    argColorPicker,
    setArgColorPicker,
    setColorPickerOpen
  };
}
