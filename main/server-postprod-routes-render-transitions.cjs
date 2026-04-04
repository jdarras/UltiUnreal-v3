async function handlePostprodRenderTransitionRoutes({
  req,
  res,
  pathname = '',
  parseBody,
  sendJSON,
  requireSession,
  rolePermissions,
  rolesCache,
  requireRenderLaunchForProject,
  normalizeRenderStatus,
  sanitizeRenderWorkerKey,
  nowIso,
  sanitizeRenderOutputPath,
  sanitizeRenderErrorMessage,
  inferRenderReviewStatus,
  sanitizeRenderComment,
  db,
  stmts,
  audit,
  buildRenderJobPayload,
  computeRenderTransitionState,
  resolveRoleInput,
  DEFAULT_FALLBACK_ROLE,
  SYSTEM_MAINTENANCE_ROLE,
  canRenderValidate,
  buildRenderJobEventPayload,
}) {
  const renderWorkerCompleteMatch = /^\/agent\/postprod\/renders\/(\d+)\/worker-complete$/.exec(pathname);
  if (renderWorkerCompleteMatch) {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const actorPerms = rolePermissions(auth.session.role, rolesCache);
    if (actorPerms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden' });
      return true;
    }
    const renderId = Number(renderWorkerCompleteMatch[1] || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_render_id' });
      return true;
    }
    const currentRender = stmts.findRenderJobById.get(renderId);
    if (!currentRender) {
      sendJSON(res, 404, { ok: false, error: 'render_not_found' });
      return true;
    }
    if (!requireRenderLaunchForProject(
      auth,
      res,
      sendJSON,
      currentRender?.project_name || '',
      { forbiddenError: 'forbidden_project_render_worker_complete' }
    )) return true;
    if (normalizeRenderStatus(currentRender?.status, '') !== 'Running') {
      sendJSON(res, 409, { ok: false, error: 'render_not_running' });
      return true;
    }
    const body = await parseBody(req);
    const workerKey = sanitizeRenderWorkerKey(body?.workerKey);
    const assignedWorkerKey = sanitizeRenderWorkerKey(currentRender?.assigned_worker_key);
    if (!workerKey || !assignedWorkerKey || workerKey !== assignedWorkerKey) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_worker_assignment' });
      return true;
    }

    const now = nowIso();
    const isSuccess = body?.success !== false;
    const attemptCount = Number.isFinite(Number(currentRender?.attempt_count))
      ? Math.max(0, Math.trunc(Number(currentRender.attempt_count)))
      : 0;
    const maxAttempts = Number.isFinite(Number(currentRender?.max_attempts))
      ? Math.max(1, Math.trunc(Number(currentRender.max_attempts)))
      : 3;
    const canRetry = !isSuccess && attemptCount < maxAttempts;
    const toStatus = isSuccess ? 'Done' : (canRetry ? 'Queued' : 'Failed');
    const outputPath = isSuccess
      ? sanitizeRenderOutputPath(body?.outputPath || currentRender?.output_path)
      : '';
    const workerErrorMessage = sanitizeRenderErrorMessage(
      body?.errorMessage || currentRender?.error_message || 'worker_failed'
    );
    const errorMessage = isSuccess
      ? ''
      : workerErrorMessage;
    const finishedAt = toStatus === 'Running' ? null : now;
    const validatedByUserId = currentRender?.validated_by_user_id == null
      ? null
      : Number(currentRender.validated_by_user_id);
    const reviewStatus = inferRenderReviewStatus(toStatus, validatedByUserId);
    const eventComment = sanitizeRenderComment(
      body?.comment || (isSuccess ? 'worker_completed' : (canRetry ? 'worker_failed_retry' : 'worker_failed_final'))
    );

    const tx = db.transaction(() => {
      stmts.updateRenderJobTransition.run(
        toStatus,
        reviewStatus,
        Number.isFinite(validatedByUserId) && validatedByUserId > 0 ? validatedByUserId : null,
        outputPath,
        errorMessage,
        currentRender?.started_at || now,
        finishedAt,
        now,
        renderId
      );
      stmts.insertRenderJobEvent.run(
        renderId,
        'Running',
        toStatus,
        Number(auth.session.user_id),
        eventComment,
        now
      );
      stmts.clearRenderWorkerCurrentJobByRenderId.run(now, renderId);
      if (toStatus === 'Queued') {
        stmts.clearRenderJobWorkerAssignment.run(now, renderId);
      }
    });
    tx();

    const updated = stmts.findRenderJobById.get(renderId);
    audit(
      auth.session.user_id,
      'render_worker_complete',
      {
        renderId,
        workerKey,
        success: isSuccess,
        toStatus,
        attemptCount,
        maxAttempts,
      },
      'render',
      String(renderId)
    );
    sendJSON(res, 200, { ok: true, render: buildRenderJobPayload(updated) });
    return true;
  }

  const renderTransitionMatch = /^\/agent\/postprod\/renders\/(\d+)\/transition$/.exec(pathname);
  if (renderTransitionMatch) {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const renderId = Number(renderTransitionMatch[1] || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_render_id' });
      return true;
    }
    const currentRender = stmts.findRenderJobById.get(renderId);
    if (!currentRender) {
      sendJSON(res, 404, { ok: false, error: 'render_not_found' });
      return true;
    }
    const projectGuard = requireRenderLaunchForProject(
      auth,
      res,
      sendJSON,
      currentRender?.project_name || '',
      { forbiddenError: 'forbidden_project_render_transition' }
    );
    if (!projectGuard) return true;
    const body = await parseBody(req);
    const actorPerms = rolePermissions(auth.session.role, rolesCache);
    const actorRole =
      resolveRoleInput(auth?.session?.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
    const now = nowIso();
    const next = computeRenderTransitionState(
      currentRender,
      body?.toStatus,
      body,
      now,
      actorPerms,
      auth.session.user_id,
      auth.session.role
    );
    if (!next.ok) {
      const statusCode =
        (next.error === 'forbidden_render_transition' || next.error === 'forbidden_render_review_role')
          ? 403
          : 400;
      sendJSON(res, statusCode, { ok: false, error: next.error });
      return true;
    }
    if (
      actorRole !== SYSTEM_MAINTENANCE_ROLE &&
      !canRenderValidate(actorRole) &&
      (next.toStatus === 'Done' || next.toStatus === 'Failed')
    ) {
      const canValidateProject = projectGuard?.projectPermissions?.canValidate === true;
      if (!canValidateProject) {
        sendJSON(res, 403, { ok: false, error: 'forbidden_project_render_transition' });
        return true;
      }
    }

    const tx = db.transaction(() => {
      const eventComment = sanitizeRenderComment(body?.comment || next.commentDefault || '');
      stmts.updateRenderJobTransition.run(
        next.toStatus,
        next.reviewStatus,
        next.validatedByUserId,
        next.outputPath,
        next.errorMessage,
        next.startedAt,
        next.finishedAt,
        now,
        renderId
      );
      stmts.insertRenderJobEvent.run(
        renderId,
        next.fromStatus,
        next.toStatus,
        Number(auth.session.user_id),
        eventComment,
        now
      );
      if (next.toStatus !== 'Running') {
        stmts.clearRenderWorkerCurrentJobByRenderId.run(now, renderId);
      }
      if (next.toStatus === 'Queued') {
        stmts.clearRenderJobWorkerAssignment.run(now, renderId);
      }
    });
    tx();

    const updated = stmts.findRenderJobById.get(renderId);
    audit(
      auth.session.user_id,
      'render_transition',
      {
        renderId,
        fromStatus: next.fromStatus,
        toStatus: next.toStatus,
      },
      'render',
      String(renderId)
    );
    sendJSON(res, 200, { ok: true, render: buildRenderJobPayload(updated) });
    return true;
  }

  const renderTransitionsMatch = /^\/agent\/postprod\/renders\/(\d+)\/transitions$/.exec(pathname);
  if (renderTransitionsMatch) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const renderId = Number(renderTransitionsMatch[1] || 0);
    if (!Number.isFinite(renderId) || renderId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_render_id' });
      return true;
    }
    const currentRender = stmts.findRenderJobById.get(renderId);
    if (!currentRender) {
      sendJSON(res, 404, { ok: false, error: 'render_not_found' });
      return true;
    }
    const transitions = stmts.listRenderJobEventsByJobId
      .all(renderId)
      .map(buildRenderJobEventPayload);
    sendJSON(res, 200, { ok: true, transitions });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodRenderTransitionRoutes,
};
