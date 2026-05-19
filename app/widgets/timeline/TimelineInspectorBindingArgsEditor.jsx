import {
  resolveTimelineBindingArgValues,
  resolveTimelineBindingFunction
} from './timelineInspectorBindingArgsHelpers.js';
import { TimelineInspectorBindingArgsParamList } from './TimelineInspectorBindingArgsParamList.jsx';

export function TimelineInspectorBindingArgsEditor({
  t,
  selectedWidget,
  selectedKeyframeArgs,
  presetData,
  updateSelectedKeyframeArgs,
  argColorPicker,
  setArgColorPicker,
  setColorPickerOpen
}) {
  if (!selectedWidget?.binding?.displayName) return null;

  const func = resolveTimelineBindingFunction(selectedWidget, presetData);
  const argValues = resolveTimelineBindingArgValues(
    selectedKeyframeArgs,
    selectedWidget
  );

  const setArgValue = (name, val) => {
    updateSelectedKeyframeArgs((prev = {}) => ({
      ...prev,
      [name]: val
    }));
  };

  return (
    <TimelineInspectorBindingArgsParamList
      t={t}
      func={func}
      argValues={argValues}
      setArgValue={setArgValue}
      argColorPicker={argColorPicker}
      setArgColorPicker={setArgColorPicker}
      setColorPickerOpen={setColorPickerOpen}
    />
  );
}
