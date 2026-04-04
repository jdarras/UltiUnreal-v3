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
    buildBrokerConnectivitySnapshot,
    requestTransportSecure,
    clientCertVerified,
    clientCertAccepted,
    clientCertSource,
    clientCertSubject,
    clientCertIssuer,
    clientCertFingerprintSha256,
    clientCertPolicyReason,
    nowIso,
    addSeconds,
    RENDER_WORKER_ONLINE_TTL_SECONDS,
    sweepStaleWorkersAndRequeue,
    stmts,
    resolveRenderDispatchConfig,
    buildRenderDispatchPolicyPayload,
    computeHubConnectivityStatus,
    hubHealthAuditState,
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
  } = options;

  if (!req || !res || !pathname) return false;

  if (isAuthHealthRoute) {
    if (req.method !== 'GET') {
      sendJSON(res, 405, { ok: false, error: 'method_not_allowed' });
      return true;
    }
    const connectivitySnapshot = buildBrokerConnectivitySnapshot({
      requestTransportSecure,
      clientCertVerified,
      clientCertAccepted,
      clientCertSource,
      clientCertSubject,
      clientCertIssuer,
      clientCertFingerprintSha256,
      clientCertPolicyReason,
    });
    sendJSON(res, 200, {
      ok: true,
      dbPath,
      sessionTtlSec,
      ...connectivitySnapshot,
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
    const connectivitySnapshot = buildBrokerConnectivitySnapshot({
      requestTransportSecure,
      clientCertVerified,
      clientCertAccepted,
      clientCertSource,
      clientCertSubject,
      clientCertIssuer,
      clientCertFingerprintSha256,
      clientCertPolicyReason,
    });
    const healthStatus = computeHubConnectivityStatus(connectivitySnapshot);
    if (hubHealthAuditState.signature !== healthStatus.signature) {
      hubHealthAuditState.signature = healthStatus.signature;
      hubHealthAuditState.state = healthStatus.state;
      hubHealthAuditState.kind = healthStatus.kind;
      hubHealthAuditState.changedAt = now;
      audit(auth.session.user_id, 'hub_health_state_changed', {
        state: healthStatus.state,
        kind: healthStatus.kind,
        degradedCount: healthStatus.degradedCount,
        brokerDegradedCount: healthStatus.brokerDegradedCount,
        securityDegradedCount: healthStatus.securityDegradedCount,
        reason: healthStatus.reason,
        secureTransportRequired: connectivitySnapshot?.secureTransportRequired === true,
        secureTransportDetected: connectivitySnapshot?.secureTransportDetected === true,
        clientCertRequired: connectivitySnapshot?.clientCertRequired === true,
        clientCertVerified: connectivitySnapshot?.clientCertVerified === true,
        clientCertAccepted: connectivitySnapshot?.clientCertAccepted === true,
        clientCertPolicyReason: String(connectivitySnapshot?.clientCertPolicyReason || ''),
        clientCertSource: String(connectivitySnapshot?.clientCertSource || ''),
      }, 'health', 'hub');
    }
    sendJSON(res, 200, {
      ok: true,
      health: {
        hubOnline: true,
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
          supportedModes: ['lan', 'vpn', 'broker'],
          recommendedNextMode: 'vpn',
          requestHost: String(req?.headers?.host || '').trim(),
          requestProto: String(req?.headers?.['x-forwarded-proto'] || 'http').trim(),
          ...connectivitySnapshot,
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
