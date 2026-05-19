import { ColorWheelPopover } from '../colorwidget.jsx';

export function TimelineInspectorLinkedColorPopover({
  colorPickerState,
  applyColorToBundle,
  setColorPickerOpen
}) {
  return (
    <div className="uu-color-popover">
      <ColorWheelPopover
        hex={colorPickerState.hex}
        alpha={colorPickerState.alpha}
        onChange={(nextHex, nextAlpha) => {
          applyColorToBundle(nextHex, nextAlpha);
        }}
        onClose={() => setColorPickerOpen(false)}
      />
    </div>
  );
}
