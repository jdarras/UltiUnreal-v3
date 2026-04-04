async function handlePostprodRendersRoutes({
  req,
  res,
  pathname = '',
  url,
  parseBody,
  sendJSON,
  requireSession,
  rolePermissions,
  rolesCache,
  parseBooleanFlag,
  importDetectedRenderOutputs,
  resolveRenderDetectedRoots,
  stmts,
  buildRenderJobPayload,
  shouldExposeDetectedRender,
  sanitizeRenderTemplateName,
  sanitizeRenderProjectName,
  ensureProjectCanAutoRender,
  sharedStore,
  normalizeRenderPayload,
  requireRenderLaunchForProject,
  nowIso,
  sanitizeRenderComment,
  audit,
}) {
  if (pathname === '/agent/postprod/renders' || pathname === '/agent/postprod/render-jobs') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const actorPerms = rolePermissions(auth.session.role, rolesCache);

    if (req.method === 'GET') {
      const scanRequested = parseBooleanFlag(url?.searchParams?.get('scan'), false);
      const detectedScan = importDetectedRenderOutputs({
        actorUserId: auth.session.user_id,
        force: scanRequested,
      });
      const currentDetectedRoots = resolveRenderDetectedRoots();
      const renders = stmts.listRenderJobs.all()
        .map(buildRenderJobPayload)
        .filter((render) => {
          if (String(render?.origin || '').trim().toLowerCase() !== 'detected') return true;
          const payload = render?.payload && typeof render.payload === 'object' && !Array.isArray(render.payload)
            ? render.payload
            : {};
          return shouldExposeDetectedRender(payload, currentDetectedRoots);
        });
      sendJSON(res, 200, {
        ok: true,
        renders,
        renderJobs: renders,
        detectedScan,
      });
      return true;
    }

    if (req.method === 'POST') {
      if (actorPerms.canLaunchRenders !== true) {
        sendJSON(res, 403, { ok: false, error: 'forbidden' });
        return true;
      }

      const body = await parseBody(req);
      const templateName = sanitizeRenderTemplateName(body?.templateName, '');
      const projectName = sanitizeRenderProjectName(body?.projectName);
      const projectEligibility = ensureProjectCanAutoRender(sharedStore, projectName, stmts);
      const requiresValidation = body?.requiresValidation === true;
      const normalizedPayload = normalizeRenderPayload(body?.payload);
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
      if (!requireRenderLaunchForProject(
        auth,
        res,
        sendJSON,
        projectEligibility?.project?.id || projectName
      )) return true;
      if (!normalizedPayload.ok) {
        sendJSON(res, 400, { ok: false, error: normalizedPayload.error || 'invalid_render_payload' });
        return true;
      }

      const now = nowIso();
      const initialStatus = 'Queued';
      const initialReviewStatus = 'to_validate';
      const result = stmts.insertRenderJob.run(
        projectName,
        templateName,
        normalizedPayload.payloadJson,
        initialStatus,
        initialReviewStatus,
        Number(auth.session.user_id),
        null,
        requiresValidation ? 1 : 0,
        '',
        '',
        null,
        null,
        now,
        now
      );
      const renderId = Number(result?.lastInsertRowid || 0);
      const comment = sanitizeRenderComment(body?.comment);
      stmts.insertRenderJobEvent.run(
        renderId,
        'Created',
        initialStatus,
        Number(auth.session.user_id),
        comment,
        now
      );
      const created = stmts.findRenderJobById.get(renderId);
      audit(
        auth.session.user_id,
        'render_created',
        {
          renderId,
          projectName,
          projectUsageMode: String(projectEligibility.usageMode || ''),
          templateName,
          status: initialStatus,
          requiresValidation,
        },
        'render',
        String(renderId)
      );
      const renderPayload = buildRenderJobPayload(created);
      sendJSON(res, 201, { ok: true, render: renderPayload, renderJob: renderPayload });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  if (pathname === '/agent/postprod/renders/detected/scan') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const actorPerms = rolePermissions(auth.session.role, rolesCache);
    if (actorPerms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_dispatch' });
      return true;
    }
    const body = await parseBody(req);
    const summary = importDetectedRenderOutputs({
      actorUserId: auth.session.user_id,
      force: parseBooleanFlag(body?.force, true),
    });
    sendJSON(res, 200, { ok: true, detectedScan: summary });
    return true;
  }

  const renderByIdMatch = /^\/agent\/postprod\/(?:renders|render-jobs)\/(\d+)$/.exec(pathname);
  if (renderByIdMatch) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const renderId = Number(renderByIdMatch[1] || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_render_id' });
      return true;
    }
    const render = stmts.findRenderJobById.get(renderId);
    if (!render) {
      sendJSON(res, 404, { ok: false, error: 'render_not_found' });
      return true;
    }
    const payload = buildRenderJobPayload(render);
    sendJSON(res, 200, { ok: true, render: payload, renderJob: payload });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodRendersRoutes,
};
