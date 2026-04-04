async function handlePostprodRenderTemplatesRoutes({
  req,
  res,
  pathname = '',
  parseBody,
  sendJSON,
  requireSession,
  requireRenderTemplateManage,
  requireRenderTemplateManageForProject,
  stmts,
  buildRenderTemplatePayload,
  rolesCache,
  sanitizeRenderPresetName,
  sanitizeRenderTemplateName,
  sanitizeRenderMapName,
  sanitizeRenderSequenceName,
  sanitizeRenderOutputProfile,
  normalizeRenderTemplateAllowedRolesJson,
  sanitizeRenderProjectName,
  ensureProjectCanAutoRender,
  sharedStore,
  normalizeRenderExecution,
  normalizeRenderPayload,
  nowIso,
  audit,
  normalizeRenderTemplateAllowedRoles,
  parseRenderExecutionJson,
  parseRenderPayloadJson,
}) {
  if (pathname === '/agent/postprod/render-templates') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;

    if (req.method === 'GET') {
      const templates = stmts.listRenderTemplates.all().map((row) => buildRenderTemplatePayload(row, rolesCache));
      sendJSON(res, 200, { ok: true, templates });
      return true;
    }

    if (req.method === 'POST') {
      if (!requireRenderTemplateManage(auth, res, sendJSON)) return true;
      const body = await parseBody(req);
      const name = sanitizeRenderPresetName(body?.name, '');
      const templateName = sanitizeRenderTemplateName(body?.templateName, '');
      const mapName = sanitizeRenderMapName(body?.mapName, '');
      const sequenceName = sanitizeRenderSequenceName(body?.sequenceName, '');
      const outputProfile = sanitizeRenderOutputProfile(body?.outputProfile, '');
      const allowedRolesJson = normalizeRenderTemplateAllowedRolesJson(
        Object.prototype.hasOwnProperty.call(body || {}, 'allowedRoles')
          ? body?.allowedRoles
          : body?.allowedRolesJson,
        rolesCache
      );
      const projectName = sanitizeRenderProjectName(body?.projectName);
      const projectEligibility = ensureProjectCanAutoRender(sharedStore, projectName, stmts);
      const normalizedExecution = normalizeRenderExecution(body?.execution);
      const normalizedPayload = normalizeRenderPayload(body?.payload);
      if (!name) {
        sendJSON(res, 400, { ok: false, error: 'missing_render_template_preset_name' });
        return true;
      }
      if (!templateName) {
        sendJSON(res, 400, { ok: false, error: 'missing_render_template_name' });
        return true;
      }
      if (!projectEligibility.ok) {
        sendJSON(res, 400, {
          ok: false,
          error: projectEligibility.error || 'invalid_project',
          project: projectEligibility.project || null,
          usageMode: String(projectEligibility.usageMode || ''),
        });
        return true;
      }
      if (!requireRenderTemplateManageForProject(
        auth,
        res,
        sendJSON,
        projectEligibility?.project?.id || projectName
      )) return true;
      if (!normalizedExecution.ok) {
        sendJSON(res, 400, {
          ok: false,
          error: normalizedExecution.error || 'invalid_render_template_execution',
        });
        return true;
      }
      if (!normalizedPayload.ok) {
        sendJSON(res, 400, { ok: false, error: normalizedPayload.error || 'invalid_render_payload' });
        return true;
      }
      const existing = stmts.findRenderTemplateByName.get(name);
      if (existing) {
        sendJSON(res, 409, { ok: false, error: 'render_template_name_exists' });
        return true;
      }
      const now = nowIso();
      stmts.insertRenderTemplate.run(
        name,
        projectName,
        templateName,
        mapName,
        sequenceName,
        outputProfile,
        allowedRolesJson,
        normalizedExecution.executionJson,
        normalizedPayload.payloadJson,
        Number(auth.session.user_id),
        now,
        now
      );
      const created = stmts.findRenderTemplateByName.get(name);
      audit(
        auth.session.user_id,
        'render_template_created',
        {
          name,
          templateName,
          mapName,
          sequenceName,
          outputProfile,
          allowedRoles: normalizeRenderTemplateAllowedRoles(allowedRolesJson, rolesCache),
          projectName,
          projectUsageMode: String(projectEligibility.usageMode || ''),
        },
        'render_template',
        String(created?.id || '')
      );
      sendJSON(res, 201, { ok: true, template: buildRenderTemplatePayload(created, rolesCache) });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const renderTemplateByIdMatch = /^\/agent\/postprod\/render-templates\/(\d+)$/.exec(pathname);
  if (!renderTemplateByIdMatch) return false;

  const auth = requireSession(req, res, sendJSON);
  if (!auth) return true;
  const templateId = Number(renderTemplateByIdMatch[1] || 0);
  if (!Number.isFinite(templateId) || templateId <= 0) {
    sendJSON(res, 400, { ok: false, error: 'invalid_render_template_id' });
    return true;
  }
  const existingTemplate = stmts.findRenderTemplateById.get(templateId);
  if (!existingTemplate) {
    sendJSON(res, 404, { ok: false, error: 'render_template_not_found' });
    return true;
  }

  if (req.method === 'GET') {
    sendJSON(res, 200, { ok: true, template: buildRenderTemplatePayload(existingTemplate, rolesCache) });
    return true;
  }

  if (req.method === 'PUT') {
    if (!requireRenderTemplateManage(auth, res, sendJSON)) return true;
    if (!requireRenderTemplateManageForProject(
      auth,
      res,
      sendJSON,
      existingTemplate?.project_name || ''
    )) return true;
    const body = await parseBody(req);
    const hasBodyName = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'name')
      : false;
    const hasBodyProject = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'projectName')
      : false;
    const hasBodyTemplate = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'templateName')
      : false;
    const hasBodyExecution = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'execution')
      : false;
    const hasBodyPayload = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'payload')
      : false;
    const hasBodyMapName = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'mapName')
      : false;
    const hasBodySequenceName = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'sequenceName')
      : false;
    const hasBodyOutputProfile = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'outputProfile')
      : false;
    const hasBodyAllowedRoles = body && typeof body === 'object'
      ? (
        Object.prototype.hasOwnProperty.call(body, 'allowedRoles') ||
        Object.prototype.hasOwnProperty.call(body, 'allowedRolesJson')
      )
      : false;

    const currentName = sanitizeRenderPresetName(existingTemplate?.name, '');
    const currentTemplateName = sanitizeRenderTemplateName(existingTemplate?.template_name, '');
    const currentMapName = sanitizeRenderMapName(existingTemplate?.map_name, '');
    const currentSequenceName = sanitizeRenderSequenceName(existingTemplate?.sequence_name, '');
    const currentOutputProfile = sanitizeRenderOutputProfile(existingTemplate?.output_profile, '');
    const currentAllowedRolesJson = normalizeRenderTemplateAllowedRolesJson(
      existingTemplate?.allowed_roles_json,
      rolesCache
    );
    const currentProjectName = sanitizeRenderProjectName(existingTemplate?.project_name);
    const currentExecution = parseRenderExecutionJson(existingTemplate?.execution_json);
    const currentPayload = parseRenderPayloadJson(existingTemplate?.payload_json);

    const nextName = sanitizeRenderPresetName(
      hasBodyName ? body?.name : currentName,
      currentName
    );
    const nextTemplateName = sanitizeRenderTemplateName(
      hasBodyTemplate ? body?.templateName : currentTemplateName,
      currentTemplateName
    );
    const nextMapName = sanitizeRenderMapName(
      hasBodyMapName ? body?.mapName : currentMapName,
      currentMapName
    );
    const nextSequenceName = sanitizeRenderSequenceName(
      hasBodySequenceName ? body?.sequenceName : currentSequenceName,
      currentSequenceName
    );
    const nextOutputProfile = sanitizeRenderOutputProfile(
      hasBodyOutputProfile ? body?.outputProfile : currentOutputProfile,
      currentOutputProfile
    );
    const nextAllowedRolesJson = hasBodyAllowedRoles
      ? normalizeRenderTemplateAllowedRolesJson(
        Object.prototype.hasOwnProperty.call(body || {}, 'allowedRoles')
          ? body?.allowedRoles
          : body?.allowedRolesJson,
        rolesCache
      )
      : currentAllowedRolesJson;
    const nextProjectName = sanitizeRenderProjectName(
      hasBodyProject ? body?.projectName : currentProjectName
    );
    const nextExecutionInput = hasBodyExecution ? body?.execution : currentExecution;
    const nextPayloadInput = hasBodyPayload ? body?.payload : currentPayload;

    const projectEligibility = ensureProjectCanAutoRender(sharedStore, nextProjectName, stmts);
    const normalizedExecution = normalizeRenderExecution(nextExecutionInput);
    const normalizedPayload = normalizeRenderPayload(nextPayloadInput);
    if (!nextName) {
      sendJSON(res, 400, { ok: false, error: 'missing_render_template_preset_name' });
      return true;
    }
    if (!nextTemplateName) {
      sendJSON(res, 400, { ok: false, error: 'missing_render_template_name' });
      return true;
    }
    if (!projectEligibility.ok) {
      sendJSON(res, 400, {
        ok: false,
        error: projectEligibility.error || 'invalid_project',
        project: projectEligibility.project || null,
        usageMode: String(projectEligibility.usageMode || ''),
      });
      return true;
    }
    if (!requireRenderTemplateManageForProject(
      auth,
      res,
      sendJSON,
      projectEligibility?.project?.id || nextProjectName
    )) return true;
    if (!normalizedExecution.ok) {
      sendJSON(res, 400, {
        ok: false,
        error: normalizedExecution.error || 'invalid_render_template_execution',
      });
      return true;
    }
    if (!normalizedPayload.ok) {
      sendJSON(res, 400, { ok: false, error: normalizedPayload.error || 'invalid_render_payload' });
      return true;
    }

    const duplicate = stmts.findRenderTemplateByNameExcludingId.get(nextName, templateId);
    if (duplicate) {
      sendJSON(res, 409, { ok: false, error: 'render_template_name_exists' });
      return true;
    }

    const now = nowIso();
    const updated = stmts.updateRenderTemplateById.run(
      nextName,
      nextProjectName,
      nextTemplateName,
      nextMapName,
      nextSequenceName,
      nextOutputProfile,
      nextAllowedRolesJson,
      normalizedExecution.executionJson,
      normalizedPayload.payloadJson,
      now,
      templateId
    );
    if (Number(updated?.changes || 0) <= 0) {
      sendJSON(res, 409, { ok: false, error: 'no_changes' });
      return true;
    }
    const refreshed = stmts.findRenderTemplateById.get(templateId);
    audit(
      auth.session.user_id,
      'render_template_updated',
      {
        id: templateId,
        name: nextName,
        templateName: nextTemplateName,
        mapName: nextMapName,
        sequenceName: nextSequenceName,
        outputProfile: nextOutputProfile,
        allowedRoles: normalizeRenderTemplateAllowedRoles(nextAllowedRolesJson, rolesCache),
        projectName: nextProjectName,
        projectUsageMode: String(projectEligibility.usageMode || ''),
      },
      'render_template',
      String(templateId)
    );
    sendJSON(res, 200, { ok: true, template: buildRenderTemplatePayload(refreshed, rolesCache) });
    return true;
  }

  if (req.method === 'DELETE') {
    if (!requireRenderTemplateManage(auth, res, sendJSON)) return true;
    if (!requireRenderTemplateManageForProject(
      auth,
      res,
      sendJSON,
      existingTemplate?.project_name || ''
    )) return true;
    const deleted = stmts.deleteRenderTemplateById.run(templateId);
    if (Number(deleted?.changes || 0) <= 0) {
      sendJSON(res, 404, { ok: false, error: 'render_template_not_found' });
      return true;
    }
    audit(
      auth.session.user_id,
      'render_template_deleted',
      {
        id: templateId,
        name: String(existingTemplate?.name || ''),
        templateName: String(existingTemplate?.template_name || ''),
        mapName: String(existingTemplate?.map_name || ''),
        sequenceName: String(existingTemplate?.sequence_name || ''),
        outputProfile: String(existingTemplate?.output_profile || ''),
        allowedRoles: normalizeRenderTemplateAllowedRoles(existingTemplate?.allowed_roles_json, rolesCache),
        projectName: String(existingTemplate?.project_name || ''),
      },
      'render_template',
      String(templateId)
    );
    sendJSON(res, 200, { ok: true });
    return true;
  }

  sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
  return true;
}

module.exports = {
  handlePostprodRenderTemplatesRoutes,
};
