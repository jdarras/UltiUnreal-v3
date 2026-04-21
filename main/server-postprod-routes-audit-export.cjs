'use strict';

async function handlePostprodAuditRoutes(options = {}) {
  const {
    req,
    res,
    url,
    pathname = '',
    sendJSON,
    requireSession,
    coercePositiveInt,
    parseIsoDateOrNull,
    stmts,
    buildAuditEntryPayload,
    matchesAuditSearch,
    buildAuditCsvLine,
    nowIso,
    audit,
    getAuditStorageStatus,
  } = options;

  if (!req || !res || !pathname) return false;

  if (pathname === '/agent/postprod/audit') {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const rawLimit = Number(
      url?.searchParams?.get('limit') ||
      url?.searchParams?.get('pageSize') ||
      100
    );
    const limit = Math.min(500, coercePositiveInt(rawLimit, 100, 1));

    const rawPage = Number(url?.searchParams?.get('page') || 1);
    const page = Math.max(1, coercePositiveInt(rawPage, 1, 1));
    const rawOffset = Number(url?.searchParams?.get('offset'));
    const offset = Number.isFinite(rawOffset)
      ? Math.max(0, Math.trunc(rawOffset))
      : Math.max(0, (page - 1) * limit);

    const actorParam = String(url?.searchParams?.get('actorUserId') || '').trim();
    const actorParsed = Number(actorParam);
    const actorUserId = Number.isFinite(actorParsed) && actorParsed > 0
      ? Math.trunc(actorParsed)
      : null;
    if (actorParam && actorUserId == null) {
      sendJSON(res, 400, { ok: false, error: 'invalid_actor_user_id' });
      return true;
    }

    const action = String(url?.searchParams?.get('action') || '').trim().slice(0, 120);
    const scopeType = String(url?.searchParams?.get('scopeType') || '').trim().slice(0, 120);
    const fromAtRaw = String(url?.searchParams?.get('fromAt') || '').trim();
    const toAtRaw = String(url?.searchParams?.get('toAt') || '').trim();
    const fromAt = fromAtRaw ? parseIsoDateOrNull(fromAtRaw) : '';
    const toAt = toAtRaw ? parseIsoDateOrNull(toAtRaw) : '';
    if (fromAtRaw && !fromAt) {
      sendJSON(res, 400, { ok: false, error: 'invalid_from_at' });
      return true;
    }
    if (toAtRaw && !toAt) {
      sendJSON(res, 400, { ok: false, error: 'invalid_to_at' });
      return true;
    }
    if (fromAt && toAt && Date.parse(fromAt) > Date.parse(toAt)) {
      sendJSON(res, 400, { ok: false, error: 'invalid_date_range' });
      return true;
    }

    const totalRow = stmts.countAuditEntries.get(
      actorUserId,
      actorUserId,
      action,
      action,
      scopeType,
      scopeType,
      fromAt,
      fromAt,
      toAt,
      toAt
    );
    const total = Number.isFinite(Number(totalRow?.n))
      ? Math.max(0, Math.trunc(Number(totalRow.n)))
      : 0;
    const rows = stmts.listAuditEntries.all(
      actorUserId,
      actorUserId,
      action,
      action,
      scopeType,
      scopeType,
      fromAt,
      fromAt,
      toAt,
      toAt,
      limit,
      offset
    );
    const entries = rows.map(buildAuditEntryPayload);
    const pageFromOffset = limit > 0 ? Math.floor(offset / limit) + 1 : 1;
    const auditLogStore = typeof getAuditStorageStatus === 'function' ? getAuditStorageStatus() : null;
    sendJSON(res, 200, {
      ok: true,
      entries,
      pagination: {
        total,
        limit,
        offset,
        page: pageFromOffset,
        hasMore: offset + entries.length < total,
      },
      filters: {
        limit,
        offset,
        page: pageFromOffset,
        actorUserId,
        action,
        scopeType,
        fromAt: fromAt || '',
        toAt: toAt || '',
      },
      auditLogStore,
    });
    return true;
  }

  if (pathname === '/agent/postprod/audit/export') {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;

    const actorParam = String(url?.searchParams?.get('actorUserId') || '').trim();
    const actorParsed = Number(actorParam);
    const actorUserId = Number.isFinite(actorParsed) && actorParsed > 0
      ? Math.trunc(actorParsed)
      : null;
    if (actorParam && actorUserId == null) {
      sendJSON(res, 400, { ok: false, error: 'invalid_actor_user_id' });
      return true;
    }

    const action = String(url?.searchParams?.get('action') || '').trim().slice(0, 120);
    const scopeType = String(url?.searchParams?.get('scopeType') || '').trim().slice(0, 120);
    const fromAtRaw = String(url?.searchParams?.get('fromAt') || '').trim();
    const toAtRaw = String(url?.searchParams?.get('toAt') || '').trim();
    const fromAt = fromAtRaw ? parseIsoDateOrNull(fromAtRaw) : '';
    const toAt = toAtRaw ? parseIsoDateOrNull(toAtRaw) : '';
    const query = String(url?.searchParams?.get('q') || url?.searchParams?.get('query') || '')
      .trim()
      .slice(0, 240);
    const format = String(url?.searchParams?.get('format') || 'csv')
      .trim()
      .toLowerCase();
    if (format !== 'csv' && format !== 'json' && format !== 'ndjson') {
      sendJSON(res, 400, { ok: false, error: 'invalid_export_format' });
      return true;
    }
    if (fromAtRaw && !fromAt) {
      sendJSON(res, 400, { ok: false, error: 'invalid_from_at' });
      return true;
    }
    if (toAtRaw && !toAt) {
      sendJSON(res, 400, { ok: false, error: 'invalid_to_at' });
      return true;
    }
    if (fromAt && toAt && Date.parse(fromAt) > Date.parse(toAt)) {
      sendJSON(res, 400, { ok: false, error: 'invalid_date_range' });
      return true;
    }

    const batchRaw = Number(url?.searchParams?.get('batch') || 1000);
    const batchSize = Math.min(5000, coercePositiveInt(batchRaw, 1000, 1));
    const filenameStamp = nowIso().replace(/[:.]/g, '-');
    const filenameBase = `ultiunreal-audit-${filenameStamp}`;
    const csvHeader = [
      'id',
      'createdAt',
      'actorUserId',
      'actorUsername',
      'action',
      'scopeType',
      'scopeId',
      'fromStatus',
      'toStatus',
      'projectRefs',
      'comment',
      'payloadJson',
    ].join(',');

    if (format === 'json') {
      let offset = 0;
      let exportedCount = 0;
      const entries = [];
      while (true) {
        const rows = stmts.listAuditEntries.all(
          actorUserId,
          actorUserId,
          action,
          action,
          scopeType,
          scopeType,
          fromAt,
          fromAt,
          toAt,
          toAt,
          batchSize,
          offset
        );
        if (!Array.isArray(rows) || rows.length <= 0) break;
        for (const row of rows) {
          const entry = buildAuditEntryPayload(row);
          if (!matchesAuditSearch(entry, query)) continue;
          entries.push(entry);
          exportedCount += 1;
        }
        if (rows.length < batchSize) break;
        offset += rows.length;
      }

      const payload = {
        ok: true,
        exportedAt: nowIso(),
        filters: {
          actorUserId,
          action,
          scopeType,
          fromAt: fromAt || '',
          toAt: toAt || '',
          query,
        },
        total: exportedCount,
        entries,
      };
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}.json"`,
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(payload));

      audit(auth.session.user_id, 'audit_export_json', {
        actorUserId,
        action,
        scopeType,
        fromAt: fromAt || '',
        toAt: toAt || '',
        query,
        exportedCount,
      });
      return true;
    }

    if (format === 'ndjson') {
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filenameBase}.ndjson"`,
        'Cache-Control': 'no-store',
      });

      let offset = 0;
      let exportedCount = 0;
      while (true) {
        const rows = stmts.listAuditEntries.all(
          actorUserId,
          actorUserId,
          action,
          action,
          scopeType,
          scopeType,
          fromAt,
          fromAt,
          toAt,
          toAt,
          batchSize,
          offset
        );
        if (!Array.isArray(rows) || rows.length <= 0) break;
        for (const row of rows) {
          const entry = buildAuditEntryPayload(row);
          if (!matchesAuditSearch(entry, query)) continue;
          res.write(`${JSON.stringify(entry)}\n`);
          exportedCount += 1;
        }
        if (rows.length < batchSize) break;
        offset += rows.length;
      }
      res.end();

      audit(auth.session.user_id, 'audit_export_ndjson', {
        actorUserId,
        action,
        scopeType,
        fromAt: fromAt || '',
        toAt: toAt || '',
        query,
        exportedCount,
      });
      return true;
    }

    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenameBase}.csv"`,
      'Cache-Control': 'no-store',
    });
    res.write('\ufeff');
    res.write(`${csvHeader}\r\n`);

    let offset = 0;
    let exportedCount = 0;
    while (true) {
      const rows = stmts.listAuditEntries.all(
        actorUserId,
        actorUserId,
        action,
        action,
        scopeType,
        scopeType,
        fromAt,
        fromAt,
        toAt,
        toAt,
        batchSize,
        offset
      );
      if (!Array.isArray(rows) || rows.length <= 0) break;
      for (const row of rows) {
        const entry = buildAuditEntryPayload(row);
        if (!matchesAuditSearch(entry, query)) continue;
        res.write(`${buildAuditCsvLine(entry)}\r\n`);
        exportedCount += 1;
      }
      if (rows.length < batchSize) break;
      offset += rows.length;
    }
    res.end();

    audit(auth.session.user_id, 'audit_export_csv', {
      actorUserId,
      action,
      scopeType,
      fromAt: fromAt || '',
      toAt: toAt || '',
      query,
      exportedCount,
    });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodAuditRoutes,
};

