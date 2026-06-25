import { safeT } from '../utils/i18nSafe.js';

// Libellés des éditeurs de widgets. `t` fourni par l'appelant (getWidgetT()).
export function getColorLabel(t) { return safeT(t, 'widgets.editor.color', 'Couleur'); }
export function getHexLabel(t) { return safeT(t, 'widgets.editor.hex', 'Hex'); }
export function getAlphaLabel(t) { return safeT(t, 'widgets.editor.alpha', 'Alpha'); }
export function getColorDefaultLabel(t) { return safeT(t, 'widgets.editor.colorDefault', 'Couleur par défaut'); }
export function getMinLabel(t) { return safeT(t, 'widgets.editor.min', 'Min'); }
export function getMaxLabel(t) { return safeT(t, 'widgets.editor.max', 'Max'); }
export function getStepLabel(t) { return safeT(t, 'widgets.editor.step', 'Step'); }
export function getHorizontalLabel(t) { return safeT(t, 'widgets.editor.horizontal', 'Horizontale'); }
export function getVerticalLabel(t) { return safeT(t, 'widgets.editor.vertical', 'Verticale'); }
export function getOptionsLabel(t) { return safeT(t, 'widgets.editor.options', 'Options'); }
export function getEnumLabelPlaceholder(t) { return safeT(t, 'widgets.editor.enumLabelPlaceholder', 'Label'); }
export function getEnumValuePlaceholder(t) { return safeT(t, 'widgets.editor.enumValuePlaceholder', 'Valeur envoyée à Unreal'); }
export function getBindingTypeLabel(t) { return safeT(t, 'widgets.editor.bindingType', 'Type de liaison'); }
export function getButtonColorLabel(t) { return safeT(t, 'widgets.editor.buttonColor', 'Couleur du bouton'); }
export function getBoolsLabel(t) { return safeT(t, 'widgets.editor.bools', 'Bools (ON/OFF)'); }
export function getFalseValueTextLabel(t) { return safeT(t, 'widgets.editor.falseText', 'Texte valeur false'); }
export function getTrueValueTextLabel(t) { return safeT(t, 'widgets.editor.trueText', 'Texte valeur true'); }
export function getLimitsXLabel(t) { return safeT(t, 'widgets.editor.limitsX', 'Limites X'); }
export function getLimitsYLabel(t) { return safeT(t, 'widgets.editor.limitsY', 'Limites Y'); }
export function getLimitsRgbLabel(t) { return safeT(t, 'widgets.editor.limitsRgb', 'Limites RGB'); }
export function getLimitsAlphaLabel(t) { return safeT(t, 'widgets.editor.limitsAlpha', 'Limites Alpha'); }
export function getLimitsAndStepLabel(t) { return safeT(t, 'widgets.editor.limitsAndStep', 'Limites & pas'); }
export function getOptionsFromUnrealLabel(t) { return safeT(t, 'widgets.editor.optionsFromUnreal', 'Options depuis Unreal.'); }
export function getLabelValueRequiredLabel(t) { return safeT(t, 'widgets.editor.labelValueRequired', 'Label et valeur requis.'); }
export function getSelectBindingFirstLabel(t) { return safeT(t, 'widgets.editor.selectBindingFirst', "Sélectionnez d'abord une liaison propriété."); }
export function getUnsupportedTypeLabel(t) { return safeT(t, 'widgets.editor.unsupportedType', 'Type non géré.'); }
export function getBoolsShortLabel(t) { return safeT(t, 'widgets.editor.boolsShort', 'Bools'); }
export function getValuesLabel(t) { return safeT(t, 'widgets.editor.values', 'Valeurs'); }

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
