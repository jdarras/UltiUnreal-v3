'use strict';

function createResourcesIndexSyncHelpers(deps = {}) {
  const {
    stmts = {},
    sharedStore = null,
    syncResourcesIndexFromLibrary = () => ({ ok: false, error: 'sync_unavailable' }),
    resourcesIndexAutoSyncIntervalMs = 60000,
    nowIso = () => new Date().toISOString(),
    audit = () => {},
  } = deps;

  const resourcesIndexSyncState = {
    lastRunMs: 0,
    lastSummary: null,
    busy: false,
  };

  function maybeSyncResourcesIndexFromLibrary({
    force = false,
    actorUserId = null,
  } = {}) {
    const nowMs = Date.now();
    const previous = (
      resourcesIndexSyncState.lastSummary &&
      typeof resourcesIndexSyncState.lastSummary === 'object'
    )
      ? resourcesIndexSyncState.lastSummary
      : null;
    if (resourcesIndexSyncState.busy) {
      return {
        ok: true,
        skipped: true,
        reason: 'busy',
        previous,
      };
    }
    if (!force && (nowMs - Number(resourcesIndexSyncState.lastRunMs || 0)) < resourcesIndexAutoSyncIntervalMs) {
      return {
        ok: true,
        skipped: true,
        reason: 'interval',
        previous,
      };
    }
    resourcesIndexSyncState.busy = true;
    resourcesIndexSyncState.lastRunMs = nowMs;
    const now = nowIso();
    let summary = null;
    try {
      const syncResult = syncResourcesIndexFromLibrary(stmts, sharedStore, { now });
      const safeActorUserId = Number(actorUserId || 0);
      const countAfter = Number(stmts.countResourcesIndex.get()?.n || 0);
      summary = {
        ok: syncResult.ok === true,
        skipped: false,
        reason: syncResult.ok ? 'synced' : String(syncResult.error || 'sync_failed'),
        processed: Number(syncResult.processed || 0),
        inserted: Number(syncResult.inserted || 0),
        updated: Number(syncResult.updated || 0),
        totalSource: Number(syncResult.totalSource || 0),
        countAfter,
        at: now,
      };
      if (syncResult.ok && safeActorUserId > 0 && (summary.inserted > 0 || summary.updated > 0)) {
        audit(
          safeActorUserId,
          'resources_reindexed_auto',
          {
            processed: summary.processed,
            inserted: summary.inserted,
            updated: summary.updated,
            countAfter,
          },
          'resource',
          ''
        );
      }
      if (!syncResult.ok) {
        summary.error = String(syncResult.error || 'sync_failed');
      }
    } catch (err) {
      summary = {
        ok: false,
        skipped: false,
        reason: 'sync_failed',
        error: String(err?.message || err || 'sync_failed').slice(0, 240),
        at: now,
      };
    } finally {
      resourcesIndexSyncState.busy = false;
    }
    resourcesIndexSyncState.lastSummary = summary;
    return summary;
  }

  return {
    resourcesIndexSyncState,
    maybeSyncResourcesIndexFromLibrary,
  };
}

module.exports = {
  createResourcesIndexSyncHelpers,
};
