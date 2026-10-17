// Résolution d'une clé de traduction. Formes d'appel acceptées :
//   t('clé')                         -> texte du dictionnaire, sinon la clé
//   t('clé', { count: 3 })           -> avec remplacement de {count}
//   t('clé', 'texte de repli')       -> repli si la clé est absente
//   t('clé', 'texte de repli', { count: 3 }) -> repli ET remplacement
// (cette dernière forme ignorait auparavant les paramètres : « {count} » restait
// affiché tel quel).
export function translateWith(dict, key, fallbackOrParams, maybeParams) {
  const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : '';
  const params = fallbackOrParams && typeof fallbackOrParams === 'object' && !Array.isArray(fallbackOrParams)
    ? fallbackOrParams
    : (maybeParams && typeof maybeParams === 'object' && !Array.isArray(maybeParams) ? maybeParams : null);
  let str = (dict && dict[key]) || fallback || key;
  if (params) {
    for (const [pKey, pVal] of Object.entries(params)) {
      str = str.split(`{${pKey}}`).join(String(pVal));
    }
  }
  return str;
}
