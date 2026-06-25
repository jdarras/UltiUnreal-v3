'use strict';

function evaluateBrowserOrigin(value) {
  const origin = String(value || '').trim();
  if (!origin) return { allowed: true, origin: '' };
  if (origin.length > 2048 || origin === 'null' || /[\r\n]/.test(origin)) {
    return { allowed: false, origin };
  }
  try {
    const parsed = new URL(origin);
    const protocol = String(parsed.protocol || '').toLowerCase();
    const hostname = String(parsed.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
    const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    return {
      allowed: (protocol === 'http:' || protocol === 'https:') && loopback,
      origin,
    };
  } catch {
    return { allowed: false, origin };
  }
}

// En-têtes CORS d'origine ALIGNÉS sur le contrôle réel : on fait écho à l'origine déjà
// validée par evaluateBrowserOrigin plutôt qu'un '*' trompeur. Pour un client non-navigateur
// (sans Origin → chaîne vide), aucun en-tête CORS n'est émis. Ne modifie pas le contrôle
// d'accès : le gate d'origine reste seul décideur en amont.
function corsOriginHeaders(origin) {
  const value = typeof origin === 'string' ? origin.trim() : '';
  return value ? { 'Access-Control-Allow-Origin': value, Vary: 'Origin' } : {};
}

module.exports = {
  evaluateBrowserOrigin,
  corsOriginHeaders,
};
