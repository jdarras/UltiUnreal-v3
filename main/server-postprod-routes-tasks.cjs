'use strict';

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

function upsertTaskAssignmentAlert({
  stmts = null,
  userId = 0,
  taskId = 0,
  createdByUserId = 0,
  message = '',
  meta = null,
  now = '',
} = {}) {
  const normalizedUserId = toPositiveInt(userId);
  const normalizedTaskId = toPositiveInt(taskId);
  const normalizedByUserId = toPositiveInt(createdByUserId);
  if (
    normalizedUserId <= 0
    || normalizedTaskId <= 0
    || typeof stmts?.insertOpenUserAlert?.run !== 'function'
  ) {
    return 0;
  }
  const safeMessage = String(message || '').trim().slice(0, 500);
  const metaJson = encodeAlertMeta(meta);
  try {
    const inserted = stmts.insertOpenUserAlert.run(
      normalizedUserId,
      'new_assignment',
      normalizedTaskId,
      0,
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
        'new_assignment',
        normalizedTaskId,
        0
      );
    }
    return changes;
  } catch {
    return 0;
  }
}

async function handlePostprodTaskRoutes(options = {}) {
  const {
    req,
    res,
    pathname = '',
    parseBody,
    sendJSON,
    requireSession,
    rolePermissions,
    rolesCache,
    stmts,
    sanitizeTaskTitle,
    sanitizeTaskDescription,
    buildProjectTaskRefCatalog,
    sharedStore,
    buildResourceTaskRefCatalog,
    resolveTaskRefsFromCatalog,
    parseIsoDateOrNull,
    normalizeTaskStatus,
    TASK_REQUEST_TYPES,
    normalizeTaskRequestType,
    DEFAULT_TASK_REQUEST_TYPE,
    normalizeTaskExpectedRenderCount,
    resolveTaskExpectedRenderNames,
    normalizeTaskAutoRenderConfig,
    normalizeTaskRefsInput,
    ensureProjectCanAutoRender,
    TASK_STATUSES,
    nowIso,
    computeTaskDeadlineIso,
    db,
    replaceTaskRefsRelations,
    audit,
    buildTaskPayloadWithRelations,
    computeTaskTransitionState,
    sanitizeTaskComment,
    buildTaskTransitionPayload,
  } = options;

  if (!req || !res || !pathname) return false;

  if (pathname === '/agent/postprod/tasks') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const actorPerms = rolePermissions(auth.session.role, rolesCache);

    if (req.method === 'GET') {
      const tasks = stmts.listTasks.all().map(buildTaskPayloadWithRelations);
      sendJSON(res, 200, { ok: true, tasks });
      return true;
    }

    if (req.method === 'POST') {
      if (actorPerms.canCreateTasks !== true) {
        sendJSON(res, 403, { ok: false, error: 'forbidden_task_create' });
        return true;
      }
      const body = await parseBody(req);
      const title = sanitizeTaskTitle(body?.title, '');
      const description = sanitizeTaskDescription(body?.description);
      const priorityRaw = Number(body?.priority);
      const priority = Number.isFinite(priorityRaw)
        ? Math.max(1, Math.min(4, Math.trunc(priorityRaw)))
        : 3;
      const projectRefsCatalog = buildProjectTaskRefCatalog(sharedStore, stmts);
      const resourceRefsCatalog = buildResourceTaskRefCatalog(stmts);
      const {
        refs: projectRefs,
        invalidRefs: invalidProjectRefs,
      } = resolveTaskRefsFromCatalog(body?.projectRefs, projectRefsCatalog);
      const {
        refs: resourceRefs,
        invalidRefs: invalidResourceRefs,
      } = resolveTaskRefsFromCatalog(body?.resourceRefs, resourceRefsCatalog);
      const resourceRefsJson = JSON.stringify(resourceRefs);
      const assigneeUserIdRaw = body?.assigneeUserId;
      const assigneeUserId = assigneeUserIdRaw == null || assigneeUserIdRaw === ''
        ? null
        : Number(assigneeUserIdRaw);
      const actorUserIdRaw = Number(auth.session.user_id);
      const actorUserId = Number.isFinite(actorUserIdRaw) && actorUserIdRaw > 0
        ? Math.trunc(actorUserIdRaw)
        : null;
      const canAssignRenderRequests = actorPerms.canAssignRenderRequests === true;
      const effectiveAssigneeUserId = canAssignRenderRequests
        ? assigneeUserId
        : actorUserId;
      const hasDueAtInput =
        Object.prototype.hasOwnProperty.call(body || {}, 'dueAt')
        && String(body?.dueAt || '').trim() !== '';
      const parsedDueAt = parseIsoDateOrNull(body?.dueAt);
      const status = normalizeTaskStatus(body?.status, 'A faire');
      const hasRequestTypeInput = Object.prototype.hasOwnProperty.call(body || {}, 'requestType');
      const requestTypeRaw = String(body?.requestType || '').trim().toLowerCase();
      if (hasRequestTypeInput && requestTypeRaw && !TASK_REQUEST_TYPES.includes(requestTypeRaw)) {
        sendJSON(res, 400, { ok: false, error: 'invalid_request_type' });
        return true;
      }
      const requestType = normalizeTaskRequestType(requestTypeRaw, DEFAULT_TASK_REQUEST_TYPE);
      const allowAssignmentDraft = (
        requestType === 'auto_render'
        && toPositiveInt(effectiveAssigneeUserId) > 0
        && toPositiveInt(actorUserId) > 0
        && toPositiveInt(effectiveAssigneeUserId) !== toPositiveInt(actorUserId)
      );
      const expectedRenderCount = normalizeTaskExpectedRenderCount(
        body?.expectedRenderCount,
        requestType,
        requestType === 'auto_render' ? 1 : 1
      );
      const expectedRenderNames = resolveTaskExpectedRenderNames({
        title,
        requestType,
        expectedRenderCount,
        expectedRenderNames: body?.expectedRenderNames,
      });
      const expectedRenderNamesJson = JSON.stringify(expectedRenderNames);
      const normalizedAutoRenderConfig = normalizeTaskAutoRenderConfig(
        body?.autoRenderConfig,
        { requestType, projectRefs, stmts, allowAssignmentDraft }
      );
      if (!normalizedAutoRenderConfig.ok) {
        sendJSON(res, 400, { ok: false, error: normalizedAutoRenderConfig.error || 'invalid_task_auto_render_config' });
        return true;
      }
      const effectiveProjectRefs = (
        requestType === 'auto_render'
        && Array.isArray(normalizedAutoRenderConfig.projectRefs)
        && normalizedAutoRenderConfig.projectRefs.length > 0
      )
        ? normalizeTaskRefsInput(normalizedAutoRenderConfig.projectRefs)
        : projectRefs;
      const projectRefsJson = JSON.stringify(effectiveProjectRefs);

      if (!title) {
        sendJSON(res, 400, { ok: false, error: 'missing_task_title' });
        return true;
      }
      if (!TASK_STATUSES.includes(status)) {
        sendJSON(res, 400, { ok: false, error: 'invalid_status' });
        return true;
      }
      if (invalidProjectRefs.length > 0 && !(requestType === 'auto_render' && effectiveProjectRefs.length > 0)) {
        sendJSON(res, 400, {
          ok: false,
          error: 'invalid_project_refs',
          invalidRefs: invalidProjectRefs,
        });
        return true;
      }
      if (invalidResourceRefs.length > 0) {
        sendJSON(res, 400, {
          ok: false,
          error: 'invalid_resource_refs',
          invalidRefs: invalidResourceRefs,
        });
        return true;
      }
      if (requestType === 'auto_render') {
        if (normalizedAutoRenderConfig.isDraft !== true) {
          if (effectiveProjectRefs.length !== 1) {
            sendJSON(res, 409, {
              ok: false,
              error: 'auto_render_project_required',
            });
            return true;
          }
          const projectEligibility = ensureProjectCanAutoRender(sharedStore, effectiveProjectRefs[0], stmts);
          if (!projectEligibility.ok) {
            sendJSON(res, 400, {
              ok: false,
              error: projectEligibility.error || 'project_not_render_enabled',
              project: projectEligibility.project || null,
              usageMode: String(projectEligibility.usageMode || ''),
            });
            return true;
          }
        }
      }
      if (!canAssignRenderRequests && effectiveAssigneeUserId == null) {
        sendJSON(res, 400, { ok: false, error: 'invalid_assignee' });
        return true;
      }
      if (effectiveAssigneeUserId != null) {
        if (!Number.isFinite(effectiveAssigneeUserId) || effectiveAssigneeUserId <= 0) {
          sendJSON(res, 400, { ok: false, error: 'invalid_assignee' });
          return true;
        }
        const assigneeUser = stmts.findUserById.get(effectiveAssigneeUserId);
        if (!assigneeUser || Number(assigneeUser.is_active) !== 1) {
          sendJSON(res, 400, { ok: false, error: 'invalid_assignee' });
          return true;
        }
      }
      if (status === 'En cours' && effectiveAssigneeUserId == null) {
        sendJSON(res, 409, { ok: false, error: 'assignee_required_for_in_progress' });
        return true;
      }
      if (hasDueAtInput && !parsedDueAt) {
        sendJSON(res, 400, { ok: false, error: 'invalid_due_at' });
        return true;
      }

      const now = nowIso();
      const dueAt = parsedDueAt || computeTaskDeadlineIso(now, priority);
      const submittedAt = status === 'A valider' ? now : null;
      const validatedAt = status === 'Validee' ? now : null;
      const rejectedAt = status === 'Rejetee' ? now : null;
      const startedAt = status === 'En cours' ? now : null;
      const finishedAt = status === 'Validee' ? now : null;
      if ((status === 'Validee' || status === 'Rejetee') && actorPerms.canValidate !== true) {
        sendJSON(res, 403, { ok: false, error: 'forbidden_validation' });
        return true;
      }

      const result = stmts.insertTask.run(
        title,
        description,
        status,
        priority,
        requestType,
        expectedRenderCount,
        expectedRenderNamesJson,
        normalizedAutoRenderConfig.configJson,
        effectiveAssigneeUserId,
        projectRefsJson,
        resourceRefsJson,
        Number(auth.session.user_id),
        dueAt,
        submittedAt,
        validatedAt,
        rejectedAt,
        startedAt,
        finishedAt,
        now,
        now
      );
      const taskId = Number(result?.lastInsertRowid || 0);
      replaceTaskRefsRelations(taskId, effectiveProjectRefs, resourceRefs, now);
      const normalizedAssigneeUserId = toPositiveInt(effectiveAssigneeUserId);
      const normalizedActorUserId = toPositiveInt(actorUserId);
      if (normalizedAssigneeUserId > 0 && normalizedAssigneeUserId !== normalizedActorUserId) {
        const taskTitleForAlert = String(title || '').trim();
        upsertTaskAssignmentAlert({
          stmts,
          userId: normalizedAssigneeUserId,
          taskId,
          createdByUserId: normalizedActorUserId,
          message: taskTitleForAlert
            ? `Nouveau rendu assigne: ${taskTitleForAlert}`
            : `Nouveau rendu assigne (tache #${String(taskId)})`,
          meta: {
            taskId,
            taskTitle: taskTitleForAlert,
            source: 'task_assignment_create',
          },
          now,
        });
      }
      const created = stmts.findTaskById.get(taskId);
      const fromStatus = 'Planifiee';
      stmts.insertTaskTransition.run(
        taskId,
        fromStatus,
        status,
        Number(auth.session.user_id),
        '',
        now
      );
      audit(
        auth.session.user_id,
        'task_created',
        {
          taskId,
          title,
          status,
          priority,
          requestType,
          expectedRenderCount,
          expectedRenderNames,
          autoRenderConfig: normalizedAutoRenderConfig.config,
          assigneeUserId: effectiveAssigneeUserId == null ? null : Number(effectiveAssigneeUserId),
          projectRefs: effectiveProjectRefs,
          resourceRefs,
          dueAt,
          dueAtAuto: !parsedDueAt,
        },
        'task',
        String(taskId)
      );
      sendJSON(res, 201, { ok: true, task: buildTaskPayloadWithRelations(created) });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const taskUpdateMatch = /^\/agent\/postprod\/tasks\/(\d+)$/.exec(pathname);
  if (taskUpdateMatch) {
    if (req.method !== 'PUT' && req.method !== 'DELETE') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const actorPerms = rolePermissions(auth?.session?.role, rolesCache);
    if (actorPerms.canCreateTasks !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_task_edit' });
      return true;
    }
    if (req.method === 'DELETE' && actorPerms.canAssignRenderRequests !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_task_edit' });
      return true;
    }
    const taskId = Number(taskUpdateMatch[1] || 0);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_task_id' });
      return true;
    }
    const currentTask = stmts.findTaskById.get(taskId);
    if (!currentTask) {
      sendJSON(res, 404, { ok: false, error: 'task_not_found' });
      return true;
    }

    if (req.method === 'DELETE') {
      const deleted = stmts.deleteTaskById.run(taskId);
      if (Number(deleted?.changes || 0) <= 0) {
        sendJSON(res, 404, { ok: false, error: 'task_not_found' });
        return true;
      }
      const deletedAt = nowIso();
      if (typeof stmts?.resolveOpenUserAlertsByTaskId?.run === 'function') {
        stmts.resolveOpenUserAlertsByTaskId.run(deletedAt, deletedAt, taskId);
      }
      audit(
        auth.session.user_id,
        'task_deleted',
        {
          taskId,
          title: String(currentTask?.title || ''),
          status: normalizeTaskStatus(currentTask?.status, 'A faire'),
          requestType: normalizeTaskRequestType(currentTask?.request_type, DEFAULT_TASK_REQUEST_TYPE),
        },
        'task',
        String(taskId)
      );
      sendJSON(res, 200, { ok: true, taskId });
      return true;
    }

    const body = await parseBody(req);
    const currentPayload = buildTaskPayloadWithRelations(currentTask);
    const hasField = (key) => Object.prototype.hasOwnProperty.call(body || {}, key);
    const canAssignRenderRequests = actorPerms.canAssignRenderRequests === true;
    const actorUserIdRaw = Number(auth.session.user_id);
    const actorUserId = Number.isFinite(actorUserIdRaw) && actorUserIdRaw > 0
      ? Math.trunc(actorUserIdRaw)
      : null;

    const title = hasField('title')
      ? sanitizeTaskTitle(body?.title, '')
      : sanitizeTaskTitle(currentPayload?.title, '');
    const description = hasField('description')
      ? sanitizeTaskDescription(body?.description)
      : sanitizeTaskDescription(currentPayload?.description);
    const priority = (() => {
      if (!hasField('priority')) {
        const currentPriority = Number(currentPayload?.priority);
        return Number.isFinite(currentPriority)
          ? Math.max(1, Math.min(4, Math.trunc(currentPriority)))
          : 3;
      }
      const nextPriorityRaw = Number(body?.priority);
      return Number.isFinite(nextPriorityRaw)
        ? Math.max(1, Math.min(4, Math.trunc(nextPriorityRaw)))
        : 3;
    })();
    const requestTypeRaw = hasField('requestType')
      ? String(body?.requestType || '').trim().toLowerCase()
      : String(currentPayload?.requestType || '').trim().toLowerCase();
    if (hasField('requestType') && requestTypeRaw && !TASK_REQUEST_TYPES.includes(requestTypeRaw)) {
      sendJSON(res, 400, { ok: false, error: 'invalid_request_type' });
      return true;
    }
    const requestType = normalizeTaskRequestType(requestTypeRaw, DEFAULT_TASK_REQUEST_TYPE);
    const expectedRenderCount = normalizeTaskExpectedRenderCount(
      hasField('expectedRenderCount') ? body?.expectedRenderCount : currentPayload?.expectedRenderCount,
      requestType,
      requestType === 'auto_render' ? 1 : 1
    );
    const expectedRenderNames = resolveTaskExpectedRenderNames({
      title,
      requestType,
      expectedRenderCount,
      expectedRenderNames: hasField('expectedRenderNames')
        ? body?.expectedRenderNames
        : currentPayload?.expectedRenderNames,
    });
    const expectedRenderNamesJson = JSON.stringify(expectedRenderNames);

    const projectRefsCatalog = buildProjectTaskRefCatalog(sharedStore, stmts);
    const resourceRefsCatalog = buildResourceTaskRefCatalog(stmts);
    const projectRefsSource = hasField('projectRefs')
      ? body?.projectRefs
      : (Array.isArray(currentPayload?.projectRefs) ? currentPayload.projectRefs : []);
    const resourceRefsSource = hasField('resourceRefs')
      ? body?.resourceRefs
      : (Array.isArray(currentPayload?.resourceRefs) ? currentPayload.resourceRefs : []);
    const {
      refs: projectRefs,
      invalidRefs: invalidProjectRefs,
    } = resolveTaskRefsFromCatalog(projectRefsSource, projectRefsCatalog);
    const {
      refs: resourceRefs,
      invalidRefs: invalidResourceRefs,
    } = resolveTaskRefsFromCatalog(resourceRefsSource, resourceRefsCatalog);
    const resourceRefsJson = JSON.stringify(resourceRefs);

    const assigneeUserId = (() => {
      if (!hasField('assigneeUserId')) {
        const currentAssignee = Number(currentPayload?.assigneeUserId || 0);
        return Number.isFinite(currentAssignee) && currentAssignee > 0 ? Math.trunc(currentAssignee) : null;
      }
      const rawValue = body?.assigneeUserId;
      if (rawValue == null || rawValue === '') return null;
      const parsed = Number(rawValue);
      if (!Number.isFinite(parsed) || parsed <= 0) return NaN;
      return Math.trunc(parsed);
    })();
    const previousAssigneeUserId = toPositiveInt(currentPayload?.assigneeUserId);
    if (Number.isNaN(assigneeUserId)) {
      sendJSON(res, 400, { ok: false, error: 'invalid_assignee' });
      return true;
    }
    const effectiveAssigneeUserId = (() => {
      if (canAssignRenderRequests) return assigneeUserId;
      if (hasField('assigneeUserId')) return actorUserId;
      return assigneeUserId;
    })();
    const allowAssignmentDraft = (
      requestType === 'auto_render'
      && toPositiveInt(effectiveAssigneeUserId) > 0
      && toPositiveInt(actorUserId) > 0
      && toPositiveInt(effectiveAssigneeUserId) !== toPositiveInt(actorUserId)
    );

    const hasDueAtInput =
      hasField('dueAt') &&
      String(body?.dueAt || '').trim() !== '';
    const now = nowIso();
    const parsedDueAtInput = parseIsoDateOrNull(body?.dueAt);
    if (hasField('dueAt') && String(body?.dueAt || '').trim() !== '' && !parsedDueAtInput) {
      sendJSON(res, 400, { ok: false, error: 'invalid_due_at' });
      return true;
    }
    const dueAt = hasField('dueAt')
      ? (
          hasDueAtInput
            ? parsedDueAtInput
            : computeTaskDeadlineIso(now, priority)
        )
      : (
          parseIsoDateOrNull(currentPayload?.dueAt)
          || computeTaskDeadlineIso(now, priority)
        );

    const normalizedAutoRenderConfig = normalizeTaskAutoRenderConfig(
      hasField('autoRenderConfig') ? body?.autoRenderConfig : currentPayload?.autoRenderConfig,
      { requestType, projectRefs, stmts, allowAssignmentDraft }
    );
    if (!normalizedAutoRenderConfig.ok) {
      sendJSON(res, 400, { ok: false, error: normalizedAutoRenderConfig.error || 'invalid_task_auto_render_config' });
      return true;
    }
    const effectiveProjectRefs = (
      requestType === 'auto_render'
      && Array.isArray(normalizedAutoRenderConfig.projectRefs)
      && normalizedAutoRenderConfig.projectRefs.length > 0
    )
      ? normalizeTaskRefsInput(normalizedAutoRenderConfig.projectRefs)
      : projectRefs;
    const projectRefsJson = JSON.stringify(effectiveProjectRefs);

    if (!title) {
      sendJSON(res, 400, { ok: false, error: 'missing_task_title' });
      return true;
    }
    if (invalidProjectRefs.length > 0 && !(requestType === 'auto_render' && effectiveProjectRefs.length > 0)) {
      sendJSON(res, 400, {
        ok: false,
        error: 'invalid_project_refs',
        invalidRefs: invalidProjectRefs,
      });
      return true;
    }
    if (invalidResourceRefs.length > 0) {
      sendJSON(res, 400, {
        ok: false,
        error: 'invalid_resource_refs',
        invalidRefs: invalidResourceRefs,
      });
      return true;
    }
    if (requestType === 'auto_render') {
      if (normalizedAutoRenderConfig.isDraft !== true) {
        if (effectiveProjectRefs.length !== 1) {
          sendJSON(res, 409, {
            ok: false,
            error: 'auto_render_project_required',
          });
          return true;
        }
        const projectEligibility = ensureProjectCanAutoRender(sharedStore, effectiveProjectRefs[0], stmts);
        if (!projectEligibility.ok) {
          sendJSON(res, 400, {
            ok: false,
            error: projectEligibility.error || 'project_not_render_enabled',
            project: projectEligibility.project || null,
            usageMode: String(projectEligibility.usageMode || ''),
          });
          return true;
        }
      }
    }
    if (!canAssignRenderRequests && hasField('assigneeUserId') && effectiveAssigneeUserId == null) {
      sendJSON(res, 400, { ok: false, error: 'invalid_assignee' });
      return true;
    }
    if (effectiveAssigneeUserId != null) {
      if (!Number.isFinite(effectiveAssigneeUserId) || effectiveAssigneeUserId <= 0) {
        sendJSON(res, 400, { ok: false, error: 'invalid_assignee' });
        return true;
      }
      const assigneeUser = stmts.findUserById.get(effectiveAssigneeUserId);
      if (!assigneeUser || Number(assigneeUser.is_active) !== 1) {
        sendJSON(res, 400, { ok: false, error: 'invalid_assignee' });
        return true;
      }
    }
    if (normalizeTaskStatus(currentTask?.status, 'A faire') === 'En cours' && effectiveAssigneeUserId == null) {
      sendJSON(res, 409, { ok: false, error: 'assignee_required_for_in_progress' });
      return true;
    }

    stmts.updateTask.run(
      title,
      description,
      priority,
      requestType,
      expectedRenderCount,
      expectedRenderNamesJson,
      normalizedAutoRenderConfig.configJson,
      effectiveAssigneeUserId,
      projectRefsJson,
      resourceRefsJson,
      dueAt,
      now,
      taskId
    );
    replaceTaskRefsRelations(taskId, effectiveProjectRefs, resourceRefs, now);
    const taskActorUserIdRaw = Number(auth.session.user_id || 0);
    const taskActorUserId = Number.isFinite(taskActorUserIdRaw) && taskActorUserIdRaw > 0
      ? Math.trunc(taskActorUserIdRaw)
      : 0;
    const normalizedAssigneeUserId = toPositiveInt(effectiveAssigneeUserId);
    if (normalizedAssigneeUserId > 0 && normalizedAssigneeUserId !== taskActorUserId) {
      const taskTitleForAlert = String(title || '').trim();
      upsertTaskAssignmentAlert({
        stmts,
        userId: normalizedAssigneeUserId,
        taskId,
        createdByUserId: taskActorUserId,
        message: taskTitleForAlert
          ? `Nouveau rendu assigne: ${taskTitleForAlert}`
          : `Nouveau rendu assigne (tache #${String(taskId)})`,
        meta: {
          taskId,
          taskTitle: taskTitleForAlert,
          source: 'task_assignment_update',
        },
        now,
      });
    }
    if (
      previousAssigneeUserId > 0
      && previousAssigneeUserId !== normalizedAssigneeUserId
      && typeof stmts?.resolveOpenUserAlertsByUserTaskIdAndType?.run === 'function'
    ) {
      stmts.resolveOpenUserAlertsByUserTaskIdAndType.run(
        now,
        now,
        previousAssigneeUserId,
        taskId,
        'new_assignment'
      );
    }
    if (
      taskActorUserId > 0
      && typeof stmts?.resolveOpenUserAlertsByUserTaskIdAndType?.run === 'function'
    ) {
      stmts.resolveOpenUserAlertsByUserTaskIdAndType.run(
        now,
        now,
        taskActorUserId,
        taskId,
        'new_assignment'
      );
    }
    const updated = stmts.findTaskById.get(taskId);
    audit(
      auth.session.user_id,
      'task_updated',
      {
        taskId,
        title,
        description,
        priority,
        requestType,
        expectedRenderCount,
        expectedRenderNames,
        autoRenderConfig: normalizedAutoRenderConfig.config,
        assigneeUserId: effectiveAssigneeUserId == null ? null : Number(effectiveAssigneeUserId),
        projectRefs: effectiveProjectRefs,
        resourceRefs,
        dueAt,
      },
      'task',
      String(taskId)
    );
    sendJSON(res, 200, { ok: true, task: buildTaskPayloadWithRelations(updated) });
    return true;
  }

  const taskTransitionMatch = /^\/agent\/postprod\/tasks\/(\d+)\/transition$/.exec(pathname);
  if (taskTransitionMatch) {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const taskId = Number(taskTransitionMatch[1] || 0);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_task_id' });
      return true;
    }
    const currentTask = stmts.findTaskById.get(taskId);
    if (!currentTask) {
      sendJSON(res, 404, { ok: false, error: 'task_not_found' });
      return true;
    }
    const body = await parseBody(req);
    const nextStatusRaw = body?.toStatus;
    const comment = sanitizeTaskComment(body?.comment);
    const actorPerms = rolePermissions(auth.session.role, rolesCache);
    const now = nowIso();
    const next = computeTaskTransitionState(currentTask, nextStatusRaw, now, actorPerms);
    if (!next.ok) {
      const statusCode = next.error === 'forbidden_validation'
        ? 403
        : (next.error === 'assignee_required_for_in_progress' ? 409 : 400);
      sendJSON(res, statusCode, { ok: false, error: next.error });
      return true;
    }
    if (next.toStatus === 'En cours') {
      const assigneeUserId = Number(currentTask?.assignee_user_id || 0);
      if (!Number.isFinite(assigneeUserId) || assigneeUserId <= 0) {
        sendJSON(res, 409, { ok: false, error: 'assignee_required_for_in_progress' });
        return true;
      }
      const assigneeUser = stmts.findUserById.get(assigneeUserId);
      if (!assigneeUser || Number(assigneeUser.is_active) !== 1) {
        sendJSON(res, 400, { ok: false, error: 'invalid_assignee' });
        return true;
      }
    }

    const tx = db.transaction(() => {
      stmts.updateTaskTransition.run(
        next.toStatus,
        next.submittedAt,
        next.validatedAt,
        next.rejectedAt,
        next.startedAt,
        next.finishedAt,
        now,
        taskId
      );
      stmts.insertTaskTransition.run(
        taskId,
        next.fromStatus,
        next.toStatus,
        Number(auth.session.user_id),
        comment,
        now
      );
    });
    tx();

    const updated = stmts.findTaskById.get(taskId);
    audit(
      auth.session.user_id,
      'task_transition',
      {
        taskId,
        fromStatus: next.fromStatus,
        toStatus: next.toStatus,
        comment,
      },
      'task',
      String(taskId)
    );
    sendJSON(res, 200, { ok: true, task: buildTaskPayloadWithRelations(updated) });
    return true;
  }

  const taskTransitionsMatch = /^\/agent\/postprod\/tasks\/(\d+)\/transitions$/.exec(pathname);
  if (taskTransitionsMatch) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const taskId = Number(taskTransitionsMatch[1] || 0);
    if (!Number.isFinite(taskId) || taskId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_task_id' });
      return true;
    }
    const currentTask = stmts.findTaskById.get(taskId);
    if (!currentTask) {
      sendJSON(res, 404, { ok: false, error: 'task_not_found' });
      return true;
    }
    const transitions = stmts.listTaskTransitionsByTaskId
      .all(taskId)
      .map(buildTaskTransitionPayload);
    sendJSON(res, 200, { ok: true, transitions });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodTaskRoutes,
};
