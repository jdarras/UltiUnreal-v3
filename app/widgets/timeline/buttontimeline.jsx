import BindingPicker from '../bindingpicker.jsx';

export function ButtonTimelineEditor({ selected, presetData, updateBinding }) {
  if (!selected) return null;

  return (
    <BindingPicker
      kind="function"
      presetData={presetData}
      value={selected.binding}
      onChange={updateBinding}
      valueMode="text"
      hideArgs
    />
  );
}
