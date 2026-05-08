const path = require('path');
const {
  generateProxy,
  generateThumbnail,
  resolveFfmpegPath,
} = require('./server-postprod-ffmpeg.cjs');
const {
  applyRenderExport,
  resolveExportDestinationEntriesFromCommon,
} = require('./server-postprod-export-destinations.cjs');

const PROXY_RESOLUTION_ALLOWED = new Set([25, 50, 75]);
const PROXY_CRF_ALLOWED = new Set([18, 23, 28]);

function parsePayloadJsonSafe(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  const raw = String(value || '').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function toPositiveInt(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

function encodeAlertMeta(meta = null) {
  const source = meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
  try {
    return JSON.stringify(source);
  } catch {
    return '{}';
  }
}

function resolveAlertTargetUserIds({ renderPayload = null, taskRow = null } = {}) {
  const out = new Set();
  const payload = renderPayload && typeof renderPayload === 'object' ? renderPayload : {};
  const requesterId = toPositiveInt(payload?.requestedByUserId);
  const assigneeId = toPositiveInt(taskRow?.assignee_user_id);
  if (requesterId > 0) out.add(requesterId);
  if (assigneeId > 0) out.add(assigneeId);
  return Array.from(out.values());
}

function upsertOpenUserAlert({
  stmts = null,
  userId = 0,
  alertType = '',
  taskId = 0,
  renderId = 0,
  createdByUserId = 0,
  message = '',
  meta = null,
  now = '',
} = {}) {
  const normalizedUserId = toPositiveInt(userId);
  const normalizedTaskId = toPositiveInt(taskId);
  const normalizedRenderId = toPositiveInt(renderId);
  const normalizedByUserId = toPositiveInt(createdByUserId);
  const normalizedAlertType = String(alertType || '').trim().toLowerCase();
  if (
    normalizedUserId <= 0
    || !['to_modify', 'render_error'].includes(normalizedAlertType)
    || typeof stmts?.insertOpenUserAlert?.run !== 'function'
  ) {
    return 0;
  }
  const safeMessage = String(message || '').trim().slice(0, 500);
  const metaJson = encodeAlertMeta(meta);
  try {
    const inserted = stmts.insertOpenUserAlert.run(
      normalizedUserId,
      normalizedAlertType,
      normalizedTaskId,
      normalizedRenderId,
      normalizedByUserId,
      safeMessage,
      metaJson,
      now,
      now
    );
    const changes = Number(inserted?.changes || 0);
    if (
      changes <= 0
      && typeof stmts?.touchOpenUserAlertByScope?.run === 'function'
    ) {
      stmts.touchOpenUserAlertByScope.run(
        normalizedByUserId,
        safeMessage,
        metaJson,
        now,
        normalizedUserId,
        normalizedAlertType,
        normalizedTaskId,
        normalizedRenderId
      );
    }
    return changes;
  } catch {
    return 0;
  }
}

function normalizeProxyResolution(value) {
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) ? Math.trunc(parsed) : 50;
  return PROXY_RESOLUTION_ALLOWED.has(normalized) ? normalized : 50;
}

function normalizeProxyCrf(value) {
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) ? Math.trunc(parsed) : 23;
  return PROXY_CRF_ALLOWED.has(normalized) ? normalized : 23;
}

function logLineSafe(logLine, payload) {
  if (typeof logLine !== 'function') return;
  try { logLine(payload); } catch {}
}

