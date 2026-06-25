'use strict';

const crypto = require('crypto');

async function handlePostprodAuthAndHealthRoutes(options = {}) {
  const {
    req,
    res,
    pathname = '',
    isAuthHealthRoute = false,
    parseBody,
    sendJSON,
    requireSession,
    dbPath,
    sessionTtlSec,
    nowIso,
    addSeconds,
    RENDER_WORKER_ONLINE_TTL_SECONDS,
    sweepStaleWorkersAndRequeue,
    stmts,
    resolveRenderDispatchConfig,
    buildRenderDispatchPolicyPayload,
    audit,
    asCount,
    renderDetectedAutoScanBusy,
    renderDetectedScanIntervalMs,
    renderDetectedScanMaxFiles,
    renderDetectedExtensions,
    renderDetectedScanState,
    rolesCache,
    normalizeUsername,
    sanitizeEmail,
    MAX_USERNAME_LEN,
    isValidEmail,
    parseIsoDateOrNull,
    MAX_FAILED_LOGIN_COUNT,
    FAILED_LOGIN_LOCK_SECONDS,
    verifyPassword,
    db,
    getRequestIp,
    buildUserPayload,
    getAuthToken,
    usersSyncFetchLimit,
    isUsersSyncPeerAllowed = () => false,
  } = options;

  if (!req || !res || !pathname) return false;

  if (isAuthHealthRoute) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    sendJSON(res, 200, {
      ok: true,
      dbPath,
      sessionTtlSec,
    });
    return true;
  }

  if (pathname === '/agent/postprod/remote/users-sync/events') {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    if (!isUsersSyncPeerAllowed(req)) {
      sendJSON(res, 403, { ok: false, error: 'users_sync_peer_forbidden' });
      return true;
    }
    const requestUrl = new URL(String(req?.url || ''), 'http://127.0.0.1');
    const sinceRaw = Number(requestUrl.searchParams.get('since'));
    const since = Number.isFinite(sinceRaw) && sinceRaw > 0
      ? Math.trunc(sinceRaw)
      : 0;
    const limitRaw = Number(requestUrl.searchParams.get('limit'));
    const defaultLimit = Number.isFinite(Number(usersSyncFetchLimit))
      ? Math.max(1, Math.trunc(Number(usersSyncFetchLimit)))
      : 250;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.max(1, Math.min(1000, Math.trunc(limitRaw)))
      : Math.max(1, Math.min(1000, defaultLimit));
    const rows = stmts.listUserSyncEventsSinceVersion.all(since, limit);
    const events = Array.isArray(rows)
      ? rows.map((row) => {
        let payload = {};
        try {
          payload = JSON.parse(String(row?.payload_json || '{}'));
          if (!payload || typeof payload !== 'object' || Array.isArray(payload)) payload = {};
        } catch {
          payload = {};
        }
        return {
          version: Number(row?.version || 0),
          sourceStation: String(row?.source_station || '').trim(),
          sourceVersion: Number(row?.source_version || 0),
          opId: String(row?.op_id || '').trim(),
          entityType: String(row?.entity_type || '').trim(),
          entityPublicId: String(row?.entity_public_id || '').trim(),
          entityKey: String(row?.entity_key || '').trim(),
          op: String(row?.op || '').trim(),
          occurredAt: String(row?.occurred_at || '').trim(),
          payload,
        };
      })
      : [];
    const latestRow = stmts.getMaxUserSyncEventVersion.get();
    const latestVersion = Number.isFinite(Number(latestRow?.n))
      ? Math.max(0, Math.trunc(Number(latestRow.n)))
      : 0;
    sendJSON(res, 200, {
      ok: true,
      events,
      latestVersion,
      count: events.length,
    });
    return true;
  }

  if (pathname === '/agent/postprod/health') {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const auth = requireSession(req, res, sendJSON);
    if (!auth) return true;
    const now = nowIso();
    const cutoff = addSeconds(now, -RENDER_WORKER_ONLINE_TTL_SECONDS);
    const staleRequeued = sweepStaleWorkersAndRequeue(now, cutoff, auth.session.user_id);
    const row = stmts.renderHealthSnapshot.get() || {};
    const dispatchConfig = resolveRenderDispatchConfig(stmts);
    sendJSON(res, 200, {
      ok: true,
      health: {
        serverTime: now,
        staleRequeued,
        workers: {
          total: asCount(row.workers_total),
          online: asCount(row.workers_online),
          available: asCount(row.workers_available),
        },
        renders: {
          queued: asCount(row.renders_queued),
          running: asCount(row.renders_running),
          failed: asCount(row.renders_failed),
          done: asCount(row.renders_done),
        },
        renderDetection: {
          auto: true,
          busy: renderDetectedAutoScanBusy === true,
          intervalMs: renderDetectedScanIntervalMs,
          maxFiles: renderDetectedScanMaxFiles,
          extensions: Array.from(renderDetectedExtensions instanceof Set ? renderDetectedExtensions : [])
            .map((ext) => String(ext || '').trim().toLowerCase())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b)),
          lastScan:
            renderDetectedScanState.lastSummary && typeof renderDetectedScanState.lastSummary === 'object'
              ? { ...renderDetectedScanState.lastSummary }
              : null,
        },
        dispatchPolicy: buildRenderDispatchPolicyPayload(dispatchConfig, { includeRules: true }),
        connectivity: {
          supportedModes: ['local', 'lan'],
          requestHost: String(req?.headers?.host || '').trim(),
        },
      },
    });
    return true;
  }

  if (pathname === '/agent/postprod/auth/login') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }

    const body = await parseBody(req);
    const loginInput = String(
      body?.username ?? body?.identifier ?? body?.displayName ?? ''
    ).trim();
    const usernameCandidate = normalizeUsername(loginInput);
    const emailCandidate = sanitizeEmail(loginInput);
    const password = String(body?.password || '');
    if (!loginInput || !password) {
      sendJSON(res, 400, { ok: false, error: 'missing_credentials', message: 'identifiant et password requis' });
      return true;
    }

    let user = null;
    let matchedBy = '';
    if (usernameCandidate && usernameCandidate.length <= MAX_USERNAME_LEN) {
      user = stmts.findUserByUsername.get(usernameCandidate);
      matchedBy = user ? 'username' : '';
    }
    if (!user && isValidEmail(emailCandidate)) {
      const emailCandidates = stmts.findUserIdsByEmail.all(emailCandidate);
      if (Array.isArray(emailCandidates) && emailCandidates.length === 1) {
        const uniqueUserId = Number(emailCandidates[0]?.id || 0);
        if (Number.isFinite(uniqueUserId) && uniqueUserId > 0) {
          user = stmts.findUserById.get(uniqueUserId) || null;
          matchedBy = user ? 'email' : '';
        }
      }
    }
    if (!user) {
      const displayNameCandidates = stmts.findUserIdsByDisplayName.all(loginInput);
      if (Array.isArray(displayNameCandidates) && displayNameCandidates.length === 1) {
        const uniqueUserId = Number(displayNameCandidates[0]?.id || 0);
        if (Number.isFinite(uniqueUserId) && uniqueUserId > 0) {
          user = stmts.findUserById.get(uniqueUserId) || null;
          matchedBy = user ? 'display_name' : '';
        }
      }
    }

    const now = nowIso();
    if (!user || Number(user.is_active) !== 1) {
      audit(null, 'auth_login_failed', {
        username: usernameCandidate || loginInput,
        email: emailCandidate || '',
        loginInput,
        matchedBy,
      });
      sendJSON(res, 401, { ok: false, error: 'invalid_credentials' });
      return true;
    }

    const lockedUntil = parseIsoDateOrNull(user?.locked_until);
    if (lockedUntil && Date.parse(lockedUntil) > Date.parse(now)) {
      audit(user.id, 'auth_login_locked', {
        username: user.username,
        loginInput,
        matchedBy,
        lockedUntil,
      });
      sendJSON(res, 423, { ok: false, error: 'account_locked', lockedUntil });
      return true;
    }

    const passwordOk = verifyPassword(password, user.password_hash);
    if (!passwordOk) {
      const currentFailed = Number.isFinite(Number(user?.failed_login_count))
        ? Math.max(0, Math.trunc(Number(user.failed_login_count)))
        : 0;
      const nextFailed = currentFailed + 1;
      const nextLockedUntil = nextFailed >= MAX_FAILED_LOGIN_COUNT
        ? addSeconds(now, FAILED_LOGIN_LOCK_SECONDS)
        : null;
      stmts.incrementUserFailedLogin.run(nextFailed, nextLockedUntil, now, user.id);
      audit(user.id, 'auth_login_failed', {
        username: user.username,
        loginInput,
        matchedBy,
        failedLoginCount: nextFailed,
        lockedUntil: nextLockedUntil,
      });
      if (nextLockedUntil) {
        sendJSON(res, 423, {
          ok: false,
          error: 'account_locked',
          lockedUntil: nextLockedUntil,
        });
        return true;
      }
      sendJSON(res, 401, { ok: false, error: 'invalid_credentials' });
      return true;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addSeconds(now, sessionTtlSec);
    const ip = getRequestIp(req);
    const userAgent = String(req?.headers?.['user-agent'] || '');

    const tx = db.transaction(() => {
      stmts.insertSession.run(token, user.id, now, expiresAt, now, ip, userAgent);
      stmts.updateUserLastLogin.run(now, now, user.id);
    });
    tx();

    const payloadUser = buildUserPayload({
      ...user,
      user_id2: user.id,
      last_login_at: now,
    }, rolesCache);
    audit(user.id, 'auth_login', { username: user.username, role: payloadUser.role, ip });

    sendJSON(res, 200, {
      ok: true,
      token,
      session: {
        expiresAt,
      },
      user: payloadUser,
    });
    return true;
  }

  if (pathname === '/agent/postprod/auth/logout') {
    if (req.method !== 'POST') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }

    const body = await parseBody(req);
    const token = getAuthToken(req, body?.token);
    if (!token) {
      sendJSON(res, 401, { ok: false, error: 'missing_token' });
      return true;
    }

    const now = nowIso();
    const session = stmts.findActiveSessionByToken.get(token, now);
    const result = stmts.revokeSession.run(now, now, token);
    if (session && Number(result?.changes || 0) > 0) {
      audit(session.user_id, 'auth_logout', { username: session.username });
    }

    sendJSON(res, 200, { ok: true, revoked: Number(result?.changes || 0) > 0 });
    return true;
  }

  return false;
}

module.exports = {
  handlePostprodAuthAndHealthRoutes,
};
