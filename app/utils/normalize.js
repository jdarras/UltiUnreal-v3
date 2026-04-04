// Common normalization helpers (shared between resources/projects searches)
export function normalizeValue(val) {
  return String(val || '').trim().toLowerCase();
}

export function normalizeSearch(val) {
  const raw = String(val || '').toLowerCase();
  if (!raw) return '';
  try {
    return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    return raw;
  }
}

export function normalizeList(list) {
  return (Array.isArray(list) ? list : [])
    .map((val) => normalizeValue(val))
    .filter(Boolean);
}
