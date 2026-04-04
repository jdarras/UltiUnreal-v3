async function handlePostprodUserProjectPermissionsRoutes({
  req,
  res,
  pathname = '',
  parseBody,
  sendJSON,
  requireSession,
  requireManageProjectPermissions,
  normalizeManageableRolesInput,
  resolveRoleInput,
  rolesCache,
  stmts,
  buildProjectPermissionPayload,
  sharedStore,
  resolveProjectForApi,
  sanitizeProjectRef,
  resolveProjectPermissionCeilings,
  clampProjectPermissionsInput,
  nowIso,
  db,
  audit,
  parseProjectPermissionBool,
}) {
  const userProjectPermissionsListMatch = /^\/agent\/postprod\/users\/(\d+)\/project-permissions$/.exec(pathname);
  if (userProjectPermissionsListMatch) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const managerPerms = requireManageProjectPermissions(auth, res, sendJSON);
    if (!managerPerms) return true;

    const actorId = Number(auth?.session?.user_id || 0);
    const allowedRolesSet = new Set(
      normalizeManageableRolesInput(managerPerms.manageableRoles)
        .map((r) => resolveRoleInput(r, rolesCache, ''))
        .filter(Boolean)
    );
    const userId = Number(userProjectPermissionsListMatch[1] || 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_user_id' });
      return true;
    }
    const targetUser = stmts.findUserById.get(userId);
    if (!targetUser) {
      sendJSON(res, 404, { ok: false, error: 'user_not_found' });
      return true;
    }
    const targetRole = resolveRoleInput(targetUser?.role, rolesCache, '');
    if (!allowedRolesSet.has(targetRole) && actorId !== userId) {
      sendJSON(res, 403, { ok: false, error: 'forbidden' });
      return true;
    }

    const projectPermissions = stmts.listProjectUserRolesByUserId
      .all(userId)
      .map(buildProjectPermissionPayload);
    sendJSON(res, 200, {
      ok: true,
      userId,
      projectPermissions,
    });
    return true;
  }

  const userProjectPermissionsMatch = /^\/agent\/postprod\/users\/(\d+)\/project-permissions\/([^/]+)$/.exec(pathname);
  if (!userProjectPermissionsMatch) return false;

  if (req.method !== 'PUT' && req.method !== 'POST') {
    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }
  const auth = requireSession(req, res, sendJSON);
  if (!auth) return true;
  const managerPerms = requireManageProjectPermissions(auth, res, sendJSON);
  if (!managerPerms) return true;

  const actorId = Number(auth?.session?.user_id || 0);
  const allowedRolesSet = new Set(
    normalizeManageableRolesInput(managerPerms.manageableRoles)
      .map((r) => resolveRoleInput(r, rolesCache, ''))
      .filter(Boolean)
  );
  const userId = Number(userProjectPermissionsMatch[1] || 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    sendJSON(res, 400, { ok: false, error: 'invalid_user_id' });
    return true;
  }
  const targetUser = stmts.findUserById.get(userId);
  if (!targetUser) {
    sendJSON(res, 404, { ok: false, error: 'user_not_found' });
    return true;
  }
  const targetRole = resolveRoleInput(targetUser?.role, rolesCache, '');
  if (!allowedRolesSet.has(targetRole) && actorId !== userId) {
    sendJSON(res, 403, { ok: false, error: 'forbidden' });
    return true;
  }

  let rawProjectRef = '';
  try {
    rawProjectRef = decodeURIComponent(String(userProjectPermissionsMatch[2] || ''));
  } catch {
    rawProjectRef = String(userProjectPermissionsMatch[2] || '');
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

  const body = await parseBody(req);
  const hasAny =
    Object.prototype.hasOwnProperty.call(body || {}, 'isReferent') ||
    Object.prototype.hasOwnProperty.call(body || {}, 'canValidate') ||
    Object.prototype.hasOwnProperty.call(body || {}, 'canSync') ||
    Object.prototype.hasOwnProperty.call(body || {}, 'canLaunchRender') ||
    Object.prototype.hasOwnProperty.call(body || {}, 'canEditData');
  if (!hasAny) {
    sendJSON(res, 400, { ok: false, error: 'no_changes' });
    return true;
  }

  const ceilings = resolveProjectPermissionCeilings(targetUser.role, rolesCache);
  const clamped = clampProjectPermissionsInput(body, ceilings);
  if (clamped.canSync) clamped.isReferent = true;

  const now = nowIso();
  const saveProjectPermissionsTx = db.transaction(() => {
    if (clamped.isReferent) {
      stmts.clearProjectReferentAndSyncByProjectExcludingUser.run(
        now,
        projectRef,
        userId
      );
    }
    stmts.upsertProjectUserRole.run(
      userId,
      projectRef,
      clamped.isReferent ? 1 : 0,
      clamped.canValidate ? 1 : 0,
      clamped.canSync ? 1 : 0,
      clamped.canLaunchRender ? 1 : 0,
      clamped.canEditData ? 1 : 0,
      now,
      now
    );
  });
  saveProjectPermissionsTx();
  const saved = stmts.findProjectUserRole.get(userId, projectRef);
  const payload = buildProjectPermissionPayload(saved);

  audit(
    auth.session.user_id,
    'user_project_permissions_updated',
    {
      targetUserId: userId,
      projectId: projectRef,
      requested: {
        isReferent: parseProjectPermissionBool(body?.isReferent, false),
        canValidate: parseProjectPermissionBool(body?.canValidate, false),
        canSync: parseProjectPermissionBool(body?.canSync, false),
        canLaunchRender: parseProjectPermissionBool(body?.canLaunchRender, false),
        canEditData: parseProjectPermissionBool(body?.canEditData, false),
      },
      applied: payload,
      ceilings,
      uniqueReferentEnforced: clamped.isReferent === true,
    },
    'user_project_permissions',
    `${userId}:${projectRef}`
  );

  sendJSON(res, 200, {
    ok: true,
    projectPermissions: payload,
    project: projectResolved.project,
  });
  return true;
}

module.exports = {
  handlePostprodUserProjectPermissionsRoutes,
};
