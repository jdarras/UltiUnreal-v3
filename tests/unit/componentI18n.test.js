import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAddKeywordLabel,
  getAmbianceLabel,
  getButtonDefaultArgsTitlePluralLabel,
  getButtonDefaultArgsTitleSingularLabel,
  getConfigGearMissingTooltipLabel,
  getDistributionLabel,
  getFavoriteLabel,
  getLicenseLabel,
  getLayoutColorLabel,
  getLayoutEditTitleLabel,
  getLayoutExportLabel,
  getLayoutImportLabel,
  getLayoutNameLabel,
  getLayoutUseAsStartLabel,
  getLayoutUseAsStartTooltipLabel,
  getNoPreviewLabel,
  getNoneOptionLabel,
  getPaletteAddBrowseLabel,
  getPaletteAddTimelineLabel,
  getPerformanceLabel,
  getPurchasedLabel,
  getQualityLabel,
  getQuitConfirmMessageLabel,
  getResourceEditLabel,
  getResourceOpenLabel,
  getStyleLabel,
  getTagsLabel,
  getTestedLabel,
  getTypeLabel,
  getUsageLabel,
  getUeVersionsLabel,
  getVersionIncompatibleLabel,
} from '../../app/components/componentI18n.js';

test('componentI18n helpers return translated values when present', () => {
  const t = (key) => {
    const map = {
      'resources.detail.labels.favorite': 'Favori',
      'resources.noThumbnail': 'Apercu',
      'resources.edit': 'Editer',
      'resources.openFab': 'Ouvrir',
      'common.none': 'Aucun',
      'resources.versionIncompatible': 'Version KO',
      'resources.detail.labels.usage': 'Usage X',
      'resources.detail.labels.style': 'Style X',
      'resources.detail.labels.ambiance': 'Ambiance X',
      'resources.type': 'Type X',
      'resources.detail.distribution': 'Distribution X',
      'resources.ueVersions': 'UE X',
      'resources.detail.labels.license': 'Licence X',
      'resources.detail.labels.quality': 'Qualite X',
      'resources.detail.labels.performance': 'Performance X',
      'resources.detail.labels.purchased': 'Achete X',
      'resources.detail.labels.tested': 'Teste X',
      'resources.detail.labels.addKeyword': 'Mot-cle X',
      'resources.detail.labels.tags': 'Tags X',
      'widgets.button.defaultArgsTitlePlural': 'Defaults pluriel',
      'widgets.button.defaultArgsTitleSingular': 'Default singulier',
      'production.palette.addBrowse': 'Ajout Browse X',
      'production.palette.addTimeline': 'Ajout Timeline X',
      'production.layout.editTitle': 'Edition Layout X',
      'production.layout.name': 'Nom X',
      'production.layout.color': 'Couleur X',
      'production.layout.useAsStart': 'Start Layout X',
      'production.layout.export': 'Export X',
      'production.layout.import': 'Import X',
      'app.quit.confirm.message': 'Quitter X',
      'config.gearMissingTooltip': 'Configuration X',
    };
    return map[key];
  };

  assert.equal(getFavoriteLabel(t), 'Favori');
  assert.equal(getNoPreviewLabel(t), 'Apercu');
  assert.equal(getResourceEditLabel(t), 'Editer');
  assert.equal(getResourceOpenLabel(t), 'Ouvrir');
  assert.equal(getNoneOptionLabel(t), 'Aucun');
  assert.equal(getVersionIncompatibleLabel(t), 'Version KO');
  assert.equal(getUsageLabel(t), 'Usage X');
  assert.equal(getStyleLabel(t), 'Style X');
  assert.equal(getAmbianceLabel(t), 'Ambiance X');
  assert.equal(getTypeLabel(t), 'Type X');
  assert.equal(getDistributionLabel(t), 'Distribution X');
  assert.equal(getUeVersionsLabel(t), 'UE X');
  assert.equal(getLicenseLabel(t), 'Licence X');
  assert.equal(getQualityLabel(t), 'Qualite X');
  assert.equal(getPerformanceLabel(t), 'Performance X');
  assert.equal(getPurchasedLabel(t), 'Achete X');
  assert.equal(getTestedLabel(t), 'Teste X');
  assert.equal(getAddKeywordLabel(t), 'Mot-cle X');
  assert.equal(getTagsLabel(t), 'Tags X');
  assert.equal(getButtonDefaultArgsTitlePluralLabel(t), 'Defaults pluriel');
  assert.equal(getButtonDefaultArgsTitleSingularLabel(t), 'Default singulier');
  assert.equal(getPaletteAddBrowseLabel(t), 'Ajout Browse X');
  assert.equal(getPaletteAddTimelineLabel(t), 'Ajout Timeline X');
  assert.equal(getLayoutEditTitleLabel(t), 'Edition Layout X');
  assert.equal(getLayoutNameLabel(t), 'Nom X');
  assert.equal(getLayoutColorLabel(t), 'Couleur X');
  assert.equal(getLayoutUseAsStartLabel(t), 'Start Layout X');
  assert.equal(getLayoutUseAsStartTooltipLabel(t), 'Start Layout X');
  assert.equal(getLayoutExportLabel(t), 'Export X');
  assert.equal(getLayoutImportLabel(t), 'Import X');
  assert.equal(getQuitConfirmMessageLabel(t), 'Quitter X');
  assert.equal(getConfigGearMissingTooltipLabel(t), 'Configuration X');
});

