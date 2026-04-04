import BindingPicker from '../bindingpicker.jsx';

export function BrowseTimelineEditor({ selected, presetData, updateBinding }) {
  if (!selected) return null;

  return (
    <BindingPicker
      kind="property"
      presetData={presetData}
      value={selected.binding}
      onChange={updateBinding}
      valueMode="browse"
    />
  );
}
