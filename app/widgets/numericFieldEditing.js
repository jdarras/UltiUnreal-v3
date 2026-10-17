// Saisie numérique au clavier (pas selon la position du curseur), commune aux
// widgets Transform et Vecteur. Auparavant recopiée dans chacun.

export const isIntermediateNumeric = (raw) => {
  const s = String(raw || '').replace(',', '.');
  return s === '' || s === '-' || s === '.' || s === '-.';
};

export const decimalsCount = (raw) => {
  const s = String(raw || '');
  const idx = s.indexOf('.');
  if (idx < 0) return 0;
  return Math.max(0, s.length - idx - 1);
};

export const stepFromCaret = (rawValue, caretPos) => {
  const normalized = String(rawValue || '').replace(',', '.');
  const hasSign = normalized.startsWith('-');
  const signOffset = hasSign ? 1 : 0;
  const abs = hasSign ? normalized.slice(1) : normalized;
  if (!abs) return 1;

  const caret = Math.max(
    0,
    Math.min(
      Number.isFinite(caretPos) ? caretPos : normalized.length,
      normalized.length
    )
  );
  const caretAdj = Math.max(
    0,
    Math.min(caret - signOffset, abs.length)
  );
  const dot = abs.indexOf('.');

  const placeForDigit = (idx) => {
    if (idx < 0) return 1;
    if (dot >= 0) {
      if (idx < dot) return Math.pow(10, dot - idx - 1);
      if (idx > dot) return Math.pow(10, -(idx - dot));
      return null;
    }
    return Math.pow(10, abs.length - idx - 1);
  };

  let idx = Math.min(Math.max(caretAdj - 1, 0), abs.length - 1);
  while (idx >= 0 && abs[idx] === '.') idx -= 1;
  if (idx < 0) {
    if (dot >= 0 && caretAdj > dot) return 0.1;
    idx = abs.search(/[0-9]/);
    if (idx < 0) return 1;
  }

  const step = placeForDigit(idx);
  return Number.isFinite(step) && step > 0 ? step : 1;
};
