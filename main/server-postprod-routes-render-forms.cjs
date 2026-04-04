async function handlePostprodRenderFormsRoutes({
  req,
  res,
  pathname = '',
  parseBody,
  sendJSON,
  requireSession,
  requireRenderTemplateManage,
  requireRenderTemplateManageForProject,
  sanitizeRenderFormName,
  sanitizeRenderProjectName,
  sanitizeRenderTemplateName,
  sanitizeRenderMapName,
  sanitizeRenderSequenceName,
  sanitizeRenderOutputProfile,
  sanitizeRenderFormPresetName,
  normalizeRenderFormModeDefault,
  parseBooleanFlag,
  normalizeRenderFormLayout,
  ensureProjectCanAutoRender,
  sharedStore,
  stmts,
  nowIso,
  audit,
  buildRenderFormPayload,
  normalizeRenderFormFields,
  replaceRenderFormFieldsTx,
  buildRenderFormFieldPayload,
  parseJsonValue,
}) {
  if (pathname === '/agent/postprod/render-forms') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;

    if (req.method === 'GET') {
      const forms = stmts.listRenderForms.all().map((row) => buildRenderFormPayload(row));
      sendJSON(res, 200, { ok: true, forms });
      return true;
    }

    if (req.method === 'POST') {
      if (!requireRenderTemplateManage(auth, res, sendJSON)) return true;
      const body = await parseBody(req);
      const name = sanitizeRenderFormName(body?.name, '');
      const projectName = sanitizeRenderProjectName(body?.projectName);
      const templateName = sanitizeRenderTemplateName(body?.templateName, '');
      const mapName = sanitizeRenderMapName(body?.mapName, '');
      const sequenceName = sanitizeRenderSequenceName(body?.sequenceName, '');
      const outputProfile = sanitizeRenderOutputProfile(body?.outputProfile, '');
      const presetName = sanitizeRenderFormPresetName(body?.presetName ?? body?.preset, '');
      const modeDefault = normalizeRenderFormModeDefault(body?.modeDefault ?? body?.mode, 'edit');
      const isActive = parseBooleanFlag(body?.isActive, true);
      const normalizedLayout = normalizeRenderFormLayout(
        Object.prototype.hasOwnProperty.call(body || {}, 'layout')
          ? body?.layout
          : body?.layoutJson
      );
      if (!name) {
        sendJSON(res, 400, { ok: false, error: 'missing_render_form_name' });
        return true;
      }
      if (!projectName) {
        sendJSON(res, 400, { ok: false, error: 'missing_project_name' });
        return true;
      }
      if (!normalizedLayout.ok) {
        sendJSON(res, 400, { ok: false, error: normalizedLayout.error || 'invalid_render_form_layout' });
        return true;
      }
      const projectEligibility = ensureProjectCanAutoRender(sharedStore, projectName, stmts);
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

      const existing = stmts.findRenderFormByName.get(name);
      if (existing) {
        sendJSON(res, 409, { ok: false, error: 'render_form_name_exists' });
        return true;
      }

      const now = nowIso();
      stmts.insertRenderForm.run(
        name,
        projectName,
        templateName,
        mapName,
        sequenceName,
        outputProfile,
        presetName,
        modeDefault,
        isActive ? 1 : 0,
        normalizedLayout.json,
        Number(auth.session.user_id),
        now,
        now
      );
      const created = stmts.findRenderFormByName.get(name);
      audit(
        auth.session.user_id,
        'render_form_created',
        {
          name,
          projectName,
          templateName,
          mapName,
          sequenceName,
          outputProfile,
          presetName,
          modeDefault,
          isActive: isActive === true,
        },
        'render_form',
        String(created?.id || '')
      );
      sendJSON(res, 201, { ok: true, form: buildRenderFormPayload(created) });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const renderFormFieldsMatch = /^\/agent\/postprod\/render-forms\/(\d+)\/fields$/.exec(pathname);
  if (renderFormFieldsMatch) {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const formId = Number(renderFormFieldsMatch[1] || 0);
    if (!Number.isFinite(formId) || formId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_render_form_id' });
      return true;
    }
    const existingForm = stmts.findRenderFormById.get(formId);
    if (!existingForm) {
      sendJSON(res, 404, { ok: false, error: 'render_form_not_found' });
      return true;
    }

    if (req.method === 'GET') {
      const fields = stmts.listRenderFormFieldsByFormId
        .all(formId)
        .map((row) => buildRenderFormFieldPayload(row));
      sendJSON(res, 200, { ok: true, fields });
      return true;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      if (!requireRenderTemplateManage(auth, res, sendJSON)) return true;
      if (!requireRenderTemplateManageForProject(
        auth,
        res,
        sendJSON,
        existingForm?.project_name || ''
      )) return true;
      const body = await parseBody(req);
      const fieldsInput = (
        body && typeof body === 'object' && !Array.isArray(body) &&
        Object.prototype.hasOwnProperty.call(body, 'fields')
      )
        ? body.fields
        : body;
      const normalizedFields = normalizeRenderFormFields(fieldsInput);
      if (!normalizedFields.ok) {
        sendJSON(res, 400, {
          ok: false,
          error: normalizedFields.error || 'invalid_render_form_fields',
          fieldIndex: normalizedFields.fieldIndex ?? null,
          fieldKey: normalizedFields.fieldKey || '',
        });
        return true;
      }

      const now = nowIso();
      replaceRenderFormFieldsTx(formId, normalizedFields.fields, now);
      stmts.updateRenderFormById.run(
        String(existingForm?.name || ''),
        String(existingForm?.project_name || ''),
        String(existingForm?.template_name || ''),
        String(existingForm?.map_name || ''),
        String(existingForm?.sequence_name || ''),
        String(existingForm?.output_profile || ''),
        String(existingForm?.preset_name || ''),
        normalizeRenderFormModeDefault(existingForm?.mode_default, 'edit'),
        Number(existingForm?.is_active) === 1 ? 1 : 0,
        String(existingForm?.layout_json || '{}'),
        now,
        formId
      );
      audit(
        auth.session.user_id,
        'render_form_fields_replaced',
        {
          formId,
          fieldsCount: normalizedFields.fields.length,
        },
        'render_form',
        String(formId)
      );
      const fields = stmts.listRenderFormFieldsByFormId
        .all(formId)
        .map((row) => buildRenderFormFieldPayload(row));
      sendJSON(res, 200, { ok: true, fields });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const renderFormByIdMatch = /^\/agent\/postprod\/render-forms\/(\d+)$/.exec(pathname);
  if (!renderFormByIdMatch) return false;

  const auth = requireSession(req, res, sendJSON);
  if (!auth) return true;
  const formId = Number(renderFormByIdMatch[1] || 0);
  if (!Number.isFinite(formId) || formId <= 0) {
    sendJSON(res, 400, { ok: false, error: 'invalid_render_form_id' });
    return true;
  }
  const existingForm = stmts.findRenderFormById.get(formId);
  if (!existingForm) {
    sendJSON(res, 404, { ok: false, error: 'render_form_not_found' });
    return true;
  }

  if (req.method === 'GET') {
    sendJSON(res, 200, { ok: true, form: buildRenderFormPayload(existingForm) });
    return true;
  }

  if (req.method === 'PUT') {
    if (!requireRenderTemplateManage(auth, res, sendJSON)) return true;
    if (!requireRenderTemplateManageForProject(
      auth,
      res,
      sendJSON,
      existingForm?.project_name || ''
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
    const hasBodyMap = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'mapName')
      : false;
    const hasBodySequence = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'sequenceName')
      : false;
    const hasBodyOutputProfile = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'outputProfile')
      : false;
    const hasBodyPreset = body && typeof body === 'object'
      ? (Object.prototype.hasOwnProperty.call(body, 'presetName') || Object.prototype.hasOwnProperty.call(body, 'preset'))
      : false;
    const hasBodyMode = body && typeof body === 'object'
      ? (Object.prototype.hasOwnProperty.call(body, 'modeDefault') || Object.prototype.hasOwnProperty.call(body, 'mode'))
      : false;
    const hasBodyActive = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'isActive')
      : false;
    const hasBodyLayout = body && typeof body === 'object'
      ? (Object.prototype.hasOwnProperty.call(body, 'layout') || Object.prototype.hasOwnProperty.call(body, 'layoutJson'))
      : false;

    const currentName = sanitizeRenderFormName(existingForm?.name, '');
    const currentProjectName = sanitizeRenderProjectName(existingForm?.project_name);
    const currentTemplateName = sanitizeRenderTemplateName(existingForm?.template_name, '');
    const currentMapName = sanitizeRenderMapName(existingForm?.map_name, '');
    const currentSequenceName = sanitizeRenderSequenceName(existingForm?.sequence_name, '');
    const currentOutputProfile = sanitizeRenderOutputProfile(existingForm?.output_profile, '');
    const currentPresetName = sanitizeRenderFormPresetName(existingForm?.preset_name, '');
    const currentModeDefault = normalizeRenderFormModeDefault(existingForm?.mode_default, 'edit');
    const currentIsActive = Number(existingForm?.is_active) === 1;
    const currentLayoutInput = parseJsonValue(existingForm?.layout_json, {});

    const nextName = sanitizeRenderFormName(hasBodyName ? body?.name : currentName, currentName);
    const nextProjectName = sanitizeRenderProjectName(hasBodyProject ? body?.projectName : currentProjectName);
    const nextTemplateName = sanitizeRenderTemplateName(
      hasBodyTemplate ? body?.templateName : currentTemplateName,
      currentTemplateName
    );
    const nextMapName = sanitizeRenderMapName(
      hasBodyMap ? body?.mapName : currentMapName,
      currentMapName
    );
    const nextSequenceName = sanitizeRenderSequenceName(
      hasBodySequence ? body?.sequenceName : currentSequenceName,
      currentSequenceName
    );
    const nextOutputProfile = sanitizeRenderOutputProfile(
      hasBodyOutputProfile ? body?.outputProfile : currentOutputProfile,
      currentOutputProfile
    );
    const nextPresetName = sanitizeRenderFormPresetName(
      hasBodyPreset ? (body?.presetName ?? body?.preset) : currentPresetName,
      currentPresetName
    );
    const nextModeDefault = normalizeRenderFormModeDefault(
      hasBodyMode ? (body?.modeDefault ?? body?.mode) : currentModeDefault,
      currentModeDefault
    );
    const nextIsActive = hasBodyActive ? parseBooleanFlag(body?.isActive, currentIsActive) : currentIsActive;
    const nextLayoutInput = hasBodyLayout
      ? (Object.prototype.hasOwnProperty.call(body || {}, 'layout') ? body?.layout : body?.layoutJson)
      : currentLayoutInput;

    if (!nextName) {
      sendJSON(res, 400, { ok: false, error: 'missing_render_form_name' });
      return true;
    }
    if (!nextProjectName) {
      sendJSON(res, 400, { ok: false, error: 'missing_project_name' });
      return true;
    }
    const normalizedLayout = normalizeRenderFormLayout(nextLayoutInput);
    if (!normalizedLayout.ok) {
      sendJSON(res, 400, { ok: false, error: normalizedLayout.error || 'invalid_render_form_layout' });
      return true;
    }
    const projectEligibility = ensureProjectCanAutoRender(sharedStore, nextProjectName, stmts);
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

    const duplicate = stmts.findRenderFormByNameExcludingId.get(nextName, formId);
    if (duplicate) {
      sendJSON(res, 409, { ok: false, error: 'render_form_name_exists' });
      return true;
    }

    const now = nowIso();
    const updated = stmts.updateRenderFormById.run(
      nextName,
      nextProjectName,
      nextTemplateName,
      nextMapName,
      nextSequenceName,
      nextOutputProfile,
      nextPresetName,
      nextModeDefault,
      nextIsActive ? 1 : 0,
      normalizedLayout.json,
      now,
      formId
    );
    if (Number(updated?.changes || 0) <= 0) {
      sendJSON(res, 409, { ok: false, error: 'no_changes' });
      return true;
    }
    const refreshed = stmts.findRenderFormById.get(formId);
    audit(
      auth.session.user_id,
      'render_form_updated',
      {
        id: formId,
        name: nextName,
        projectName: nextProjectName,
        templateName: nextTemplateName,
        mapName: nextMapName,
        sequenceName: nextSequenceName,
        outputProfile: nextOutputProfile,
        presetName: nextPresetName,
        modeDefault: nextModeDefault,
        isActive: nextIsActive === true,
      },
      'render_form',
      String(formId)
    );
    sendJSON(res, 200, { ok: true, form: buildRenderFormPayload(refreshed) });
    return true;
  }

  if (req.method === 'DELETE') {
    if (!requireRenderTemplateManage(auth, res, sendJSON)) return true;
    if (!requireRenderTemplateManageForProject(
      auth,
      res,
      sendJSON,
      existingForm?.project_name || ''
    )) return true;
    stmts.deleteRenderFormFieldsByFormId.run(formId);
    const deleted = stmts.deleteRenderFormById.run(formId);
    if (Number(deleted?.changes || 0) <= 0) {
      sendJSON(res, 404, { ok: false, error: 'render_form_not_found' });
      return true;
    }
    audit(
      auth.session.user_id,
      'render_form_deleted',
      {
        id: formId,
        name: String(existingForm?.name || ''),
        projectName: String(existingForm?.project_name || ''),
        templateName: String(existingForm?.template_name || ''),
        mapName: String(existingForm?.map_name || ''),
        sequenceName: String(existingForm?.sequence_name || ''),
        outputProfile: String(existingForm?.output_profile || ''),
        presetName: String(existingForm?.preset_name || ''),
      },
      'render_form',
      String(formId)
    );
    sendJSON(res, 200, { ok: true });
    return true;
  }

  sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
  return true;
}

module.exports = {
  handlePostprodRenderFormsRoutes,
};
