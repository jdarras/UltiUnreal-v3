async function handlePostprodResourcesRoutes({
  req,
  res,
  url,
  pathname = '',
  sendJSON,
  requireSession,
  requireRenderDispatch,
  maybeSyncResourcesIndexFromLibrary,
  listPostprodResources,
  syncResourcesIndexFromLibrary,
  resourcesIndexAutoSyncIntervalMs,
  resourcesIndexSyncState,
  nowIso,
  stmts,
  sharedStore,
  audit,
  resolvePostprodResourceByRef,
}) {
  if (pathname === '/agent/postprod/resources') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const refreshRaw = String(url?.searchParams?.get('refresh') || '').trim().toLowerCase();
    const forceRefresh = refreshRaw === '1' || refreshRaw === 'true' || refreshRaw === 'yes' || refreshRaw === 'force';
    const syncSummary = maybeSyncResourcesIndexFromLibrary({
      force: forceRefresh,
      actorUserId: auth?.session?.user_id,
    });
    const items = listPostprodResources(stmts);
    sendJSON(res, 200, {
      ok: true,
      items,
      source: 'resources_index',
      sync: {
        intervalMs: resourcesIndexAutoSyncIntervalMs,
        busy: resourcesIndexSyncState.busy === true,
        ...(
          syncSummary && typeof syncSummary === 'object'
            ? syncSummary
            : {}
        ),
      },
    });
    return true;
  }

  if (pathname === '/agent/postprod/resources/reindex') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const dispatchPerms = requireRenderDispatch(auth, res, sendJSON);
    if (!dispatchPerms) return true;
    const syncResult = syncResourcesIndexFromLibrary(stmts, sharedStore, { now: nowIso() });
    if (!syncResult.ok) {
      resourcesIndexSyncState.lastRunMs = Date.now();
      resourcesIndexSyncState.lastSummary = {
        ok: false,
        skipped: false,
        reason: String(syncResult.error || 'sync_failed'),
        processed: Number(syncResult.processed || 0),
        inserted: Number(syncResult.inserted || 0),
        updated: Number(syncResult.updated || 0),
        totalSource: Number(syncResult.totalSource || 0),
        at: nowIso(),
        error: String(syncResult.error || 'sync_failed'),
      };
      const status = syncResult.error === 'library_unavailable' ? 503 : 500;
      sendJSON(res, status, {
        ok: false,
        error: syncResult.error || 'resources_reindex_failed',
        details: syncResult,
      });
      return true;
    }
    const countAfter = Number(stmts.countResourcesIndex.get()?.n || 0);
    resourcesIndexSyncState.lastRunMs = Date.now();
    resourcesIndexSyncState.lastSummary = {
      ok: true,
      skipped: false,
      reason: 'synced',
      processed: Number(syncResult.processed || 0),
      inserted: Number(syncResult.inserted || 0),
      updated: Number(syncResult.updated || 0),
      totalSource: Number(syncResult.totalSource || 0),
      countAfter,
      at: nowIso(),
    };
    audit(
      Number(auth.session.user_id || 0),
      'resources_reindexed',
      {
        processed: syncResult.processed,
        inserted: syncResult.inserted,
        updated: syncResult.updated,
        countAfter,
      },
      'resource',
      ''
    );
    sendJSON(res, 200, {
      ok: true,
      ...syncResult,
      count: countAfter,
    });
    return true;
  }

  const postprodResourceMatch = /^\/agent\/postprod\/resources\/([^/]+)$/.exec(pathname);
  if (postprodResourceMatch) {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    let decodedRef = '';
    try {
      decodedRef = decodeURIComponent(postprodResourceMatch[1] || '');
    } catch {
      decodedRef = String(postprodResourceMatch[1] || '');
    }
    const resolved = resolvePostprodResourceByRef(stmts, decodedRef);
    if (!resolved.ok) {
      const status = resolved.error === 'invalid_resource_id' ? 400 : 404;
      sendJSON(res, status, { ok: false, error: resolved.error });
      return true;
    }
    sendJSON(res, 200, { ok: true, item: resolved.item });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodResourcesRoutes,
};
