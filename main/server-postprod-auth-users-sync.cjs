'use strict';
const crypto = require('crypto');
const os = require('os');
function createUsersSyncHelpers(deps = {}) {
  const {
    stmts,
    db,
    commonServerFile,
    hostsServerFile,
    hostsToList = () => [],
    normalizeHostCandidate = (value) => String(value || '').trim(),
    readCommonServerConfigFile = () => ({}),
    readHostsServerConfigFile = () => [],
    formatHostForHttpUrl = (value) => String(value || '').trim(),
    normalizeAscii = (value) => String(value || '').trim().toLowerCase(),
    normalizeUsername = (value) => String(value || '').trim().toLowerCase(),
    buildAutoUsername = () => '',
    MAX_USERNAME_LEN = 120,
    normalizePublicId = (value) => String(value || '').trim(),
    normalizeRole = (value) => String(value || '').trim(),
    DEFAULT_FALLBACK_ROLE = 'Operateur',
    sanitizeDisplayName = (value) => String(value || '').trim(),
    sanitizeFirstName = (value) => String(value || '').trim(),
    sanitizeLastName = (value) => String(value || '').trim(),
    sanitizeEmail = (value) => String(value || '').trim(),
    sanitizePhone = (value) => String(value || '').trim(),
    sanitizeUserNote = (value) => String(value || '').trim(),
    sanitizeAvatarPath = (value) => String(value || '').trim(),
    MAX_FAILED_LOGIN_COUNT = 10,
    parseIsoDateOrNull = () => '',
    sanitizeTimezone = (value) => String(value || '').trim(),
    sanitizeUserLanguage = (value) => String(value || '').trim(),
    DEFAULT_USER_LANGUAGE = 'fr',
    normalizeNotificationPreferences = () => '{}',
    normalizeRoleRow = () => null,
    normalizeManageableRolesInput = () => [],
    sanitizeRoleKey = (value) => String(value || '').trim(),
    usersSyncFetchLimit = 250,
    usersSyncRemoteTimeoutMs = 3500,
    MIN_USERS_SYNC_REMOTE_TIMEOUT_MS = 1000,
    DEFAULT_USERS_SYNC_REMOTE_TIMEOUT_MS = 3500,
    usersSyncPollIntervalMs = 8000,
    MIN_USERS_SYNC_POLL_INTERVAL_MS = 2000,
    MAX_USERS_SYNC_POLL_INTERVAL_MS = 60000,
    DEFAULT_USERS_SYNC_POLL_INTERVAL_MS = 8000,
    DEFAULT_USERS_SYNC_AGENT_PORT = 4000,
    nowIso = () => new Date().toISOString(),
    safeParseObjectJson = () => ({}),
    refreshRolesCache = () => {},
    logLine = () => {},
  } = deps;

function collectLocalHostCandidates() {
  const out = new Set(['127.0.0.1', 'localhost', '::1']);
  try {
    const interfaces = os.networkInterfaces ? os.networkInterfaces() : {};
    for (const values of Object.values(interfaces || {})) {
      if (!Array.isArray(values)) continue;
      for (const entry of values) {
        if (!entry) continue;
        const candidate = normalizeHostCandidate(entry.address);
        if (!candidate) continue;
        out.add(String(candidate).toLowerCase());
      }
    }
  } catch {}
  return out;
}

function resolveUsersSyncStationIdentity() {
  const common = readCommonServerConfigFile(commonServerFile);
  const hostsRaw = readHostsServerConfigFile(hostsServerFile);
  const hostList = hostsToList(hostsRaw);
  const byIp = new Map();
  for (const host of hostList) {
    const ip = normalizeHostCandidate(host?.ip || host?.address || '');
    if (!ip) continue;
    byIp.set(String(ip).toLowerCase(), {
      ip,
      name: String(host?.name || '').trim(),
    });
  }

  const localHostSet = collectLocalHostCandidates();
  const configuredIp = normalizeHostCandidate(common?.localIp || common?.ip || '');
  if (configuredIp) localHostSet.add(String(configuredIp).toLowerCase());
  const configuredName = String(common?.hostName || common?.stationName || '').trim();

  let stationIp = '';
  if (configuredIp) {
    stationIp = configuredIp;
  } else {
    for (const candidate of localHostSet.values()) {
      if (!candidate || candidate === '127.0.0.1' || candidate === 'localhost' || candidate === '::1') continue;
      if (!byIp.has(candidate)) continue;
      stationIp = String(byIp.get(candidate)?.ip || '').trim();
      if (stationIp) break;
    }
    if (!stationIp) {
      for (const candidate of localHostSet.values()) {
        if (!candidate || candidate === '127.0.0.1' || candidate === 'localhost' || candidate === '::1') continue;
        stationIp = candidate;
        if (stationIp) break;
      }
    }
  }

  let stationName = '';
  if (stationIp) {
    stationName = String(byIp.get(String(stationIp).toLowerCase())?.name || '').trim();
  }
  if (!stationName) stationName = configuredName;
  if (!stationName) stationName = String(os.hostname() || '').trim();
  if (!stationName) stationName = 'Station';

  const stationId = stationIp
    ? stationIp
    : `host:${normalizeAscii(stationName).toLowerCase() || 'unknown'}`;

  if (stationIp) localHostSet.add(String(stationIp).toLowerCase());
  localHostSet.add(String(stationId).toLowerCase());

  return {
    stationId,
    stationIp,
    stationName,
    localHostSet,
  };
}

const usersSyncIdentity = resolveUsersSyncStationIdentity();
let usersSyncSourceVersion = Number(
  stmts.getMaxUserSyncSourceVersionByStation.get(usersSyncIdentity.stationId)?.n || 0
);
if (!Number.isFinite(usersSyncSourceVersion) || usersSyncSourceVersion < 0) {
  usersSyncSourceVersion = 0;
}
const usersSyncRuntimeState = {
  pollTimer: null,
  polling: false,
  peerHealth: new Map(),
  loopFailedFingerprint: '',
  missingPasswordHashSeen: new Set(),
};

function resolveUsersSyncPeerKey(peer, fallback = '') {
  const direct = String(fallback || '').trim();
  if (direct) return direct;
  const stationId = String(peer?.stationId || '').trim();
  if (stationId) return stationId;
  const stationIp = String(peer?.stationIp || peer?.ip || '').trim();
  if (stationIp) return stationIp;
  const stationName = String(peer?.stationName || peer?.name || '').trim();
  return stationName;
}

function resolveUsersSyncPeerLabel(peer, fallback = '') {
  const stationName = String(peer?.stationName || peer?.name || '').trim();
  const stationIp = String(peer?.stationIp || peer?.ip || '').trim();
  const direct = String(fallback || '').trim();
  if (stationName && stationIp) return `${stationName} (${stationIp})`;
  if (stationName) return stationName;
  if (stationIp) return stationIp;
  if (direct) return direct;
  return 'station';
}

function markUsersSyncPeerOffline(peer, peerKey, errorMessage) {
  const key = resolveUsersSyncPeerKey(peer, peerKey);
  if (!key) return;
  const health = usersSyncRuntimeState.peerHealth.get(key) || { online: true };
  if (health.online === false) {
    usersSyncRuntimeState.peerHealth.set(key, {
      ...health,
      lastError: String(errorMessage || '').trim() || 'failed',
      lastSeenAt: nowIso(),
    });
    return;
  }
  usersSyncRuntimeState.peerHealth.set(key, {
    online: false,
    lastError: String(errorMessage || '').trim() || 'failed',
    lastSeenAt: nowIso(),
  });
  logLine({
    level: 'warn',
    src: 'postprod',
    action: 'users_sync_peer_failed',
    message: `Sync users/profils impossible depuis ${resolveUsersSyncPeerLabel(peer, key)}: ${String(errorMessage || 'failed')}`,
  });
}

function markUsersSyncPeerOnline(peer, peerKey) {
  const key = resolveUsersSyncPeerKey(peer, peerKey);
  if (!key) return;
  const health = usersSyncRuntimeState.peerHealth.get(key) || { online: true };
  if (health.online === false) {
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'users_sync_peer_recovered',
      message: `Sync users/profils rétablie avec ${resolveUsersSyncPeerLabel(peer, key)}`,
    });
  }
  usersSyncRuntimeState.peerHealth.set(key, {
    online: true,
    lastError: '',
    lastSeenAt: nowIso(),
  });
}

