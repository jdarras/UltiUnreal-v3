async function handlePostprodRoleRoutes({
  req,
  res,
  pathname = '',
  parseBody,
  sendJSON,
  requireSession,
  rolePermissions,
  requireManageRoles,
  rolesCache,
  buildRolePayload,
  sanitizeDisplayName,
  sanitizeRoleKey,
  normalizeRoleLookupKey,
  sanitizeRoleNote,
  normalizeManageableRolesInput,
  resolveRoleInput,
  SYSTEM_MAINTENANCE_ROLE,
  stmts,
  refreshRolesCache,
  audit,
  nowIso,
}) {
  if (pathname === '/agent/postprod/roles') {
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;

    if (req.method === 'GET') {
      const permissions = rolePermissions(auth.session.role, rolesCache);
      const roles = rolesCache.rows.map(buildRolePayload);
      sendJSON(res, 200, {
        ok: true,
        roles,
        permissions,
      });
      return true;
    }

    if (req.method === 'POST') {
      const rolePerms = requireManageRoles(auth, res, sendJSON);
      if (!rolePerms) return true;

      const body = await parseBody(req);
      const displayNameInput = sanitizeDisplayName(body?.displayName, '');
      const roleKey = sanitizeRoleKey(body?.key, displayNameInput);
      const roleLookup = normalizeRoleLookupKey(roleKey);
      if (!roleKey || !roleLookup) {
        sendJSON(res, 400, { ok: false, error: 'invalid_role_key' });
        return true;
      }
      if (rolesCache.byLookup.has(roleLookup)) {
        sendJSON(res, 409, { ok: false, error: 'role_exists' });
        return true;
      }

      const displayName = sanitizeDisplayName(displayNameInput, roleKey);
      const note = sanitizeRoleNote(body?.note);
      const canValidate = body?.canValidate === true;
      const canSyncScenes = body?.canSyncScenes === true;
      const canManageUsers = body?.canManageUsers === true;
      const canManageRoles = roleKey === SYSTEM_MAINTENANCE_ROLE;
      const canManageForms = roleKey === SYSTEM_MAINTENANCE_ROLE || body?.canManageForms === true;
      const canManageMachines = roleKey === SYSTEM_MAINTENANCE_ROLE || body?.canManageMachines === true;
      const canBanUsers = body?.canBanUsers === true;
      const canManageProjectPermissions = body?.canManageProjectPermissions === true;
      const canLaunchProjects = body?.canLaunchProjects !== false;
      const canLaunchRenders = body?.canLaunchRenders !== false;

      const requestedManageable = normalizeManageableRolesInput(body?.manageableRoles);
      const resolvedManageable = [];
      const resolvedSet = new Set();
      for (const requested of requestedManageable) {
        const resolved = resolveRoleInput(requested, rolesCache, '');
        if (!resolved) {
          sendJSON(res, 400, { ok: false, error: 'invalid_manageable_roles' });
          return true;
        }
        if (resolvedSet.has(resolved)) continue;
        resolvedSet.add(resolved);
        resolvedManageable.push(resolved);
      }

      const manageableRoles = canManageUsers ? resolvedManageable : [];
      const safeCanBanUsers = canManageUsers && canBanUsers;
      const safeCanManageProjectPermissions = canManageUsers && canManageProjectPermissions;
      const now = nowIso();
      try {
        stmts.insertRole.run(
          roleKey,
          displayName,
          note,
          canValidate ? 1 : 0,
          canSyncScenes ? 1 : 0,
          canManageUsers ? 1 : 0,
          canManageRoles ? 1 : 0,
          canManageForms ? 1 : 0,
          canManageMachines ? 1 : 0,
          safeCanBanUsers ? 1 : 0,
          safeCanManageProjectPermissions ? 1 : 0,
          canLaunchProjects ? 1 : 0,
          canLaunchRenders ? 1 : 0,
          JSON.stringify(manageableRoles),
          0,
          now,
          now
        );
      } catch (err) {
        const msg = String(err?.message || '');
        if (/unique/i.test(msg)) {
          sendJSON(res, 409, { ok: false, error: 'role_exists' });
          return true;
        }
        throw err;
      }

      refreshRolesCache();
      const created = rolesCache.byKey.get(roleKey);
      audit(
        auth.session.user_id,
        'role_created',
        {
          key: roleKey,
          displayName,
          note,
          canValidate,
          canSyncScenes,
          canManageUsers,
          canManageRoles,
          canManageForms,
          canManageMachines,
          canBanUsers: safeCanBanUsers,
          canManageProjectPermissions: safeCanManageProjectPermissions,
          canLaunchProjects,
          canLaunchRenders,
          manageableRoles,
        },
        'role',
        roleKey
      );
      sendJSON(res, 201, { ok: true, role: buildRolePayload(created) });
      return true;
    }

    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const roleUpdateMatch = /^\/agent\/postprod\/roles\/([^/]+)$/.exec(pathname);
  if (!roleUpdateMatch) return false;

  if (req.method !== 'PUT' && req.method !== 'POST') {
    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const auth = requireSession(req, res, sendJSON);
  if (!auth) return true;
  const rolePerms = requireManageRoles(auth, res, sendJSON);
  if (!rolePerms) return true;

  let roleKeyRaw = '';
  try {
    roleKeyRaw = decodeURIComponent(String(roleUpdateMatch[1] || ''));
  } catch {
    roleKeyRaw = String(roleUpdateMatch[1] || '');
  }
  const roleKey = resolveRoleInput(roleKeyRaw, rolesCache, '');
  if (!roleKey || !rolesCache.byKey.has(roleKey)) {
    sendJSON(res, 404, { ok: false, error: 'role_not_found' });
    return true;
  }
  const current = rolesCache.byKey.get(roleKey);
  const body = await parseBody(req);

  const hasDisplayName = Object.prototype.hasOwnProperty.call(body || {}, 'displayName');
  const hasNote = Object.prototype.hasOwnProperty.call(body || {}, 'note');
  const hasCanValidate = Object.prototype.hasOwnProperty.call(body || {}, 'canValidate');
  const hasCanSyncScenes = Object.prototype.hasOwnProperty.call(body || {}, 'canSyncScenes');
  const hasCanManageUsers = Object.prototype.hasOwnProperty.call(body || {}, 'canManageUsers');
  const hasCanManageRoles = Object.prototype.hasOwnProperty.call(body || {}, 'canManageRoles');
  const hasCanManageForms = Object.prototype.hasOwnProperty.call(body || {}, 'canManageForms');
  const hasCanManageMachines = Object.prototype.hasOwnProperty.call(body || {}, 'canManageMachines');
  const hasCanBanUsers = Object.prototype.hasOwnProperty.call(body || {}, 'canBanUsers');
  const hasCanManageProjectPermissions = Object.prototype.hasOwnProperty.call(body || {}, 'canManageProjectPermissions');
  const hasCanLaunchProjects = Object.prototype.hasOwnProperty.call(body || {}, 'canLaunchProjects');
  const hasCanLaunchRenders = Object.prototype.hasOwnProperty.call(body || {}, 'canLaunchRenders');
  const hasManageableRoles = Object.prototype.hasOwnProperty.call(body || {}, 'manageableRoles');

  let next = {
    ...current,
    manageableRoles: normalizeManageableRolesInput(current.manageableRoles),
  };
  if (hasDisplayName) {
    next.displayName = sanitizeDisplayName(body?.displayName, current.key);
  }
  if (hasNote) {
    next.note = sanitizeRoleNote(body?.note);
  }
  if (hasCanValidate) next.canValidate = body?.canValidate === true;
  if (hasCanSyncScenes) next.canSyncScenes = body?.canSyncScenes === true;
  if (hasCanManageUsers) next.canManageUsers = body?.canManageUsers === true;
  if (hasCanManageRoles) next.canManageRoles = body?.canManageRoles === true;
  if (hasCanManageForms) next.canManageForms = body?.canManageForms === true;
  if (hasCanManageMachines) next.canManageMachines = body?.canManageMachines === true;
  if (hasCanBanUsers) next.canBanUsers = body?.canBanUsers === true;
  if (hasCanManageProjectPermissions) next.canManageProjectPermissions = body?.canManageProjectPermissions === true;
  if (hasCanLaunchProjects) next.canLaunchProjects = body?.canLaunchProjects === true;
  if (hasCanLaunchRenders) next.canLaunchRenders = body?.canLaunchRenders === true;

  if (hasManageableRoles) {
    const requestedManageable = normalizeManageableRolesInput(body?.manageableRoles);
    const resolvedManageable = [];
    const resolvedSet = new Set();
    for (const requested of requestedManageable) {
      const resolved = resolveRoleInput(requested, rolesCache, '');
      if (!resolved) {
        sendJSON(res, 400, { ok: false, error: 'invalid_manageable_roles' });
        return true;
      }
      if (resolvedSet.has(resolved)) continue;
      resolvedSet.add(resolved);
      resolvedManageable.push(resolved);
    }
    next.manageableRoles = resolvedManageable;
  }

  if (!next.canManageUsers) {
    next.manageableRoles = [];
    next.canBanUsers = false;
    next.canManageProjectPermissions = false;
  }

  if (next.key === SYSTEM_MAINTENANCE_ROLE) {
    next.canManageUsers = true;
    next.canManageRoles = true;
    next.canManageForms = true;
    next.canManageMachines = true;
    next.canBanUsers = true;
    next.canManageProjectPermissions = true;
    next.canLaunchProjects = true;
    next.manageableRoles = Array.from(rolesCache.byKey.keys());
  } else {
    next.canManageRoles = false;
  }

  if (current.canManageRoles && !next.canManageRoles) {
    const remaining = Number(stmts.countRolesManageRolesExcluding.get(current.key)?.n || 0);
    if (remaining <= 0) {
      sendJSON(res, 400, { ok: false, error: 'last_manage_roles_forbidden' });
      return true;
    }
  }

  const currManageable = normalizeManageableRolesInput(current.manageableRoles);
  const nextManageable = normalizeManageableRolesInput(next.manageableRoles);
  const sameManageable = currManageable.length === nextManageable.length &&
    currManageable.every((roleName, idx) => roleName === nextManageable[idx]);
  const noChanges =
    !hasDisplayName &&
    !hasNote &&
    !hasCanValidate &&
    !hasCanSyncScenes &&
    !hasCanManageUsers &&
    !hasCanManageRoles &&
    !hasCanManageForms &&
    !hasCanManageMachines &&
    !hasCanBanUsers &&
    !hasCanManageProjectPermissions &&
    !hasCanLaunchProjects &&
    !hasCanLaunchRenders &&
    !hasManageableRoles;
  if (noChanges) {
    sendJSON(res, 400, { ok: false, error: 'no_changes' });
    return true;
  }

  const effectiveUnchanged =
    current.displayName === next.displayName &&
    sanitizeRoleNote(current.note) === sanitizeRoleNote(next.note) &&
    current.canValidate === next.canValidate &&
    current.canSyncScenes === next.canSyncScenes &&
    current.canManageUsers === next.canManageUsers &&
    current.canManageRoles === next.canManageRoles &&
    current.canManageForms === next.canManageForms &&
    current.canManageMachines === next.canManageMachines &&
    current.canBanUsers === next.canBanUsers &&
    current.canManageProjectPermissions === next.canManageProjectPermissions &&
    current.canLaunchProjects === next.canLaunchProjects &&
    current.canLaunchRenders === next.canLaunchRenders &&
    sameManageable;
  if (effectiveUnchanged) {
    sendJSON(res, 200, { ok: true, role: buildRolePayload(current), unchanged: true });
    return true;
  }

  const now = nowIso();
  stmts.updateRole.run(
    next.displayName,
    next.note,
    next.canValidate ? 1 : 0,
    next.canSyncScenes ? 1 : 0,
    next.canManageUsers ? 1 : 0,
    next.canManageRoles ? 1 : 0,
    next.canManageForms ? 1 : 0,
    next.canManageMachines ? 1 : 0,
    next.canBanUsers ? 1 : 0,
    next.canManageProjectPermissions ? 1 : 0,
    next.canLaunchProjects ? 1 : 0,
    next.canLaunchRenders ? 1 : 0,
    JSON.stringify(nextManageable),
    now,
    current.key
  );
  refreshRolesCache();
  const updated = rolesCache.byKey.get(current.key);

  audit(
    auth.session.user_id,
    'role_updated',
    {
      key: current.key,
      changed: {
        displayName: current.displayName !== updated.displayName,
        note: sanitizeRoleNote(current.note) !== sanitizeRoleNote(updated.note),
        canValidate: current.canValidate !== updated.canValidate,
        canSyncScenes: current.canSyncScenes !== updated.canSyncScenes,
        canManageUsers: current.canManageUsers !== updated.canManageUsers,
        canManageRoles: current.canManageRoles !== updated.canManageRoles,
        canManageForms: current.canManageForms !== updated.canManageForms,
        canManageMachines: current.canManageMachines !== updated.canManageMachines,
        canBanUsers: current.canBanUsers !== updated.canBanUsers,
        canManageProjectPermissions: current.canManageProjectPermissions !== updated.canManageProjectPermissions,
        canLaunchProjects: current.canLaunchProjects !== updated.canLaunchProjects,
        canLaunchRenders: current.canLaunchRenders !== updated.canLaunchRenders,
        manageableRoles: !sameManageable,
      },
    },
    'role',
    current.key
  );

  sendJSON(res, 200, { ok: true, role: buildRolePayload(updated) });
  return true;
}

module.exports = {
  handlePostprodRoleRoutes,
};
