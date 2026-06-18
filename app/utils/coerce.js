// Helpers de coercition de valeurs partagés (chaînes / entiers).
// Centralise des fonctions auparavant dupliquées dans l'écran post-production.

/** Convertit n'importe quelle valeur en chaîne trimée (jamais null/undefined). */
export function toTrimmedString(value = "") {
  return String(value || "").trim();
}

/**
 * Convertit une valeur en entier strictement positif.
 * Accepte les nombres, les chaînes numériques et les chaînes préfixées par '#'
 * (ex. "#123"). Retourne 0 si la valeur n'est pas un entier positif.
 */
export function toPositiveInt(value = 0) {
  if (Number.isFinite(Number(value)) && Number(value) > 0) return Math.trunc(Number(value));
  const raw = toTrimmedString(value);
  if (!raw) return 0;
  if (/^#?\d+$/.test(raw)) return Math.trunc(Number(raw.replace(/^#/, "")));
  return 0;
}

/** Retourne la première chaîne non vide de la liste, sinon "". */
export function firstNonEmptyString(values = []) {
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = toTrimmedString(value);
    if (normalized) return normalized;
  }
  return "";
}

/** Retourne le premier entier strictement positif de la liste, sinon 0. */
export function firstPositiveInt(values = []) {
  for (const value of Array.isArray(values) ? values : []) {
    const normalized = toPositiveInt(value);
    if (normalized > 0) return normalized;
  }
  return 0;
}
