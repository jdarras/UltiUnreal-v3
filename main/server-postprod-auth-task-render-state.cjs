'use strict';

function createTaskRenderStateHelpers(options = {}) {
  const {
    stmts,
    db,
    nowIso,
    parseIsoDateOrNull,
    normalizeTaskRefsInput,
    sanitizeTaskRefForStorage,
    buildTaskPayload,
    normalizeTaskStatus,
    TASK_STATUSES = [],
    normalizeRenderStatus,
    RENDER_STATUSES = [],
    canRenderValidate,
    sanitizeRenderOutputPath,
    sanitizeRenderErrorMessage,
    inferRenderReviewStatus,
  } = options;

  function listTaskProjectRefsFromRelations(taskId, fallbackRefs = []) {
    if (!Number.isFinite(Number(taskId)) || Number(taskId) <= 0) {
      return normalizeTaskRefsInput(fallbackRefs);
    }
    if (!stmts || typeof stmts.listTaskProjectRefsByTaskId?.all !== 'function') {
      return normalizeTaskRefsInput(fallbackRefs);
    }
    let rows = [];
    try {
      rows = stmts.listTaskProjectRefsByTaskId.all(Number(taskId));
    } catch {
      rows = [];
    }
    const refs = (Array.isArray(rows) ? rows : [])
      .map((row) => sanitizeTaskRefForStorage(row?.project_ref))
      .filter(Boolean);
    if (refs.length > 0) return normalizeTaskRefsInput(refs);
    return normalizeTaskRefsInput(fallbackRefs);
  }

  function listTaskResourceRefsFromRelations(taskId, fallbackRefs = []) {
    if (!Number.isFinite(Number(taskId)) || Number(taskId) <= 0) {
      return normalizeTaskRefsInput(fallbackRefs);
    }
    if (!stmts || typeof stmts.listTaskResourceRefsByTaskId?.all !== 'function') {
      return normalizeTaskRefsInput(fallbackRefs);
    }
    let rows = [];
    try {
      rows = stmts.listTaskResourceRefsByTaskId.all(Number(taskId));
    } catch {
      rows = [];
    }
    const refs = (Array.isArray(rows) ? rows : [])
      .map((row) => sanitizeTaskRefForStorage(row?.resource_ref))
      .filter(Boolean);
    if (refs.length > 0) return normalizeTaskRefsInput(refs);
    return normalizeTaskRefsInput(fallbackRefs);
  }

  function replaceTaskRefsRelations(taskId, projectRefs = [], resourceRefs = [], createdAt = nowIso()) {
    const safeTaskId = Number(taskId);
    if (!Number.isFinite(safeTaskId) || safeTaskId <= 0) return;
    if (!stmts
      || typeof stmts.deleteTaskProjectRefsByTaskId?.run !== 'function'
      || typeof stmts.deleteTaskResourceRefsByTaskId?.run !== 'function'
      || typeof stmts.insertTaskProjectRef?.run !== 'function'
      || typeof stmts.insertTaskResourceRef?.run !== 'function') {
      return;
    }
    const normalizedProjectRefs = normalizeTaskRefsInput(projectRefs);
    const normalizedResourceRefs = normalizeTaskRefsInput(resourceRefs);
    const safeCreatedAt = parseIsoDateOrNull(createdAt) || nowIso();
    const tx = db.transaction(() => {
      stmts.deleteTaskProjectRefsByTaskId.run(safeTaskId);
      stmts.deleteTaskResourceRefsByTaskId.run(safeTaskId);
      for (const projectRef of normalizedProjectRefs) {
        const safeRef = sanitizeTaskRefForStorage(projectRef);
        if (!safeRef) continue;
        stmts.insertTaskProjectRef.run(safeTaskId, safeRef, safeCreatedAt);
        if (typeof stmts.upsertProjectById?.run === 'function') {
          stmts.upsertProjectById.run(
            safeRef,
            '',
            safeRef,
            '',
            'other',
            null,
            safeCreatedAt,
            nowIso()
          );
        }
      }
      for (const resourceRef of normalizedResourceRefs) {
        const safeRef = sanitizeTaskRefForStorage(resourceRef);
        if (!safeRef) continue;
        stmts.insertTaskResourceRef.run(safeTaskId, safeRef, safeCreatedAt);
      }
    });
    tx();
  }

  function buildTaskPayloadWithRelations(row) {
    const payload = buildTaskPayload(row);
    const taskId = Number(payload?.id || 0);
    payload.projectRefs = listTaskProjectRefsFromRelations(taskId, payload.projectRefs);
    payload.resourceRefs = listTaskResourceRefsFromRelations(taskId, payload.resourceRefs);
    return payload;
  }

  function computeTaskTransitionState(taskRow, toStatusRaw, now, actorPermissions) {
    const toStatus = normalizeTaskStatus(toStatusRaw, '');
    if (!TASK_STATUSES.includes(toStatus)) {
      return { ok: false, error: 'invalid_status' };
    }
    const fromStatus = normalizeTaskStatus(taskRow?.status, 'A faire');
    if (fromStatus === toStatus) {
      return { ok: false, error: 'no_changes' };
    }
    if ((toStatus === 'Validee' || toStatus === 'Rejetee') && actorPermissions?.canValidate !== true) {
      return { ok: false, error: 'forbidden_validation' };
    }
    if (toStatus === 'En cours') {
      const assigneeUserId = Number(taskRow?.assignee_user_id || 0);
      if (!Number.isFinite(assigneeUserId) || assigneeUserId <= 0) {
        return { ok: false, error: 'assignee_required_for_in_progress' };
      }
    }

    const nextSubmittedAt = toStatus === 'A valider'
      ? now
      : (taskRow?.submitted_at || null);
    const nextValidatedAt = toStatus === 'Validee' ? now : (taskRow?.validated_at || null);
    const nextRejectedAt = toStatus === 'Rejetee' ? now : (taskRow?.rejected_at || null);
    const nextStartedAt = toStatus === 'En cours'
      ? (taskRow?.started_at || now)
      : (taskRow?.started_at || null);
    const nextFinishedAt = toStatus === 'Validee' ? now : (taskRow?.finished_at || null);

    return {
      ok: true,
      fromStatus,
      toStatus,
      submittedAt: nextSubmittedAt,
      validatedAt: nextValidatedAt,
      rejectedAt: nextRejectedAt,
      startedAt: nextStartedAt,
      finishedAt: nextFinishedAt,
    };
  }

  function computeRenderTransitionState(renderRow, toStatusRaw, body, now, actorPermissions, actorUserId, actorRoleRaw = '') {
    const action = String(body?.action || '').trim().toLowerCase();
    const fromStatus = normalizeRenderStatus(renderRow?.status, 'Queued');
    const requesterId = Number(renderRow?.requested_by_user_id || 0);
    const actorId = Number(actorUserId || 0);
    const canReview = canRenderValidate(actorRoleRaw);
    const isOwner = requesterId > 0 && requesterId === actorId;

    if (action === 'validate') {
      if (!canReview) {
        return { ok: false, error: 'forbidden_render_review_role' };
      }
      const hasValidator = Number.isFinite(Number(renderRow?.validated_by_user_id))
        && Number(renderRow?.validated_by_user_id) > 0;
      if (hasValidator) {
        return { ok: false, error: 'render_already_validated' };
      }
      if (fromStatus !== 'Done') {
        return { ok: false, error: 'render_validation_requires_done' };
      }
      return {
        ok: true,
        fromStatus,
        toStatus: fromStatus,
        reviewStatus: 'validated',
        validatedByUserId: actorId > 0 ? actorId : null,
        outputPath: sanitizeRenderOutputPath(renderRow?.output_path),
        errorMessage: sanitizeRenderErrorMessage(renderRow?.error_message),
        startedAt: renderRow?.started_at || null,
        finishedAt: renderRow?.finished_at || now,
        commentDefault: 'render_validated',
      };
    }

    if (action === 'mark_pending') {
      if (!canReview) {
        return { ok: false, error: 'forbidden_render_review_role' };
      }
      if (fromStatus !== 'Done') {
        return { ok: false, error: 'render_validation_requires_done' };
      }
      return {
        ok: true,
        fromStatus,
        toStatus: fromStatus,
        reviewStatus: 'to_validate',
        validatedByUserId: null,
        outputPath: sanitizeRenderOutputPath(renderRow?.output_path),
        errorMessage: sanitizeRenderErrorMessage(renderRow?.error_message),
        startedAt: renderRow?.started_at || null,
        finishedAt: renderRow?.finished_at || now,
        commentDefault: 'render_marked_pending',
      };
    }

    if (action === 'reject') {
      if (!canReview) {
        return { ok: false, error: 'forbidden_render_review_role' };
      }
      if (fromStatus !== 'Done') {
        return { ok: false, error: 'render_validation_requires_done' };
      }
      return {
        ok: true,
        fromStatus,
        toStatus: fromStatus,
        reviewStatus: 'to_modify',
        validatedByUserId: null,
        outputPath: sanitizeRenderOutputPath(renderRow?.output_path),
        errorMessage: sanitizeRenderErrorMessage(renderRow?.error_message),
        startedAt: renderRow?.started_at || null,
        finishedAt: renderRow?.finished_at || now,
        commentDefault: 'render_rejected',
      };
    }

    const toStatus = normalizeRenderStatus(toStatusRaw, '');
    if (!RENDER_STATUSES.includes(toStatus)) {
      return { ok: false, error: 'invalid_render_status' };
    }
    if (fromStatus === toStatus) {
      return { ok: false, error: 'no_changes' };
    }

    if (!canReview && !isOwner) {
      return { ok: false, error: 'forbidden_render_transition' };
    }
    if ((toStatus === 'Done' || toStatus === 'Failed' || toStatus === 'Canceled') && !canReview) {
      return { ok: false, error: 'forbidden_render_review_role' };
    }

    let nextStartedAt = renderRow?.started_at || null;
    let nextFinishedAt = renderRow?.finished_at || null;
    let nextOutputPath = sanitizeRenderOutputPath(renderRow?.output_path);
    let nextErrorMessage = sanitizeRenderErrorMessage(renderRow?.error_message);
    let nextValidatedByUserId = renderRow?.validated_by_user_id == null
      ? null
      : Number(renderRow.validated_by_user_id);

    if (toStatus === 'Queued') {
      nextStartedAt = null;
      nextFinishedAt = null;
      nextOutputPath = '';
      nextErrorMessage = '';
      nextValidatedByUserId = null;
    } else if (toStatus === 'Running') {
      nextStartedAt = nextStartedAt || now;
      nextFinishedAt = null;
      nextOutputPath = '';
      nextErrorMessage = '';
      nextValidatedByUserId = null;
    } else if (toStatus === 'Done') {
      nextStartedAt = nextStartedAt || now;
      nextFinishedAt = now;
      nextOutputPath = sanitizeRenderOutputPath(body?.outputPath || renderRow?.output_path);
      nextErrorMessage = '';
      nextValidatedByUserId = null;
    } else if (toStatus === 'Failed') {
      nextStartedAt = nextStartedAt || now;
      nextFinishedAt = now;
      nextOutputPath = '';
      nextErrorMessage = sanitizeRenderErrorMessage(body?.errorMessage || renderRow?.error_message);
      nextValidatedByUserId = null;
    } else if (toStatus === 'Canceled') {
      nextFinishedAt = now;
      nextOutputPath = '';
      nextErrorMessage = '';
      nextValidatedByUserId = null;
    }
    const nextReviewStatus = inferRenderReviewStatus(toStatus, nextValidatedByUserId);

    return {
      ok: true,
      fromStatus,
      toStatus,
      reviewStatus: nextReviewStatus,
      validatedByUserId: Number.isFinite(nextValidatedByUserId) && nextValidatedByUserId > 0
        ? nextValidatedByUserId
        : null,
      outputPath: nextOutputPath,
      errorMessage: nextErrorMessage,
      startedAt: nextStartedAt,
      finishedAt: nextFinishedAt,
    };
  }

  return {
    listTaskProjectRefsFromRelations,
    listTaskResourceRefsFromRelations,
    replaceTaskRefsRelations,
    buildTaskPayloadWithRelations,
    computeTaskTransitionState,
    computeRenderTransitionState,
  };
}

module.exports = {
  createTaskRenderStateHelpers,
};
