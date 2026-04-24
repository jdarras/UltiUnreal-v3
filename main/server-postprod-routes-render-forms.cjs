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
  sanitizeRenderOutputProfile,
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
  mergeRenderFormFieldsTx,
  removeWrcFileFieldsTx,
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
      const outputProfile = sanitizeRenderOutputProfile(body?.outputProfile, '');
      const wrcFiles = Array.isArray(body?.wrcFiles) ? body.wrcFiles.map(String).filter(Boolean) : [];
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

      const allowedSequences = Array.isArray(body?.allowedSequences) ? body.allowedSequences : [];
      const allowedPresets = Array.isArray(body?.allowedPresets) ? body.allowedPresets : [];
      const allowedSequencesJson = JSON.stringify(allowedSequences.map(String).filter(Boolean));
      const allowedPresetsJson = JSON.stringify(allowedPresets.map(String).filter(Boolean));
      const noteText = String(body?.note || '').trim().slice(0, 2000);

      const now = nowIso();
      stmts.insertRenderForm.run(
        name,
        projectName,
        templateName,
        mapName,
        '',
        outputProfile,
        JSON.stringify(wrcFiles),
        modeDefault,
        isActive ? 1 : 0,
        normalizedLayout.json,
        allowedSequencesJson,
        allowedPresetsJson,
        noteText,
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
          outputProfile,
          wrcFiles,
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
      // wrcFile scopes the merge to a single WRC file (leave empty for unscoped)
      const wrcFile = String(body?.wrcFile ?? '').trim();
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
      mergeRenderFormFieldsTx(formId, normalizedFields.fields, wrcFile, now, stmts);
      stmts.updateRenderFormById.run(
        String(existingForm?.name || ''),
        String(existingForm?.project_name || ''),
        String(existingForm?.template_name || ''),
        String(existingForm?.map_name || ''),
        String(existingForm?.sequence_name || ''),
        String(existingForm?.output_profile || ''),
        String(existingForm?.wrc_files_json || '[]'),
        normalizeRenderFormModeDefault(existingForm?.mode_default, 'edit'),
        Number(existingForm?.is_active) === 1 ? 1 : 0,
        String(existingForm?.layout_json || '{}'),
        String(existingForm?.allowed_sequences_json || '[]'),
        String(existingForm?.allowed_presets_json || '[]'),
        String(existingForm?.note_text || ''),
        now,
        formId
      );
      audit(
        auth.session.user_id,
        'render_form_fields_replaced',
        {
          formId,
          wrcFile: wrcFile || null,
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

    // DELETE /fields?wrcFile=xxx — remove all fields for a WRC file
    if (req.method === 'DELETE') {
      if (!requireRenderTemplateManage(auth, res, sendJSON)) return true;
      if (!requireRenderTemplateManageForProject(
        auth,
        res,
        sendJSON,
        existingForm?.project_name || ''
      )) return true;
      const url = new URL(req.url, 'http://localhost');
      const wrcFile = String(url.searchParams.get('wrcFile') ?? '').trim();
      if (!wrcFile) {
        sendJSON(res, 400, { ok: false, error: 'missing_wrc_file' });
        return true;
      }
      removeWrcFileFieldsTx(formId, wrcFile, stmts);
      audit(
        auth.session.user_id,
        'render_form_wrc_fields_removed',
        { formId, wrcFile },
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
    const hasBodyOutputProfile = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'outputProfile')
      : false;
    const hasBodyWrcFiles = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'wrcFiles')
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
    const hasBodyAllowedSequences = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'allowedSequences')
      : false;
    const hasBodyAllowedPresets = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'allowedPresets')
      : false;
    const hasBodyNote = body && typeof body === 'object'
      ? Object.prototype.hasOwnProperty.call(body, 'note')
      : false;

    const currentName = sanitizeRenderFormName(existingForm?.name, '');
    const currentProjectName = sanitizeRenderProjectName(existingForm?.project_name);
    const currentTemplateName = sanitizeRenderTemplateName(existingForm?.template_name, '');
    const currentMapName = sanitizeRenderMapName(existingForm?.map_name, '');
    const currentOutputProfile = sanitizeRenderOutputProfile(existingForm?.output_profile, '');
    const currentWrcFiles = (() => {
      try { return JSON.parse(String(existingForm?.wrc_files_json || '[]')).filter(Boolean); }
      catch { return []; }
    })();
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
    const nextOutputProfile = sanitizeRenderOutputProfile(
      hasBodyOutputProfile ? body?.outputProfile : currentOutputProfile,
      currentOutputProfile
    );
    const nextWrcFiles = hasBodyWrcFiles
      ? (Array.isArray(body.wrcFiles) ? body.wrcFiles.map(String).filter(Boolean) : [])
      : currentWrcFiles;
    const normalizeWrcFileList = (input) => {
      const out = [];
      const seen = new Set();
      const list = Array.isArray(input) ? input : [];
      for (const rawValue of list) {
        const value = String(rawValue || '').trim();
        if (!value) continue;
        const key = value.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(value);
      }
      return out;
    };
    const normalizedCurrentWrcFiles = normalizeWrcFileList(currentWrcFiles);
    const normalizedNextWrcFiles = normalizeWrcFileList(nextWrcFiles);
    const removedWrcFiles = hasBodyWrcFiles
      ? normalizedCurrentWrcFiles.filter((value) => !normalizedNextWrcFiles.some((nextValue) => nextValue.toLowerCase() === value.toLowerCase()))
      : [];
    const nextModeDefault = normalizeRenderFormModeDefault(
      hasBodyMode ? (body?.modeDefault ?? body?.mode) : currentModeDefault,
      currentModeDefault
    );
    const nextIsActive = hasBodyActive ? parseBooleanFlag(body?.isActive, currentIsActive) : currentIsActive;
    const nextLayoutInput = hasBodyLayout
      ? (Object.prototype.hasOwnProperty.call(body || {}, 'layout') ? body?.layout : body?.layoutJson)
      : currentLayoutInput;
    const currentAllowedSequences = JSON.parse(String(existingForm?.allowed_sequences_json || '[]').trim() || '[]').filter?.(Boolean) || [];
    const currentAllowedPresets = JSON.parse(String(existingForm?.allowed_presets_json || '[]').trim() || '[]').filter?.(Boolean) || [];
    const nextAllowedSequences = hasBodyAllowedSequences
      ? (Array.isArray(body.allowedSequences) ? body.allowedSequences.map(String).filter(Boolean) : [])
      : currentAllowedSequences;
    const nextAllowedPresets = hasBodyAllowedPresets
      ? (Array.isArray(body.allowedPresets) ? body.allowedPresets.map(String).filter(Boolean) : [])
      : currentAllowedPresets;
    const nextNoteText = hasBodyNote
      ? String(body.note || '').trim().slice(0, 2000)
      : String(existingForm?.note_text || '').trim();

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
    if (removedWrcFiles.length > 0) {
      for (const removedWrcFile of removedWrcFiles) {
        removeWrcFileFieldsTx(formId, removedWrcFile, stmts);
      }
    }
    const updated = stmts.updateRenderFormById.run(
      nextName,
      nextProjectName,
      nextTemplateName,
      nextMapName,
      String(existingForm?.sequence_name || ''),
      nextOutputProfile,
      JSON.stringify(normalizedNextWrcFiles),
      nextModeDefault,
      nextIsActive ? 1 : 0,
      normalizedLayout.json,
      JSON.stringify(nextAllowedSequences),
      JSON.stringify(nextAllowedPresets),
      nextNoteText,
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
        outputProfile: nextOutputProfile,
        wrcFiles: normalizedNextWrcFiles,
        removedWrcFiles,
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
        outputProfile: String(existingForm?.output_profile || ''),
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
