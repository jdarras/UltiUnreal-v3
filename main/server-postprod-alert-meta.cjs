// Métadonnées d'une alerte utilisateur, enregistrées en JSON (objet vide si
// la valeur n'est pas un objet ou ne peut pas être sérialisée).
function encodeAlertMeta(meta = null) {
  const source = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
  try {
    return JSON.stringify(source);
  } catch {
    return '{}';
  }
}

module.exports = { encodeAlertMeta };
