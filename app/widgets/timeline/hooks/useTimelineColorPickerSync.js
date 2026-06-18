import { useEffect } from 'react';
import { rgbToHex } from '../colorUtils';

export function useTimelineColorPickerSync({
  isLinkedSelected,
  selectedMeta,
  selectedBundle,
  setColorPickerState,
}) {
  useEffect(() => {
    if (!isLinkedSelected || selectedMeta?.shape !== 'color' || !selectedBundle) {
      return;
    }

    const getVal = (id, fallback = 0) => {
      const item = selectedBundle.items.find((it) => it.channel?.id === id);
      const val = Number(item?.keyframe?.value);
      return Number.isFinite(val) ? val : fallback;
    };

    const r = getVal('r', 1);
    const g = getVal('g', 1);
    const b = getVal('b', 1);
    const a = getVal('a', 1);
    const hex = rgbToHex(r * 255, g * 255, b * 255);

    setColorPickerState({ hex, alpha: a });
  }, [isLinkedSelected, selectedBundle, selectedMeta?.shape, setColorPickerState]);
}
