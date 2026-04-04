'use strict';

async function handlePostprodMeRoutes(options = {}) {
  const {
    req,
    res,
    pathname = '',
    parseBody,
    sendJSON,
    requireSession,
    buildUserPayload,
    rolesCache,
    stmts,
    resolvePhoneFromBody,
    resolveNotificationPrefsFromBody,
    MIN_PASSWORD_LEN,
    sanitizeDisplayName,
    sanitizeFirstName,
    sanitizeLastName,
    sanitizeEmail,
    isValidEmail,
    sanitizePhone,
    sanitizeEmploymentType,
    sanitizeUserNote,
    sanitizeAvatarPath,
    isValidAvatarPath,
    sanitizeTimezone,
    sanitizeUserLanguage,
    DEFAULT_USER_LANGUAGE,
    normalizeNotificationPreferences,
    nowIso,
    db,
    resolveRoleInput,
    DEFAULT_FALLBACK_ROLE,
    hashPassword,
    pbkdf2Iters,
    audit,
  } = options;

  if (!req || !res || pathname !== '/agent/postprod/me') return false;

  const auth = requireSession(req, res, sendJSON);
  if (!auth) return true;

  if (req.method === 'GET') {
    const { session, now } = auth;
    sendJSON(res, 200, {
      ok: true,
      user: buildUserPayload(session, rolesCache),
      session: {
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        lastSeenAt: now,
      },
    });
    return true;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const userId = Number(auth?.session?.user_id || 0);
    const currentUser = stmts.findUserById.get(userId);
    if (!currentUser) {
      sendJSON(res, 404, { ok: false, error: 'user_not_found' });
      return true;
    }

    const body = await parseBody(req);
    const hasUsername = Object.prototype.hasOwnProperty.call(body || {}, 'username');
    const hasPassword = Object.prototype.hasOwnProperty.call(body || {}, 'password');
    const hasDisplayName = Object.prototype.hasOwnProperty.call(body || {}, 'displayName');
    const hasFirstName = Object.prototype.hasOwnProperty.call(body || {}, 'firstName');
    const hasLastName = Object.prototype.hasOwnProperty.call(body || {}, 'lastName');
    const hasEmail = Object.prototype.hasOwnProperty.call(body || {}, 'email');
    const hasEmail2 = Object.prototype.hasOwnProperty.call(body || {}, 'email2');
    const hasEmploymentType = Object.prototype.hasOwnProperty.call(body || {}, 'employmentType');
    const hasNote = Object.prototype.hasOwnProperty.call(body || {}, 'note');
    const hasAvatarPath = Object.prototype.hasOwnProperty.call(body || {}, 'avatarPath');
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
    const hasAny =
      hasUsername ||
      hasPassword ||
      hasDisplayName ||
      hasFirstName ||
      hasLastName ||
      hasEmail ||
      hasEmail2 ||
      phoneInputInfo.hasAny ||
      Object.prototype.hasOwnProperty.call(body || {}, 'phone2') ||
      hasEmploymentType ||
      hasNote ||
      hasAvatarPath ||
      hasTimezone ||
      hasLanguage ||
      notificationPrefsInput.hasAny;
    if (!hasAny) {
      sendJSON(res, 400, { ok: false, error: 'no_changes' });
      return true;
    }
    if (hasUsername) {
      sendJSON(res, 400, { ok: false, error: 'username_read_only' });
      return true;
    }

    const nextUsername = String(currentUser.username || '').trim();
    const nextPassword = hasPassword ? String(body?.password || '') : '';
    if (hasPassword && nextPassword.length < MIN_PASSWORD_LEN) {
      sendJSON(res, 400, { ok: false, error: 'invalid_password' });
      return true;
    }

    let nextDisplayName = String(currentUser.display_name || currentUser.username || '');
    if (hasDisplayName) {
      nextDisplayName = sanitizeDisplayName(body?.displayName, nextUsername || currentUser.username);
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
    if (hasFirstName) nextFirstName = sanitizeFirstName(body?.firstName);
    let nextLastName = String(currentUser.last_name || '');
    if (hasLastName) nextLastName = sanitizeLastName(body?.lastName);
    let nextEmail = String(currentUser.email || '');
    if (hasEmail) nextEmail = sanitizeEmail(body?.email);
    if (!isValidEmail(nextEmail)) {
      sendJSON(res, 400, { ok: false, error: 'invalid_email' });
      return true;
    }
    let nextEmail2 = String(currentUser.email_secondary || '');
    if (hasEmail2) nextEmail2 = sanitizeEmail(body?.email2);
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
    if (hasNote) nextNote = sanitizeUserNote(body?.note);
    let nextAvatarPath = sanitizeAvatarPath(currentUser.avatar_path);
    if (hasAvatarPath) {
      nextAvatarPath = sanitizeAvatarPath(body?.avatarPath);
      if (!isValidAvatarPath(nextAvatarPath)) {
        sendJSON(res, 400, { ok: false, error: 'invalid_avatar_path' });
        return true;
      }
    }
    let nextTimezone = sanitizeTimezone(currentUser.timezone || '');
    if (hasTimezone) nextTimezone = sanitizeTimezone(body?.timezone);
    let nextLanguage = sanitizeUserLanguage(currentUser.language, DEFAULT_USER_LANGUAGE);
    if (hasLanguage) nextLanguage = sanitizeUserLanguage(body?.language, nextLanguage);
    let nextNotificationPreferencesJson = normalizeNotificationPreferences(currentUser.notification_preferences_json);
    if (notificationPrefsInput.hasAny) {
      nextNotificationPreferencesJson = notificationPrefsInput.value;
    }

    const now = nowIso();
    try {
      const tx = db.transaction(() => {
        if (
          hasUsername ||
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
            resolveRoleInput(currentUser.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE,
            Number(currentUser.is_active) === 1 ? 1 : 0,
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
            0,
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
    const refreshedSession = stmts.findActiveSessionByToken.get(auth.token, nowIso());
    audit(
      userId,
      'me_updated',
      {
        changed: {
          username: hasUsername,
          password: hasPassword,
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
          timezone: hasTimezone,
          language: hasLanguage,
          notificationPrefsJson: notificationPrefsInput.hasAny,
          notificationPreferences: notificationPrefsInput.hasLegacy,
        },
      },
      'user',
      String(userId)
    );
    sendJSON(res, 200, {
      ok: true,
      user: buildUserPayload(updated, rolesCache),
      session: refreshedSession
        ? {
          createdAt: refreshedSession.created_at,
          expiresAt: refreshedSession.expires_at,
          lastSeenAt: now,
        }
        : {
          createdAt: auth.session.created_at,
          expiresAt: auth.session.expires_at,
          lastSeenAt: now,
        },
    });
    return true;
  }

  sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
  return true;
}

module.exports = {
  handlePostprodMeRoutes,
};