test('componentI18n helpers return safe fallback values when missing', () => {
  const t = () => undefined;

  assert.equal(getFavoriteLabel(t), 'Favoris');
  assert.equal(getNoPreviewLabel(t), 'No preview');
  assert.equal(getResourceEditLabel(t), 'Edit');
  assert.equal(getResourceOpenLabel(t), 'Open');
  assert.equal(getNoneOptionLabel(t), 'None');
  assert.equal(getVersionIncompatibleLabel(t), 'Version non compatible');
  assert.equal(getUsageLabel(t), 'Usage');
  assert.equal(getStyleLabel(t), 'Style');
  assert.equal(getAmbianceLabel(t), 'Ambiance');
  assert.equal(getTypeLabel(t), 'Type');
  assert.equal(getDistributionLabel(t), 'Distribution');
  assert.equal(getUeVersionsLabel(t), 'UE');
  assert.equal(getLicenseLabel(t), 'License');
  assert.equal(getQualityLabel(t), 'Quality');
  assert.equal(getPerformanceLabel(t), 'Performance');
  assert.equal(getPurchasedLabel(t), 'Acheté');
  assert.equal(getTestedLabel(t), 'Testé');
  assert.equal(getAddKeywordLabel(t), 'Ajouter mot-clé');
  assert.equal(getTagsLabel(t), 'Mots-clés');
  assert.equal(getButtonDefaultArgsTitlePluralLabel(t), 'Valeurs par défaut');
  assert.equal(getButtonDefaultArgsTitleSingularLabel(t), 'Valeur par défaut');
  assert.equal(getPaletteAddBrowseLabel(t), 'Ajouter Browse');
  assert.equal(getPaletteAddTimelineLabel(t), 'Ajouter Timeline');
  assert.equal(getLayoutEditTitleLabel(t), 'Édition Layout');
  assert.equal(getLayoutNameLabel(t), 'Nom');
  assert.equal(getLayoutColorLabel(t), 'Couleur');
  assert.equal(getLayoutUseAsStartLabel(t), 'Utiliser comme Start Layout');
  assert.equal(getLayoutUseAsStartTooltipLabel(t), 'Start Layout');
  assert.equal(getLayoutExportLabel(t), 'Exporter le layout');
  assert.equal(getLayoutImportLabel(t), 'Importer le layout');
  assert.equal(getQuitConfirmMessageLabel(t), "Voulez-vous quitter l'application ?");
  assert.equal(getConfigGearMissingTooltipLabel(t), 'Configuration incomplète');
});
