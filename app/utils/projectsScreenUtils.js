// Utility helpers specific to ProjectsScreen (kept separate to lighten the main screen file)
import { normPath } from './projects-helpers';

export const SORT_STORAGE_KEY = 'uu_projects_sort';
export const FAVORITE_STORAGE_KEY = 'uu_projects_fav';
export const SORT_MODE_OPTIONS = new Set([
  'name',
  'createdAt',
  'lastModified',
  'engineVersion',
  'status',
  'id'
]);

export function getUprojectDialogDefaultPath(value) {
  const normalized = normPath(String(value || '').trim());
  return normalized || '';
}

export function normalizeHttpBindInput(value) {
  return String(value || '').trim();
}

export function isValidHttpBindInput(value) {
  if (!value) return false;
  return !/\s/.test(value);
}

export function splitCommaValues(value) {
  return String(value || '')
    .split(/[,;\n]+/)
    .map((val) => String(val || '').trim())
    .filter(Boolean);
}

export function normalizeKeyword(value) {
  let s = String(value || '').trim();
  if (!s) return '';
  if (s.length > 48) s = s.slice(0, 48);
  return s.toLowerCase();
}

export function normalizeKeywordsList(list) {
  const seen = new Set();
  const out = [];
  const src = Array.isArray(list) ? list : splitCommaValues(list);
  for (const val of src) {
    const k = normalizeKeyword(val);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export function collectReferentOptions(projects, key) {
  const seen = new Map();
  const list = Array.isArray(projects) ? projects : [];
  for (const proj of list) {
    const refs = proj?.metaReferents || {};
    const values = splitCommaValues(refs[key]);
    for (const name of values) {
      const lower = name.toLowerCase();
      if (!seen.has(lower)) seen.set(lower, name);
    }
  }
  return Array.from(seen.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );
}

