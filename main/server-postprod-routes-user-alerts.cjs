'use strict';

function toPositiveInt(value, fallback = 0) {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return Math.max(0, Math.trunc(Number(fallback) || 0));
  return Math.trunc(parsed);
}

function parseMetaJsonSafe(value) {
  const raw = String(value || '').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function buildUserAlertPayload(row = null) {
  const alertType = String(row?.alert_type || '').trim().toLowerCase();
  const status = String(row?.status || '').trim().toLowerCase();
  const taskIdRaw = Number(row?.task_id || 0);
  const taskId = Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : null;
  const renderIdRaw = Number(row?.render_job_id || 0);
  const renderId = Number.isFinite(renderIdRaw) && renderIdRaw > 0 ? Math.trunc(renderIdRaw) : null;
  const createdByUserIdRaw = Number(row?.created_by_user_id || 0);
  const createdByUserId = Number.isFinite(createdByUserIdRaw) && createdByUserIdRaw > 0
    ? Math.trunc(createdByUserIdRaw)
    : null;
  return {
    id: toPositiveInt(row?.id, 0),
    userId: toPositiveInt(row?.user_id, 0),
    alertType,
    status,
    taskId,
    renderId,
    createdByUserId,
    message: String(row?.message || '').trim(),
    meta: parseMetaJsonSafe(row?.meta_json),
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
    resolvedAt: row?.resolved_at || null,
  };
}

async function handlePostprodUserAlertsRoutes(options = {}) {
  const {
    req,
    res,
    pathname = '',
    url,
    sendJSON,
    requireSession,
    stmts,
  } = options;
  if (!req || !res || pathname !== '/agent/postprod/alerts') return false;

  if (req.method !== 'GET') {
    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const auth = requireSession(req, res, sendJSON);
  if (!auth) return true;
  const userId = toPositiveInt(auth?.session?.user_id, 0);
  if (userId <= 0) {
    sendJSON(res, 401, { ok: false, error: 'invalid_session' });
    return true;
  }

  const limitRaw = Number(url?.searchParams?.get('limit') || 100);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.max(1, Math.min(500, Math.trunc(limitRaw)))
    : 100;
  const rows = typeof stmts?.listOpenUserAlertsByUserId?.all === 'function'
    ? stmts.listOpenUserAlertsByUserId.all(userId, limit)
    : [];
  const summaryRow = typeof stmts?.countOpenUserAlertsByUserId?.get === 'function'
    ? (stmts.countOpenUserAlertsByUserId.get(userId) || null)
    : null;

  const toModifyCount = toPositiveInt(summaryRow?.to_modify_open, 0);
  const renderErrorCount = toPositiveInt(summaryRow?.render_error_open, 0);
  const newAssignmentCount = toPositiveInt(summaryRow?.new_assignment_open, 0);
  const totalCount = toPositiveInt(
    summaryRow?.total_open,
    toModifyCount + renderErrorCount + newAssignmentCount
  );

  sendJSON(res, 200, {
    ok: true,
    alerts: (Array.isArray(rows) ? rows : []).map(buildUserAlertPayload),
    summary: {
      totalOpen: totalCount,
      toModifyOpen: toModifyCount,
      renderErrorOpen: renderErrorCount,
      newAssignmentOpen: newAssignmentCount,
    },
  });
  return true;
}

module.exports = {
  handlePostprodUserAlertsRoutes,
};