function nextUsersSyncSourceVersion() {
  usersSyncSourceVersion = Math.max(0, usersSyncSourceVersion) + 1;
  return usersSyncSourceVersion;
}

function normalizeUsersSyncOpId(rawValue, prefix = 'sync') {
  const direct = String(rawValue || '').trim();
  if (direct) return direct;
  try {
    return `${prefix}:${crypto.randomUUID()}`;
  } catch {
    return `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  }
}

function normalizeSyncVersion(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.trunc(n);
}

function normalizeSyncTimestamp(value, fallback = '') {
  const parsed = parseIsoDateOrNull(value);
  if (parsed) return parsed;
  const fallbackParsed = parseIsoDateOrNull(fallback);
  return fallbackParsed || nowIso();
}

function parseSyncPayload(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return safeParseObjectJson(value, {});
}

function safeStringifyAuditPayload(payload) {
  try {
    return JSON.stringify(payload && typeof payload === 'object' ? payload : {});
  } catch {
    return '{}';
  }
}

function insertUsersSyncAudit(action, scopeType, scopeId, payload = {}) {
  try {
    if (!stmts?.insertAudit || typeof stmts.insertAudit.run !== 'function') return;
    stmts.insertAudit.run(
      null,
      String(action || '').trim(),
      String(scopeType || '').trim() || 'sync',
      String(scopeId || '').trim(),
      safeStringifyAuditPayload(payload),
      nowIso()
    );
  } catch {}
}

function auditUsersSyncApply({
  entityType = '',
  op = '',
  scopeId = '',
  sourceStation = '',
  sourceVersion = 0,
  peerId = '',
  reason = '',
  payload = {},
}) {
  const kind = String(entityType || '').trim().toLowerCase();
  const normalizedOp = String(op || '').trim().toLowerCase();
  const action = (() => {
    if (kind === 'user') {
      if (normalizedOp === 'delete') return 'users_sync_user_deleted_applied';
      if (normalizedOp === 'create') return 'users_sync_user_created_applied';
      if (normalizedOp === 'update') return 'users_sync_user_updated_applied';
    }
    if (kind === 'role') {
      if (normalizedOp === 'delete') return 'users_sync_role_deleted_applied';
      if (normalizedOp === 'create') return 'users_sync_role_created_applied';
      if (normalizedOp === 'update') return 'users_sync_role_updated_applied';
    }
    return '';
  })();
  if (!action) return;

  insertUsersSyncAudit(
    action,
    kind === 'role' ? 'role' : 'user',
    String(scopeId || '').trim(),
    {
      ...parseSyncPayload(payload),
      syncApplied: true,
      syncOp: normalizedOp || 'upsert',
      syncEntityType: kind,
      syncReason: String(reason || '').trim(),
      sourceStation: String(sourceStation || '').trim(),
      sourceVersion: normalizeSyncVersion(sourceVersion),
      peerId: String(peerId || '').trim(),
    }
  );
}

function compareSyncFreshness(remoteMeta, localMeta) {
  const remoteTs = Date.parse(String(remoteMeta?.updatedAt || '').trim());
  const localTs = Date.parse(String(localMeta?.updatedAt || '').trim());
  const remoteTsOk = Number.isFinite(remoteTs);
  const localTsOk = Number.isFinite(localTs);
  if (remoteTsOk && localTsOk && remoteTs !== localTs) return remoteTs > localTs ? 1 : -1;
  if (remoteTsOk && !localTsOk) return 1;
  if (!remoteTsOk && localTsOk) return -1;

  const remoteStation = String(remoteMeta?.sourceStation || '').trim().toLowerCase();
  const localStation = String(localMeta?.sourceStation || '').trim().toLowerCase();
  const remoteVersion = normalizeSyncVersion(remoteMeta?.sourceVersion);
  const localVersion = normalizeSyncVersion(localMeta?.sourceVersion);
  if (remoteStation && localStation && remoteStation === localStation && remoteVersion !== localVersion) {
    return remoteVersion > localVersion ? 1 : -1;
  }
  if (remoteVersion !== localVersion) return remoteVersion > localVersion ? 1 : -1;
  const stationCmp = remoteStation.localeCompare(localStation);
  if (stationCmp !== 0) return stationCmp > 0 ? 1 : -1;
  return 0;
}

function normalizeSyncUsername(baseValue, publicId, seedValues = []) {
  let base = normalizeUsername(baseValue);
  if (!base) {
    base = buildAutoUsername(stmts, seedValues);
  }
  if (!base) {
    const suffix = String(publicId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase() || 'user';
    base = `user_${suffix}`;
  }
  base = normalizeUsername(base) || 'user';
  if (base.length > MAX_USERNAME_LEN) base = base.slice(0, MAX_USERNAME_LEN);

  let candidate = base;
  const pid = String(publicId || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase() || 'u';
  let attempt = 0;
  while (attempt < 25) {
    const conflict = stmts.findUserByUsernameExcludingPublicId.get(candidate, publicId);
    if (!conflict) return candidate;
    attempt += 1;
    const suffix = attempt === 1 ? `_${pid.slice(0, 6)}` : `_${pid.slice(0, 4)}${attempt}`;
    const maxBaseLen = Math.max(1, MAX_USERNAME_LEN - suffix.length);
    candidate = normalizeUsername(`${base.slice(0, maxBaseLen)}${suffix}`) || `user_${pid.slice(0, 4)}${attempt}`;
    if (candidate.length > MAX_USERNAME_LEN) candidate = candidate.slice(0, MAX_USERNAME_LEN);
  }
  return candidate.slice(0, MAX_USERNAME_LEN);
}

function normalizeSyncBool(value, fallback = false) {
  if (value === true || value === false) return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback === true;
  if (raw === 'true' || raw === 'yes' || raw === 'oui' || raw === 'on') return true;
  if (raw === 'false' || raw === 'no' || raw === 'non' || raw === 'off') return false;
  return fallback === true;
}

function normalizeSyncInteger(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isFinite(n)) return Math.max(min, Math.min(max, Math.trunc(Number(fallback) || 0)));
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function buildUserSyncPayload(userRow) {
  const row = userRow && typeof userRow === 'object' ? userRow : {};
  return {
    publicId: normalizePublicId(row.public_id || row.publicId || '') || '',
    username: normalizeUsername(row.username || ''),
    passwordHash: String(row.password_hash || row.passwordHash || '').trim(),
    role: normalizeRole(row.role, DEFAULT_FALLBACK_ROLE),
    isActive: Number(row.is_active) === 1 || row.isActive === true,
    displayName: sanitizeDisplayName(row.display_name ?? row.displayName, row.username || ''),
    firstName: sanitizeFirstName(row.first_name ?? row.firstName),
    lastName: sanitizeLastName(row.last_name ?? row.lastName),
    email: sanitizeEmail(row.email),
    email2: sanitizeEmail(row.email_secondary ?? row.email2),
    mobilePhone: sanitizePhone(row.mobile_phone ?? row.mobilePhone),
    officePhone: sanitizePhone(row.office_phone ?? row.officePhone),
    phone: sanitizePhone(row.phone || row.mobile_phone || row.office_phone || row.mobilePhone || row.officePhone || ''),
    note: sanitizeUserNote(row.user_note ?? row.note),
    avatarPath: sanitizeAvatarPath(row.avatar_path ?? row.avatarPath),
    mustChangePassword: Number(row.must_change_password) === 1 || row.mustChangePassword === true,
    failedLoginCount: normalizeSyncInteger(row.failed_login_count ?? row.failedLoginCount, 0, 0, MAX_FAILED_LOGIN_COUNT),
    lockedUntil: parseIsoDateOrNull(row.locked_until ?? row.lockedUntil) || null,
    timezone: sanitizeTimezone(row.timezone),
    language: sanitizeUserLanguage(row.language, DEFAULT_USER_LANGUAGE),
    notificationPrefsJson: normalizeNotificationPreferences(
      row.notification_preferences_json
        ?? row.notificationPrefsJson
        ?? row.notificationPreferencesJson
        ?? row.notificationPreferences
    ),
    createdAt: normalizeSyncTimestamp(row.created_at ?? row.createdAt, nowIso()),
    updatedAt: normalizeSyncTimestamp(row.updated_at ?? row.updatedAt, nowIso()),
    lastLoginAt: parseIsoDateOrNull(row.last_login_at ?? row.lastLoginAt) || null,
    sourceStation: String(row.last_source_station ?? row.lastSourceStation ?? '').trim(),
    sourceVersion: normalizeSyncVersion(row.last_source_version ?? row.lastSourceVersion),
  };
}

function buildRoleSyncPayload(roleRow) {
  const normalized = normalizeRoleRow(roleRow) || normalizeRoleRow({});
  if (!normalized || !normalized.key) return null;
  return {
    key: normalized.key,
    displayName: normalized.displayName,
    note: normalized.note,
    canUseLiveMode: normalized.canUseLiveMode === true,
    canUsePostprodMode: normalized.canUsePostprodMode === true,
    canValidate: normalized.canValidate === true,
    canSyncScenes: normalized.canSyncScenes === true,
    canManageUsers: normalized.canManageUsers === true,
    canManageRoles: normalized.canManageRoles === true,
    canManageForms: normalized.canManageForms === true,
    canManageMachines: normalized.canManageMachines === true,
    canManageConfiguration: normalized.canManageConfiguration === true,
    canBanUsers: normalized.canBanUsers === true,
    canManageProjectPermissions: normalized.canManageProjectPermissions === true,
    canLaunchLiveProjects: normalized.canLaunchLiveProjects === true,
    canLaunchProjects: normalized.canLaunchProjects === true,
    canLaunchRenders: normalized.canLaunchRenders === true,
    canViewResources: normalized.canViewResources === true,
    canCreateTasks: normalized.canCreateTasks === true,
    canAssignRenderRequests: normalized.canAssignRenderRequests === true,
    canEditProjects: normalized.canEditProjects === true,
    canManageLayouts: normalized.canManageLayouts === true,
    manageableRoles: normalizeManageableRolesInput(normalized.manageableRoles),
    isSystem: normalized.isSystem === true,
    createdAt: normalizeSyncTimestamp(normalized.createdAt, nowIso()),
    updatedAt: normalizeSyncTimestamp(normalized.updatedAt, nowIso()),
    sourceStation: String(normalized.lastSourceStation || '').trim(),
    sourceVersion: normalizeSyncVersion(normalized.lastSourceVersion),
  };
}

function insertUsersSyncEventRecord({
  entityType = '',
  entityPublicId = '',
  entityKey = '',
  op = 'upsert',
  payload = {},
  sourceStation = '',
  sourceVersion = 0,
  opId = '',
  occurredAt = '',
} = {}) {
  const normalizedEntityType = String(entityType || '').trim();
  if (!normalizedEntityType) return null;
  const normalizedOp = String(op || '').trim() || 'upsert';
  const normalizedSourceStation = String(sourceStation || usersSyncIdentity.stationId || '').trim();
  if (!normalizedSourceStation) return null;
  const normalizedOccurredAt = normalizeSyncTimestamp(occurredAt, nowIso());
  const normalizedOpId = normalizeUsersSyncOpId(opId, `${normalizedEntityType}_${normalizedOp}`);
  const existingByOpId = stmts.findUserSyncEventByOpId.get(normalizedOpId);
  if (existingByOpId) {
    return {
      duplicate: true,
      version: normalizeSyncVersion(existingByOpId.version),
      sourceStation: String(existingByOpId.source_station || normalizedSourceStation).trim(),
      sourceVersion: normalizeSyncVersion(existingByOpId.source_version),
      opId: normalizedOpId,
    };
  }
  const nextSourceVersion = normalizeSyncVersion(sourceVersion) > 0
    ? normalizeSyncVersion(sourceVersion)
    : nextUsersSyncSourceVersion();
  let payloadJson = '{}';
  try {
    payloadJson = JSON.stringify(
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : {}
    );
  } catch {
    payloadJson = '{}';
  }
  const runRes = stmts.insertUserSyncEvent.run(
    normalizedOpId,
    normalizedSourceStation,
    nextSourceVersion,
    normalizedEntityType,
    normalizePublicId(entityPublicId),
    sanitizeRoleKey(entityKey, ''),
    normalizedOp,
    payloadJson,
    normalizedOccurredAt
  );
  return {
    duplicate: false,
    version: Number.isFinite(Number(runRes?.lastInsertRowid))
      ? Math.max(0, Math.trunc(Number(runRes.lastInsertRowid)))
      : 0,
    sourceStation: normalizedSourceStation,
    sourceVersion: nextSourceVersion,
    opId: normalizedOpId,
    occurredAt: normalizedOccurredAt,
  };
}

function emitUserSyncUpsert(userRow, meta = {}) {
  const payload = buildUserSyncPayload(userRow);
  if (!payload.publicId) return null;
  const actorUserId = Number(meta?.actorUserId || 0);
  const now = nowIso();
  const eventPayload = {
    ...payload,
    sourceStation: usersSyncIdentity.stationId,
    actorUserId: Number.isFinite(actorUserId) && actorUserId > 0 ? actorUserId : null,
    reason: String(meta?.reason || '').trim() || 'user_upsert',
    emittedAt: now,
  };
  const result = insertUsersSyncEventRecord({
    entityType: 'user',
    entityPublicId: payload.publicId,
    entityKey: '',
    op: 'upsert',
    payload: eventPayload,
    sourceStation: usersSyncIdentity.stationId,
    sourceVersion: 0,
    opId: meta?.opId,
    occurredAt: payload.updatedAt || now,
  });
  return result;
}

function emitUserSyncDelete(userRow, meta = {}) {
  const row = userRow && typeof userRow === 'object' ? userRow : {};
  const publicId = normalizePublicId(row.public_id || row.publicId || '');
  if (!publicId) return null;
  const now = nowIso();
  const opId = normalizeUsersSyncOpId(meta?.opId, 'user_delete');
  const payload = {
    publicId,
    username: normalizeUsername(row.username || ''),
    updatedAt: now,
    deletedAt: now,
    sourceStation: usersSyncIdentity.stationId,
    sourceVersion: 0,
    actorUserId: Number.isFinite(Number(meta?.actorUserId)) ? Number(meta.actorUserId) : null,
    reason: String(meta?.reason || '').trim() || 'user_delete',
  };
  stmts.upsertUserTombstone.run(
    publicId,
    now,
    usersSyncIdentity.stationId,
    opId,
    JSON.stringify(payload),
    now
  );
  const result = insertUsersSyncEventRecord({
    entityType: 'user',
    entityPublicId: publicId,
    entityKey: '',
    op: 'delete',
    payload,
    sourceStation: usersSyncIdentity.stationId,
    sourceVersion: 0,
    opId,
    occurredAt: now,
  });
  return result;
}

function emitRoleSyncUpsert(roleRow, meta = {}) {
  const payload = buildRoleSyncPayload(roleRow);
  if (!payload || !payload.key) return null;
  const actorUserId = Number(meta?.actorUserId || 0);
  const eventPayload = {
    ...payload,
    sourceStation: usersSyncIdentity.stationId,
    actorUserId: Number.isFinite(actorUserId) && actorUserId > 0 ? actorUserId : null,
    reason: String(meta?.reason || '').trim() || 'role_upsert',
    emittedAt: nowIso(),
  };
  const result = insertUsersSyncEventRecord({
    entityType: 'role',
    entityPublicId: '',
    entityKey: payload.key,
    op: 'upsert',
    payload: eventPayload,
    sourceStation: usersSyncIdentity.stationId,
    sourceVersion: 0,
    opId: meta?.opId,
    occurredAt: payload.updatedAt || nowIso(),
  });
  return result;
}

function resolveUsersSyncAgentPort() {
  const common = readCommonServerConfigFile(commonServerFile);
  const raw = Number(common?.agentPort ?? process.env.UU_AGENT_PORT ?? DEFAULT_USERS_SYNC_AGENT_PORT);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_USERS_SYNC_AGENT_PORT;
  return Math.max(1, Math.trunc(raw));
}

function listUsersSyncPeers() {
  const hostsRaw = readHostsServerConfigFile(hostsServerFile);
  const hostList = hostsToList(hostsRaw);
  const commonPort = resolveUsersSyncAgentPort();
  const peers = [];
  const seen = new Set();

  const addPeer = (peer) => {
    const stationIp = normalizeHostCandidate(peer?.ip || peer?.address || peer?.stationIp || '');
    if (!stationIp) return;
    const stationIpKey = stationIp.toLowerCase();
    if (usersSyncIdentity.localHostSet.has(stationIpKey)) return;
    if (seen.has(stationIpKey)) return;
    seen.add(stationIpKey);
    const stationName = String(peer?.name || peer?.stationName || stationIp).trim() || stationIp;
    const portRaw = Number(peer?.agentPort ?? peer?.agent_port ?? commonPort);
    const agentPort = Number.isFinite(portRaw) && portRaw > 0
      ? Math.max(1, Math.trunc(portRaw))
      : commonPort;
    peers.push({
      stationId: stationIp,
      stationIp,
      stationName,
      agentPort,
    });
  };

  for (const host of hostList) {
    addPeer(host);
  }

  peers.sort((a, b) => String(a.stationName || '').localeCompare(String(b.stationName || '')));
  return peers;
}

async function fetchUsersSyncEventsFromPeer(peer, sinceVersion = 0) {
  const stationIp = normalizeHostCandidate(peer?.stationIp || peer?.stationId || '');
  if (!stationIp) {
    return { ok: false, error: 'invalid_peer_ip', events: [], latestVersion: normalizeSyncVersion(sinceVersion) };
  }
  const agentPort = Number.isFinite(Number(peer?.agentPort)) && Number(peer.agentPort) > 0
    ? Math.max(1, Math.trunc(Number(peer.agentPort)))
    : resolveUsersSyncAgentPort();
  const formattedHost = formatHostForHttpUrl(stationIp);
  if (!formattedHost) {
    return { ok: false, error: 'invalid_peer_host', events: [], latestVersion: normalizeSyncVersion(sinceVersion) };
  }
  const params = new URLSearchParams();
  params.set('since', String(Math.max(0, normalizeSyncVersion(sinceVersion))));
  params.set('limit', String(usersSyncFetchLimit));
  const requestUrl = `http://${formattedHost}:${agentPort}/agent/postprod/remote/users-sync/events?${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    try { controller.abort(); } catch {}
  }, Math.max(MIN_USERS_SYNC_REMOTE_TIMEOUT_MS, Math.trunc(Number(usersSyncRemoteTimeoutMs) || DEFAULT_USERS_SYNC_REMOTE_TIMEOUT_MS)));
  if (typeof timeout?.unref === 'function') timeout.unref();

  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed = {};
    try {
      parsed = JSON.parse(text || '{}');
    } catch {
      parsed = {};
    }
    if (!response.ok || parsed?.ok !== true) {
      return {
        ok: false,
        status: Number(response?.status || 0),
        error: String(parsed?.error || parsed?.message || `http_${Number(response?.status || 0)}`),
        events: [],
        latestVersion: normalizeSyncVersion(sinceVersion),
      };
    }
    const events = Array.isArray(parsed?.events) ? parsed.events : [];
    return {
      ok: true,
      events,
      latestVersion: normalizeSyncVersion(parsed?.latestVersion),
    };
  } catch (err) {
    return {
      ok: false,
      error: String(err?.name === 'AbortError' ? 'timeout' : (err?.message || err || 'fetch_failed')),
      events: [],
      latestVersion: normalizeSyncVersion(sinceVersion),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function applyUsersSyncEvent(event, peer = {}) {
  const rawVersion = normalizeSyncVersion(event?.version);
  const sourceStation = String(
    event?.sourceStation
    || event?.source_station
    || peer?.stationId
    || peer?.stationIp
    || ''
  ).trim();
  const normalizedSourceStation = sourceStation || String(peer?.stationId || peer?.stationIp || '').trim();
  if (!normalizedSourceStation) {
    return { ok: false, applied: false, reason: 'missing_source_station', version: rawVersion };
  }
  if (usersSyncIdentity.localHostSet.has(normalizedSourceStation.toLowerCase())) {
    return { ok: true, applied: false, reason: 'self_source', version: rawVersion };
  }
  const opId = normalizeUsersSyncOpId(event?.opId || event?.op_id, 'remote');
  const existingByOpId = stmts.findUserSyncEventByOpId.get(opId);
  if (existingByOpId) {
    return { ok: true, applied: false, duplicate: true, reason: 'duplicate_op_id', version: rawVersion };
  }
  const sourceVersion = normalizeSyncVersion(event?.sourceVersion ?? event?.source_version) > 0
    ? normalizeSyncVersion(event?.sourceVersion ?? event?.source_version)
    : rawVersion;
  const occurredAt = normalizeSyncTimestamp(event?.occurredAt ?? event?.occurred_at, nowIso());
  const entityType = String(event?.entityType || event?.entity_type || '').trim().toLowerCase();
  const entityPublicId = normalizePublicId(event?.entityPublicId || event?.entity_public_id || '');
  const entityKey = sanitizeRoleKey(event?.entityKey || event?.entity_key || '', '');
  const op = String(event?.op || '').trim().toLowerCase() || 'upsert';
  const payload = parseSyncPayload(event?.payload);

  const inserted = insertUsersSyncEventRecord({
    entityType,
    entityPublicId,
    entityKey,
    op,
    payload,
    sourceStation: normalizedSourceStation,
    sourceVersion,
    opId,
    occurredAt,
  });
  const effectiveSourceVersion = normalizeSyncVersion(inserted?.sourceVersion || sourceVersion || rawVersion);
  const effectiveSourceStation = String(inserted?.sourceStation || normalizedSourceStation).trim();
  const remoteUpdatedAt = normalizeSyncTimestamp(payload?.updatedAt, occurredAt);

  if (entityType === 'user') {
    const publicId = normalizePublicId(payload?.publicId || entityPublicId || '');
    if (!publicId) {
      return { ok: true, applied: false, reason: 'missing_public_id', version: rawVersion };
    }

    if (op === 'delete') {
      const deletedAt = normalizeSyncTimestamp(payload?.deletedAt || payload?.updatedAt, occurredAt);
      const tombPayload = {
        publicId,
        username: normalizeUsername(payload?.username || ''),
        deletedAt,
        updatedAt: deletedAt,
        sourceStation: effectiveSourceStation,
        sourceVersion: effectiveSourceVersion,
      };
      const current = stmts.findUserByPublicIdFull.get(publicId);
      const localMeta = current
        ? {
          updatedAt: String(current?.updated_at || ''),
          sourceStation: String(current?.last_source_station || ''),
          sourceVersion: normalizeSyncVersion(current?.last_source_version),
        }
        : null;
      const remoteMeta = {
        updatedAt: deletedAt,
        sourceStation: effectiveSourceStation,
        sourceVersion: effectiveSourceVersion,
      };
      if (localMeta && compareSyncFreshness(remoteMeta, localMeta) < 0) {
        stmts.upsertUserTombstone.run(
          publicId,
          deletedAt,
          effectiveSourceStation,
          opId,
          JSON.stringify(tombPayload),
          nowIso()
        );
        return { ok: true, applied: false, reason: 'stale_delete', version: rawVersion };
      }
      if (current) {
        try {
          stmts.deleteUserByPublicId.run(publicId);
        } catch (err) {
          if (/foreign key/i.test(String(err?.message || ''))) {
            // Soft-delete fallback when linked rows prevent physical delete.
            const softUpdatedAt = deletedAt;
            const syncUsername = normalizeSyncUsername(
              current?.username,
              publicId,
              [current?.display_name, current?.first_name, current?.last_name]
            );
            stmts.updateUserFromSyncByPublicId.run(
              syncUsername,
              String(current?.password_hash || ''),
              normalizeRole(current?.role, DEFAULT_FALLBACK_ROLE),
              0,
              sanitizeDisplayName(current?.display_name, syncUsername),
              sanitizeFirstName(current?.first_name),
              sanitizeLastName(current?.last_name),
              sanitizeEmail(current?.email),
              sanitizeEmail(current?.email_secondary),
              sanitizePhone(current?.mobile_phone),
              sanitizePhone(current?.office_phone),
              sanitizePhone(current?.phone || current?.mobile_phone || current?.office_phone || ''),
              sanitizeUserNote(current?.user_note),
              sanitizeAvatarPath(current?.avatar_path),
              Number(current?.must_change_password) === 1 ? 1 : 0,
              normalizeSyncInteger(current?.failed_login_count, 0, 0, MAX_FAILED_LOGIN_COUNT),
              parseIsoDateOrNull(current?.locked_until) || null,
              softUpdatedAt,
              parseIsoDateOrNull(current?.last_login_at) || null,
              effectiveSourceStation,
              effectiveSourceVersion,
              publicId
            );
          } else {
            throw err;
          }
        }
      }
      stmts.upsertUserTombstone.run(
        publicId,
        deletedAt,
        effectiveSourceStation,
        opId,
        JSON.stringify(tombPayload),
        nowIso()
      );
      auditUsersSyncApply({
        entityType: 'user',
        op: 'delete',
        scopeId: publicId,
        sourceStation: effectiveSourceStation,
        sourceVersion: effectiveSourceVersion,
        peerId: peer?.stationId || peer?.stationIp || '',
        reason: 'user_deleted',
        payload: {
          publicId,
          username: tombPayload.username || normalizeUsername(current?.username || ''),
          displayName: sanitizeDisplayName(payload?.displayName, current?.display_name || tombPayload.username || ''),
          role: normalizeRole(payload?.role || current?.role || DEFAULT_FALLBACK_ROLE, DEFAULT_FALLBACK_ROLE),
          deletedAt,
        },
      });
      return { ok: true, applied: true, reason: 'user_deleted', version: rawVersion };
    }

    const tombstone = stmts.findUserTombstoneByPublicId.get(publicId);
    if (tombstone) {
      const tombPayload = parseSyncPayload(tombstone.payload_json);
      const tombMeta = {
        updatedAt: normalizeSyncTimestamp(
          tombPayload?.updatedAt || tombPayload?.deletedAt || tombstone?.deleted_at,
          tombstone?.updated_at || occurredAt
        ),
        sourceStation: String(tombstone?.source_station || tombPayload?.sourceStation || '').trim(),
        sourceVersion: normalizeSyncVersion(tombPayload?.sourceVersion || 0),
      };
      const remoteMeta = {
        updatedAt: remoteUpdatedAt,
        sourceStation: effectiveSourceStation,
        sourceVersion: effectiveSourceVersion,
      };
      if (compareSyncFreshness(remoteMeta, tombMeta) <= 0) {
        return { ok: true, applied: false, reason: 'blocked_by_tombstone', version: rawVersion };
      }
    }

    const current = stmts.findUserByPublicIdFull.get(publicId);
    const localMeta = current
      ? {
        updatedAt: String(current?.updated_at || ''),
        sourceStation: String(current?.last_source_station || ''),
        sourceVersion: normalizeSyncVersion(current?.last_source_version),
      }
      : null;
    const remoteMeta = {
      updatedAt: remoteUpdatedAt,
      sourceStation: effectiveSourceStation,
      sourceVersion: effectiveSourceVersion,
    };
    if (localMeta && compareSyncFreshness(remoteMeta, localMeta) < 0) {
      return { ok: true, applied: false, reason: 'stale_user_upsert', version: rawVersion };
    }

    const payloadObject = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
    const hasPayloadField = (field) => Object.prototype.hasOwnProperty.call(payloadObject, field);
    const pickPayloadValue = (field, fallbackValue) => (
      hasPayloadField(field) ? payloadObject[field] : fallbackValue
    );

    const seedValues = [
      pickPayloadValue('username', ''),
      pickPayloadValue('displayName', ''),
      pickPayloadValue('firstName', ''),
      pickPayloadValue('lastName', ''),
      current?.username,
    ];
    const username = normalizeSyncUsername(
      pickPayloadValue('username', current?.username || ''),
      publicId,
      seedValues
    );
    const passwordHash = String(
      pickPayloadValue('passwordHash', current?.password_hash || '')
    ).trim();
    if (!passwordHash) {
      if (!usersSyncRuntimeState.missingPasswordHashSeen.has(publicId)) {
        usersSyncRuntimeState.missingPasswordHashSeen.add(publicId);
        logLine({
          level: 'warn',
          src: 'postprod',
          action: 'users_sync_user_missing_password_hash',
          message: `Sync user ignoree (passwordHash manquant): ${publicId}`,
        });
      }
      return { ok: true, applied: false, reason: 'missing_password_hash', version: rawVersion };
    }

    const role = normalizeRole(
      pickPayloadValue('role', current?.role || DEFAULT_FALLBACK_ROLE),
      DEFAULT_FALLBACK_ROLE
    );
    const currentIsActive = current ? Number(current?.is_active) === 1 : true;
    const isActive = normalizeSyncBool(pickPayloadValue('isActive', currentIsActive), currentIsActive);
    const displayName = sanitizeDisplayName(
      pickPayloadValue('displayName', current?.display_name),
      username
    );
    const firstName = sanitizeFirstName(pickPayloadValue('firstName', current?.first_name));
    const lastName = sanitizeLastName(pickPayloadValue('lastName', current?.last_name));
    const email = sanitizeEmail(pickPayloadValue('email', current?.email));
    const email2 = sanitizeEmail(
      hasPayloadField('email2')
        ? payloadObject.email2
        : (hasPayloadField('emailSecondary') ? payloadObject.emailSecondary : current?.email_secondary)
    );
    const mobilePhoneRaw = hasPayloadField('mobilePhone')
      ? payloadObject.mobilePhone
      : (hasPayloadField('phone1') ? payloadObject.phone1 : current?.mobile_phone);
    const officePhoneRaw = hasPayloadField('officePhone')
      ? payloadObject.officePhone
      : (hasPayloadField('phone2') ? payloadObject.phone2 : current?.office_phone);
    const mobilePhone = sanitizePhone(mobilePhoneRaw);
    const officePhone = sanitizePhone(officePhoneRaw);
    const unifiedPhone = sanitizePhone(
      hasPayloadField('phone')
        ? payloadObject.phone
        : (
          mobilePhoneRaw
          || officePhoneRaw
          || current?.phone
          || current?.mobile_phone
          || current?.office_phone
          || ''
        )
    );
    const note = sanitizeUserNote(
      hasPayloadField('note')
        ? payloadObject.note
        : (hasPayloadField('userNote') ? payloadObject.userNote : current?.user_note)
    );
    const avatarPath = sanitizeAvatarPath(pickPayloadValue('avatarPath', current?.avatar_path));
    const currentMustChangePassword = current ? Number(current?.must_change_password) === 1 : false;
    const mustChangePassword = normalizeSyncBool(
      pickPayloadValue('mustChangePassword', currentMustChangePassword),
      currentMustChangePassword
    );
    const currentFailedLoginCount = current
      ? normalizeSyncInteger(current?.failed_login_count, 0, 0, MAX_FAILED_LOGIN_COUNT)
      : 0;
    const failedLoginCount = normalizeSyncInteger(
      pickPayloadValue('failedLoginCount', currentFailedLoginCount),
      currentFailedLoginCount,
      0,
      MAX_FAILED_LOGIN_COUNT
    );
    const currentLockedUntil = parseIsoDateOrNull(current?.locked_until) || null;
    const lockedUntil = parseIsoDateOrNull(pickPayloadValue('lockedUntil', currentLockedUntil)) || null;
    const createdAt = normalizeSyncTimestamp(
      pickPayloadValue('createdAt', current?.created_at || occurredAt),
      current?.created_at || occurredAt
    );
    const updatedAt = normalizeSyncTimestamp(pickPayloadValue('updatedAt', occurredAt), occurredAt);
    const lastLoginAt = parseIsoDateOrNull(
      pickPayloadValue('lastLoginAt', current?.last_login_at)
    ) || null;
    const timezone = sanitizeTimezone(pickPayloadValue('timezone', current?.timezone));
    const currentLanguage = sanitizeUserLanguage(current?.language, DEFAULT_USER_LANGUAGE);
    const language = sanitizeUserLanguage(
      pickPayloadValue('language', currentLanguage),
      DEFAULT_USER_LANGUAGE
    );
    const notificationPrefsRaw = hasPayloadField('notificationPrefsJson')
      ? payloadObject.notificationPrefsJson
      : (
        hasPayloadField('notificationPreferencesJson')
          ? payloadObject.notificationPreferencesJson
          : (
            hasPayloadField('notification_preferences_json')
              ? payloadObject.notification_preferences_json
              : current?.notification_preferences_json
          )
      );
    const notificationPrefsJson = normalizeNotificationPreferences(notificationPrefsRaw);

    if (!current) {
      stmts.insertUserFromSync.run(
        publicId,
        username,
        passwordHash,
        role,
        isActive ? 1 : 0,
        displayName,
        firstName,
        lastName,
        email,
        email2,
        mobilePhone,
        officePhone,
        unifiedPhone,
        note,
        avatarPath,
        mustChangePassword ? 1 : 0,
        failedLoginCount,
        lockedUntil,
        createdAt,
        updatedAt,
        lastLoginAt,
        effectiveSourceStation,
        effectiveSourceVersion
      );
    } else {
      stmts.updateUserFromSyncByPublicId.run(
        username,
        passwordHash,
        role,
        isActive ? 1 : 0,
        displayName,
        firstName,
        lastName,
        email,
        email2,
        mobilePhone,
        officePhone,
        unifiedPhone,
        note,
        avatarPath,
        mustChangePassword ? 1 : 0,
        failedLoginCount,
        lockedUntil,
        updatedAt,
        lastLoginAt,
        effectiveSourceStation,
        effectiveSourceVersion,
        publicId
      );
    }
    const fresh = stmts.findUserByPublicIdFull.get(publicId);
    const freshUserId = Number(fresh?.id || 0);
    if (Number.isFinite(freshUserId) && freshUserId > 0) {
      const prefNow = nowIso();
      stmts.upsertUserPreferences.run(
        freshUserId,
        timezone,
        language,
        notificationPrefsJson,
        prefNow,
        prefNow
      );
    }
    stmts.deleteUserTombstoneByPublicId.run(publicId);
    auditUsersSyncApply({
      entityType: 'user',
      op: current ? 'update' : 'create',
      scopeId: publicId,
      sourceStation: effectiveSourceStation,
      sourceVersion: effectiveSourceVersion,
      peerId: peer?.stationId || peer?.stationIp || '',
      reason: current ? 'user_updated' : 'user_created',
      payload: {
        publicId,
        username: normalizeUsername(fresh?.username || username),
        displayName: sanitizeDisplayName(fresh?.display_name || displayName, username),
        role: normalizeRole(fresh?.role || role, DEFAULT_FALLBACK_ROLE),
        updatedAt,
      },
    });
    return { ok: true, applied: true, reason: current ? 'user_updated' : 'user_created', version: rawVersion };
  }

  if (entityType === 'role') {
    const roleKey = sanitizeRoleKey(payload?.key || entityKey || '', '');
    if (!roleKey) return { ok: true, applied: false, reason: 'missing_role_key', version: rawVersion };
    const normalizedRole = normalizeRoleRow({
      key: roleKey,
      displayName: payload?.displayName,
      note: payload?.note,
      canUseLiveMode: payload?.canUseLiveMode,
      canUsePostprodMode: payload?.canUsePostprodMode,
      canValidate: payload?.canValidate,
      canSyncScenes: payload?.canSyncScenes,
      canManageUsers: payload?.canManageUsers,
      canManageRoles: payload?.canManageRoles,
      canManageForms: payload?.canManageForms,
      canManageMachines: payload?.canManageMachines,
      canManageConfiguration: payload?.canManageConfiguration,
      canBanUsers: payload?.canBanUsers,
      canManageProjectPermissions: payload?.canManageProjectPermissions,
      canLaunchLiveProjects: payload?.canLaunchLiveProjects,
      canLaunchProjects: payload?.canLaunchProjects,
      canLaunchRenders: payload?.canLaunchRenders,
      canViewResources: payload?.canViewResources,
      canCreateTasks: payload?.canCreateTasks,
      canAssignRenderRequests: payload?.canAssignRenderRequests,
      canEditProjects: payload?.canEditProjects,
      canManageLayouts: payload?.canManageLayouts,
      manageableRoles: normalizeManageableRolesInput(payload?.manageableRoles),
      isSystem: payload?.isSystem === true,
      createdAt: payload?.createdAt,
      updatedAt: payload?.updatedAt,
    });
    if (!normalizedRole) return { ok: true, applied: false, reason: 'invalid_role_payload', version: rawVersion };

    const currentRoleRow = stmts.findRoleByKey.get(roleKey);
    const currentRole = normalizeRoleRow(currentRoleRow);
    const remoteMeta = {
      updatedAt: normalizeSyncTimestamp(normalizedRole.updatedAt, occurredAt),
      sourceStation: effectiveSourceStation,
      sourceVersion: effectiveSourceVersion,
    };
    const localMeta = currentRole
      ? {
        updatedAt: String(currentRole.updatedAt || ''),
        sourceStation: String(currentRole.lastSourceStation || ''),
        sourceVersion: normalizeSyncVersion(currentRole.lastSourceVersion),
      }
      : null;
    if (localMeta && compareSyncFreshness(remoteMeta, localMeta) < 0) {
      return { ok: true, applied: false, reason: 'stale_role_upsert', version: rawVersion };
    }

    const createdAt = normalizeSyncTimestamp(normalizedRole.createdAt, currentRole?.createdAt || occurredAt);
    const updatedAt = normalizeSyncTimestamp(normalizedRole.updatedAt, occurredAt);
    const manageableRolesJson = JSON.stringify(normalizeManageableRolesInput(normalizedRole.manageableRoles));
    if (!currentRole) {
      try {
        stmts.insertRole.run(
          roleKey,
          normalizedRole.displayName,
          normalizedRole.note,
          normalizedRole.canUseLiveMode ? 1 : 0,
          normalizedRole.canUsePostprodMode ? 1 : 0,
          normalizedRole.canValidate ? 1 : 0,
          normalizedRole.canSyncScenes ? 1 : 0,
          normalizedRole.canManageUsers ? 1 : 0,
          normalizedRole.canManageRoles ? 1 : 0,
          normalizedRole.canManageForms ? 1 : 0,
          normalizedRole.canManageMachines ? 1 : 0,
          normalizedRole.canManageConfiguration ? 1 : 0,
          normalizedRole.canBanUsers ? 1 : 0,
          normalizedRole.canManageProjectPermissions ? 1 : 0,
          normalizedRole.canLaunchLiveProjects ? 1 : 0,
          normalizedRole.canLaunchProjects ? 1 : 0,
          normalizedRole.canLaunchRenders ? 1 : 0,
          normalizedRole.canViewResources ? 1 : 0,
          normalizedRole.canCreateTasks ? 1 : 0,
          normalizedRole.canAssignRenderRequests ? 1 : 0,
          normalizedRole.canEditProjects ? 1 : 0,
          normalizedRole.canManageLayouts ? 1 : 0,
          manageableRolesJson,
          normalizedRole.isSystem ? 1 : 0,
          createdAt,
          updatedAt
        );
      } catch {
        // Insert may race with local create; update path below reconciles.
      }
    }

    stmts.updateRole.run(
      normalizedRole.displayName,
      normalizedRole.note,
      normalizedRole.canUseLiveMode ? 1 : 0,
      normalizedRole.canUsePostprodMode ? 1 : 0,
      normalizedRole.canValidate ? 1 : 0,
      normalizedRole.canSyncScenes ? 1 : 0,
      normalizedRole.canManageUsers ? 1 : 0,
      normalizedRole.canManageRoles ? 1 : 0,
      normalizedRole.canManageForms ? 1 : 0,
      normalizedRole.canManageMachines ? 1 : 0,
      normalizedRole.canManageConfiguration ? 1 : 0,
      normalizedRole.canBanUsers ? 1 : 0,
      normalizedRole.canManageProjectPermissions ? 1 : 0,
      normalizedRole.canLaunchLiveProjects ? 1 : 0,
      normalizedRole.canLaunchProjects ? 1 : 0,
      normalizedRole.canLaunchRenders ? 1 : 0,
      normalizedRole.canViewResources ? 1 : 0,
      normalizedRole.canCreateTasks ? 1 : 0,
      normalizedRole.canAssignRenderRequests ? 1 : 0,
      normalizedRole.canEditProjects ? 1 : 0,
      normalizedRole.canManageLayouts ? 1 : 0,
      manageableRolesJson,
      updatedAt,
      roleKey
    );
    stmts.updateRoleSyncSourceByKey.run(effectiveSourceStation, effectiveSourceVersion, roleKey);
    refreshRolesCache();
    auditUsersSyncApply({
      entityType: 'role',
      op: currentRole ? 'update' : 'create',
      scopeId: roleKey,
      sourceStation: effectiveSourceStation,
      sourceVersion: effectiveSourceVersion,
      peerId: peer?.stationId || peer?.stationIp || '',
      reason: currentRole ? 'role_updated' : 'role_created',
      payload: {
        key: roleKey,
        role: roleKey,
        displayName: normalizedRole.displayName,
        updatedAt,
      },
    });
    return { ok: true, applied: true, reason: currentRole ? 'role_updated' : 'role_created', version: rawVersion };
  }

  return { ok: true, applied: false, reason: 'unsupported_entity_type', version: rawVersion };
}

async function pullUsersSyncFromPeer(peer) {
  const peerId = String(peer?.stationId || peer?.stationIp || '').trim();
  if (!peerId) {
    return { ok: false, peer: peerId, error: 'invalid_peer' };
  }
  const cursorRow = stmts.findUserSyncCursorByPeer.get(peerId);
  const sinceVersion = normalizeSyncVersion(cursorRow?.last_version);
  const fetchRes = await fetchUsersSyncEventsFromPeer(peer, sinceVersion);
  if (!fetchRes.ok) {
    return {
      ok: false,
      peer: peerId,
      error: fetchRes.error || 'fetch_failed',
      sinceVersion,
    };
  }
  const events = Array.isArray(fetchRes.events) ? fetchRes.events : [];
  let maxSeenVersion = sinceVersion;
  let applied = 0;
  let skipped = 0;
  let failed = 0;
  const applyOne = (event) => {
    const result = applyUsersSyncEvent(event, peer);
    if (!result?.ok) throw new Error(result?.reason || 'event_apply_failed');
    return result;
  };
  // The receipt and its effect must commit together: otherwise a failed event
  // would look like a duplicate on retry.
  const applyAtomic = db ? db.transaction(applyOne) : applyOne;
  for (const event of events) {
    const eventVersion = normalizeSyncVersion(event?.version);
    try {
      if (eventVersion <= maxSeenVersion) throw new Error('invalid_event_order');
      const applyRes = applyAtomic(event);
      if (applyRes.applied) applied += 1;
      else skipped += 1;
      maxSeenVersion = eventVersion;
    } catch {
      failed += 1;
      break;
    }
  }
  // latestVersion describes the remote log, not this (bounded) page.
  // Advance only through the events actually received and processed.
  if (maxSeenVersion > sinceVersion) {
    stmts.upsertUserSyncCursorByPeer.run(peerId, maxSeenVersion, nowIso());
  }
  return {
    ok: failed === 0,
    ...(failed ? { error: 'event_apply_failed' } : {}),
    peer: peerId,
    fetched: events.length,
    applied,
    skipped,
    failed,
    sinceVersion,
    latestVersion: maxSeenVersion,
  };
}

async function runUsersSyncPoll() {
  if (usersSyncRuntimeState.polling) return;
  usersSyncRuntimeState.polling = true;
  try {
    const peers = listUsersSyncPeers();
    if (!Array.isArray(peers) || peers.length <= 0) return;
    const settled = await Promise.all(
      peers.map(async (peer) => {
        try {
          const value = await pullUsersSyncFromPeer(peer);
          return { peer, value, thrown: false };
        } catch (err) {
          return { peer, value: null, thrown: true, error: err };
        }
      })
    );
    for (const result of settled) {
      const peer = result?.peer || null;
      const fallbackPeerKey = resolveUsersSyncPeerKey(peer);
      if (result?.thrown) {
        markUsersSyncPeerOffline(peer, fallbackPeerKey, String(result?.error?.message || result?.error || 'failed'));
        continue;
      }
      const value = result?.value || {};
      const peerKey = String(value?.peer || fallbackPeerKey || '').trim();
      if (value.ok === true) {
        markUsersSyncPeerOnline(peer, peerKey);
        continue;
      }
      markUsersSyncPeerOffline(peer, peerKey, String(value?.error || 'failed'));
    }
  } finally {
    usersSyncRuntimeState.polling = false;
  }
}

function startUsersSyncPollLoop() {
  const intervalMs = Math.max(
    MIN_USERS_SYNC_POLL_INTERVAL_MS,
    Math.min(MAX_USERS_SYNC_POLL_INTERVAL_MS, Math.trunc(Number(usersSyncPollIntervalMs) || DEFAULT_USERS_SYNC_POLL_INTERVAL_MS))
  );
  const schedule = (delayMs = intervalMs) => {
    if (usersSyncRuntimeState.pollTimer) {
      clearTimeout(usersSyncRuntimeState.pollTimer);
    }
    usersSyncRuntimeState.pollTimer = setTimeout(async () => {
      try {
        await runUsersSyncPoll();
        if (usersSyncRuntimeState.loopFailedFingerprint !== '') {
          usersSyncRuntimeState.loopFailedFingerprint = '';
          logLine({ level: 'info', src: 'postprod', action: 'users_sync_loop_recovered', message: 'Sync users/profils: rétablie' });
        }
      } catch (err) {
        const fingerprint = String(err?.message || err || 'failed').trim().slice(0, 200);
        if (usersSyncRuntimeState.loopFailedFingerprint !== fingerprint) {
          usersSyncRuntimeState.loopFailedFingerprint = fingerprint;
          logLine({
            level: 'warn',
            src: 'postprod',
            action: 'users_sync_loop_failed',
            message: `Sync users/profils impossible: ${fingerprint}`,
          });
        }
      } finally {
        schedule(intervalMs);
      }
    }, Math.max(1000, Math.trunc(Number(delayMs) || intervalMs)));
    if (typeof usersSyncRuntimeState.pollTimer?.unref === 'function') {
      usersSyncRuntimeState.pollTimer.unref();
    }
  };
  schedule(Math.min(3000, Math.max(1000, Math.trunc(intervalMs / 2))));
}

  return {
    usersSyncIdentity,
    emitUserSyncUpsert,
    emitUserSyncDelete,
    emitRoleSyncUpsert,
    runUsersSyncPoll,
    startUsersSyncPollLoop,
  };
}
module.exports = {
  createUsersSyncHelpers,
};
