async function handlePostprodUsersRoutes({
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
  buildUserAdminPayload,
  normalizeUsername,
  sanitizeDisplayName,
  sanitizeFirstName,
  sanitizeLastName,
  sanitizeEmail,
  resolvePhoneFromBody,
  sanitizePhone,
  sanitizeEmploymentType,
  sanitizeUserNote,
  sanitizeAvatarPath,
  sanitizeTimezone,
  sanitizeUserLanguage,
  DEFAULT_USER_LANGUAGE,
  resolveNotificationPrefsFromBody,
  MAX_USERNAME_LEN,
  MIN_PASSWORD_LEN,
  isValidEmail,
  isValidAvatarPath,
  buildAutoUsername,
  nowIso,
  buildPublicId,
  hashPassword,
  pbkdf2Iters,
  audit,
  emitUserSyncUpsert,
}) {
  if (pathname !== '/agent/postprod/users') return false;

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

  if (req.method === 'GET') {
    const allUsers = stmts.listUsers.all();
    const users = allUsers
      .filter((row) => {
        const rowRole = resolveRoleInput(row?.role, rolesCache, '');
        if (allowedRolesSet.has(rowRole)) return true;
        return Number(row?.id || 0) === actorId;
      })
      .map((row) => buildUserAdminPayload(row, rolesCache));
    sendJSON(res, 200, { ok: true, users });
    return true;
  }

  if (req.method === 'POST') {
    const body = await parseBody(req);
    const requestedUsername = normalizeUsername(body?.username);
    const password = String(body?.password || '');
    const role = resolveRoleInput(body?.role, rolesCache, '');
    const hasIsActive = Object.prototype.hasOwnProperty.call(body || {}, 'isActive');
    if (hasIsActive && managerPerms.canBanUsers !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_ban_users' });
      return true;
    }
    const isActive = managerPerms.canBanUsers === true ? body?.isActive !== false : true;
    const displayNameInput = sanitizeDisplayName(body?.displayName, '');
    const firstName = sanitizeFirstName(body?.firstName);
    const lastName = sanitizeLastName(body?.lastName);
    const email = sanitizeEmail(body?.email);
    const email2 = sanitizeEmail(body?.email2);
    const phoneInputInfo = resolvePhoneFromBody(body, '');
    const phone = phoneInputInfo.value;
    const phone2 = sanitizePhone(body?.phone2 ?? body?.officePhone ?? '');
    const mobilePhone = sanitizePhone(phone || phone2 || '');
    const officePhone = sanitizePhone(phone2 || mobilePhone || '');
    const primaryPhone = sanitizePhone(mobilePhone || officePhone || '');
    const rawEmploymentType = String(body?.employmentType || '').trim();
    const employmentType = sanitizeEmploymentType(rawEmploymentType);
    const note = sanitizeUserNote(body?.note);
    const avatarPath = sanitizeAvatarPath(body?.avatarPath);
    const mustChangePassword = body?.mustChangePassword === true;
    const timezone = sanitizeTimezone(body?.timezone);
    const language = sanitizeUserLanguage(body?.language, DEFAULT_USER_LANGUAGE);
    const notificationPrefsInput = resolveNotificationPrefsFromBody(body, '{}');
    const notificationPreferencesJson = notificationPrefsInput.value;

    if (!displayNameInput) {
      sendJSON(res, 400, { ok: false, error: 'missing_display_name' });
      return true;
    }
    if (requestedUsername && requestedUsername.length > MAX_USERNAME_LEN) {
      sendJSON(res, 400, { ok: false, error: 'invalid_username' });
      return true;
    }
    if (!password || password.length < MIN_PASSWORD_LEN) {
      sendJSON(res, 400, { ok: false, error: 'invalid_password' });
      return true;
    }
    if (!role) {
      sendJSON(res, 400, { ok: false, error: 'invalid_role' });
      return true;
    }
    if (!isValidEmail(email)) {
      sendJSON(res, 400, { ok: false, error: 'invalid_email' });
      return true;
    }
    if (!isValidEmail(email2)) {
      sendJSON(res, 400, { ok: false, error: 'invalid_email' });
      return true;
    }
    if (rawEmploymentType && !employmentType) {
      sendJSON(res, 400, { ok: false, error: 'invalid_employment_type' });
      return true;
    }
    if (!isValidAvatarPath(avatarPath)) {
      sendJSON(res, 400, { ok: false, error: 'invalid_avatar_path' });
      return true;
    }
    if (!allowedRolesSet.has(role)) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_role_assignment' });
      return true;
    }

    let username = requestedUsername;
    if (!username) {
      const emailLocalPart = String(email || '').trim().split('@')[0] || '';
      username = buildAutoUsername(stmts, [
        displayNameInput,
        `${firstName} ${lastName}`.trim(),
        emailLocalPart,
      ]);
    }
    if (!username || username.length > MAX_USERNAME_LEN) {
      sendJSON(res, 400, { ok: false, error: 'invalid_username' });
      return true;
    }
    const existingUser = stmts.findUserByUsername.get(username);
    if (existingUser) {
      sendJSON(res, 409, { ok: false, error: 'username_exists' });
      return true;
    }
    const displayName = sanitizeDisplayName(displayNameInput, username);
    const displayNameCandidates = stmts.findUserIdsByDisplayName.all(displayName);
    const displayNameConflict = Array.isArray(displayNameCandidates)
      ? displayNameCandidates.some((row) => Number(row?.id || 0) > 0)
      : false;
    if (displayNameConflict) {
      sendJSON(res, 409, { ok: false, error: 'display_name_exists' });
      return true;
    }
    const now = nowIso();
    let publicId = '';
    do {
      publicId = buildPublicId();
    } while (stmts.findUserByPublicId.get(publicId));
    try {
      const result = stmts.insertUser.run(
        publicId,
        username,
        hashPassword(password, pbkdf2Iters),
        role,
        isActive ? 1 : 0,
        displayName,
        firstName,
        lastName,
        email,
        email2,
        mobilePhone,
        officePhone,
        primaryPhone,
        employmentType,
        note,
        avatarPath,
        mustChangePassword ? 1 : 0,
        0,
        null,
        now,
        now
      );
      const createdId = Number(result?.lastInsertRowid || 0);
      if (Number.isFinite(createdId) && createdId > 0) {
        stmts.upsertUserPreferences.run(
          createdId,
          timezone,
          language,
          notificationPreferencesJson,
          now,
          now
        );
      }
      const created = stmts.findUserById.get(createdId);
      audit(
        auth.session.user_id,
        'user_created',
        {
          targetUserId: Number(created?.id || 0),
          username,
          role,
          isActive,
          firstName,
          lastName,
          email,
          email2,
          publicId,
          phone: primaryPhone,
          phone1: mobilePhone,
          phone2: officePhone,
          employmentType,
          note,
          avatarPath: !!avatarPath,
          mustChangePassword,
          timezone,
          language,
          notificationPrefsJson: notificationPreferencesJson,
        },
        'user',
        String(created?.id || '')
      );
      if (typeof emitUserSyncUpsert === 'function' && created) {
        try { emitUserSyncUpsert(created, { actorUserId: auth.session.user_id, reason: 'user_created' }); } catch {}
      }
      sendJSON(res, 201, { ok: true, user: buildUserAdminPayload(created, rolesCache) });
      return true;
    } catch (err) {
      const msg = String(err?.message || '');
      if (/unique/i.test(msg)) {
        sendJSON(res, 409, { ok: false, error: 'username_exists' });
        return true;
      }
      throw err;
    }
  }

  sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
  return true;
}

module.exports = {
  handlePostprodUsersRoutes,
};
