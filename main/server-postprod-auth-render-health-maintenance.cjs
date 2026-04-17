'use strict';

function createRenderHealthAuditMaintenanceHelpers(deps = {}) {
  const {
    nowIso = () => new Date().toISOString(),
    stmts = null,
    logLine = () => {},
    subtractDays = () => '',
    POSTPROD_RENDER_HEALTH_AUDIT_ACTION = 'render_health_event',
    renderHealthEventRetentionDays = 0,
    renderHealthEventCleanupIntervalMs = 24 * 60 * 60 * 1000,
    DEFAULT_RENDER_HEALTH_EVENT_RETENTION_DAYS = 30,
  } = deps;

  const renderHealthAuditCleanupState = {
    nextAtMs: 0,
    lastRunAt: '',
    lastDeleted: 0,
  };

  function getRenderHealthAuditMaintenanceSnapshot(now = nowIso()) {
    const enabled = Number.isFinite(renderHealthEventRetentionDays) && renderHealthEventRetentionDays > 0;
    const nextCleanupAt = Number(renderHealthAuditCleanupState.nextAtMs || 0) > 0
      ? new Date(Number(renderHealthAuditCleanupState.nextAtMs || 0)).toISOString()
      : '';
    let currentCount = 0;
    try {
      const row = stmts.countAuditEntriesByAction.get(POSTPROD_RENDER_HEALTH_AUDIT_ACTION);
      currentCount = Number.isFinite(Number(row?.n)) ? Math.max(0, Math.trunc(Number(row.n))) : 0;
    } catch {
      currentCount = 0;
    }
    return {
      action: POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
      enabled,
      retentionDays: renderHealthEventRetentionDays,
      cleanupIntervalMs: renderHealthEventCleanupIntervalMs,
      now: String(now || '').trim() || nowIso(),
      nextCleanupAt,
      lastRunAt: String(renderHealthAuditCleanupState.lastRunAt || '').trim(),
      lastDeleted: Math.max(0, Math.trunc(Number(renderHealthAuditCleanupState.lastDeleted) || 0)),
      currentCount,
    };
  }

  function maybePurgeRenderHealthAuditEvents(now = nowIso(), { force = false } = {}) {
    if (!Number.isFinite(renderHealthEventRetentionDays) || renderHealthEventRetentionDays <= 0) {
      return {
        deleted: 0,
        cutoff: '',
        skipped: true,
        reason: 'disabled',
      };
    }
    const nowMs = Date.parse(String(now || ''));
    const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (!force && safeNowMs < Number(renderHealthAuditCleanupState.nextAtMs || 0)) {
      return {
        deleted: 0,
        cutoff: '',
        skipped: true,
        reason: 'interval',
      };
    }
    renderHealthAuditCleanupState.nextAtMs = safeNowMs + renderHealthEventCleanupIntervalMs;
    const cutoff = subtractDays(now, renderHealthEventRetentionDays, DEFAULT_RENDER_HEALTH_EVENT_RETENTION_DAYS);
    let deleted = 0;
    try {
      const result = stmts.deleteAuditEntriesByActionBefore.run(
        POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
        cutoff
      );
      deleted = Math.max(0, Math.trunc(Number(result?.changes || 0)));
    } catch {
      deleted = 0;
    }
    renderHealthAuditCleanupState.lastRunAt = String(now || '').trim();
    renderHealthAuditCleanupState.lastDeleted = deleted;
    if (deleted > 0) {
      logLine({
        level: 'info',
        src: 'postprod',
        action: 'render_health_audit_purged',
        message: `Purge audit render health: ${deleted} entree(s) supprimee(s)`,
        data: {
          action: POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
          retentionDays: renderHealthEventRetentionDays,
          cutoff,
          deleted,
        },
      });
    }
    return {
      deleted,
      cutoff,
      skipped: false,
      reason: '',
    };
  }

  return {
    getRenderHealthAuditMaintenanceSnapshot,
    maybePurgeRenderHealthAuditEvents,
  };
}

module.exports = {
  createRenderHealthAuditMaintenanceHelpers,
};

