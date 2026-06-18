// Shared color helpers for timeline components
// hexToRgb est mutualisé dans app/utils/colors ; ré-exporté ici pour compat.
export { hexToRgb } from '../../utils/colors';

export function rgbToHex(r, g, b) {
  const toHex = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
