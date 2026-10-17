import fr from './fr.json';
import { translateWith } from './translate.js';

const DICTS = { fr };
const DICT_PENDING = new Map();

function normalizeLanguage(lang = 'fr') {
  return String(lang || '').trim().toLowerCase() === 'en' ? 'en' : 'fr';
}

async function loadI18nDict(lang = 'fr') {
  const normalized = normalizeLanguage(lang);
  if (DICTS[normalized]) return DICTS[normalized];
  if (DICT_PENDING.has(normalized)) return DICT_PENDING.get(normalized);

  if (normalized !== 'en') return DICTS.fr;

  const loading = import('./en.json')
    .then((mod) => {
      const dict = mod?.default && typeof mod.default === 'object' ? mod.default : {};
      DICTS.en = dict;
      DICT_PENDING.delete(normalized);
      return dict;
    })
    .catch(() => {
      DICT_PENDING.delete(normalized);
      return DICTS.fr;
    });

  DICT_PENDING.set(normalized, loading);
  return loading;
}

function ensureI18nDictLoaded(lang = 'fr') {
  const normalized = normalizeLanguage(lang);
  if (DICTS[normalized] || DICT_PENDING.has(normalized)) return;
  void loadI18nDict(normalized);
}

export async function preloadI18n(lang = 'fr') {
  const normalized = normalizeLanguage(lang);
  if (normalized === 'en') {
    await Promise.all([loadI18nDict('fr'), loadI18nDict('en')]);
    return normalized;
  }
  await loadI18nDict('fr');
  return normalized;
}

export function createT(lang = 'fr') {
  const normalized = normalizeLanguage(lang);
  ensureI18nDictLoaded(normalized);

  /**
   * t('clé', { diff: 3, ip: '192.168.0.10' })
   * remplace {diff}, {ip}, etc. dans la chaîne.
   */
  return function t(key, fallbackOrParams, maybeParams) {
    const dict = DICTS[normalized] || DICTS.fr || {};
    return translateWith(dict, key, fallbackOrParams, maybeParams);
  };
}
