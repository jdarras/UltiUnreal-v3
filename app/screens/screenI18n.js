import { safeT } from '../utils/i18nSafe.js';

export function getLogsPurgeLabel(t) {
  return safeT(t, 'logs.toolbar.purgeButton', 'Purger');
}

export function getPostprodQueueSaveLabel(t) {
  return safeT(t, 'postprod.renders.queue.jobs.save', 'Valider');
}

export function getPostprodQueueCancelLabel(t) {
  return safeT(t, 'postprod.renders.queue.jobs.cancel', 'Annuler');
}

export function getRenderReturnClearLabel(t) {
  return safeT(t, 'renderReturnAt.clear', 'Effacer');
}
