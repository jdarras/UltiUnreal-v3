async function handlePostprodActivityAndAuditMaintenanceRoutes({
  req,
  res,
  url,
  pathname = '',
  sendJSON,
  requireSession,
  requireManageRoles,
  stmts,
  parseActivityFilters,
  buildUserActivityPayload,
  activityMatchesActionType,
  activityMatchesProjectRefs,
  activityMatchesSearchQuery,
  summarizeUserActivity,
  nowIso,
  getRenderHealthAuditMaintenanceSnapshot,
  maybePurgeRenderHealthAuditEvents,
  POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
  renderHealthEventRetentionDays,
  audit,
}) {
  if (pathname === '/agent/postprod/me/activity') {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const userId = Number(auth?.session?.user_id || 0);
    const activityFilters = parseActivityFilters(url?.searchParams || new URLSearchParams());
    if (!activityFilters?.ok) {
      sendJSON(res, 400, { ok: false, error: String(activityFilters?.error || 'invalid_activity_filters') });
      return true;
    }
    const rows = stmts.listAuditByActorUserId.all(
      userId,
      activityFilters.fromAt,
      activityFilters.fromAt,
      activityFilters.toAt,
      activityFilters.toAt,
      activityFilters.limit
    );
    const activities = rows
      .map(buildUserActivityPayload)
      .filter((entry) => activityMatchesActionType(entry, activityFilters.actionType))
      .filter((entry) => activityMatchesProjectRefs(entry, activityFilters.projectRefs))
      .filter((entry) => activityMatchesSearchQuery(entry, activityFilters.searchQuery));
    const summary = summarizeUserActivity(activities);
    sendJSON(res, 200, {
      ok: true,
      userId,
      activities,
      summary,
      filters: {
        limit: activityFilters.limit,
        fromAt: activityFilters.fromAt,
        toAt: activityFilters.toAt,
        actionType: activityFilters.actionType,
        projectRefs: activityFilters.projectRefs,
        searchQuery: activityFilters.searchQuery,
      },
    });
    return true;
  }

  if (pathname === '/agent/postprod/audit/purge') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const perms = requireManageRoles(auth, res, sendJSON);
    if (!perms) return true;
    const now = nowIso();
    let beforeCount = 0;
    try {
      const row = stmts.countAllAuditEntries.get();
      beforeCount = Number.isFinite(Number(row?.n)) ? Math.max(0, Math.trunc(Number(row.n))) : 0;
    } catch {}
    let deleted = 0;
    try {
      const result = stmts.deleteAllAuditEntries.run();
      deleted = Number.isFinite(Number(result?.changes)) ? Math.max(0, Math.trunc(Number(result.changes))) : beforeCount;
    } catch (err) {
      sendJSON(res, 500, { ok: false, error: 'purge_failed' });
      return true;
    }
    audit(
      auth.session.user_id,
      'audit_purge_manual',
      { beforeCount, deleted, at: now },
      'audit',
      null
    );
    sendJSON(res, 200, { ok: true, purge: { beforeCount, deleted, at: now } });
    return true;
  }

  if (pathname === '/agent/postprod/audit/maintenance/render-health') {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const perms = requireManageRoles(auth, res, sendJSON);
    if (!perms) return true;
    const maintenance = getRenderHealthAuditMaintenanceSnapshot(nowIso());
    sendJSON(res, 200, {
      ok: true,
      maintenance,
    });
    return true;
  }

  if (pathname === '/agent/postprod/audit/maintenance/render-health/purge') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const perms = requireManageRoles(auth, res, sendJSON);
    if (!perms) return true;
    const now = nowIso();
    let beforeCount = 0;
    try {
      const row = stmts.countAuditEntriesByAction.get(POSTPROD_RENDER_HEALTH_AUDIT_ACTION);
      beforeCount = Number.isFinite(Number(row?.n)) ? Math.max(0, Math.trunc(Number(row.n))) : 0;
    } catch {
      beforeCount = 0;
    }
    const purge = maybePurgeRenderHealthAuditEvents(now, { force: true });
    let afterCount = beforeCount;
    try {
      const row = stmts.countAuditEntriesByAction.get(POSTPROD_RENDER_HEALTH_AUDIT_ACTION);
      afterCount = Number.isFinite(Number(row?.n)) ? Math.max(0, Math.trunc(Number(row.n))) : afterCount;
    } catch {}
    const deleted = Math.max(0, Math.trunc(Number(purge?.deleted || 0)));
    audit(
      auth.session.user_id,
      'render_health_audit_purge_manual',
      {
        action: POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
        beforeCount,
        afterCount,
        deleted,
        cutoff: String(purge?.cutoff || '').trim(),
        retentionDays: renderHealthEventRetentionDays,
      },
      'audit',
      POSTPROD_RENDER_HEALTH_AUDIT_ACTION
    );
    sendJSON(res, 200, {
      ok: true,
      purge: {
        action: POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
        beforeCount,
        afterCount,
        deleted,
        cutoff: String(purge?.cutoff || '').trim(),
        retentionDays: renderHealthEventRetentionDays,
        at: now,
      },
      maintenance: getRenderHealthAuditMaintenanceSnapshot(now),
    });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodActivityAndAuditMaintenanceRoutes,
};
