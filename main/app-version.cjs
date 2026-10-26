// Numéro de version d'UltiUnreal : une seule source, le champ « version » de
// package.json (fourni avec l'application installée).

const { version } = require('../package.json');

// « 2026.3.0 » s'affiche « 2026.3 » ; « 2026.3.1 » reste tel quel.
function displayVersion(full) {
  return String(full || '').replace(/\.0$/, '');
}

module.exports = { APP_VERSION: displayVersion(version), displayVersion };
