const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getSharedStore } = require('./server-shared-sqlite.cjs');
const { handlePostprodRoleRoutes } = require('./server-postprod-routes-roles.cjs');
const { handlePostprodDataTablesRoutes } = require('./server-postprod-routes-data-tables.cjs');
const { handlePostprodResourcesRoutes } = require('./server-postprod-routes-resources.cjs');
const { handlePostprodActivityAndAuditMaintenanceRoutes } = require('./server-postprod-routes-activity-audit.cjs');
const { handlePostprodRenderFormsRoutes } = require('./server-postprod-routes-render-forms.cjs');
const { handlePostprodRenderTemplatesRoutes } = require('./server-postprod-routes-render-templates.cjs');
const { handlePostprodRenderDispatchRoutes } = require('./server-postprod-routes-render-dispatch.cjs');
const { handlePostprodRenderTransitionRoutes } = require('./server-postprod-routes-render-transitions.cjs');
const { handlePostprodRenderHealthRoutes } = require('./server-postprod-routes-render-health.cjs');
const { handlePostprodRendersRoutes } = require('./server-postprod-routes-renders.cjs');
const { handlePostprodUsersRoutes } = require('./server-postprod-routes-users.cjs');
const { handlePostprodUserProjectPermissionsRoutes } = require('./server-postprod-routes-user-project-permissions.cjs');
const { handlePostprodUserActivityRoutes } = require('./server-postprod-routes-user-activity.cjs');
const { handlePostprodUserUpdateRoutes } = require('./server-postprod-routes-user-update.cjs');
const { handlePostprodTaskRoutes } = require('./server-postprod-routes-tasks.cjs');
const { handlePostprodMeRoutes } = require('./server-postprod-routes-me.cjs');
const { handlePostprodProjectRoutes } = require('./server-postprod-routes-projects.cjs');
const { handlePostprodAuthAndHealthRoutes } = require('./server-postprod-routes-auth-health.cjs');
const { handlePostprodAuditRoutes } = require('./server-postprod-routes-audit-export.cjs');
const { evaluatePostprodSecurityGate } = require('./server-postprod-routes-security-gate.cjs');
const { dispatchPostprodRouteHandlers } = require('./server-postprod-route-dispatcher.cjs');

const DEFAULT_BOOTSTRAP_USER = 'maintenance';
const DEFAULT_BOOTSTRAP_PASSWORD = 'admin';
const DEFAULT_BOOTSTRAP_ROLE = 'Maintenance';
const DEFAULT_SESSION_TTL_SEC = 12 * 60 * 60; // 12h
const DEFAULT_PBKDF2_ITERS = 150000;
const PASSWORD_KEY_LEN = 32;
const MIN_PASSWORD_LEN = 4;
const MAX_USERNAME_LEN = 64;
const MAX_DISPLAY_NAME_LEN = 120;
const MAX_USER_EMAIL_LEN = 254;
const MAX_USER_PHONE_LEN = 40;
const MAX_EMPLOYMENT_TYPE_LEN = 24;
const MAX_TIMEZONE_LEN = 80;
const MAX_USER_LANGUAGE_LEN = 12;
const MAX_USER_NOTE_LEN = 4000;
const MAX_USER_AVATAR_PATH_LEN = 500000;
const MAX_ROLE_KEY_LEN = 80;
const MAX_ROLE_NOTE_LEN = 4000;
const MAX_TASK_TITLE_LEN = 220;
const MAX_TASK_DESCRIPTION_LEN = 8000;
const MAX_TASK_COMMENT_LEN = 4000;
const MAX_TASK_REF_LEN = 240;
const MAX_TASK_REFS = 64;
const MAX_TASK_EXPECTED_RENDER_COUNT = 50;
const MAX_TASK_EXPECTED_RENDER_NAME_LEN = 220;
const MAX_TASK_AUTO_RENDER_CONFIG_BYTES = 256 * 1024;
const MAX_TASK_AUTO_RENDER_TEXT_LEN = 2000;
const MAX_RENDER_TEMPLATE_NAME_LEN = 220;
const MAX_RENDER_PROJECT_NAME_LEN = 220;
const MAX_RENDER_PRESET_NAME_LEN = 160;
const MAX_RENDER_FORM_NAME_LEN = 220;
const MAX_RENDER_FORM_PRESET_NAME_LEN = 220;
const MAX_RENDER_FORM_LAYOUT_BYTES = 256 * 1024;
const MAX_RENDER_MAP_NAME_LEN = 220;
const MAX_RENDER_SEQUENCE_NAME_LEN = 220;
const MAX_RENDER_OUTPUT_PROFILE_LEN = 220;
const MAX_RENDER_ALLOWED_ROLES = 64;
const MAX_RENDER_TEMPLATE_FIELDS = 128;
const MAX_RENDER_TEMPLATE_FIELD_KEY_LEN = 120;
const MAX_RENDER_TEMPLATE_FIELD_LABEL_LEN = 220;
const MAX_RENDER_TEMPLATE_FIELD_SOURCE_PATH_LEN = 400;
const MAX_RENDER_TEMPLATE_FIELD_INPUT_KIND_LEN = 40;
const MAX_RENDER_TEMPLATE_FIELD_VALUE_TYPE_LEN = 40;
const MAX_RENDER_TEMPLATE_FIELD_GROUP_NAME_LEN = 120;
const MAX_RENDER_TEMPLATE_FIELD_PAYLOAD_KEY_LEN = 120;
const MAX_RENDER_TEMPLATE_FIELD_PLACEHOLDER_LEN = 220;
const MAX_RENDER_TEMPLATE_FIELD_HELP_TEXT_LEN = 500;
const MAX_RENDER_TEMPLATE_FIELD_OPTIONS_ITEMS = 200;
const MAX_RENDER_TEMPLATE_FIELD_OPTIONS_BYTES = 128 * 1024;
const MAX_RENDER_TEMPLATE_FIELD_VALIDATION_BYTES = 128 * 1024;
const MAX_RENDER_TEMPLATE_FIELD_DEFAULT_VALUE_BYTES = 64 * 1024;
const MAX_RENDER_PRESET_PAYLOAD_BYTES = 256 * 1024;
const MAX_RENDER_OUTPUT_PATH_LEN = 4000;
const MAX_RENDER_ERROR_LEN = 4000;
const MAX_RENDER_COMMENT_LEN = 2000;
const MAX_RENDER_HEALTH_EVENT_LABEL_LEN = 220;
const MAX_RENDER_HEALTH_EVENT_DETAIL_LEN = 2000;
const MAX_RENDER_HEALTH_EVENT_SOURCE_LEN = 120;
const MAX_RENDER_PAYLOAD_BYTES = 512 * 1024;
const MAX_RENDER_WORKER_KEY_LEN = 160;
const MAX_RENDER_WORKER_NAME_LEN = 220;
const MAX_RENDER_WORKER_CAPABILITY_KEY_LEN = 120;
const MAX_RENDER_WORKER_CAPABILITY_VALUE_LEN = 220;
const MAX_RENDER_WORKER_CAPABILITY_ITEMS = 64;
const MAX_RENDER_WORKER_CAPABILITIES_BYTES = 64 * 1024;
const RENDER_WORKER_ONLINE_TTL_SECONDS = 90;
const DEFAULT_RENDER_DISPATCH_PRIORITY = 100;
const DEFAULT_RENDER_DISPATCH_MAX_JOBS = 10;
const MAX_RENDER_DISPATCH_PRIORITY = 1000;
const MAX_RENDER_DISPATCH_QUOTA = 500;
const MAX_RENDER_DISPATCH_PROJECT_RULES = 200;
const MAX_RENDER_DISPATCH_FETCH_LIMIT = 500;
const MAX_RENDER_DISPATCH_WORKER_FETCH_LIMIT = 200;
const MAX_RENDER_DISPATCH_MAX_JOBS = 50;
const MAX_RENDER_DISPATCH_RENDER_IDS = 200;
const MAX_RENDER_DETECTED_SCAN_FILES = 5000;
const DEFAULT_RENDER_DETECTED_SCAN_FILES = 1000;
const MAX_UNREAL_PROJECT_CATALOG_FILES = 20000;
const MIN_RENDER_DETECTED_SCAN_INTERVAL_MS = 1000;
const MAX_RENDER_DETECTED_SCAN_INTERVAL_MS = 10 * 60 * 1000;
const DEFAULT_RENDER_DETECTED_SCAN_INTERVAL_MS = 5000;
const DEFAULT_RENDER_DETECTED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.bmp',
  '.exr',
  '.mov',
  '.mp4',
  '.mxf',
  '.wav',
  '.json',
]);
const DEFAULT_RENDER_DETECTED_TEMPLATE_NAME = 'Imported output';
const AUTO_RENDER_PROJECT_USAGE_MODES = new Set(['auto_render', 'live_auto_render']);
const DEFAULT_USER_LANGUAGE = 'fr';
const USER_LANGUAGE_ALLOWED = new Set(['fr', 'en']);
const MAX_FAILED_LOGIN_COUNT = 5;
const FAILED_LOGIN_LOCK_SECONDS = 15 * 60;
const MAX_PROJECT_REF_LEN = 220;
const MAX_DATA_TABLE_NAME_LEN = 220;
const MAX_DATA_TABLE_SCHEMA_BYTES = 256 * 1024;
const MAX_DATA_ROW_KEY_LEN = 220;
const MAX_DATA_ROW_PAYLOAD_BYTES = 512 * 1024;
const MAX_SYNC_SOURCE_LEN = 120;
const MAX_SYNC_RESULT_LEN = 120;
const MAX_SYNC_DETAILS_BYTES = 256 * 1024;
const MAX_ACTIVITY_SEARCH_LEN = 240;
const MAX_RESOURCE_CODE_LEN = 240;
const MAX_RESOURCE_TYPE_LEN = 160;
const MAX_RESOURCE_TITLE_LEN = 400;
const MAX_RESOURCE_SOURCE_PATH_LEN = 4000;
const MAX_RESOURCE_METADATA_BYTES = 512 * 1024;
const MIN_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS = 1000;
const MAX_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const MIN_POSTPROD_PROJECTS_RESYNC_TTL_MS = 250;
const MAX_POSTPROD_PROJECTS_RESYNC_TTL_MS = 5 * 60 * 1000;
const DEFAULT_POSTPROD_PROJECTS_RESYNC_TTL_MS = 10 * 1000;
const MAX_BROKER_TOKEN_LEN = 4096;
const MAX_BROKER_JWKS_URL_LEN = 2000;
const MAX_BROKER_OIDC_DISCOVERY_URL_LEN = 2000;
const MAX_BROKER_JWT_ISSUER_LEN = 240;
const MAX_BROKER_JWT_AUDIENCE_LEN = 240;
const MAX_CLIENT_CERT_DN_LEN = 2000;
const CLIENT_CERT_SHA256_HEX_LEN = 64;
const MIN_BROKER_JWKS_TTL_SEC = 5;
const MAX_BROKER_JWKS_TTL_SEC = 24 * 60 * 60;
const MIN_BROKER_JWKS_TIMEOUT_MS = 500;
const MAX_BROKER_JWKS_TIMEOUT_MS = 30000;
const MIN_BROKER_OIDC_DISCOVERY_TTL_SEC = 5;
const MAX_BROKER_OIDC_DISCOVERY_TTL_SEC = 24 * 60 * 60;
const MIN_BROKER_OIDC_DISCOVERY_TIMEOUT_MS = 500;
const MAX_BROKER_OIDC_DISCOVERY_TIMEOUT_MS = 30000;
const MAX_BROKER_REFRESH_LEAD_SEC = 3600;
const MIN_BROKER_METADATA_REFRESH_INTERVAL_MS = 250;
const MAX_BROKER_METADATA_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const MIN_BROKER_OFFLINE_RECOVERY_INTERVAL_MS = 1000;
const MAX_BROKER_OFFLINE_RECOVERY_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_BROKER_OFFLINE_RECOVERY_INTERVAL_MS = 30 * 1000;
const BROKER_TOKEN_HEADER = 'x-uu-broker-token';

const SYSTEM_MAINTENANCE_ROLE = 'Maintenance';
const DEFAULT_FALLBACK_ROLE = 'Operateur';
const TASK_STATUSES = Object.freeze([
  'Planifiee',
  'A faire',
  'En cours',
  'A valider',
  'Validee',
  'Rejetee',
]);
const TASK_EXPECTED_RENDER_MATCH_ACTIVE_STATUSES = new Set([
  'Planifiee',
  'A faire',
  'En cours',
  'A valider',
]);
const TASK_REQUEST_TYPES = Object.freeze(['manual', 'auto_render']);
const DEFAULT_TASK_REQUEST_TYPE = 'manual';
const TASK_PRIORITY_DEADLINE_DAYS = Object.freeze({
  1: 1,
  2: 3,
  3: 7,
  4: 14,
});
const DEFAULT_TASK_DEADLINE_DAYS = 7;
const RENDER_STATUSES = Object.freeze([
  'Queued',
  'Running',
  'Done',
  'Failed',
  'Canceled',
]);
const RENDER_REVIEW_STATUSES = Object.freeze([
  'to_validate',
  'validated',
  'to_modify',
  'canceled',
]);
const RENDER_HEALTH_EVENT_STATES = new Set(['online', 'warn', 'offline', 'loading', 'info']);
const RENDER_HEALTH_EVENT_KINDS = new Set(['broker', 'security', 'mixed', 'worker', 'general']);
const POSTPROD_RENDER_HEALTH_AUDIT_ACTION = 'render_health_event';
const DEFAULT_RENDER_HEALTH_EVENT_RETENTION_DAYS = 90;
const MIN_RENDER_HEALTH_EVENT_RETENTION_DAYS = 0;
const MAX_RENDER_HEALTH_EVENT_RETENTION_DAYS = 3650;
const DEFAULT_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const MIN_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS = 60 * 1000;
const MAX_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

const DEFAULT_ROLE_KEYS = [
  'Maintenance',
  'Responsable Fabrication',
  'Integrateur',
  'Operateur',
  'Graphiste',
  'Journaliste',
];
const RENDER_VALIDATION_ALLOWED_ROLES = new Set([
  'Maintenance',
  'Responsable Fabrication',
  'Journaliste',
]);
const RENDER_TEMPLATE_FIELD_VALUE_TYPES = new Set([
  'string',
  'number',
  'integer',
  'boolean',
  'color',
  'image',
  'video',
  'enum',
  'date',
  'vector2',
  'vector3',
  'json',
]);
const RENDER_TEMPLATE_FIELD_INPUT_KINDS = new Set([
  'text',
  'multiline',
  'number',
  'integer',
  'vector2',
  'vector3',
  'checkbox',
  'color',
  'image',
  'video',
  'select',
  'date',
  'json',
]);
const RENDER_FORM_SOURCE_TYPES = new Set([
  'preset_property',
  'preset_function_arg',
  'manual',
]);
const RENDER_FORM_MODE_DEFAULTS = new Set(['edit', 'live']);

const EMPLOYMENT_TYPE_LOOKUP = new Map([
  ['interne', 'Interne'],
  ['exterieur', 'Exterieur'],
  ['externe', 'Exterieur'],
  ['external', 'Exterieur'],
  ['cdd', 'CDD'],
]);

const DEFAULT_ROLE_POLICIES = [
  {
    key: 'Maintenance',
    displayName: 'Maintenance',
    canUseLiveMode: true,
    canUsePostprodMode: true,
    canValidate: true,
    canSyncScenes: true,
    canManageUsers: true,
    canManageRoles: true,
    canManageForms: true,
    canManageMachines: true,
    canBanUsers: true,
    canManageProjectPermissions: true,
    canLaunchProjects: true,
    canLaunchRenders: true,
    canViewResources: true,
    canCreateTasks: true,
    canEditProjects: true,
    canManageLayouts: true,
    manageableRoles: [...DEFAULT_ROLE_KEYS],
    isSystem: true,
  },
  {
    key: 'Responsable Fabrication',
    displayName: 'Responsable Fabrication',
    canUseLiveMode: true,
    canUsePostprodMode: true,
    canValidate: true,
    canSyncScenes: true,
    canManageUsers: true,
    canManageRoles: false,
    canManageForms: true,
    canManageMachines: true,
    canBanUsers: true,
    canManageProjectPermissions: true,
    canLaunchProjects: true,
    canLaunchRenders: true,
    canViewResources: true,
    canCreateTasks: true,
    canEditProjects: true,
    canManageLayouts: true,
    manageableRoles: ['Graphiste', 'Journaliste'],
    isSystem: true,
  },
  {
    key: 'Integrateur',
    displayName: 'Integrateur',
    canUseLiveMode: true,
    canUsePostprodMode: true,
    canValidate: true,
    canSyncScenes: true,
    canManageUsers: true,
    canManageRoles: false,
    canManageForms: true,
    canManageMachines: true,
    canBanUsers: true,
    canManageProjectPermissions: true,
    canLaunchProjects: true,
    canLaunchRenders: true,
    canViewResources: true,
    canCreateTasks: true,
    canEditProjects: true,
    canManageLayouts: true,
    manageableRoles: ['Operateur', 'Journaliste'],
    isSystem: true,
  },
  {
    key: 'Operateur',
    displayName: 'Operateur',
    canUseLiveMode: true,
    canUsePostprodMode: true,
    canValidate: false,
    canSyncScenes: false,
    canManageUsers: false,
    canManageRoles: false,
    canManageForms: false,
    canManageMachines: false,
    canBanUsers: false,
    canManageProjectPermissions: false,
    canLaunchProjects: true,
    canLaunchRenders: true,
    canViewResources: true,
    canCreateTasks: true,
    canEditProjects: true,
    canManageLayouts: true,
    manageableRoles: [],
    isSystem: true,
  },
  {
    key: 'Graphiste',
    displayName: 'Graphiste',
    canUseLiveMode: false,
    canUsePostprodMode: true,
    canValidate: false,
    canSyncScenes: false,
    canManageUsers: false,
    canManageRoles: false,
    canManageForms: false,
    canManageMachines: false,
    canBanUsers: false,
    canManageProjectPermissions: false,
    canLaunchProjects: false,
    canLaunchRenders: true,
    canViewResources: true,
    canCreateTasks: true,
    canEditProjects: false,
    canManageLayouts: false,
    manageableRoles: [],
    isSystem: true,
  },
  {
    key: 'Journaliste',
    displayName: 'Journaliste',
    canUseLiveMode: false,
    canUsePostprodMode: true,
    canValidate: false,
    canSyncScenes: false,
    canManageUsers: false,
    canManageRoles: false,
    canManageForms: false,
    canManageMachines: false,
    canBanUsers: false,
    canManageProjectPermissions: false,
    canLaunchProjects: false,
    canLaunchRenders: true,
    canViewResources: true,
    canCreateTasks: true,
    canEditProjects: false,
    canManageLayouts: false,
    manageableRoles: [],
    isSystem: true,
  },
];

const ROLE_ALIAS_MAP = new Map([
  ['maintenance', 'Maintenance'],
  ['responsable fabrication', 'Responsable Fabrication'],
  ['responsable_fabrication', 'Responsable Fabrication'],
  ['responsable-fabrication', 'Responsable Fabrication'],
  ['responsablefabrication', 'Responsable Fabrication'],
  ['integrateur', 'Integrateur'],
  ['integrator', 'Integrateur'],
  ['operateur', 'Operateur'],
  ['operator', 'Operateur'],
  ['graphiste', 'Graphiste'],
  ['journaliste', 'Journaliste'],
]);

function coercePositiveInt(value, fallback, min = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return Math.max(min, Number(fallback) || min);
  return Math.max(min, Math.trunc(n));
}

function parseBooleanFlag(value, fallback = false) {
  if (value == null) return fallback === true;
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return value === 1;
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback === true;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'oui' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'non' || raw === 'off') return false;
  return fallback === true;
}

function parseEnvPathList(value) {
  return String(value || '')
    .split(/[;\n\r]+/g)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeRenderDetectedExtensions(value) {
  const out = new Set();
  const push = (entry) => {
    const raw = String(entry || '').trim().toLowerCase();
    if (!raw) return;
    if (raw === '*') return;
    const ext = raw.startsWith('.') ? raw : `.${raw}`;
    out.add(ext);
  };
  if (Array.isArray(value)) {
    for (const item of value) push(item);
  } else {
    String(value || '')
      .split(/[,\s;]+/g)
      .forEach((item) => push(item));
  }
  return out;
}

function normalizeRenderDetectedFilePathForSignature(value) {
  let abs = '';
  try {
    abs = path.resolve(String(value || '').trim());
  } catch {
    abs = String(value || '').trim();
  }
  return abs.replace(/\\/g, '/').toLowerCase();
}

function buildRenderDetectedFileSignature(filePath, size = 0, mtimeIso = '') {
  return crypto
    .createHash('sha1')
    .update(
      `${normalizeRenderDetectedFilePathForSignature(filePath)}|${Math.max(0, Math.trunc(Number(size) || 0))}|${String(mtimeIso || '').trim()}`
    )
    .digest('hex');
}

function normalizeBrokerJwtAlgs(value, fallback = []) {
  const allowed = new Set(['HS256', 'RS256']);
  const raw = value == null ? '' : String(value || '');
  const parts = raw
    .split(/[,\s;]+/g)
    .map((item) => String(item || '').trim().toUpperCase())
    .filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const alg of parts) {
    if (!allowed.has(alg) || seen.has(alg)) continue;
    seen.add(alg);
    out.push(alg);
  }
  if (out.length > 0) return out;

  const fb = Array.isArray(fallback) ? fallback : [fallback];
  for (const algRaw of fb) {
    const alg = String(algRaw || '').trim().toUpperCase();
    if (!allowed.has(alg) || seen.has(alg)) continue;
    seen.add(alg);
    out.push(alg);
  }
  return out;
}

function sanitizeHttpUrl(value, maxLen = 2000) {
  const raw = String(value || '').trim().slice(0, Math.max(1, Math.trunc(Number(maxLen) || 2000)));
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    const proto = String(parsed.protocol || '').trim().toLowerCase();
    if (proto !== 'https:' && proto !== 'http:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function buildOidcDiscoveryUrl({ issuer = '', explicitUrl = '' } = {}) {
  const fromExplicit = sanitizeHttpUrl(explicitUrl, MAX_BROKER_OIDC_DISCOVERY_URL_LEN);
  if (fromExplicit) return fromExplicit;
  const cleanIssuer = sanitizeHttpUrl(issuer, MAX_BROKER_JWT_ISSUER_LEN);
  if (!cleanIssuer) return '';
  const noTrail = cleanIssuer.endsWith('/') ? cleanIssuer.slice(0, -1) : cleanIssuer;
  return `${noTrail}/.well-known/openid-configuration`;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeAscii(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeRoleLookupKey(value) {
  return normalizeAscii(value).replace(/[\s_-]+/g, ' ').trim();
}

function normalizeUsername(value) {
  return normalizeAscii(value).replace(/\s+/g, '');
}

function normalizeUsernameSeed(value) {
  const raw = normalizeAscii(value);
  if (!raw) return '';
  const normalized = raw
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
  return normalized.slice(0, Math.min(32, MAX_USERNAME_LEN));
}

function buildAutoUsername(stmts, seeds = []) {
  const list = Array.isArray(seeds) ? seeds : [seeds];
  let base = '';
  for (const seed of list) {
    const candidate = normalizeUsernameSeed(seed);
    if (!candidate) continue;
    base = candidate;
    break;
  }
  if (!base) base = 'user';

  let username = base.slice(0, MAX_USERNAME_LEN);
  let suffix = 2;
  while (stmts.findUserByUsername.get(username)) {
    const suffixLabel = `.${suffix++}`;
    const maxBaseLen = Math.max(1, MAX_USERNAME_LEN - suffixLabel.length);
    username = `${base.slice(0, maxBaseLen)}${suffixLabel}`;
    if (suffix > 10000) {
      const randomSuffix = crypto.randomBytes(3).toString('hex');
      const hardMaxBaseLen = Math.max(1, MAX_USERNAME_LEN - (randomSuffix.length + 1));
      username = `${base.slice(0, hardMaxBaseLen)}.${randomSuffix}`;
      if (!stmts.findUserByUsername.get(username)) break;
    }
  }
  return username;
}

function sanitizeDisplayName(value, fallback = '') {
  const raw = String(value || '').trim();
  const safe = raw || String(fallback || '').trim();
  return safe.slice(0, MAX_DISPLAY_NAME_LEN);
}

function sanitizeFirstName(value) {
  return String(value || '').trim().slice(0, MAX_DISPLAY_NAME_LEN);
}

function sanitizeLastName(value) {
  return String(value || '').trim().slice(0, MAX_DISPLAY_NAME_LEN);
}

function sanitizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, MAX_USER_EMAIL_LEN);
}

function sanitizePhone(value) {
  return String(value || '').trim().slice(0, MAX_USER_PHONE_LEN);
}

function sanitizeEmploymentType(value) {
  const raw = String(value || '').trim().slice(0, MAX_EMPLOYMENT_TYPE_LEN);
  if (!raw) return '';
  const normalized = normalizeAscii(raw).replace(/[\s_-]+/g, '');
  return EMPLOYMENT_TYPE_LOOKUP.get(normalized) || '';
}

function buildPublicId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

function normalizePublicId(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (!/^[0-9a-f-]{36}$/.test(raw)) return '';
  const parts = raw.split('-');
  if (parts.length !== 5) return '';
  if (parts[0].length !== 8 || parts[1].length !== 4 || parts[2].length !== 4 || parts[3].length !== 4 || parts[4].length !== 12) {
    return '';
  }
  return raw;
}

function resolvePhoneFromBody(body = {}, fallback = '') {
  const hasPhone = Object.prototype.hasOwnProperty.call(body || {}, 'phone');
  const hasMobilePhone = Object.prototype.hasOwnProperty.call(body || {}, 'mobilePhone');
  const hasOfficePhone = Object.prototype.hasOwnProperty.call(body || {}, 'officePhone');
  if (!hasPhone && !hasMobilePhone && !hasOfficePhone) {
    return {
      hasAny: false,
      hasLegacyMobile: false,
      hasLegacyOffice: false,
      value: sanitizePhone(fallback),
    };
  }
  const rawValue = hasPhone
    ? body?.phone
    : hasMobilePhone
      ? body?.mobilePhone
      : body?.officePhone;
  return {
    hasAny: true,
    hasLegacyMobile: hasMobilePhone,
    hasLegacyOffice: hasOfficePhone,
    value: sanitizePhone(rawValue),
  };
}

function resolveNotificationPrefsFromBody(body = {}, fallback = '{}') {
  const hasNotificationPrefsJson = Object.prototype.hasOwnProperty.call(body || {}, 'notificationPrefsJson');
  const hasNotificationPreferences = Object.prototype.hasOwnProperty.call(body || {}, 'notificationPreferences');
  if (!hasNotificationPrefsJson && !hasNotificationPreferences) {
    return {
      hasAny: false,
      hasLegacy: false,
      value: normalizeNotificationPreferences(fallback),
    };
  }
  return {
    hasAny: true,
    hasLegacy: hasNotificationPreferences,
    value: normalizeNotificationPreferences(
      hasNotificationPrefsJson ? body?.notificationPrefsJson : body?.notificationPreferences
    ),
  };
}

function sanitizeTimezone(value) {
  return String(value || '').trim().slice(0, MAX_TIMEZONE_LEN);
}

function sanitizeUserLanguage(value, fallback = DEFAULT_USER_LANGUAGE) {
  const raw = String(value || '').trim().toLowerCase().slice(0, MAX_USER_LANGUAGE_LEN);
  if (USER_LANGUAGE_ALLOWED.has(raw)) return raw;
  const fallbackRaw = String(fallback || DEFAULT_USER_LANGUAGE)
    .trim()
    .toLowerCase()
    .slice(0, MAX_USER_LANGUAGE_LEN);
  if (USER_LANGUAGE_ALLOWED.has(fallbackRaw)) return fallbackRaw;
  return DEFAULT_USER_LANGUAGE;
}

function sanitizeUserNote(value) {
  return String(value || '').trim().slice(0, MAX_USER_NOTE_LEN);
}

function sanitizeAvatarPath(value) {
  return String(value || '').trim().slice(0, MAX_USER_AVATAR_PATH_LEN);
}

function isValidAvatarPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return true;
  if (raw.length > MAX_USER_AVATAR_PATH_LEN) return false;
  if (/[\r\n]/.test(raw)) return false;
  if (/^data:/i.test(raw)) {
    return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i.test(raw);
  }
  return true;
}

function isValidEmail(value) {
  const mail = String(value || '').trim();
  if (!mail) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
}

function normalizeNotificationPreferences(value) {
  if (value == null || value === '') return '{}';
  let parsed = null;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(String(value || '{}'));
    } catch {
      return '{}';
    }
  } else if (typeof value === 'object') {
    parsed = value;
  } else {
    return '{}';
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return '{}';
  try {
    return JSON.stringify(parsed);
  } catch {
    return '{}';
  }
}

function parseNotificationPreferencesJson(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

function sanitizeRoleKey(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_ROLE_KEY_LEN);
}

function sanitizeRoleNote(value) {
  return String(value || '').trim().slice(0, MAX_ROLE_NOTE_LEN);
}

function sanitizeTaskTitle(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_TASK_TITLE_LEN);
}

function sanitizeTaskDescription(value) {
  return String(value || '').trim().slice(0, MAX_TASK_DESCRIPTION_LEN);
}

function sanitizeTaskComment(value) {
  return String(value || '').trim().slice(0, MAX_TASK_COMMENT_LEN);
}

function normalizeTaskRequestType(value, fallback = DEFAULT_TASK_REQUEST_TYPE) {
  const raw = String(value || '').trim().toLowerCase();
  if (TASK_REQUEST_TYPES.includes(raw)) return raw;
  const fallbackRaw = String(fallback || '').trim().toLowerCase();
  if (TASK_REQUEST_TYPES.includes(fallbackRaw)) return fallbackRaw;
  return DEFAULT_TASK_REQUEST_TYPE;
}

function sanitizeTaskExpectedRenderName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TASK_EXPECTED_RENDER_NAME_LEN);
}

function sanitizeTaskAutoRenderText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TASK_AUTO_RENDER_TEXT_LEN);
}

function normalizeTaskExpectedRenderCount(value, requestType = DEFAULT_TASK_REQUEST_TYPE, fallback = 1) {
  const normalizedRequestType = normalizeTaskRequestType(requestType, DEFAULT_TASK_REQUEST_TYPE);
  if (normalizedRequestType === 'auto_render') return 1;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.max(1, Math.min(MAX_TASK_EXPECTED_RENDER_COUNT, Math.trunc(parsed)));
  }
  const fallbackParsed = Number(fallback);
  if (Number.isFinite(fallbackParsed)) {
    return Math.max(1, Math.min(MAX_TASK_EXPECTED_RENDER_COUNT, Math.trunc(fallbackParsed)));
  }
  return 1;
}

function normalizeTaskExpectedRenderNamesInput(value, maxItems = MAX_TASK_EXPECTED_RENDER_COUNT) {
  let src = [];
  if (Array.isArray(value)) {
    src = value;
  } else if (typeof value === 'string') {
    const raw = String(value || '').trim();
    if (!raw) {
      src = [];
    } else {
      try {
        const parsed = JSON.parse(raw);
        src = Array.isArray(parsed) ? parsed : raw.split(/[,;\n]+/);
      } catch {
        src = raw.split(/[,;\n]+/);
      }
    }
  } else {
    src = [];
  }

  const limit = Math.max(1, Math.min(MAX_TASK_EXPECTED_RENDER_COUNT, Math.trunc(Number(maxItems) || 1)));
  const out = [];
  const seen = new Set();
  for (const item of src) {
    const normalized = sanitizeTaskExpectedRenderName(item);
    if (!normalized) continue;
    const key = normalizeAscii(normalized);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= limit) break;
  }
  return out;
}

function buildTaskExpectedRenderNameBase(title) {
  const ascii = normalizeAscii(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return ascii || 'rendu';
}

function generateTaskExpectedRenderNames(title, expectedRenderCount) {
  const count = Math.max(1, Math.min(MAX_TASK_EXPECTED_RENDER_COUNT, Math.trunc(Number(expectedRenderCount) || 1)));
  const base = buildTaskExpectedRenderNameBase(title);
  const out = [];
  for (let idx = 1; idx <= count; idx += 1) {
    out.push(`${base}-r${String(idx).padStart(3, '0')}`);
  }
  return out;
}

function resolveTaskExpectedRenderNames({
  title = '',
  requestType = DEFAULT_TASK_REQUEST_TYPE,
  expectedRenderCount = 1,
  expectedRenderNames = [],
} = {}) {
  const normalizedRequestType = normalizeTaskRequestType(requestType, DEFAULT_TASK_REQUEST_TYPE);
  const count = normalizeTaskExpectedRenderCount(expectedRenderCount, normalizedRequestType, 1);
  const provided = normalizeTaskExpectedRenderNamesInput(expectedRenderNames, count);
  const generated = generateTaskExpectedRenderNames(title, count);
  if (!provided.length) {
    return generated;
  }
  const out = [];
  const seen = new Set();
  for (const item of provided) {
    const normalized = sanitizeTaskExpectedRenderName(item);
    if (!normalized) continue;
    const key = normalizeAscii(normalized);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= count) break;
  }
  if (out.length >= count) {
    return out.slice(0, count);
  }
  for (const generatedItem of generated) {
    const key = normalizeAscii(generatedItem);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(generatedItem);
    if (out.length >= count) break;
  }
  return out.slice(0, count);
}

function parseTaskAutoRenderConfig(value) {
  const raw = safeParseObjectJson(value, {});
  const projectName = sanitizeRenderProjectName(raw?.projectName);
  const templateName = sanitizeRenderTemplateName(raw?.templateName, '');
  if (!projectName || !templateName) return null;
  const formId = asOptionalPositiveInt(raw?.formId);
  const formDataRaw = raw?.formData;
  const formData = (
    formDataRaw && typeof formDataRaw === 'object' && !Array.isArray(formDataRaw)
      ? formDataRaw
      : null
  );
  const templateId = asOptionalPositiveInt(raw?.templateId);
  const targetWorkerKey = sanitizeRenderWorkerKey(
    raw?.targetWorkerKey ?? raw?.preferredWorkerKey ?? raw?.workerKey ?? ''
  );
  const mapName = sanitizeRenderMapName(raw?.mapName, '');
  const sequenceName = sanitizeRenderSequenceName(raw?.sequenceName, '');
  const outputProfile = sanitizeRenderOutputProfile(raw?.outputProfile, '');
  const outputDir = sanitizeRenderOutputPath(raw?.outputDir ?? raw?.renderOutputDir ?? '');
  const textValue = sanitizeTaskAutoRenderText(raw?.textValue ?? raw?.text ?? raw?.textOverride ?? '');
  const normalizedPayload = normalizeRenderPayload(raw?.payload);
  const payload = normalizedPayload.ok
    ? parseRenderPayloadJson(normalizedPayload.payloadJson)
    : {};
  const hasExecutionInput =
    raw?.execution && typeof raw.execution === 'object' && !Array.isArray(raw.execution);
  let execution = null;
  if (hasExecutionInput) {
    const normalizedExecution = normalizeRenderExecution(raw.execution);
    if (normalizedExecution.ok) {
      execution = parseRenderExecutionJson(normalizedExecution.executionJson);
    }
  }
  const config = {
    projectName,
    templateName,
    templateId,
    requiresValidation: raw?.requiresValidation === true,
    payload: payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {},
  };
  if (formId != null) config.formId = formId;
  if (formData && Object.keys(formData).length > 0) config.formData = formData;
  if (targetWorkerKey) config.targetWorkerKey = targetWorkerKey;
  if (mapName) config.mapName = mapName;
  if (sequenceName) config.sequenceName = sequenceName;
  if (outputProfile) config.outputProfile = outputProfile;
  if (outputDir) config.outputDir = outputDir;
  if (textValue) config.textValue = textValue;
  if (execution && typeof execution === 'object' && !Array.isArray(execution)) {
    config.execution = execution;
  }
  return config;
}

function normalizeTaskAutoRenderConfig(
  value,
  { requestType = DEFAULT_TASK_REQUEST_TYPE, projectRefs = [], stmts = null } = {}
) {
  const normalizedRequestType = normalizeTaskRequestType(requestType, DEFAULT_TASK_REQUEST_TYPE);
  if (normalizedRequestType !== 'auto_render') {
    return { ok: true, config: null, configJson: '{}', projectRefs: [] };
  }

  let raw = value;
  if (typeof raw === 'string') {
    const input = String(raw || '').trim();
    if (!input) raw = {};
    else {
      try {
        raw = JSON.parse(input);
      } catch {
        return { ok: false, error: 'invalid_task_auto_render_config' };
      }
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    raw = {};
  }

  const formId = asOptionalPositiveInt(raw?.formId ?? raw?.renderFormId);
  if (formId == null || formId <= 0) {
    return { ok: false, error: 'missing_task_auto_render_form' };
  }
  if (!stmts || typeof stmts.findRenderFormById?.get !== 'function') {
    return { ok: false, error: 'invalid_task_auto_render_form' };
  }
  const linkedForm = stmts.findRenderFormById.get(formId);
  if (!linkedForm) {
    return { ok: false, error: 'invalid_task_auto_render_form' };
  }
  if (Number(linkedForm?.is_active) !== 1) {
    return { ok: false, error: 'inactive_task_auto_render_form' };
  }
  const formProjectName = sanitizeRenderProjectName(linkedForm?.project_name || '');
  if (!formProjectName) {
    return { ok: false, error: 'auto_render_project_required' };
  }
  const refs = normalizeTaskRefsInput(projectRefs);
  if (refs.length > 0 && !refs.includes(formProjectName)) {
    return { ok: false, error: 'task_form_project_mismatch' };
  }
  const templateNameFromForm = sanitizeRenderTemplateName(linkedForm?.template_name || '', '');
  const outputProfileFromForm = sanitizeRenderOutputProfile(linkedForm?.output_profile || '', '');
  const mapNameFromForm = sanitizeRenderMapName(linkedForm?.map_name || '', '');
  const sequenceNameFromForm = sanitizeRenderSequenceName(linkedForm?.sequence_name || '', '');
  let templateName = templateNameFromForm;
  if (!templateName && outputProfileFromForm) {
    const tail = outputProfileFromForm.split('/').filter(Boolean).pop() || outputProfileFromForm;
    templateName = sanitizeRenderTemplateName(tail.replace(/\.[^/.]+$/g, ''), '');
  }
  if (!templateName) {
    templateName = `Form-${Math.trunc(formId)}`;
  }

  const normalizedPayload = normalizeRenderPayload(raw?.payload);
  if (!normalizedPayload.ok) {
    return { ok: false, error: normalizedPayload.error || 'invalid_task_auto_render_payload' };
  }
  const payload = parseRenderPayloadJson(normalizedPayload.payloadJson);
  let execution = null;
  if (raw?.execution && typeof raw.execution === 'object' && !Array.isArray(raw.execution)) {
    const normalizedExecution = normalizeRenderExecution(raw.execution);
    if (!normalizedExecution.ok) {
      return { ok: false, error: 'invalid_task_auto_render_config' };
    }
    execution = parseRenderExecutionJson(normalizedExecution.executionJson);
  }
  const templateId = asOptionalPositiveInt(raw?.templateId);
  const targetWorkerKey = sanitizeRenderWorkerKey(
    raw?.targetWorkerKey ?? raw?.preferredWorkerKey ?? raw?.workerKey ?? ''
  );
  const mapName = sanitizeRenderMapName(raw?.mapName, '');
  const sequenceName = sanitizeRenderSequenceName(raw?.sequenceName, '');
  const outputProfile = sanitizeRenderOutputProfile(raw?.outputProfile, '');
  const outputDir = sanitizeRenderOutputPath(raw?.outputDir ?? raw?.renderOutputDir ?? '');
  const textValue = sanitizeTaskAutoRenderText(raw?.textValue ?? raw?.text ?? raw?.textOverride ?? '');
  const formDataRaw = raw?.formData;
  const formData = (
    formDataRaw && typeof formDataRaw === 'object' && !Array.isArray(formDataRaw)
      ? formDataRaw
      : null
  );
  const config = {
    projectName: formProjectName,
    templateName,
    templateId,
    formId: Math.trunc(formId),
    requiresValidation: raw?.requiresValidation === true,
    payload: payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {},
  };
  if (formData && Object.keys(formData).length > 0) {
    config.formData = formData;
  }
  if (targetWorkerKey) config.targetWorkerKey = targetWorkerKey;
  if (mapNameFromForm || mapName) config.mapName = mapNameFromForm || mapName;
  if (sequenceNameFromForm || sequenceName) config.sequenceName = sequenceNameFromForm || sequenceName;
  if (outputProfileFromForm || outputProfile) config.outputProfile = outputProfileFromForm || outputProfile;
  if (outputDir) config.outputDir = outputDir;
  if (textValue) config.textValue = textValue;
  if (execution && typeof execution === 'object' && !Array.isArray(execution)) {
    config.execution = execution;
  }
  let configJson = '{}';
  try {
    configJson = JSON.stringify(config);
  } catch {
    return { ok: false, error: 'invalid_task_auto_render_config' };
  }
  if (Buffer.byteLength(configJson, 'utf8') > MAX_TASK_AUTO_RENDER_CONFIG_BYTES) {
    return { ok: false, error: 'task_auto_render_config_too_large' };
  }
  return { ok: true, config, configJson, projectRefs: [formProjectName] };
}

function normalizeExpectedRenderLookupKey(value, stripExtension = true) {
  let raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (stripExtension) {
    raw = raw.replace(/\.[^/.\\]+$/g, '').trim();
  }
  if (!raw) return '';
  return normalizeAscii(raw)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeIsoToTs(value) {
  const iso = parseIsoDateOrNull(value);
  if (!iso) return 0;
  const ts = Date.parse(iso);
  return Number.isFinite(ts) ? ts : 0;
}

function sortTaskExpectedRenderCandidates(list = []) {
  const src = Array.isArray(list) ? list : [];
  return src
    .slice()
    .sort((a, b) => {
      const aTs = Number(a?.rankTs || 0);
      const bTs = Number(b?.rankTs || 0);
      if (aTs !== bTs) return bTs - aTs;
      const aId = Number(a?.taskId || 0);
      const bId = Number(b?.taskId || 0);
      return bId - aId;
    });
}

function buildExpectedRenderTaskMatchCatalog(stmts) {
  const activeByKey = new Map();
  const allByKey = new Map();
  if (!stmts || typeof stmts.listTasks?.all !== 'function') {
    return { activeByKey, allByKey };
  }
  let rows = [];
  try {
    rows = stmts.listTasks.all();
  } catch {
    rows = [];
  }
  for (const row of rows) {
    const task = buildTaskPayload(row);
    const taskId = Number(task?.id || 0);
    if (!Number.isFinite(taskId) || taskId <= 0) continue;
    const status = normalizeTaskStatus(task?.status, 'A faire');
    const requestType = normalizeTaskRequestType(task?.requestType, DEFAULT_TASK_REQUEST_TYPE);
    const expectedRenderCount = normalizeTaskExpectedRenderCount(
      task?.expectedRenderCount,
      requestType,
      1
    );
    const expectedRenderNames = resolveTaskExpectedRenderNames({
      title: task?.title,
      requestType,
      expectedRenderCount,
      expectedRenderNames: task?.expectedRenderNames,
    });
    if (!Array.isArray(expectedRenderNames) || expectedRenderNames.length <= 0) continue;
    const rankTs = Math.max(
      safeIsoToTs(task?.updatedAt),
      safeIsoToTs(task?.createdAt)
    );
    const candidateBase = {
      taskId,
      taskTitle: sanitizeTaskTitle(task?.title, ''),
      taskStatus: status,
      requestType,
      expectedRenderCount,
      rankTs,
    };
    const isActive = TASK_EXPECTED_RENDER_MATCH_ACTIVE_STATUSES.has(status);
    for (const expectedRenderNameRaw of expectedRenderNames) {
      const expectedRenderName = sanitizeTaskExpectedRenderName(expectedRenderNameRaw);
      const key = normalizeExpectedRenderLookupKey(expectedRenderName, true);
      if (!key) continue;
      const candidate = {
        ...candidateBase,
        expectedRenderName,
      };
      const allList = allByKey.get(key) || [];
      allList.push(candidate);
      allByKey.set(key, allList);
      if (isActive) {
        const activeList = activeByKey.get(key) || [];
        activeList.push(candidate);
        activeByKey.set(key, activeList);
      }
    }
  }

  for (const [key, list] of allByKey.entries()) {
    allByKey.set(key, sortTaskExpectedRenderCandidates(list));
  }
  for (const [key, list] of activeByKey.entries()) {
    activeByKey.set(key, sortTaskExpectedRenderCandidates(list));
  }
  return { activeByKey, allByKey };
}

function findExpectedRenderTaskMatch(catalog, detectedRenderName = '') {
  const key = normalizeExpectedRenderLookupKey(detectedRenderName, true);
  if (!key) return null;
  const active = Array.isArray(catalog?.activeByKey?.get(key))
    ? catalog.activeByKey.get(key)
    : [];
  if (active.length > 0) return active[0];
  const all = Array.isArray(catalog?.allByKey?.get(key))
    ? catalog.allByKey.get(key)
    : [];
  if (all.length > 0) return all[0];
  return null;
}

function normalizeTaskRefsInput(value) {
  let src = [];
  if (Array.isArray(value)) {
    src = value;
  } else if (typeof value === 'string') {
    src = String(value || '').split(/[,;\n]+/);
  } else {
    src = [];
  }

  const seen = new Set();
  const out = [];
  for (const raw of src) {
    const normalized = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TASK_REF_LEN);
    if (!normalized) continue;
    const key = normalizeAscii(normalized).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= MAX_TASK_REFS) break;
  }
  return out;
}

function sanitizeTaskRefForStorage(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TASK_REF_LEN);
}

function parseTaskRefsJson(value) {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return normalizeTaskRefsInput(parsed);
  } catch {
    return [];
  }
}

function normalizeTaskRefLookup(value) {
  return normalizeAscii(value).replace(/\s+/g, ' ').trim();
}

function addTaskRefAlias(aliasToCanonical, alias, canonical) {
  const key = normalizeTaskRefLookup(alias);
  const target = String(canonical || '').trim();
  if (!key || !target) return;
  if (!aliasToCanonical.has(key)) {
    aliasToCanonical.set(key, target);
  }
}

function normalizePostprodProjectsResyncTtlMs(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return DEFAULT_POSTPROD_PROJECTS_RESYNC_TTL_MS;
  return Math.max(
    MIN_POSTPROD_PROJECTS_RESYNC_TTL_MS,
    Math.min(MAX_POSTPROD_PROJECTS_RESYNC_TTL_MS, Math.trunc(raw))
  );
}

function resetPostprodProjectsCatalogCache(cacheState) {
  if (!cacheState || typeof cacheState !== 'object') return;
  cacheState.sharedStore = null;
  cacheState.stmts = null;
  cacheState.items = [];
  cacheState.expiresAtMs = 0;
  cacheState.lastBuiltAtMs = 0;
}

const postprodProjectsCatalogCacheState = {
  sharedStore: null,
  stmts: null,
  items: [],
  expiresAtMs: 0,
  lastBuiltAtMs: 0,
  ttlMs: normalizePostprodProjectsResyncTtlMs(process.env.UU_POSTPROD_PROJECTS_RESYNC_TTL_MS),
};

function syncProjectsIndexFromSharedStore(sharedStore, stmts) {
  if (!stmts || typeof stmts.upsertProjectById?.run !== 'function') return;
  if (!sharedStore || typeof sharedStore.loadProjectsDoc !== 'function') return;
  let projectsDoc = null;
  try {
    projectsDoc = sharedStore.loadProjectsDoc();
  } catch {
    projectsDoc = null;
  }
  const projects = Array.isArray(projectsDoc?.projects) ? projectsDoc.projects : [];
  if (projects.length <= 0) return;
  const now = nowIso();
  for (const project of projects) {
    const id = String(project?.id || '').trim();
    const name = String(project?.name || '').trim();
    const code = String(project?.code || project?.projectCode || '').trim();
    const projectId = id || name || code;
    if (!projectId) continue;
    let meta = {};
    if (id && typeof sharedStore.readProjectMeta === 'function') {
      try {
        meta = sharedStore.readProjectMeta(id) || {};
      } catch {
        meta = {};
      }
    }
    const modeDefault = String(meta?.modeDefault || project?.modeDefault || '').trim().slice(0, 32);
    const usageMode = normalizeProjectUsageMode(meta?.usageMode) || 'other';
    const referentUserId = Number(meta?.referentUserId);
    stmts.upsertProjectById.run(
      projectId,
      code,
      name || projectId,
      modeDefault,
      usageMode,
      Number.isFinite(referentUserId) && referentUserId > 0 ? Math.trunc(referentUserId) : null,
      now,
      now
    );
  }
}

function buildSharedStoreProjectPathIndex(sharedStore) {
  if (!sharedStore || typeof sharedStore.loadProjectsDoc !== 'function') {
    return new Map();
  }
  let projectsDoc = null;
  try {
    projectsDoc = sharedStore.loadProjectsDoc();
  } catch {
    projectsDoc = null;
  }
  const projects = Array.isArray(projectsDoc?.projects) ? projectsDoc.projects : [];
  const out = new Map();
  for (const project of projects) {
    const id = String(project?.id || '').trim();
    const name = String(project?.name || '').trim();
    const code = String(project?.code || project?.projectCode || '').trim();
    const uprojectPath = String(project?.uproject || project?.uprojectPath || '').trim();
    if (!uprojectPath) continue;
    if (id) out.set(id, uprojectPath);
    if (name) out.set(name, uprojectPath);
    if (code) out.set(code, uprojectPath);
  }
  return out;
}

function normalizeProjectMetaStatus(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw === 'PAS') return 'PAD';
  return raw;
}

function isValidatedPostprodProjectStatus(value) {
  const lookup = normalizeRoleLookupKey(value);
  if (!lookup) return false;
  return lookup === 'pad'
    || lookup === 'valide'
    || lookup === 'validee'
    || lookup === 'validated'
    || lookup === 'ready'
    || lookup === 'approved';
}

function getPostprodProjectVisibilityPolicy(roleRaw) {
  const role = normalizeRole(roleRaw, DEFAULT_FALLBACK_ROLE);
  if (role === 'Graphiste') return 'postprod_only';
  if (
    role === 'Maintenance'
    || role === 'Responsable Fabrication'
    || role === 'Integrateur'
  ) {
    return 'all';
  }
  return 'validated_only';
}

function buildSharedStoreProjectMetaIndex(sharedStore) {
  const out = new Map();
  if (!sharedStore || typeof sharedStore.loadProjectsDoc !== 'function') {
    return out;
  }
  let projectsDoc = null;
  try {
    projectsDoc = sharedStore.loadProjectsDoc();
  } catch {
    projectsDoc = null;
  }
  const projects = Array.isArray(projectsDoc?.projects) ? projectsDoc.projects : [];
  for (const project of projects) {
    const id = String(project?.id || '').trim();
    const name = String(project?.name || '').trim();
    const code = String(project?.code || project?.projectCode || '').trim();
    const canonical = id || name || code;
    if (!canonical) continue;

    let meta = {};
    if (id && typeof sharedStore.readProjectMeta === 'function') {
      try {
        meta = sharedStore.readProjectMeta(id) || {};
      } catch {
        meta = {};
      }
    }

    const normalized = {
      status: normalizeProjectMetaStatus(meta?.status),
      usageMode: normalizeProjectUsageMode(meta?.usageMode),
    };

    const aliases = [canonical, id, name, code].filter(Boolean);
    for (const alias of aliases) {
      if (!out.has(alias)) {
        out.set(alias, normalized);
        continue;
      }
      const prev = out.get(alias) || {};
      out.set(alias, {
        status: String(prev?.status || '').trim() || normalized.status,
        usageMode: normalizeProjectUsageMode(prev?.usageMode) || normalized.usageMode,
      });
    }
  }
  return out;
}

function loadPostprodProjectsCatalog(sharedStore, stmts, options = null) {
  const opts = options && typeof options === 'object' ? options : {};
  const cacheState = opts.cacheState && typeof opts.cacheState === 'object'
    ? opts.cacheState
    : postprodProjectsCatalogCacheState;
  const ttlMs = normalizePostprodProjectsResyncTtlMs(
    opts.ttlMs != null
      ? opts.ttlMs
      : (
        process.env.UU_POSTPROD_PROJECTS_RESYNC_TTL_MS != null
          ? process.env.UU_POSTPROD_PROJECTS_RESYNC_TTL_MS
          : cacheState.ttlMs
      )
  );
  const forceRefresh = opts.force === true || opts.forceRefresh === true;
  const nowMs = Date.now();

  if (cacheState.sharedStore !== sharedStore || cacheState.stmts !== stmts || cacheState.ttlMs !== ttlMs) {
    resetPostprodProjectsCatalogCache(cacheState);
    cacheState.sharedStore = sharedStore;
    cacheState.stmts = stmts;
    cacheState.ttlMs = ttlMs;
  }

  if (!forceRefresh && nowMs < Number(cacheState.expiresAtMs || 0)) {
    return Array.isArray(cacheState.items) ? cacheState.items : [];
  }

  let computed = [];
  const sharedStoreProjectPathByRef = buildSharedStoreProjectPathIndex(sharedStore);
  const sharedStoreProjectMetaByRef = buildSharedStoreProjectMetaIndex(sharedStore);
  if (stmts && typeof stmts.listProjectsSql?.all === 'function') {
    syncProjectsIndexFromSharedStore(sharedStore, stmts);
    let sqlRows = [];
    try {
      sqlRows = stmts.listProjectsSql.all();
    } catch {
      sqlRows = [];
    }
    const mappedSql = (Array.isArray(sqlRows) ? sqlRows : [])
      .map((row) => {
        const id = String(row?.id || '').trim();
        const name = String(row?.name || '').trim();
        const code = String(row?.code || '').trim();
        if (!id && !name && !code) return null;
        const canonicalId = id || name || code;
        const metaEntry = sharedStoreProjectMetaByRef.get(canonicalId)
          || sharedStoreProjectMetaByRef.get(id)
          || sharedStoreProjectMetaByRef.get(name)
          || sharedStoreProjectMetaByRef.get(code)
          || {};
        const usageMode = normalizeProjectUsageMode(row?.usage_mode)
          || normalizeProjectUsageMode(metaEntry?.usageMode)
          || 'other';
        const status = normalizeProjectMetaStatus(metaEntry?.status);
        return {
          id: canonicalId,
          name: name || canonicalId,
          code,
          uprojectPath: String(
            sharedStoreProjectPathByRef.get(canonicalId)
            || sharedStoreProjectPathByRef.get(id)
            || sharedStoreProjectPathByRef.get(name)
            || sharedStoreProjectPathByRef.get(code)
            || ''
          ).trim(),
          status,
          metaStatus: status,
          usageMode,
          metaUsageMode: usageMode,
        };
      })
      .filter(Boolean);
    if (mappedSql.length > 0) {
      computed = mappedSql;
    }
  }

  if (computed.length <= 0) {
    if (!sharedStore || typeof sharedStore.loadProjectsDoc !== 'function') {
      computed = [];
    } else {
      let projectsDoc = null;
      try {
        projectsDoc = sharedStore.loadProjectsDoc();
      } catch {
        projectsDoc = null;
      }
      const projects = Array.isArray(projectsDoc?.projects) ? projectsDoc.projects : [];
      const out = [];
      for (const project of projects) {
        const id = String(project?.id || '').trim();
        const name = String(project?.name || '').trim();
        const code = String(project?.code || project?.projectCode || '').trim();
        const canonicalId = id || name || code;
        if (!canonicalId) continue;
        let meta = {};
        if (id && typeof sharedStore.readProjectMeta === 'function') {
          try {
            meta = sharedStore.readProjectMeta(id) || {};
          } catch {
            meta = {};
          }
        }
        const usageMode = normalizeProjectUsageMode(meta?.usageMode) || 'other';
        const status = normalizeProjectMetaStatus(meta?.status);
        out.push({
          id: canonicalId,
          name: name || canonicalId,
          code,
          uprojectPath: String(project?.uproject || project?.uprojectPath || '').trim(),
          status,
          metaStatus: status,
          usageMode,
          metaUsageMode: usageMode,
        });
      }
      computed = out;
    }
  }

  cacheState.items = Array.isArray(computed) ? computed : [];
  cacheState.lastBuiltAtMs = nowMs;
  cacheState.expiresAtMs = nowMs + ttlMs;
  return cacheState.items;
}

function buildProjectTaskRefCatalog(sharedStore, stmts = null) {
  const aliasToCanonical = new Map();
  const projects = loadPostprodProjectsCatalog(sharedStore, stmts);
  for (const project of projects) {
    const id = String(project?.id || '').trim();
    const name = String(project?.name || '').trim();
    const code = String(project?.code || '').trim();
    const canonical = id || name || code;
    if (!canonical) continue;
    addTaskRefAlias(aliasToCanonical, canonical, canonical);
    addTaskRefAlias(aliasToCanonical, id, canonical);
    addTaskRefAlias(aliasToCanonical, name, canonical);
    addTaskRefAlias(aliasToCanonical, code, canonical);
  }
  return aliasToCanonical;
}

function parseProjectUsageModeFilters(searchParams) {
  if (!searchParams || typeof searchParams.getAll !== 'function') return [];
  const rawList = [
    ...searchParams.getAll('usageMode'),
    ...searchParams.getAll('usageModes'),
  ];
  const out = [];
  const seen = new Set();
  for (const raw of rawList) {
    const parts = String(raw || '').split(/[,\n;]+/g);
    for (const part of parts) {
      const normalized = normalizeProjectUsageMode(part);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);
    }
  }
  return out;
}

function listPostprodProjects(sharedStore, usageModeFilters = [], stmts = null, actorRole = '') {
  const usageFilterSet = new Set(
    (Array.isArray(usageModeFilters) ? usageModeFilters : [])
      .map((mode) => normalizeProjectUsageMode(mode))
      .filter(Boolean)
  );

  const roleVisibilityPolicy = getPostprodProjectVisibilityPolicy(actorRole);
  const projects = loadPostprodProjectsCatalog(sharedStore, stmts);
  const out = projects.filter((project) => {
    const usageMode = normalizeProjectUsageMode(project?.usageMode) || 'other';
    if (usageFilterSet.size > 0 && !usageFilterSet.has(usageMode)) return false;
    if (roleVisibilityPolicy === 'postprod_only') {
      if (!AUTO_RENDER_PROJECT_USAGE_MODES.has(usageMode)) return false;
      const status = normalizeProjectMetaStatus(project?.status || project?.metaStatus || '');
      if (status !== 'PAD') return false;
    }
    if (roleVisibilityPolicy === 'validated_only') {
      const status = normalizeProjectMetaStatus(project?.status || project?.metaStatus || '');
      if (status !== 'PAD') return false;
    }
    return true;
  }).map((project) => {
    const usageMode = normalizeProjectUsageMode(project?.usageMode) || 'other';
    const status = normalizeProjectMetaStatus(project?.status || project?.metaStatus || '');
    return {
      id: String(project?.id || '').trim(),
      name: String(project?.name || '').trim(),
      code: String(project?.code || '').trim(),
      uprojectPath: String(project?.uprojectPath || '').trim(),
      status,
      metaStatus: status,
      usageMode,
      metaUsageMode: usageMode,
    };
  });

  out.sort((a, b) => {
    const aKey = String(a?.name || a?.id || '').toLowerCase();
    const bKey = String(b?.name || b?.id || '').toLowerCase();
    return aKey.localeCompare(bKey);
  });

  return out;
}

function sanitizeResourceIndexCode(value, fallback = '') {
  const raw = String(value || '').trim();
  const safe = raw || String(fallback || '').trim();
  return safe.slice(0, MAX_RESOURCE_CODE_LEN);
}

function sanitizeResourceIndexType(value, fallback = '') {
  const raw = String(value || '').trim();
  const safe = raw || String(fallback || '').trim();
  return safe.slice(0, MAX_RESOURCE_TYPE_LEN);
}

function sanitizeResourceIndexTitle(value, fallback = '') {
  const raw = String(value || '').trim();
  const safe = raw || String(fallback || '').trim();
  return safe.slice(0, MAX_RESOURCE_TITLE_LEN);
}

function sanitizeResourceIndexSourcePath(value) {
  return String(value || '').trim().slice(0, MAX_RESOURCE_SOURCE_PATH_LEN);
}

function safeParseObjectJson(value, fallback = {}) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function normalizeResourceIndexMetadataForStorage(item) {
  const source = item && typeof item === 'object' ? item : {};
  const uid = sanitizeResourceIndexCode(source.uid || source.listingUid || '', '');
  const title = sanitizeResourceIndexTitle(
    source.title || source.name || source.displayName || uid || '',
    uid
  );
  const type = sanitizeResourceIndexType(source.type || source.listingType || source.kind || '');
  const sourcePath = sanitizeResourceIndexSourcePath(source.sourcePath || source.path || '');
  const metadata = {
    uid: uid || title,
    listingUid: uid || title,
    title: title || uid,
    name: title || uid,
    displayName: title || uid,
    type,
    listingType: type,
    sourcePath,
    path: sourcePath,
    seller: String(source.seller || '').trim(),
    listingUrl: String(source.listingUrl || '').trim(),
    thumbLocal: String(source.thumbLocal || source.thumbnailLocal || '').trim(),
    thumbnailUrl: String(source.thumbnailUrl || source.thumbUrl || '').trim(),
    thumbUrl: String(source.thumbUrl || source.thumbnailUrl || '').trim(),
    thumbnails: Array.isArray(source.thumbnails) ? source.thumbnails : [],
    ueVersions: Array.isArray(source.ueVersions) ? source.ueVersions : [],
    targetPlatforms: Array.isArray(source.targetPlatforms) ? source.targetPlatforms : [],
    assetFormats: Array.isArray(source.assetFormats) ? source.assetFormats : [],
    distribution: String(source.distribution || '').trim(),
  };
  if (source.user && typeof source.user === 'object') {
    metadata.user = source.user;
  }
  const normalizedMeta = normalizeJsonValueWithSize(metadata, {
    fallbackValue: {},
    maxBytes: MAX_RESOURCE_METADATA_BYTES,
    invalidError: 'invalid_resource_metadata',
    tooLargeError: 'resource_metadata_too_large',
  });
  if (!normalizedMeta.ok) {
    const fallback = {
      uid: uid || title,
      listingUid: uid || title,
      title: title || uid,
      name: title || uid,
      displayName: title || uid,
      type,
      listingType: type,
      sourcePath,
      path: sourcePath,
    };
    return { metadata: fallback, metadataJson: JSON.stringify(fallback) };
  }
  return {
    metadata,
    metadataJson: normalizedMeta.json,
  };
}

function buildPostprodResourcePayload(row) {
  const metadata = safeParseObjectJson(row?.metadata_json, {});
  const code = sanitizeResourceIndexCode(row?.code || '');
  const title = sanitizeResourceIndexTitle(metadata?.title || row?.title || code, code);
  const uid = sanitizeResourceIndexCode(metadata?.uid || metadata?.listingUid || code, title);
  const type = sanitizeResourceIndexType(metadata?.type || metadata?.listingType || row?.type || '');
  const sourcePath = sanitizeResourceIndexSourcePath(
    metadata?.sourcePath || metadata?.path || row?.source_path || ''
  );
  return {
    ...metadata,
    uid: uid || title,
    listingUid: uid || title,
    code: code || uid || title,
    title: title || uid,
    name: title || uid,
    displayName: title || uid,
    type,
    listingType: type,
    sourcePath,
    path: sourcePath,
    thumbLocal: String(metadata?.thumbLocal || '').trim(),
    thumbnailUrl: String(metadata?.thumbnailUrl || metadata?.thumbUrl || '').trim(),
    thumbUrl: String(metadata?.thumbUrl || metadata?.thumbnailUrl || '').trim(),
    thumbnails: Array.isArray(metadata?.thumbnails) ? metadata.thumbnails : [],
    seller: String(metadata?.seller || '').trim(),
    listingUrl: String(metadata?.listingUrl || '').trim(),
    createdAt: String(row?.created_at || '').trim(),
    updatedAt: String(row?.updated_at || '').trim(),
  };
}

function syncResourcesIndexFromLibrary(stmts, sharedStore, { now = nowIso() } = {}) {
  if (!stmts || typeof stmts.upsertResourceIndexByCode?.run !== 'function') {
    return { ok: false, error: 'resources_index_unavailable', processed: 0, inserted: 0, updated: 0 };
  }
  if (!sharedStore || typeof sharedStore.loadLibraryIndexDoc !== 'function') {
    return { ok: false, error: 'library_unavailable', processed: 0, inserted: 0, updated: 0 };
  }
  let libraryDoc = null;
  try {
    libraryDoc = sharedStore.loadLibraryIndexDoc();
  } catch {
    libraryDoc = null;
  }
  const items = Array.isArray(libraryDoc?.items) ? libraryDoc.items : [];
  let processed = 0;
  let inserted = 0;
  let updated = 0;
  for (const item of items) {
    const normalized = normalizeResourceIndexMetadataForStorage(item);
    const code = sanitizeResourceIndexCode(
      item?.uid || item?.listingUid || normalized?.metadata?.uid || normalized?.metadata?.title || '',
      normalized?.metadata?.title || ''
    );
    const title = sanitizeResourceIndexTitle(
      normalized?.metadata?.title || item?.title || item?.name || '',
      code
    );
    if (!code || !title) continue;
    const type = sanitizeResourceIndexType(normalized?.metadata?.type || item?.type || item?.listingType || '');
    const sourcePath = sanitizeResourceIndexSourcePath(
      normalized?.metadata?.sourcePath || item?.sourcePath || item?.path || ''
    );
    const existing = stmts.findResourceIndexByCode.get(code);
    stmts.upsertResourceIndexByCode.run(
      code,
      type,
      title,
      sourcePath,
      normalized.metadataJson,
      String(existing?.created_at || now),
      now
    );
    processed += 1;
    if (existing) updated += 1;
    else inserted += 1;
  }
  return { ok: true, processed, inserted, updated, totalSource: items.length };
}

function buildResourceTaskRefCatalog(stmts) {
  const aliasToCanonical = new Map();
  const rows = Array.isArray(stmts?.listResourceIndexTaskRefs?.all?.())
    ? stmts.listResourceIndexTaskRefs.all()
    : [];
  for (const row of rows) {
    const code = sanitizeResourceIndexCode(row?.code || '');
    const title = sanitizeResourceIndexTitle(row?.title || '', code);
    const canonical = code || title;
    if (!canonical) continue;
    addTaskRefAlias(aliasToCanonical, canonical, canonical);
    addTaskRefAlias(aliasToCanonical, code, canonical);
    addTaskRefAlias(aliasToCanonical, title, canonical);
  }
  return aliasToCanonical;
}

function listPostprodResources(stmts) {
  if (!stmts || typeof stmts.listResourcesIndex?.all !== 'function') return [];
  const rows = stmts.listResourcesIndex.all();
  return (Array.isArray(rows) ? rows : []).map(buildPostprodResourcePayload);
}

function resolvePostprodResourceByRef(stmts, value) {
  const resourceRef = String(value || '').trim();
  if (!resourceRef) return { ok: false, error: 'invalid_resource_id' };
  if (!stmts || typeof stmts.findResourceIndexByRef?.get !== 'function') {
    return { ok: false, error: 'resource_not_found' };
  }

  const row = stmts.findResourceIndexByRef.get(resourceRef, resourceRef);
  if (row) return { ok: true, item: buildPostprodResourcePayload(row) };
  return { ok: false, error: 'resource_not_found' };
}

function normalizeProjectUsageMode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  const aliases = new Map([
    ['live', 'live'],
    ['auto_render', 'auto_render'],
    ['render', 'auto_render'],
    ['rendu_automatique', 'auto_render'],
    ['rendu automatique', 'auto_render'],
    ['live_auto_render', 'live_auto_render'],
    ['live + rendu automatique', 'live_auto_render'],
    ['live et rendu automatique', 'live_auto_render'],
    ['live_and_auto_render', 'live_auto_render'],
    ['other', 'other'],
    ['autre', 'other'],
  ]);
  return aliases.get(key) || '';
}

function resolveProjectForRender(sharedStore, value, stmts = null) {
  const projectRef = String(value || '').trim();
  if (!projectRef) {
    return { ok: true, project: null, usageMode: '' };
  }
  const projects = loadPostprodProjectsCatalog(sharedStore, stmts);
  if (projects.length <= 0 && (!sharedStore || typeof sharedStore.loadProjectsDoc !== 'function')) {
    return { ok: true, project: null, usageMode: '' };
  }
  const byId = projects.find((project) => String(project?.id || '').trim() === projectRef) || null;
  const lookup = normalizeTaskRefLookup(projectRef);
  const byName = byId
    || projects.find((project) => (
      normalizeTaskRefLookup(project?.name) === lookup ||
      normalizeTaskRefLookup(project?.code) === lookup
    ))
    || null;
  if (!byName) {
    return { ok: false, error: 'unknown_project' };
  }
  const projectId = String(byName?.id || '').trim();
  const projectName = String(byName?.name || '').trim();
  return {
    ok: true,
    project: {
      id: projectId,
      name: projectName || projectRef,
    },
    usageMode: normalizeProjectUsageMode(byName?.usageMode),
  };
}

function ensureProjectCanAutoRender(sharedStore, value, stmts = null) {
  const resolved = resolveProjectForRender(sharedStore, value, stmts);
  if (!resolved.ok) return resolved;
  if (!resolved.project) return resolved;
  if (AUTO_RENDER_PROJECT_USAGE_MODES.has(resolved.usageMode)) return resolved;
  return {
    ok: false,
    error: 'project_not_render_enabled',
    usageMode: resolved.usageMode,
    project: resolved.project,
  };
}

function resolveTaskRefsFromCatalog(value, aliasToCanonical) {
  const refs = normalizeTaskRefsInput(value);
  if (!(aliasToCanonical instanceof Map) || aliasToCanonical.size <= 0) {
    return { refs, invalidRefs: [] };
  }
  const out = [];
  const seen = new Set();
  const invalidRefs = [];
  for (const ref of refs) {
    const lookup = normalizeTaskRefLookup(ref);
    const canonical = aliasToCanonical.get(lookup);
    if (!canonical) {
      invalidRefs.push(ref);
      continue;
    }
    const canonicalKey = normalizeTaskRefLookup(canonical);
    if (!canonicalKey || seen.has(canonicalKey)) continue;
    seen.add(canonicalKey);
    out.push(canonical);
  }
  return { refs: out, invalidRefs };
}

function normalizeTaskStatus(value, fallback = 'A faire') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (TASK_STATUSES.includes(raw)) return raw;
  return TASK_STATUSES.includes(fallback) ? fallback : 'A faire';
}

function sanitizeRenderTemplateName(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_TEMPLATE_NAME_LEN);
}

function sanitizeRenderMapName(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_MAP_NAME_LEN);
}

function sanitizeRenderSequenceName(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_SEQUENCE_NAME_LEN);
}

function sanitizeRenderOutputProfile(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_OUTPUT_PROFILE_LEN);
}

function sanitizeRenderProjectName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_RENDER_PROJECT_NAME_LEN);
}

function sanitizeRenderPresetName(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_PRESET_NAME_LEN);
}

function sanitizeRenderFormName(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_FORM_NAME_LEN);
}

function sanitizeRenderFormPresetName(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_FORM_PRESET_NAME_LEN);
}

function normalizeRenderFormModeDefault(value, fallback = 'edit') {
  const raw = String(value || '').trim().toLowerCase();
  if (RENDER_FORM_MODE_DEFAULTS.has(raw)) return raw;
  return RENDER_FORM_MODE_DEFAULTS.has(fallback) ? fallback : 'edit';
}

function normalizeRenderFormLayout(value) {
  return normalizeJsonValueWithSize(value, {
    fallbackValue: {},
    maxBytes: MAX_RENDER_FORM_LAYOUT_BYTES,
    invalidError: 'invalid_render_form_layout',
    tooLargeError: 'render_form_layout_too_large',
  });
}

function normalizeRenderTemplateAllowedRoles(value, rolesCache) {
  let src = [];
  if (Array.isArray(value)) {
    src = value;
  } else if (typeof value === 'string') {
    const raw = String(value || '').trim();
    if (!raw) {
      src = [];
    } else {
      try {
        const parsed = JSON.parse(raw);
        src = Array.isArray(parsed) ? parsed : raw.split(/[,;\n]+/);
      } catch {
        src = raw.split(/[,;\n]+/);
      }
    }
  } else {
    src = [];
  }

  const seen = new Set();
  const out = [];
  for (const entry of src) {
    const resolved = resolveRoleInput(entry, rolesCache, '');
    if (!resolved) continue;
    const key = normalizeRoleLookupKey(resolved);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(resolved);
    if (out.length >= MAX_RENDER_ALLOWED_ROLES) break;
  }
  return out;
}

function normalizeRenderTemplateAllowedRolesJson(value, rolesCache) {
  const roles = normalizeRenderTemplateAllowedRoles(value, rolesCache);
  try {
    return JSON.stringify(roles);
  } catch {
    return '[]';
  }
}

function sanitizeRenderOutputPath(value) {
  return String(value || '').trim().slice(0, MAX_RENDER_OUTPUT_PATH_LEN);
}

function sanitizeRenderErrorMessage(value) {
  return String(value || '').trim().slice(0, MAX_RENDER_ERROR_LEN);
}

function sanitizeRenderComment(value) {
  return String(value || '').trim().slice(0, MAX_RENDER_COMMENT_LEN);
}

function sanitizeRenderHealthEventLabel(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').trim();
  return safe.slice(0, MAX_RENDER_HEALTH_EVENT_LABEL_LEN);
}

function sanitizeRenderHealthEventDetail(value) {
  return String(value || '').trim().slice(0, MAX_RENDER_HEALTH_EVENT_DETAIL_LEN);
}

function sanitizeRenderHealthEventSource(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').trim();
  return safe.slice(0, MAX_RENDER_HEALTH_EVENT_SOURCE_LEN);
}

function normalizeRenderHealthEventState(value, fallback = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (RENDER_HEALTH_EVENT_STATES.has(raw)) return raw;
  const fb = String(fallback || '').trim().toLowerCase();
  if (RENDER_HEALTH_EVENT_STATES.has(fb)) return fb;
  return '';
}

function normalizeRenderHealthEventKind(value, fallback = '') {
  const raw = String(value || '').trim().toLowerCase();
  if (RENDER_HEALTH_EVENT_KINDS.has(raw)) return raw;
  const fb = String(fallback || '').trim().toLowerCase();
  if (RENDER_HEALTH_EVENT_KINDS.has(fb)) return fb;
  return '';
}

function sanitizeRenderWorkerKey(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_RENDER_WORKER_KEY_LEN);
}

function sanitizeRenderWorkerName(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_WORKER_NAME_LEN);
}

function normalizeRenderWorkerCapabilityKey(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .slice(0, MAX_RENDER_WORKER_CAPABILITY_KEY_LEN);
}

function normalizeRenderWorkerCapabilityAtom(value) {
  if (value == null) return '';
  const str = String(value).replace(/\s+/g, ' ').trim().toLowerCase();
  if (!str) return '';
  return str.slice(0, MAX_RENDER_WORKER_CAPABILITY_VALUE_LEN);
}

function normalizeRenderWorkerCapabilitiesObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  let count = 0;

  for (const [rawKey, rawValue] of Object.entries(value)) {
    if (count >= MAX_RENDER_WORKER_CAPABILITY_ITEMS) break;
    const key = normalizeRenderWorkerCapabilityKey(rawKey);
    if (!key) continue;

    if (rawValue === true || rawValue === false) {
      out[key] = rawValue;
      count += 1;
      continue;
    }

    if (typeof rawValue === 'number') {
      if (!Number.isFinite(rawValue)) continue;
      out[key] = Number(rawValue);
      count += 1;
      continue;
    }

    if (typeof rawValue === 'string') {
      const atom = normalizeRenderWorkerCapabilityAtom(rawValue);
      if (!atom) continue;
      out[key] = atom;
      count += 1;
      continue;
    }

    if (Array.isArray(rawValue)) {
      const seen = new Set();
      const items = [];
      for (const item of rawValue) {
        const atom = normalizeRenderWorkerCapabilityAtom(item);
        if (!atom || seen.has(atom)) continue;
        seen.add(atom);
        items.push(atom);
        if (items.length >= MAX_RENDER_WORKER_CAPABILITY_ITEMS) break;
      }
      if (items.length <= 0) continue;
      out[key] = items;
      count += 1;
    }
  }

  return out;
}

function normalizeRenderWorkerCapabilities(value) {
  const normalized = normalizeJsonValueWithSize(value, {
    fallbackValue: {},
    maxBytes: MAX_RENDER_WORKER_CAPABILITIES_BYTES,
    invalidError: 'invalid_worker_capabilities',
    tooLargeError: 'worker_capabilities_too_large',
  });
  if (!normalized?.ok) return normalized;
  const parsed = parseRenderPayloadJson(normalized.json);
  const compact = normalizeRenderWorkerCapabilitiesObject(parsed);
  try {
    return { ok: true, capabilitiesJson: JSON.stringify(compact) };
  } catch {
    return { ok: false, error: 'invalid_worker_capabilities' };
  }
}

function parseRenderWorkerCapabilitiesJson(value) {
  const parsed = parseRenderPayloadJson(value);
  return normalizeRenderWorkerCapabilitiesObject(parsed);
}

function extractRenderJobRequiredCapabilities(jobRow) {
  const payload = parseRenderPayloadJson(jobRow?.payload_json);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};
  const execution = payload.execution && typeof payload.execution === 'object' && !Array.isArray(payload.execution)
    ? payload.execution
    : {};

  const raw =
    execution.requiredCapabilities
    ?? payload.requiredCapabilities
    ?? payload.workerRequiredCapabilities
    ?? null;

  if (Array.isArray(raw)) {
    return normalizeRenderWorkerCapabilitiesObject({ tags: raw });
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return normalizeRenderWorkerCapabilitiesObject(raw);
}

function extractRenderJobPreferredWorkerKey(jobRow) {
  const payload = parseRenderPayloadJson(jobRow?.payload_json);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';
  return sanitizeRenderWorkerKey(
    payload.preferredWorkerKey
    ?? payload.targetWorkerKey
    ?? payload.workerKey
    ?? ''
  );
}

function computeRenderWorkerCapabilitiesScore(capabilities) {
  if (!capabilities || typeof capabilities !== 'object') return 0;
  let score = 0;
  for (const value of Object.values(capabilities)) {
    score += 1;
    if (Array.isArray(value)) score += value.length;
  }
  return score;
}

function normalizeCapabilityCollection(value) {
  if (Array.isArray(value)) {
    const out = [];
    const seen = new Set();
    for (const item of value) {
      const atom = normalizeRenderWorkerCapabilityAtom(item);
      if (!atom || seen.has(atom)) continue;
      seen.add(atom);
      out.push(atom);
      if (out.length >= MAX_RENDER_WORKER_CAPABILITY_ITEMS) break;
    }
    return out;
  }
  const atom = normalizeRenderWorkerCapabilityAtom(value);
  return atom ? [atom] : [];
}

function workerCapabilityContains(workerValue, requiredValue) {
  if (requiredValue == null) return true;

  if (requiredValue === true) {
    return workerValue === true;
  }
  if (requiredValue === false) {
    return true;
  }

  if (typeof requiredValue === 'number') {
    if (!Number.isFinite(requiredValue)) return true;
    const workerNum = Number(workerValue);
    if (!Number.isFinite(workerNum)) return false;
    return workerNum >= requiredValue;
  }

  if (typeof requiredValue === 'string') {
    const requiredAtom = normalizeRenderWorkerCapabilityAtom(requiredValue);
    if (!requiredAtom) return true;
    const workerItems = normalizeCapabilityCollection(workerValue);
    return workerItems.includes(requiredAtom);
  }

  if (Array.isArray(requiredValue)) {
    const requiredItems = normalizeCapabilityCollection(requiredValue);
    if (requiredItems.length <= 0) return true;
    const workerItems = normalizeCapabilityCollection(workerValue);
    if (workerItems.length <= 0) return false;
    const workerSet = new Set(workerItems);
    for (const item of requiredItems) {
      if (!workerSet.has(item)) return false;
    }
    return true;
  }

  return false;
}

function doesWorkerMatchRequiredCapabilities(workerCapabilities, requiredCapabilities) {
  const required =
    requiredCapabilities && typeof requiredCapabilities === 'object' && !Array.isArray(requiredCapabilities)
      ? requiredCapabilities
      : {};
  const requiredEntries = Object.entries(required);
  if (requiredEntries.length <= 0) return true;

  const worker =
    workerCapabilities && typeof workerCapabilities === 'object' && !Array.isArray(workerCapabilities)
      ? workerCapabilities
      : {};

  for (const [rawKey, requiredValue] of requiredEntries) {
    const key = normalizeRenderWorkerCapabilityKey(rawKey);
    if (!key) continue;
    if (!workerCapabilityContains(worker[key], requiredValue)) {
      return false;
    }
  }
  return true;
}

function buildRenderDispatchPairs(selectedJobs, availableWorkers, maxPairs) {
  const jobs = Array.isArray(selectedJobs) ? selectedJobs : [];
  const workers = Array.isArray(availableWorkers) ? availableWorkers : [];
  const target = Math.max(0, Math.trunc(Number(maxPairs) || 0));
  if (target <= 0 || jobs.length <= 0 || workers.length <= 0) {
    return { pairs: [], unmatchedJobs: jobs.length };
  }

  const pool = workers.map((worker, index) => {
    const capabilities = parseRenderWorkerCapabilitiesJson(worker?.capabilities_json);
    const workerKey = sanitizeRenderWorkerKey(worker?.worker_key ?? worker?.workerKey ?? '');
    return {
      worker,
      index,
      workerKey,
      capabilities,
      capabilityScore: computeRenderWorkerCapabilitiesScore(capabilities),
    };
  });

  const pairs = [];
  let unmatchedJobs = 0;

  for (let jobIndex = 0; jobIndex < jobs.length; jobIndex += 1) {
    if (pairs.length >= target) break;
    if (pool.length <= 0) {
      unmatchedJobs += (jobs.length - jobIndex);
      break;
    }
    const job = jobs[jobIndex];
    const requiredCapabilities = extractRenderJobRequiredCapabilities(job);
    const preferredWorkerKey = extractRenderJobPreferredWorkerKey(job);

    let bestPoolIndex = -1;
    if (preferredWorkerKey) {
      for (let i = 0; i < pool.length; i += 1) {
        const candidate = pool[i];
        if (!candidate || candidate.workerKey !== preferredWorkerKey) continue;
        if (!doesWorkerMatchRequiredCapabilities(candidate.capabilities, requiredCapabilities)) continue;
        bestPoolIndex = i;
        break;
      }
    }
    if (bestPoolIndex < 0) {
      for (let i = 0; i < pool.length; i += 1) {
        const candidate = pool[i];
        if (preferredWorkerKey && candidate.workerKey !== preferredWorkerKey) continue;
        if (!doesWorkerMatchRequiredCapabilities(candidate.capabilities, requiredCapabilities)) continue;
        if (bestPoolIndex < 0) {
          bestPoolIndex = i;
          continue;
        }
        const currentBest = pool[bestPoolIndex];
        if (candidate.capabilityScore < currentBest.capabilityScore) {
          bestPoolIndex = i;
          continue;
        }
        if (candidate.capabilityScore === currentBest.capabilityScore && candidate.index < currentBest.index) {
          bestPoolIndex = i;
        }
      }
    }

    if (bestPoolIndex < 0) {
      unmatchedJobs += 1;
      continue;
    }

    const selectedWorker = pool.splice(bestPoolIndex, 1)[0];
    pairs.push({
      job,
      worker: selectedWorker.worker,
      requiredCapabilities,
    });
  }

  return { pairs, unmatchedJobs };
}

function normalizeRenderDispatchPriority(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(MAX_RENDER_DISPATCH_PRIORITY, Math.trunc(n)));
}

function normalizeRenderDispatchQuota(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(MAX_RENDER_DISPATCH_QUOTA, Math.trunc(n)));
}

function normalizeRenderDispatchProjectMap(value, normalizeValue) {
  const out = new Map();
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue;
      const projectName = sanitizeRenderProjectName(entry.projectName || entry.project || entry.name || '');
      const normalized = normalizeValue(entry.value ?? entry.priority ?? entry.quota);
      if (!projectName || normalized == null) continue;
      out.set(projectName, normalized);
      if (out.size >= MAX_RENDER_DISPATCH_PROJECT_RULES) break;
    }
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, raw] of Object.entries(value)) {
      const projectName = sanitizeRenderProjectName(key);
      const normalized = normalizeValue(raw);
      if (!projectName || normalized == null) continue;
      out.set(projectName, normalized);
      if (out.size >= MAX_RENDER_DISPATCH_PROJECT_RULES) break;
    }
  }
  return out;
}

function normalizeRenderDispatchPolicy(value) {
  const root =
    value && typeof value === 'object' && value.dispatchPolicy && typeof value.dispatchPolicy === 'object'
      ? value.dispatchPolicy
      : value && typeof value === 'object'
        ? value
        : {};

  const projectPriorities = normalizeRenderDispatchProjectMap(
    root.projectPriorities || root.priorities,
    normalizeRenderDispatchPriority
  );
  const projectQuotas = normalizeRenderDispatchProjectMap(
    root.projectQuotas || root.quotas,
    normalizeRenderDispatchQuota
  );
  const defaultPriority = normalizeRenderDispatchPriority(root.defaultPriority);
  const defaultQuota = normalizeRenderDispatchQuota(root.defaultQuota);
  const policy = {
    projectPriorities,
    projectQuotas,
    defaultPriority: defaultPriority == null ? DEFAULT_RENDER_DISPATCH_PRIORITY : defaultPriority,
    defaultQuota: defaultQuota == null ? null : defaultQuota,
  };
  policy.applied =
    policy.projectPriorities.size > 0 ||
    policy.projectQuotas.size > 0 ||
    policy.defaultPriority !== DEFAULT_RENDER_DISPATCH_PRIORITY ||
    policy.defaultQuota != null;
  return policy;
}

function serializeRenderDispatchProjectMap(value) {
  const src = value instanceof Map ? value : new Map();
  const out = {};
  for (const [projectName, rawValue] of src.entries()) {
    const key = sanitizeRenderProjectName(projectName);
    const normalizedValue = Number(rawValue);
    if (!key || !Number.isFinite(normalizedValue)) continue;
    out[key] = Math.trunc(normalizedValue);
  }
  return out;
}

function buildRenderDispatchPolicyStorageJson(dispatchPolicy) {
  const normalized = dispatchPolicy && typeof dispatchPolicy === 'object'
    ? dispatchPolicy
    : normalizeRenderDispatchPolicy({});
  const payload = {};
  if (normalized.defaultPriority !== DEFAULT_RENDER_DISPATCH_PRIORITY) {
    payload.defaultPriority = normalized.defaultPriority;
  }
  if (normalized.defaultQuota != null) {
    payload.defaultQuota = normalized.defaultQuota;
  }
  const projectPriorities = serializeRenderDispatchProjectMap(normalized.projectPriorities);
  if (Object.keys(projectPriorities).length > 0) {
    payload.projectPriorities = projectPriorities;
  }
  const projectQuotas = serializeRenderDispatchProjectMap(normalized.projectQuotas);
  if (Object.keys(projectQuotas).length > 0) {
    payload.projectQuotas = projectQuotas;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return '{}';
  }
}

function resolveRenderDispatchConfig(stmts) {
  const row = stmts?.findRenderDispatchPolicyById?.get(1) || null;
  const maxJobs = Math.min(
    MAX_RENDER_DISPATCH_MAX_JOBS,
    coercePositiveInt(row?.max_jobs, DEFAULT_RENDER_DISPATCH_MAX_JOBS, 1)
  );
  const dispatchPolicy = normalizeRenderDispatchPolicy(safeParseObjectJson(row?.policy_json, {}));
  return {
    id: 1,
    maxJobs,
    dispatchPolicy,
    updatedByUserId: Number.isFinite(Number(row?.updated_by_user_id))
      ? Number(row.updated_by_user_id)
      : null,
    createdAt: String(row?.created_at || '').trim(),
    updatedAt: String(row?.updated_at || '').trim(),
  };
}

function buildRenderDispatchPolicyPayload(config, { includeRules = false } = {}) {
  const dispatchConfig = config && typeof config === 'object'
    ? config
    : {
      maxJobs: DEFAULT_RENDER_DISPATCH_MAX_JOBS,
      dispatchPolicy: normalizeRenderDispatchPolicy({}),
      updatedByUserId: null,
      createdAt: '',
      updatedAt: '',
    };
  const policy = dispatchConfig.dispatchPolicy && typeof dispatchConfig.dispatchPolicy === 'object'
    ? dispatchConfig.dispatchPolicy
    : normalizeRenderDispatchPolicy({});
  const payload = {
    maxJobs: Math.min(
      MAX_RENDER_DISPATCH_MAX_JOBS,
      coercePositiveInt(dispatchConfig.maxJobs, DEFAULT_RENDER_DISPATCH_MAX_JOBS, 1)
    ),
    applied: policy.applied === true,
    defaultPriority: policy.defaultPriority,
    defaultQuota: policy.defaultQuota,
    projectPriorityCount: policy.projectPriorities instanceof Map ? policy.projectPriorities.size : 0,
    projectQuotaCount: policy.projectQuotas instanceof Map ? policy.projectQuotas.size : 0,
    updatedByUserId: dispatchConfig.updatedByUserId,
    createdAt: String(dispatchConfig.createdAt || '').trim(),
    updatedAt: String(dispatchConfig.updatedAt || '').trim(),
  };
  if (includeRules) {
    payload.projectPriorities = serializeRenderDispatchProjectMap(policy.projectPriorities);
    payload.projectQuotas = serializeRenderDispatchProjectMap(policy.projectQuotas);
  }
  return payload;
}

function resolveRequestedRenderDispatchConfig(body, dispatchConfig) {
  const bodyObject = body && typeof body === 'object' && !Array.isArray(body)
    ? body
    : {};
  const currentConfig = dispatchConfig && typeof dispatchConfig === 'object'
    ? dispatchConfig
    : resolveRenderDispatchConfig(null);
  const hasMaxJobsInput =
    bodyObject.maxJobs != null && String(bodyObject.maxJobs).trim() !== '';
  const hasDispatchPolicyInput =
    (
      bodyObject.dispatchPolicy
      && typeof bodyObject.dispatchPolicy === 'object'
      && !Array.isArray(bodyObject.dispatchPolicy)
    ) ||
    bodyObject.defaultPriority != null ||
    bodyObject.defaultQuota != null ||
    bodyObject.projectPriorities != null ||
    bodyObject.projectQuotas != null ||
    bodyObject.priorities != null ||
    bodyObject.quotas != null;
  const requestedMaxJobs = hasMaxJobsInput
    ? Math.min(
      MAX_RENDER_DISPATCH_MAX_JOBS,
      coercePositiveInt(bodyObject.maxJobs, currentConfig.maxJobs, 1)
    )
    : currentConfig.maxJobs;
  const requestedDispatchPolicy = hasDispatchPolicyInput
    ? normalizeRenderDispatchPolicy(bodyObject)
    : currentConfig.dispatchPolicy;
  return {
    bodyObject,
    hasMaxJobsInput,
    hasDispatchPolicyInput,
    shouldPersistDispatchConfig: hasMaxJobsInput || hasDispatchPolicyInput,
    requestedMaxJobs,
    requestedDispatchPolicy,
  };
}

function computeRenderDispatchFetchLimit(maxJobs, dispatchPolicy) {
  if (!dispatchPolicy?.applied) return maxJobs;
  const weightedByRules = (dispatchPolicy.projectPriorities.size + dispatchPolicy.projectQuotas.size) * 4;
  const weightedByBatch = maxJobs * 8;
  return Math.min(
    MAX_RENDER_DISPATCH_FETCH_LIMIT,
    Math.max(maxJobs, weightedByBatch, weightedByRules)
  );
}

function normalizeRenderProjectLoadMap(value) {
  const out = new Map();
  const push = (projectNameRaw, countRaw) => {
    const projectName = sanitizeRenderProjectName(projectNameRaw || '');
    const count = Number(countRaw);
    if (!projectName || !Number.isFinite(count)) return;
    out.set(projectName, Math.max(0, Math.trunc(count)));
  };
  if (value instanceof Map) {
    for (const [projectName, count] of value.entries()) {
      push(projectName, count);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue;
      push(entry.projectName || entry.project || entry.project_name, entry.count ?? entry.n);
    }
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [projectName, count] of Object.entries(value)) {
      push(projectName, count);
    }
  }
  return out;
}

function countRenderJobsByProject(jobs) {
  const out = new Map();
  const src = Array.isArray(jobs) ? jobs : [];
  for (const job of src) {
    const projectName = sanitizeRenderProjectName(job?.project_name || '');
    if (!projectName) continue;
    out.set(projectName, Number(out.get(projectName) || 0) + 1);
  }
  return out;
}

function normalizeDispatchRenderIds(value, maxCount = MAX_RENDER_DISPATCH_RENDER_IDS) {
  if (!Array.isArray(value)) return [];
  const limit = Math.max(1, Math.min(MAX_RENDER_DISPATCH_RENDER_IDS, Math.trunc(Number(maxCount) || MAX_RENDER_DISPATCH_RENDER_IDS)));
  const out = [];
  const seen = new Set();
  for (let i = 0; i < value.length; i += 1) {
    if (out.length >= limit) break;
    const raw = Number(value[i]);
    if (!Number.isFinite(raw) || raw <= 0) continue;
    const id = Math.trunc(raw);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function isDispatchableRenderRow(row) {
  if (!row || typeof row !== 'object') return false;
  if (normalizeRenderStatus(row.status, '') !== 'Queued') return false;
  if (row.assigned_worker_id != null) return false;
  if (Number(row.requires_validation) === 1 && !(Number(row.validated_by_user_id) > 0)) return false;
  return true;
}

function toDispatchableRenderRow(row) {
  return {
    id: Number(row?.id || 0),
    project_name: String(row?.project_name || ''),
    payload_json: String(row?.payload_json || ''),
    status: normalizeRenderStatus(row?.status, 'Queued'),
    requires_validation: Number(row?.requires_validation || 0) === 1 ? 1 : 0,
    validated_by_user_id: row?.validated_by_user_id == null ? null : Number(row.validated_by_user_id),
    created_at: String(row?.created_at || ''),
  };
}

function selectRenderJobsForDispatch(dispatchableJobs, maxJobs, dispatchPolicy, projectActiveLoads = {}) {
  const jobs = Array.isArray(dispatchableJobs) ? dispatchableJobs : [];
  const target = Math.max(0, Math.trunc(Number(maxJobs) || 0));
  const activeByProjectMap = normalizeRenderProjectLoadMap(projectActiveLoads);
  if (target <= 0 || jobs.length <= 0) {
    return {
      jobs: [],
      policyApplied: Boolean(dispatchPolicy?.applied),
      byProject: {},
      activeByProject: Object.fromEntries(activeByProjectMap),
      totalByProject: Object.fromEntries(activeByProjectMap),
    };
  }
  if (!dispatchPolicy?.applied) {
    const selected = jobs.slice(0, target);
    const selectedByProject = countRenderJobsByProject(selected);
    const totalByProject = new Map(activeByProjectMap);
    for (const [projectName, selectedCount] of selectedByProject.entries()) {
      totalByProject.set(projectName, Number(totalByProject.get(projectName) || 0) + selectedCount);
    }
    return {
      jobs: selected,
      policyApplied: false,
      byProject: Object.fromEntries(selectedByProject),
      activeByProject: Object.fromEntries(activeByProjectMap),
      totalByProject: Object.fromEntries(totalByProject),
    };
  }

  const sorted = [...jobs].sort((a, b) => {
    const projectA = sanitizeRenderProjectName(a?.project_name || '');
    const projectB = sanitizeRenderProjectName(b?.project_name || '');
    const priorityA =
      dispatchPolicy.projectPriorities.get(projectA) ?? dispatchPolicy.defaultPriority;
    const priorityB =
      dispatchPolicy.projectPriorities.get(projectB) ?? dispatchPolicy.defaultPriority;
    if (priorityA !== priorityB) return priorityA - priorityB;
    const createdA = String(a?.created_at || '');
    const createdB = String(b?.created_at || '');
    if (createdA !== createdB) return createdA.localeCompare(createdB);
    return Number(a?.id || 0) - Number(b?.id || 0);
  });

  const selected = [];
  const selectedByProject = new Map();
  const usedByProject = new Map(activeByProjectMap);
  for (const job of sorted) {
    if (selected.length >= target) break;
    const projectName = sanitizeRenderProjectName(job?.project_name || '');
    const quota = dispatchPolicy.projectQuotas.get(projectName) ?? dispatchPolicy.defaultQuota;
    if (quota != null) {
      const used = Number(usedByProject.get(projectName) || 0);
      if (used >= quota) continue;
      usedByProject.set(projectName, used + 1);
    } else {
      usedByProject.set(projectName, Number(usedByProject.get(projectName) || 0) + 1);
    }
    selectedByProject.set(projectName, Number(selectedByProject.get(projectName) || 0) + 1);
    selected.push(job);
  }
  return {
    jobs: selected,
    policyApplied: true,
    byProject: Object.fromEntries(selectedByProject),
    activeByProject: Object.fromEntries(activeByProjectMap),
    totalByProject: Object.fromEntries(usedByProject),
  };
}

function sanitizeProjectRef(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_PROJECT_REF_LEN);
}

function sanitizeSyncSource(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SYNC_SOURCE_LEN);
}

function sanitizeSyncResult(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SYNC_RESULT_LEN);
}

function normalizeJsonValueWithSize(value, {
  fallbackValue = {},
  maxBytes = 256 * 1024,
  invalidError = 'invalid_json_value',
  tooLargeError = 'json_value_too_large',
} = {}) {
  let parsed = fallbackValue;
  if (value == null || value === '') {
    parsed = fallbackValue;
  } else if (typeof value === 'string') {
    const raw = String(value || '').trim();
    if (!raw) {
      parsed = fallbackValue;
    } else {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { ok: false, error: invalidError };
      }
    }
  } else if (typeof value === 'object') {
    parsed = value;
  } else {
    return { ok: false, error: invalidError };
  }

  let encoded = '';
  try {
    encoded = JSON.stringify(parsed ?? fallbackValue);
  } catch {
    return { ok: false, error: invalidError };
  }
  if (Buffer.byteLength(encoded, 'utf8') > maxBytes) {
    return { ok: false, error: tooLargeError };
  }
  return { ok: true, json: encoded };
}

function normalizeDataTableSchema(value) {
  return normalizeJsonValueWithSize(value, {
    fallbackValue: {},
    maxBytes: MAX_DATA_TABLE_SCHEMA_BYTES,
    invalidError: 'invalid_data_table_schema',
    tooLargeError: 'data_table_schema_too_large',
  });
}

function normalizeDataRowPayload(value) {
  return normalizeJsonValueWithSize(value, {
    fallbackValue: {},
    maxBytes: MAX_DATA_ROW_PAYLOAD_BYTES,
    invalidError: 'invalid_data_row_payload',
    tooLargeError: 'data_row_payload_too_large',
  });
}

function normalizeSyncDetails(value) {
  return normalizeJsonValueWithSize(value, {
    fallbackValue: {},
    maxBytes: MAX_SYNC_DETAILS_BYTES,
    invalidError: 'invalid_sync_details',
    tooLargeError: 'sync_details_too_large',
  });
}

function parseProjectPermissionBool(value, fallback = false) {
  if (value == null) return fallback === true;
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return value === 1;
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback === true;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'oui') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'non') return false;
  return fallback === true;
}

function resolveProjectForApi(sharedStore, value, stmts = null) {
  const projectRef = sanitizeProjectRef(value);
  if (!projectRef) return { ok: false, error: 'invalid_project_id' };
  const projects = loadPostprodProjectsCatalog(sharedStore, stmts);
  if (projects.length <= 0 && (!sharedStore || typeof sharedStore.loadProjectsDoc !== 'function')) {
    return {
      ok: true,
      projectRef,
      project: { id: projectRef, name: projectRef, code: '' },
      usageMode: '',
    };
  }
  const lookup = normalizeTaskRefLookup(projectRef);
  const matched = projects.find((project) => {
    const id = String(project?.id || '').trim();
    const name = String(project?.name || '').trim();
    const code = String(project?.code || '').trim();
    return (
      normalizeTaskRefLookup(id) === lookup ||
      normalizeTaskRefLookup(name) === lookup ||
      normalizeTaskRefLookup(code) === lookup
    );
  }) || null;

  if (!matched) {
    return {
      ok: true,
      projectRef,
      project: { id: projectRef, name: projectRef, code: '' },
      usageMode: '',
    };
  }

  const projectId = String(matched?.id || '').trim();
  const projectName = String(matched?.name || '').trim();
  const projectCode = String(matched?.code || '').trim();
  return {
    ok: true,
    projectRef: projectId || projectName || projectRef,
    project: {
      id: projectId || projectRef,
      name: projectName || projectRef,
      code: projectCode,
    },
    usageMode: normalizeProjectUsageMode(matched?.usageMode),
  };
}

function resolveProjectCatalogEntry(sharedStore, value, stmts = null) {
  const projectRef = sanitizeProjectRef(value);
  if (!projectRef) return null;
  const projects = loadPostprodProjectsCatalog(sharedStore, stmts);
  const lookup = normalizeTaskRefLookup(projectRef);
  return projects.find((project) => {
    const id = String(project?.id || '').trim();
    const name = String(project?.name || '').trim();
    const code = String(project?.code || '').trim();
    return (
      normalizeTaskRefLookup(id) === lookup ||
      normalizeTaskRefLookup(name) === lookup ||
      normalizeTaskRefLookup(code) === lookup
    );
  }) || null;
}

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function buildUnrealAssetPathFromRelative(relativePath) {
  const normalizedRelative = toPosixPath(relativePath)
    .replace(/^\/+/, '')
    .trim();
  if (!normalizedRelative) return '';
  const withoutExt = normalizedRelative.replace(/\.[^/.\\]+$/g, '').trim();
  if (!withoutExt) return '';
  const segments = withoutExt.split('/').filter(Boolean);
  const leaf = segments[segments.length - 1] || '';
  if (!leaf) return '';
  return `/Game/${withoutExt}.${leaf}`;
}

function classifyUnrealAssetFromName(fileName = '', ext = '') {
  const normalizedExt = String(ext || '').trim().toLowerCase();
  const baseName = String(fileName || '').trim().replace(/\.[^/.\\]+$/g, '');
  const lower = baseName.toLowerCase();
  const isLevel = normalizedExt === '.umap';
  const isWrcPreset = (
    normalizedExt === '.uasset' && (
      lower.includes('remotecontrol') ||
      lower.includes('remote_control') ||
      lower.includes('wrc_preset') ||
      lower.includes('rcpreset') ||
      /\bwrc(?:_|-|\b)/.test(lower)
    )
  );
  const isSequence = (
    normalizedExt === '.uasset' && (
      lower.startsWith('ls_') ||
      lower.includes('levelsequence') ||
      lower.includes('sequence') ||
      lower.endsWith('_seq')
    )
  );
  const isPreset = (
    normalizedExt === '.uasset' && (
      lower.includes('mrg') ||
      lower.includes('mrq') ||
      lower.includes('mrc') ||
      lower.includes('moviepipeline') ||
      lower.includes('renderpreset') ||
      lower.includes('preset')
    ) &&
    !isWrcPreset
  );
  return { isLevel, isWrcPreset, isSequence, isPreset };
}

function isLikelyUnrealRedirectorAsset(assetFilePath) {
  const filePath = path.normalize(String(assetFilePath || '').trim());
  if (!filePath) return false;
  let stat = null;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return false;
  }
  if (!stat || !stat.isFile()) return false;
  // Redirectors are usually very small uasset files.
  const maxProbeSize = Math.min(Number(stat.size || 0), 64 * 1024);
  if (maxProbeSize <= 0) return false;
  if (Number(stat.size || 0) > 256 * 1024) return false;
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buffer = Buffer.allocUnsafe(maxProbeSize);
      const bytesRead = fs.readSync(fd, buffer, 0, maxProbeSize, 0);
      if (!bytesRead) return false;
      const payload = buffer.subarray(0, bytesRead);
      // Unreal redirector class marker.
      return (
        payload.includes(Buffer.from('ObjectRedirector', 'utf8'))
        || payload.includes(Buffer.from('CoreUObject.ObjectRedirector', 'utf8'))
      );
    } finally {
      try { fs.closeSync(fd); } catch {}
    }
  } catch {
    return false;
  }
}

function scanUnrealProjectCatalogFromUproject(uprojectPath) {
  const normalizedUprojectPath = path.normalize(String(uprojectPath || '').trim());
  if (!normalizedUprojectPath) {
    return { ok: false, status: 400, error: 'missing_uproject_path' };
  }
  if (!fs.existsSync(normalizedUprojectPath)) {
    return { ok: false, status: 404, error: 'invalid_uproject_path' };
  }
  const projectDir = path.dirname(normalizedUprojectPath);
  const contentDir = path.join(projectDir, 'Content');
  if (!fs.existsSync(contentDir)) {
    return {
      ok: true,
      catalog: {
        levels: [],
        sequences: [],
        presets: [],
        wrcPresets: [],
        stats: {
          scannedFiles: 0,
          maxFiles: MAX_UNREAL_PROJECT_CATALOG_FILES,
          projectDir,
          contentDir,
          uprojectPath: normalizedUprojectPath,
          warning: 'missing_content_dir',
        },
      },
    };
  }

  const levels = [];
  const sequences = [];
  const presets = [];
  const wrcPresets = [];
  const seenLevel = new Set();
  const seenSequence = new Set();
  const seenPreset = new Set();
  const seenWrcPreset = new Set();
  const stack = [contentDir];
  let scannedFiles = 0;

  while (stack.length > 0 && scannedFiles < MAX_UNREAL_PROJECT_CATALOG_FILES) {
    const currentDir = stack.pop();
    if (!currentDir) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry || !entry.name) continue;
      const absPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(absPath);
        continue;
      }
      if (!entry.isFile()) continue;
      scannedFiles += 1;
      if (scannedFiles > MAX_UNREAL_PROJECT_CATALOG_FILES) break;

      const ext = String(path.extname(entry.name || '') || '').trim().toLowerCase();
      if (ext !== '.umap' && ext !== '.uasset') continue;
      let relativePath = '';
      try {
        relativePath = path.relative(contentDir, absPath);
      } catch {
        relativePath = entry.name;
      }
      const relativePosix = toPosixPath(relativePath).replace(/^\/+/, '');
      if (!relativePosix) continue;
      const assetPath = buildUnrealAssetPathFromRelative(relativePosix);
      if (!assetPath) continue;
      const name = String(entry.name || '').replace(/\.[^/.\\]+$/g, '').trim();
      const classified = classifyUnrealAssetFromName(entry.name, ext);
      if ((classified.isSequence || classified.isPreset || classified.isWrcPreset) && isLikelyUnrealRedirectorAsset(absPath)) {
        continue;
      }

      if (classified.isLevel) {
        const key = assetPath.toLowerCase();
        if (!seenLevel.has(key)) {
          seenLevel.add(key);
          levels.push({
            name,
            assetPath,
            relativePath: relativePosix,
          });
        }
      }
      if (classified.isSequence) {
        const key = assetPath.toLowerCase();
        if (!seenSequence.has(key)) {
          seenSequence.add(key);
          sequences.push({
            name,
            assetPath,
            relativePath: relativePosix,
          });
        }
      }
      if (classified.isPreset) {
        const key = assetPath.toLowerCase();
        if (!seenPreset.has(key)) {
          seenPreset.add(key);
          presets.push({
            name,
            assetPath,
            relativePath: relativePosix,
          });
        }
      }
      if (classified.isWrcPreset) {
        const key = assetPath.toLowerCase();
        if (!seenWrcPreset.has(key)) {
          seenWrcPreset.add(key);
          wrcPresets.push({
            name,
            assetPath,
            relativePath: relativePosix,
          });
        }
      }
    }
  }

  const normalizeCatalogDirKey = (relativePathValue = '') => {
    const normalizedPath = toPosixPath(relativePathValue).replace(/^\/+/, '').trim();
    if (!normalizedPath) return '';
    const rawDir = path.posix.dirname(normalizedPath);
    if (!rawDir || rawDir === '.') return '';
    return String(rawDir || '').replace(/^\/+/, '').replace(/\/+$/g, '').toLowerCase();
  };

  const levelsByDir = new Map();
  for (const levelEntry of levels) {
    const dirKey = normalizeCatalogDirKey(levelEntry?.relativePath);
    const assetPath = String(levelEntry?.assetPath || '').trim();
    if (!assetPath) continue;
    const bucket = levelsByDir.get(dirKey) || [];
    bucket.push(assetPath);
    levelsByDir.set(dirKey, bucket);
  }

  const resolveCandidateLevelAssetPaths = (relativePathValue = '') => {
    let dirKey = normalizeCatalogDirKey(relativePathValue);
    const visited = new Set();
    while (true) {
      if (!visited.has(dirKey)) {
        visited.add(dirKey);
        const direct = levelsByDir.get(dirKey);
        if (Array.isArray(direct) && direct.length > 0) {
          return [...new Set(direct.map((entry) => String(entry || '').trim()).filter(Boolean))];
        }
      }
      if (!dirKey) break;
      const parentRaw = path.posix.dirname(dirKey);
      const parent = (!parentRaw || parentRaw === '.')
        ? ''
        : String(parentRaw).replace(/^\/+/, '').replace(/\/+$/g, '').toLowerCase();
      if (parent === dirKey) break;
      dirKey = parent;
    }
    return [];
  };

  const sequencesWithCandidates = sequences.map((entry) => ({
    ...entry,
    candidateLevelAssetPaths: resolveCandidateLevelAssetPaths(entry?.relativePath),
  }));
  const presetsWithCandidates = presets.map((entry) => ({
    ...entry,
    candidateLevelAssetPaths: resolveCandidateLevelAssetPaths(entry?.relativePath),
  }));

  const byName = (a, b) => String(a?.name || '').localeCompare(String(b?.name || ''));
  levels.sort(byName);
  sequencesWithCandidates.sort(byName);
  presetsWithCandidates.sort(byName);
  wrcPresets.sort(byName);

  return {
    ok: true,
    catalog: {
      levels,
      sequences: sequencesWithCandidates,
      presets: presetsWithCandidates,
      wrcPresets,
      stats: {
        scannedFiles,
        maxFiles: MAX_UNREAL_PROJECT_CATALOG_FILES,
        projectDir,
        contentDir,
        uprojectPath: normalizedUprojectPath,
      },
    },
  };
}

function readCommonServerConfigFile(commonServerFile) {
  const filePath = String(commonServerFile || '').trim();
  if (!filePath) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function inferRenderFormFieldKindFromWrcRawType(rawTypeValue) {
  const rawType = String(rawTypeValue || '').trim().toLowerCase();
  if (!rawType) return { inputKind: 'text', valueType: 'string' };
  if (rawType.includes('bool')) return { inputKind: 'checkbox', valueType: 'boolean' };
  if (
    rawType.includes('vector2d')
    || rawType.includes('vec2')
    || rawType.includes('float2')
    || rawType.includes('intpoint')
  ) {
    return { inputKind: 'vector2', valueType: 'vector2' };
  }
  if (
    rawType.includes('vector')
    || rawType.includes('rotator')
    || rawType.includes('float3')
    || rawType.includes('vec3')
  ) {
    return { inputKind: 'vector3', valueType: 'vector3' };
  }
  if (
    rawType.includes('int')
    || rawType.includes('byte')
    || rawType.includes('uint')
  ) {
    return { inputKind: 'integer', valueType: 'integer' };
  }
  if (
    rawType.includes('float')
    || rawType.includes('double')
    || rawType.includes('number')
  ) {
    return { inputKind: 'number', valueType: 'number' };
  }
  if (rawType.includes('linearcolor') || rawType.includes('fcolor') || rawType === 'color' || rawType.includes('color')) {
    return { inputKind: 'color', valueType: 'color' };
  }
  if (
    rawType.includes('transform')
    || rawType.includes('quat')
    || rawType.includes('matrix')
    || rawType.includes('array')
    || rawType.includes('set')
    || rawType.includes('map')
    || rawType.includes('tarray')
    || rawType.includes('tset')
    || rawType.includes('tmap')
    || rawType.includes('object')
    || rawType.includes('class')
    || rawType.includes('struct')
  ) {
    return { inputKind: 'json', valueType: 'json' };
  }
  if (rawType.includes('enum')) return { inputKind: 'select', valueType: 'enum' };
  if (rawType.includes('date') || rawType.includes('time')) return { inputKind: 'date', valueType: 'date' };
  if (rawType.includes('texture') || rawType.includes('image')) return { inputKind: 'image', valueType: 'image' };
  if (rawType.includes('video') || rawType.includes('media')) return { inputKind: 'video', valueType: 'video' };
  if (rawType.includes('json')) return { inputKind: 'json', valueType: 'json' };
  return { inputKind: 'text', valueType: 'string' };
}

function resolveWrcPresetPayloadRoot(presetPayload) {
  const payload = presetPayload && typeof presetPayload === 'object' ? presetPayload : {};
  if (payload.Preset && typeof payload.Preset === 'object' && !Array.isArray(payload.Preset)) {
    return payload.Preset;
  }
  if (payload.preset && typeof payload.preset === 'object' && !Array.isArray(payload.preset)) {
    return payload.preset;
  }
  return payload;
}

function looksLikeWrcFunctionEntry(entry = {}) {
  if (!entry || typeof entry !== 'object') return false;
  const typeRaw = String(
    entry.Type
    || entry.type
    || entry.EntityType
    || entry.entityType
    || ''
  ).trim().toLowerCase();
  if (typeRaw.includes('function')) return true;
  if (entry.UnderlyingFunction && typeof entry.UnderlyingFunction === 'object') return true;
  if (entry.underlyingFunction && typeof entry.underlyingFunction === 'object') return true;
  if (Array.isArray(entry.Arguments) || Array.isArray(entry.arguments)) return true;
  if (Array.isArray(entry.Parameters) || Array.isArray(entry.parameters)) return true;
  return false;
}

function looksLikeWrcPropertyEntry(entry = {}) {
  if (!entry || typeof entry !== 'object') return false;
  if (looksLikeWrcFunctionEntry(entry)) return false;
  const typeRaw = String(
    entry.Type
    || entry.type
    || entry.EntityType
    || entry.entityType
    || ''
  ).trim().toLowerCase();
  if (typeRaw && !typeRaw.includes('property') && typeRaw.includes('function')) return false;
  if (typeRaw.includes('property')) return true;
  if (entry.UnderlyingProperty && typeof entry.UnderlyingProperty === 'object') return true;
  if (entry.underlyingProperty && typeof entry.underlyingProperty === 'object') return true;
  if (
    entry.PropertyPath != null
    || entry.propertyPath != null
    || entry.Path != null
    || entry.path != null
    || entry.PropertyName != null
    || entry.propertyName != null
    || entry.PropertyId != null
    || entry.propertyId != null
    || entry.SubobjectPath != null
    || entry.subobjectPath != null
  ) {
    return true;
  }
  return false;
}

function extractWrcGroupPropertyEntries(group = {}) {
  const out = [];
  if (!group || typeof group !== 'object') return out;
  const containers = [
    group.ExposedProperties,
    group.properties,
    group.ExposedEntities,
    group.exposedEntities,
    group.Entities,
    group.entities,
  ];
  for (const listRaw of containers) {
    const list = Array.isArray(listRaw)
      ? listRaw
      : (
        listRaw && typeof listRaw === 'object' && !Array.isArray(listRaw)
          ? Object.values(listRaw)
          : []
      );
    if (!Array.isArray(list) || list.length <= 0) continue;
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      if (!looksLikeWrcPropertyEntry(entry)) continue;
      out.push(entry);
    }
  }
  return out;
}

function collectWrcExposedProperties(presetPayload) {
  const payload = resolveWrcPresetPayloadRoot(presetPayload);
  let props = [];
  const groups = Array.isArray(payload.Groups)
    ? payload.Groups
    : (Array.isArray(payload.groups) ? payload.groups : []);
  for (const group of groups) {
    const groupProps = extractWrcGroupPropertyEntries(group);
    if (groupProps.length > 0) props = props.concat(groupProps);
  }
  if (!props.length) {
    const rootContainers = [
      payload.ExposedProperties,
      payload.properties,
      payload.ExposedEntities,
      payload.exposedEntities,
      payload.Entities,
      payload.entities,
    ];
    for (const listRaw of rootContainers) {
      const list = Array.isArray(listRaw)
        ? listRaw
        : (
          listRaw && typeof listRaw === 'object' && !Array.isArray(listRaw)
            ? Object.values(listRaw)
            : []
        );
      if (!Array.isArray(list) || list.length <= 0) continue;
      props = props.concat(list.filter((entry) => looksLikeWrcPropertyEntry(entry)));
    }
  }
  const out = [];
  const seen = new Set();
  for (const entry of props) {
    if (!entry || typeof entry !== 'object') continue;
    const identity = JSON.stringify({
      id: entry.Id ?? entry.id ?? entry.PropertyId ?? entry.propertyId ?? entry.PropertyID ?? entry.propertyID ?? entry.FieldId ?? entry.fieldId ?? entry.EntityId ?? entry.entityId ?? entry.Path ?? entry.path ?? '',
      path: entry.PropertyPath ?? entry.propertyPath ?? entry.Path ?? entry.path ?? '',
      subobject: entry.SubobjectPath ?? entry.subobjectPath ?? '',
      name: entry.PropertyName ?? entry.propertyName ?? entry.Name ?? entry.name ?? entry.DisplayName ?? entry.displayName ?? entry.Label ?? entry.label ?? '',
    });
    if (seen.has(identity)) continue;
    seen.add(identity);
    out.push(entry);
  }
  return out;
}

function normalizeRenderFormDefaultValueFromWrc(valueType, rawValue) {
  const normalizeVectorNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const parseVectorFromString = (text) => {
    const out = {};
    const matches = String(text || '').matchAll(/([A-Za-z]+)\s*=\s*(-?\d+(?:\.\d+)?)/g);
    for (const match of matches) {
      const key = String(match?.[1] || '').trim().toLowerCase();
      const value = normalizeVectorNumber(match?.[2]);
      if (!key || value == null) continue;
      out[key] = value;
    }
    return out;
  };
  const toVectorObject = (source, dims = 3) => {
    const getObjValue = (obj, keys) => {
      for (const key of keys) {
        if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = normalizeVectorNumber(obj[key]);
          if (value != null) return value;
        }
      }
      return null;
    };
    let obj = null;
    if (Array.isArray(source)) {
      obj = {
        x: normalizeVectorNumber(source[0]),
        y: normalizeVectorNumber(source[1]),
        z: normalizeVectorNumber(source[2]),
      };
    } else if (source && typeof source === 'object') {
      obj = {
        x: getObjValue(source, ['X', 'x', 'Pitch', 'pitch', 'Roll', 'roll']),
        y: getObjValue(source, ['Y', 'y', 'Yaw', 'yaw']),
        z: getObjValue(source, ['Z', 'z']),
      };
    } else if (typeof source === 'string') {
      const parsed = parseVectorFromString(source);
      obj = {
        x: parsed.x ?? parsed.pitch ?? parsed.roll ?? null,
        y: parsed.y ?? parsed.yaw ?? null,
        z: parsed.z ?? null,
      };
    }
    if (!obj) {
      return dims === 2
        ? { x: null, y: null }
        : { x: null, y: null, z: null };
    }
    if (dims === 2) return { x: obj.x, y: obj.y };
    return { x: obj.x, y: obj.y, z: obj.z };
  };

  if (valueType === 'boolean') {
    if (rawValue === true || rawValue === false) return rawValue;
    const normalized = String(rawValue || '').trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return false;
  }
  if (valueType === 'number') {
    const n = Number(rawValue);
    return Number.isFinite(n) ? n : '';
  }
  if (valueType === 'integer') {
    const n = Number(rawValue);
    return Number.isFinite(n) ? Math.trunc(n) : '';
  }
  if (valueType === 'vector2') {
    return toVectorObject(rawValue, 2);
  }
  if (valueType === 'vector3') {
    return toVectorObject(rawValue, 3);
  }
  if (valueType === 'color') {
    const normalizeColorChannel = (channelValue) => {
      const n = Number(channelValue);
      if (!Number.isFinite(n)) return null;
      const scaled = Math.abs(n) <= 1 ? Math.round(n * 255) : Math.round(n);
      return Math.max(0, Math.min(255, scaled));
    };
    const encodeHex = (r, g, b) => (
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
    );
    if (Array.isArray(rawValue) && rawValue.length >= 3) {
      const r = normalizeColorChannel(rawValue[0]);
      const g = normalizeColorChannel(rawValue[1]);
      const b = normalizeColorChannel(rawValue[2]);
      if (r != null && g != null && b != null) return encodeHex(r, g, b);
    }
    if (rawValue && typeof rawValue === 'object') {
      const r = normalizeColorChannel(rawValue.R ?? rawValue.r ?? rawValue.Red ?? rawValue.red ?? rawValue.X ?? rawValue.x);
      const g = normalizeColorChannel(rawValue.G ?? rawValue.g ?? rawValue.Green ?? rawValue.green ?? rawValue.Y ?? rawValue.y);
      const b = normalizeColorChannel(rawValue.B ?? rawValue.b ?? rawValue.Blue ?? rawValue.blue ?? rawValue.Z ?? rawValue.z);
      if (r != null && g != null && b != null) return encodeHex(r, g, b);
    }
    const color = String(rawValue || '').trim();
    const tupleMatch = /\(\s*R\s*=\s*([-\d.]+)\s*,\s*G\s*=\s*([-\d.]+)\s*,\s*B\s*=\s*([-\d.]+)(?:\s*,\s*A\s*=\s*([-\d.]+))?\s*\)/i.exec(color);
    if (tupleMatch) {
      const r = normalizeColorChannel(tupleMatch[1]);
      const g = normalizeColorChannel(tupleMatch[2]);
      const b = normalizeColorChannel(tupleMatch[3]);
      if (r != null && g != null && b != null) return encodeHex(r, g, b);
    }
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : '#ffffff';
  }
  if (valueType === 'json') {
    if (rawValue && typeof rawValue === 'object') return rawValue;
    const text = String(rawValue || '').trim();
    if (!text) return {};
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') return parsed;
      return {};
    } catch {
      return {};
    }
  }
  if (rawValue && typeof rawValue === 'object') {
    try {
      return JSON.stringify(rawValue);
    } catch {
      return '';
    }
  }
  return String(rawValue ?? '').trim();
}

function normalizeSingleLineDefaultText(value) {
  const raw = String(value ?? '');
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyOpaqueWrcIdentifier(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const compact = raw.replace(/[-_.:]/g, '');
  return /^[a-f0-9]{24,}$/i.test(compact);
}

function pickReadableWrcIdentifier(...candidates) {
  const normalized = candidates
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
  if (normalized.length <= 0) return '';
  const readable = normalized.find((entry) => !isLikelyOpaqueWrcIdentifier(entry));
  return readable || normalized[0];
}

function extractWrcPropertyCurrentValue(entry = {}, underlying = {}) {
  const p = entry && typeof entry === 'object' ? entry : {};
  const u = underlying && typeof underlying === 'object' ? underlying : {};

  const directCandidates = [
    p.DefaultValue,
    p.defaultValue,
    p.Value,
    p.value,
    p.PropertyValue,
    p.propertyValue,
    p.CurrentValue,
    p.currentValue,
    u.DefaultValue,
    u.defaultValue,
    u.Value,
    u.value,
  ];
  for (const candidate of directCandidates) {
    if (candidate !== undefined) return candidate;
  }

  const nestedObjects = [
    p.Value,
    p.value,
    p.PropertyValue,
    p.propertyValue,
    p.CurrentValue,
    p.currentValue,
    p.Metadata,
    p.metadata,
    u.Value,
    u.value,
    u.PropertyValue,
    u.propertyValue,
  ];
  for (const obj of nestedObjects) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue;
    for (const key of ['Value', 'value', 'Text', 'text', 'String', 'string', 'CurrentValue', 'currentValue']) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
      }
    }
  }

  return undefined;
}

function buildRenderFormFieldsFromWrcPreset(presetPayload) {
  const props = collectWrcExposedProperties(presetPayload);
  const out = [];
  const seenKeys = new Set();
  const seenPayloadKeys = new Set();
  let sortOrder = 1;

  for (const entry of props) {
    const p = entry && typeof entry === 'object' ? entry : {};
    const underlying = p.UnderlyingProperty && typeof p.UnderlyingProperty === 'object'
      ? p.UnderlyingProperty
      : (p.underlyingProperty && typeof p.underlyingProperty === 'object' ? p.underlyingProperty : {});
    const entityIdRaw = (
      p.Id
      || p.id
      || p.ID
      || ''
    );
    const propertyIdRaw = (
      p.PropertyId
      || p.propertyId
      || p.PropertyID
      || p.propertyID
      || p.PropertyIdentifier
      || p.propertyIdentifier
      || p.EntityId
      || p.entityId
      || p.ID
      || p.id
      || p.Id
      || p.Label
      || p.label
      || p.Alias
      || p.alias
      || underlying.PropertyId
      || underlying.propertyId
      || underlying.PropertyID
      || underlying.propertyID
      || underlying.Label
      || underlying.label
      || ''
    );
    const displayNameRaw = pickReadableWrcIdentifier(
      p.DisplayName,
      p.displayName,
      underlying.DisplayName,
      p.Label,
      p.label,
      p.PropertyName,
      p.propertyName,
      p.Name,
      p.name,
      underlying.PropertyName,
      underlying.Name,
      propertyIdRaw,
      entityIdRaw
    );
    const subobjectPathRaw = (
      p.SubobjectPath
      || p.subobjectPath
      || p.OwnerPath
      || p.ownerPath
      || ''
    );
    const sourcePropertyPathRaw = (
      p.Path
      || p.path
      || p.PropertyPath
      || p.propertyPath
      || underlying.Path
      || underlying.path
      || underlying.PropertyPath
      || underlying.propertyPath
      || p.PropertyName
      || p.propertyName
      || p.Name
      || p.name
      || propertyIdRaw
      || ''
    );
    const sourcePathComposed = (
      String(subobjectPathRaw || '').trim()
      && String(sourcePropertyPathRaw || '').trim()
      && String(sourcePropertyPathRaw || '').trim() !== String(subobjectPathRaw || '').trim()
    )
      ? `${String(subobjectPathRaw || '').trim()}.${String(sourcePropertyPathRaw || '').trim()}`
      : String(sourcePropertyPathRaw || '').trim();
    const sourcePathRaw = (
      sourcePathComposed
      || sourcePropertyPathRaw
      || subobjectPathRaw
      || displayNameRaw
    );
    const propertyNameRaw = pickReadableWrcIdentifier(
      p.PropertyName,
      p.propertyName,
      p.Name,
      p.name,
      underlying.PropertyName,
      underlying.Name,
      propertyIdRaw,
      sourcePathRaw,
      displayNameRaw,
      entityIdRaw
    );
    const sourcePath = String(sourcePathRaw || '').trim();
    if (!sourcePath) continue;

    const fieldLabel = sanitizeRenderFormFieldLabel(
      pickReadableWrcIdentifier(propertyIdRaw, displayNameRaw, propertyNameRaw, sourcePath, entityIdRaw),
      sourcePath
    );
    const keySourceRaw = pickReadableWrcIdentifier(
      propertyIdRaw,
      propertyNameRaw,
      displayNameRaw,
      sourcePathRaw,
      sourcePath,
      entityIdRaw
    );
    const keyBase = sanitizeRenderFormFieldKey(
      keySourceRaw,
      sourcePath
    );
    if (!keyBase) continue;
    let fieldKey = keyBase;
    let dedupeIndex = 2;
    while (seenKeys.has(fieldKey)) {
      fieldKey = sanitizeRenderFormFieldKey(`${keyBase}_${dedupeIndex}`, keyBase);
      dedupeIndex += 1;
    }
    seenKeys.add(fieldKey);
    const payloadBase = sanitizeRenderFormFieldPayloadKey(
      pickReadableWrcIdentifier(propertyNameRaw, propertyIdRaw, fieldLabel, sourcePathRaw, fieldKey),
      fieldKey
    );
    let payloadKey = payloadBase || fieldKey;
    let payloadDedupeIndex = 2;
    while (seenPayloadKeys.has(payloadKey.toLowerCase())) {
      payloadKey = sanitizeRenderFormFieldPayloadKey(`${payloadBase || fieldKey}_${payloadDedupeIndex}`, fieldKey);
      payloadDedupeIndex += 1;
    }
    seenPayloadKeys.add(payloadKey.toLowerCase());

    const rawType = (
      underlying.Type
      || underlying.type
      || underlying.PropertyType
      || underlying.propertyType
      || underlying.TypeName
      || underlying.typeName
      || underlying?.TypePath?.Name
      || underlying?.typePath?.name
      || p.Type
      || p.ValueType
      || p.valueType
      || p.type
      || ''
    );
    const inferred = inferRenderFormFieldKindFromWrcRawType(rawType);
    let inputKind = normalizeRenderFormFieldInputKind(inferred.inputKind, 'text');
    let valueType = normalizeRenderFormFieldValueType(inferred.valueType, 'string');
    const defaultValueRaw = extractWrcPropertyCurrentValue(p, underlying);
    if (defaultValueRaw && typeof defaultValueRaw === 'object' && valueType === 'string') {
      valueType = 'json';
      inputKind = 'json';
    }
    let defaultValue = normalizeRenderFormDefaultValueFromWrc(valueType, defaultValueRaw);
    if (inputKind === 'text' && typeof defaultValue === 'string') {
      defaultValue = normalizeSingleLineDefaultText(defaultValue);
    }

    out.push({
      fieldKey,
      fieldLabel,
      sourcePath,
      sourceType: 'preset_property',
      inputKind,
      valueType,
      payloadKey,
      defaultValue,
      validation: {},
      isRequired: false,
      isVisible: true,
      sortOrder,
    });
    sortOrder += 1;
  }

  return out;
}

function normalizeWrcGuidPartHex(partValue) {
  const n = Number(partValue);
  if (!Number.isFinite(n)) return '';
  return ((Math.trunc(n)) >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function normalizeWrcLayoutFieldId(fieldRaw, fallback = '') {
  if (typeof fieldRaw === 'string') {
    const compact = String(fieldRaw || '').replace(/[^a-f0-9]/gi, '').toUpperCase();
    return compact.length === 32 ? compact : (compact || String(fallback || '').trim());
  }
  if (!fieldRaw || typeof fieldRaw !== 'object') {
    return String(fallback || '').trim();
  }
  const aHex = normalizeWrcGuidPartHex(fieldRaw.A ?? fieldRaw.a);
  const bHex = normalizeWrcGuidPartHex(fieldRaw.B ?? fieldRaw.b);
  const cHex = normalizeWrcGuidPartHex(fieldRaw.C ?? fieldRaw.c);
  const dHex = normalizeWrcGuidPartHex(fieldRaw.D ?? fieldRaw.d);
  if (aHex && bHex && cHex && dHex) {
    return `${aHex}${bHex}${cHex}${dHex}`;
  }
  const compact = JSON.stringify(fieldRaw).replace(/[^a-f0-9]/gi, '').toUpperCase();
  if (compact.length === 32) return compact;
  return String(fallback || '').trim();
}

function extractWrcLayoutFieldIds(layoutPayload) {
  const layout = layoutPayload && typeof layoutPayload === 'object'
    ? (
      layoutPayload.Layout && typeof layoutPayload.Layout === 'object'
        ? layoutPayload.Layout
        : layoutPayload
    )
    : {};
  const groups = Array.isArray(layout.Groups)
    ? layout.Groups
    : (Array.isArray(layout.groups) ? layout.groups : []);
  if (!groups.length) return [];
  const out = [];
  const seen = new Set();
  for (const group of groups) {
    if (!group || typeof group !== 'object') continue;
    const fieldsRaw = (
      Array.isArray(group.Fields)
        ? group.Fields
        : (Array.isArray(group.fields) ? group.fields : [])
    );
    for (let index = 0; index < fieldsRaw.length; index += 1) {
      const fieldId = normalizeWrcLayoutFieldId(fieldsRaw[index], `field_${index + 1}`);
      if (!fieldId) continue;
      const key = fieldId.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(fieldId);
    }
  }
  return out;
}

function buildRenderFormFieldsFromWrcLayoutFieldIds(fieldIds = []) {
  const out = [];
  const seenFieldKeys = new Set();
  const seenPayloadKeys = new Set();
  let sortOrder = 1;
  const sourceList = Array.isArray(fieldIds) ? fieldIds : [];
  for (let index = 0; index < sourceList.length; index += 1) {
    const rawId = String(sourceList[index] || '').trim();
    if (!rawId) continue;
    const sourcePath = `layout.${rawId}`;
    const label = sanitizeRenderFormFieldLabel(rawId, sourcePath);
    const keyBase = sanitizeRenderFormFieldKey(rawId, `field_${index + 1}`);
    if (!keyBase) continue;
    let fieldKey = keyBase;
    let dedupeIndex = 2;
    while (seenFieldKeys.has(fieldKey.toLowerCase())) {
      fieldKey = sanitizeRenderFormFieldKey(`${keyBase}_${dedupeIndex}`, keyBase);
      dedupeIndex += 1;
    }
    seenFieldKeys.add(fieldKey.toLowerCase());
    const payloadBase = sanitizeRenderFormFieldPayloadKey(rawId, fieldKey) || fieldKey;
    let payloadKey = payloadBase;
    let payloadDedupeIndex = 2;
    while (seenPayloadKeys.has(payloadKey.toLowerCase())) {
      payloadKey = sanitizeRenderFormFieldPayloadKey(`${payloadBase}_${payloadDedupeIndex}`, fieldKey) || fieldKey;
      payloadDedupeIndex += 1;
    }
    seenPayloadKeys.add(payloadKey.toLowerCase());
    out.push({
      fieldKey,
      fieldLabel: label,
      sourcePath,
      sourceType: 'preset_property',
      inputKind: 'text',
      valueType: 'string',
      payloadKey,
      defaultValue: '',
      validation: {},
      isRequired: false,
      isVisible: true,
      sortOrder,
    });
    sortOrder += 1;
  }
  return out;
}

async function fetchWrcObjectPropertyFromHost({
  host,
  rcPort = 30010,
  objectPath = '',
  propertyName = '',
  timeoutMs = 2500,
} = {}) {
  const normalizedHost = normalizeHostCandidate(host);
  const normalizedPropertyName = String(propertyName || '').trim();
  const normalizedObjectPath = String(objectPath || '').trim();
  const normalizedPort = Number.isFinite(Number(rcPort)) && Number(rcPort) > 0
    ? Math.trunc(Number(rcPort))
    : 30010;
  if (!normalizedHost || !normalizedPropertyName || !normalizedObjectPath) {
    return { ok: false, error: 'invalid_wrc_object_property_params', status: 0 };
  }
  const hostForUrl = formatHostForHttpUrl(normalizedHost);
  if (!hostForUrl) {
    return { ok: false, error: 'invalid_wrc_object_property_host', status: 0 };
  }
  const requestUrl = `http://${hostForUrl}:${normalizedPort}/remote/object/property`;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timeoutHandle = null;
  try {
    if (controller) {
      timeoutHandle = setTimeout(() => {
        try { controller.abort(); } catch {}
      }, Math.max(500, Math.trunc(Number(timeoutMs) || 2500)));
    }
    const response = await fetch(requestUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        objectPath: normalizedObjectPath,
        propertyName: normalizedPropertyName,
        access: 'READ_ACCESS',
      }),
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `wrc_http_${Number(response.status || 0) || 'error'}`,
        status: Number(response.status || 0),
      };
    }
    const payload = await response.json();
    const value = (
      payload && typeof payload === 'object'
        ? (
          Object.prototype.hasOwnProperty.call(payload, normalizedPropertyName)
            ? payload[normalizedPropertyName]
            : (
              Object.prototype.hasOwnProperty.call(payload, String(normalizedPropertyName).toLowerCase())
                ? payload[String(normalizedPropertyName).toLowerCase()]
                : payload
            )
        )
        : payload
    );
    return { ok: true, status: 200, payload, value };
  } catch (error) {
    const message = String(error?.message || error || '').trim().toLowerCase();
    if (message.includes('timed out') || message.includes('timeout') || message.includes('aborted')) {
      return { ok: false, error: 'wrc_timeout', status: 0 };
    }
    if (message.includes('fetch failed') || message.includes('econnrefused')) {
      return { ok: false, error: 'wrc_fetch_failed', status: 0 };
    }
    return { ok: false, error: String(error?.message || error || 'wrc_object_property_failed'), status: 0 };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function fetchWrcPresetPropertyPayloadFromHost({
  host,
  rcPort = 30010,
  presetName = '',
  propertyName = '',
  timeoutMs = 2500,
} = {}) {
  const normalizedHost = normalizeHostCandidate(host);
  const normalizedPresetName = String(presetName || '').trim();
  const normalizedPropertyName = String(propertyName || '').trim();
  const normalizedPort = Number.isFinite(Number(rcPort)) && Number(rcPort) > 0
    ? Math.trunc(Number(rcPort))
    : 30010;
  if (!normalizedHost || !normalizedPresetName || !normalizedPropertyName) {
    return { ok: false, error: 'invalid_wrc_property_params', status: 0 };
  }
  const hostForUrl = formatHostForHttpUrl(normalizedHost);
  if (!hostForUrl) {
    return { ok: false, error: 'invalid_wrc_property_host', status: 0 };
  }
  const requestUrl = `http://${hostForUrl}:${normalizedPort}/remote/preset/${encodeURIComponent(normalizedPresetName)}/property/${encodeURIComponent(normalizedPropertyName)}`;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timeoutHandle = null;
  try {
    if (controller) {
      timeoutHandle = setTimeout(() => {
        try { controller.abort(); } catch {}
      }, Math.max(500, Math.trunc(Number(timeoutMs) || 2500)));
    }
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `wrc_http_${Number(response.status || 0) || 'error'}`,
        status: Number(response.status || 0),
      };
    }
    const payload = await response.json();
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'invalid_wrc_property_payload', status: 200 };
    }
    return { ok: true, status: 200, payload };
  } catch (error) {
    const message = String(error?.message || error || '').trim().toLowerCase();
    if (message.includes('timed out') || message.includes('timeout') || message.includes('aborted')) {
      return { ok: false, error: 'wrc_timeout', status: 0 };
    }
    if (message.includes('fetch failed') || message.includes('econnrefused')) {
      return { ok: false, error: 'wrc_fetch_failed', status: 0 };
    }
    return { ok: false, error: String(error?.message || error || 'wrc_property_failed'), status: 0 };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function fetchWrcPresetPropertyMetadataValueFromHost({
  host,
  rcPort = 30010,
  presetName = '',
  propertyName = '',
  metadataKey = '',
  timeoutMs = 2500,
} = {}) {
  const normalizedHost = normalizeHostCandidate(host);
  const normalizedPresetName = String(presetName || '').trim();
  const normalizedPropertyName = String(propertyName || '').trim();
  const normalizedMetadataKey = String(metadataKey || '').trim();
  const normalizedPort = Number.isFinite(Number(rcPort)) && Number(rcPort) > 0
    ? Math.trunc(Number(rcPort))
    : 30010;
  if (!normalizedHost || !normalizedPresetName || !normalizedPropertyName || !normalizedMetadataKey) {
    return { ok: false, error: 'invalid_wrc_property_metadata_params', status: 0 };
  }
  const hostForUrl = formatHostForHttpUrl(normalizedHost);
  if (!hostForUrl) {
    return { ok: false, error: 'invalid_wrc_property_metadata_host', status: 0 };
  }
  const requestUrl = `http://${hostForUrl}:${normalizedPort}/remote/preset/${encodeURIComponent(normalizedPresetName)}/property/${encodeURIComponent(normalizedPropertyName)}/metadata/${encodeURIComponent(normalizedMetadataKey)}`;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timeoutHandle = null;
  try {
    if (controller) {
      timeoutHandle = setTimeout(() => {
        try { controller.abort(); } catch {}
      }, Math.max(500, Math.trunc(Number(timeoutMs) || 2500)));
    }
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `wrc_http_${Number(response.status || 0) || 'error'}`,
        status: Number(response.status || 0),
      };
    }
    const payload = await response.json();
    if (!payload || typeof payload !== 'object') {
      return { ok: false, error: 'invalid_wrc_property_metadata_payload', status: 200 };
    }
    if (String(payload?.errorMessage || '').trim()) {
      return { ok: false, error: String(payload.errorMessage).trim(), status: 200 };
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'Value')) {
      return { ok: true, status: 200, value: payload.Value };
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'value')) {
      return { ok: true, status: 200, value: payload.value };
    }
    return { ok: false, error: 'missing_wrc_property_metadata_value', status: 200 };
  } catch (error) {
    const message = String(error?.message || error || '').trim().toLowerCase();
    if (message.includes('timed out') || message.includes('timeout') || message.includes('aborted')) {
      return { ok: false, error: 'wrc_timeout', status: 0 };
    }
    if (message.includes('fetch failed') || message.includes('econnrefused')) {
      return { ok: false, error: 'wrc_fetch_failed', status: 0 };
    }
    return { ok: false, error: String(error?.message || error || 'wrc_property_metadata_failed'), status: 0 };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function extractWrcPropertyValueFromPresetPropertyPayload(payload) {
  const root = payload && typeof payload === 'object' ? payload : {};
  const directCandidates = [
    root.PropertyValue,
    root.propertyValue,
    root.Value,
    root.value,
    root.DefaultValue,
    root.defaultValue,
  ];
  for (const candidate of directCandidates) {
    if (candidate !== undefined) return candidate;
  }
  const values = Array.isArray(root.PropertyValues)
    ? root.PropertyValues
    : (Array.isArray(root.propertyValues) ? root.propertyValues : []);
  for (const entry of values) {
    if (!entry || typeof entry !== 'object') continue;
    const nestedCandidates = [
      entry.PropertyValue,
      entry.propertyValue,
      entry.Value,
      entry.value,
      entry.DefaultValue,
      entry.defaultValue,
    ];
    for (const candidate of nestedCandidates) {
      if (candidate !== undefined) return candidate;
    }
  }
  return undefined;
}

function parseHostFromRequestHeader(hostHeaderValue) {
  return normalizeHostCandidate(hostHeaderValue);
}

function normalizeHostCandidate(hostRawValue) {
  let hostRaw = String(hostRawValue || '').trim();
  if (!hostRaw) return '';
  if (hostRaw.includes(',')) {
    hostRaw = String(hostRaw.split(',')[0] || '').trim();
  }
  hostRaw = hostRaw.replace(/^\s*https?:\/\//i, '');
  const slashIndex = hostRaw.indexOf('/');
  if (slashIndex >= 0) {
    hostRaw = hostRaw.slice(0, slashIndex).trim();
  }
  if (!hostRaw) return '';
  if (hostRaw.startsWith('[')) {
    const end = hostRaw.indexOf(']');
    return end > 1 ? hostRaw.slice(1, end).trim() : '';
  }
  const colonCount = (hostRaw.match(/:/g) || []).length;
  if (colonCount <= 1 && /^[^:]+:\d+$/.test(hostRaw)) {
    return String(hostRaw.split(':')[0] || '').trim();
  }
  return hostRaw;
}

function formatHostForHttpUrl(hostValue) {
  const host = normalizeHostCandidate(hostValue);
  if (!host) return '';
  if (host.includes(':') && !host.startsWith('[')) {
    return `[${host}]`;
  }
  return host;
}

function readHostsServerConfigFile(hostsServerFile) {
  const filePath = String(hostsServerFile || '').trim();
  if (!filePath) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

async function fetchWrcPresetPayloadFromHosts({
  hosts = [],
  rcPort = 30010,
  presetName = 'RemoteControlPreset',
  presetNames = null,
  timeoutMs = 2500,
} = {}) {
  const normalizedPort = Number.isFinite(Number(rcPort)) && Number(rcPort) > 0
    ? Math.trunc(Number(rcPort))
    : 30010;
  const normalizedPresetCandidates = [];
  const seenPreset = new Set();
  const pushPreset = (rawValue) => {
    const value = String(rawValue || '').trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seenPreset.has(key)) return;
    seenPreset.add(key);
    normalizedPresetCandidates.push(value);
  };
  if (Array.isArray(presetNames)) {
    for (const entry of presetNames) pushPreset(entry);
  }
  pushPreset(presetName);
  if (normalizedPresetCandidates.length <= 0) {
    normalizedPresetCandidates.push('RemoteControlPreset');
  }
  const hostList = [];
  const seen = new Set();
  const sourceHosts = Array.isArray(hosts) ? hosts : [];
  for (const hostRaw of sourceHosts) {
    const host = normalizeHostCandidate(hostRaw);
    if (!host) continue;
    const key = host.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    hostList.push(host);
  }
  if (hostList.length <= 0) {
    hostList.push('127.0.0.1');
  }

  let lastError = 'wrc_preset_unreachable';
  let lastStatus = 0;
  const attempts = [];
  for (const host of hostList) {
    for (const normalizedPresetName of normalizedPresetCandidates) {
      const hostForUrl = formatHostForHttpUrl(host);
      if (!hostForUrl) continue;
      const requestUrl = `http://${hostForUrl}:${normalizedPort}/remote/preset/${encodeURIComponent(normalizedPresetName)}`;
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      let timeoutHandle = null;
      try {
        if (controller) {
          timeoutHandle = setTimeout(() => {
            try { controller.abort(); } catch {}
          }, Math.max(500, Math.trunc(Number(timeoutMs) || 2500)));
        }
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller ? controller.signal : undefined,
        });
        if (!response.ok) {
          lastStatus = Number(response.status || 0);
          lastError = `wrc_http_${lastStatus || 'error'}`;
          attempts.push({
            host,
            presetName: normalizedPresetName,
            status: lastStatus,
            error: lastError,
          });
          continue;
        }
        const payload = await response.json();
        if (!payload || typeof payload !== 'object') {
          lastError = 'invalid_wrc_payload';
          attempts.push({
            host,
            presetName: normalizedPresetName,
            status: 200,
            error: lastError,
          });
          continue;
        }
        return {
          ok: true,
          payload,
          endpoint: {
            host,
            rcPort: normalizedPort,
            presetName: normalizedPresetName,
            url: requestUrl,
          },
          attempts,
        };
      } catch (error) {
        const message = String(error?.message || error || '').trim();
        const lowered = message.toLowerCase();
        if (lowered.includes('timed out') || lowered.includes('timeout') || lowered.includes('aborted')) {
          lastError = 'wrc_timeout';
        } else if (lowered.includes('fetch failed') || lowered.includes('econnrefused')) {
          lastError = 'wrc_fetch_failed';
        } else if (message) {
          lastError = message;
        }
        attempts.push({
          host,
          presetName: normalizedPresetName,
          status: 0,
          error: lastError,
          detail: message || undefined,
        });
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
    }
  }

  return {
    ok: false,
    error: lastError || 'wrc_preset_unreachable',
    status: lastStatus,
    attempts,
  };
}

function resolveProjectPermissionCeilings(roleRaw, rolesCache) {
  const role = resolveRoleInput(roleRaw, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
  const perms = rolePermissions(role, rolesCache);
  const canEditDataByRole = (
    role === 'Maintenance' ||
    role === 'Responsable Fabrication' ||
    role === 'Operateur'
  );
  return {
    role,
    isReferent: perms.canSyncScenes === true || role === 'Maintenance',
    canValidate: perms.canValidate === true || role === 'Maintenance',
    canSync: perms.canSyncScenes === true || role === 'Maintenance',
    canLaunchRender: perms.canLaunchRenders !== false || role === 'Maintenance',
    canEditData: canEditDataByRole || role === 'Maintenance',
  };
}

function clampProjectPermissionsInput(input = {}, ceilings = {}) {
  const normalized = {
    isReferent: parseProjectPermissionBool(input?.isReferent, false),
    canValidate: parseProjectPermissionBool(input?.canValidate, false),
    canSync: parseProjectPermissionBool(input?.canSync, false),
    canLaunchRender: parseProjectPermissionBool(input?.canLaunchRender, false),
    canEditData: parseProjectPermissionBool(input?.canEditData, false),
  };
  return {
    isReferent: normalized.isReferent && ceilings.isReferent === true,
    canValidate: normalized.canValidate && ceilings.canValidate === true,
    canSync: normalized.canSync && ceilings.canSync === true,
    canLaunchRender: normalized.canLaunchRender && ceilings.canLaunchRender === true,
    canEditData: normalized.canEditData && ceilings.canEditData === true,
  };
}

function normalizeRenderStatus(value, fallback = 'Queued') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  if (RENDER_STATUSES.includes(raw)) return raw;
  return RENDER_STATUSES.includes(fallback) ? fallback : 'Queued';
}

function inferRenderReviewStatus(statusRaw, validatedByUserIdRaw) {
  const status = normalizeRenderStatus(statusRaw, 'Queued');
  const validatedByUserId = Number(validatedByUserIdRaw || 0);
  if (status === 'Canceled') return 'canceled';
  if (status === 'Failed') return 'to_modify';
  if (status === 'Done' && Number.isFinite(validatedByUserId) && validatedByUserId > 0) {
    return 'validated';
  }
  return 'to_validate';
}

function normalizeRenderReviewStatus(value, fallback = 'to_validate') {
  const raw = String(value || '').trim().toLowerCase();
  if (RENDER_REVIEW_STATUSES.includes(raw)) return raw;
  return RENDER_REVIEW_STATUSES.includes(fallback) ? fallback : 'to_validate';
}

function normalizeRenderPayload(value) {
  if (value == null || value === '') {
    return { ok: true, payloadJson: '{}' };
  }

  let parsed = null;
  if (typeof value === 'string') {
    const raw = String(value || '').trim();
    if (!raw) return { ok: true, payloadJson: '{}' };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'invalid_render_payload' };
    }
  } else if (typeof value === 'object') {
    parsed = value;
  } else {
    return { ok: false, error: 'invalid_render_payload' };
  }

  let encoded = '{}';
  try {
    encoded = JSON.stringify(parsed ?? {});
  } catch {
    return { ok: false, error: 'invalid_render_payload' };
  }
  if (Buffer.byteLength(encoded, 'utf8') > MAX_RENDER_PAYLOAD_BYTES) {
    return { ok: false, error: 'render_payload_too_large' };
  }
  return { ok: true, payloadJson: encoded };
}

function normalizeRenderExecution(value) {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};
  const modeRaw = String(raw?.mode || '').trim().toLowerCase();
  const mode = modeRaw === 'process' ? 'process' : 'simulate';
  const out = { mode };
  if (mode === 'process') {
    const command = String(raw?.command || '').trim();
    if (command) out.command = command.slice(0, 400);
    const args = Array.isArray(raw?.args)
      ? raw.args
      : [];
    const normalizedArgs = args
      .map((arg) => String(arg || '').trim())
      .filter(Boolean)
      .slice(0, 40)
      .map((arg) => arg.slice(0, 400));
    if (normalizedArgs.length > 0) out.args = normalizedArgs;
    const timeoutMsRaw = Number(raw?.timeoutMs);
    if (Number.isFinite(timeoutMsRaw)) {
      out.timeoutMs = Math.max(1000, Math.min(4 * 60 * 60 * 1000, Math.trunc(timeoutMsRaw)));
    }
    const cwd = String(raw?.cwd || '').trim();
    if (cwd) out.cwd = cwd.slice(0, 400);
    const outputPath = sanitizeRenderOutputPath(raw?.outputPath);
    if (outputPath) out.outputPath = outputPath;
  } else {
    const delayRaw = Number(raw?.delayMs ?? raw?.simulateDurationMs);
    if (Number.isFinite(delayRaw)) {
      out.delayMs = Math.max(1000, Math.min(120000, Math.trunc(delayRaw)));
    }
    if (raw?.simulateFail === true) out.simulateFail = true;
    const outputPath = sanitizeRenderOutputPath(raw?.outputPath);
    if (outputPath) out.outputPath = outputPath;
    const errorMessage = sanitizeRenderErrorMessage(raw?.errorMessage);
    if (errorMessage) out.errorMessage = errorMessage;
  }
  let encoded = '{}';
  try {
    encoded = JSON.stringify(out);
  } catch {
    return { ok: false, error: 'invalid_render_template_execution' };
  }
  if (Buffer.byteLength(encoded, 'utf8') > MAX_RENDER_PRESET_PAYLOAD_BYTES) {
    return { ok: false, error: 'render_template_payload_too_large' };
  }
  return { ok: true, executionJson: encoded };
}

function sanitizeRenderFormFieldKey(value, fallback = '') {
  const raw = String(value || '').trim();
  const normalized = raw
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.:-]+/g, '_');
  const safe = normalized || String(fallback || '').trim();
  return safe.slice(0, MAX_RENDER_TEMPLATE_FIELD_KEY_LEN);
}

function sanitizeRenderFormFieldLabel(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_RENDER_TEMPLATE_FIELD_LABEL_LEN);
}

function sanitizeRenderFormFieldSourcePath(value) {
  return String(value || '').trim().slice(0, MAX_RENDER_TEMPLATE_FIELD_SOURCE_PATH_LEN);
}

function normalizeRenderFormFieldSourceType(value, fallback = 'preset_property') {
  const raw = String(value || '').trim().toLowerCase().slice(0, MAX_RENDER_TEMPLATE_FIELD_INPUT_KIND_LEN);
  if (RENDER_FORM_SOURCE_TYPES.has(raw)) return raw;
  return RENDER_FORM_SOURCE_TYPES.has(fallback) ? fallback : 'preset_property';
}

function normalizeRenderFormFieldInputKind(value, fallback = 'text') {
  const raw = String(value || '').trim().toLowerCase().slice(0, MAX_RENDER_TEMPLATE_FIELD_INPUT_KIND_LEN);
  if (RENDER_TEMPLATE_FIELD_INPUT_KINDS.has(raw)) return raw;
  return RENDER_TEMPLATE_FIELD_INPUT_KINDS.has(fallback) ? fallback : 'text';
}

function normalizeRenderFormFieldValueType(value, fallback = 'string') {
  const raw = String(value || '').trim().toLowerCase().slice(0, MAX_RENDER_TEMPLATE_FIELD_VALUE_TYPE_LEN);
  if (RENDER_TEMPLATE_FIELD_VALUE_TYPES.has(raw)) return raw;
  return RENDER_TEMPLATE_FIELD_VALUE_TYPES.has(fallback) ? fallback : 'string';
}

function sanitizeRenderFormFieldGroupName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_RENDER_TEMPLATE_FIELD_GROUP_NAME_LEN);
}

function sanitizeRenderFormFieldPayloadKey(value, fallback = '') {
  return sanitizeRenderFormFieldKey(value, fallback).slice(0, MAX_RENDER_TEMPLATE_FIELD_PAYLOAD_KEY_LEN);
}

function sanitizeRenderFormFieldPlaceholder(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_RENDER_TEMPLATE_FIELD_PLACEHOLDER_LEN);
}

function sanitizeRenderFormFieldHelpText(value) {
  return String(value || '').trim().slice(0, MAX_RENDER_TEMPLATE_FIELD_HELP_TEXT_LEN);
}

function normalizeRenderFormFieldOptionsJson(value) {
  const normalized = normalizeJsonValueWithSize(value, {
    fallbackValue: [],
    maxBytes: MAX_RENDER_TEMPLATE_FIELD_OPTIONS_BYTES,
    invalidError: 'invalid_render_form_field_options',
    tooLargeError: 'render_form_field_options_too_large',
  });
  if (!normalized.ok) return normalized;
  let parsed = [];
  try {
    parsed = JSON.parse(String(normalized.json || '[]'));
  } catch {
    return { ok: false, error: 'invalid_render_form_field_options' };
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'invalid_render_form_field_options' };
  }
  if (parsed.length > MAX_RENDER_TEMPLATE_FIELD_OPTIONS_ITEMS) {
    return { ok: false, error: 'render_form_field_options_too_many_items' };
  }
  try {
    return { ok: true, optionsJson: JSON.stringify(parsed) };
  } catch {
    return { ok: false, error: 'invalid_render_form_field_options' };
  }
}

function normalizeRenderFormFieldValidationJson(value) {
  const normalized = normalizeJsonValueWithSize(value, {
    fallbackValue: {},
    maxBytes: MAX_RENDER_TEMPLATE_FIELD_VALIDATION_BYTES,
    invalidError: 'invalid_render_form_field_validation',
    tooLargeError: 'render_form_field_validation_too_large',
  });
  if (!normalized.ok) return normalized;
  return { ok: true, validationJson: normalized.json };
}

function normalizeRenderFormFieldDefaultValueJson(value, { rawJsonString = false } = {}) {
  const maxBytes = MAX_RENDER_TEMPLATE_FIELD_DEFAULT_VALUE_BYTES;
  const encodeJsonWithSize = (rawValue) => {
    let encoded = '';
    try {
      encoded = JSON.stringify(rawValue);
    } catch {
      return { ok: false, error: 'invalid_render_form_field_default_value' };
    }
    if (Buffer.byteLength(encoded, 'utf8') > maxBytes) {
      return { ok: false, error: 'render_form_field_default_value_too_large' };
    }
    return { ok: true, defaultValueJson: encoded };
  };

  if (typeof value === 'string' && rawJsonString) {
    const raw = String(value || '').trim();
    if (!raw) return { ok: true, defaultValueJson: 'null' };
    try {
      const parsed = JSON.parse(raw);
      const encodedParsed = encodeJsonWithSize(parsed);
      if (encodedParsed.ok) return encodedParsed;
    } catch {
      // Fallback: treat raw text as a plain string instead of failing hard.
    }
    return encodeJsonWithSize(raw);
  }

  if (typeof value === 'string') {
    return encodeJsonWithSize(value);
  }

  const normalized = normalizeJsonValueWithSize(value, {
    fallbackValue: null,
    maxBytes,
    invalidError: 'invalid_render_form_field_default_value',
    tooLargeError: 'render_form_field_default_value_too_large',
  });
  if (normalized.ok) {
    return { ok: true, defaultValueJson: normalized.json };
  }
  if (normalized.error !== 'invalid_render_form_field_default_value') {
    return normalized;
  }

  // Last-resort fallback for non-JSON-serializable values (should be rare):
  // store a textual representation instead of rejecting the whole field list.
  return encodeJsonWithSize(String(value ?? ''));
}

function normalizeRenderFormFields(value) {
  if (value == null) {
    return { ok: true, fields: [] };
  }
  if (!Array.isArray(value)) {
    return { ok: false, error: 'invalid_render_form_fields' };
  }
  if (value.length > MAX_RENDER_TEMPLATE_FIELDS) {
    return { ok: false, error: 'render_form_fields_too_many_items' };
  }
  const out = [];
  const seen = new Set();
  for (let index = 0; index < value.length; index += 1) {
    const rawField = value[index];
    if (!rawField || typeof rawField !== 'object' || Array.isArray(rawField)) {
      return { ok: false, error: 'invalid_render_form_field', fieldIndex: index };
    }
    const fieldKey = sanitizeRenderFormFieldKey(rawField.fieldKey ?? rawField.key ?? '');
    if (!fieldKey) {
      return { ok: false, error: 'missing_render_form_field_key', fieldIndex: index };
    }
    const fieldKeyLookup = fieldKey.toLowerCase();
    if (seen.has(fieldKeyLookup)) {
      return { ok: false, error: 'duplicate_render_form_field_key', fieldIndex: index, fieldKey };
    }
    seen.add(fieldKeyLookup);

    const fieldLabel = sanitizeRenderFormFieldLabel(
      rawField.fieldLabel ?? rawField.label ?? fieldKey,
      fieldKey
    );
    const sourcePath = sanitizeRenderFormFieldSourcePath(rawField.sourcePath ?? rawField.source ?? '');
    const sourceType = normalizeRenderFormFieldSourceType(rawField.sourceType ?? rawField.source_kind, 'preset_property');
    const inputKind = normalizeRenderFormFieldInputKind(rawField.inputKind ?? rawField.widgetType ?? rawField.widget, 'text');
    const valueType = normalizeRenderFormFieldValueType(rawField.valueType ?? rawField.type ?? 'string', 'string');
    const groupName = sanitizeRenderFormFieldGroupName(rawField.groupName ?? rawField.group ?? '');
    const payloadKey = sanitizeRenderFormFieldPayloadKey(rawField.payloadKey ?? rawField.payload_key ?? fieldKey, fieldKey);
    const placeholder = sanitizeRenderFormFieldPlaceholder(rawField.placeholder);
    const helpText = sanitizeRenderFormFieldHelpText(rawField.helpText ?? rawField.help ?? '');
    const optionsNormalized = normalizeRenderFormFieldOptionsJson(
      Object.prototype.hasOwnProperty.call(rawField, 'options')
        ? rawField.options
        : rawField.optionsJson
    );
    if (!optionsNormalized.ok) {
      return { ok: false, error: optionsNormalized.error || 'invalid_render_form_field_options', fieldIndex: index };
    }
    const validationNormalized = normalizeRenderFormFieldValidationJson(
      Object.prototype.hasOwnProperty.call(rawField, 'validation')
        ? rawField.validation
        : rawField.validationJson
    );
    if (!validationNormalized.ok) {
      return { ok: false, error: validationNormalized.error || 'invalid_render_form_field_validation', fieldIndex: index };
    }
    const hasDefaultValue = Object.prototype.hasOwnProperty.call(rawField, 'defaultValue');
    const defaultValueNormalized = normalizeRenderFormFieldDefaultValueJson(
      hasDefaultValue
        ? rawField.defaultValue
        : rawField.defaultValueJson,
      { rawJsonString: !hasDefaultValue }
    );
    if (!defaultValueNormalized.ok) {
      return { ok: false, error: defaultValueNormalized.error || 'invalid_render_form_field_default_value', fieldIndex: index };
    }
    const sortOrderRaw = Number(rawField.sortOrder);
    const sortOrder = Number.isFinite(sortOrderRaw)
      ? Math.max(-999999, Math.min(999999, Math.trunc(sortOrderRaw)))
      : index + 1;
    out.push({
      fieldKey,
      fieldLabel,
      sourcePath,
      sourceType,
      inputKind,
      valueType,
      groupName,
      payloadKey,
      placeholder,
      helpText,
      optionsJson: optionsNormalized.optionsJson,
      validationJson: validationNormalized.validationJson,
      defaultValueJson: defaultValueNormalized.defaultValueJson,
      isRequired: parseBooleanFlag(rawField.isRequired, false),
      isVisible: parseBooleanFlag(rawField.isVisible, true),
      sortOrder,
    });
  }
  return { ok: true, fields: out };
}

function parseIsoDateOrNull(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toISOString();
}

function resolveTaskDeadlineDays(priority) {
  const p = Number.isFinite(Number(priority)) ? Math.trunc(Number(priority)) : 3;
  const days = Number(TASK_PRIORITY_DEADLINE_DAYS[p] || 0);
  if (Number.isFinite(days) && days > 0) return days;
  return DEFAULT_TASK_DEADLINE_DAYS;
}

function computeTaskDeadlineIso(baseIso, priority) {
  const parsedBase = parseIsoDateOrNull(baseIso);
  const ts = parsedBase ? Date.parse(parsedBase) : NaN;
  const d = Number.isFinite(ts) ? new Date(ts) : new Date();
  d.setUTCDate(d.getUTCDate() + resolveTaskDeadlineDays(priority));
  return d.toISOString();
}

function normalizeRole(value, fallback = DEFAULT_FALLBACK_ROLE) {
  const key = normalizeRoleLookupKey(value);
  if (!key) return sanitizeRoleKey(fallback, DEFAULT_FALLBACK_ROLE);
  const mapped = ROLE_ALIAS_MAP.get(key);
  if (mapped) return mapped;
  return sanitizeRoleKey(value, fallback || DEFAULT_FALLBACK_ROLE);
}

function parseManageableRolesJson(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeManageableRolesInput(value) {
  const src = Array.isArray(value) ? value : [];
  const seen = new Set();
  const out = [];
  for (const item of src) {
    const roleKey = sanitizeRoleKey(item, '');
    if (!roleKey) continue;
    const lookup = normalizeRoleLookupKey(roleKey);
    if (!lookup || seen.has(lookup)) continue;
    seen.add(lookup);
    out.push(roleKey);
  }
  return out;
}

function defaultRoleRow(policy) {
  const now = nowIso();
  const canUseLiveMode = policy?.canUseLiveMode !== false;
  const canUsePostprodMode = policy?.canUsePostprodMode !== false;
  const canLaunchProjects = policy?.canLaunchProjects !== false;
  const canLaunchRenders = policy?.canLaunchRenders !== false;
  return {
    key: sanitizeRoleKey(policy?.key, ''),
    displayName: sanitizeDisplayName(policy?.displayName, policy?.key),
    note: sanitizeRoleNote(policy?.note),
    canUseLiveMode,
    canUsePostprodMode,
    canValidate: policy?.canValidate === true,
    canSyncScenes: policy?.canSyncScenes === true,
    canManageUsers: policy?.canManageUsers === true,
    canManageRoles: policy?.canManageRoles === true,
    canManageForms: policy?.canManageForms === true,
    canManageMachines: policy?.canManageMachines === true,
    canBanUsers: policy?.canBanUsers === true,
    canManageProjectPermissions: policy?.canManageProjectPermissions === true,
    canLaunchProjects,
    canLaunchRenders,
    canViewResources:
      policy?.canViewResources === true
      || (policy?.canViewResources == null && (canUseLiveMode || canUsePostprodMode)),
    canCreateTasks:
      policy?.canCreateTasks === true
      || (policy?.canCreateTasks == null && canLaunchRenders),
    canEditProjects:
      policy?.canEditProjects === true
      || (policy?.canEditProjects == null && canLaunchProjects),
    canManageLayouts:
      policy?.canManageLayouts === true
      || (policy?.canManageLayouts == null && canUseLiveMode),
    manageableRoles: normalizeManageableRolesInput(policy?.manageableRoles),
    isSystem: policy?.isSystem === true,
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeRoleRow(row = {}) {
  const key = sanitizeRoleKey(row?.key, '');
  if (!key) return null;
  const manageable = normalizeManageableRolesInput(
    parseManageableRolesJson(row?.manageable_roles_json ?? row?.manageableRoles)
  );
  return {
    key,
    displayName: sanitizeDisplayName(row?.display_name ?? row?.displayName, key),
    note: sanitizeRoleNote(row?.note ?? row?.role_note),
    canUseLiveMode:
      Number(row?.can_use_live_mode ?? row?.canUseLiveMode) === 1
      || row?.canUseLiveMode === true,
    canUsePostprodMode:
      Number(row?.can_use_postprod_mode ?? row?.canUsePostprodMode) === 1
      || row?.canUsePostprodMode === true,
    canValidate: Number(row?.can_validate ?? row?.canValidate) === 1 || row?.canValidate === true,
    canSyncScenes: Number(row?.can_sync_scenes ?? row?.canSyncScenes) === 1 || row?.canSyncScenes === true,
    canManageUsers: Number(row?.can_manage_users ?? row?.canManageUsers) === 1 || row?.canManageUsers === true,
    canManageRoles: Number(row?.can_manage_roles ?? row?.canManageRoles) === 1 || row?.canManageRoles === true,
    canManageForms: Number(row?.can_manage_forms ?? row?.canManageForms) === 1 || row?.canManageForms === true,
    canManageMachines:
      Number(row?.can_manage_machines ?? row?.canManageMachines) === 1
      || row?.canManageMachines === true,
    canBanUsers: Number(row?.can_ban_users ?? row?.canBanUsers) === 1 || row?.canBanUsers === true,
    canManageProjectPermissions:
      Number(row?.can_manage_project_permissions ?? row?.canManageProjectPermissions) === 1
      || row?.canManageProjectPermissions === true,
    canLaunchProjects:
      Number(row?.can_launch_projects ?? row?.canLaunchProjects) === 1
      || row?.canLaunchProjects === true,
    canLaunchRenders: Number(row?.can_launch_renders ?? row?.canLaunchRenders) === 1 || row?.canLaunchRenders === true,
    canViewResources:
      Number(row?.can_view_resources ?? row?.canViewResources) === 1
      || row?.canViewResources === true,
    canCreateTasks:
      Number(row?.can_create_tasks ?? row?.canCreateTasks) === 1
      || row?.canCreateTasks === true,
    canEditProjects:
      Number(row?.can_edit_projects ?? row?.canEditProjects) === 1
      || row?.canEditProjects === true,
    canManageLayouts:
      Number(row?.can_manage_layouts ?? row?.canManageLayouts) === 1
      || row?.canManageLayouts === true,
    manageableRoles: manageable,
    isSystem: Number(row?.is_system ?? row?.isSystem) === 1 || row?.isSystem === true,
    createdAt: row?.created_at ?? row?.createdAt ?? null,
    updatedAt: row?.updated_at ?? row?.updatedAt ?? null,
  };
}

function buildRolesCache(roleRows = []) {
  const baseByKey = new Map();
  for (const row of roleRows) {
    const normalized = normalizeRoleRow(row);
    if (!normalized) continue;
    baseByKey.set(normalized.key, normalized);
  }

  for (const policy of DEFAULT_ROLE_POLICIES) {
    const key = sanitizeRoleKey(policy?.key, '');
    if (!key || baseByKey.has(key)) continue;
    baseByKey.set(key, defaultRoleRow(policy));
  }

  const lookupRoleKey = new Map();
  for (const key of baseByKey.keys()) {
    const lookup = normalizeRoleLookupKey(key);
    if (lookup) lookupRoleKey.set(lookup, key);
  }

  const normalizedByKey = new Map();
  for (const [key, row] of baseByKey.entries()) {
    const seen = new Set();
    const manageable = [];
    if (row.canManageUsers) {
      for (const candidate of normalizeManageableRolesInput(row.manageableRoles)) {
        const lookup = normalizeRoleLookupKey(candidate);
        if (!lookup) continue;
        const target = lookupRoleKey.get(lookup);
        if (!target || seen.has(target)) continue;
        seen.add(target);
        manageable.push(target);
      }
    }

    const next = {
      ...row,
      key,
      canUseLiveMode: row.canUseLiveMode !== false,
      canUsePostprodMode: row.canUsePostprodMode !== false,
      canManageUsers: row.canManageUsers === true,
      canManageRoles: row.canManageRoles === true,
      canManageForms: row.canManageForms === true,
      canManageMachines: row.canManageMachines === true,
      canBanUsers: row.canBanUsers === true,
      canManageProjectPermissions: row.canManageProjectPermissions === true,
      canLaunchProjects: row.canLaunchProjects !== false,
      canViewResources: row.canViewResources === true,
      canCreateTasks: row.canCreateTasks === true,
      canEditProjects: row.canEditProjects === true,
      canManageLayouts: row.canManageLayouts === true,
      manageableRoles: row.canManageUsers ? manageable : [],
      canValidate: row.canValidate === true,
      canSyncScenes: row.canSyncScenes === true,
      canLaunchRenders: row.canLaunchRenders !== false,
      displayName: sanitizeDisplayName(row.displayName, key),
      note: sanitizeRoleNote(row.note),
      isSystem: row.isSystem === true,
    };

    if (key === SYSTEM_MAINTENANCE_ROLE) {
      next.canUseLiveMode = true;
      next.canUsePostprodMode = true;
      next.canManageUsers = true;
      next.canManageRoles = true;
      next.canManageForms = true;
      next.canManageMachines = true;
      next.canBanUsers = true;
      next.canManageProjectPermissions = true;
      next.canLaunchProjects = true;
      next.canViewResources = true;
      next.canCreateTasks = true;
      next.canEditProjects = true;
      next.canManageLayouts = true;
      next.manageableRoles = Array.from(baseByKey.keys());
    }

    if (!next.canManageUsers) {
      next.canBanUsers = false;
      next.canManageProjectPermissions = false;
      next.manageableRoles = [];
    }
    if (!next.canUseLiveMode) {
      next.canManageLayouts = false;
    }

    normalizedByKey.set(key, next);
  }

  const rows = Array.from(normalizedByKey.values()).sort((a, b) => {
    if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
    return String(a.key).localeCompare(String(b.key));
  });

  const byLookup = new Map();
  for (const role of rows) {
    const keyLookup = normalizeRoleLookupKey(role.key);
    if (keyLookup) byLookup.set(keyLookup, role.key);
    const displayLookup = normalizeRoleLookupKey(role.displayName);
    if (displayLookup && !byLookup.has(displayLookup)) byLookup.set(displayLookup, role.key);
  }
  for (const [alias, canonical] of ROLE_ALIAS_MAP.entries()) {
    if (normalizedByKey.has(canonical)) byLookup.set(alias, canonical);
  }

  return {
    rows,
    byKey: normalizedByKey,
    byLookup,
  };
}

function resolveRoleInput(value, rolesCache, fallback = '') {
  const cache = rolesCache && typeof rolesCache === 'object'
    ? rolesCache
    : { byLookup: new Map() };

  const exact = sanitizeRoleKey(value, '');
  const exactLookup = normalizeRoleLookupKey(exact);
  if (exactLookup && cache.byLookup.has(exactLookup)) {
    return cache.byLookup.get(exactLookup);
  }

  const normalized = normalizeRole(value, '');
  const normalizedLookup = normalizeRoleLookupKey(normalized);
  if (normalizedLookup && cache.byLookup.has(normalizedLookup)) {
    return cache.byLookup.get(normalizedLookup);
  }

  const fb = sanitizeRoleKey(fallback, '');
  const fbLookup = normalizeRoleLookupKey(fb);
  if (fbLookup && cache.byLookup.has(fbLookup)) {
    return cache.byLookup.get(fbLookup);
  }

  return '';
}

function rolePermissions(roleRaw, rolesCache) {
  const cache = rolesCache && typeof rolesCache === 'object'
    ? rolesCache
    : buildRolesCache([]);
  const roleKey = resolveRoleInput(roleRaw, cache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
  const policy = cache.byKey.get(roleKey);
  if (!policy) {
    return {
      canUseLiveMode: true,
      canUsePostprodMode: true,
      canValidate: false,
      canSyncScenes: false,
      canManageUsers: false,
      canManageRoles: false,
      canManageForms: false,
      canManageMachines: false,
      canBanUsers: false,
      canManageProjectPermissions: false,
      canLaunchProjects: true,
      canLaunchRenders: true,
      canViewResources: true,
      canCreateTasks: true,
      canEditProjects: true,
      canManageLayouts: true,
      manageableRoles: [],
    };
  }

  const manageable = policy.canManageUsers
    ? normalizeManageableRolesInput(policy.manageableRoles)
      .map((candidate) => resolveRoleInput(candidate, cache, ''))
      .filter(Boolean)
      .filter((candidate, index, arr) => arr.indexOf(candidate) === index)
    : [];

  const canManageUsers = policy.canManageUsers === true && manageable.length > 0;

  return {
    canUseLiveMode: policy.canUseLiveMode !== false,
    canUsePostprodMode: policy.canUsePostprodMode !== false,
    canValidate: policy.canValidate === true,
    canSyncScenes: policy.canSyncScenes === true,
    canManageUsers,
    canManageRoles: roleKey === SYSTEM_MAINTENANCE_ROLE && policy.canManageRoles === true,
    canManageForms: policy.canManageForms === true,
    canManageMachines: policy.canManageMachines === true,
    canBanUsers: canManageUsers && policy.canBanUsers === true,
    canManageProjectPermissions: canManageUsers && policy.canManageProjectPermissions === true,
    canLaunchProjects: policy.canLaunchProjects !== false,
    canLaunchRenders: policy.canLaunchRenders !== false,
    canViewResources: policy.canViewResources === true,
    canCreateTasks: policy.canCreateTasks === true,
    canEditProjects: policy.canEditProjects === true,
    canManageLayouts: policy.canManageLayouts === true && policy.canUseLiveMode !== false,
    manageableRoles: manageable,
  };
}

function canRenderValidate(roleRaw) {
  const roleKey = normalizeRole(roleRaw, '');
  return RENDER_VALIDATION_ALLOWED_ROLES.has(roleKey);
}

function hashPassword(password, iterations = DEFAULT_PBKDF2_ITERS) {
  const rounds = coercePositiveInt(iterations, DEFAULT_PBKDF2_ITERS, 10000);
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password || ''), salt, rounds, PASSWORD_KEY_LEN, 'sha256')
    .toString('hex');
  return `pbkdf2$sha256$${rounds}$${salt}$${hash}`;
}

function verifyPassword(password, encoded) {
  const raw = String(encoded || '').trim();
  const parts = raw.split('$');
  if (parts.length !== 5) return false;
  const [scheme, digest, roundsRaw, salt, expectedHash] = parts;
  if (scheme !== 'pbkdf2' || digest !== 'sha256') return false;
  const rounds = coercePositiveInt(roundsRaw, 0, 10000);
  if (!rounds || !salt || !expectedHash) return false;
  const actualHash = crypto
    .pbkdf2Sync(String(password || ''), salt, rounds, PASSWORD_KEY_LEN, 'sha256')
    .toString('hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  const actualBuf = Buffer.from(actualHash, 'hex');
  if (!expectedBuf.length || expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function addSeconds(isoUtc, sec) {
  const base = Date.parse(String(isoUtc || ''));
  const rawSec = Number(sec);
  const safeSec = (
    Number.isFinite(rawSec) && rawSec !== 0
      ? Math.trunc(rawSec)
      : coercePositiveInt(sec, DEFAULT_SESSION_TTL_SEC, 60)
  );
  const t = Number.isFinite(base) ? base : Date.now();
  return new Date(t + safeSec * 1000).toISOString();
}

function subtractDays(isoUtc, days, fallbackDays = 0) {
  const base = Date.parse(String(isoUtc || ''));
  const fallback = Number.isFinite(Number(fallbackDays)) ? Math.trunc(Number(fallbackDays)) : 0;
  const rawDays = Number(days);
  const safeDays = Number.isFinite(rawDays) ? Math.max(0, Math.trunc(rawDays)) : Math.max(0, fallback);
  const t = Number.isFinite(base) ? base : Date.now();
  return new Date(t - safeDays * 24 * 60 * 60 * 1000).toISOString();
}

function getRequestIp(req) {
  const fwd = String(req?.headers?.['x-forwarded-for'] || '').trim();
  if (fwd) {
    const first = fwd.split(',')[0];
    if (first) return String(first).trim();
  }
  return String(req?.socket?.remoteAddress || '').trim();
}

function isSecureRequestTransport(req) {
  if (req?.socket?.encrypted === true) return true;
  const forwardedProtoRaw = String(req?.headers?.['x-forwarded-proto'] || '').trim();
  if (forwardedProtoRaw) {
    const protos = forwardedProtoRaw
      .split(',')
      .map((v) => String(v || '').trim().toLowerCase())
      .filter(Boolean);
    if (protos.includes('https') || protos.includes('wss')) return true;
  }
  const forwardedScheme = String(
    req?.headers?.['x-forwarded-scheme'] ||
    req?.headers?.['x-forwarded-protocol'] ||
    req?.headers?.['x-url-scheme'] ||
    ''
  )
    .trim()
    .toLowerCase();
  if (forwardedScheme === 'https' || forwardedScheme === 'wss') return true;
  const frontEndHttps = String(req?.headers?.['front-end-https'] || '')
    .trim()
    .toLowerCase();
  if (frontEndHttps === 'on' || frontEndHttps === '1' || frontEndHttps === 'true') return true;
  if (req?.headers?.['x-arr-ssl']) return true;
  return false;
}

function normalizeDistinguishedName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.slice(0, MAX_CLIENT_CERT_DN_LEN);
}

function normalizeDistinguishedNameKey(value) {
  const normalized = normalizeAscii(normalizeDistinguishedName(value))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return normalized.slice(0, MAX_CLIENT_CERT_DN_LEN);
}

function normalizeClientCertFingerprintSha256(value) {
  let raw = String(value || '').trim();
  if (!raw) return '';
  raw = raw.replace(/^sha[\s_-]?256[:=]/i, '');
  const normalized = raw.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (normalized.length !== CLIENT_CERT_SHA256_HEX_LEN) return '';
  return normalized;
}

function splitEnvList(value) {
  return String(value || '')
    .split(/[,;\n]+/g)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function parseNormalizedEnvSet(value, normalizeFn = (v) => String(v || '').trim()) {
  const out = new Set();
  const list = splitEnvList(value);
  for (const item of list) {
    const normalized = String(normalizeFn(item) || '').trim();
    if (!normalized) continue;
    out.add(normalized);
  }
  return out;
}

function formatDistinguishedNameFromObject(value) {
  if (!value || typeof value !== 'object') return '';
  const fields = [
    ['CN', value.CN || value.commonName],
    ['O', value.O || value.organizationName],
    ['OU', value.OU || value.organizationalUnitName],
    ['L', value.L || value.localityName],
    ['ST', value.ST || value.stateOrProvinceName],
    ['C', value.C || value.countryName],
  ];
  const parts = [];
  for (const [label, raw] of fields) {
    const clean = String(raw || '').trim();
    if (!clean) continue;
    parts.push(`${label}=${clean}`);
  }
  return normalizeDistinguishedName(parts.join(', '));
}

function inspectSocketCertificate(cert) {
  const out = {
    subject: '',
    issuer: '',
    fingerprintSha256: '',
  };
  if (!cert || typeof cert !== 'object') return out;
  if (cert.raw) {
    try {
      const x509 = new crypto.X509Certificate(cert.raw);
      out.subject = normalizeDistinguishedName(x509.subject || '');
      out.issuer = normalizeDistinguishedName(x509.issuer || '');
      out.fingerprintSha256 = normalizeClientCertFingerprintSha256(x509.fingerprint256 || '');
    } catch {}
  }
  if (!out.subject) {
    out.subject = normalizeDistinguishedName(
      cert.subject?.CN ||
      cert.subject?.commonName ||
      formatDistinguishedNameFromObject(cert.subject) ||
      (typeof cert.subject === 'string' ? cert.subject : '') ||
      ''
    );
  }
  if (!out.issuer) {
    out.issuer = normalizeDistinguishedName(
      cert.issuer?.CN ||
      cert.issuer?.commonName ||
      formatDistinguishedNameFromObject(cert.issuer) ||
      (typeof cert.issuer === 'string' ? cert.issuer : '') ||
      ''
    );
  }
  if (!out.fingerprintSha256) {
    out.fingerprintSha256 = normalizeClientCertFingerprintSha256(
      cert.fingerprint256 ||
      cert.fingerprintSHA256 ||
      cert.fingerprint_sha256 ||
      ''
    );
  }
  return out;
}

function evaluateClientCertificatePolicy(certInfo, {
  allowedSubjects = null,
  allowedIssuers = null,
  allowedFingerprints = null,
} = {}) {
  const verified = certInfo?.verified === true;
  if (!verified) {
    return { ok: false, reason: 'not_verified' };
  }
  const subjectKey = normalizeDistinguishedNameKey(certInfo?.subject || '');
  const issuerKey = normalizeDistinguishedNameKey(certInfo?.issuer || '');
  const fingerprintKey = normalizeClientCertFingerprintSha256(certInfo?.fingerprintSha256 || '');

  if (allowedSubjects instanceof Set && allowedSubjects.size > 0 && !allowedSubjects.has(subjectKey)) {
    return { ok: false, reason: 'subject_not_allowed' };
  }
  if (allowedIssuers instanceof Set && allowedIssuers.size > 0 && !allowedIssuers.has(issuerKey)) {
    return { ok: false, reason: 'issuer_not_allowed' };
  }
  if (allowedFingerprints instanceof Set && allowedFingerprints.size > 0 && !allowedFingerprints.has(fingerprintKey)) {
    return { ok: false, reason: 'fingerprint_not_allowed' };
  }

  return { ok: true, reason: 'ok' };
}

function inspectClientCertificate(req, { trustProxyHeaders = true } = {}) {
  try {
    const socketAuthorized = req?.socket?.authorized === true || req?.client?.authorized === true;
    if (socketAuthorized && typeof req?.socket?.getPeerCertificate === 'function') {
      const cert = req.socket.getPeerCertificate(true);
      const certInfo = inspectSocketCertificate(cert);
      return {
        verified: true,
        source: 'socket',
        subject: certInfo.subject,
        issuer: certInfo.issuer,
        fingerprintSha256: certInfo.fingerprintSha256,
      };
    }
  } catch {}

  if (trustProxyHeaders) {
    const verifyHeader = String(
      req?.headers?.['x-ssl-client-verify'] ||
      req?.headers?.['ssl-client-verify'] ||
      req?.headers?.['x-client-verify'] ||
      ''
    )
      .trim()
      .toLowerCase();
    const isVerified = (
      verifyHeader === 'success' ||
      verifyHeader === 'ok' ||
      verifyHeader === 'true' ||
      verifyHeader === '1' ||
      verifyHeader === 'verified'
    );
    if (isVerified) {
      const subject = normalizeDistinguishedName(
        req?.headers?.['x-ssl-client-s-dn'] ||
        req?.headers?.['ssl-client-s-dn'] ||
        req?.headers?.['x-client-cert-subject'] ||
        ''
      );
      const issuer = normalizeDistinguishedName(
        req?.headers?.['x-ssl-client-i-dn'] ||
        req?.headers?.['ssl-client-i-dn'] ||
        req?.headers?.['x-client-cert-issuer'] ||
        ''
      );
      const fingerprintSha256 = normalizeClientCertFingerprintSha256(
        req?.headers?.['x-ssl-client-fingerprint'] ||
        req?.headers?.['ssl-client-fingerprint'] ||
        req?.headers?.['x-client-cert-fingerprint-sha256'] ||
        req?.headers?.['x-client-cert-fingerprint'] ||
        ''
      );
      return {
        verified: true,
        source: 'proxy_header',
        subject,
        issuer,
        fingerprintSha256,
      };
    }
  }

  return {
    verified: false,
    source: '',
    subject: '',
    issuer: '',
    fingerprintSha256: '',
  };
}

function getAuthToken(req, fallback = '') {
  const auth = String(req?.headers?.authorization || '').trim();
  if (auth) {
    const m = /^Bearer\s+(.+)$/i.exec(auth);
    if (m && m[1]) return String(m[1]).trim();
  }
  const fromHeader = String(req?.headers?.['x-uu-auth'] || '').trim();
  if (fromHeader) return fromHeader;
  return String(fallback || '').trim();
}

function getBrokerToken(req) {
  return String(req?.headers?.[BROKER_TOKEN_HEADER] || '').trim().slice(0, MAX_BROKER_TOKEN_LEN);
}

function verifyBrokerToken(expectedToken, requestToken) {
  const expected = String(expectedToken || '').trim();
  if (!expected) return true;
  const request = String(requestToken || '').trim();
  if (!request) return false;
  const expectedBuf = Buffer.from(expected, 'utf8');
  const requestBuf = Buffer.from(request, 'utf8');
  if (expectedBuf.length <= 0 || expectedBuf.length !== requestBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, requestBuf);
}

function decodeJwtPart(part) {
  const raw = String(part || '').trim();
  if (!raw) return null;
  try {
    const normalized = raw
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padLen = normalized.length % 4 === 0 ? 0 : (4 - (normalized.length % 4));
    const padded = normalized + '='.repeat(padLen);
    const text = Buffer.from(padded, 'base64').toString('utf8');
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toBase64Url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input || '');
  return String(buf.toString('base64'))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  try {
    const normalized = raw
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padLen = normalized.length % 4 === 0 ? 0 : (4 - (normalized.length % 4));
    const padded = normalized + '='.repeat(padLen);
    return Buffer.from(padded, 'base64');
  } catch {
    return null;
  }
}

function parseNumericDateClaim(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normalizeAudienceClaim(aud) {
  if (Array.isArray(aud)) {
    return aud
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }
  const one = String(aud || '').trim();
  return one ? [one] : [];
}

function verifyJwtSignatureHS256(parts, signedInput, jwtConfig) {
  if (!jwtConfig?.secret) {
    return { ok: false, reason: 'jwt_secret_missing' };
  }
  const expectedSig = toBase64Url(
    crypto.createHmac('sha256', jwtConfig.secret).update(signedInput).digest()
  );
  const requestSig = String(parts?.[2] || '').trim();
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  const requestBuf = Buffer.from(requestSig, 'utf8');
  if (expectedBuf.length <= 0 || expectedBuf.length !== requestBuf.length) {
    return { ok: false, reason: 'jwt_signature_invalid' };
  }
  if (!crypto.timingSafeEqual(expectedBuf, requestBuf)) {
    return { ok: false, reason: 'jwt_signature_invalid' };
  }
  return { ok: true, reason: 'jwt_signature_ok' };
}

function normalizeJwkUse(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  return raw;
}

function selectBrokerJwkCandidates(jwksKeys, { kid = '', alg = 'RS256' } = {}) {
  const keys = Array.isArray(jwksKeys) ? jwksKeys : [];
  const wantedKid = String(kid || '').trim();
  const wantedAlg = String(alg || '').trim().toUpperCase() || 'RS256';
  const candidates = [];
  for (const key of keys) {
    if (!key || typeof key !== 'object') continue;
    if (String(key.kty || '').trim().toUpperCase() !== 'RSA') continue;
    if (wantedKid && String(key.kid || '').trim() !== wantedKid) continue;
    const use = normalizeJwkUse(key.use);
    if (use && use !== 'sig') continue;
    const keyAlg = String(key.alg || '').trim().toUpperCase();
    if (keyAlg && keyAlg !== wantedAlg) continue;
    candidates.push(key);
  }
  return candidates;
}

function verifyJwtSignatureRS256(parts, signedInput, jwksKeys, header = {}) {
  const signatureBuf = fromBase64Url(parts?.[2]);
  if (!signatureBuf || signatureBuf.length <= 0) {
    return { ok: false, reason: 'jwt_signature_invalid' };
  }
  const headerKid = String(header?.kid || '').trim();
  const primaryCandidates = selectBrokerJwkCandidates(jwksKeys, {
    kid: headerKid,
    alg: 'RS256',
  });
  const fallbackCandidates = headerKid
    ? []
    : selectBrokerJwkCandidates(jwksKeys, {
        kid: '',
        alg: 'RS256',
      });
  const candidates = primaryCandidates.length > 0
    ? primaryCandidates
    : fallbackCandidates;

  if (!Array.isArray(candidates) || candidates.length <= 0) {
    return { ok: false, reason: 'jwt_kid_not_found' };
  }

  for (const jwk of candidates) {
    try {
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(signedInput, 'utf8');
      verifier.end();
      const pubKey = crypto.createPublicKey({
        key: jwk,
        format: 'jwk',
      });
      if (verifier.verify(pubKey, signatureBuf)) {
        return { ok: true, reason: 'jwt_signature_ok', kid: String(jwk?.kid || '').trim() };
      }
    } catch {}
  }
  return { ok: false, reason: 'jwt_signature_invalid' };
}

async function verifyBrokerJwt(requestToken, jwtConfig, nowMs = Date.now()) {
  const token = String(requestToken || '').trim();
  if (!token) return { ok: false, reason: 'missing_token' };
  if (!jwtConfig || jwtConfig.enabled !== true) return { ok: false, reason: 'jwt_disabled' };

  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'jwt_malformed' };

  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  if (!header || typeof header !== 'object') return { ok: false, reason: 'jwt_header_invalid' };
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'jwt_payload_invalid' };
  const alg = String(header.alg || '').trim().toUpperCase();
  if (!alg) return { ok: false, reason: 'jwt_alg_missing' };
  const allowedAlgs = jwtConfig.allowedAlgs instanceof Set
    ? jwtConfig.allowedAlgs
    : new Set(Array.isArray(jwtConfig.allowedAlgs) ? jwtConfig.allowedAlgs : []);
  if (!allowedAlgs.has(alg)) return { ok: false, reason: 'jwt_alg_unsupported' };

  const signedInput = `${parts[0]}.${parts[1]}`;
  if (alg === 'HS256') {
    const hsResult = verifyJwtSignatureHS256(parts, signedInput, jwtConfig);
    if (!hsResult.ok) return hsResult;
  } else if (alg === 'RS256') {
    if (typeof jwtConfig.getJwks !== 'function') {
      return { ok: false, reason: 'jwt_jwks_unavailable' };
    }
    const jwksResult = await jwtConfig.getJwks();
    if (!jwksResult || jwksResult.ok !== true) {
      return { ok: false, reason: String(jwksResult?.reason || 'jwt_jwks_fetch_failed') };
    }
    let rsResult = verifyJwtSignatureRS256(parts, signedInput, jwksResult.keys, header);
    if (!rsResult.ok && rsResult.reason === 'jwt_kid_not_found') {
      const refreshedJwks = await jwtConfig.getJwks({ forceRefresh: true });
      if (!refreshedJwks || refreshedJwks.ok !== true) {
        return { ok: false, reason: String(refreshedJwks?.reason || 'jwt_jwks_refresh_failed') };
      }
      rsResult = verifyJwtSignatureRS256(parts, signedInput, refreshedJwks.keys, header);
    }
    if (!rsResult.ok) return rsResult;
  } else {
    return { ok: false, reason: 'jwt_alg_unsupported' };
  }

  const nowSec = Math.trunc(nowMs / 1000);
  const skew = Math.max(0, Math.trunc(Number(jwtConfig.clockSkewSec || 0)));
  const exp = parseNumericDateClaim(payload.exp);
  const nbf = parseNumericDateClaim(payload.nbf);
  if (exp != null && nowSec > exp + skew) return { ok: false, reason: 'jwt_expired' };
  if (nbf != null && nowSec + skew < nbf) return { ok: false, reason: 'jwt_not_before' };

  if (jwtConfig.issuer) {
    const iss = String(payload.iss || '').trim();
    if (!iss || iss !== jwtConfig.issuer) return { ok: false, reason: 'jwt_issuer_invalid' };
  }
  if (jwtConfig.audience) {
    const audiences = normalizeAudienceClaim(payload.aud);
    if (!audiences.includes(jwtConfig.audience)) return { ok: false, reason: 'jwt_audience_invalid' };
  }

  return {
    ok: true,
    reason: 'jwt_ok',
    alg,
    payload,
  };
}

async function verifyBrokerAuth(requestToken, {
  expectedToken = '',
  jwtConfig = null,
} = {}) {
  const request = String(requestToken || '').trim();
  const hasStatic = String(expectedToken || '').trim().length > 0;
  const hasJwt = jwtConfig && jwtConfig.enabled === true;

  if (!hasStatic && !hasJwt) {
    return { ok: true, reason: 'auth_disabled', matchedBy: 'none' };
  }
  if (!request) {
    return { ok: false, reason: 'missing_broker_token', matchedBy: '' };
  }
  if (hasStatic && verifyBrokerToken(expectedToken, request)) {
    return { ok: true, reason: 'static_ok', matchedBy: 'static' };
  }
  if (hasJwt) {
    const jwtResult = await verifyBrokerJwt(request, jwtConfig);
    if (jwtResult.ok) {
      return {
        ok: true,
        reason: 'jwt_ok',
        matchedBy: 'jwt',
        jwtAlg: String(jwtResult.alg || '').trim(),
      };
    }
    return { ok: false, reason: jwtResult.reason || 'jwt_invalid', matchedBy: '' };
  }
  return { ok: false, reason: 'static_invalid', matchedBy: '' };
}

function ensureDefaultRoles(db, logLine = () => {}) {
  const insertRole = db.prepare(`
    INSERT OR IGNORE INTO roles(
      key,
      display_name,
      note,
      can_use_live_mode,
      can_use_postprod_mode,
      can_validate,
      can_sync_scenes,
      can_manage_users,
      can_manage_roles,
      can_manage_forms,
      can_manage_machines,
      can_ban_users,
      can_manage_project_permissions,
      can_launch_projects,
      can_launch_renders,
      can_view_resources,
      can_create_tasks,
      can_edit_projects,
      can_manage_layouts,
      manageable_roles_json,
      is_system,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = nowIso();
  let inserted = 0;

  const tx = db.transaction(() => {
    for (const policy of DEFAULT_ROLE_POLICIES) {
      const key = sanitizeRoleKey(policy?.key, '');
      if (!key) continue;
      const manageableRoles = normalizeManageableRolesInput(policy?.manageableRoles);
      const res = insertRole.run(
        key,
        sanitizeDisplayName(policy?.displayName, key),
        sanitizeRoleNote(policy?.note),
        policy?.canUseLiveMode !== false ? 1 : 0,
        policy?.canUsePostprodMode !== false ? 1 : 0,
        policy?.canValidate === true ? 1 : 0,
        policy?.canSyncScenes === true ? 1 : 0,
        policy?.canManageUsers === true ? 1 : 0,
        policy?.canManageRoles === true ? 1 : 0,
        policy?.canManageForms === true ? 1 : 0,
        policy?.canManageMachines === true ? 1 : 0,
        policy?.canBanUsers === true ? 1 : 0,
        policy?.canManageProjectPermissions === true ? 1 : 0,
        policy?.canLaunchProjects !== false ? 1 : 0,
        policy?.canLaunchRenders !== false ? 1 : 0,
        policy?.canViewResources === true ? 1 : 0,
        policy?.canCreateTasks === true ? 1 : 0,
        policy?.canEditProjects === true ? 1 : 0,
        policy?.canManageLayouts === true ? 1 : 0,
        JSON.stringify(manageableRoles),
        policy?.isSystem === true ? 1 : 0,
        now,
        now
      );
      inserted += Number(res?.changes || 0);
    }
  });
  tx();

  if (inserted > 0) {
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'roles_seeded',
      message: `${inserted} role(s) par defaut ajoutes`,
    });
  }
}

function ensureSchema(db, logLine = () => {}) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const hasV1 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 1 LIMIT 1')
    .get();
  if (!hasV1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        public_id TEXT NOT NULL UNIQUE,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        display_name TEXT NOT NULL DEFAULT '',
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        email_secondary TEXT NOT NULL DEFAULT '',
        mobile_phone TEXT NOT NULL DEFAULT '',
        office_phone TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        employment_type TEXT NOT NULL DEFAULT '',
        user_note TEXT NOT NULL DEFAULT '',
        avatar_path TEXT NOT NULL DEFAULT '',
        must_change_password INTEGER NOT NULL DEFAULT 0,
        failed_login_count INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login_at TEXT
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        revoked_at TEXT,
        ip TEXT NOT NULL DEFAULT '',
        user_agent TEXT NOT NULL DEFAULT '',
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id INTEGER,
        action TEXT NOT NULL,
        scope_type TEXT NOT NULL DEFAULT '',
        scope_id TEXT NOT NULL DEFAULT '',
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
    `);

    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(1, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v1',
      message: 'Migration SQLite postprod v1 appliquee',
    });
  }

  const hasV2 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 2 LIMIT 1')
    .get();
  if (!hasV2) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS roles (
        key TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        can_use_live_mode INTEGER NOT NULL DEFAULT 1,
        can_use_postprod_mode INTEGER NOT NULL DEFAULT 1,
        can_validate INTEGER NOT NULL DEFAULT 0,
        can_sync_scenes INTEGER NOT NULL DEFAULT 0,
        can_manage_users INTEGER NOT NULL DEFAULT 0,
        can_manage_roles INTEGER NOT NULL DEFAULT 0,
        can_manage_forms INTEGER NOT NULL DEFAULT 0,
        can_manage_machines INTEGER NOT NULL DEFAULT 0,
        can_ban_users INTEGER NOT NULL DEFAULT 0,
        can_manage_project_permissions INTEGER NOT NULL DEFAULT 0,
        can_launch_projects INTEGER NOT NULL DEFAULT 1,
        can_launch_renders INTEGER NOT NULL DEFAULT 1,
        can_view_resources INTEGER NOT NULL DEFAULT 1,
        can_create_tasks INTEGER NOT NULL DEFAULT 1,
        can_edit_projects INTEGER NOT NULL DEFAULT 1,
        can_manage_layouts INTEGER NOT NULL DEFAULT 1,
        manageable_roles_json TEXT NOT NULL DEFAULT '[]',
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_roles_system ON roles(is_system);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(2, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v2',
      message: 'Migration SQLite postprod v2 appliquee',
    });
  }

  const hasV3 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 3 LIMIT 1')
    .get();
  if (!hasV3) {
    const now = nowIso();
    const patchRoleManageable = db.prepare(`
      UPDATE roles
      SET manageable_roles_json = ?, updated_at = ?
      WHERE key = ?
        AND is_system = 1
    `);
    patchRoleManageable.run(JSON.stringify(['Graphiste', 'Journaliste']), now, 'Responsable Fabrication');
    patchRoleManageable.run(JSON.stringify(['Operateur', 'Journaliste']), now, 'Integrateur');
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(3, ?)').run(now);
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v3',
      message: 'Migration SQLite postprod v3 appliquee',
    });
  }

  const hasV4 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 4 LIMIT 1')
    .get();
  if (!hasV4) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 3,
        assignee_user_id INTEGER,
        project_refs_json TEXT NOT NULL DEFAULT '[]',
        resource_refs_json TEXT NOT NULL DEFAULT '[]',
        reporter_user_id INTEGER NOT NULL,
        due_at TEXT NOT NULL CHECK (TRIM(due_at) <> ''),
        submitted_at TEXT,
        validated_at TEXT,
        rejected_at TEXT,
        started_at TEXT,
        finished_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(assignee_user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY(reporter_user_id) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS task_transitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        by_user_id INTEGER NOT NULL,
        comment TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY(by_user_id) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_user_id);
      CREATE INDEX IF NOT EXISTS idx_task_transitions_task_id ON task_transitions(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_transitions_created_at ON task_transitions(created_at);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(4, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v4',
      message: 'Migration SQLite postprod v4 appliquee',
    });
  }

  const hasV5 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 5 LIMIT 1')
    .get();
  if (!hasV5) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS render_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT NOT NULL DEFAULT '',
        template_name TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL,
        review_status TEXT NOT NULL DEFAULT 'to_validate',
        requested_by_user_id INTEGER NOT NULL,
        validated_by_user_id INTEGER,
        requires_validation INTEGER NOT NULL DEFAULT 0,
        output_path TEXT NOT NULL DEFAULT '',
        error_message TEXT NOT NULL DEFAULT '',
        started_at TEXT,
        finished_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(requested_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY(validated_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS render_job_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        render_job_id INTEGER NOT NULL,
        from_status TEXT NOT NULL,
        to_status TEXT NOT NULL,
        by_user_id INTEGER NOT NULL,
        comment TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY(render_job_id) REFERENCES render_jobs(id) ON DELETE CASCADE,
        FOREIGN KEY(by_user_id) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON render_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_render_jobs_updated_at ON render_jobs(updated_at);
      CREATE INDEX IF NOT EXISTS idx_render_jobs_requested_by ON render_jobs(requested_by_user_id);
      CREATE INDEX IF NOT EXISTS idx_render_job_events_job_id ON render_job_events(render_job_id);
      CREATE INDEX IF NOT EXISTS idx_render_job_events_created_at ON render_job_events(created_at);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(5, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v5',
      message: 'Migration SQLite postprod v5 appliquee',
    });
  }

  const hasV6 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 6 LIMIT 1')
    .get();
  if (!hasV6) {
    const cols = db.prepare('PRAGMA table_info(users)').all();
    const names = new Set(cols.map((c) => String(c?.name || '').trim()));
    if (!names.has('first_name')) {
      db.exec("ALTER TABLE users ADD COLUMN first_name TEXT NOT NULL DEFAULT ''");
    }
    if (!names.has('last_name')) {
      db.exec("ALTER TABLE users ADD COLUMN last_name TEXT NOT NULL DEFAULT ''");
    }
    if (!names.has('email')) {
      db.exec("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''");
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(6, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v6',
      message: 'Migration SQLite postprod v6 appliquee',
    });
  }

  const hasV7 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 7 LIMIT 1')
    .get();
  if (!hasV7) {
    const backfillRows = db.prepare(`
      SELECT id, created_at, priority
      FROM tasks
      WHERE due_at IS NULL
         OR TRIM(due_at) = ''
    `).all();
    if (Array.isArray(backfillRows) && backfillRows.length > 0) {
      const markUpdatedAt = nowIso();
      const updateTaskDueAt = db.prepare(`
        UPDATE tasks
        SET due_at = ?, updated_at = ?
        WHERE id = ?
      `);
      const tx = db.transaction((rows) => {
        for (const row of rows) {
          const taskId = Number(row?.id || 0);
          if (!Number.isFinite(taskId) || taskId <= 0) continue;
          const baseIso = parseIsoDateOrNull(row?.created_at) || markUpdatedAt;
          const dueAt = computeTaskDeadlineIso(baseIso, row?.priority);
          updateTaskDueAt.run(dueAt, markUpdatedAt, taskId);
        }
      });
      tx(backfillRows);
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(7, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v7',
      message: 'Migration SQLite postprod v7 appliquee (deadline taches auto/backfill)',
    });
  }

  const hasV8 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 8 LIMIT 1')
    .get();
  if (!hasV8) {
    const currentRows = db.prepare(`
      SELECT
        id,
        title,
        description,
        status,
        priority,
        assignee_user_id,
        reporter_user_id,
        due_at,
        submitted_at,
        validated_at,
        rejected_at,
        started_at,
        finished_at,
        created_at,
        updated_at
      FROM tasks
      ORDER BY id ASC
    `).all();

    const migrateTasks = db.transaction((rows) => {
      db.exec(`
        DROP TABLE IF EXISTS tasks_new;
        CREATE TABLE IF NOT EXISTS tasks_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL,
          priority INTEGER NOT NULL DEFAULT 3,
          assignee_user_id INTEGER,
          project_refs_json TEXT NOT NULL DEFAULT '[]',
          resource_refs_json TEXT NOT NULL DEFAULT '[]',
          reporter_user_id INTEGER NOT NULL,
          due_at TEXT NOT NULL CHECK (TRIM(due_at) <> ''),
          submitted_at TEXT,
          validated_at TEXT,
          rejected_at TEXT,
          started_at TEXT,
          finished_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY(assignee_user_id) REFERENCES users(id) ON DELETE SET NULL,
          FOREIGN KEY(reporter_user_id) REFERENCES users(id) ON DELETE RESTRICT
        );
      `);

      const insertTaskNew = db.prepare(`
        INSERT INTO tasks_new(
          id,
          title,
          description,
          status,
          priority,
          assignee_user_id,
          project_refs_json,
          resource_refs_json,
          reporter_user_id,
          due_at,
          submitted_at,
          validated_at,
          rejected_at,
          started_at,
          finished_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = nowIso();
      for (const row of rows) {
        const priority = Number.isFinite(Number(row?.priority)) ? Number(row.priority) : 3;
        const createdAt = parseIsoDateOrNull(row?.created_at) || now;
        const updatedAt = parseIsoDateOrNull(row?.updated_at) || now;
        const dueAt = parseIsoDateOrNull(row?.due_at) || computeTaskDeadlineIso(createdAt, priority);
        const reporterUserId = Number(row?.reporter_user_id);
        if (!Number.isFinite(reporterUserId) || reporterUserId <= 0) {
          throw new Error(`invalid_reporter_user_id_for_task_${Number(row?.id || 0)}`);
        }
        insertTaskNew.run(
          Number(row?.id || 0),
          String(row?.title || ''),
          String(row?.description || ''),
          normalizeTaskStatus(row?.status, 'A faire'),
          priority,
          row?.assignee_user_id == null ? null : Number(row.assignee_user_id),
          '[]',
          '[]',
          reporterUserId,
          dueAt,
          parseIsoDateOrNull(row?.submitted_at),
          parseIsoDateOrNull(row?.validated_at),
          parseIsoDateOrNull(row?.rejected_at),
          parseIsoDateOrNull(row?.started_at),
          parseIsoDateOrNull(row?.finished_at),
          createdAt,
          updatedAt
        );
      }

      db.exec(`
        DROP TABLE tasks;
        ALTER TABLE tasks_new RENAME TO tasks;
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
        CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
      `);
    });

    db.pragma('foreign_keys = OFF');
    try {
      migrateTasks(currentRows);
    } finally {
      db.pragma('foreign_keys = ON');
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(8, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v8',
      message: 'Migration SQLite postprod v8 appliquee (due_at obligatoire en base)',
    });
  }

  const hasV9 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 9 LIMIT 1')
    .get();
  if (!hasV9) {
    const cols = db.prepare('PRAGMA table_info(tasks)').all();
    const names = new Set(cols.map((c) => String(c?.name || '').trim()));
    if (!names.has('project_refs_json')) {
      db.exec("ALTER TABLE tasks ADD COLUMN project_refs_json TEXT NOT NULL DEFAULT '[]'");
    }
    if (!names.has('resource_refs_json')) {
      db.exec("ALTER TABLE tasks ADD COLUMN resource_refs_json TEXT NOT NULL DEFAULT '[]'");
    }

    db.prepare(`
      UPDATE tasks
      SET project_refs_json = '[]'
      WHERE project_refs_json IS NULL OR TRIM(project_refs_json) = ''
    `).run();
    db.prepare(`
      UPDATE tasks
      SET resource_refs_json = '[]'
      WHERE resource_refs_json IS NULL OR TRIM(resource_refs_json) = ''
    `).run();

    const rows = db.prepare(`
      SELECT id, project_refs_json, resource_refs_json
      FROM tasks
      ORDER BY id ASC
    `).all();
    if (Array.isArray(rows) && rows.length > 0) {
      const updateRefs = db.prepare(`
        UPDATE tasks
        SET project_refs_json = ?, resource_refs_json = ?
        WHERE id = ?
      `);
      const tx = db.transaction((items) => {
        for (const row of items) {
          const taskId = Number(row?.id || 0);
          if (!Number.isFinite(taskId) || taskId <= 0) continue;
          const projectRefsJson = JSON.stringify(parseTaskRefsJson(row?.project_refs_json));
          const resourceRefsJson = JSON.stringify(parseTaskRefsJson(row?.resource_refs_json));
          updateRefs.run(projectRefsJson, resourceRefsJson, taskId);
        }
      });
      tx(rows);
    }

    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(9, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v9',
      message: 'Migration SQLite postprod v9 appliquee (liaisons projet/ressource sur taches)',
    });
  }

  const hasV10 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 10 LIMIT 1')
    .get();
  if (!hasV10) {
    const userCols = db.prepare('PRAGMA table_info(users)').all();
    const userColNames = new Set(userCols.map((c) => String(c?.name || '').trim()));

    if (!userColNames.has('mobile_phone')) {
      db.exec("ALTER TABLE users ADD COLUMN mobile_phone TEXT NOT NULL DEFAULT ''");
    }
    if (!userColNames.has('office_phone')) {
      db.exec("ALTER TABLE users ADD COLUMN office_phone TEXT NOT NULL DEFAULT ''");
    }
    if (!userColNames.has('must_change_password')) {
      db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0');
    }
    if (!userColNames.has('failed_login_count')) {
      db.exec('ALTER TABLE users ADD COLUMN failed_login_count INTEGER NOT NULL DEFAULT 0');
    }
    if (!userColNames.has('locked_until')) {
      db.exec('ALTER TABLE users ADD COLUMN locked_until TEXT');
    }

    db.exec(`
      UPDATE users SET mobile_phone = '' WHERE mobile_phone IS NULL;
      UPDATE users SET office_phone = '' WHERE office_phone IS NULL;
      UPDATE users
      SET must_change_password = CASE WHEN must_change_password = 1 THEN 1 ELSE 0 END;
      UPDATE users
      SET failed_login_count = CASE
        WHEN failed_login_count IS NULL THEN 0
        WHEN CAST(failed_login_count AS INTEGER) < 0 THEN 0
        ELSE CAST(failed_login_count AS INTEGER)
      END;

      CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);

      CREATE TABLE IF NOT EXISTS project_user_roles (
        user_id INTEGER NOT NULL,
        project_id TEXT NOT NULL,
        is_referent INTEGER NOT NULL DEFAULT 0,
        can_validate INTEGER NOT NULL DEFAULT 0,
        can_sync INTEGER NOT NULL DEFAULT 0,
        can_launch_render INTEGER NOT NULL DEFAULT 0,
        can_edit_data INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, project_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_project_user_roles_project_id
        ON project_user_roles(project_id);

      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        timezone TEXT NOT NULL DEFAULT '',
        notification_preferences_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    const now = nowIso();
    db.prepare(`
      INSERT INTO user_preferences(user_id, timezone, notification_preferences_json, created_at, updated_at)
      SELECT u.id, '', '{}', ?, ?
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM user_preferences up WHERE up.user_id = u.id
      )
    `).run(now, now);

    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(10, ?)').run(now);
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v10',
      message: 'Migration SQLite postprod v10 appliquee (users et preferences et roles projet)',
    });
  }

  const hasV11 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 11 LIMIT 1')
    .get();
  if (!hasV11) {
    const roleCols = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames = new Set(roleCols.map((c) => String(c?.name || '').trim()));
    if (!roleColNames.has('note')) {
      db.exec("ALTER TABLE roles ADD COLUMN note TEXT NOT NULL DEFAULT ''");
    }
    db.exec("UPDATE roles SET note = '' WHERE note IS NULL");
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(11, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v11',
      message: 'Migration SQLite postprod v11 appliquee (note profil)',
    });
  }

  const hasV12 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 12 LIMIT 1')
    .get();
  if (!hasV12) {
    const userCols = db.prepare('PRAGMA table_info(users)').all();
    const userColNames = new Set(userCols.map((c) => String(c?.name || '').trim()));
    if (!userColNames.has('user_note')) {
      db.exec("ALTER TABLE users ADD COLUMN user_note TEXT NOT NULL DEFAULT ''");
    }
    db.exec("UPDATE users SET user_note = '' WHERE user_note IS NULL");
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(12, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v12',
      message: 'Migration SQLite postprod v12 appliquee (note utilisateur)',
    });
  }

  const hasV13 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 13 LIMIT 1')
    .get();
  if (!hasV13) {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_actor_created_at
        ON audit_log(actor_user_id, created_at DESC);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(13, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v13',
      message: 'Migration SQLite postprod v13 appliquee (index audit utilisateur)',
    });
  }

  const hasV14 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 14 LIMIT 1')
    .get();
  if (!hasV14) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS render_workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_key TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL DEFAULT '',
        can_render INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_online INTEGER NOT NULL DEFAULT 0,
        current_render_job_id INTEGER,
        last_seen_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(current_render_job_id) REFERENCES render_jobs(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_render_workers_active_online
        ON render_workers(is_active, is_online);
      CREATE INDEX IF NOT EXISTS idx_render_workers_last_seen
        ON render_workers(last_seen_at);
    `);

    const renderJobCols = db.prepare('PRAGMA table_info(render_jobs)').all();
    const renderJobColNames = new Set(renderJobCols.map((c) => String(c?.name || '').trim()));
    if (!renderJobColNames.has('assigned_worker_id')) {
      db.exec('ALTER TABLE render_jobs ADD COLUMN assigned_worker_id INTEGER');
    }
    if (!renderJobColNames.has('attempt_count')) {
      db.exec('ALTER TABLE render_jobs ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0');
    }
    if (!renderJobColNames.has('max_attempts')) {
      db.exec('ALTER TABLE render_jobs ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3');
    }
    if (!renderJobColNames.has('last_attempt_at')) {
      db.exec('ALTER TABLE render_jobs ADD COLUMN last_attempt_at TEXT');
    }
    db.exec(`
      UPDATE render_jobs
      SET attempt_count = CASE
        WHEN attempt_count IS NULL THEN 0
        WHEN CAST(attempt_count AS INTEGER) < 0 THEN 0
        ELSE CAST(attempt_count AS INTEGER)
      END;
      UPDATE render_jobs
      SET max_attempts = CASE
        WHEN max_attempts IS NULL THEN 3
        WHEN CAST(max_attempts AS INTEGER) <= 0 THEN 3
        ELSE CAST(max_attempts AS INTEGER)
      END;
      CREATE INDEX IF NOT EXISTS idx_render_jobs_queue
        ON render_jobs(status, assigned_worker_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_render_jobs_assigned_worker
        ON render_jobs(assigned_worker_id, status);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(14, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v14',
      message: 'Migration SQLite postprod v14 appliquee (workers + dispatch renders)',
    });
  }

  const hasV15 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 15 LIMIT 1')
    .get();
  if (!hasV15) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS render_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        project_name TEXT NOT NULL DEFAULT '',
        template_name TEXT NOT NULL DEFAULT '',
        execution_json TEXT NOT NULL DEFAULT '{}',
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_by_user_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(created_by_user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_render_templates_updated_at
        ON render_templates(updated_at DESC);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(15, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v15',
      message: 'Migration SQLite postprod v15 appliquee (presets de rendu)',
    });
  }

  const hasV16 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 16 LIMIT 1')
    .get();
  if (!hasV16) {
    const userCols = db.prepare('PRAGMA table_info(users)').all();
    const userColNames = new Set(userCols.map((c) => String(c?.name || '').trim()));
    if (!userColNames.has('avatar_path')) {
      db.exec("ALTER TABLE users ADD COLUMN avatar_path TEXT NOT NULL DEFAULT ''");
    }
    db.exec("UPDATE users SET avatar_path = '' WHERE avatar_path IS NULL");
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(16, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v16',
      message: 'Migration SQLite postprod v16 appliquee (avatar utilisateur)',
    });
  }

  const hasV17 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 17 LIMIT 1')
    .get();
  if (!hasV17) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS data_tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        schema_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(project_id, name)
      );

      CREATE INDEX IF NOT EXISTS idx_data_tables_project_id
        ON data_tables(project_id);
      CREATE INDEX IF NOT EXISTS idx_data_tables_updated_at
        ON data_tables(updated_at DESC);

      CREATE TABLE IF NOT EXISTS data_rows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_id INTEGER NOT NULL,
        row_key TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(table_id, row_key),
        FOREIGN KEY(table_id) REFERENCES data_tables(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_data_rows_table_id
        ON data_rows(table_id);
      CREATE INDEX IF NOT EXISTS idx_data_rows_updated_at
        ON data_rows(updated_at DESC);

      CREATE TABLE IF NOT EXISTS sync_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        by_user_id INTEGER NOT NULL,
        source TEXT NOT NULL DEFAULT '',
        result TEXT NOT NULL DEFAULT '',
        details_json TEXT NOT NULL DEFAULT '{}',
        synced_at TEXT NOT NULL,
        FOREIGN KEY(by_user_id) REFERENCES users(id) ON DELETE RESTRICT
      );

      CREATE INDEX IF NOT EXISTS idx_sync_events_project_synced_at
        ON sync_events(project_id, synced_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sync_events_by_user_synced_at
        ON sync_events(by_user_id, synced_at DESC);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(17, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v17',
      message: 'Migration SQLite postprod v17 appliquee (data tables + data rows + sync events)',
    });
  }

  const hasV18 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 18 LIMIT 1')
    .get();
  if (!hasV18) {
    const userCols = db.prepare('PRAGMA table_info(users)').all();
    const userColNames = new Set(userCols.map((c) => String(c?.name || '').trim()));
    if (!userColNames.has('public_id')) {
      db.exec("ALTER TABLE users ADD COLUMN public_id TEXT NOT NULL DEFAULT ''");
    }
    if (!userColNames.has('phone')) {
      db.exec("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
    }
    if (!userColNames.has('employment_type')) {
      db.exec("ALTER TABLE users ADD COLUMN employment_type TEXT NOT NULL DEFAULT ''");
    }
    db.exec(`
      UPDATE users SET phone = '' WHERE phone IS NULL;
      UPDATE users SET phone = mobile_phone WHERE TRIM(phone) = '' AND TRIM(COALESCE(mobile_phone, '')) <> '';
      UPDATE users SET phone = office_phone WHERE TRIM(phone) = '' AND TRIM(COALESCE(office_phone, '')) <> '';
      UPDATE users SET mobile_phone = phone WHERE TRIM(COALESCE(mobile_phone, '')) = '' AND TRIM(COALESCE(phone, '')) <> '';
      UPDATE users SET office_phone = phone WHERE TRIM(COALESCE(office_phone, '')) = '' AND TRIM(COALESCE(phone, '')) <> '';
      UPDATE users SET employment_type = '' WHERE employment_type IS NULL;
    `);
    const usersWithoutPublicId = db.prepare(`
      SELECT id
      FROM users
      WHERE public_id IS NULL OR TRIM(public_id) = ''
    `).all();
    const updatePublicIdStmt = db.prepare('UPDATE users SET public_id = ? WHERE id = ?');
    const findPublicIdStmt = db.prepare('SELECT 1 FROM users WHERE public_id = ? LIMIT 1');
    for (const row of usersWithoutPublicId) {
      let nextPublicId = '';
      do {
        nextPublicId = buildPublicId();
      } while (findPublicIdStmt.get(nextPublicId));
      updatePublicIdStmt.run(nextPublicId, Number(row?.id || 0));
    }
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_id_unique ON users(public_id);
      CREATE INDEX IF NOT EXISTS idx_users_employment_type ON users(employment_type);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(18, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v18',
      message: 'Migration SQLite postprod v18 appliquee (publicId + phone unifie + employmentType)',
    });
  }

  const hasV19 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 19 LIMIT 1')
    .get();
  if (!hasV19) {
    const renderTemplateCols = db.prepare('PRAGMA table_info(render_templates)').all();
    const renderTemplateColNames = new Set(renderTemplateCols.map((c) => String(c?.name || '').trim()));
    if (!renderTemplateColNames.has('map_name')) {
      db.exec("ALTER TABLE render_templates ADD COLUMN map_name TEXT NOT NULL DEFAULT ''");
    }
    if (!renderTemplateColNames.has('sequence_name')) {
      db.exec("ALTER TABLE render_templates ADD COLUMN sequence_name TEXT NOT NULL DEFAULT ''");
    }
    if (!renderTemplateColNames.has('output_profile')) {
      db.exec("ALTER TABLE render_templates ADD COLUMN output_profile TEXT NOT NULL DEFAULT ''");
    }
    if (!renderTemplateColNames.has('allowed_roles_json')) {
      db.exec("ALTER TABLE render_templates ADD COLUMN allowed_roles_json TEXT NOT NULL DEFAULT '[]'");
    }
    db.exec(`
      UPDATE render_templates SET map_name = '' WHERE map_name IS NULL;
      UPDATE render_templates SET sequence_name = '' WHERE sequence_name IS NULL;
      UPDATE render_templates SET output_profile = '' WHERE output_profile IS NULL;
      UPDATE render_templates SET allowed_roles_json = '[]' WHERE allowed_roles_json IS NULL OR TRIM(allowed_roles_json) = '';
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(19, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v19',
      message: 'Migration SQLite postprod v19 appliquee (render_templates: map/sequence/outputProfile/allowedRoles)',
    });
  }

  const hasV20 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 20 LIMIT 1')
    .get();
  if (!hasV20) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS resources_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT '',
        title TEXT NOT NULL,
        source_path TEXT NOT NULL DEFAULT '',
        metadata_json TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(code)
      );

      CREATE INDEX IF NOT EXISTS idx_resources_index_title
        ON resources_index(title);
      CREATE INDEX IF NOT EXISTS idx_resources_index_type
        ON resources_index(type);
      CREATE INDEX IF NOT EXISTS idx_resources_index_updated_at
        ON resources_index(updated_at DESC);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(20, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v20',
      message: 'Migration SQLite postprod v20 appliquee (resources_index)',
    });
  }

  const hasV21 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 21 LIMIT 1')
    .get();
  if (!hasV21) {
    const renderWorkerCols = db.prepare('PRAGMA table_info(render_workers)').all();
    const renderWorkerColNames = new Set(renderWorkerCols.map((c) => String(c?.name || '').trim()));
    if (!renderWorkerColNames.has('capabilities_json')) {
      db.exec("ALTER TABLE render_workers ADD COLUMN capabilities_json TEXT NOT NULL DEFAULT '{}'");
    }
    db.exec(`
      UPDATE render_workers
      SET capabilities_json = '{}'
      WHERE capabilities_json IS NULL OR TRIM(capabilities_json) = '';
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(21, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v21',
      message: 'Migration SQLite postprod v21 appliquee (capabilities render workers)',
    });
  }

  const hasV22 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 22 LIMIT 1')
    .get();
  if (!hasV22) {
    const now = nowIso();
    db.exec(`
      CREATE TABLE IF NOT EXISTS render_dispatch_policy (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        max_jobs INTEGER NOT NULL DEFAULT ${DEFAULT_RENDER_DISPATCH_MAX_JOBS},
        policy_json TEXT NOT NULL DEFAULT '{}',
        updated_by_user_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(updated_by_user_id) REFERENCES users(id)
      );
    `);
    const exists = db.prepare('SELECT id FROM render_dispatch_policy WHERE id = 1 LIMIT 1').get();
    if (!exists) {
      db.prepare(`
        INSERT INTO render_dispatch_policy(id, max_jobs, policy_json, updated_by_user_id, created_at, updated_at)
        VALUES (1, ?, '{}', NULL, ?, ?)
      `).run(DEFAULT_RENDER_DISPATCH_MAX_JOBS, now, now);
    }
    db.exec(`
      UPDATE render_dispatch_policy
      SET
        max_jobs = CASE
          WHEN max_jobs IS NULL OR max_jobs < 1 THEN ${DEFAULT_RENDER_DISPATCH_MAX_JOBS}
          WHEN max_jobs > ${MAX_RENDER_DISPATCH_MAX_JOBS} THEN ${MAX_RENDER_DISPATCH_MAX_JOBS}
          ELSE max_jobs
        END,
        policy_json = CASE
          WHEN policy_json IS NULL OR TRIM(policy_json) = '' THEN '{}'
          ELSE policy_json
        END,
        updated_at = CASE
          WHEN updated_at IS NULL OR TRIM(updated_at) = '' THEN '${now}'
          ELSE updated_at
        END,
        created_at = CASE
          WHEN created_at IS NULL OR TRIM(created_at) = '' THEN '${now}'
          ELSE created_at
        END
      WHERE id = 1;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(22, ?)').run(now);
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v22',
      message: 'Migration SQLite postprod v22 appliquee (politique de dispatch persistante)',
    });
  }

  const hasV23 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 23 LIMIT 1')
    .get();
  if (!hasV23) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS render_detected_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_signature TEXT NOT NULL UNIQUE,
        source_dir TEXT NOT NULL DEFAULT '',
        file_path TEXT NOT NULL DEFAULT '',
        project_name TEXT NOT NULL DEFAULT '',
        template_name TEXT NOT NULL DEFAULT '',
        file_name TEXT NOT NULL DEFAULT '',
        file_ext TEXT NOT NULL DEFAULT '',
        file_size INTEGER NOT NULL DEFAULT 0,
        file_mtime_at TEXT NOT NULL DEFAULT '',
        render_job_id INTEGER,
        matched_task_id INTEGER,
        matched_expected_render_name TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'imported',
        error_message TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(render_job_id) REFERENCES render_jobs(id) ON DELETE SET NULL,
        FOREIGN KEY(matched_task_id) REFERENCES tasks(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_render_detected_files_created_at
        ON render_detected_files(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_render_detected_files_file_path
        ON render_detected_files(file_path);
      CREATE INDEX IF NOT EXISTS idx_render_detected_files_render_job_id
        ON render_detected_files(render_job_id);
      CREATE INDEX IF NOT EXISTS idx_render_detected_files_matched_task_id
        ON render_detected_files(matched_task_id);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(23, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v23',
      message: 'Migration SQLite postprod v23 appliquee (ingestion fichiers de rendu detectes)',
    });
  }

  const hasV24 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 24 LIMIT 1')
    .get();
  if (!hasV24) {
    const taskCols = db.prepare('PRAGMA table_info(tasks)').all();
    const taskColNames = new Set(taskCols.map((c) => String(c?.name || '').trim()));
    if (!taskColNames.has('request_type')) {
      db.exec(`ALTER TABLE tasks ADD COLUMN request_type TEXT NOT NULL DEFAULT '${DEFAULT_TASK_REQUEST_TYPE}'`);
    }
    if (!taskColNames.has('expected_render_count')) {
      db.exec('ALTER TABLE tasks ADD COLUMN expected_render_count INTEGER NOT NULL DEFAULT 1');
    }
    if (!taskColNames.has('expected_render_names_json')) {
      db.exec("ALTER TABLE tasks ADD COLUMN expected_render_names_json TEXT NOT NULL DEFAULT '[]'");
    }

    const rows = db.prepare(`
      SELECT
        id,
        title,
        request_type,
        expected_render_count,
        expected_render_names_json
      FROM tasks
      ORDER BY id ASC
    `).all();
    if (Array.isArray(rows) && rows.length > 0) {
      const normalizeTaskExpectedRenderFields = db.prepare(`
        UPDATE tasks
        SET
          request_type = ?,
          expected_render_count = ?,
          expected_render_names_json = ?,
          updated_at = ?
        WHERE id = ?
      `);
      const tx = db.transaction((items) => {
        const now = nowIso();
        for (const row of items) {
          const taskId = Number(row?.id || 0);
          if (!Number.isFinite(taskId) || taskId <= 0) continue;
          const requestType = normalizeTaskRequestType(row?.request_type, DEFAULT_TASK_REQUEST_TYPE);
          const expectedRenderCount = normalizeTaskExpectedRenderCount(
            row?.expected_render_count,
            requestType,
            1
          );
          const expectedRenderNames = resolveTaskExpectedRenderNames({
            title: row?.title,
            requestType,
            expectedRenderCount,
            expectedRenderNames: row?.expected_render_names_json,
          });
          normalizeTaskExpectedRenderFields.run(
            requestType,
            expectedRenderCount,
            JSON.stringify(expectedRenderNames),
            now,
            taskId
          );
        }
      });
      tx(rows);
    }

    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(24, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v24',
      message: 'Migration SQLite postprod v24 appliquee (rendus attendus sur taches)',
    });
  }

  const hasV25 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 25 LIMIT 1')
    .get();
  if (!hasV25) {
    const cols = db.prepare('PRAGMA table_info(render_detected_files)').all();
    const names = new Set(cols.map((c) => String(c?.name || '').trim()));
    if (!names.has('matched_task_id')) {
      db.exec('ALTER TABLE render_detected_files ADD COLUMN matched_task_id INTEGER');
    }
    if (!names.has('matched_expected_render_name')) {
      db.exec("ALTER TABLE render_detected_files ADD COLUMN matched_expected_render_name TEXT NOT NULL DEFAULT ''");
    }
    db.exec(`
      UPDATE render_detected_files
      SET matched_expected_render_name = ''
      WHERE matched_expected_render_name IS NULL;
      CREATE INDEX IF NOT EXISTS idx_render_detected_files_matched_task_id
        ON render_detected_files(matched_task_id);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(25, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v25',
      message: 'Migration SQLite postprod v25 appliquee (liaison tache sur fichiers detectes)',
    });
  }

  const hasV26 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 26 LIMIT 1')
    .get();
  if (!hasV26) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL DEFAULT '',
        mode_default TEXT NOT NULL DEFAULT '',
        usage_mode TEXT NOT NULL DEFAULT 'other',
        referent_user_id INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(referent_user_id) REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projects_name
        ON projects(name);
      CREATE INDEX IF NOT EXISTS idx_projects_code
        ON projects(code);
      CREATE INDEX IF NOT EXISTS idx_projects_usage_mode
        ON projects(usage_mode);

      CREATE TABLE IF NOT EXISTS task_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        project_ref TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(task_id, project_ref),
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_projects_task_id
        ON task_projects(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_projects_project_ref
        ON task_projects(project_ref);

      CREATE TABLE IF NOT EXISTS task_resources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        resource_ref TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(task_id, resource_ref),
        FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_task_resources_task_id
        ON task_resources(task_id);
      CREATE INDEX IF NOT EXISTS idx_task_resources_resource_ref
        ON task_resources(resource_ref);
    `);

    const rows = db.prepare(`
      SELECT id, project_refs_json, resource_refs_json, created_at
      FROM tasks
      ORDER BY id ASC
    `).all();
    if (Array.isArray(rows) && rows.length > 0) {
      const insertTaskProjectRef = db.prepare(`
        INSERT OR IGNORE INTO task_projects(task_id, project_ref, created_at)
        VALUES (?, ?, ?)
      `);
      const insertTaskResourceRef = db.prepare(`
        INSERT OR IGNORE INTO task_resources(task_id, resource_ref, created_at)
        VALUES (?, ?, ?)
      `);
      const insertProjectStub = db.prepare(`
        INSERT OR IGNORE INTO projects(
          id,
          code,
          name,
          mode_default,
          usage_mode,
          referent_user_id,
          created_at,
          updated_at
        )
        VALUES (?, '', ?, '', 'other', NULL, ?, ?)
      `);
      const tx = db.transaction((items) => {
        const now = nowIso();
        for (const row of items) {
          const taskId = Number(row?.id || 0);
          if (!Number.isFinite(taskId) || taskId <= 0) continue;
          const createdAt = parseIsoDateOrNull(row?.created_at) || now;
          const projectRefs = parseTaskRefsJson(row?.project_refs_json);
          const resourceRefs = parseTaskRefsJson(row?.resource_refs_json);
          for (const projectRefRaw of projectRefs) {
            const projectRef = sanitizeProjectRef(projectRefRaw);
            if (!projectRef) continue;
            insertTaskProjectRef.run(taskId, projectRef, createdAt);
            insertProjectStub.run(projectRef, projectRef, createdAt, now);
          }
          for (const resourceRefRaw of resourceRefs) {
            const resourceRef = sanitizeTaskRefForStorage(resourceRefRaw);
            if (!resourceRef) continue;
            insertTaskResourceRef.run(taskId, resourceRef, createdAt);
          }
        }
      });
      tx(rows);
    }

    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(26, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v26',
      message: 'Migration SQLite postprod v26 appliquee (projects + task_projects + task_resources)',
    });
  }

  const hasV27 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 27 LIMIT 1')
    .get();
  if (!hasV27) {
    const cols = db.prepare('PRAGMA table_info(render_jobs)').all();
    const names = new Set(cols.map((c) => String(c?.name || '').trim()));
    if (!names.has('review_status')) {
      db.exec("ALTER TABLE render_jobs ADD COLUMN review_status TEXT NOT NULL DEFAULT 'to_validate'");
    }
    db.exec(`
      UPDATE render_jobs
      SET review_status = CASE
        WHEN status = 'Canceled' THEN 'canceled'
        WHEN status = 'Failed' THEN 'to_modify'
        WHEN status = 'Done' AND validated_by_user_id IS NOT NULL THEN 'validated'
        ELSE 'to_validate'
      END
      WHERE review_status IS NULL
        OR TRIM(review_status) = ''
        OR review_status NOT IN ('to_validate', 'validated', 'to_modify', 'canceled');

      CREATE INDEX IF NOT EXISTS idx_render_jobs_review_status
        ON render_jobs(review_status);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(27, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v27',
      message: 'Migration SQLite postprod v27 appliquee (review status des rendus)',
    });
  }

  const hasV28 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 28 LIMIT 1')
    .get();
  if (!hasV28) {
    const cols = db.prepare('PRAGMA table_info(tasks)').all();
    const names = new Set(cols.map((c) => String(c?.name || '').trim()));
    if (!names.has('auto_render_config_json')) {
      db.exec("ALTER TABLE tasks ADD COLUMN auto_render_config_json TEXT NOT NULL DEFAULT '{}'");
    }
    db.exec(`
      UPDATE tasks
      SET auto_render_config_json = '{}'
      WHERE auto_render_config_json IS NULL
        OR TRIM(auto_render_config_json) = '';
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(28, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v28',
      message: 'Migration SQLite postprod v28 appliquee (config rendu auto des taches)',
    });
  }

  const hasV29 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 29 LIMIT 1')
    .get();
  if (!hasV29) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS render_forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        project_name TEXT NOT NULL DEFAULT '',
        template_name TEXT NOT NULL DEFAULT '',
        map_name TEXT NOT NULL DEFAULT '',
        sequence_name TEXT NOT NULL DEFAULT '',
        output_profile TEXT NOT NULL DEFAULT '',
        preset_name TEXT NOT NULL DEFAULT '',
        mode_default TEXT NOT NULL DEFAULT 'edit',
        is_active INTEGER NOT NULL DEFAULT 1,
        layout_json TEXT NOT NULL DEFAULT '{}',
        created_by_user_id INTEGER NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_render_forms_updated_at
        ON render_forms(updated_at DESC, id DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_render_forms_name
        ON render_forms(name);
      CREATE INDEX IF NOT EXISTS idx_render_forms_project_name
        ON render_forms(project_name);

      CREATE TABLE IF NOT EXISTS render_form_fields (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_id INTEGER NOT NULL,
        field_key TEXT NOT NULL,
        field_label TEXT NOT NULL DEFAULT '',
        source_path TEXT NOT NULL DEFAULT '',
        source_type TEXT NOT NULL DEFAULT 'preset_property',
        input_kind TEXT NOT NULL DEFAULT 'text',
        value_type TEXT NOT NULL DEFAULT 'string',
        group_name TEXT NOT NULL DEFAULT '',
        payload_key TEXT NOT NULL DEFAULT '',
        placeholder TEXT NOT NULL DEFAULT '',
        help_text TEXT NOT NULL DEFAULT '',
        options_json TEXT NOT NULL DEFAULT '[]',
        validation_json TEXT NOT NULL DEFAULT '{}',
        default_value_json TEXT NOT NULL DEFAULT 'null',
        is_required INTEGER NOT NULL DEFAULT 0,
        is_visible INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(form_id) REFERENCES render_forms(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uq_render_form_fields_form_key
        ON render_form_fields(form_id, field_key);
      CREATE INDEX IF NOT EXISTS idx_render_form_fields_form_sort
        ON render_form_fields(form_id, sort_order ASC, id ASC);
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(29, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v29',
      message: 'Migration SQLite postprod v29 appliquee (render_forms + render_form_fields)',
    });
  }

  const hasV30 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 30 LIMIT 1')
    .get();
  if (!hasV30) {
    const roleCols = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames = new Set(roleCols.map((c) => String(c?.name || '').trim()));
    if (!roleColNames.has('can_manage_forms')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_manage_forms INTEGER NOT NULL DEFAULT 0");
    }
    db.exec(`
      UPDATE roles
      SET can_manage_forms = CASE
        WHEN key IN ('Maintenance', 'Responsable Fabrication', 'Integrateur') THEN 1
        ELSE 0
      END
      WHERE is_system = 1;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(30, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v30',
      message: 'Migration SQLite postprod v30 appliquee (permission can_manage_forms)',
    });
  }

  const hasV31 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 31 LIMIT 1')
    .get();
  if (!hasV31) {
    const prefsCols = db.prepare('PRAGMA table_info(user_preferences)').all();
    const prefsColNames = new Set(prefsCols.map((c) => String(c?.name || '').trim()));
    if (!prefsColNames.has('language')) {
      db.exec("ALTER TABLE user_preferences ADD COLUMN language TEXT NOT NULL DEFAULT 'fr'");
    }
    db.exec(`
      UPDATE user_preferences
      SET language = 'fr'
      WHERE language IS NULL OR TRIM(language) = '';
      UPDATE user_preferences
      SET language = LOWER(TRIM(language));
      UPDATE user_preferences
      SET language = 'fr'
      WHERE language NOT IN ('fr', 'en');
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(31, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v31',
      message: 'Migration SQLite postprod v31 appliquee (langue utilisateur)',
    });
  }

  const hasV32 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 32 LIMIT 1')
    .get();
  if (!hasV32) {
    const roleCols = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames = new Set(roleCols.map((c) => String(c?.name || '').trim()));
    if (!roleColNames.has('can_ban_users')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_ban_users INTEGER NOT NULL DEFAULT 0");
    }
    if (!roleColNames.has('can_manage_project_permissions')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_manage_project_permissions INTEGER NOT NULL DEFAULT 0");
    }
    db.exec(`
      UPDATE roles
      SET
        can_ban_users = CASE
          WHEN key IN ('Maintenance', 'Responsable Fabrication', 'Integrateur') THEN 1
          ELSE 0
        END,
        can_manage_project_permissions = CASE
          WHEN key IN ('Maintenance', 'Responsable Fabrication', 'Integrateur') THEN 1
          ELSE 0
        END
      WHERE is_system = 1;
      UPDATE roles
      SET can_ban_users = 0
      WHERE can_manage_users <> 1;
      UPDATE roles
      SET can_manage_project_permissions = 0
      WHERE can_manage_users <> 1;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(32, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v32',
      message: 'Migration SQLite postprod v32 appliquee (permissions ban + droits projet)',
    });
  }

  const hasV33 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 33 LIMIT 1')
    .get();
  if (!hasV33) {
    const roleCols = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames = new Set(roleCols.map((c) => String(c?.name || '').trim()));
    if (!roleColNames.has('can_manage_machines')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_manage_machines INTEGER NOT NULL DEFAULT 0");
    }
    db.exec(`
      UPDATE roles
      SET can_manage_machines = CASE
        WHEN key IN ('Maintenance', 'Responsable Fabrication', 'Integrateur') THEN 1
        ELSE 0
      END
      WHERE is_system = 1;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(33, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v33',
      message: 'Migration SQLite postprod v33 appliquee (permission can_manage_machines)',
    });
  }

  const hasV34 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 34 LIMIT 1')
    .get();
  if (!hasV34) {
    const roleCols = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames = new Set(roleCols.map((c) => String(c?.name || '').trim()));
    if (!roleColNames.has('can_launch_projects')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_launch_projects INTEGER NOT NULL DEFAULT 1");
    }
    db.exec(`
      UPDATE roles
      SET can_launch_projects = CASE
        WHEN key IN ('Maintenance', 'Responsable Fabrication', 'Integrateur', 'Operateur') THEN 1
        WHEN key IN ('Graphiste', 'Journaliste') THEN 0
        ELSE can_launch_projects
      END
      WHERE is_system = 1;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(34, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v34',
      message: 'Migration SQLite postprod v34 appliquee (permission can_launch_projects)',
    });
  }

  const hasV35 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 35 LIMIT 1')
    .get();
  if (!hasV35) {
    const userCols = db.prepare('PRAGMA table_info(users)').all();
    const userColNames = new Set(userCols.map((c) => String(c?.name || '').trim()));
    if (!userColNames.has('email_secondary')) {
      db.exec("ALTER TABLE users ADD COLUMN email_secondary TEXT NOT NULL DEFAULT ''");
    }
    db.exec(`
      UPDATE users
      SET email_secondary = ''
      WHERE email_secondary IS NULL;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(35, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v35',
      message: 'Migration SQLite postprod v35 appliquee (email secondaire utilisateur)',
    });
  }

  const hasV36 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 36 LIMIT 1')
    .get();
  if (!hasV36) {
    const renderFormCols = db.prepare('PRAGMA table_info(render_forms)').all();
    const renderFormColNames = new Set(renderFormCols.map((c) => String(c?.name || '').trim()));
    if (!renderFormColNames.has('map_name')) {
      db.exec("ALTER TABLE render_forms ADD COLUMN map_name TEXT NOT NULL DEFAULT ''");
    }
    if (!renderFormColNames.has('sequence_name')) {
      db.exec("ALTER TABLE render_forms ADD COLUMN sequence_name TEXT NOT NULL DEFAULT ''");
    }
    if (!renderFormColNames.has('output_profile')) {
      db.exec("ALTER TABLE render_forms ADD COLUMN output_profile TEXT NOT NULL DEFAULT ''");
    }
    db.exec(`
      UPDATE render_forms
      SET
        map_name = COALESCE(map_name, ''),
        sequence_name = COALESCE(sequence_name, ''),
        output_profile = COALESCE(output_profile, '')
      WHERE map_name IS NULL
        OR sequence_name IS NULL
        OR output_profile IS NULL;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(36, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v36',
      message: 'Migration SQLite postprod v36 appliquee (render_forms map/sequence/outputProfile)',
    });
  }

  const hasV37 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 37 LIMIT 1')
    .get();
  if (!hasV37) {
    const roleCols = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames = new Set(roleCols.map((c) => String(c?.name || '').trim()));
    if (!roleColNames.has('can_use_live_mode')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_use_live_mode INTEGER NOT NULL DEFAULT 1");
    }
    if (!roleColNames.has('can_use_postprod_mode')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_use_postprod_mode INTEGER NOT NULL DEFAULT 1");
    }
    db.exec(`
      UPDATE roles
      SET
        can_use_live_mode = CASE
          WHEN key IN ('Graphiste', 'Journaliste') THEN 0
          ELSE 1
        END,
        can_use_postprod_mode = 1
      WHERE is_system = 1;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(37, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v37',
      message: 'Migration SQLite postprod v37 appliquee (permissions mode live/rendu)',
    });
  }

  const hasV38 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 38 LIMIT 1')
    .get();
  if (!hasV38) {
    const roleCols = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames = new Set(roleCols.map((c) => String(c?.name || '').trim()));
    if (!roleColNames.has('can_view_resources')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_view_resources INTEGER NOT NULL DEFAULT 1");
    }
    if (!roleColNames.has('can_create_tasks')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_create_tasks INTEGER NOT NULL DEFAULT 1");
    }
    if (!roleColNames.has('can_edit_projects')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_edit_projects INTEGER NOT NULL DEFAULT 1");
    }
    if (!roleColNames.has('can_manage_layouts')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_manage_layouts INTEGER NOT NULL DEFAULT 1");
    }
    db.exec(`
      UPDATE roles
      SET
        can_view_resources = CASE
          WHEN key IN ('Maintenance', 'Responsable Fabrication', 'Integrateur', 'Operateur', 'Graphiste', 'Journaliste') THEN 1
          ELSE CASE WHEN can_use_live_mode = 1 OR can_use_postprod_mode = 1 THEN 1 ELSE 0 END
        END,
        can_create_tasks = CASE
          WHEN key IN ('Maintenance', 'Responsable Fabrication', 'Integrateur', 'Operateur', 'Graphiste', 'Journaliste') THEN 1
          ELSE CASE WHEN can_launch_renders = 1 THEN 1 ELSE 0 END
        END,
        can_edit_projects = CASE
          WHEN key IN ('Maintenance', 'Responsable Fabrication', 'Integrateur', 'Operateur') THEN 1
          WHEN key IN ('Graphiste', 'Journaliste') THEN 0
          ELSE CASE WHEN can_launch_projects = 1 THEN 1 ELSE 0 END
        END,
        can_manage_layouts = CASE
          WHEN key IN ('Maintenance', 'Responsable Fabrication', 'Integrateur', 'Operateur') THEN 1
          WHEN key IN ('Graphiste', 'Journaliste') THEN 0
          ELSE CASE WHEN can_use_live_mode = 1 THEN 1 ELSE 0 END
        END
      WHERE is_system = 1;

      UPDATE roles
      SET can_manage_layouts = 0
      WHERE can_use_live_mode <> 1;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(38, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v38',
      message: 'Migration SQLite postprod v38 appliquee (permissions ressources/taches/projets/layouts)',
    });
  }

  ensureDefaultRoles(db, logLine);
}

function createStatements(db) {
  return {
    countUsers: db.prepare('SELECT COUNT(*) AS n FROM users'),
    findUserByPublicId: db.prepare(`
      SELECT id, public_id
      FROM users
      WHERE public_id = ?
      LIMIT 1
    `),
    findUserByUsername: db.prepare(`
      SELECT
        u.id,
        u.public_id,
        u.username,
        u.password_hash,
        u.role,
        u.is_active,
        u.display_name,
        u.first_name,
        u.last_name,
        u.email,
        u.email_secondary,
        u.mobile_phone,
        u.office_phone,
        u.phone,
        u.employment_type,
        u.user_note,
        u.avatar_path,
        u.must_change_password,
        u.failed_login_count,
        u.locked_until,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        COALESCE(up.timezone, '') AS timezone,
        COALESCE(up.language, 'fr') AS language,
        COALESCE(up.notification_preferences_json, '{}') AS notification_preferences_json
      FROM users u
      LEFT JOIN user_preferences up ON up.user_id = u.id
      WHERE u.username = ?
      LIMIT 1
    `),
    findUserIdsByDisplayName: db.prepare(`
      SELECT u.id
      FROM users u
      WHERE LOWER(TRIM(u.display_name)) = LOWER(TRIM(?))
      ORDER BY u.id ASC
      LIMIT 2
    `),
    findUserIdsByEmail: db.prepare(`
      SELECT u.id
      FROM users u
      WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?))
      ORDER BY u.id ASC
      LIMIT 2
    `),
    findUserById: db.prepare(`
      SELECT
        u.id,
        u.public_id,
        u.username,
        u.password_hash,
        u.role,
        u.is_active,
        u.display_name,
        u.first_name,
        u.last_name,
        u.email,
        u.email_secondary,
        u.mobile_phone,
        u.office_phone,
        u.phone,
        u.employment_type,
        u.user_note,
        u.avatar_path,
        u.must_change_password,
        u.failed_login_count,
        u.locked_until,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        COALESCE(up.timezone, '') AS timezone,
        COALESCE(up.language, 'fr') AS language,
        COALESCE(up.notification_preferences_json, '{}') AS notification_preferences_json
      FROM users u
      LEFT JOIN user_preferences up ON up.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `),
    listUsers: db.prepare(`
      SELECT
        u.id,
        u.public_id,
        u.username,
        u.role,
        u.is_active,
        u.display_name,
        u.first_name,
        u.last_name,
        u.email,
        u.email_secondary,
        u.mobile_phone,
        u.office_phone,
        u.phone,
        u.employment_type,
        u.user_note,
        u.avatar_path,
        u.must_change_password,
        u.failed_login_count,
        u.locked_until,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        COALESCE(up.timezone, '') AS timezone,
        COALESCE(up.language, 'fr') AS language,
        COALESCE(up.notification_preferences_json, '{}') AS notification_preferences_json
      FROM users u
      LEFT JOIN user_preferences up ON up.user_id = u.id
      ORDER BY u.username ASC
    `),
    insertUser: db.prepare(`
      INSERT INTO users(
        public_id,
        username,
        password_hash,
        role,
        is_active,
        display_name,
        first_name,
        last_name,
        email,
        email_secondary,
        mobile_phone,
        office_phone,
        phone,
        employment_type,
        user_note,
        avatar_path,
        must_change_password,
        failed_login_count,
        locked_until,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateUserBasics: db.prepare(`
      UPDATE users
      SET
        username = ?,
        role = ?,
        is_active = ?,
        display_name = ?,
        first_name = ?,
        last_name = ?,
        email = ?,
        email_secondary = ?,
        mobile_phone = ?,
        office_phone = ?,
        phone = ?,
        employment_type = ?,
        user_note = ?,
        avatar_path = ?,
        updated_at = ?
      WHERE id = ?
    `),
    updateUserPassword: db.prepare(`
      UPDATE users
      SET
        password_hash = ?,
        must_change_password = ?,
        failed_login_count = 0,
        locked_until = NULL,
        updated_at = ?
      WHERE id = ?
    `),
    updateUserLastLogin: db.prepare(`
      UPDATE users
      SET
        last_login_at = ?,
        failed_login_count = 0,
        locked_until = NULL,
        updated_at = ?
      WHERE id = ?
    `),
    updateUserSecurityFlags: db.prepare(`
      UPDATE users
      SET
        must_change_password = ?,
        failed_login_count = ?,
        locked_until = ?,
        updated_at = ?
      WHERE id = ?
    `),
    incrementUserFailedLogin: db.prepare(`
      UPDATE users
      SET
        failed_login_count = ?,
        locked_until = ?,
        updated_at = ?
      WHERE id = ?
    `),
    findUserPreferencesByUserId: db.prepare(`
      SELECT user_id, timezone, language, notification_preferences_json, created_at, updated_at
      FROM user_preferences
      WHERE user_id = ?
      LIMIT 1
    `),
    upsertUserPreferences: db.prepare(`
      INSERT INTO user_preferences(user_id, timezone, language, notification_preferences_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        timezone = excluded.timezone,
        language = excluded.language,
        notification_preferences_json = excluded.notification_preferences_json,
        updated_at = excluded.updated_at
    `),
    deleteUserById: db.prepare(`
      DELETE FROM users
      WHERE id = ?
    `),
    countActiveMaintenanceExcluding: db.prepare(`
      SELECT COUNT(*) AS n
      FROM users
      WHERE role = 'Maintenance'
        AND is_active = 1
        AND id <> ?
    `),
    insertSession: db.prepare(`
      INSERT INTO sessions(token, user_id, created_at, expires_at, last_seen_at, ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `),
    findActiveSessionByToken: db.prepare(`
      SELECT
        s.id AS session_id,
        s.token,
        s.user_id,
        s.created_at,
        s.expires_at,
        s.last_seen_at,
        u.id AS user_id2,
        u.username,
        u.role,
        u.is_active,
        u.display_name,
        u.first_name,
        u.last_name,
        u.email,
        u.email_secondary,
        u.mobile_phone,
        u.office_phone,
        u.phone,
        u.employment_type,
        u.user_note,
        u.avatar_path,
        u.must_change_password,
        u.failed_login_count,
        u.locked_until,
        u.updated_at AS user_updated_at,
        u.created_at AS user_created_at,
        u.last_login_at,
        COALESCE(up.timezone, '') AS timezone,
        COALESCE(up.language, 'fr') AS language,
        COALESCE(up.notification_preferences_json, '{}') AS notification_preferences_json
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN user_preferences up ON up.user_id = u.id
      WHERE s.token = ?
        AND s.revoked_at IS NULL
        AND s.expires_at > ?
        AND u.is_active = 1
      LIMIT 1
    `),
    touchSession: db.prepare(`
      UPDATE sessions
      SET last_seen_at = ?
      WHERE token = ?
        AND revoked_at IS NULL
    `),
    revokeSession: db.prepare(`
      UPDATE sessions
      SET revoked_at = ?, last_seen_at = ?
      WHERE token = ?
        AND revoked_at IS NULL
    `),
    revokeSessionsByUserId: db.prepare(`
      UPDATE sessions
      SET revoked_at = ?, last_seen_at = ?
      WHERE user_id = ?
        AND revoked_at IS NULL
    `),
    insertAudit: db.prepare(`
      INSERT INTO audit_log(actor_user_id, action, scope_type, scope_id, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    listAuditByActorUserId: db.prepare(`
      SELECT
        id,
        actor_user_id,
        action,
        scope_type,
        scope_id,
        payload_json,
        created_at
      FROM audit_log
      WHERE actor_user_id = ?
        AND (? = '' OR created_at >= ?)
        AND (? = '' OR created_at <= ?)
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `),
    listAuditEntries: db.prepare(`
      SELECT
        a.id,
        a.actor_user_id,
        COALESCE(u.username, '') AS actor_username,
        a.action,
        a.scope_type,
        a.scope_id,
        a.payload_json,
        a.created_at
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE (? IS NULL OR a.actor_user_id = ?)
        AND (? = '' OR a.action = ?)
        AND (? = '' OR a.scope_type = ?)
        AND (? = '' OR a.created_at >= ?)
        AND (? = '' OR a.created_at <= ?)
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ?
      OFFSET ?
    `),
    countAuditEntries: db.prepare(`
      SELECT COUNT(*) AS n
      FROM audit_log a
      WHERE (? IS NULL OR a.actor_user_id = ?)
        AND (? = '' OR a.action = ?)
        AND (? = '' OR a.scope_type = ?)
        AND (? = '' OR a.created_at >= ?)
        AND (? = '' OR a.created_at <= ?)
    `),
    countAuditEntriesByAction: db.prepare(`
      SELECT COUNT(*) AS n
      FROM audit_log
      WHERE action = ?
    `),
    deleteAuditEntriesByActionBefore: db.prepare(`
      DELETE FROM audit_log
      WHERE action = ?
        AND created_at < ?
    `),
    countResourcesIndex: db.prepare(`
      SELECT COUNT(*) AS n
      FROM resources_index
    `),
    listResourceIndexTaskRefs: db.prepare(`
      SELECT
        code,
        title
      FROM resources_index
      ORDER BY title ASC, code ASC
    `),
    listResourcesIndex: db.prepare(`
      SELECT
        id,
        code,
        type,
        title,
        source_path,
        metadata_json,
        created_at,
        updated_at
      FROM resources_index
      ORDER BY title ASC, code ASC
    `),
    findResourceIndexByCode: db.prepare(`
      SELECT
        id,
        code,
        type,
        title,
        source_path,
        metadata_json,
        created_at,
        updated_at
      FROM resources_index
      WHERE code = ?
      LIMIT 1
    `),
    findResourceIndexByRef: db.prepare(`
      SELECT
        id,
        code,
        type,
        title,
        source_path,
        metadata_json,
        created_at,
        updated_at
      FROM resources_index
      WHERE LOWER(code) = LOWER(?)
         OR LOWER(title) = LOWER(?)
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `),
    upsertResourceIndexByCode: db.prepare(`
      INSERT INTO resources_index(
        code,
        type,
        title,
        source_path,
        metadata_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(code) DO UPDATE SET
        type = excluded.type,
        title = excluded.title,
        source_path = excluded.source_path,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at
    `),
    listProjectsSql: db.prepare(`
      SELECT
        id,
        code,
        name,
        mode_default,
        usage_mode,
        referent_user_id,
        created_at,
        updated_at
      FROM projects
      ORDER BY name ASC, id ASC
    `),
    upsertProjectById: db.prepare(`
      INSERT INTO projects(
        id,
        code,
        name,
        mode_default,
        usage_mode,
        referent_user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        code = excluded.code,
        name = excluded.name,
        mode_default = excluded.mode_default,
        usage_mode = excluded.usage_mode,
        referent_user_id = excluded.referent_user_id,
        updated_at = excluded.updated_at
    `),
    listTaskProjectRefsByTaskId: db.prepare(`
      SELECT project_ref
      FROM task_projects
      WHERE task_id = ?
      ORDER BY id ASC
    `),
    listTaskResourceRefsByTaskId: db.prepare(`
      SELECT resource_ref
      FROM task_resources
      WHERE task_id = ?
      ORDER BY id ASC
    `),
    deleteTaskProjectRefsByTaskId: db.prepare(`
      DELETE FROM task_projects
      WHERE task_id = ?
    `),
    deleteTaskResourceRefsByTaskId: db.prepare(`
      DELETE FROM task_resources
      WHERE task_id = ?
    `),
    insertTaskProjectRef: db.prepare(`
      INSERT OR IGNORE INTO task_projects(task_id, project_ref, created_at)
      VALUES (?, ?, ?)
    `),
    insertTaskResourceRef: db.prepare(`
      INSERT OR IGNORE INTO task_resources(task_id, resource_ref, created_at)
      VALUES (?, ?, ?)
    `),
    listTasks: db.prepare(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.request_type,
        t.expected_render_count,
        t.expected_render_names_json,
        t.auto_render_config_json,
        t.assignee_user_id,
        t.project_refs_json,
        t.resource_refs_json,
        t.reporter_user_id,
        t.due_at,
        t.submitted_at,
        t.validated_at,
        t.rejected_at,
        t.started_at,
        t.finished_at,
        t.created_at,
        t.updated_at,
        au.display_name AS assignee_display_name,
        au.username AS assignee_username,
        ru.display_name AS reporter_display_name,
        ru.username AS reporter_username
      FROM tasks t
      LEFT JOIN users au ON au.id = t.assignee_user_id
      LEFT JOIN users ru ON ru.id = t.reporter_user_id
      ORDER BY t.updated_at DESC, t.id DESC
    `),
    findTaskById: db.prepare(`
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.request_type,
        t.expected_render_count,
        t.expected_render_names_json,
        t.auto_render_config_json,
        t.assignee_user_id,
        t.project_refs_json,
        t.resource_refs_json,
        t.reporter_user_id,
        t.due_at,
        t.submitted_at,
        t.validated_at,
        t.rejected_at,
        t.started_at,
        t.finished_at,
        t.created_at,
        t.updated_at,
        au.display_name AS assignee_display_name,
        au.username AS assignee_username,
        ru.display_name AS reporter_display_name,
        ru.username AS reporter_username
      FROM tasks t
      LEFT JOIN users au ON au.id = t.assignee_user_id
      LEFT JOIN users ru ON ru.id = t.reporter_user_id
      WHERE t.id = ?
      LIMIT 1
    `),
    insertTask: db.prepare(`
      INSERT INTO tasks(
        title,
        description,
        status,
        priority,
        request_type,
        expected_render_count,
        expected_render_names_json,
        auto_render_config_json,
        assignee_user_id,
        project_refs_json,
        resource_refs_json,
        reporter_user_id,
        due_at,
        submitted_at,
        validated_at,
        rejected_at,
        started_at,
        finished_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateTask: db.prepare(`
      UPDATE tasks
      SET
        title = ?,
        description = ?,
        priority = ?,
        request_type = ?,
        expected_render_count = ?,
        expected_render_names_json = ?,
        auto_render_config_json = ?,
        assignee_user_id = ?,
        project_refs_json = ?,
        resource_refs_json = ?,
        due_at = ?,
        updated_at = ?
      WHERE id = ?
    `),
    deleteTaskById: db.prepare(`
      DELETE FROM tasks
      WHERE id = ?
    `),
    updateTaskTransition: db.prepare(`
      UPDATE tasks
      SET
        status = ?,
        submitted_at = ?,
        validated_at = ?,
        rejected_at = ?,
        started_at = ?,
        finished_at = ?,
        updated_at = ?
      WHERE id = ?
    `),
    insertTaskTransition: db.prepare(`
      INSERT INTO task_transitions(task_id, from_status, to_status, by_user_id, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    listTaskTransitionsByTaskId: db.prepare(`
      SELECT
        tr.id,
        tr.task_id,
        tr.from_status,
        tr.to_status,
        tr.by_user_id,
        tr.comment,
        tr.created_at,
        u.username AS by_username
      FROM task_transitions tr
      LEFT JOIN users u ON u.id = tr.by_user_id
      WHERE tr.task_id = ?
      ORDER BY tr.created_at ASC, tr.id ASC
    `),
    listRenderTemplates: db.prepare(`
      SELECT
        rt.id,
        rt.name,
        rt.project_name,
        rt.template_name,
        rt.map_name,
        rt.sequence_name,
        rt.output_profile,
        rt.allowed_roles_json,
        rt.execution_json,
        rt.payload_json,
        rt.created_by_user_id,
        rt.created_at,
        rt.updated_at,
        u.username AS created_by_username
      FROM render_templates rt
      LEFT JOIN users u ON u.id = rt.created_by_user_id
      ORDER BY rt.updated_at DESC, rt.id DESC
    `),
    findRenderTemplateByName: db.prepare(`
      SELECT
        rt.id,
        rt.name,
        rt.project_name,
        rt.template_name,
        rt.map_name,
        rt.sequence_name,
        rt.output_profile,
        rt.allowed_roles_json,
        rt.execution_json,
        rt.payload_json,
        rt.created_by_user_id,
        rt.created_at,
        rt.updated_at,
        u.username AS created_by_username
      FROM render_templates rt
      LEFT JOIN users u ON u.id = rt.created_by_user_id
      WHERE rt.name = ?
      LIMIT 1
    `),
    findRenderTemplateByNameExcludingId: db.prepare(`
      SELECT
        rt.id,
        rt.name,
        rt.project_name,
        rt.template_name,
        rt.map_name,
        rt.sequence_name,
        rt.output_profile,
        rt.allowed_roles_json,
        rt.execution_json,
        rt.payload_json,
        rt.created_by_user_id,
        rt.created_at,
        rt.updated_at,
        u.username AS created_by_username
      FROM render_templates rt
      LEFT JOIN users u ON u.id = rt.created_by_user_id
      WHERE rt.name = ?
        AND rt.id <> ?
      LIMIT 1
    `),
    findRenderTemplateById: db.prepare(`
      SELECT
        rt.id,
        rt.name,
        rt.project_name,
        rt.template_name,
        rt.map_name,
        rt.sequence_name,
        rt.output_profile,
        rt.allowed_roles_json,
        rt.execution_json,
        rt.payload_json,
        rt.created_by_user_id,
        rt.created_at,
        rt.updated_at,
        u.username AS created_by_username
      FROM render_templates rt
      LEFT JOIN users u ON u.id = rt.created_by_user_id
      WHERE rt.id = ?
      LIMIT 1
    `),
    insertRenderTemplate: db.prepare(`
      INSERT INTO render_templates(
        name,
        project_name,
        template_name,
        map_name,
        sequence_name,
        output_profile,
        allowed_roles_json,
        execution_json,
        payload_json,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateRenderTemplateById: db.prepare(`
      UPDATE render_templates
      SET
        name = ?,
        project_name = ?,
        template_name = ?,
        map_name = ?,
        sequence_name = ?,
        output_profile = ?,
        allowed_roles_json = ?,
        execution_json = ?,
        payload_json = ?,
        updated_at = ?
      WHERE id = ?
    `),
    deleteRenderTemplateById: db.prepare(`
      DELETE FROM render_templates
      WHERE id = ?
    `),
    listRenderForms: db.prepare(`
      SELECT
        rf.id,
        rf.name,
        rf.project_name,
        rf.template_name,
        rf.map_name,
        rf.sequence_name,
        rf.output_profile,
        rf.preset_name,
        rf.mode_default,
        rf.is_active,
        rf.layout_json,
        rf.created_by_user_id,
        rf.created_at,
        rf.updated_at,
        u.username AS created_by_username,
        (
          SELECT COUNT(*)
          FROM render_form_fields rff
          WHERE rff.form_id = rf.id
        ) AS fields_count
      FROM render_forms rf
      LEFT JOIN users u ON u.id = rf.created_by_user_id
      ORDER BY rf.updated_at DESC, rf.id DESC
    `),
    findRenderFormById: db.prepare(`
      SELECT
        rf.id,
        rf.name,
        rf.project_name,
        rf.template_name,
        rf.map_name,
        rf.sequence_name,
        rf.output_profile,
        rf.preset_name,
        rf.mode_default,
        rf.is_active,
        rf.layout_json,
        rf.created_by_user_id,
        rf.created_at,
        rf.updated_at,
        u.username AS created_by_username,
        (
          SELECT COUNT(*)
          FROM render_form_fields rff
          WHERE rff.form_id = rf.id
        ) AS fields_count
      FROM render_forms rf
      LEFT JOIN users u ON u.id = rf.created_by_user_id
      WHERE rf.id = ?
      LIMIT 1
    `),
    findRenderFormByName: db.prepare(`
      SELECT
        rf.id,
        rf.name,
        rf.project_name,
        rf.template_name,
        rf.map_name,
        rf.sequence_name,
        rf.output_profile,
        rf.preset_name,
        rf.mode_default,
        rf.is_active,
        rf.layout_json,
        rf.created_by_user_id,
        rf.created_at,
        rf.updated_at,
        u.username AS created_by_username,
        (
          SELECT COUNT(*)
          FROM render_form_fields rff
          WHERE rff.form_id = rf.id
        ) AS fields_count
      FROM render_forms rf
      LEFT JOIN users u ON u.id = rf.created_by_user_id
      WHERE rf.name = ?
      LIMIT 1
    `),
    findRenderFormByNameExcludingId: db.prepare(`
      SELECT
        rf.id,
        rf.name,
        rf.project_name,
        rf.template_name,
        rf.map_name,
        rf.sequence_name,
        rf.output_profile,
        rf.preset_name,
        rf.mode_default,
        rf.is_active,
        rf.layout_json,
        rf.created_by_user_id,
        rf.created_at,
        rf.updated_at,
        u.username AS created_by_username,
        (
          SELECT COUNT(*)
          FROM render_form_fields rff
          WHERE rff.form_id = rf.id
        ) AS fields_count
      FROM render_forms rf
      LEFT JOIN users u ON u.id = rf.created_by_user_id
      WHERE rf.name = ?
        AND rf.id <> ?
      LIMIT 1
    `),
    insertRenderForm: db.prepare(`
      INSERT INTO render_forms(
        name,
        project_name,
        template_name,
        map_name,
        sequence_name,
        output_profile,
        preset_name,
        mode_default,
        is_active,
        layout_json,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateRenderFormById: db.prepare(`
      UPDATE render_forms
      SET
        name = ?,
        project_name = ?,
        template_name = ?,
        map_name = ?,
        sequence_name = ?,
        output_profile = ?,
        preset_name = ?,
        mode_default = ?,
        is_active = ?,
        layout_json = ?,
        updated_at = ?
      WHERE id = ?
    `),
    deleteRenderFormById: db.prepare(`
      DELETE FROM render_forms
      WHERE id = ?
    `),
    listRenderFormFieldsByFormId: db.prepare(`
      SELECT
        rff.id,
        rff.form_id,
        rff.field_key,
        rff.field_label,
        rff.source_path,
        rff.source_type,
        rff.input_kind,
        rff.value_type,
        rff.group_name,
        rff.payload_key,
        rff.placeholder,
        rff.help_text,
        rff.options_json,
        rff.validation_json,
        rff.default_value_json,
        rff.is_required,
        rff.is_visible,
        rff.sort_order,
        rff.created_at,
        rff.updated_at
      FROM render_form_fields rff
      WHERE rff.form_id = ?
      ORDER BY rff.sort_order ASC, rff.id ASC
    `),
    deleteRenderFormFieldsByFormId: db.prepare(`
      DELETE FROM render_form_fields
      WHERE form_id = ?
    `),
    insertRenderFormField: db.prepare(`
      INSERT INTO render_form_fields(
        form_id,
        field_key,
        field_label,
        source_path,
        source_type,
        input_kind,
        value_type,
        group_name,
        payload_key,
        placeholder,
        help_text,
        options_json,
        validation_json,
        default_value_json,
        is_required,
        is_visible,
        sort_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    listRenderJobs: db.prepare(`
      SELECT
        r.id,
        r.project_name,
        r.template_name,
        r.payload_json,
        r.status,
        r.review_status,
        r.requested_by_user_id,
        r.validated_by_user_id,
        r.requires_validation,
        r.output_path,
        r.error_message,
        r.started_at,
        r.finished_at,
        r.assigned_worker_id,
        r.attempt_count,
        r.max_attempts,
        r.last_attempt_at,
        r.created_at,
        r.updated_at,
        req.username AS requested_by_username,
        val.username AS validated_by_username,
        rw.worker_key AS assigned_worker_key,
        rw.display_name AS assigned_worker_name
      FROM render_jobs r
      LEFT JOIN users req ON req.id = r.requested_by_user_id
      LEFT JOIN users val ON val.id = r.validated_by_user_id
      LEFT JOIN render_workers rw ON rw.id = r.assigned_worker_id
      ORDER BY r.updated_at DESC, r.id DESC
    `),
    findRenderJobById: db.prepare(`
      SELECT
        r.id,
        r.project_name,
        r.template_name,
        r.payload_json,
        r.status,
        r.review_status,
        r.requested_by_user_id,
        r.validated_by_user_id,
        r.requires_validation,
        r.output_path,
        r.error_message,
        r.started_at,
        r.finished_at,
        r.assigned_worker_id,
        r.attempt_count,
        r.max_attempts,
        r.last_attempt_at,
        r.created_at,
        r.updated_at,
        req.username AS requested_by_username,
        val.username AS validated_by_username,
        rw.worker_key AS assigned_worker_key,
        rw.display_name AS assigned_worker_name
      FROM render_jobs r
      LEFT JOIN users req ON req.id = r.requested_by_user_id
      LEFT JOIN users val ON val.id = r.validated_by_user_id
      LEFT JOIN render_workers rw ON rw.id = r.assigned_worker_id
      WHERE r.id = ?
      LIMIT 1
    `),
    insertRenderJob: db.prepare(`
      INSERT INTO render_jobs(
        project_name,
        template_name,
        payload_json,
        status,
        review_status,
        requested_by_user_id,
        validated_by_user_id,
        requires_validation,
        output_path,
        error_message,
        started_at,
        finished_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateRenderJobTransition: db.prepare(`
      UPDATE render_jobs
      SET
        status = ?,
        review_status = ?,
        validated_by_user_id = ?,
        output_path = ?,
        error_message = ?,
        started_at = ?,
        finished_at = ?,
        updated_at = ?
      WHERE id = ?
    `),
    insertRenderJobEvent: db.prepare(`
      INSERT INTO render_job_events(render_job_id, from_status, to_status, by_user_id, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    listRenderJobEventsByJobId: db.prepare(`
      SELECT
        ev.id,
        ev.render_job_id,
        ev.from_status,
        ev.to_status,
        ev.by_user_id,
        ev.comment,
        ev.created_at,
        u.username AS by_username
      FROM render_job_events ev
      LEFT JOIN users u ON u.id = ev.by_user_id
      WHERE ev.render_job_id = ?
      ORDER BY ev.created_at ASC, ev.id ASC
    `),
    findRenderDetectionPreferredActor: db.prepare(`
      SELECT id
      FROM users
      WHERE is_active = 1
      ORDER BY
        CASE WHEN role = 'Maintenance' THEN 0 ELSE 1 END ASC,
        id ASC
      LIMIT 1
    `),
    findRenderDetectionFallbackActor: db.prepare(`
      SELECT id
      FROM users
      ORDER BY
        CASE WHEN role = 'Maintenance' THEN 0 ELSE 1 END ASC,
        id ASC
      LIMIT 1
    `),
    findRenderDetectedFileBySignature: db.prepare(`
      SELECT
        id,
        file_signature,
        render_job_id,
        matched_task_id,
        matched_expected_render_name
      FROM render_detected_files
      WHERE file_signature = ?
      LIMIT 1
    `),
    countRenderDetectedFilesByTaskId: db.prepare(`
      SELECT COUNT(*) AS n
      FROM render_detected_files
      WHERE matched_task_id = ?
    `),
    insertRenderDetectedFile: db.prepare(`
      INSERT INTO render_detected_files(
        file_signature,
        source_dir,
        file_path,
        project_name,
        template_name,
        file_name,
        file_ext,
        file_size,
        file_mtime_at,
        render_job_id,
        matched_task_id,
        matched_expected_render_name,
        status,
        error_message,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    listRenderWorkers: db.prepare(`
      SELECT
        w.id,
        w.worker_key,
        w.display_name,
        w.capabilities_json,
        w.can_render,
        w.is_active,
        w.is_online,
        w.current_render_job_id,
        w.last_seen_at,
        w.created_at,
        w.updated_at,
        r.template_name AS current_render_template_name,
        r.project_name AS current_render_project_name,
        r.status AS current_render_status
      FROM render_workers w
      LEFT JOIN render_jobs r ON r.id = w.current_render_job_id
      ORDER BY w.worker_key ASC
    `),
    renderHealthSnapshot: db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM render_workers) AS workers_total,
        (SELECT COUNT(*) FROM render_workers WHERE is_online = 1) AS workers_online,
        (SELECT COUNT(*) FROM render_workers WHERE is_online = 1 AND is_active = 1 AND can_render = 1) AS workers_available,
        (SELECT COUNT(*) FROM render_jobs WHERE status = 'Queued') AS renders_queued,
        (SELECT COUNT(*) FROM render_jobs WHERE status = 'Running') AS renders_running,
        (SELECT COUNT(*) FROM render_jobs WHERE status = 'Failed') AS renders_failed,
        (SELECT COUNT(*) FROM render_jobs WHERE status = 'Done') AS renders_done
    `),
    findRenderDispatchPolicyById: db.prepare(`
      SELECT
        id,
        max_jobs,
        policy_json,
        updated_by_user_id,
        created_at,
        updated_at
      FROM render_dispatch_policy
      WHERE id = ?
      LIMIT 1
    `),
    upsertRenderDispatchPolicyById: db.prepare(`
      INSERT INTO render_dispatch_policy(
        id,
        max_jobs,
        policy_json,
        updated_by_user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        max_jobs = excluded.max_jobs,
        policy_json = excluded.policy_json,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = excluded.updated_at
    `),
    findRenderWorkerByKey: db.prepare(`
      SELECT
        w.id,
        w.worker_key,
        w.display_name,
        w.capabilities_json,
        w.can_render,
        w.is_active,
        w.is_online,
        w.current_render_job_id,
        w.last_seen_at,
        w.created_at,
        w.updated_at,
        r.template_name AS current_render_template_name,
        r.project_name AS current_render_project_name,
        r.status AS current_render_status
      FROM render_workers w
      LEFT JOIN render_jobs r ON r.id = w.current_render_job_id
      WHERE w.worker_key = ?
      LIMIT 1
    `),
    upsertRenderWorkerByKey: db.prepare(`
      INSERT INTO render_workers(
        worker_key,
        display_name,
        capabilities_json,
        can_render,
        is_active,
        is_online,
        current_render_job_id,
        last_seen_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)
      ON CONFLICT(worker_key) DO UPDATE SET
        display_name = excluded.display_name,
        capabilities_json = excluded.capabilities_json,
        can_render = excluded.can_render,
        is_active = excluded.is_active,
        is_online = excluded.is_online,
        last_seen_at = excluded.last_seen_at,
        updated_at = excluded.updated_at
    `),
    markStaleRenderWorkersOffline: db.prepare(`
      UPDATE render_workers
      SET
        is_online = 0,
        updated_at = ?
      WHERE is_online = 1
        AND (
          last_seen_at IS NULL
          OR last_seen_at < ?
        )
    `),
    listDispatchableRenderJobs: db.prepare(`
      SELECT
        id,
        project_name,
        payload_json,
        status,
        requires_validation,
        validated_by_user_id,
        created_at
      FROM render_jobs
      WHERE status = 'Queued'
        AND assigned_worker_id IS NULL
        AND (
          requires_validation = 0
          OR validated_by_user_id IS NOT NULL
        )
      ORDER BY created_at ASC, id ASC
      LIMIT ?
    `),
    listRunningRenderLoadByProject: db.prepare(`
      SELECT
        project_name,
        COUNT(*) AS n
      FROM render_jobs
      WHERE status = 'Running'
      GROUP BY project_name
    `),
    listStaleRunningRenderJobs: db.prepare(`
      SELECT
        r.id
      FROM render_jobs r
      INNER JOIN render_workers w ON w.id = r.assigned_worker_id
      WHERE r.status = 'Running'
        AND w.is_online = 1
        AND (
          w.last_seen_at IS NULL
          OR w.last_seen_at < ?
        )
      ORDER BY r.updated_at ASC, r.id ASC
    `),
    listAvailableRenderWorkers: db.prepare(`
      SELECT
        id,
        worker_key,
        display_name,
        capabilities_json
      FROM render_workers
      WHERE is_active = 1
        AND can_render = 1
        AND is_online = 1
        AND current_render_job_id IS NULL
        AND (
          last_seen_at IS NOT NULL
          AND last_seen_at >= ?
        )
      ORDER BY updated_at ASC, id ASC
      LIMIT ?
    `),
    requeueRenderJobForOfflineWorker: db.prepare(`
      UPDATE render_jobs
      SET
        status = 'Queued',
        review_status = 'to_validate',
        assigned_worker_id = NULL,
        started_at = NULL,
        finished_at = NULL,
        output_path = '',
        error_message = 'worker_offline_requeue',
        updated_at = ?
      WHERE id = ?
        AND status = 'Running'
    `),
    dispatchRenderJobToWorker: db.prepare(`
      UPDATE render_jobs
      SET
        status = 'Running',
        review_status = 'to_validate',
        assigned_worker_id = ?,
        attempt_count = CASE
          WHEN attempt_count IS NULL THEN 1
          ELSE attempt_count + 1
        END,
        last_attempt_at = ?,
        started_at = COALESCE(started_at, ?),
        finished_at = NULL,
        output_path = '',
        error_message = '',
        updated_at = ?
      WHERE id = ?
        AND status = 'Queued'
        AND assigned_worker_id IS NULL
    `),
    updateRenderJobOutputPath: db.prepare(`
      UPDATE render_jobs
      SET output_path = ?, updated_at = ?
      WHERE id = ?
    `),
    assignRenderJobToWorkerCurrent: db.prepare(`
      UPDATE render_workers
      SET
        current_render_job_id = ?,
        updated_at = ?
      WHERE id = ?
        AND is_active = 1
        AND can_render = 1
        AND is_online = 1
        AND current_render_job_id IS NULL
    `),
    clearRenderWorkerCurrentJobByRenderId: db.prepare(`
      UPDATE render_workers
      SET
        current_render_job_id = NULL,
        updated_at = ?
      WHERE current_render_job_id = ?
    `),
    clearRenderJobWorkerAssignment: db.prepare(`
      UPDATE render_jobs
      SET
        assigned_worker_id = NULL,
        updated_at = ?
      WHERE id = ?
    `),
    findProjectUserRole: db.prepare(`
      SELECT
        user_id,
        project_id,
        is_referent,
        can_validate,
        can_sync,
        can_launch_render,
        can_edit_data,
        created_at,
        updated_at
      FROM project_user_roles
      WHERE user_id = ?
        AND project_id = ?
      LIMIT 1
    `),
    listProjectUserRolesByUserId: db.prepare(`
      SELECT
        user_id,
        project_id,
        is_referent,
        can_validate,
        can_sync,
        can_launch_render,
        can_edit_data,
        created_at,
        updated_at
      FROM project_user_roles
      WHERE user_id = ?
      ORDER BY project_id ASC
    `),
    upsertProjectUserRole: db.prepare(`
      INSERT INTO project_user_roles(
        user_id,
        project_id,
        is_referent,
        can_validate,
        can_sync,
        can_launch_render,
        can_edit_data,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, project_id) DO UPDATE SET
        is_referent = excluded.is_referent,
        can_validate = excluded.can_validate,
        can_sync = excluded.can_sync,
        can_launch_render = excluded.can_launch_render,
        can_edit_data = excluded.can_edit_data,
        updated_at = excluded.updated_at
    `),
    clearProjectReferentAndSyncByProjectExcludingUser: db.prepare(`
      UPDATE project_user_roles
      SET
        is_referent = 0,
        can_sync = 0,
        updated_at = ?
      WHERE project_id = ?
        AND user_id <> ?
        AND (
          is_referent = 1
          OR can_sync = 1
        )
    `),
    listDataTablesByProjectId: db.prepare(`
      SELECT
        id,
        project_id,
        name,
        schema_json,
        created_at,
        updated_at
      FROM data_tables
      WHERE project_id = ?
      ORDER BY updated_at DESC, id DESC
    `),
    findDataTableById: db.prepare(`
      SELECT
        id,
        project_id,
        name,
        schema_json,
        created_at,
        updated_at
      FROM data_tables
      WHERE id = ?
      LIMIT 1
    `),
    findDataTableByProjectAndName: db.prepare(`
      SELECT
        id,
        project_id,
        name,
        schema_json,
        created_at,
        updated_at
      FROM data_tables
      WHERE project_id = ?
        AND name = ?
      LIMIT 1
    `),
    insertDataTable: db.prepare(`
      INSERT INTO data_tables(
        project_id,
        name,
        schema_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
    `),
    updateDataTableSchemaById: db.prepare(`
      UPDATE data_tables
      SET
        schema_json = ?,
        updated_at = ?
      WHERE id = ?
    `),
    upsertDataRowByTableAndKey: db.prepare(`
      INSERT INTO data_rows(
        table_id,
        row_key,
        payload_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(table_id, row_key) DO UPDATE SET
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `),
    findDataRowByTableAndKey: db.prepare(`
      SELECT
        id,
        table_id,
        row_key,
        payload_json,
        created_at,
        updated_at
      FROM data_rows
      WHERE table_id = ?
        AND row_key = ?
      LIMIT 1
    `),
    listDataRowsByTableId: db.prepare(`
      SELECT
        id,
        table_id,
        row_key,
        payload_json,
        created_at,
        updated_at
      FROM data_rows
      WHERE table_id = ?
      ORDER BY updated_at DESC, id DESC
    `),
    insertSyncEvent: db.prepare(`
      INSERT INTO sync_events(
        project_id,
        by_user_id,
        source,
        result,
        details_json,
        synced_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `),
    listSyncEventsByProjectId: db.prepare(`
      SELECT
        id,
        project_id,
        by_user_id,
        source,
        result,
        details_json,
        synced_at
      FROM sync_events
      WHERE project_id = ?
      ORDER BY synced_at DESC, id DESC
      LIMIT ?
    `),
    listRoles: db.prepare(`
      SELECT
        key,
        display_name,
        note,
        can_use_live_mode,
        can_use_postprod_mode,
        can_validate,
        can_sync_scenes,
        can_manage_users,
        can_manage_roles,
        can_manage_forms,
        can_manage_machines,
        can_ban_users,
        can_manage_project_permissions,
        can_launch_projects,
        can_launch_renders,
        can_view_resources,
        can_create_tasks,
        can_edit_projects,
        can_manage_layouts,
        manageable_roles_json,
        is_system,
        created_at,
        updated_at
      FROM roles
      ORDER BY is_system DESC, key ASC
    `),
    findRoleByKey: db.prepare(`
      SELECT
        key,
        display_name,
        note,
        can_use_live_mode,
        can_use_postprod_mode,
        can_validate,
        can_sync_scenes,
        can_manage_users,
        can_manage_roles,
        can_manage_forms,
        can_manage_machines,
        can_ban_users,
        can_manage_project_permissions,
        can_launch_projects,
        can_launch_renders,
        can_view_resources,
        can_create_tasks,
        can_edit_projects,
        can_manage_layouts,
        manageable_roles_json,
        is_system,
        created_at,
        updated_at
      FROM roles
      WHERE key = ?
      LIMIT 1
    `),
    insertRole: db.prepare(`
      INSERT INTO roles(
        key,
        display_name,
        note,
        can_use_live_mode,
        can_use_postprod_mode,
        can_validate,
        can_sync_scenes,
        can_manage_users,
        can_manage_roles,
        can_manage_forms,
        can_manage_machines,
        can_ban_users,
        can_manage_project_permissions,
        can_launch_projects,
        can_launch_renders,
        can_view_resources,
        can_create_tasks,
        can_edit_projects,
        can_manage_layouts,
        manageable_roles_json,
        is_system,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateRole: db.prepare(`
      UPDATE roles
      SET
        display_name = ?,
        note = ?,
        can_use_live_mode = ?,
        can_use_postprod_mode = ?,
        can_validate = ?,
        can_sync_scenes = ?,
        can_manage_users = ?,
        can_manage_roles = ?,
        can_manage_forms = ?,
        can_manage_machines = ?,
        can_ban_users = ?,
        can_manage_project_permissions = ?,
        can_launch_projects = ?,
        can_launch_renders = ?,
        can_view_resources = ?,
        can_create_tasks = ?,
        can_edit_projects = ?,
        can_manage_layouts = ?,
        manageable_roles_json = ?,
        updated_at = ?
      WHERE key = ?
    `),
    countRolesManageRolesExcluding: db.prepare(`
      SELECT COUNT(*) AS n
      FROM roles
      WHERE can_manage_roles = 1
        AND key <> ?
    `),
  };
}

function buildUserPayload(row, rolesCache) {
  const role = resolveRoleInput(row?.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
  const roleRow = rolesCache?.byKey instanceof Map ? rolesCache.byKey.get(role) : null;
  const profile = sanitizeDisplayName(roleRow?.displayName, role);
  const notificationPrefsJson = normalizeNotificationPreferences(row?.notification_preferences_json);
  return {
    id: Number(row?.user_id2 || row?.id || 0),
    publicId: normalizePublicId(row?.public_id) || '',
    username: String(row?.username || ''),
    profile,
    role,
    displayName: String(row?.display_name || row?.username || ''),
    firstName: String(row?.first_name || ''),
    lastName: String(row?.last_name || ''),
    email: String(row?.email || ''),
    email2: String(row?.email_secondary || ''),
    phone: sanitizePhone(row?.phone || row?.mobile_phone || row?.office_phone || ''),
    phone1: sanitizePhone(row?.mobile_phone || row?.phone || ''),
    phone2: sanitizePhone(row?.office_phone || ''),
    mobilePhone: sanitizePhone(row?.mobile_phone || ''),
    officePhone: sanitizePhone(row?.office_phone || ''),
    employmentType: sanitizeEmploymentType(row?.employment_type),
    note: sanitizeUserNote(row?.user_note),
    avatarPath: sanitizeAvatarPath(row?.avatar_path),
    mustChangePassword: Number(row?.must_change_password) === 1,
    failedLoginCount: Number.isFinite(Number(row?.failed_login_count))
      ? Math.max(0, Math.trunc(Number(row?.failed_login_count)))
      : 0,
    lockedUntil: row?.locked_until || null,
    timezone: sanitizeTimezone(row?.timezone),
    language: sanitizeUserLanguage(row?.language, DEFAULT_USER_LANGUAGE),
    notificationPrefsJson,
    notificationPreferences: parseNotificationPreferencesJson(notificationPrefsJson),
    createdAt: row?.user_created_at || row?.created_at || null,
    updatedAt: row?.user_updated_at || row?.updated_at || null,
    lastLoginAt: row?.last_login_at || null,
    permissions: rolePermissions(role, rolesCache),
  };
}

function buildUserAdminPayload(row, rolesCache) {
  const role = resolveRoleInput(row?.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
  const roleRow = rolesCache?.byKey instanceof Map ? rolesCache.byKey.get(role) : null;
  const profile = sanitizeDisplayName(roleRow?.displayName, role);
  const notificationPrefsJson = normalizeNotificationPreferences(row?.notification_preferences_json);
  return {
    id: Number(row?.id || 0),
    publicId: normalizePublicId(row?.public_id) || '',
    username: String(row?.username || ''),
    profile,
    role,
    displayName: String(row?.display_name || row?.username || ''),
    firstName: String(row?.first_name || ''),
    lastName: String(row?.last_name || ''),
    email: String(row?.email || ''),
    email2: String(row?.email_secondary || ''),
    phone: sanitizePhone(row?.phone || row?.mobile_phone || row?.office_phone || ''),
    phone1: sanitizePhone(row?.mobile_phone || row?.phone || ''),
    phone2: sanitizePhone(row?.office_phone || ''),
    mobilePhone: sanitizePhone(row?.mobile_phone || ''),
    officePhone: sanitizePhone(row?.office_phone || ''),
    employmentType: sanitizeEmploymentType(row?.employment_type),
    note: sanitizeUserNote(row?.user_note),
    avatarPath: sanitizeAvatarPath(row?.avatar_path),
    mustChangePassword: Number(row?.must_change_password) === 1,
    failedLoginCount: Number.isFinite(Number(row?.failed_login_count))
      ? Math.max(0, Math.trunc(Number(row?.failed_login_count)))
      : 0,
    lockedUntil: row?.locked_until || null,
    timezone: sanitizeTimezone(row?.timezone),
    language: sanitizeUserLanguage(row?.language, DEFAULT_USER_LANGUAGE),
    notificationPrefsJson,
    notificationPreferences: parseNotificationPreferencesJson(notificationPrefsJson),
    isActive: Number(row?.is_active) === 1,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
    lastLoginAt: row?.last_login_at || null,
  };
}

function buildRolePayload(row) {
  return {
    key: String(row?.key || ''),
    displayName: sanitizeDisplayName(row?.displayName, row?.key || ''),
    note: sanitizeRoleNote(row?.note),
    canUseLiveMode: row?.canUseLiveMode !== false,
    canUsePostprodMode: row?.canUsePostprodMode !== false,
    canValidate: row?.canValidate === true,
    canSyncScenes: row?.canSyncScenes === true,
    canManageUsers: row?.canManageUsers === true,
    canManageRoles: row?.canManageRoles === true,
    canManageForms: row?.canManageForms === true,
    canManageMachines: row?.canManageMachines === true,
    canBanUsers: row?.canBanUsers === true,
    canManageProjectPermissions: row?.canManageProjectPermissions === true,
    canLaunchProjects: row?.canLaunchProjects !== false,
    canLaunchRenders: row?.canLaunchRenders !== false,
    canViewResources: row?.canViewResources === true,
    canCreateTasks: row?.canCreateTasks === true,
    canEditProjects: row?.canEditProjects === true,
    canManageLayouts: row?.canManageLayouts === true,
    manageableRoles: normalizeManageableRolesInput(row?.manageableRoles),
    isSystem: row?.isSystem === true,
    createdAt: row?.createdAt || null,
    updatedAt: row?.updatedAt || null,
  };
}

function parseAuditPayloadJson(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

function asOptionalPositiveInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function normalizeActivityProjectRefs(payload) {
  const refs = [];
  const seen = new Set();
  const pushRef = (value) => {
    const normalized = normalizeTaskRefsInput([value])[0] || '';
    if (!normalized) return;
    const key = normalizeAscii(normalized);
    if (!key || seen.has(key)) return;
    seen.add(key);
    refs.push(normalized);
  };

  const payloadObj = payload && typeof payload === 'object' ? payload : {};
  const rawRefs = Array.isArray(payloadObj.projectRefs) ? payloadObj.projectRefs : [];
  for (const ref of rawRefs) {
    pushRef(ref);
    if (refs.length >= MAX_TASK_REFS) break;
  }
  if (refs.length < MAX_TASK_REFS) pushRef(payloadObj.projectRef);
  if (refs.length < MAX_TASK_REFS) pushRef(payloadObj.projectId);
  if (refs.length < MAX_TASK_REFS) pushRef(payloadObj.projectName);
  return refs.slice(0, MAX_TASK_REFS);
}

function normalizeActivityDetailValue(value, maxLen = 180) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim().slice(0, maxLen);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim().slice(0, maxLen);
  if (Array.isArray(value)) {
    const compact = value
      .map((item) => (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
        ? String(item).trim()
        : '')
      .filter(Boolean)
      .join(', ');
    return compact.slice(0, maxLen);
  }
  if (typeof value === 'object') {
    const candidate = String(
      value?.displayName
      || value?.name
      || value?.title
      || value?.label
      || value?.id
      || ''
    ).trim();
    return candidate.slice(0, maxLen);
  }
  return '';
}

function buildUserActivityDetail({
  payload = {},
  scopeType = '',
  scopeId = '',
  fromStatus = '',
  toStatus = '',
  comment = '',
  projectRefs = [],
}) {
  const parts = [];
  const pushPart = (value) => {
    const normalized = normalizeActivityDetailValue(value, 220);
    if (!normalized) return;
    if (parts.includes(normalized)) return;
    parts.push(normalized);
  };
  const pushLabeled = (label, value) => {
    const normalized = normalizeActivityDetailValue(value, 180);
    if (!normalized) return;
    pushPart(`${label}: ${normalized}`);
  };

  if (fromStatus || toStatus) {
    if (fromStatus && toStatus) pushPart(`${fromStatus} -> ${toStatus}`);
    else pushPart(toStatus || fromStatus);
  }
  if (comment) pushPart(comment);

  pushPart(payload?.message);
  pushLabeled('Erreur', payload?.error || payload?.errorMessage || payload?.reason);
  pushLabeled('Resultat', payload?.result);
  pushLabeled('Utilisateur', payload?.username || payload?.targetUsername || payload?.displayName);
  pushLabeled('Role', payload?.role);
  pushLabeled('IP', payload?.ip || payload?.sourceIp);
  pushLabeled('Tache', payload?.taskTitle || payload?.taskName);
  pushLabeled('Rendu', payload?.renderName || payload?.expectedRenderName || payload?.matchedRenderName);
  pushLabeled('Formulaire', payload?.formName);
  pushLabeled('Preset', payload?.presetName || payload?.templateName || payload?.outputProfile);
  pushLabeled('Projet', payload?.projectName || payload?.projectId || payload?.projectRef);

  const scopeTypeText = normalizeActivityDetailValue(scopeType, 80);
  const scopeIdText = normalizeActivityDetailValue(scopeId, 80);
  if (scopeTypeText || scopeIdText) {
    pushPart(`Scope: ${scopeTypeText}${scopeIdText ? `#${scopeIdText}` : ''}`);
  }
  if (Array.isArray(projectRefs) && projectRefs.length > 0) {
    pushPart(`Projets: ${projectRefs.join(', ')}`);
  }

  const joined = parts.join(' | ').trim();
  return joined.slice(0, 500);
}

function buildUserActivityPayload(row) {
  const payload = parseAuditPayloadJson(row?.payload_json);
  const scopeType = String(row?.scope_type || '');
  const scopeId = String(row?.scope_id || '');
  const fromStatus = String(payload?.fromStatus || '').trim().slice(0, 120);
  const toStatus = String(payload?.toStatus || '').trim().slice(0, 120);
  const comment = String(payload?.comment || '').trim().slice(0, MAX_TASK_COMMENT_LEN);
  const projectRefs = normalizeActivityProjectRefs(payload);
  return {
    id: Number(row?.id || 0),
    actorUserId: Number(row?.actor_user_id || 0),
    action: String(row?.action || ''),
    scopeType,
    scopeId,
    createdAt: row?.created_at || null,
    taskId: asOptionalPositiveInt(payload?.taskId),
    renderId: asOptionalPositiveInt(payload?.renderId),
    fromStatus,
    toStatus,
    projectRefs,
    comment,
    detail: buildUserActivityDetail({
      payload,
      scopeType,
      scopeId,
      fromStatus,
      toStatus,
      comment,
      projectRefs,
    }),
  };
}

function buildAuditEntryPayload(row) {
  const activity = buildUserActivityPayload(row);
  return {
    ...activity,
    actorUsername: String(row?.actor_username || '').trim(),
    payload: parseAuditPayloadJson(row?.payload_json),
  };
}

function escapeCsvCell(value) {
  const raw = String(value == null ? '' : value);
  if (!/[",\r\n]/.test(raw)) return raw;
  return `"${raw.replace(/"/g, '""')}"`;
}

function buildAuditCsvLine(entry) {
  const payload = entry?.payload && typeof entry.payload === 'object' ? entry.payload : {};
  let payloadJson = '{}';
  try {
    payloadJson = JSON.stringify(payload);
  } catch {
    payloadJson = '{}';
  }
  const projectRefs = Array.isArray(entry?.projectRefs) ? entry.projectRefs.join('|') : '';
  return [
    Number(entry?.id || 0),
    String(entry?.createdAt || ''),
    Number(entry?.actorUserId || 0),
    String(entry?.actorUsername || ''),
    String(entry?.action || ''),
    String(entry?.scopeType || ''),
    String(entry?.scopeId || ''),
    String(entry?.fromStatus || ''),
    String(entry?.toStatus || ''),
    projectRefs,
    String(entry?.comment || ''),
    payloadJson,
  ]
    .map(escapeCsvCell)
    .join(',');
}

function matchesAuditSearch(entry, searchValue = '') {
  const search = String(searchValue || '').trim().toLowerCase();
  if (!search) return true;

  const action = String(entry?.action || '').trim();
  const scopeType = String(entry?.scopeType || '').trim();
  const scopeId = String(entry?.scopeId || '').trim();
  const actorUsername = String(entry?.actorUsername || '').trim();
  const actorUserId = Number(entry?.actorUserId || 0);
  const fromStatus = String(entry?.fromStatus || '').trim();
  const toStatus = String(entry?.toStatus || '').trim();
  const comment = String(entry?.comment || '').trim();
  const refs = Array.isArray(entry?.projectRefs) ? entry.projectRefs.join(' ') : '';
  const payloadText = (() => {
    try {
      const payload = entry?.payload && typeof entry.payload === 'object' ? entry.payload : {};
      return JSON.stringify(payload);
    } catch {
      return '';
    }
  })();

  const haystack = [
    action,
    scopeType,
    scopeId,
    actorUsername,
    actorUserId > 0 ? String(actorUserId) : '',
    fromStatus,
    toStatus,
    comment,
    refs,
    payloadText,
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(search);
}

function summarizeUserActivity(activities = []) {
  const list = Array.isArray(activities) ? activities : [];
  const actions = {};
  const byType = {
    auth: 0,
    task: 0,
    render: 0,
    sync: 0,
    other: 0,
  };
  const projectSet = new Set();
  const WORKED_PROJECT_ACTIVITY_TYPES = new Set(['task', 'render', 'sync']);
  for (const item of list) {
    const action = String(item?.action || '').trim();
    if (action) actions[action] = Number(actions[action] || 0) + 1;
    const typeKey = classifyActivityActionType(action);
    if (Object.prototype.hasOwnProperty.call(byType, typeKey)) {
      byType[typeKey] = Number(byType[typeKey] || 0) + 1;
    } else {
      byType.other = Number(byType.other || 0) + 1;
    }
    if (!WORKED_PROJECT_ACTIVITY_TYPES.has(typeKey)) continue;
    const refs = Array.isArray(item?.projectRefs) ? item.projectRefs : [];
    for (const ref of refs) {
      const normalized = normalizeTaskRefsInput([ref])[0];
      if (!normalized) continue;
      projectSet.add(normalized);
    }
  }
  return {
    total: list.length,
    actions,
    byType,
    projects: Array.from(projectSet).sort((a, b) => a.localeCompare(b)),
  };
}

function parseActivityProjectRefsFilter(searchParams) {
  const values = [
    ...searchParams.getAll('projectRef'),
    ...searchParams.getAll('projectRefs'),
    ...searchParams.getAll('projectId'),
    ...searchParams.getAll('project'),
  ];
  if (!Array.isArray(values) || values.length === 0) return [];
  const merged = values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(',');
  return normalizeTaskRefsInput(merged).slice(0, MAX_TASK_REFS);
}

function parseActivityFilters(searchParams) {
  const rawLimit = Number(searchParams.get('limit') || 50);
  const limit = Math.min(200, coercePositiveInt(rawLimit, 50, 1));
  const fromAtRaw = String(searchParams.get('fromAt') || '').trim();
  const toAtRaw = String(searchParams.get('toAt') || '').trim();
  const fromAt = fromAtRaw ? parseIsoDateOrNull(fromAtRaw) : '';
  const toAt = toAtRaw ? parseIsoDateOrNull(toAtRaw) : '';
  if (fromAtRaw && !fromAt) return { ok: false, error: 'invalid_from_at' };
  if (toAtRaw && !toAt) return { ok: false, error: 'invalid_to_at' };
  if (fromAt && toAt && Date.parse(fromAt) > Date.parse(toAt)) {
    return { ok: false, error: 'invalid_activity_range' };
  }
  const actionTypeRaw = String(
    searchParams.get('actionType') ||
    searchParams.get('activityType') ||
    ''
  )
    .trim()
    .toLowerCase();
  const actionType = (() => {
    if (!actionTypeRaw || actionTypeRaw === 'all') return 'all';
    if (['auth', 'task', 'render', 'sync', 'other'].includes(actionTypeRaw)) {
      return actionTypeRaw;
    }
    return '';
  })();
  if (!actionType) return { ok: false, error: 'invalid_activity_action_type' };
  const projectRefs = parseActivityProjectRefsFilter(searchParams);
  const searchQuery = String(
    searchParams.get('search') ||
    searchParams.get('query') ||
    searchParams.get('q') ||
    ''
  )
    .trim()
    .slice(0, MAX_ACTIVITY_SEARCH_LEN);
  return {
    ok: true,
    limit,
    fromAt,
    toAt,
    actionType,
    projectRefs,
    searchQuery,
  };
}

function activityMatchesProjectRefs(activity, projectRefs = []) {
  const filters = Array.isArray(projectRefs) ? projectRefs : [];
  if (filters.length === 0) return true;
  const activityRefs = Array.isArray(activity?.projectRefs) ? activity.projectRefs : [];
  if (activityRefs.length === 0) return false;
  const filterSet = new Set(
    filters
      .map((ref) => normalizeAscii(ref).toLowerCase())
      .filter(Boolean)
  );
  if (filterSet.size === 0) return true;
  for (const ref of activityRefs) {
    const key = normalizeAscii(ref).toLowerCase();
    if (key && filterSet.has(key)) return true;
  }
  return false;
}

function classifyActivityActionType(action) {
  const normalized = String(action || '').trim().toLowerCase();
  if (!normalized) return 'other';
  if (normalized.startsWith('auth_')) return 'auth';
  if (normalized.startsWith('task_')) return 'task';
  if (normalized.startsWith('render_') || normalized.startsWith('renders_')) return 'render';
  if (
    normalized === 'project_sync' ||
    normalized.startsWith('sync_') ||
    normalized.endsWith('_sync') ||
    normalized.includes('_sync_')
  ) {
    return 'sync';
  }
  return 'other';
}

function activityMatchesActionType(activity, actionType = 'all') {
  const normalized = String(actionType || '').trim().toLowerCase();
  if (!normalized || normalized === 'all') return true;
  return classifyActivityActionType(activity?.action) === normalized;
}

function activityMatchesSearchQuery(activity, searchQuery = '') {
  const needle = normalizeAscii(String(searchQuery || '').trim()).toLowerCase();
  if (!needle) return true;

  const projectRefs = Array.isArray(activity?.projectRefs) ? activity.projectRefs.join(' ') : '';
  const taskId = Number.isFinite(Number(activity?.taskId)) && Number(activity?.taskId) > 0
    ? String(activity.taskId)
    : '';
  const renderId = Number.isFinite(Number(activity?.renderId)) && Number(activity?.renderId) > 0
    ? String(activity.renderId)
    : '';

  const haystack = [
    String(activity?.action || ''),
    String(activity?.scopeType || ''),
    String(activity?.scopeId || ''),
    String(activity?.fromStatus || ''),
    String(activity?.toStatus || ''),
    String(activity?.comment || ''),
    projectRefs,
    taskId,
    renderId,
    String(activity?.createdAt || ''),
  ]
    .map((value) => normalizeAscii(String(value || '')).toLowerCase())
    .join(' ');

  return haystack.includes(needle);
}

function buildTaskPayload(row) {
  const requestType = normalizeTaskRequestType(row?.request_type, DEFAULT_TASK_REQUEST_TYPE);
  const expectedRenderCount = normalizeTaskExpectedRenderCount(
    row?.expected_render_count,
    requestType,
    1
  );
  const autoRenderConfig = parseTaskAutoRenderConfig(row?.auto_render_config_json);
  const expectedRenderNames = resolveTaskExpectedRenderNames({
    title: row?.title,
    requestType,
    expectedRenderCount,
    expectedRenderNames: row?.expected_render_names_json,
  });
  return {
    id: Number(row?.id || 0),
    title: String(row?.title || ''),
    description: String(row?.description || ''),
    status: normalizeTaskStatus(row?.status, 'A faire'),
    priority: Number.isFinite(Number(row?.priority)) ? Number(row.priority) : 3,
    requestType,
    autoRenderConfig,
    expectedRenderCount,
    expectedRenderNames,
    assigneeUserId: row?.assignee_user_id == null ? null : Number(row.assignee_user_id),
    projectRefs: parseTaskRefsJson(row?.project_refs_json),
    resourceRefs: parseTaskRefsJson(row?.resource_refs_json),
    assigneeDisplayName: String(row?.assignee_display_name || ''),
    assigneeUsername: String(row?.assignee_username || ''),
    reporterUserId: row?.reporter_user_id == null ? null : Number(row.reporter_user_id),
    reporterDisplayName: String(row?.reporter_display_name || ''),
    reporterUsername: String(row?.reporter_username || ''),
    dueAt: row?.due_at || null,
    submittedAt: row?.submitted_at || null,
    validatedAt: row?.validated_at || null,
    rejectedAt: row?.rejected_at || null,
    startedAt: row?.started_at || null,
    finishedAt: row?.finished_at || null,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function buildTaskTransitionPayload(row) {
  return {
    id: Number(row?.id || 0),
    taskId: Number(row?.task_id || 0),
    fromStatus: normalizeTaskStatus(row?.from_status, 'A faire'),
    toStatus: normalizeTaskStatus(row?.to_status, 'A faire'),
    byUserId: Number(row?.by_user_id || 0),
    byUsername: String(row?.by_username || ''),
    comment: String(row?.comment || ''),
    createdAt: row?.created_at || null,
  };
}

function parseRenderPayloadJson(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    if (parsed == null) return {};
    return parsed;
  } catch {
    return {};
  }
}

function parseJsonValue(value, fallbackValue = null) {
  try {
    const raw = String(value ?? '').trim();
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function parseJsonArray(value) {
  const parsed = parseJsonValue(value, []);
  return Array.isArray(parsed) ? parsed : [];
}

function parseRenderExecutionJson(value) {
  const parsed = parseRenderPayloadJson(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { mode: 'simulate' };
  return parsed;
}

function buildRenderTemplatePayload(row, rolesCache = null) {
  const allowedRoles = normalizeRenderTemplateAllowedRoles(row?.allowed_roles_json, rolesCache);
  let allowedRolesJson = '[]';
  try {
    allowedRolesJson = JSON.stringify(allowedRoles);
  } catch {
    allowedRolesJson = '[]';
  }
  return {
    id: Number(row?.id || 0),
    name: String(row?.name || ''),
    projectName: String(row?.project_name || ''),
    templateName: String(row?.template_name || ''),
    mapName: String(row?.map_name || ''),
    sequenceName: String(row?.sequence_name || ''),
    outputProfile: String(row?.output_profile || ''),
    allowedRoles,
    allowedRolesJson,
    execution: parseRenderExecutionJson(row?.execution_json),
    payload: parseRenderPayloadJson(row?.payload_json),
    createdByUserId: row?.created_by_user_id == null ? null : Number(row.created_by_user_id),
    createdByUsername: String(row?.created_by_username || ''),
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function buildRenderFormPayload(row) {
  return {
    id: Number(row?.id || 0),
    name: String(row?.name || ''),
    projectName: String(row?.project_name || ''),
    templateName: String(row?.template_name || ''),
    mapName: String(row?.map_name || ''),
    sequenceName: String(row?.sequence_name || ''),
    outputProfile: String(row?.output_profile || ''),
    presetName: String(row?.preset_name || ''),
    modeDefault: normalizeRenderFormModeDefault(row?.mode_default, 'edit'),
    isActive: Number(row?.is_active) === 1,
    layout: parseJsonValue(row?.layout_json, {}),
    fieldsCount: Number.isFinite(Number(row?.fields_count))
      ? Math.max(0, Math.trunc(Number(row?.fields_count)))
      : 0,
    createdByUserId: row?.created_by_user_id == null ? null : Number(row.created_by_user_id),
    createdByUsername: String(row?.created_by_username || ''),
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function buildRenderFormFieldPayload(row) {
  return {
    id: Number(row?.id || 0),
    formId: Number(row?.form_id || 0),
    fieldKey: String(row?.field_key || ''),
    fieldLabel: String(row?.field_label || ''),
    sourcePath: String(row?.source_path || ''),
    sourceType: normalizeRenderFormFieldSourceType(row?.source_type, 'preset_property'),
    inputKind: normalizeRenderFormFieldInputKind(row?.input_kind, 'text'),
    valueType: normalizeRenderFormFieldValueType(row?.value_type, 'string'),
    groupName: String(row?.group_name || ''),
    payloadKey: String(row?.payload_key || ''),
    placeholder: String(row?.placeholder || ''),
    helpText: String(row?.help_text || ''),
    options: parseJsonArray(row?.options_json),
    validation: parseJsonValue(row?.validation_json, {}),
    defaultValue: parseJsonValue(row?.default_value_json, null),
    isRequired: Number(row?.is_required) === 1,
    isVisible: Number(row?.is_visible) === 1,
    sortOrder: Number.isFinite(Number(row?.sort_order))
      ? Math.max(-999999, Math.min(999999, Math.trunc(Number(row?.sort_order))))
      : 0,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function buildRenderJobPayload(row) {
  const payload = parseRenderPayloadJson(row?.payload_json);
  const payloadSource = String(payload?.source || '').trim().toLowerCase();
  const origin = payloadSource === 'detected_file' || payloadSource === 'detected'
    ? 'detected'
    : 'internal';
  const linkedTaskIdRaw = Number(payload?.taskId || 0);
  const linkedTaskId = Number.isFinite(linkedTaskIdRaw) && linkedTaskIdRaw > 0
    ? Math.trunc(linkedTaskIdRaw)
    : null;
  const linkedTaskTitle = sanitizeTaskTitle(payload?.taskTitle, '');
  const matchedExpectedRenderName = sanitizeTaskExpectedRenderName(payload?.matchedExpectedRenderName);
  const taskExpectedRenderCountRaw = Number(payload?.taskExpectedRenderCount || 0);
  const taskDetectedRenderCountRaw = Number(payload?.taskDetectedRenderCount || 0);
  const taskExpectedRenderCount = Number.isFinite(taskExpectedRenderCountRaw) && taskExpectedRenderCountRaw > 0
    ? Math.max(1, Math.min(MAX_TASK_EXPECTED_RENDER_COUNT, Math.trunc(taskExpectedRenderCountRaw)))
    : 0;
  const taskDetectedRenderCount = Number.isFinite(taskDetectedRenderCountRaw) && taskDetectedRenderCountRaw > 0
    ? Math.max(0, Math.min(MAX_TASK_EXPECTED_RENDER_COUNT, Math.trunc(taskDetectedRenderCountRaw)))
    : 0;
  const reviewStatusFallback = inferRenderReviewStatus(row?.status, row?.validated_by_user_id);
  return {
    id: Number(row?.id || 0),
    projectName: String(row?.project_name || ''),
    templateName: String(row?.template_name || ''),
    payload,
    origin,
    linkedTaskId,
    linkedTaskTitle,
    matchedExpectedRenderName,
    taskExpectedRenderCount,
    taskDetectedRenderCount,
    status: normalizeRenderStatus(row?.status, 'Queued'),
    reviewStatus: normalizeRenderReviewStatus(row?.review_status, reviewStatusFallback),
    requestedByUserId: Number(row?.requested_by_user_id || 0),
    requestedByUsername: String(row?.requested_by_username || ''),
    validatedByUserId: row?.validated_by_user_id == null ? null : Number(row.validated_by_user_id),
    validatedByUsername: String(row?.validated_by_username || ''),
    requiresValidation: Number(row?.requires_validation) === 1,
    outputPath: String(row?.output_path || ''),
    errorMessage: String(row?.error_message || ''),
    startedAt: row?.started_at || null,
    finishedAt: row?.finished_at || null,
    assignedWorkerId: row?.assigned_worker_id == null ? null : Number(row.assigned_worker_id),
    assignedWorkerKey: String(row?.assigned_worker_key || ''),
    assignedWorkerName: String(row?.assigned_worker_name || ''),
    attemptCount: Number.isFinite(Number(row?.attempt_count))
      ? Math.max(0, Math.trunc(Number(row?.attempt_count)))
      : 0,
    maxAttempts: Number.isFinite(Number(row?.max_attempts))
      ? Math.max(1, Math.trunc(Number(row?.max_attempts)))
      : 3,
    lastAttemptAt: row?.last_attempt_at || null,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function buildRenderWorkerPayload(row) {
  return {
    id: Number(row?.id || 0),
    workerKey: String(row?.worker_key || ''),
    displayName: String(row?.display_name || ''),
    capabilities: parseRenderWorkerCapabilitiesJson(row?.capabilities_json),
    canRender: Number(row?.can_render) === 1,
    isActive: Number(row?.is_active) === 1,
    isOnline: Number(row?.is_online) === 1,
    currentRenderJobId: row?.current_render_job_id == null ? null : Number(row.current_render_job_id),
    currentRenderTemplateName: String(row?.current_render_template_name || ''),
    currentRenderProjectName: String(row?.current_render_project_name || ''),
    currentRenderStatus: String(row?.current_render_status || '').trim()
      ? normalizeRenderStatus(row?.current_render_status, 'Queued')
      : '',
    lastSeenAt: row?.last_seen_at || null,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function buildRenderJobEventPayload(row) {
  return {
    id: Number(row?.id || 0),
    renderId: Number(row?.render_job_id || 0),
    fromStatus: normalizeRenderStatus(row?.from_status, 'Queued'),
    toStatus: normalizeRenderStatus(row?.to_status, 'Queued'),
    byUserId: Number(row?.by_user_id || 0),
    byUsername: String(row?.by_username || ''),
    comment: String(row?.comment || ''),
    createdAt: row?.created_at || null,
  };
}

function buildProjectPermissionPayload(row) {
  return {
    userId: Number(row?.user_id || 0),
    projectId: String(row?.project_id || ''),
    isReferent: Number(row?.is_referent) === 1,
    canValidate: Number(row?.can_validate) === 1,
    canSync: Number(row?.can_sync) === 1,
    canLaunchRender: Number(row?.can_launch_render) === 1,
    canEditData: Number(row?.can_edit_data) === 1,
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function buildDataTablePayload(row) {
  return {
    id: Number(row?.id || 0),
    projectId: String(row?.project_id || ''),
    name: String(row?.name || ''),
    schema: parseRenderPayloadJson(row?.schema_json),
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function buildDataRowPayload(row) {
  return {
    id: Number(row?.id || 0),
    tableId: Number(row?.table_id || 0),
    rowKey: String(row?.row_key || ''),
    payload: parseRenderPayloadJson(row?.payload_json),
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function buildUnavailableHandler(reason) {
  return async function handleRoutes(req, res, url, { sendJSON }) {
    if (!url?.pathname?.startsWith('/agent/postprod')) return false;
    sendJSON(res, 503, {
      ok: false,
      error: 'postprod_unavailable',
      message: String(reason || 'Post-production backend unavailable'),
    });
    return true;
  };
}

function createPostprodAuth({ dataDir, logLine = () => {} } = {}) {
  let BetterSqlite3 = null;
  try {
    BetterSqlite3 = require('better-sqlite3');
  } catch (err) {
    const reason = `Module better-sqlite3 introuvable: ${String(err?.message || err)}`;
    logLine({
      level: 'error',
      src: 'postprod',
      action: 'db_init_failed',
      message: reason,
    });
    return {
      available: false,
      dbPath: '',
      handleRoutes: buildUnavailableHandler(reason),
    };
  }

  const rootDataDir = String(dataDir || '').trim();
  if (!rootDataDir) {
    const reason = 'DATA_DIR manquant pour initialiser SQLite postprod';
    logLine({
      level: 'error',
      src: 'postprod',
      action: 'db_init_failed',
      message: reason,
    });
    return {
      available: false,
      dbPath: '',
      handleRoutes: buildUnavailableHandler(reason),
    };
  }
  let sharedStore = null;
  try {
    sharedStore = getSharedStore({ dataDir: rootDataDir, logLine });
  } catch {
    sharedStore = null;
  }

  const sessionTtlSec = coercePositiveInt(
    process.env.UU_POSTPROD_SESSION_TTL_SEC,
    DEFAULT_SESSION_TTL_SEC,
    300
  );
  const pbkdf2Iters = coercePositiveInt(
    process.env.UU_POSTPROD_PBKDF2_ITERS,
    DEFAULT_PBKDF2_ITERS,
    10000
  );
  const renderHealthEventRetentionDaysRaw = Number(process.env.UU_POSTPROD_RENDER_HEALTH_EVENT_RETENTION_DAYS);
  const renderHealthEventRetentionDays =
    Number.isFinite(renderHealthEventRetentionDaysRaw)
      ? Math.max(
          MIN_RENDER_HEALTH_EVENT_RETENTION_DAYS,
          Math.min(MAX_RENDER_HEALTH_EVENT_RETENTION_DAYS, Math.trunc(renderHealthEventRetentionDaysRaw))
        )
      : DEFAULT_RENDER_HEALTH_EVENT_RETENTION_DAYS;
  const renderHealthEventCleanupIntervalRaw = Number(process.env.UU_POSTPROD_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS);
  const renderHealthEventCleanupIntervalMs =
    Number.isFinite(renderHealthEventCleanupIntervalRaw)
      ? Math.max(
          MIN_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS,
          Math.min(MAX_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS, Math.trunc(renderHealthEventCleanupIntervalRaw))
        )
      : DEFAULT_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS;
  const renderDetectedScanIntervalRaw = Number(process.env.UU_POSTPROD_RENDER_DETECT_SCAN_INTERVAL_MS);
  const renderDetectedScanIntervalMs =
    Number.isFinite(renderDetectedScanIntervalRaw)
      ? Math.max(
          MIN_RENDER_DETECTED_SCAN_INTERVAL_MS,
          Math.min(MAX_RENDER_DETECTED_SCAN_INTERVAL_MS, Math.trunc(renderDetectedScanIntervalRaw))
        )
      : DEFAULT_RENDER_DETECTED_SCAN_INTERVAL_MS;
  const renderDetectedScanMaxFilesRaw = Number(process.env.UU_POSTPROD_RENDER_DETECT_MAX_FILES);
  const renderDetectedScanMaxFiles =
    Number.isFinite(renderDetectedScanMaxFilesRaw)
      ? Math.max(1, Math.min(MAX_RENDER_DETECTED_SCAN_FILES, Math.trunc(renderDetectedScanMaxFilesRaw)))
      : DEFAULT_RENDER_DETECTED_SCAN_FILES;
  const resourcesIndexAutoSyncIntervalRaw = Number(process.env.UU_POSTPROD_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS);
  const resourcesIndexAutoSyncIntervalMs =
    Number.isFinite(resourcesIndexAutoSyncIntervalRaw)
      ? Math.max(
          MIN_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS,
          Math.min(MAX_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS, Math.trunc(resourcesIndexAutoSyncIntervalRaw))
        )
      : DEFAULT_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS;
  const renderDetectedExtensionsFromEnv = normalizeRenderDetectedExtensions(
    process.env.UU_POSTPROD_RENDER_DETECT_EXTENSIONS
  );
  const renderDetectedExtensions = renderDetectedExtensionsFromEnv.size > 0
    ? renderDetectedExtensionsFromEnv
    : new Set(DEFAULT_RENDER_DETECTED_EXTENSIONS);
  const commonServerFile = path.join(rootDataDir, 'common_server.json');
  const hostsServerFile = path.join(rootDataDir, 'hosts_server.json');
  const renderDetectedRootsRaw = parseEnvPathList(process.env.UU_POSTPROD_RENDER_DETECT_DIRS);
  const renderDetectedRootsDefault = (
    renderDetectedRootsRaw.length > 0
      ? renderDetectedRootsRaw
      : [path.join(rootDataDir, 'postprod-renders-inbox')]
  ).map((entry) => {
    try {
      return path.resolve(String(entry || '').trim());
    } catch {
      return String(entry || '').trim();
    }
  }).filter(Boolean);

  function normalizeRenderDetectedRootsList(value) {
    const out = [];
    const seen = new Set();
    const rawList = Array.isArray(value)
      ? value
      : parseEnvPathList(value);
    for (const rawEntry of rawList) {
      const entry = String(rawEntry || '').trim();
      if (!entry) continue;
      let absPath = entry;
      try {
        absPath = path.resolve(entry);
      } catch {
        absPath = entry;
      }
      const normalized = String(absPath || '').trim();
      if (!normalized) continue;
      const key = normalized.replace(/\\/g, '/').toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(normalized);
    }
    return out;
  }

  function resolveRenderDetectedRoots() {
    let configured = [];
    try {
      const raw = fs.readFileSync(commonServerFile, 'utf8');
      const common = JSON.parse(raw || '{}');
      const fromList = Array.isArray(common?.render_output_dirs)
        ? common.render_output_dirs
        : (Array.isArray(common?.renderOutputDirs)
          ? common.renderOutputDirs
          : []);
      const fromSingle = String(
        common?.render_output_dir ??
        common?.renderOutputDir ??
        ''
      ).trim();
      configured = fromList;
      if (configured.length === 0 && fromSingle) {
        configured = parseEnvPathList(fromSingle);
      }
    } catch {
      configured = [];
    }
    const configuredRoots = normalizeRenderDetectedRootsList(configured);
    const roots = configuredRoots.length > 0
      ? configuredRoots
      : renderDetectedRootsDefault;
    for (const root of roots) {
      try {
        fs.mkdirSync(root, { recursive: true });
      } catch {}
    }
    return roots;
  }

  function buildRenderOutputSubdir(jobId, projectName, baseDir) {
    const paddedJobId = String(Math.trunc(Math.max(0, Number(jobId) || 0))).padStart(3, '0');
    // eslint-disable-next-line no-control-regex
    const cleanProjectName = String(projectName || '').trim().replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'projet';
    const subdirName = `${paddedJobId}_${cleanProjectName}`;
    return path.join(String(baseDir || '').trim(), subdirName);
  }

  function createRenderOutputSubdir(jobId, projectName) {
    try {
      const raw = fs.readFileSync(commonServerFile, 'utf8');
      const common = JSON.parse(raw || '{}');
      const baseDir = String(
        common?.render_output_dir ??
        common?.renderOutputDir ??
        (Array.isArray(common?.render_output_dirs) && common.render_output_dirs[0]) ??
        ''
      ).trim();
      if (!baseDir) return { ok: false, error: 'render_output_dir_not_configured' };
      const outputPath = buildRenderOutputSubdir(jobId, projectName, baseDir);
      fs.mkdirSync(outputPath, { recursive: true });
      return { ok: true, outputPath };
    } catch (err) {
      return { ok: false, error: String(err?.message || 'create_subdir_failed') };
    }
  }

  function resolveAbsPathSafe(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      return path.resolve(raw);
    } catch {
      return raw;
    }
  }

  function isPathUnderRoot(pathValue, rootValue) {
    const absPath = resolveAbsPathSafe(pathValue);
    const absRoot = resolveAbsPathSafe(rootValue);
    if (!absPath || !absRoot) return false;
    const normalize = (input) => String(input || '').replace(/[\\/]+/g, '/').replace(/\/+$/g, '').toLowerCase();
    const pathNorm = normalize(absPath);
    const rootNorm = normalize(absRoot);
    if (!pathNorm || !rootNorm) return false;
    if (pathNorm === rootNorm) return true;
    if (pathNorm.startsWith(`${rootNorm}/`)) return true;
    return false;
  }

  function shouldExposeDetectedRender(renderPayload, detectedRoots = []) {
    const payload = renderPayload && typeof renderPayload === 'object' && !Array.isArray(renderPayload)
      ? renderPayload
      : {};
    const roots = Array.isArray(detectedRoots) ? detectedRoots : [];
    if (roots.length <= 0) return true;

    const sourceDir = sanitizeRenderOutputPath(payload?.sourceDir || '');
    const filePath = sanitizeRenderOutputPath(
      payload?.filePath ||
      payload?.outputPath ||
      ''
    );

    if (sourceDir) {
      return roots.some((root) => isPathUnderRoot(sourceDir, root));
    }
    if (filePath) {
      return roots.some((root) => isPathUnderRoot(filePath, root));
    }
    return true;
  }
  const brokerToken = String(process.env.UU_POSTPROD_BROKER_TOKEN || '')
    .trim()
    .slice(0, MAX_BROKER_TOKEN_LEN);
  const brokerJwtSecret = String(process.env.UU_POSTPROD_BROKER_JWT_SECRET || '')
    .trim()
    .slice(0, MAX_BROKER_TOKEN_LEN);
  const brokerJwtJwksUrl = sanitizeHttpUrl(
    process.env.UU_POSTPROD_BROKER_JWKS_URL,
    MAX_BROKER_JWKS_URL_LEN
  );
  const brokerJwtIssuer = String(process.env.UU_POSTPROD_BROKER_JWT_ISSUER || '')
    .trim()
    .slice(0, MAX_BROKER_JWT_ISSUER_LEN);
  const brokerJwtAudience = String(process.env.UU_POSTPROD_BROKER_JWT_AUDIENCE || '')
    .trim()
    .slice(0, MAX_BROKER_JWT_AUDIENCE_LEN);
  const brokerJwtClockSkewRaw = Number(process.env.UU_POSTPROD_BROKER_JWT_CLOCK_SKEW_SEC);
  const brokerJwtClockSkewSec = Number.isFinite(brokerJwtClockSkewRaw) && brokerJwtClockSkewRaw >= 0
    ? Math.min(300, Math.trunc(brokerJwtClockSkewRaw))
    : 30;
  const brokerJwtJwksTtlRaw = Number(process.env.UU_POSTPROD_BROKER_JWKS_TTL_SEC);
  const brokerJwtJwksTtlSec = Number.isFinite(brokerJwtJwksTtlRaw) && brokerJwtJwksTtlRaw >= MIN_BROKER_JWKS_TTL_SEC
    ? Math.min(MAX_BROKER_JWKS_TTL_SEC, Math.trunc(brokerJwtJwksTtlRaw))
    : 300;
  const brokerJwtJwksTimeoutRaw = Number(process.env.UU_POSTPROD_BROKER_JWKS_TIMEOUT_MS);
  const brokerJwtJwksTimeoutMs = Number.isFinite(brokerJwtJwksTimeoutRaw) && brokerJwtJwksTimeoutRaw >= MIN_BROKER_JWKS_TIMEOUT_MS
    ? Math.min(MAX_BROKER_JWKS_TIMEOUT_MS, Math.trunc(brokerJwtJwksTimeoutRaw))
    : 5000;
  const brokerOidcDiscoveryEnabled = parseBooleanFlag(
    process.env.UU_POSTPROD_BROKER_OIDC_DISCOVERY_ENABLED,
    true
  );
  const brokerOidcDiscoveryUrl = brokerOidcDiscoveryEnabled
    ? buildOidcDiscoveryUrl({
        issuer: brokerJwtIssuer,
        explicitUrl: String(process.env.UU_POSTPROD_BROKER_OIDC_DISCOVERY_URL || '')
          .trim()
          .slice(0, MAX_BROKER_OIDC_DISCOVERY_URL_LEN),
      })
    : '';
  const brokerOidcDiscoveryTtlRaw = Number(process.env.UU_POSTPROD_BROKER_OIDC_DISCOVERY_TTL_SEC);
  const brokerOidcDiscoveryTtlSec =
    Number.isFinite(brokerOidcDiscoveryTtlRaw) && brokerOidcDiscoveryTtlRaw >= MIN_BROKER_OIDC_DISCOVERY_TTL_SEC
      ? Math.min(MAX_BROKER_OIDC_DISCOVERY_TTL_SEC, Math.trunc(brokerOidcDiscoveryTtlRaw))
      : brokerJwtJwksTtlSec;
  const brokerOidcDiscoveryTimeoutRaw = Number(process.env.UU_POSTPROD_BROKER_OIDC_DISCOVERY_TIMEOUT_MS);
  const brokerOidcDiscoveryTimeoutMs =
    Number.isFinite(brokerOidcDiscoveryTimeoutRaw) && brokerOidcDiscoveryTimeoutRaw >= MIN_BROKER_OIDC_DISCOVERY_TIMEOUT_MS
      ? Math.min(MAX_BROKER_OIDC_DISCOVERY_TIMEOUT_MS, Math.trunc(brokerOidcDiscoveryTimeoutRaw))
      : brokerJwtJwksTimeoutMs;
  const brokerJwksRefreshLeadRaw = Number(process.env.UU_POSTPROD_BROKER_JWKS_REFRESH_LEAD_SEC);
  const brokerJwksRefreshLeadSec =
    Number.isFinite(brokerJwksRefreshLeadRaw) && brokerJwksRefreshLeadRaw >= 0
      ? Math.min(MAX_BROKER_REFRESH_LEAD_SEC, Math.trunc(brokerJwksRefreshLeadRaw))
      : 45;
  const brokerOidcRefreshLeadRaw = Number(process.env.UU_POSTPROD_BROKER_OIDC_DISCOVERY_REFRESH_LEAD_SEC);
  const brokerOidcRefreshLeadSec =
    Number.isFinite(brokerOidcRefreshLeadRaw) && brokerOidcRefreshLeadRaw >= 0
      ? Math.min(MAX_BROKER_REFRESH_LEAD_SEC, Math.trunc(brokerOidcRefreshLeadRaw))
      : 45;
  const brokerMetadataRefreshMinIntervalRaw = Number(process.env.UU_POSTPROD_BROKER_METADATA_REFRESH_MIN_INTERVAL_MS);
  const brokerMetadataRefreshMinIntervalMs =
    Number.isFinite(brokerMetadataRefreshMinIntervalRaw) &&
    brokerMetadataRefreshMinIntervalRaw >= MIN_BROKER_METADATA_REFRESH_INTERVAL_MS
      ? Math.min(MAX_BROKER_METADATA_REFRESH_INTERVAL_MS, Math.trunc(brokerMetadataRefreshMinIntervalRaw))
      : 5000;
  const brokerOfflineRecoveryIntervalRaw = Number(process.env.UU_POSTPROD_BROKER_OFFLINE_RECOVERY_INTERVAL_MS);
  const brokerOfflineRecoveryIntervalMs =
    Number.isFinite(brokerOfflineRecoveryIntervalRaw) &&
    brokerOfflineRecoveryIntervalRaw >= MIN_BROKER_OFFLINE_RECOVERY_INTERVAL_MS
      ? Math.min(MAX_BROKER_OFFLINE_RECOVERY_INTERVAL_MS, Math.trunc(brokerOfflineRecoveryIntervalRaw))
      : DEFAULT_BROKER_OFFLINE_RECOVERY_INTERVAL_MS;
  const brokerJwtAlgsFallback = [];
  if (brokerJwtSecret) brokerJwtAlgsFallback.push('HS256');
  if (brokerJwtJwksUrl || brokerOidcDiscoveryUrl) brokerJwtAlgsFallback.push('RS256');
  const brokerJwtAlgsRequested = normalizeBrokerJwtAlgs(
    process.env.UU_POSTPROD_BROKER_JWT_ALGS,
    brokerJwtAlgsFallback
  );
  const brokerJwtAllowedAlgs = brokerJwtAlgsRequested.filter((alg) => {
    if (alg === 'HS256') return brokerJwtSecret.length > 0;
    if (alg === 'RS256') return brokerJwtJwksUrl.length > 0 || brokerOidcDiscoveryUrl.length > 0;
    return false;
  });
  const brokerOidcCache = {
    jwksUri: '',
    issuer: '',
    expiresAtMs: 0,
    fetchedAtMs: 0,
    etag: '',
    lastError: '',
  };
  const brokerJwksCache = {
    keys: [],
    expiresAtMs: 0,
    fetchedAtMs: 0,
    sourceUrl: '',
    etag: '',
    lastError: '',
  };
  const brokerFetchMetrics = {
    oidc: {
      attempts: 0,
      success: 0,
      failure: 0,
      cacheHits: 0,
      staleFallbacks: 0,
      proactiveKicks: 0,
      lastAttemptAt: '',
      lastSuccessAt: '',
      lastFailureAt: '',
      lastFailureReason: '',
    },
    jwks: {
      attempts: 0,
      success: 0,
      failure: 0,
      cacheHits: 0,
      staleFallbacks: 0,
      proactiveKicks: 0,
      lastAttemptAt: '',
      lastSuccessAt: '',
      lastFailureAt: '',
      lastFailureReason: '',
    },
  };
  const brokerRefreshState = {
    oidcInFlight: false,
    jwksInFlight: false,
    lastOidcKickMs: 0,
    lastJwksKickMs: 0,
  };
  const brokerRecoveryState = {
    offline: false,
    offlineSinceAt: '',
    lastFailureAt: '',
    lastFailureReason: '',
    lastSuccessAt: '',
    lastRecoveredAt: '',
    consecutiveFailures: 0,
    attempts: 0,
    success: 0,
    failure: 0,
    inFlight: false,
    lastKickMs: 0,
    lastKickAt: '',
  };
  function getBrokerMetricSlot(kind) {
    return kind === 'oidc' || kind === 'jwks'
      ? brokerFetchMetrics[kind]
      : null;
  }
  function markBrokerFetchAttempt(kind) {
    const slot = getBrokerMetricSlot(kind);
    if (!slot) return;
    slot.attempts += 1;
    slot.lastAttemptAt = nowIso();
  }
  function markBrokerFetchSuccess(kind, { cacheHit = false, staleFallback = false, network = false } = {}) {
    const slot = getBrokerMetricSlot(kind);
    if (!slot) return;
    slot.success += 1;
    slot.lastSuccessAt = nowIso();
    if (cacheHit) slot.cacheHits += 1;
    if (staleFallback) slot.staleFallbacks += 1;
    if (network) {
      const at = nowIso();
      brokerRecoveryState.lastSuccessAt = at;
      brokerRecoveryState.consecutiveFailures = 0;
      if (brokerRecoveryState.offline) {
        brokerRecoveryState.offline = false;
        brokerRecoveryState.lastRecoveredAt = at;
        brokerRecoveryState.offlineSinceAt = '';
      }
    }
  }
  function markBrokerFetchFailure(kind, reason = '') {
    const slot = getBrokerMetricSlot(kind);
    if (!slot) return;
    const reasonText = String(reason || '').trim().slice(0, 200);
    slot.failure += 1;
    slot.lastFailureAt = nowIso();
    slot.lastFailureReason = reasonText;
    const at = nowIso();
    brokerRecoveryState.consecutiveFailures += 1;
    brokerRecoveryState.lastFailureAt = at;
    brokerRecoveryState.lastFailureReason = reasonText;
    if (!brokerRecoveryState.offline) {
      brokerRecoveryState.offline = true;
      brokerRecoveryState.offlineSinceAt = at;
    }
  }
  function markBrokerProactiveKick(kind) {
    const slot = getBrokerMetricSlot(kind);
    if (!slot) return;
    slot.proactiveKicks += 1;
  }
  function snapshotBrokerFetchMetrics(kind, inFlight = false) {
    const slot = getBrokerMetricSlot(kind);
    return {
      attempts: Number(slot?.attempts || 0),
      success: Number(slot?.success || 0),
      failure: Number(slot?.failure || 0),
      cacheHits: Number(slot?.cacheHits || 0),
      staleFallbacks: Number(slot?.staleFallbacks || 0),
      proactiveKicks: Number(slot?.proactiveKicks || 0),
      inFlight: inFlight === true,
      lastAttemptAt: String(slot?.lastAttemptAt || ''),
      lastSuccessAt: String(slot?.lastSuccessAt || ''),
      lastFailureAt: String(slot?.lastFailureAt || ''),
      lastFailureReason: String(slot?.lastFailureReason || ''),
    };
  }
  async function fetchBrokerOidcDiscovery({ forceRefresh = false } = {}) {
    const forced = forceRefresh === true;
    if (!brokerOidcDiscoveryEnabled || !brokerOidcDiscoveryUrl) {
      return { ok: false, reason: 'oidc_discovery_unavailable' };
    }
    const nowMs = Date.now();
    if (!forced && brokerOidcCache.jwksUri && brokerOidcCache.expiresAtMs > nowMs) {
      markBrokerFetchSuccess('oidc', { cacheHit: true });
      return {
        ok: true,
        reason: 'oidc_cache_hit',
        fromCache: true,
        jwksUri: brokerOidcCache.jwksUri,
        issuer: brokerOidcCache.issuer,
      };
    }
    if (typeof fetch !== 'function') {
      markBrokerFetchFailure('oidc', 'fetch_unavailable');
      return { ok: false, reason: 'fetch_unavailable' };
    }
    let timeoutId = null;
    let controller = null;
    try {
      markBrokerFetchAttempt('oidc');
      if (typeof AbortController === 'function') {
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          try {
            controller.abort();
          } catch {}
        }, brokerOidcDiscoveryTimeoutMs);
      }
      const headers = { Accept: 'application/json' };
      if (forced) {
        headers['Cache-Control'] = 'no-cache';
      }
      if (!forced && brokerOidcCache.etag) {
        headers['If-None-Match'] = brokerOidcCache.etag;
      }
      const response = await fetch(brokerOidcDiscoveryUrl, {
        method: 'GET',
        headers,
        signal: controller?.signal,
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (response.status === 304 && brokerOidcCache.jwksUri) {
        brokerOidcCache.expiresAtMs = nowMs + brokerOidcDiscoveryTtlSec * 1000;
        brokerOidcCache.fetchedAtMs = nowMs;
        brokerOidcCache.lastError = '';
        markBrokerFetchSuccess('oidc', { cacheHit: true, network: true });
        return {
          ok: true,
          reason: 'oidc_not_modified',
          fromCache: true,
          jwksUri: brokerOidcCache.jwksUri,
          issuer: brokerOidcCache.issuer,
        };
      }
      if (!response.ok) {
        throw new Error(`oidc_http_${response.status}`);
      }
      const body = await response.json();
      const jwksUri = sanitizeHttpUrl(body?.jwks_uri, MAX_BROKER_JWKS_URL_LEN);
      if (!jwksUri) {
        throw new Error('oidc_jwks_uri_missing');
      }
      const issuerInDoc = String(body?.issuer || '').trim().slice(0, MAX_BROKER_JWT_ISSUER_LEN);
      if (brokerJwtIssuer && issuerInDoc && issuerInDoc !== brokerJwtIssuer) {
        throw new Error('oidc_issuer_mismatch');
      }
      const etag = String(response.headers?.get?.('etag') || '').trim();
      brokerOidcCache.jwksUri = jwksUri;
      brokerOidcCache.issuer = issuerInDoc || brokerJwtIssuer || '';
      brokerOidcCache.expiresAtMs = nowMs + brokerOidcDiscoveryTtlSec * 1000;
      brokerOidcCache.fetchedAtMs = nowMs;
      brokerOidcCache.etag = etag || brokerOidcCache.etag;
      brokerOidcCache.lastError = '';
      markBrokerFetchSuccess('oidc', { network: true });
      return {
        ok: true,
        reason: 'oidc_ok',
        fromCache: false,
        jwksUri: brokerOidcCache.jwksUri,
        issuer: brokerOidcCache.issuer,
      };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const discoverReason = err?.name === 'AbortError'
        ? 'oidc_timeout'
        : String(err?.message || err || 'oidc_fetch_failed').slice(0, 160);
      brokerOidcCache.lastError = discoverReason;
      markBrokerFetchFailure('oidc', discoverReason);
      if (brokerOidcCache.jwksUri) {
        markBrokerFetchSuccess('oidc', { staleFallback: true });
        return {
          ok: true,
          reason: 'oidc_stale_cache',
          fromCache: true,
          stale: true,
          jwksUri: brokerOidcCache.jwksUri,
          issuer: brokerOidcCache.issuer,
        };
      }
      return { ok: false, reason: 'oidc_fetch_failed', detail: discoverReason };
    }
  }
  async function resolveBrokerJwksUrl({ forceOidcRefresh = false } = {}) {
    if (brokerJwtJwksUrl) {
      return { ok: true, source: 'static', url: brokerJwtJwksUrl };
    }
    const discovery = await fetchBrokerOidcDiscovery({ forceRefresh: forceOidcRefresh === true });
    if (discovery?.ok === true && discovery?.jwksUri) {
      return {
        ok: true,
        source: 'oidc_discovery',
        url: String(discovery.jwksUri || ''),
      };
    }
    return {
      ok: false,
      source: 'oidc_discovery',
      reason: String(discovery?.reason || 'jwks_url_missing'),
      detail: String(discovery?.detail || ''),
    };
  }
  async function fetchBrokerJwks({ forceRefresh = false } = {}) {
    const forced = forceRefresh === true;
    const jwksUrlResult = await resolveBrokerJwksUrl({ forceOidcRefresh: forced });
    if (!jwksUrlResult?.ok || !jwksUrlResult?.url) {
      const resolveReason = String(jwksUrlResult?.reason || 'jwks_url_missing');
      brokerJwksCache.lastError = resolveReason;
      markBrokerFetchFailure('jwks', resolveReason);
      if (Array.isArray(brokerJwksCache.keys) && brokerJwksCache.keys.length > 0) {
        markBrokerFetchSuccess('jwks', { staleFallback: true });
        return {
          ok: true,
          reason: 'jwks_stale_cache',
          keys: brokerJwksCache.keys,
          fromCache: true,
          stale: true,
        };
      }
      return { ok: false, reason: resolveReason, keys: [] };
    }
    const activeJwksUrl = String(jwksUrlResult.url || '').trim();
    if (!activeJwksUrl) {
      return { ok: false, reason: 'jwks_url_missing', keys: [] };
    }
    if (brokerJwksCache.sourceUrl !== activeJwksUrl) {
      brokerJwksCache.keys = [];
      brokerJwksCache.expiresAtMs = 0;
      brokerJwksCache.fetchedAtMs = 0;
      brokerJwksCache.etag = '';
      brokerJwksCache.sourceUrl = activeJwksUrl;
    }
    const nowMs = Date.now();
    if (
      !forced &&
      Array.isArray(brokerJwksCache.keys) &&
      brokerJwksCache.keys.length > 0 &&
      brokerJwksCache.expiresAtMs > nowMs
    ) {
      markBrokerFetchSuccess('jwks', { cacheHit: true });
      return { ok: true, reason: 'jwks_cache_hit', keys: brokerJwksCache.keys, fromCache: true };
    }
    if (typeof fetch !== 'function') {
      markBrokerFetchFailure('jwks', 'fetch_unavailable');
      return { ok: false, reason: 'fetch_unavailable', keys: [] };
    }
    let timeoutId = null;
    let controller = null;
    try {
      markBrokerFetchAttempt('jwks');
      if (typeof AbortController === 'function') {
        controller = new AbortController();
        timeoutId = setTimeout(() => {
          try {
            controller.abort();
          } catch {}
        }, brokerJwtJwksTimeoutMs);
      }
      const headers = { Accept: 'application/json' };
      if (forced) {
        headers['Cache-Control'] = 'no-cache';
      }
      if (!forced && brokerJwksCache.etag) {
        headers['If-None-Match'] = brokerJwksCache.etag;
      }
      const response = await fetch(activeJwksUrl, {
        method: 'GET',
        headers,
        signal: controller?.signal,
      });
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (response.status === 304 && Array.isArray(brokerJwksCache.keys) && brokerJwksCache.keys.length > 0) {
        brokerJwksCache.expiresAtMs = nowMs + brokerJwtJwksTtlSec * 1000;
        brokerJwksCache.fetchedAtMs = nowMs;
        brokerJwksCache.lastError = '';
        markBrokerFetchSuccess('jwks', { cacheHit: true, network: true });
        return { ok: true, reason: 'jwks_not_modified', keys: brokerJwksCache.keys, fromCache: true };
      }
      if (!response.ok) {
        throw new Error(`jwks_http_${response.status}`);
      }

      const body = await response.json();
      const keys = Array.isArray(body?.keys)
        ? body.keys.filter((key) => key && typeof key === 'object')
        : [];
      if (keys.length <= 0) {
        throw new Error('jwks_empty');
      }
      const etag = String(response.headers?.get?.('etag') || '').trim();
      brokerJwksCache.keys = keys;
      brokerJwksCache.expiresAtMs = nowMs + brokerJwtJwksTtlSec * 1000;
      brokerJwksCache.fetchedAtMs = nowMs;
      brokerJwksCache.sourceUrl = activeJwksUrl;
      brokerJwksCache.etag = etag || brokerJwksCache.etag;
      brokerJwksCache.lastError = '';
      markBrokerFetchSuccess('jwks', { network: true });
      return { ok: true, reason: 'jwks_ok', keys, fromCache: false };
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      const fetchReason = err?.name === 'AbortError'
        ? 'jwks_timeout'
        : String(err?.message || err || 'jwks_fetch_failed').slice(0, 160);
      brokerJwksCache.lastError = fetchReason;
      markBrokerFetchFailure('jwks', fetchReason);
      if (Array.isArray(brokerJwksCache.keys) && brokerJwksCache.keys.length > 0) {
        markBrokerFetchSuccess('jwks', { staleFallback: true });
        return {
          ok: true,
          reason: 'jwks_stale_cache',
          keys: brokerJwksCache.keys,
          fromCache: true,
          stale: true,
        };
      }
      return { ok: false, reason: 'jwks_fetch_failed', detail: fetchReason, keys: [] };
    }
  }
  const brokerJwtConfig = {
    enabled: brokerJwtAllowedAlgs.length > 0,
    secret: brokerJwtSecret,
    jwksUrl: brokerJwtJwksUrl,
    jwksTtlSec: brokerJwtJwksTtlSec,
    jwksTimeoutMs: brokerJwtJwksTimeoutMs,
    oidcDiscoveryEnabled: brokerOidcDiscoveryEnabled,
    oidcDiscoveryUrl: brokerOidcDiscoveryUrl,
    oidcDiscoveryTtlSec: brokerOidcDiscoveryTtlSec,
    oidcDiscoveryTimeoutMs: brokerOidcDiscoveryTimeoutMs,
    allowedAlgs: new Set(brokerJwtAllowedAlgs),
    getJwks: brokerJwtAllowedAlgs.includes('RS256') ? fetchBrokerJwks : null,
    issuer: brokerJwtIssuer,
    audience: brokerJwtAudience,
    clockSkewSec: brokerJwtClockSkewSec,
  };
  const brokerAuthMode = brokerToken && brokerJwtConfig.enabled
    ? 'static_or_jwt'
    : (brokerToken
      ? 'static'
      : (brokerJwtConfig.enabled ? 'jwt' : 'none'));
  function getBrokerEffectiveJwksUrl() {
    return String(
      brokerJwksCache.sourceUrl ||
      brokerJwtConfig.jwksUrl ||
      brokerOidcCache.jwksUri ||
      ''
    ).trim();
  }
  function getBrokerJwksSource() {
    const effective = getBrokerEffectiveJwksUrl();
    if (!effective) return '';
    if (brokerJwtConfig.jwksUrl && effective === brokerJwtConfig.jwksUrl) return 'static';
    return 'oidc_discovery';
  }
  function shouldBrokerRefreshCache(cacheExpiresAtMs, leadSec, nowMs) {
    const expiryMs = Number(cacheExpiresAtMs);
    const safeLeadSec = Number.isFinite(Number(leadSec))
      ? Math.max(0, Math.trunc(Number(leadSec)))
      : 0;
    if (!Number.isFinite(expiryMs) || expiryMs <= 0) return true;
    return expiryMs <= (nowMs + safeLeadSec * 1000);
  }
  async function runBrokerOfflineRecovery(nowMs = Date.now()) {
    if (!brokerJwtConfig.allowedAlgs.has('RS256')) return;
    const nowValue = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
    brokerRecoveryState.inFlight = true;
    brokerRecoveryState.lastKickMs = nowValue;
    brokerRecoveryState.lastKickAt = nowIso();
    brokerRecoveryState.attempts += 1;
    const startedOffline = brokerRecoveryState.offline === true;
    try {
      if (brokerOidcDiscoveryEnabled && !brokerJwtJwksUrl) {
        await fetchBrokerOidcDiscovery({ forceRefresh: true });
      }
      await fetchBrokerJwks({ forceRefresh: true });
      if (startedOffline && brokerRecoveryState.offline !== true) {
        brokerRecoveryState.success += 1;
      } else if (brokerRecoveryState.offline === true) {
        brokerRecoveryState.failure += 1;
      }
    } catch (err) {
      brokerRecoveryState.failure += 1;
      const reason = String(err?.message || err || '').trim().slice(0, 200);
      if (reason) {
        brokerRecoveryState.lastFailureReason = reason;
      }
    } finally {
      brokerRecoveryState.inFlight = false;
    }
  }
  function maybeStartBrokerProactiveRefresh(nowMs = Date.now()) {
    if (!brokerJwtConfig.allowedAlgs.has('RS256')) return;
    const nowValue = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();

    const canKickOidc = (
      brokerOidcDiscoveryEnabled &&
      !!brokerOidcDiscoveryUrl &&
      shouldBrokerRefreshCache(brokerOidcCache.expiresAtMs, brokerOidcRefreshLeadSec, nowValue) &&
      !brokerRefreshState.oidcInFlight &&
      (nowValue - brokerRefreshState.lastOidcKickMs) >= brokerMetadataRefreshMinIntervalMs
    );
    if (canKickOidc) {
      brokerRefreshState.oidcInFlight = true;
      brokerRefreshState.lastOidcKickMs = nowValue;
      markBrokerProactiveKick('oidc');
      fetchBrokerOidcDiscovery()
        .catch(() => {})
        .finally(() => {
          brokerRefreshState.oidcInFlight = false;
        });
    }

    const hasJwksCandidate = !!brokerJwtJwksUrl || !!brokerOidcCache.jwksUri || !!brokerOidcDiscoveryUrl;
    const needsJwksRefresh = (
      !Array.isArray(brokerJwksCache.keys) ||
      brokerJwksCache.keys.length <= 0 ||
      shouldBrokerRefreshCache(brokerJwksCache.expiresAtMs, brokerJwksRefreshLeadSec, nowValue)
    );
    const canKickJwks = (
      hasJwksCandidate &&
      needsJwksRefresh &&
      !brokerRefreshState.jwksInFlight &&
      (nowValue - brokerRefreshState.lastJwksKickMs) >= brokerMetadataRefreshMinIntervalMs
    );
    if (canKickJwks) {
      brokerRefreshState.jwksInFlight = true;
      brokerRefreshState.lastJwksKickMs = nowValue;
      markBrokerProactiveKick('jwks');
      fetchBrokerJwks()
        .catch(() => {})
        .finally(() => {
          brokerRefreshState.jwksInFlight = false;
        });
    }

    const canKickOfflineRecovery = (
      brokerRecoveryState.offline === true &&
      !brokerRecoveryState.inFlight &&
      (nowValue - brokerRecoveryState.lastKickMs) >= brokerOfflineRecoveryIntervalMs
    );
    if (canKickOfflineRecovery) {
      runBrokerOfflineRecovery(nowValue).catch(() => {});
    }
  }
  function buildBrokerConnectivitySnapshot({
    requestTransportSecure = false,
    clientCertVerified = false,
    clientCertAccepted = false,
    clientCertSource = '',
    clientCertSubject = '',
    clientCertIssuer = '',
    clientCertFingerprintSha256 = '',
    clientCertPolicyReason = '',
  } = {}) {
    return {
      brokerTokenRequired,
      brokerAuthMode,
      brokerTokenHeader: BROKER_TOKEN_HEADER,
      brokerJwtEnabled: brokerJwtConfig.enabled === true,
      brokerJwtAlgs: Array.from(brokerJwtConfig.allowedAlgs || []),
      brokerJwtIssuer: brokerJwtConfig.issuer || '',
      brokerJwtAudience: brokerJwtConfig.audience || '',
      brokerJwtClockSkewSec: brokerJwtConfig.clockSkewSec,
      brokerJwtJwksUrl: brokerJwtConfig.jwksUrl || '',
      brokerJwtJwksEffectiveUrl: getBrokerEffectiveJwksUrl(),
      brokerJwtJwksSource: getBrokerJwksSource(),
      brokerJwtJwksTtlSec: brokerJwtConfig.jwksTtlSec,
      brokerJwtJwksTimeoutMs: brokerJwtConfig.jwksTimeoutMs,
      brokerJwtJwksRefreshLeadSec: brokerJwksRefreshLeadSec,
      brokerJwtJwksCachedKeys: Array.isArray(brokerJwksCache.keys) ? brokerJwksCache.keys.length : 0,
      brokerJwtJwksCacheExpiresAt: brokerJwksCache.expiresAtMs > 0
        ? new Date(brokerJwksCache.expiresAtMs).toISOString()
        : '',
      brokerJwtJwksLastError: String(brokerJwksCache.lastError || ''),
      brokerOidcDiscoveryEnabled: brokerJwtConfig.oidcDiscoveryEnabled === true,
      brokerOidcDiscoveryUrl: brokerJwtConfig.oidcDiscoveryUrl || '',
      brokerOidcDiscoveryTtlSec: brokerJwtConfig.oidcDiscoveryTtlSec,
      brokerOidcDiscoveryTimeoutMs: brokerJwtConfig.oidcDiscoveryTimeoutMs,
      brokerOidcDiscoveryRefreshLeadSec: brokerOidcRefreshLeadSec,
      brokerOidcDiscoveryResolvedJwksUrl: String(brokerOidcCache.jwksUri || ''),
      brokerOidcDiscoveryCacheExpiresAt: brokerOidcCache.expiresAtMs > 0
        ? new Date(brokerOidcCache.expiresAtMs).toISOString()
        : '',
      brokerOidcDiscoveryLastError: String(brokerOidcCache.lastError || ''),
      brokerMetadataRefreshMinIntervalMs,
      brokerOfflineRecoveryIntervalMs,
      brokerFetchMetrics: {
        jwks: snapshotBrokerFetchMetrics('jwks', brokerRefreshState.jwksInFlight),
        oidc: snapshotBrokerFetchMetrics('oidc', brokerRefreshState.oidcInFlight),
      },
      brokerRecovery: {
        offline: brokerRecoveryState.offline === true,
        offlineSinceAt: String(brokerRecoveryState.offlineSinceAt || ''),
        lastFailureAt: String(brokerRecoveryState.lastFailureAt || ''),
        lastFailureReason: String(brokerRecoveryState.lastFailureReason || ''),
        lastSuccessAt: String(brokerRecoveryState.lastSuccessAt || ''),
        lastRecoveredAt: String(brokerRecoveryState.lastRecoveredAt || ''),
        consecutiveFailures: Math.max(0, Math.trunc(Number(brokerRecoveryState.consecutiveFailures) || 0)),
        attempts: Math.max(0, Math.trunc(Number(brokerRecoveryState.attempts) || 0)),
        success: Math.max(0, Math.trunc(Number(brokerRecoveryState.success) || 0)),
        failure: Math.max(0, Math.trunc(Number(brokerRecoveryState.failure) || 0)),
        inFlight: brokerRecoveryState.inFlight === true,
        lastKickAt: String(brokerRecoveryState.lastKickAt || ''),
      },
      secureTransportRequired: brokerRequireSecureTransport,
      secureTransportDetected: requestTransportSecure,
      clientCertRequired: requireClientCert,
      clientCertVerified,
      clientCertAccepted,
      clientCertSource,
      clientCertSubject,
      clientCertIssuer,
      clientCertFingerprintSha256,
      clientCertPolicyReason: String(clientCertPolicyReason || ''),
      clientCertHeaderTrusted: trustProxyClientCertHeaders,
      clientCertPolicyConfigured: (
        allowedClientCertSubjects.size > 0 ||
        allowedClientCertIssuers.size > 0 ||
        allowedClientCertFingerprintsSha256.size > 0
      ),
      clientCertAllowedSubjectsCount: allowedClientCertSubjects.size,
      clientCertAllowedIssuersCount: allowedClientCertIssuers.size,
      clientCertAllowedFingerprintsCount: allowedClientCertFingerprintsSha256.size,
    };
  }
  const brokerTokenRequired = brokerAuthMode !== 'none';
  const brokerRequireSecureTransport = parseBooleanFlag(
    process.env.UU_POSTPROD_BROKER_REQUIRE_SECURE_TRANSPORT,
    brokerTokenRequired
  );
  const requireClientCert = parseBooleanFlag(
    process.env.UU_POSTPROD_REQUIRE_CLIENT_CERT,
    false
  );
  const trustProxyClientCertHeaders = parseBooleanFlag(
    process.env.UU_POSTPROD_TRUST_PROXY_CLIENT_CERT_HEADERS,
    true
  );
  const allowedClientCertSubjects = parseNormalizedEnvSet(
    process.env.UU_POSTPROD_ALLOWED_CLIENT_CERT_SUBJECTS,
    normalizeDistinguishedNameKey
  );
  const allowedClientCertIssuers = parseNormalizedEnvSet(
    process.env.UU_POSTPROD_ALLOWED_CLIENT_CERT_ISSUERS,
    normalizeDistinguishedNameKey
  );
  const allowedClientCertFingerprintsSha256 = parseNormalizedEnvSet(
    process.env.UU_POSTPROD_ALLOWED_CLIENT_CERT_FINGERPRINTS_SHA256,
    normalizeClientCertFingerprintSha256
  );
  maybeStartBrokerProactiveRefresh(Date.now());

  const dbPath = path.join(rootDataDir, 'postprod.sqlite');
  let db;
  try {
    fs.mkdirSync(rootDataDir, { recursive: true });
    db = new BetterSqlite3(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    ensureSchema(db, logLine);
  } catch (err) {
    const reason = `Impossible d'initialiser SQLite (${dbPath}): ${String(err?.message || err)}`;
    logLine({
      level: 'error',
      src: 'postprod',
      action: 'db_init_failed',
      message: reason,
    });
    return {
      available: false,
      dbPath,
      handleRoutes: buildUnavailableHandler(reason),
    };
  }

  const stmts = createStatements(db);
  let rolesCache = buildRolesCache(stmts.listRoles.all());
  const replaceRenderFormFieldsTx = db.transaction((formId, normalizedFields, nowIsoValue) => {
    stmts.deleteRenderFormFieldsByFormId.run(formId);
    for (const field of normalizedFields) {
      stmts.insertRenderFormField.run(
        formId,
        field.fieldKey,
        field.fieldLabel,
        field.sourcePath,
        field.sourceType,
        field.inputKind,
        field.valueType,
        field.groupName,
        field.payloadKey,
        field.placeholder,
        field.helpText,
        field.optionsJson,
        field.validationJson,
        field.defaultValueJson,
        field.isRequired ? 1 : 0,
        field.isVisible ? 1 : 0,
        field.sortOrder,
        nowIsoValue,
        nowIsoValue
      );
    }
  });

  function refreshRolesCache() {
    rolesCache = buildRolesCache(stmts.listRoles.all());
    return rolesCache;
  }

  try {
    const count = Number(stmts.countUsers.get()?.n || 0);
    if (count <= 0) {
      const username = normalizeUsername(process.env.UU_POSTPROD_BOOTSTRAP_USER || DEFAULT_BOOTSTRAP_USER);
      const rawPassword = String(process.env.UU_POSTPROD_BOOTSTRAP_PASSWORD || DEFAULT_BOOTSTRAP_PASSWORD);
      const role = resolveRoleInput(
        process.env.UU_POSTPROD_BOOTSTRAP_ROLE || DEFAULT_BOOTSTRAP_ROLE,
        rolesCache,
        SYSTEM_MAINTENANCE_ROLE
      ) || SYSTEM_MAINTENANCE_ROLE;
      const now = nowIso();
      const publicId = buildPublicId();
      stmts.insertUser.run(
        publicId,
        username || DEFAULT_BOOTSTRAP_USER,
        hashPassword(rawPassword, pbkdf2Iters),
        role,
        1,
        'Maintenance',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        0,
        0,
        null,
        now,
        now
      );
      const bootstrapUser = stmts.findUserByUsername.get(username || DEFAULT_BOOTSTRAP_USER);
      const bootstrapUserId = Number(bootstrapUser?.id || 0);
      if (Number.isFinite(bootstrapUserId) && bootstrapUserId > 0) {
        stmts.upsertUserPreferences.run(
          bootstrapUserId,
          '',
          DEFAULT_USER_LANGUAGE,
          '{}',
          now,
          now
        );
      }
      logLine({
        level: 'warn',
        src: 'postprod',
        action: 'bootstrap_user_created',
        message: `Utilisateur bootstrap cree (${username || DEFAULT_BOOTSTRAP_USER})`,
        data: { role },
      });
    }
  } catch (err) {
    logLine({
      level: 'error',
      src: 'postprod',
      action: 'bootstrap_user_failed',
      message: `Creation utilisateur bootstrap impossible: ${String(err?.message || err)}`,
    });
  }

  function audit(actorUserId, action, payload = {}, scopeType = 'auth', scopeId = '') {
    try {
      stmts.insertAudit.run(
        Number.isFinite(Number(actorUserId)) ? Number(actorUserId) : null,
        String(action || ''),
        String(scopeType || 'auth'),
        String(scopeId || ''),
        JSON.stringify(payload || {}),
        nowIso()
      );
    } catch {}
  }
  const renderDetectedScanState = {
    lastRunMs: 0,
    lastSummary: null,
  };
  let renderDetectedAutoScanTimer = null;
  let renderDetectedAutoScanBusy = false;
  const resourcesIndexSyncState = {
    lastRunMs: 0,
    lastSummary: null,
    busy: false,
  };

  function maybeSyncResourcesIndexFromLibrary({
    force = false,
    actorUserId = null,
  } = {}) {
    const nowMs = Date.now();
    const previous = (
      resourcesIndexSyncState.lastSummary &&
      typeof resourcesIndexSyncState.lastSummary === 'object'
    )
      ? resourcesIndexSyncState.lastSummary
      : null;
    if (resourcesIndexSyncState.busy) {
      return {
        ok: true,
        skipped: true,
        reason: 'busy',
        previous,
      };
    }
    if (!force && (nowMs - Number(resourcesIndexSyncState.lastRunMs || 0)) < resourcesIndexAutoSyncIntervalMs) {
      return {
        ok: true,
        skipped: true,
        reason: 'interval',
        previous,
      };
    }
    resourcesIndexSyncState.busy = true;
    resourcesIndexSyncState.lastRunMs = nowMs;
    const now = nowIso();
    let summary = null;
    try {
      const syncResult = syncResourcesIndexFromLibrary(stmts, sharedStore, { now });
      const safeActorUserId = Number(actorUserId || 0);
      const countAfter = Number(stmts.countResourcesIndex.get()?.n || 0);
      summary = {
        ok: syncResult.ok === true,
        skipped: false,
        reason: syncResult.ok ? 'synced' : String(syncResult.error || 'sync_failed'),
        processed: Number(syncResult.processed || 0),
        inserted: Number(syncResult.inserted || 0),
        updated: Number(syncResult.updated || 0),
        totalSource: Number(syncResult.totalSource || 0),
        countAfter,
        at: now,
      };
      if (syncResult.ok && safeActorUserId > 0 && (summary.inserted > 0 || summary.updated > 0)) {
        audit(
          safeActorUserId,
          'resources_reindexed_auto',
          {
            processed: summary.processed,
            inserted: summary.inserted,
            updated: summary.updated,
            countAfter,
          },
          'resource',
          ''
        );
      }
      if (!syncResult.ok) {
        summary.error = String(syncResult.error || 'sync_failed');
      }
    } catch (err) {
      summary = {
        ok: false,
        skipped: false,
        reason: 'sync_failed',
        error: String(err?.message || err || 'sync_failed').slice(0, 240),
        at: now,
      };
    } finally {
      resourcesIndexSyncState.busy = false;
    }
    resourcesIndexSyncState.lastSummary = summary;
    return summary;
  }

  function resolveRenderDetectedActorUserId(preferredUserId = null) {
    const direct = Number(preferredUserId || 0);
    if (Number.isFinite(direct) && direct > 0) return direct;
    const preferred = stmts.findRenderDetectionPreferredActor.get();
    const preferredId = Number(preferred?.id || 0);
    if (Number.isFinite(preferredId) && preferredId > 0) return preferredId;
    const fallback = stmts.findRenderDetectionFallbackActor.get();
    const fallbackId = Number(fallback?.id || 0);
    if (Number.isFinite(fallbackId) && fallbackId > 0) return fallbackId;
    return 0;
  }

  function listRenderDetectedFileCandidates(detectedRoots = null) {
    const out = [];
    const allowedExtensions = renderDetectedExtensions instanceof Set
      ? renderDetectedExtensions
      : new Set(DEFAULT_RENDER_DETECTED_EXTENSIONS);
    const roots = Array.isArray(detectedRoots) && detectedRoots.length > 0
      ? detectedRoots
      : resolveRenderDetectedRoots();
    const stack = [];
    for (const root of roots) {
      const absRoot = String(root || '').trim();
      if (!absRoot) continue;
      if (!fs.existsSync(absRoot)) continue;
      stack.push({ sourceDir: absRoot, currentDir: absRoot });
    }
    while (stack.length > 0 && out.length < renderDetectedScanMaxFiles) {
      const next = stack.pop();
      if (!next || !next.currentDir) continue;
      let entries = [];
      try {
        entries = fs.readdirSync(next.currentDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry || !entry.name) continue;
        const absPath = path.join(next.currentDir, entry.name);
        if (entry.isDirectory()) {
          stack.push({ sourceDir: next.sourceDir, currentDir: absPath });
          continue;
        }
        if (!entry.isFile()) continue;
        const ext = String(path.extname(entry.name || '') || '').trim().toLowerCase();
        if (allowedExtensions.size > 0 && ext && !allowedExtensions.has(ext)) continue;
        if (allowedExtensions.size > 0 && !ext) continue;
        let stat = null;
        try {
          stat = fs.statSync(absPath);
        } catch {
          stat = null;
        }
        if (!stat || !stat.isFile()) continue;
        const size = Math.max(0, Math.trunc(Number(stat.size) || 0));
        const mtimeIso = Number.isFinite(Number(stat.mtimeMs))
          ? new Date(Number(stat.mtimeMs)).toISOString()
          : nowIso();
        const relPath = (() => {
          try {
            return path.relative(next.sourceDir, absPath);
          } catch {
            return entry.name;
          }
        })();
        out.push({
          sourceDir: next.sourceDir,
          filePath: absPath,
          relativePath: String(relPath || entry.name || '').replace(/\\/g, '/'),
          fileName: String(entry.name || '').trim(),
          fileExt: ext,
          fileSize: size,
          fileMtimeAt: mtimeIso,
        });
        if (out.length >= renderDetectedScanMaxFiles) break;
      }
    }
    out.sort((a, b) => String(a.fileMtimeAt || '').localeCompare(String(b.fileMtimeAt || '')));
    return out;
  }

  function resolveDetectedRenderProjectName(candidate) {
    const relative = String(candidate?.relativePath || '').replace(/\\/g, '/');
    const firstSegment = relative.split('/').map((item) => String(item || '').trim()).filter(Boolean)[0] || '';
    if (!firstSegment) return '';
    const resolved = resolveProjectForRender(sharedStore, firstSegment, stmts);
    if (resolved?.ok && resolved?.project) {
      const projectRef = String(resolved.project.id || resolved.project.name || firstSegment).trim();
      return sanitizeRenderProjectName(projectRef);
    }
    return sanitizeRenderProjectName(firstSegment);
  }

  function resolveDetectedRenderTemplateName(candidate) {
    const filename = String(candidate?.fileName || '').trim();
    const withoutExt = filename.replace(/\.[^/.]+$/g, '').replace(/\s+/g, ' ').trim();
    return sanitizeRenderTemplateName(withoutExt, DEFAULT_RENDER_DETECTED_TEMPLATE_NAME);
  }

  function importDetectedRenderOutputs({
    actorUserId = null,
    force = false,
  } = {}) {
    const detectedRoots = resolveRenderDetectedRoots();
    const nowMs = Date.now();
    const previous = renderDetectedScanState.lastSummary && typeof renderDetectedScanState.lastSummary === 'object'
      ? renderDetectedScanState.lastSummary
      : null;
    if (!force && (nowMs - Number(renderDetectedScanState.lastRunMs || 0)) < renderDetectedScanIntervalMs) {
      return {
        ok: true,
        skipped: true,
        reason: 'interval',
        imported: 0,
        duplicates: 0,
        errors: 0,
        matched: 0,
        unmatched: 0,
        scanned: 0,
        roots: detectedRoots,
        maxFiles: renderDetectedScanMaxFiles,
        scanIntervalMs: renderDetectedScanIntervalMs,
        at: nowIso(),
        previous,
      };
    }
    renderDetectedScanState.lastRunMs = nowMs;
    const effectiveActorUserId = resolveRenderDetectedActorUserId(actorUserId);
    if (!Number.isFinite(effectiveActorUserId) || effectiveActorUserId <= 0) {
      const missingUserSummary = {
        ok: false,
        skipped: true,
        reason: 'missing_actor_user',
        imported: 0,
        duplicates: 0,
        errors: 0,
        matched: 0,
        unmatched: 0,
        scanned: 0,
        roots: detectedRoots,
        maxFiles: renderDetectedScanMaxFiles,
        scanIntervalMs: renderDetectedScanIntervalMs,
        at: nowIso(),
      };
      renderDetectedScanState.lastSummary = missingUserSummary;
      return missingUserSummary;
    }
    const candidates = listRenderDetectedFileCandidates(detectedRoots);
    const taskMatchCatalog = buildExpectedRenderTaskMatchCatalog(stmts);
    const taskDetectedProgressById = new Map();
    const tx = db.transaction((payload) => {
      const signature = String(payload.signature || '').trim();
      const exists = stmts.findRenderDetectedFileBySignature.get(signature);
      if (exists) return { duplicate: true, renderId: Number(exists?.render_job_id || 0) };
      const createdAt = String(payload.createdAt || nowIso()).trim() || nowIso();
      const insertRes = stmts.insertRenderJob.run(
        payload.projectName,
        payload.templateName,
        payload.renderPayloadJson,
        'Done',
        'to_validate',
        payload.actorUserId,
        null,
        1,
        payload.outputPath,
        '',
        payload.finishedAt,
        payload.finishedAt,
        createdAt,
        createdAt
      );
      const renderId = Number(insertRes?.lastInsertRowid || 0);
      stmts.insertRenderJobEvent.run(
        renderId,
        'Queued',
        'Done',
        payload.actorUserId,
        'detected_output_import',
        createdAt
      );
      stmts.insertRenderDetectedFile.run(
        signature,
        payload.sourceDir,
        payload.filePath,
        payload.projectName,
        payload.templateName,
        payload.fileName,
        payload.fileExt,
        payload.fileSize,
        payload.fileMtimeAt,
        renderId,
        payload.matchedTaskId,
        payload.matchedExpectedRenderName,
        'imported',
        '',
        createdAt,
        createdAt
      );
      return { duplicate: false, renderId };
    });

    let imported = 0;
    let duplicates = 0;
    let errors = 0;
    let matched = 0;
    let unmatched = 0;
    for (const candidate of candidates) {
      const signature = buildRenderDetectedFileSignature(
        candidate.filePath,
        candidate.fileSize,
        candidate.fileMtimeAt
      );
      const projectName = resolveDetectedRenderProjectName(candidate);
      const templateName = resolveDetectedRenderTemplateName(candidate);
      const filePath = sanitizeRenderOutputPath(candidate.filePath);
      const sourceDir = sanitizeRenderOutputPath(candidate.sourceDir);
      const fileName = String(candidate.fileName || '').trim().slice(0, 260);
      const fileExt = String(candidate.fileExt || '').trim().slice(0, 32).toLowerCase();
      const fileSize = Math.max(0, Math.trunc(Number(candidate.fileSize) || 0));
      const fileMtimeAt = String(candidate.fileMtimeAt || '').trim();
      const taskMatch = findExpectedRenderTaskMatch(taskMatchCatalog, fileName);
      const matchedTaskId = Number(taskMatch?.taskId || 0);
      const hasMatchedTask = Number.isFinite(matchedTaskId) && matchedTaskId > 0;
      const matchedExpectedRenderName = hasMatchedTask
        ? sanitizeTaskExpectedRenderName(taskMatch?.expectedRenderName)
        : '';
      const matchedTaskExpectedRenderCount = hasMatchedTask
        ? normalizeTaskExpectedRenderCount(
          taskMatch?.expectedRenderCount,
          taskMatch?.requestType,
          1
        )
        : 0;
      let matchedTaskDetectedBefore = 0;
      if (hasMatchedTask) {
        if (!taskDetectedProgressById.has(matchedTaskId)) {
          const existingCountRow = stmts.countRenderDetectedFilesByTaskId.get(matchedTaskId);
          const existingCount = Number(existingCountRow?.n || 0);
          taskDetectedProgressById.set(
            matchedTaskId,
            Number.isFinite(existingCount) && existingCount > 0 ? Math.trunc(existingCount) : 0
          );
        }
        matchedTaskDetectedBefore = Number(taskDetectedProgressById.get(matchedTaskId) || 0);
      }
      const payloadObj = {
        source: 'detected_file',
        filePath,
        fileName,
        fileExt,
        fileSize,
        fileMtimeAt,
      };
      if (hasMatchedTask) {
        payloadObj.taskId = matchedTaskId;
        payloadObj.taskTitle = String(taskMatch?.taskTitle || '');
        payloadObj.taskStatus = String(taskMatch?.taskStatus || '');
        payloadObj.matchedExpectedRenderName = matchedExpectedRenderName;
        payloadObj.taskExpectedRenderCount = matchedTaskExpectedRenderCount;
        payloadObj.taskDetectedRenderCount = matchedTaskDetectedBefore + 1;
      }
      let renderPayloadJson = '{}';
      try {
        renderPayloadJson = JSON.stringify(payloadObj);
      } catch {
        renderPayloadJson = '{}';
      }
      try {
        const result = tx({
          signature,
          sourceDir,
          filePath,
          projectName,
          templateName,
          fileName,
          fileExt,
          fileSize,
          fileMtimeAt,
          outputPath: filePath,
          finishedAt: fileMtimeAt || nowIso(),
          actorUserId: effectiveActorUserId,
          createdAt: nowIso(),
          renderPayloadJson,
          matchedTaskId: hasMatchedTask ? matchedTaskId : null,
          matchedExpectedRenderName,
        });
        if (result?.duplicate) {
          duplicates += 1;
        } else {
          imported += 1;
          if (hasMatchedTask) {
            matched += 1;
            taskDetectedProgressById.set(matchedTaskId, matchedTaskDetectedBefore + 1);
          } else {
            unmatched += 1;
          }
        }
      } catch (err) {
        const msg = String(err?.message || err);
        if (/unique/i.test(msg)) {
          duplicates += 1;
          continue;
        }
        errors += 1;
      }
    }
    if (imported > 0) {
      audit(
        effectiveActorUserId,
          'render_detected_imported',
          {
            imported,
            duplicates,
            errors,
            matched,
            unmatched,
            scanned: candidates.length,
            roots: detectedRoots,
          },
        'render',
        ''
      );
    }
    const summary = {
      ok: true,
      skipped: false,
      reason: '',
      imported,
      duplicates,
      errors,
      matched,
      unmatched,
      scanned: candidates.length,
      roots: detectedRoots,
      maxFiles: renderDetectedScanMaxFiles,
      scanIntervalMs: renderDetectedScanIntervalMs,
      at: nowIso(),
    };
    renderDetectedScanState.lastSummary = summary;
    return summary;
  }

  function runRenderDetectedAutoScan({ force = true } = {}) {
    if (renderDetectedAutoScanBusy) return;
    renderDetectedAutoScanBusy = true;
    try {
      const summary = importDetectedRenderOutputs({ force });
      if (Number(summary?.imported || 0) > 0 || Number(summary?.errors || 0) > 0) {
        logLine({
          level: Number(summary?.errors || 0) > 0 ? 'warn' : 'info',
          src: 'postprod',
          action: 'render_detected_auto_scan',
          message: `Scan auto rendus detectes: +${Number(summary?.imported || 0)} / dup ${Number(summary?.duplicates || 0)} / err ${Number(summary?.errors || 0)}`,
          data: summary,
        });
      }
    } catch (err) {
      logLine({
        level: 'warn',
        src: 'postprod',
        action: 'render_detected_auto_scan_failed',
        message: `Scan auto rendus detectes impossible: ${String(err?.message || err)}`,
      });
    } finally {
      renderDetectedAutoScanBusy = false;
    }
  }

  function startRenderDetectedAutoScanLoop() {
    const intervalMs = Math.max(
      MIN_RENDER_DETECTED_SCAN_INTERVAL_MS,
      Math.min(MAX_RENDER_DETECTED_SCAN_INTERVAL_MS, Math.trunc(Number(renderDetectedScanIntervalMs) || DEFAULT_RENDER_DETECTED_SCAN_INTERVAL_MS))
    );
    const firstDelayMs = Math.min(5000, Math.max(1000, Math.trunc(intervalMs / 2)));
    const scheduleNext = (delayMs = intervalMs) => {
      if (renderDetectedAutoScanTimer) clearTimeout(renderDetectedAutoScanTimer);
      renderDetectedAutoScanTimer = setTimeout(() => {
        runRenderDetectedAutoScan({ force: true });
        scheduleNext(intervalMs);
      }, Math.max(1000, Math.trunc(Number(delayMs) || intervalMs)));
      if (typeof renderDetectedAutoScanTimer?.unref === 'function') {
        renderDetectedAutoScanTimer.unref();
      }
    };
    scheduleNext(firstDelayMs);
  }
  maybeSyncResourcesIndexFromLibrary({ force: true });
  startRenderDetectedAutoScanLoop();

  const hubHealthAuditState = {
    signature: '',
    state: '',
    kind: '',
    changedAt: '',
  };
  const renderHealthAuditCleanupState = {
    nextAtMs: 0,
    lastRunAt: '',
    lastDeleted: 0,
  };

  function getRenderHealthAuditMaintenanceSnapshot(now = nowIso()) {
    const enabled = Number.isFinite(renderHealthEventRetentionDays) && renderHealthEventRetentionDays > 0;
    const nextCleanupAt = Number(renderHealthAuditCleanupState.nextAtMs || 0) > 0
      ? new Date(Number(renderHealthAuditCleanupState.nextAtMs || 0)).toISOString()
      : '';
    let currentCount = 0;
    try {
      const row = stmts.countAuditEntriesByAction.get(POSTPROD_RENDER_HEALTH_AUDIT_ACTION);
      currentCount = Number.isFinite(Number(row?.n)) ? Math.max(0, Math.trunc(Number(row.n))) : 0;
    } catch {
      currentCount = 0;
    }
    return {
      action: POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
      enabled,
      retentionDays: renderHealthEventRetentionDays,
      cleanupIntervalMs: renderHealthEventCleanupIntervalMs,
      now: String(now || '').trim() || nowIso(),
      nextCleanupAt,
      lastRunAt: String(renderHealthAuditCleanupState.lastRunAt || '').trim(),
      lastDeleted: Math.max(0, Math.trunc(Number(renderHealthAuditCleanupState.lastDeleted) || 0)),
      currentCount,
    };
  }

  function maybePurgeRenderHealthAuditEvents(now = nowIso(), { force = false } = {}) {
    if (!Number.isFinite(renderHealthEventRetentionDays) || renderHealthEventRetentionDays <= 0) {
      return {
        deleted: 0,
        cutoff: '',
        skipped: true,
        reason: 'disabled',
      };
    }
    const nowMs = Date.parse(String(now || ''));
    const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (!force && safeNowMs < Number(renderHealthAuditCleanupState.nextAtMs || 0)) {
      return {
        deleted: 0,
        cutoff: '',
        skipped: true,
        reason: 'interval',
      };
    }
    renderHealthAuditCleanupState.nextAtMs = safeNowMs + renderHealthEventCleanupIntervalMs;
    const cutoff = subtractDays(now, renderHealthEventRetentionDays, DEFAULT_RENDER_HEALTH_EVENT_RETENTION_DAYS);
    let deleted = 0;
    try {
      const result = stmts.deleteAuditEntriesByActionBefore.run(
        POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
        cutoff
      );
      deleted = Math.max(0, Math.trunc(Number(result?.changes || 0)));
    } catch {
      deleted = 0;
    }
    renderHealthAuditCleanupState.lastRunAt = String(now || '').trim();
    renderHealthAuditCleanupState.lastDeleted = deleted;
    if (deleted > 0) {
      logLine({
        level: 'info',
        src: 'postprod',
        action: 'render_health_audit_purged',
        message: `Purge audit render health: ${deleted} entree(s) supprimee(s)`,
        data: {
          action: POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
          retentionDays: renderHealthEventRetentionDays,
          cutoff,
          deleted,
        },
      });
    }
    return {
      deleted,
      cutoff,
      skipped: false,
      reason: '',
    };
  }

  function asCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.trunc(n));
  }

  function computeHubConnectivityStatus(connectivitySnapshot = {}) {
    const recovery = connectivitySnapshot?.brokerRecovery && typeof connectivitySnapshot.brokerRecovery === 'object'
      ? connectivitySnapshot.brokerRecovery
      : {};
    const brokerOffline = recovery?.offline === true;
    const brokerDegradedCount = brokerOffline
      ? Math.max(1, asCount(recovery?.consecutiveFailures))
      : 0;
    const securityDegradedCount =
      ((connectivitySnapshot?.secureTransportRequired === true && connectivitySnapshot?.secureTransportDetected !== true) ? 1 : 0) +
      ((connectivitySnapshot?.clientCertRequired === true && connectivitySnapshot?.clientCertAccepted !== true) ? 1 : 0);
    const degradedCount = brokerDegradedCount + securityDegradedCount;
    let state = 'online';
    let kind = '';
    if (degradedCount > 0) {
      state = 'warn';
      if (brokerDegradedCount > 0 && securityDegradedCount > 0) kind = 'mixed';
      else if (securityDegradedCount > 0) kind = 'security';
      else kind = 'broker';
    }
    const reason = String(
      recovery?.lastFailureReason ||
      connectivitySnapshot?.clientCertPolicyReason ||
      ''
    ).trim();
    const signature = [
      state,
      kind,
      String(brokerOffline ? 1 : 0),
      String(asCount(recovery?.consecutiveFailures)),
      String(connectivitySnapshot?.secureTransportRequired === true ? 1 : 0),
      String(connectivitySnapshot?.secureTransportDetected === true ? 1 : 0),
      String(connectivitySnapshot?.clientCertRequired === true ? 1 : 0),
      String(connectivitySnapshot?.clientCertAccepted === true ? 1 : 0),
      String(reason),
    ].join('|');
    return {
      state,
      kind,
      signature,
      degradedCount,
      brokerDegradedCount,
      securityDegradedCount,
      reason,
    };
  }

  function requireSession(req, res, sendJSON, { tokenFallback = '' } = {}) {
    const token = getAuthToken(req, tokenFallback);
    if (!token) {
      sendJSON(res, 401, { ok: false, error: 'missing_token' });
      return null;
    }
    const now = nowIso();
    const session = stmts.findActiveSessionByToken.get(token, now);
    if (!session) {
      sendJSON(res, 401, { ok: false, error: 'invalid_session' });
      return null;
    }
    stmts.touchSession.run(now, token);
    return { token, now, session };
  }

  function requireManageUsers(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, rolesCache);
    if (!perms.canManageUsers) {
      sendJSON(res, 403, { ok: false, error: 'forbidden' });
      return false;
    }
    return perms;
  }

  function requireBanUsers(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, rolesCache);
    if (perms.canBanUsers !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_ban_users' });
      return false;
    }
    return perms;
  }

  function requireManageProjectPermissions(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, rolesCache);
    if (perms.canManageProjectPermissions !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_project_permissions_manage' });
      return false;
    }
    return perms;
  }

  function requireManageRoles(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, rolesCache);
    if (!perms.canManageRoles) {
      sendJSON(res, 403, { ok: false, error: 'forbidden' });
      return false;
    }
    return perms;
  }

  function requireRenderTemplateManage(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, rolesCache);
    if (perms.canManageForms !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_template_manage' });
      return false;
    }
    return perms;
  }

  function requireRenderTemplateManageForProject(sessionWrap, res, sendJSON, rawProjectRef) {
    const perms = requireRenderTemplateManage(sessionWrap, res, sendJSON);
    if (!perms) return null;

    const roleKey =
      resolveRoleInput(sessionWrap?.session?.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
    if (roleKey === SYSTEM_MAINTENANCE_ROLE) {
      return {
        perms,
        projectRef: sanitizeProjectRef(rawProjectRef),
        project: null,
        projectPermissions: null,
      };
    }

    if (perms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_template_manage_project' });
      return null;
    }

    const projectResolved = resolveProjectForApi(sharedStore, rawProjectRef, stmts);
    if (!projectResolved.ok) {
      sendJSON(res, 400, { ok: false, error: projectResolved.error || 'invalid_project_id' });
      return null;
    }
    const projectRef = sanitizeProjectRef(projectResolved.projectRef || rawProjectRef);
    if (!projectRef) {
      sendJSON(res, 400, { ok: false, error: 'invalid_project_id' });
      return null;
    }

    const actorUserId = Number(sessionWrap?.session?.user_id || 0);
    if (!Number.isFinite(actorUserId) || actorUserId <= 0) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_template_manage_project' });
      return null;
    }
    const projectPerms = stmts.findProjectUserRole.get(actorUserId, projectRef);
    if (Number(projectPerms?.can_launch_render) !== 1) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_template_manage_project' });
      return null;
    }

    return {
      perms,
      projectRef,
      project: projectResolved.project,
      projectPermissions: buildProjectPermissionPayload(projectPerms),
    };
  }

  function requireRenderLaunchForProject(
    sessionWrap,
    res,
    sendJSON,
    rawProjectRef,
    {
      forbiddenError = 'forbidden_project_render_launch',
    } = {}
  ) {
    if (!sessionWrap || !sessionWrap.session) return null;
    const projectRefInput = sanitizeProjectRef(rawProjectRef);
    if (!projectRefInput) {
      sendJSON(res, 400, { ok: false, error: 'invalid_project_id' });
      return null;
    }

    const roleKey =
      resolveRoleInput(sessionWrap?.session?.role, rolesCache, DEFAULT_FALLBACK_ROLE) || DEFAULT_FALLBACK_ROLE;
    const perms = rolePermissions(roleKey, rolesCache);
    if (perms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden' });
      return null;
    }
    if (roleKey === SYSTEM_MAINTENANCE_ROLE) {
      return {
        perms,
        projectRef: projectRefInput,
        project: null,
        projectPermissions: null,
      };
    }

    const projectResolved = resolveProjectForApi(sharedStore, projectRefInput, stmts);
    if (!projectResolved.ok) {
      sendJSON(res, 400, { ok: false, error: projectResolved.error || 'invalid_project_id' });
      return null;
    }
    const projectRef = sanitizeProjectRef(projectResolved.projectRef || projectRefInput);
    if (!projectRef) {
      sendJSON(res, 400, { ok: false, error: 'invalid_project_id' });
      return null;
    }

    const actorUserId = Number(sessionWrap?.session?.user_id || 0);
    if (!Number.isFinite(actorUserId) || actorUserId <= 0) {
      sendJSON(res, 403, { ok: false, error: forbiddenError });
      return null;
    }

    const projectPerms = stmts.findProjectUserRole.get(actorUserId, projectRef);
    if (Number(projectPerms?.can_launch_render) !== 1) {
      sendJSON(res, 403, { ok: false, error: forbiddenError });
      return null;
    }

    return {
      perms,
      projectRef,
      project: projectResolved.project,
      projectPermissions: buildProjectPermissionPayload(projectPerms),
    };
  }

  function requireRenderDispatch(sessionWrap, res, sendJSON) {
    if (!sessionWrap || !sessionWrap.session) return false;
    const perms = rolePermissions(sessionWrap.session.role, rolesCache);
    if (perms.canLaunchRenders !== true) {
      sendJSON(res, 403, { ok: false, error: 'forbidden_dispatch' });
      return false;
    }
    return perms;
  }

  function sweepStaleWorkersAndRequeue(now, cutoff, actorUserId = 0) {
    const staleRunning = stmts.listStaleRunningRenderJobs.all(cutoff);
    stmts.markStaleRenderWorkersOffline.run(now, cutoff);
    if (!Array.isArray(staleRunning) || staleRunning.length === 0) return 0;
    const safeActorUserId = Number.isFinite(Number(actorUserId))
      ? Math.trunc(Number(actorUserId))
      : 0;
    const requeued = db.transaction(() => {
      let count = 0;
      for (const row of staleRunning) {
        const renderId = Number(row?.id || 0);
        if (!Number.isFinite(renderId) || renderId <= 0) continue;
        const updated = stmts.requeueRenderJobForOfflineWorker.run(now, renderId);
        if (Number(updated?.changes || 0) <= 0) continue;
        stmts.clearRenderWorkerCurrentJobByRenderId.run(now, renderId);
        if (safeActorUserId > 0) {
          stmts.insertRenderJobEvent.run(
            renderId,
            'Running',
            'Queued',
            safeActorUserId,
            'worker_offline_requeue',
            now
          );
        }
        count += 1;
      }
      return count;
    })();
    if (requeued > 0 && safeActorUserId > 0) {
      audit(
        safeActorUserId,
        'renders_requeued_worker_offline',
        { count: requeued },
        'render',
        ''
      );
    }
    return requeued;
  }

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

  const postprodRouteDispatchDeps = {
    handlePostprodAuthAndHealthRoutes,
    handlePostprodActivityAndAuditMaintenanceRoutes,
    handlePostprodAuditRoutes,
    handlePostprodMeRoutes,
    handlePostprodProjectRoutes,
    handlePostprodDataTablesRoutes,
    handlePostprodResourcesRoutes,
    handlePostprodTaskRoutes,
    handlePostprodRenderFormsRoutes,
    handlePostprodRenderTemplatesRoutes,
    handlePostprodRendersRoutes,
    handlePostprodRenderDispatchRoutes,
    handlePostprodRenderHealthRoutes,
    handlePostprodRenderTransitionRoutes,
    handlePostprodUsersRoutes,
    handlePostprodUserProjectPermissionsRoutes,
    handlePostprodUserActivityRoutes,
    handlePostprodUserUpdateRoutes,
    handlePostprodRoleRoutes,
    requireSession,
    dbPath,
    sessionTtlSec,
    buildBrokerConnectivitySnapshot,
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
    get rolesCache() { return rolesCache; },
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
    requireManageRoles,
    parseActivityFilters,
    buildUserActivityPayload,
    activityMatchesActionType,
    activityMatchesProjectRefs,
    activityMatchesSearchQuery,
    summarizeUserActivity,
    getRenderHealthAuditMaintenanceSnapshot,
    maybePurgeRenderHealthAuditEvents,
    POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
    renderHealthEventRetentionDays,
    coercePositiveInt,
    buildAuditEntryPayload,
    matchesAuditSearch,
    buildAuditCsvLine,
    resolvePhoneFromBody,
    resolveNotificationPrefsFromBody,
    MIN_PASSWORD_LEN,
    sanitizeDisplayName,
    sanitizeFirstName,
    sanitizeLastName,
    sanitizePhone,
    sanitizeEmploymentType,
    sanitizeUserNote,
    sanitizeAvatarPath,
    isValidAvatarPath,
    sanitizeTimezone,
    sanitizeUserLanguage,
    DEFAULT_USER_LANGUAGE,
    normalizeNotificationPreferences,
    resolveRoleInput,
    DEFAULT_FALLBACK_ROLE,
    hashPassword,
    pbkdf2Iters,
    parseProjectUsageModeFilters,
    listPostprodProjects,
    sharedStore,
    getPostprodProjectVisibilityPolicy,
    resolveProjectForApi,
    normalizeTaskRefLookup,
    buildRenderTemplatePayload,
    resolveProjectCatalogEntry,
    scanUnrealProjectCatalogFromUproject,
    readCommonServerConfigFile,
    commonServerFile,
    parseHostFromRequestHeader,
    normalizeHostCandidate,
    readHostsServerConfigFile,
    hostsServerFile,
    fetchWrcPresetPayloadFromHosts,
    buildRenderFormFieldsFromWrcPreset,
    resolveWrcPresetPayloadRoot,
    fetchWrcObjectPropertyFromHost,
    extractWrcLayoutFieldIds,
    buildRenderFormFieldsFromWrcLayoutFieldIds,
    logLine,
    fetchWrcPresetPropertyMetadataValueFromHost,
    isLikelyOpaqueWrcIdentifier,
    sanitizeRenderFormFieldLabel,
    fetchWrcPresetPropertyPayloadFromHost,
    extractWrcPropertyValueFromPresetPropertyPayload,
    normalizeRenderFormFieldValueType,
    normalizeRenderFormFieldInputKind,
    normalizeRenderFormDefaultValueFromWrc,
    normalizeSingleLineDefaultText,
    pickReadableWrcIdentifier,
    rolePermissions,
    sanitizeProjectRef,
    SYSTEM_MAINTENANCE_ROLE,
    sanitizeSyncSource,
    sanitizeSyncResult,
    normalizeSyncDetails,
    buildDataTablePayload,
    buildDataRowPayload,
    normalizeDataTableSchema,
    normalizeDataRowPayload,
    MAX_DATA_TABLE_NAME_LEN,
    MAX_DATA_ROW_KEY_LEN,
    requireRenderDispatch,
    maybeSyncResourcesIndexFromLibrary,
    listPostprodResources,
    syncResourcesIndexFromLibrary,
    resourcesIndexAutoSyncIntervalMs,
    resourcesIndexSyncState,
    resolvePostprodResourceByRef,
    sanitizeTaskTitle,
    sanitizeTaskDescription,
    buildProjectTaskRefCatalog,
    buildResourceTaskRefCatalog,
    resolveTaskRefsFromCatalog,
    normalizeTaskStatus,
    TASK_REQUEST_TYPES,
    normalizeTaskRequestType,
    DEFAULT_TASK_REQUEST_TYPE,
    normalizeTaskExpectedRenderCount,
    resolveTaskExpectedRenderNames,
    normalizeTaskAutoRenderConfig,
    normalizeTaskRefsInput,
    ensureProjectCanAutoRender,
    normalizeRole,
    TASK_STATUSES,
    computeTaskDeadlineIso,
    replaceTaskRefsRelations,
    buildTaskPayloadWithRelations,
    computeTaskTransitionState,
    sanitizeTaskComment,
    buildTaskTransitionPayload,
    requireRenderTemplateManage,
    requireRenderTemplateManageForProject,
    sanitizeRenderFormName,
    sanitizeRenderProjectName,
    sanitizeRenderTemplateName,
    sanitizeRenderMapName,
    sanitizeRenderSequenceName,
    sanitizeRenderOutputProfile,
    sanitizeRenderFormPresetName,
    normalizeRenderFormModeDefault,
    parseBooleanFlag,
    normalizeRenderFormLayout,
    buildRenderFormPayload,
    normalizeRenderFormFields,
    replaceRenderFormFieldsTx,
    buildRenderFormFieldPayload,
    parseJsonValue,
    sanitizeRenderPresetName,
    normalizeRenderTemplateAllowedRolesJson,
    normalizeRenderExecution,
    normalizeRenderPayload,
    normalizeRenderTemplateAllowedRoles,
    parseRenderExecutionJson,
    parseRenderPayloadJson,
    importDetectedRenderOutputs,
    resolveRenderDetectedRoots,
    buildRenderJobPayload,
    shouldExposeDetectedRender,
    buildRenderOutputSubdir,
    createRenderOutputSubdir,
    requireRenderLaunchForProject,
    sanitizeRenderComment,
    buildRenderWorkerPayload,
    sanitizeRenderWorkerKey,
    sanitizeRenderWorkerName,
    normalizeRenderWorkerCapabilities,
    resolveRequestedRenderDispatchConfig,
    buildRenderDispatchPolicyStorageJson,
    MAX_RENDER_DISPATCH_MAX_JOBS,
    DEFAULT_RENDER_DISPATCH_MAX_JOBS,
    computeRenderDispatchFetchLimit,
    normalizeDispatchRenderIds,
    MAX_RENDER_DISPATCH_WORKER_FETCH_LIMIT,
    isDispatchableRenderRow,
    toDispatchableRenderRow,
    selectRenderJobsForDispatch,
    buildRenderDispatchPairs,
    normalizeRenderHealthEventState,
    normalizeRenderHealthEventKind,
    sanitizeRenderHealthEventLabel,
    sanitizeRenderHealthEventDetail,
    sanitizeRenderHealthEventSource,
    normalizeRenderStatus,
    sanitizeRenderOutputPath,
    sanitizeRenderErrorMessage,
    inferRenderReviewStatus,
    computeRenderTransitionState,
    canRenderValidate,
    buildRenderJobEventPayload,
    requireManageUsers,
    normalizeManageableRolesInput,
    buildUserAdminPayload,
    buildAutoUsername,
    buildPublicId,
    requireManageProjectPermissions,
    buildProjectPermissionPayload,
    resolveProjectPermissionCeilings,
    clampProjectPermissionsInput,
    parseProjectPermissionBool,
    buildRolePayload,
    sanitizeRoleKey,
    normalizeRoleLookupKey,
    sanitizeRoleNote,
    refreshRolesCache,
  };
  async function handleRoutes(req, res, url, { sendJSON, parseBody }) {
    const pathname = String(url?.pathname || '');
    if (!pathname.startsWith('/agent/postprod')) return false;
    const requestNow = nowIso();
    maybePurgeRenderHealthAuditEvents(requestNow);
    maybeStartBrokerProactiveRefresh(Date.now());
    const securityGate = await evaluatePostprodSecurityGate({
      req,
      res,
      pathname,
      sendJSON,
      isSecureRequestTransport,
      inspectClientCertificate,
      evaluateClientCertificatePolicy,
      trustProxyClientCertHeaders,
      allowedClientCertSubjects,
      allowedClientCertIssuers,
      allowedClientCertFingerprintsSha256,
      brokerRequireSecureTransport,
      requireClientCert,
      brokerTokenRequired,
      getBrokerToken,
      verifyBrokerAuth,
      brokerToken,
      brokerJwtConfig,
    });
    if (securityGate.handled) return true;

    const isAuthHealthRoute = securityGate.isAuthHealthRoute === true;
    const requestTransportSecure = securityGate.requestTransportSecure === true;
    const clientCertVerified = securityGate.clientCertVerified === true;
    const clientCertAccepted = securityGate.clientCertAccepted === true;
    const clientCertSource = String(securityGate.clientCertSource || '');
    const clientCertSubject = String(securityGate.clientCertSubject || '');
    const clientCertIssuer = String(securityGate.clientCertIssuer || '');
    const clientCertFingerprintSha256 = String(securityGate.clientCertFingerprintSha256 || '');
    const clientCertPolicyReason = String(securityGate.clientCertPolicyReason || '');
    const routesHandled = await dispatchPostprodRouteHandlers({
      req,
      res,
      url,
      pathname,
      parseBody,
      sendJSON,
      security: {
        isAuthHealthRoute,
        requestTransportSecure,
        clientCertVerified,
        clientCertAccepted,
        clientCertSource,
        clientCertSubject,
        clientCertIssuer,
        clientCertFingerprintSha256,
        clientCertPolicyReason,
      },
      deps: postprodRouteDispatchDeps,
    });
    if (routesHandled) return true;
    sendJSON(res, 404, { ok: false, error: 'not_found' });
    return true;
  }

  logLine({
    level: 'info',
    src: 'postprod',
    action: 'db_ready',
    message: 'SQLite postprod initialise',
    data: { dbPath },
  });

  return {
    available: true,
    dbPath,
    handleRoutes,
  };
}

module.exports = {
  createPostprodAuth,
  normalizeRole,
};