function scheduleProxyGenerationForDoneRender({
  renderId,
  stmts,
  readCommonServerConfigFile,
  commonServerFile,
  nowIso,
  logLine,
}) {
  setImmediate(async () => {
    try {
      if (!stmts?.findRenderJobById || !stmts?.updateRenderJobPayload || typeof nowIso !== 'function') return;
      if (!resolveFfmpegPath()) {
        logLineSafe(logLine, {
          level: 'warn',
          src: 'ffmpeg',
          action: 'proxy_generation_skipped',
          message: 'ffmpeg_not_found',
          data: { renderId },
        });
        return;
      }

      const job = stmts.findRenderJobById.get(renderId);
      if (!job?.output_path) return;

      const common = typeof readCommonServerConfigFile === 'function'
        ? (readCommonServerConfigFile(commonServerFile) || {})
        : {};
      const proxyEnabled = (common?.proxyEnabled === true) || (common?.proxy_enabled === true);
      if (!proxyEnabled) return;

      const resolutionPercent = normalizeProxyResolution(
        common?.proxyResolution ?? common?.proxy_resolution ?? 50
      );
      const qualityCrf = normalizeProxyCrf(
        common?.proxyCrf ?? common?.proxy_crf ?? 23
      );
      const outputPath = String(job.output_path || '').trim();
      if (!outputPath) return;
      const jobDir = path.dirname(outputPath);

      const thumbResult = await generateThumbnail({
        outputPath,
        destDir: jobDir,
        resolutionPercent,
        logLine,
      });
      const proxyResult = await generateProxy({
        outputPath,
        destDir: jobDir,
        resolutionPercent,
        qualityCrf,
        logLine,
      });

      if (!proxyResult?.ok) {
        logLineSafe(logLine, {
          level: 'warn',
          src: 'ffmpeg',
          action: 'proxy_generation_failed',
          message: String(proxyResult?.error || 'proxy_generation_failed'),
          data: { renderId, outputPath },
        });
        return;
      }

      const latestJob = stmts.findRenderJobById.get(renderId);
      const existingPayload = parsePayloadJsonSafe(latestJob?.payload_json || '{}');
      const updatedPayload = {
        ...existingPayload,
        proxyPath: String(proxyResult?.proxyPath || '').trim() || null,
        alphaPath: String(proxyResult?.alphaPath || '').trim() || null,
        thumbPath: thumbResult?.ok
          ? (String(thumbResult?.thumbPath || '').trim() || null)
          : null,
        proxyWidth: Number.isFinite(Number(proxyResult?.width)) ? Math.trunc(Number(proxyResult.width)) : 0,
        proxyHeight: Number.isFinite(Number(proxyResult?.height)) ? Math.trunc(Number(proxyResult.height)) : 0,
        proxyTotalFrames: Number.isFinite(Number(proxyResult?.totalFrames))
          ? Math.trunc(Number(proxyResult.totalFrames))
          : 0,
        proxyFrameRate: Number.isFinite(Number(proxyResult?.frameRate))
          ? Number(proxyResult.frameRate)
          : 0,
      };
      stmts.updateRenderJobPayload.run(
        JSON.stringify(updatedPayload),
        nowIso(),
        renderId
      );

      logLineSafe(logLine, {
        level: 'info',
        src: 'ffmpeg',
        action: 'proxy_generation_done',
        message: 'proxy_generated',
        data: {
          renderId,
          proxyPath: updatedPayload.proxyPath,
          thumbPath: updatedPayload.thumbPath,
        },
      });
    } catch (err) {
      logLineSafe(logLine, {
        level: 'error',
        src: 'ffmpeg',
        action: 'proxy_generation_failed',
        message: String(err?.message || err),
        data: { renderId },
      });
    }
  });
}

