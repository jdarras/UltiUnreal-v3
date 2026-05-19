import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLogsPurgeLabel,
  getPostprodQueueCancelLabel,
  getPostprodQueueSaveLabel,
  getRenderReturnClearLabel,
} from '../../app/screens/screenI18n.js';

test('screenI18n helpers return translated values when present', () => {
  const t = (key) => {
    const map = {
      'logs.toolbar.purgeButton': 'Purge X',
      'postprod.renders.queue.jobs.save': 'Save X',
      'postprod.renders.queue.jobs.cancel': 'Cancel X',
      'renderReturnAt.clear': 'Clear X',
    };
    return map[key];
  };

  assert.equal(getLogsPurgeLabel(t), 'Purge X');
  assert.equal(getPostprodQueueSaveLabel(t), 'Save X');
  assert.equal(getPostprodQueueCancelLabel(t), 'Cancel X');
  assert.equal(getRenderReturnClearLabel(t), 'Clear X');
});

test('screenI18n helpers fallback when translation is missing', () => {
  const t = () => undefined;

  assert.equal(getLogsPurgeLabel(t), 'Purger');
  assert.equal(getPostprodQueueSaveLabel(t), 'Valider');
  assert.equal(getPostprodQueueCancelLabel(t), 'Annuler');
  assert.equal(getRenderReturnClearLabel(t), 'Effacer');
});
