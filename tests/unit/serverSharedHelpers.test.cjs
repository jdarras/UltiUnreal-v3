// Fonctions communes issues de copies regroupées (comportement inchangé).
const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeProjectUsageMode } = require('../../main/server-normalize.cjs');
const { buildUnrealAssetPathFromRelative, classifyUnrealAssetFromName } = require('../../main/unreal-asset-names.cjs');
const { encodeAlertMeta } = require('../../main/server-postprod-alert-meta.cjs');

test('project usage modes accept French and English labels', () => {
  assert.equal(normalizeProjectUsageMode('Rendu automatique'), 'auto_render');
  assert.equal(normalizeProjectUsageMode(' LIVE et rendu automatique '), 'live_auto_render');
  assert.equal(normalizeProjectUsageMode('autre'), 'other');
  assert.equal(normalizeProjectUsageMode('inconnu'), '');
  assert.equal(normalizeProjectUsageMode(null), '');
});

test('Unreal asset paths and kinds are derived from project files', () => {
  assert.equal(buildUnrealAssetPathFromRelative('Maps\Main.umap'), '/Game/Maps/Main.Main');
  assert.equal(buildUnrealAssetPathFromRelative(''), '');
  assert.equal(classifyUnrealAssetFromName('Main.umap', '.umap').isLevel, true);
  assert.equal(classifyUnrealAssetFromName('LS_Intro.uasset', '.uasset').isSequence, true);
  const wrc = classifyUnrealAssetFromName('WRC_Generique.uasset', '.uasset');
  assert.deepEqual([wrc.isWrcPreset, wrc.isPreset], [true, false]);
});

test('alert metadata is always valid JSON', () => {
  assert.equal(encodeAlertMeta({ renderId: 3 }), '{"renderId":3}');
  assert.equal(encodeAlertMeta([1, 2]), '{}');
  const cyclic = {};
  cyclic.self = cyclic;
  assert.equal(encodeAlertMeta(cyclic), '{}');
});
