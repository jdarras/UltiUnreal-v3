import { safeT } from '../utils/i18nSafe.js';

export function getFavoriteLabel(t) {
  return safeT(t, 'resources.detail.labels.favorite', 'Favoris');
}

export function getNoPreviewLabel(t) {
  return safeT(t, 'resources.noThumbnail', 'No preview');
}

export function getResourceEditLabel(t) {
  return safeT(t, 'resources.edit', 'Edit');
}

export function getResourceOpenLabel(t) {
  return safeT(t, 'resources.openFab', 'Open');
}

export function getNoneOptionLabel(t) {
  return safeT(t, 'common.none', 'None');
}

export function getVersionIncompatibleLabel(t) {
  return safeT(t, 'resources.versionIncompatible', 'Version non compatible');
}

export function getUsageLabel(t) {
  return safeT(t, 'resources.detail.labels.usage', 'Usage');
}

export function getStyleLabel(t) {
  return safeT(t, 'resources.detail.labels.style', 'Style');
}

export function getAmbianceLabel(t) {
  return safeT(t, 'resources.detail.labels.ambiance', 'Ambiance');
}

export function getTypeLabel(t) {
  return safeT(t, 'resources.type', 'Type');
}

export function getDistributionLabel(t) {
  return safeT(t, 'resources.detail.distribution', 'Distribution');
}

export function getUeVersionsLabel(t) {
  return safeT(t, 'resources.ueVersions', 'UE');
}

export function getLicenseLabel(t) {
  return safeT(t, 'resources.detail.labels.license', 'License');
}

export function getQualityLabel(t) {
  return safeT(t, 'resources.detail.labels.quality', 'Quality');
}

export function getPerformanceLabel(t) {
  return safeT(t, 'resources.detail.labels.performance', 'Performance');
}

export function getPurchasedLabel(t) {
  return safeT(t, 'resources.detail.labels.purchased', 'Acheté');
}

export function getTestedLabel(t) {
  return safeT(t, 'resources.detail.labels.tested', 'Testé');
}

export function getAddKeywordLabel(t) {
  return safeT(t, 'resources.detail.labels.addKeyword', 'Ajouter mot-clé');
}

export function getTagsLabel(t) {
  return safeT(t, 'resources.detail.labels.tags', 'Mots-clés');
}

export function getButtonDefaultArgsTitlePluralLabel(t) {
  return safeT(t, 'widgets.button.defaultArgsTitlePlural', 'Valeurs par défaut');
}

export function getButtonDefaultArgsTitleSingularLabel(t) {
  return safeT(t, 'widgets.button.defaultArgsTitleSingular', 'Valeur par défaut');
}

export function getPaletteAddBrowseLabel(t) {
  return safeT(t, 'production.palette.addBrowse', 'Ajouter Browse');
}

export function getPaletteAddTimelineLabel(t) {
  return safeT(t, 'production.palette.addTimeline', 'Ajouter Timeline');
}

export function getLayoutEditTitleLabel(t) {
  return safeT(t, 'production.layout.editTitle', 'Édition Layout');
}

export function getLayoutNameLabel(t) {
  return safeT(t, 'production.layout.name', 'Nom');
}

export function getLayoutColorLabel(t) {
  return safeT(t, 'production.layout.color', 'Couleur');
}

export function getLayoutUseAsStartLabel(t) {
  return safeT(t, 'production.layout.useAsStart', 'Utiliser comme Start Layout');
}

export function getLayoutUseAsStartTooltipLabel(t) {
  return safeT(t, 'production.layout.useAsStart', 'Start Layout');
}

export function getLayoutExportLabel(t) {
  return safeT(t, 'production.layout.export', 'Exporter le layout');
}

export function getLayoutImportLabel(t) {
  return safeT(t, 'production.layout.import', 'Importer le layout');
}

export function getQuitConfirmMessageLabel(t) {
  return safeT(t, 'app.quit.confirm.message', "Voulez-vous quitter l'application ?");
}

export function getConfigGearMissingTooltipLabel(t) {
  return safeT(t, 'config.gearMissingTooltip', 'Configuration incomplète');
}
