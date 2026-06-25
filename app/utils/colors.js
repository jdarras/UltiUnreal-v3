// app/utils/colors.js
// Centralisation du mapping hex -> classe CSS pour les machines

const HEX_TO_CLASS = {
  '#60A5FA': 'c-blue',
  '#22D3EE': 'c-cyan',
  '#34D399': 'c-cyan',
  '#F59E0B': 'c-orange',
  '#7A1B3C': 'c-bordeaux',
  '#8B1E3F': 'c-bordeaux',
  '#EF4444': 'c-bordeaux',
  '#A78BFA': 'c-violet',
  '#14B8A6': 'c-turquoise',
  '#F472B6': 'c-pink',
  '#FACC15': 'c-yellow',  
  '#6366F1': 'c-indigo',  
  '#6B7280': 'c-gray',    
  '': 'c-none',
};

export function normalizeMachineColor(hex) {
  const key = String(hex || '').trim().toUpperCase();
  if (!key) return '';
  if (key === '#34D399') return '#22D3EE';
  if (key === '#EF4444') return '#7A1B3C';
  if (key === '#8B1E3F') return '#7A1B3C';
  return key;
}

export function colorClass(hex) {
  const key = String(hex || '').trim().toUpperCase();
  return HEX_TO_CLASS[key] || 'c-none';
}

/** Borne une valeur numérique dans l'intervalle [0, 1] (0 si non finie). */
export function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, num));
}

/** Convertit une couleur hex (#RRGGBB) en { r, g, b } ; blanc si invalide. */
export function hexToRgb(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex || '');
  if (!m) return { r: 255, g: 255, b: 255 };
  const intVal = parseInt(m[1], 16);
  return {
    r: (intVal >> 16) & 255,
    g: (intVal >> 8) & 255,
    b: intVal & 255,
  };
}

/** Convertit { r, g, b } en couleur hex #RRGGBB (valeurs bornées 0-255). */
export function rgbToHex(r, g, b) {
  const toHex = (v) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
