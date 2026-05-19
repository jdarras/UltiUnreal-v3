import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBrowseActionLabel,
  getBrowsePathPlaceholder,
  getBrowsePlaceholderLabel,
  getColorPickLabel,
  getLimitsTitleLabel,
  getSendActionLabel,
  getVectorDefaultsTitleLabel
} from '../../app/widgets/widgetI18n.js';

test('widgetI18n helpers return translated values when available', () => {
  const t = (key) => {
    const map = {
      'production.widgets.browsePlaceholder': 'No preview',
      'production.widgets.browsePath': 'Media path',
      'common.browse': 'Browse',
      'widgets.common.send': 'Send',
      'widgets.color.pick': 'Pick color',
      'vector.defaults.title': 'Default values',
      'widgets.common.limitsTitle': 'Limits'
    };
    return map[key] || key;
  };

  assert.equal(getBrowsePlaceholderLabel(t), 'No preview');
  assert.equal(getBrowsePathPlaceholder(t), 'Media path');
  assert.equal(getBrowseActionLabel(t), 'Browse');
  assert.equal(getSendActionLabel(t), 'Send');
  assert.equal(getColorPickLabel(t), 'Pick color');
  assert.equal(getVectorDefaultsTitleLabel(t), 'Default values');
  assert.equal(getLimitsTitleLabel(t), 'Limits');
});

test('widgetI18n helpers keep safe fallbacks when translation is missing', () => {
  const t = (key) => key;

  assert.equal(getBrowsePlaceholderLabel(t), 'Aucun aperçu');
  assert.equal(getBrowsePathPlaceholder(t), "Chemin d'un média");
  assert.equal(getBrowseActionLabel(t), 'Parcourir');
  assert.equal(getSendActionLabel(t), 'Envoyer');
  assert.equal(getColorPickLabel(t), 'Choisir une couleur');
  assert.equal(getVectorDefaultsTitleLabel(t), 'Valeurs par défaut');
  assert.equal(getLimitsTitleLabel(t), 'Limites');
});
