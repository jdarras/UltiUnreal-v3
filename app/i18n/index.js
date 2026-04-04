import fr from './fr.json';
import en from './en.json';

const DICTS = { fr, en };

export function createT(lang = 'fr') {
  const dict = DICTS[lang] || DICTS.fr;

  /**
   * t('clé', { diff: 3, ip: '192.168.0.10' })
   * remplace {diff}, {ip}, etc. dans la chaîne.
   */
  return function t(key, params) {
    let str = dict[key] || key;

    if (params && typeof params === 'object') {
      for (const [pKey, pVal] of Object.entries(params)) {
        const re = new RegExp(`\\{${pKey}\\}`, 'g');
        str = str.replace(re, String(pVal));
      }
    }

    return str;
  };
}