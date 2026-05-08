async function handlePostprodUserUpdateRoutes({
  req,
  res,
  pathname = '',
  parseBody,
  sendJSON,
  requireSession,
  requireManageUsers,
  normalizeManageableRolesInput,
  resolveRoleInput,
  rolesCache,
  stmts,
  resolvePhoneFromBody,
  resolveNotificationPrefsFromBody,
  sanitizeDisplayName,
  sanitizeFirstName,
  sanitizeLastName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeEmploymentType,
  sanitizeUserNote,
  sanitizeAvatarPath,
  sanitizeTimezone,
  sanitizeUserLanguage,
  DEFAULT_USER_LANGUAGE,
  normalizeNotificationPreferences,
  MIN_PASSWORD_LEN,
  isValidEmail,
  isValidAvatarPath,
  parseIsoDateOrNull,
  DEFAULT_FALLBACK_ROLE,
  nowIso,
  db,
  hashPassword,
  pbkdf2Iters,
  audit,
  buildUserAdminPayload,
  emitUserSyncUpsert,
  emitUserSyncDelete,
}) {
  const userUpdateMatch = /^\/agent\/postprod\/users\/(\d+)(?:\/profile)?$/.exec(pathname);
  if (!userUpdateMatch) return false;

  if (req.method !== 'PUT' && req.method !== 'POST' && req.method !== 'DELETE') {
    sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
    return true;
  }

  const auth = requireSession(req, res, sendJSON);
  if (!auth) return true;
  const managerPerms = requireManageUsers(auth, res, sendJSON);
  if (!managerPerms) return true;
  const actorId = Number(auth?.session?.user_id || 0);
  const allowedRolesSet = new Set(
    normalizeManageableRolesInput(managerPerms.manageableRoles)
      .map((r) => resolveRoleInput(r, rolesCache, ''))
      .filter(Boolean)
  );

  const userId = Number(userUpdateMatch[1] || 0);
  if (!Number.isFinite(userId) || userId <= 0) {
    sendJSON(res, 400, { ok: false, error: 'invalid_user_id' });
    return true;
  }

  const currentUser = stmts.findUserById.get(userId);
  if (!currentUser) {
    sendJSON(res, 404, { ok: false, error: 'user_not_found' });
    return true;
  }
  const currentRoleSafe = resolveRoleInput(currentUser?.role, rolesCache, '');
  if (!allowedRolesSet.has(currentRoleSafe)) {
    sendJSON(res, 403, { ok: false, error: 'forbidden' });
    return true;
  }
  const roleGrantsManageRoles = (roleKeyInput) => {
    const roleKey = resolveRoleInput(roleKeyInput, rolesCache, '');
    if (!roleKey) return false;
    const roleRow = rolesCache?.byKey instanceof Map ? rolesCache.byKey.get(roleKey) : null;
    return roleRow?.canManageRoles === true;
  };

  if (req.method === 'DELETE') {
    if (actorId === Number(userId)) {
      sendJSON(res, 400, { ok: false, error: 'cannot_delete_self' });
      return true;
    }

    const currentRole = resolveRoleInput(currentUser?.role, rolesCache, DEFAULT_FALLBACK_ROLE);
    const deletingManageRolesUser = (
      Number(currentUser?.is_active) === 1
      && roleGrantsManageRoles(currentRole)
    );
    if (deletingManageRolesUser) {
      const remaining = Number(stmts.countActiveUsersWithManageRolesExcluding.get(userId)?.n || 0);
      if (remaining <= 0) {
        sendJSON(res, 400, { ok: false, error: 'last_manage_roles_user_forbidden' });
        return true;
      }
    }

    try {
      const tx = db.transaction(() => {
        const result = stmts.deleteUserById.run(userId);
        if (Number(result?.changes || 0) <= 0) {
          throw Object.assign(new Error('user_not_found'), { code: 'user_not_found' });
        }
      });
      tx();
    } catch (err) {
      if (String(err?.code || '').toLowerCase() === 'user_not_found') {
        sendJSON(res, 404, { ok: false, error: 'user_not_found' });
        return true;
      }
      const msg = String(err?.message || '');
      if (/foreign key/i.test(msg)) {
        sendJSON(res, 409, { ok: false, error: 'user_has_linked_data' });
        return true;
      }
      throw err;
    }

    audit(
      auth.session.user_id,
      'user_deleted',
      {
        targetUserId: userId,
        username: String(currentUser?.username || ''),
        displayName: String(currentUser?.display_name || currentUser?.username || ''),
        role: currentRole,
      },
      'user',
      String(userId)
    );
    if (typeof emitUserSyncDelete === 'function') {
      try {
        emitUserSyncDelete(currentUser, {
          actorUserId: auth.session.user_id,
          reason: 'user_deleted',
        });
      } catch {}
    }

    sendJSON(res, 200, { ok: true, deletedUserId: userId });
    return true;
  }

  const body = await parseBody(req);
  const hasUsername = Object.prototype.hasOwnProperty.call(body || {}, 'username');
  const hasRole = Object.prototype.hasOwnProperty.call(body || {}, 'role');
  const hasIsActive = Object.prototype.hasOwnProperty.call(body || {}, 'isActive');
  const hasDisplayName = Object.prototype.hasOwnProperty.call(body || {}, 'displayName');
  const hasFirstName = Object.prototype.hasOwnProperty.call(body || {}, 'firstName');
  const hasLastName = Object.prototype.hasOwnProperty.call(body || {}, 'lastName');
  const hasEmail = Object.prototype.hasOwnProperty.call(body || {}, 'email');
  const hasEmail2 = Object.prototype.hasOwnProperty.call(body || {}, 'email2');
  const hasEmploymentType = Object.prototype.hasOwnProperty.call(body || {}, 'employmentType');
  const hasNote = Object.prototype.hasOwnProperty.call(body || {}, 'note');
  const hasAvatarPath = Object.prototype.hasOwnProperty.call(body || {}, 'avatarPath');
  const hasMustChangePassword = Object.prototype.hasOwnProperty.call(body || {}, 'mustChangePassword');
  const hasFailedLoginCount = Object.prototype.hasOwnProperty.call(body || {}, 'failedLoginCount');
  const hasLockedUntil = Object.prototype.hasOwnProperty.call(body || {}, 'lockedUntil');
  const hasTimezone = Object.prototype.hasOwnProperty.call(body || {}, 'timezone');
  const hasLanguage = Object.prototype.hasOwnProperty.call(body || {}, 'language');
  const phoneInputInfo = resolvePhoneFromBody(
    body,
    currentUser.phone || currentUser.mobile_phone || currentUser.office_phone || ''
  );
  const notificationPrefsInput = resolveNotificationPrefsFromBody(
    body,
    currentUser.notification_preferences_json
  );
  const hasPassword = Object.prototype.hasOwnProperty.call(body || {}, 'password');
  if (hasUsername) {
    sendJSON(res, 400, { ok: false, error: 'username_read_only' });
    return true;
  }
  if (hasIsActive && managerPerms.canBanUsers !== true) {
    sendJSON(res, 403, { ok: false, error: 'forbidden_ban_users' });
    return true;
  }

  const nextUsername = String(currentUser.username || '').trim();

  let nextRole = currentRoleSafe || DEFAULT_FALLBACK_ROLE;
  if (hasRole) {
    nextRole = resolveRoleInput(body?.role, rolesCache, '');
    if (!nextRole) {
      sendJSON(res, 400, { ok: false, error: 'invalid_role' });
      return true;
    }
    if (!allowedRolesSet.has(nextRole)) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_role_assignment' });
      return true;
    }
  }

  let nextIsActive = Number(currentUser.is_active) === 1;
  if (hasIsActive) {
    nextIsActive = body?.isActive !== false;
  }

  let nextDisplayName = String(currentUser.display_name || currentUser.username || '');
  if (hasDisplayName) {
    nextDisplayName = sanitizeDisplayName(body?.displayName, currentUser.username);
    const displayNameCandidates = stmts.findUserIdsByDisplayName.all(nextDisplayName);
    const hasDisplayNameConflict = Array.isArray(displayNameCandidates)
      ? displayNameCandidates.some((row) => Number(row?.id || 0) !== userId)
      : false;
    if (hasDisplayNameConflict) {
      sendJSON(res, 409, { ok: false, error: 'display_name_exists' });
      return true;
    }
  }

  let nextFirstName = String(currentUser.first_name || '');
  if (hasFirstName) {
    nextFirstName = sanitizeFirstName(body?.firstName);
  }

  let nextLastName = String(currentUser.last_name || '');
  if (hasLastName) {
    nextLastName = sanitizeLastName(body?.lastName);
  }

  let nextEmail = String(currentUser.email || '');
  if (hasEmail) {
    nextEmail = sanitizeEmail(body?.email);
  }
  if (!isValidEmail(nextEmail)) {
    sendJSON(res, 400, { ok: false, error: 'invalid_email' });
    return true;
  }
  let nextEmail2 = String(currentUser.email_secondary || '');
  if (hasEmail2) {
    nextEmail2 = sanitizeEmail(body?.email2);
  }
  if (!isValidEmail(nextEmail2)) {
    sendJSON(res, 400, { ok: false, error: 'invalid_email' });
    return true;
  }
  const hasPhone2 = Object.prototype.hasOwnProperty.call(body || {}, 'phone2')
    || Object.prototype.hasOwnProperty.call(body || {}, 'officePhone');
  let nextPhone = sanitizePhone(currentUser.phone || currentUser.mobile_phone || currentUser.office_phone || '');
  let nextMobilePhone = sanitizePhone(currentUser.mobile_phone || currentUser.phone || '');
  let nextOfficePhone = sanitizePhone(currentUser.office_phone || currentUser.phone || '');
  if (phoneInputInfo.hasAny) {
    nextPhone = phoneInputInfo.value;
    nextMobilePhone = nextPhone;
    nextOfficePhone = hasPhone2 ? nextOfficePhone : nextPhone;
  }
  if (hasPhone2) {
    nextOfficePhone = sanitizePhone(body?.phone2 ?? body?.officePhone ?? '');
    if (!nextPhone) nextPhone = nextOfficePhone;
    if (!nextMobilePhone) nextMobilePhone = nextPhone;
  }
  let nextEmploymentType = sanitizeEmploymentType(currentUser.employment_type);
  if (hasEmploymentType) {
    const rawEmploymentType = String(body?.employmentType || '').trim();
    nextEmploymentType = sanitizeEmploymentType(rawEmploymentType);
    if (rawEmploymentType && !nextEmploymentType) {
      sendJSON(res, 400, { ok: false, error: 'invalid_employment_type' });
      return true;
    }
  }
  let nextNote = sanitizeUserNote(currentUser.user_note);
  if (hasNote) {
    nextNote = sanitizeUserNote(body?.note);
  }
  let nextAvatarPath = sanitizeAvatarPath(currentUser.avatar_path);
  if (hasAvatarPath) {
    nextAvatarPath = sanitizeAvatarPath(body?.avatarPath);
    if (!isValidAvatarPath(nextAvatarPath)) {
      sendJSON(res, 400, { ok: false, error: 'invalid_avatar_path' });
      return true;
    }
  }
  let nextMustChangePassword = Number(currentUser.must_change_password) === 1;
  if (hasMustChangePassword) {
    nextMustChangePassword = body?.mustChangePassword === true;
  }
  let nextFailedLoginCount = Number.isFinite(Number(currentUser.failed_login_count))
    ? Math.max(0, Math.trunc(Number(currentUser.failed_login_count)))
    : 0;
  if (hasFailedLoginCount) {
    const parsedFailedCount = Number(body?.failedLoginCount);
    if (!Number.isFinite(parsedFailedCount) || parsedFailedCount < 0) {
      sendJSON(res, 400, { ok: false, error: 'invalid_failed_login_count' });
      return true;
    }
    nextFailedLoginCount = Math.trunc(parsedFailedCount);
  }
  let nextLockedUntil = parseIsoDateOrNull(currentUser.locked_until);
  if (hasLockedUntil) {
    const rawLocked = body?.lockedUntil;
    if (rawLocked == null || String(rawLocked || '').trim() === '') {
      nextLockedUntil = null;
    } else {
      nextLockedUntil = parseIsoDateOrNull(rawLocked);
      if (!nextLockedUntil) {
        sendJSON(res, 400, { ok: false, error: 'invalid_locked_until' });
        return true;
      }
    }
  }
  let nextTimezone = sanitizeTimezone(currentUser.timezone || '');
  if (hasTimezone) {
    nextTimezone = sanitizeTimezone(body?.timezone);
  }
  let nextLanguage = sanitizeUserLanguage(currentUser.language, DEFAULT_USER_LANGUAGE);
  if (hasLanguage) {
    nextLanguage = sanitizeUserLanguage(body?.language, nextLanguage);
  }
  let nextNotificationPreferencesJson = normalizeNotificationPreferences(currentUser.notification_preferences_json);
  if (notificationPrefsInput.hasAny) {
    nextNotificationPreferencesJson = notificationPrefsInput.value;
  }

  const nextPassword = hasPassword ? String(body?.password || '') : '';
  if (hasPassword && nextPassword.length < MIN_PASSWORD_LEN) {
    sendJSON(res, 400, { ok: false, error: 'invalid_password' });
    return true;
  }
  if (hasPassword) {
    nextFailedLoginCount = 0;
    nextLockedUntil = null;
  }

  if (
    actorId === Number(userId) &&
    hasIsActive &&
    nextIsActive === false
  ) {
    sendJSON(res, 400, { ok: false, error: 'cannot_disable_self' });
    return true;
  }

  const currentRole = resolveRoleInput(currentUser.role, rolesCache, DEFAULT_FALLBACK_ROLE);
  const currentRoleCanManageRoles = roleGrantsManageRoles(currentRole);
  const nextRoleCanManageRoles = roleGrantsManageRoles(nextRole);
  const dropsManageRolesPrivilege = (
    Number(currentUser?.is_active) === 1
    && currentRoleCanManageRoles
    && (nextRoleCanManageRoles !== true || nextIsActive === false)
  );
  if (dropsManageRolesPrivilege) {
    const remaining = Number(stmts.countActiveUsersWithManageRolesExcluding.get(userId)?.n || 0);
    if (remaining <= 0) {
      sendJSON(res, 400, { ok: false, error: 'last_manage_roles_user_forbidden' });
      return true;
    }
  }

  const noBasicChanges =
    !hasUsername &&
    !hasRole &&
    !hasIsActive &&
    !hasDisplayName &&
    !hasFirstName &&
    !hasLastName &&
    !hasEmail &&
    !hasEmail2 &&
    !phoneInputInfo.hasAny &&
    !hasPhone2 &&
    !hasEmploymentType &&
    !hasNote &&
    !hasAvatarPath &&
    !hasMustChangePassword &&
    !hasFailedLoginCount &&
    !hasLockedUntil &&
    !hasTimezone &&
    !hasLanguage &&
    !notificationPrefsInput.hasAny &&
    !hasPassword;
  if (noBasicChanges) {
    sendJSON(res, 400, { ok: false, error: 'no_changes' });
    return true;
  }

  const now = nowIso();
  try {
    const tx = db.transaction(() => {
      if (
        hasUsername ||
        hasRole ||
        hasIsActive ||
        hasDisplayName ||
        hasFirstName ||
        hasLastName ||
        hasEmail ||
        hasEmail2 ||
        phoneInputInfo.hasAny ||
        hasPhone2 ||
        hasEmploymentType ||
        hasNote ||
        hasAvatarPath
      ) {
        stmts.updateUserBasics.run(
          nextUsername,
          nextRole,
          nextIsActive ? 1 : 0,
          nextDisplayName,
          nextFirstName,
          nextLastName,
          nextEmail,
          nextEmail2,
          nextMobilePhone,
          nextOfficePhone,
          nextPhone,
          nextEmploymentType,
          nextNote,
          nextAvatarPath,
          now,
          userId
        );
      }
      if (hasPassword) {
        stmts.updateUserPassword.run(
          hashPassword(nextPassword, pbkdf2Iters),
          nextMustChangePassword ? 1 : 0,
          now,
          userId
        );
      }
      if (!hasPassword && (hasMustChangePassword || hasFailedLoginCount || hasLockedUntil)) {
        stmts.updateUserSecurityFlags.run(
          nextMustChangePassword ? 1 : 0,
          nextFailedLoginCount,
          nextLockedUntil,
          now,
          userId
        );
      }
      if (hasTimezone || hasLanguage || notificationPrefsInput.hasAny) {
        stmts.upsertUserPreferences.run(
          userId,
          nextTimezone,
          nextLanguage,
          nextNotificationPreferencesJson,
          now,
          now
        );
      }
      if (hasIsActive && nextIsActive === false) {
        stmts.revokeSessionsByUserId.run(now, now, userId);
      }
    });
    tx();
  } catch (err) {
    const msg = String(err?.message || '');
    if (/unique/i.test(msg)) {
      sendJSON(res, 409, { ok: false, error: 'username_exists' });
      return true;
    }
    throw err;
  }

  const updated = stmts.findUserById.get(userId);
  audit(
    auth.session.user_id,
    'user_updated',
    {
      targetUserId: userId,
      role: resolveRoleInput(updated?.role, rolesCache, DEFAULT_FALLBACK_ROLE),
      username: String(updated?.username || ''),
      isActive: Number(updated?.is_active) === 1,
      changed: {
        username: hasUsername,
        role: hasRole,
        isActive: hasIsActive,
        displayName: hasDisplayName,
        firstName: hasFirstName,
        lastName: hasLastName,
        email: hasEmail,
        email2: hasEmail2,
        phone: phoneInputInfo.hasAny || hasPhone2,
        mobilePhone: phoneInputInfo.hasLegacyMobile,
        officePhone: phoneInputInfo.hasLegacyOffice || hasPhone2,
        employmentType: hasEmploymentType,
        note: hasNote,
        avatarPath: hasAvatarPath,
        mustChangePassword: hasMustChangePassword,
        failedLoginCount: hasFailedLoginCount,
        lockedUntil: hasLockedUntil,
        timezone: hasTimezone,
        language: hasLanguage,
        notificationPrefsJson: notificationPrefsInput.hasAny,
        notificationPreferences: notificationPrefsInput.hasLegacy,
        password: hasPassword,
      },
    },
    'user',
    String(userId)
  );
  if (typeof emitUserSyncUpsert === 'function' && updated) {
    try {
      emitUserSyncUpsert(updated, {
        actorUserId: auth.session.user_id,
        reason: 'user_updated',
      });
    } catch {}
  }
  sendJSON(res, 200, { ok: true, user: buildUserAdminPayload(updated, rolesCache) });
  return true;
}

module.exports = {
  handlePostprodUserUpdateRoutes,
};
