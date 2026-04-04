async function handlePostprodDataTablesRoutes({
  req,
  res,
  pathname = '',
  parseBody,
  sendJSON,
  requireSession,
  resolveProjectForApi,
  sharedStore,
  stmts,
  sanitizeProjectRef,
  buildDataTablePayload,
  buildDataRowPayload,
  normalizeDataTableSchema,
  normalizeDataRowPayload,
  parseRenderPayloadJson,
  nowIso,
  audit,
  MAX_DATA_TABLE_NAME_LEN,
  MAX_DATA_ROW_KEY_LEN,
}) {
  const projectDataTablesMatch = /^\/agent\/postprod\/projects\/([^/]+)\/data-tables$/.exec(pathname);
  if (projectDataTablesMatch) {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    let rawProjectRef = '';
    try {
      rawProjectRef = decodeURIComponent(String(projectDataTablesMatch[1] || ''));
    } catch {
      rawProjectRef = String(projectDataTablesMatch[1] || '');
    }
    const projectResolved = resolveProjectForApi(sharedStore, rawProjectRef, stmts);
    if (!projectResolved.ok) {
      sendJSON(res, 400, { ok: false, error: projectResolved.error || 'invalid_project_id' });
      return true;
    }
    const projectRef = sanitizeProjectRef(projectResolved.projectRef || rawProjectRef);
    if (!projectRef) {
      sendJSON(res, 400, { ok: false, error: 'invalid_project_id' });
      return true;
    }

    if (req.method === 'GET') {
      const tables = stmts.listDataTablesByProjectId
        .all(projectRef)
        .map(buildDataTablePayload);
      sendJSON(res, 200, {
        ok: true,
        project: projectResolved.project,
        usageMode: String(projectResolved.usageMode || ''),
        tables,
      });
      return true;
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const name = String(body?.name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_DATA_TABLE_NAME_LEN);
      if (!name) {
        sendJSON(res, 400, { ok: false, error: 'invalid_data_table_name' });
        return true;
      }
      const schema = normalizeDataTableSchema(body?.schema ?? body?.schemaJson ?? {});
      if (!schema.ok) {
        sendJSON(res, 400, { ok: false, error: schema.error || 'invalid_data_table_schema' });
        return true;
      }
      const existing = stmts.findDataTableByProjectAndName.get(projectRef, name);
      if (existing) {
        sendJSON(res, 409, { ok: false, error: 'data_table_exists', table: buildDataTablePayload(existing) });
        return true;
      }
      const now = nowIso();
      try {
        stmts.insertDataTable.run(
          projectRef,
          name,
          schema.json,
          now,
          now
        );
      } catch (err) {
        const msg = String(err?.message || '');
        if (/unique/i.test(msg)) {
          const conflict = stmts.findDataTableByProjectAndName.get(projectRef, name);
          sendJSON(res, 409, { ok: false, error: 'data_table_exists', table: buildDataTablePayload(conflict) });
          return true;
        }
        throw err;
      }
      const created = stmts.findDataTableByProjectAndName.get(projectRef, name);
      audit(
        Number(auth.session.user_id || 0),
        'data_table_created',
        {
          projectId: projectRef,
          tableName: name,
        },
        'data_table',
        String(created?.id || '')
      );
      sendJSON(res, 201, {
        ok: true,
        table: buildDataTablePayload(created),
        project: projectResolved.project,
      });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const dataTableByIdMatch = /^\/agent\/postprod\/data-tables\/(\d+)$/.exec(pathname);
  if (dataTableByIdMatch) {
    if (req.method !== 'PUT' && req.method !== 'PATCH') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const tableId = Number(dataTableByIdMatch[1] || 0);
    if (!Number.isFinite(tableId) || tableId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_data_table_id' });
      return true;
    }
    const table = stmts.findDataTableById.get(tableId);
    if (!table) {
      sendJSON(res, 404, { ok: false, error: 'data_table_not_found' });
      return true;
    }
    const body = await parseBody(req);
    const hasSchema = Object.prototype.hasOwnProperty.call(body || {}, 'schema');
    const hasSchemaJson = Object.prototype.hasOwnProperty.call(body || {}, 'schemaJson');
    const hasWidgetBindings = Object.prototype.hasOwnProperty.call(body || {}, 'widgetBindings');

    let schemaSource = null;
    if (hasSchema || hasSchemaJson) {
      schemaSource = hasSchema ? body?.schema : body?.schemaJson;
    } else if (hasWidgetBindings) {
      const currentSchema = parseRenderPayloadJson(table?.schema_json);
      const base = (currentSchema && typeof currentSchema === 'object' && !Array.isArray(currentSchema))
        ? { ...currentSchema }
        : {};
      base.widgetBindings = body?.widgetBindings;
      schemaSource = base;
    } else {
      sendJSON(res, 400, { ok: false, error: 'missing_data_table_schema' });
      return true;
    }

    const schema = normalizeDataTableSchema(schemaSource);
    if (!schema.ok) {
      sendJSON(res, 400, { ok: false, error: schema.error || 'invalid_data_table_schema' });
      return true;
    }

    const now = nowIso();
    stmts.updateDataTableSchemaById.run(
      schema.json,
      now,
      tableId
    );
    const updated = stmts.findDataTableById.get(tableId);
    audit(
      Number(auth.session.user_id || 0),
      'data_table_updated',
      {
        tableId,
        tableName: String(table?.name || ''),
        projectId: String(table?.project_id || ''),
        updatedFields: {
          schema: true,
          widgetBindings: hasWidgetBindings,
        },
      },
      'data_table',
      String(tableId)
    );
    sendJSON(res, 200, {
      ok: true,
      table: buildDataTablePayload(updated),
    });
    return true;
  }

  const dataTableRowsMatch = /^\/agent\/postprod\/data-tables\/(\d+)\/rows$/.exec(pathname);
  if (dataTableRowsMatch) {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const tableId = Number(dataTableRowsMatch[1] || 0);
    if (!Number.isFinite(tableId) || tableId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_data_table_id' });
      return true;
    }
    const table = stmts.findDataTableById.get(tableId);
    if (!table) {
      sendJSON(res, 404, { ok: false, error: 'data_table_not_found' });
      return true;
    }

    const body = await parseBody(req);
    const rowKey = String(body?.rowKey ?? body?.key ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_DATA_ROW_KEY_LEN);
    if (!rowKey) {
      sendJSON(res, 400, { ok: false, error: 'invalid_data_row_key' });
      return true;
    }
    const payload = normalizeDataRowPayload(body?.payload ?? body?.data ?? {});
    if (!payload.ok) {
      sendJSON(res, 400, { ok: false, error: payload.error || 'invalid_data_row_payload' });
      return true;
    }

    const existing = stmts.findDataRowByTableAndKey.get(tableId, rowKey);
    const now = nowIso();
    stmts.upsertDataRowByTableAndKey.run(
      tableId,
      rowKey,
      payload.json,
      now,
      now
    );
    const saved = stmts.findDataRowByTableAndKey.get(tableId, rowKey);
    audit(
      Number(auth.session.user_id || 0),
      existing ? 'data_row_updated' : 'data_row_created',
      {
        tableId,
        rowKey,
        projectId: String(table?.project_id || ''),
      },
      'data_table',
      String(tableId)
    );
    sendJSON(res, existing ? 200 : 201, {
      ok: true,
      row: buildDataRowPayload(saved),
    });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodDataTablesRoutes,
};