function scheduleRenderExportForValidatedRender({
  renderId,
  renderRow,
  readCommonServerConfigFile,
  commonServerFile,
  logLine,
}) {
  setImmediate(() => {
    try {
      const common = typeof readCommonServerConfigFile === 'function'
        ? (readCommonServerConfigFile(commonServerFile) || {})
        : {};
      const destinationEntries = resolveExportDestinationEntriesFromCommon(common);
      if (!destinationEntries.length) return;

      const payload = parsePayloadJsonSafe(renderRow?.payload_json);
      const destinationIds = Array.isArray(payload?.exportDestinationIds)
        ? payload.exportDestinationIds
        : [];
      if (!destinationIds.length) return;

      const result = applyRenderExport({
        renderRow,
        payload,
        destinationEntries,
        destinationIds,
        logLine,
      });
      logLineSafe(logLine, {
        level: result.ok ? 'info' : 'warn',
        src: 'postprod',
        action: 'render_export',
        message: result.ok ? 'render_export_done' : 'render_export_partial',
        data: {
          renderId,
          exportedCount: result.exportedCount,
          selectedCount: result.selectedCount,
          errors: result.errors,
        },
      });
    } catch (err) {
      logLineSafe(logLine, {
        level: 'error',
        src: 'postprod',
        action: 'render_export_failed',
        message: String(err?.message || err),
        data: { renderId },
      });
    }
  });
}

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
  buildRenderJobEventPayload,
  readCommonServerConfigFile,
  commonServerFile,
  logLine,
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
      body?.comment || (
        isSuccess
          ? 'Rendu Unreal termine'
          : (canRetry ? 'Rendu Unreal en erreur - nouvelle tentative' : 'Rendu Unreal en erreur - echec final')
      )
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
    const updatedPayload = buildRenderJobPayload(updated);
    audit(
      auth.session.user_id,
      'render_worker_complete',
      {
        renderId,
        taskId: Number(updatedPayload?.linkedTaskId || 0) || null,
        taskTitle: String(updatedPayload?.linkedTaskTitle || ''),
        workerKey,
        success: isSuccess,
        toStatus,
        attemptCount,
        maxAttempts,
      },
      'render',
      String(renderId)
    );
    if (toStatus === 'Failed') {
      const linkedTaskId = toPositiveInt(updatedPayload?.linkedTaskId || updatedPayload?.payload?.taskId);
      const linkedTask = linkedTaskId > 0 && typeof stmts?.findTaskById?.get === 'function'
        ? (stmts.findTaskById.get(linkedTaskId) || null)
        : null;
      const targetUserIds = resolveAlertTargetUserIds({
        renderPayload: updatedPayload,
        taskRow: linkedTask,
      });
      const renderLabel = String(updatedPayload?.templateName || updatedPayload?.linkedTaskTitle || '').trim();
      const actorUserId = toPositiveInt(auth?.session?.user_id);
      for (const targetUserId of targetUserIds) {
        upsertOpenUserAlert({
          stmts,
          userId: targetUserId,
          alertType: 'render_error',
          taskId: linkedTaskId,
          renderId,
          createdByUserId: actorUserId,
          message: renderLabel
            ? `Rendu en erreur: ${renderLabel}`
            : `Rendu en erreur (#${String(renderId)})`,
          meta: {
            renderId,
            taskId: linkedTaskId > 0 ? linkedTaskId : null,
            taskTitle: String(updatedPayload?.linkedTaskTitle || '').trim(),
            errorMessage: String(updatedPayload?.errorMessage || '').trim(),
            source: 'worker_complete',
          },
          now,
        });
      }
    } else if (typeof stmts?.resolveOpenUserAlertsByRenderIdAndType?.run === 'function') {
      stmts.resolveOpenUserAlertsByRenderIdAndType.run(now, now, renderId, 'render_error');
    }
    if (toStatus !== 'Queued' && typeof stmts?.resolveOpenUserAlertsByRenderIdAndType?.run === 'function') {
      stmts.resolveOpenUserAlertsByRenderIdAndType.run(now, now, renderId, 'new_assignment');
    }
    if (toStatus === 'Done') {
      scheduleProxyGenerationForDoneRender({
        renderId,
        stmts,
        readCommonServerConfigFile,
        commonServerFile,
        nowIso,
        logLine,
      });
    }
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
      actorPerms.canValidate !== true
      && (next.toStatus === 'Done' || next.toStatus === 'Failed')
    ) {
      const canValidateProject = projectGuard?.projectPermissions?.canValidate === true;
      if (!canValidateProject) {
        sendJSON(res, 403, { ok: false, error: 'forbidden_project_render_transition' });
        return true;
      }
    }
    const transitionAction = String(body?.action || '').trim().toLowerCase();
    const rejectionReason = transitionAction === 'reject'
      ? String(body?.rejectionReason || '').trim()
      : '';
    const eventCommentInput = (() => {
      const explicitComment = String(body?.comment || '').trim();
      if (explicitComment) return explicitComment;
      if (transitionAction === 'reject') {
        const rejectionBaseLabel = String(next.commentDefault || 'Rendu rejete').trim();
        return rejectionReason
          ? `${rejectionBaseLabel}: ${rejectionReason}`
          : rejectionBaseLabel;
      }
      const fromStatus = String(next.fromStatus || '').trim();
      const toStatus = String(next.toStatus || '').trim();
      const fallbackTransitionLabel = fromStatus || toStatus
        ? `Transition ${fromStatus || '-'} -> ${toStatus || '-'}`
        : '';
      return String(next.commentDefault || fallbackTransitionLabel || '');
    })();
    const eventComment = sanitizeRenderComment(eventCommentInput);

    let nextPayloadJson = '';
    if (transitionAction === 'reject') {
      const currentPayload = parsePayloadJsonSafe(currentRender?.payload_json);
      const historyRaw = Array.isArray(currentPayload?.rejectionHistory)
        ? currentPayload.rejectionHistory
        : [];
      const history = historyRaw.filter((entry) => entry && typeof entry === 'object').slice(-24);
      const actorIdRaw = Number(auth.session.user_id || 0);
      const actorId = Number.isFinite(actorIdRaw) && actorIdRaw > 0 ? Math.trunc(actorIdRaw) : null;
      const rejectionEntry = {
        reason: rejectionReason,
        byUserId: actorId,
        byUsername: String(auth?.session?.username || '').trim(),
        at: now,
      };
      try {
        nextPayloadJson = JSON.stringify({
          ...currentPayload,
          rejection: rejectionEntry,
          rejectionHistory: [...history, rejectionEntry],
        });
      } catch {
        nextPayloadJson = '';
      }
    }

    const tx = db.transaction(() => {
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
      if (nextPayloadJson && typeof stmts.updateRenderJobPayload?.run === 'function') {
        stmts.updateRenderJobPayload.run(nextPayloadJson, now, renderId);
      }
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
    const updatedPayload = buildRenderJobPayload(updated);
    audit(
      auth.session.user_id,
      'render_transition',
      {
        renderId,
        taskId: Number(updatedPayload?.linkedTaskId || 0) || null,
        taskTitle: String(updatedPayload?.linkedTaskTitle || ''),
        fromStatus: next.fromStatus,
        toStatus: next.toStatus,
        reviewStatus: next.reviewStatus,
        action: transitionAction || null,
        rejectionReason: rejectionReason || null,
      },
      'render',
      String(renderId)
    );
    const linkedTaskId = toPositiveInt(updatedPayload?.linkedTaskId || updatedPayload?.payload?.taskId);
    const linkedTask = linkedTaskId > 0 && typeof stmts?.findTaskById?.get === 'function'
      ? (stmts.findTaskById.get(linkedTaskId) || null)
      : null;
    const targetUserIds = resolveAlertTargetUserIds({
      renderPayload: updatedPayload,
      taskRow: linkedTask,
    });
    const actorUserId = toPositiveInt(auth?.session?.user_id);
    const renderLabel = String(updatedPayload?.templateName || updatedPayload?.linkedTaskTitle || '').trim();
    if (transitionAction === 'reject' || next.reviewStatus === 'to_modify') {
      for (const targetUserId of targetUserIds) {
        upsertOpenUserAlert({
          stmts,
          userId: targetUserId,
          alertType: 'to_modify',
          taskId: linkedTaskId,
          renderId,
          createdByUserId: actorUserId,
          message: renderLabel
            ? `Rendu a modifier: ${renderLabel}`
            : `Rendu a modifier (#${String(renderId)})`,
          meta: {
            renderId,
            taskId: linkedTaskId > 0 ? linkedTaskId : null,
            taskTitle: String(updatedPayload?.linkedTaskTitle || '').trim(),
            rejectionReason: rejectionReason || '',
            source: transitionAction || 'transition',
          },
          now,
        });
      }
    } else if (typeof stmts?.resolveOpenUserAlertsByRenderIdAndType?.run === 'function') {
      stmts.resolveOpenUserAlertsByRenderIdAndType.run(now, now, renderId, 'to_modify');
    }
    if (next.toStatus === 'Failed') {
      for (const targetUserId of targetUserIds) {
        upsertOpenUserAlert({
          stmts,
          userId: targetUserId,
          alertType: 'render_error',
          taskId: linkedTaskId,
          renderId,
          createdByUserId: actorUserId,
          message: renderLabel
            ? `Rendu en erreur: ${renderLabel}`
            : `Rendu en erreur (#${String(renderId)})`,
          meta: {
            renderId,
            taskId: linkedTaskId > 0 ? linkedTaskId : null,
            taskTitle: String(updatedPayload?.linkedTaskTitle || '').trim(),
            errorMessage: String(updatedPayload?.errorMessage || '').trim(),
            source: transitionAction || 'transition',
          },
          now,
        });
      }
    } else if (typeof stmts?.resolveOpenUserAlertsByRenderIdAndType?.run === 'function') {
      stmts.resolveOpenUserAlertsByRenderIdAndType.run(now, now, renderId, 'render_error');
    }
    if (typeof stmts?.resolveOpenUserAlertsByRenderIdAndType?.run === 'function' && next.toStatus !== 'Queued') {
      stmts.resolveOpenUserAlertsByRenderIdAndType.run(now, now, renderId, 'new_assignment');
    }
    if (
      actorUserId > 0
      && linkedTaskId > 0
      && typeof stmts?.resolveOpenUserAlertsByUserTaskIdAndType?.run === 'function'
      && transitionAction !== 'reject'
    ) {
      stmts.resolveOpenUserAlertsByUserTaskIdAndType.run(
        now,
        now,
        actorUserId,
        linkedTaskId,
        'new_assignment'
      );
    }
    if (next.toStatus === 'Done') {
      scheduleProxyGenerationForDoneRender({
        renderId,
        stmts,
        readCommonServerConfigFile,
        commonServerFile,
        nowIso,
        logLine,
      });
    }
    if (next.reviewStatus === 'validated') {
      scheduleRenderExportForValidatedRender({
        renderId,
        renderRow: updated,
        readCommonServerConfigFile,
        commonServerFile,
        logLine,
      });
    }
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
