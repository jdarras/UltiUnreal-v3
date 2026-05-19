import { safeT } from '../utils/i18nSafe.js';

export function getBrowsePlaceholderLabel(t) {
  return safeT(t, 'production.widgets.browsePlaceholder', 'Aucun aperçu');
}

export function getBrowsePathPlaceholder(t) {
  return safeT(t, 'production.widgets.browsePath', "Chemin d'un média");
}

export function getBrowseActionLabel(t) {
  return safeT(t, 'common.browse', 'Parcourir');
}

export function getSendActionLabel(t) {
  return safeT(t, 'widgets.common.send', 'Envoyer');
}

export function getColorPickLabel(t) {
  return safeT(t, 'widgets.color.pick', 'Choisir une couleur');
}

export function getVectorDefaultsTitleLabel(t) {
  return safeT(t, 'vector.defaults.title', 'Valeurs par défaut');
}

export function getLimitsTitleLabel(t) {
  return safeT(t, 'widgets.common.limitsTitle', 'Limites');
}
