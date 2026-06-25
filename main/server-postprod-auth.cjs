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
const {
  handlePostprodRenderTransitionRoutes,
  scheduleProxyGenerationForDoneRender: scheduleProxyGenerationForDoneRenderShared,
} = require('./server-postprod-routes-render-transitions.cjs');
const { handlePostprodRenderHealthRoutes } = require('./server-postprod-routes-render-health.cjs');
const { handlePostprodRendersRoutes } = require('./server-postprod-routes-renders.cjs');
const { handlePostprodUsersRoutes } = require('./server-postprod-routes-users.cjs');
const { handlePostprodUserProjectPermissionsRoutes } = require('./server-postprod-routes-user-project-permissions.cjs');
const { handlePostprodUserActivityRoutes } = require('./server-postprod-routes-user-activity.cjs');
const { handlePostprodUserUpdateRoutes } = require('./server-postprod-routes-user-update.cjs');
const { handlePostprodTaskRoutes } = require('./server-postprod-routes-tasks.cjs');
const { handlePostprodMeRoutes } = require('./server-postprod-routes-me.cjs');
const { handlePostprodUserAlertsRoutes } = require('./server-postprod-routes-user-alerts.cjs');
const { handlePostprodProjectRoutes } = require('./server-postprod-routes-projects.cjs');
const { handlePostprodAuthAndHealthRoutes } = require('./server-postprod-routes-auth-health.cjs');
const { handlePostprodAuditRoutes } = require('./server-postprod-routes-audit-export.cjs');
const { dispatchPostprodRouteHandlers } = require('./server-postprod-route-dispatcher.cjs');
const {
  isAllowedPeerAddress,
  collectPeerAddressCandidates,
} = require('./server-peer-security.cjs');
const {
  selectBestStation,
  sendJobToStation,
} = require('./server-postprod-remote-dispatcher.cjs');
const { getPresenceVolatile } = require('./server-hosts-online.cjs');
const { hostsToList } = require('./server-normalize.cjs');

const DEFAULT_AUDIT_WARN_LINES = 5000;
const DEFAULT_AUDIT_HARD_LIMIT_LINES = 10000;
let AUDIT_WARN_LINES = DEFAULT_AUDIT_WARN_LINES;
let AUDIT_HARD_LIMIT_LINES = DEFAULT_AUDIT_HARD_LIMIT_LINES;

function applyAuditStorageLimitsFromCommon(raw = null) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const coerce = (v, fb, min) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min ? Math.trunc(n) : fb;
  };
  let warnAt = coerce(src.auditWarnLines, AUDIT_WARN_LINES, 100);
  let hardLimit = coerce(src.auditHardLimitLines, AUDIT_HARD_LIMIT_LINES, 200);
  if (hardLimit <= warnAt) hardLimit = warnAt + 1;
  AUDIT_WARN_LINES = warnAt;
  AUDIT_HARD_LIMIT_LINES = hardLimit;
  return { warnAt, hardLimit };
}

const DEFAULT_USERS_SYNC_POLL_INTERVAL_MS = 8000;
const MIN_USERS_SYNC_POLL_INTERVAL_MS = 2000;
const MAX_USERS_SYNC_POLL_INTERVAL_MS = 60000;
const DEFAULT_USERS_SYNC_REMOTE_TIMEOUT_MS = 3500;
const MIN_USERS_SYNC_REMOTE_TIMEOUT_MS = 1000;
const MAX_USERS_SYNC_REMOTE_TIMEOUT_MS = 10000;
const DEFAULT_USERS_SYNC_FETCH_LIMIT = 250;
const MAX_USERS_SYNC_FETCH_LIMIT = 1000;
const DEFAULT_USERS_SYNC_AGENT_PORT = 4000;

const {
  DEFAULT_SESSION_TTL_SEC,
  DEFAULT_PBKDF2_ITERS,
  PASSWORD_KEY_LEN,
  MIN_PASSWORD_LEN,
  MAX_USERNAME_LEN,
  MAX_DISPLAY_NAME_LEN: _MAX_DISPLAY_NAME_LEN,
  MAX_USER_EMAIL_LEN: _MAX_USER_EMAIL_LEN,
  MAX_USER_PHONE_LEN: _MAX_USER_PHONE_LEN,
  MAX_EMPLOYMENT_TYPE_LEN: _MAX_EMPLOYMENT_TYPE_LEN,
  MAX_TIMEZONE_LEN: _MAX_TIMEZONE_LEN,
  MAX_USER_LANGUAGE_LEN: _MAX_USER_LANGUAGE_LEN,
  MAX_USER_NOTE_LEN: _MAX_USER_NOTE_LEN,
  MAX_USER_AVATAR_PATH_LEN: _MAX_USER_AVATAR_PATH_LEN,
  MAX_ROLE_KEY_LEN: _MAX_ROLE_KEY_LEN,
  MAX_ROLE_NOTE_LEN: _MAX_ROLE_NOTE_LEN,
  MAX_TASK_TITLE_LEN,
  MAX_TASK_DESCRIPTION_LEN,
  MAX_TASK_COMMENT_LEN,
  MAX_TASK_REF_LEN,
  MAX_TASK_REFS,
  MAX_TASK_EXPECTED_RENDER_COUNT,
  MAX_TASK_EXPECTED_RENDER_NAME_LEN,
  MAX_TASK_AUTO_RENDER_CONFIG_BYTES,
  MAX_TASK_AUTO_RENDER_TEXT_LEN,
  MAX_RENDER_TEMPLATE_NAME_LEN,
  MAX_RENDER_PROJECT_NAME_LEN,
  MAX_RENDER_PRESET_NAME_LEN,
  MAX_RENDER_FORM_NAME_LEN,
  MAX_RENDER_FORM_LAYOUT_BYTES,
  MAX_RENDER_MAP_NAME_LEN,
  MAX_RENDER_SEQUENCE_NAME_LEN,
  MAX_RENDER_OUTPUT_PROFILE_LEN,
  MAX_RENDER_ALLOWED_ROLES,
  MAX_RENDER_TEMPLATE_FIELDS,
  MAX_RENDER_TEMPLATE_FIELD_KEY_LEN,
  MAX_RENDER_TEMPLATE_FIELD_LABEL_LEN,
  MAX_RENDER_TEMPLATE_FIELD_SOURCE_PATH_LEN,
  MAX_RENDER_TEMPLATE_FIELD_INPUT_KIND_LEN,
  MAX_RENDER_TEMPLATE_FIELD_VALUE_TYPE_LEN,
  MAX_RENDER_TEMPLATE_FIELD_GROUP_NAME_LEN,
  MAX_RENDER_TEMPLATE_FIELD_PAYLOAD_KEY_LEN,
  MAX_RENDER_TEMPLATE_FIELD_PLACEHOLDER_LEN,
  MAX_RENDER_TEMPLATE_FIELD_HELP_TEXT_LEN,
  MAX_RENDER_TEMPLATE_FIELD_OPTIONS_ITEMS,
  MAX_RENDER_TEMPLATE_FIELD_OPTIONS_BYTES,
  MAX_RENDER_TEMPLATE_FIELD_VALIDATION_BYTES,
  MAX_RENDER_TEMPLATE_FIELD_DEFAULT_VALUE_BYTES,
  MAX_RENDER_PRESET_PAYLOAD_BYTES,
  MAX_RENDER_OUTPUT_PATH_LEN,
  MAX_RENDER_ERROR_LEN,
  MAX_RENDER_COMMENT_LEN,
  MAX_RENDER_HEALTH_EVENT_LABEL_LEN,
  MAX_RENDER_HEALTH_EVENT_DETAIL_LEN,
  MAX_RENDER_HEALTH_EVENT_SOURCE_LEN,
  MAX_RENDER_PAYLOAD_BYTES,
  MAX_RENDER_WORKER_KEY_LEN,
  MAX_RENDER_WORKER_NAME_LEN,
  MAX_RENDER_WORKER_CAPABILITY_KEY_LEN,
  MAX_RENDER_WORKER_CAPABILITY_VALUE_LEN,
  MAX_RENDER_WORKER_CAPABILITY_ITEMS,
  MAX_RENDER_WORKER_CAPABILITIES_BYTES,
  RENDER_WORKER_ONLINE_TTL_SECONDS,
  DEFAULT_RENDER_DISPATCH_PRIORITY,
  DEFAULT_RENDER_DISPATCH_MAX_JOBS,
  MAX_RENDER_DISPATCH_PRIORITY,
  MAX_RENDER_DISPATCH_QUOTA,
  MAX_RENDER_DISPATCH_PROJECT_RULES,
  MAX_RENDER_DISPATCH_FETCH_LIMIT,
  MAX_RENDER_DISPATCH_WORKER_FETCH_LIMIT,
  MAX_RENDER_DISPATCH_MAX_JOBS,
  MAX_RENDER_DISPATCH_RENDER_IDS,
  MAX_RENDER_DETECTED_SCAN_FILES,
  DEFAULT_RENDER_DETECTED_SCAN_FILES,
  MAX_UNREAL_PROJECT_CATALOG_FILES,
  MIN_RENDER_DETECTED_SCAN_INTERVAL_MS,
  MAX_RENDER_DETECTED_SCAN_INTERVAL_MS,
  DEFAULT_RENDER_DETECTED_SCAN_INTERVAL_MS,
  DEFAULT_RENDER_DETECTED_EXTENSIONS,
  DEFAULT_RENDER_DETECTED_TEMPLATE_NAME,
  AUTO_RENDER_PROJECT_USAGE_MODES,
  DEFAULT_USER_LANGUAGE,
  USER_LANGUAGE_ALLOWED: _USER_LANGUAGE_ALLOWED,
  MAX_FAILED_LOGIN_COUNT,
  FAILED_LOGIN_LOCK_SECONDS,
  MAX_PROJECT_REF_LEN,
  MAX_DATA_TABLE_NAME_LEN,
  MAX_DATA_TABLE_SCHEMA_BYTES,
  MAX_DATA_ROW_KEY_LEN,
  MAX_DATA_ROW_PAYLOAD_BYTES,
  MAX_SYNC_SOURCE_LEN,
  MAX_SYNC_RESULT_LEN,
  MAX_SYNC_DETAILS_BYTES,
  MAX_ACTIVITY_SEARCH_LEN,
  MAX_RESOURCE_CODE_LEN,
  MAX_RESOURCE_TYPE_LEN,
  MAX_RESOURCE_TITLE_LEN,
  MAX_RESOURCE_SOURCE_PATH_LEN,
  MAX_RESOURCE_METADATA_BYTES,
  MIN_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS,
  MAX_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS,
  DEFAULT_RESOURCES_INDEX_AUTO_SYNC_INTERVAL_MS,
  MIN_POSTPROD_PROJECTS_RESYNC_TTL_MS,
  MAX_POSTPROD_PROJECTS_RESYNC_TTL_MS,
  DEFAULT_POSTPROD_PROJECTS_RESYNC_TTL_MS,
  DEFAULT_FALLBACK_ROLE,
  TASK_STATUSES,
  TASK_EXPECTED_RENDER_MATCH_ACTIVE_STATUSES,
  TASK_REQUEST_TYPES,
  DEFAULT_TASK_REQUEST_TYPE,
  TASK_PRIORITY_DEADLINE_DAYS,
  DEFAULT_TASK_DEADLINE_DAYS,
  RENDER_STATUSES,
  RENDER_REVIEW_STATUSES,
  RENDER_HEALTH_EVENT_STATES,
  RENDER_HEALTH_EVENT_KINDS,
  POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
  DEFAULT_RENDER_HEALTH_EVENT_RETENTION_DAYS,
  MIN_RENDER_HEALTH_EVENT_RETENTION_DAYS,
  MAX_RENDER_HEALTH_EVENT_RETENTION_DAYS,
  DEFAULT_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS,
  MIN_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS,
  MAX_RENDER_HEALTH_EVENT_CLEANUP_INTERVAL_MS,
  RENDER_TEMPLATE_FIELD_VALUE_TYPES,
  RENDER_TEMPLATE_FIELD_INPUT_KINDS,
  RENDER_FORM_SOURCE_TYPES,
  RENDER_FORM_MODE_DEFAULTS,
  EMPLOYMENT_TYPE_LOOKUP: _EMPLOYMENT_TYPE_LOOKUP,
  ROLE_ALIAS_MAP,
} = require('./server-postprod-auth-constants.cjs');
const DEFAULT_ROLE_POLICIES_TEMPLATE = require('./default-postprod-role-policies.json');

const {
  coercePositiveInt,
  parseBooleanFlag,
  parseEnvPathList,
  normalizeRenderDetectedExtensions,
  normalizeRenderDetectedFilePathForSignature: _normalizeRenderDetectedFilePathForSignature,
  buildRenderDetectedFileSignature,
  nowIso,
  normalizeAscii,
  normalizeRoleLookupKey,
  normalizeUsername,
  normalizeUsernameSeed: _normalizeUsernameSeed,
  buildAutoUsername,
  sanitizeDisplayName,
  sanitizeFirstName,
  sanitizeLastName,
  sanitizeEmail,
  sanitizePhone,
  buildPublicId,
  normalizePublicId,
  resolvePhoneFromBody,
  resolveNotificationPrefsFromBody,
  sanitizeTimezone,
  sanitizeUserLanguage,
  sanitizeUserNote,
  sanitizeAvatarPath,
  isValidAvatarPath,
  isValidEmail,
  normalizeNotificationPreferences,
  parseNotificationPreferencesJson,
  sanitizeRoleKey,
  sanitizeRoleNote
} = require('./server-postprod-auth-utils-core.cjs');

const { createTaskRenderHelpers } = require('./server-postprod-auth-task-render-utils.cjs');
const { createUsersSyncHelpers } = require('./server-postprod-auth-users-sync.cjs');
const { createRenderDetectedAutoScanHelpers } = require('./server-postprod-auth-render-detected.cjs');
const { createResourcesIndexSyncHelpers } = require('./server-postprod-auth-resources-sync.cjs');
const { createPostprodAuthGuards } = require('./server-postprod-auth-guards.cjs');
const { createTaskRenderStateHelpers } = require('./server-postprod-auth-task-render-state.cjs');
const { createRenderDispatchHelpers } = require('./server-postprod-auth-render-dispatch.cjs');
const { createRenderHealthAuditMaintenanceHelpers } = require('./server-postprod-auth-render-health-maintenance.cjs');
const { createPostprodRouteDispatchDeps } = require('./server-postprod-auth-route-dispatch-deps.cjs');
const { buildPostprodRouteDispatchGroups } = require('./server-postprod-auth-route-dispatch-groups.cjs');
const {
  sanitizeRenderWorkerKey,
  sanitizeRenderWorkerName,
  normalizeRenderWorkerCapabilityKey: _normalizeRenderWorkerCapabilityKey,
  normalizeRenderWorkerCapabilityAtom: _normalizeRenderWorkerCapabilityAtom,
  normalizeRenderWorkerCapabilitiesObject: _normalizeRenderWorkerCapabilitiesObject,
  normalizeRenderWorkerCapabilities,
  parseRenderWorkerCapabilitiesJson,
  extractRenderJobRequiredCapabilities: _extractRenderJobRequiredCapabilities,
  extractRenderJobPreferredWorkerKey: _extractRenderJobPreferredWorkerKey,
  computeRenderWorkerCapabilitiesScore: _computeRenderWorkerCapabilitiesScore,
  normalizeCapabilityCollection: _normalizeCapabilityCollection,
  workerCapabilityContains: _workerCapabilityContains,
  doesWorkerMatchRequiredCapabilities: _doesWorkerMatchRequiredCapabilities,
  buildRenderDispatchPairs,
  normalizeRenderDispatchPriority: _normalizeRenderDispatchPriority,
  normalizeRenderDispatchQuota: _normalizeRenderDispatchQuota,
  normalizeRenderDispatchProjectMap: _normalizeRenderDispatchProjectMap,
  normalizeRenderDispatchPolicy: _normalizeRenderDispatchPolicy,
  serializeRenderDispatchProjectMap: _serializeRenderDispatchProjectMap,
  buildRenderDispatchPolicyStorageJson,
  resolveRenderDispatchConfig,
  buildRenderDispatchPolicyPayload,
  resolveRequestedRenderDispatchConfig,
  computeRenderDispatchFetchLimit,
  normalizeRenderProjectLoadMap: _normalizeRenderProjectLoadMap,
  countRenderJobsByProject: _countRenderJobsByProject,
  normalizeDispatchRenderIds,
  isDispatchableRenderRow,
  toDispatchableRenderRow,
  selectRenderJobsForDispatch,
} = createRenderDispatchHelpers({
  normalizeJsonValueWithSize,
  parseRenderPayloadJson,
  sanitizeRenderProjectName,
  safeParseObjectJson,
  coercePositiveInt,
  normalizeRenderStatus,
  MAX_RENDER_WORKER_KEY_LEN,
  MAX_RENDER_WORKER_NAME_LEN,
  MAX_RENDER_WORKER_CAPABILITY_KEY_LEN,
  MAX_RENDER_WORKER_CAPABILITY_VALUE_LEN,
  MAX_RENDER_WORKER_CAPABILITY_ITEMS,
  MAX_RENDER_WORKER_CAPABILITIES_BYTES,
  MAX_RENDER_DISPATCH_PRIORITY,
  MAX_RENDER_DISPATCH_QUOTA,
  MAX_RENDER_DISPATCH_PROJECT_RULES,
  DEFAULT_RENDER_DISPATCH_PRIORITY,
  MAX_RENDER_DISPATCH_MAX_JOBS,
  DEFAULT_RENDER_DISPATCH_MAX_JOBS,
  MAX_RENDER_DISPATCH_FETCH_LIMIT,
  MAX_RENDER_DISPATCH_RENDER_IDS,
});
const {
  sanitizeTaskTitle,
  sanitizeTaskDescription,
  sanitizeTaskComment,
  normalizeTaskRequestType,
  sanitizeTaskExpectedRenderName,
  sanitizeTaskAutoRenderText: _sanitizeTaskAutoRenderText,
  normalizeTaskExpectedRenderCount,
  normalizeTaskExpectedRenderNamesInput: _normalizeTaskExpectedRenderNamesInput,
  buildTaskExpectedRenderNameBase: _buildTaskExpectedRenderNameBase,
  generateTaskExpectedRenderNames: _generateTaskExpectedRenderNames,
  resolveTaskExpectedRenderNames,
  normalizeExpectedRenderLookupKey: _normalizeExpectedRenderLookupKey,
  safeIsoToTs: _safeIsoToTs,
  sortTaskExpectedRenderCandidates: _sortTaskExpectedRenderCandidates,
  normalizeTaskRefsInput,
  sanitizeTaskRefForStorage,
  parseTaskRefsJson,
  normalizeTaskRefLookup,
  addTaskRefAlias,
  parseTaskAutoRenderConfig,
  normalizeTaskAutoRenderConfig,
  buildExpectedRenderTaskMatchCatalog,
  findExpectedRenderTaskMatch,
} = createTaskRenderHelpers({
  normalizeAscii,
  MAX_TASK_TITLE_LEN,
  MAX_TASK_DESCRIPTION_LEN,
  MAX_TASK_COMMENT_LEN,
  MAX_TASK_EXPECTED_RENDER_NAME_LEN,
  MAX_TASK_AUTO_RENDER_TEXT_LEN,
  MAX_TASK_EXPECTED_RENDER_COUNT,
  MAX_TASK_REF_LEN,
  MAX_TASK_REFS,
  TASK_REQUEST_TYPES,
  DEFAULT_TASK_REQUEST_TYPE,
  MAX_TASK_AUTO_RENDER_CONFIG_BYTES,
  safeParseObjectJson,
  sanitizeRenderProjectName,
  sanitizeRenderTemplateName,
  sanitizeRenderWorkerKey,
  sanitizeRenderMapName,
  sanitizeRenderSequenceName,
  sanitizeRenderOutputProfile,
  sanitizeRenderOutputPath,
  normalizeRenderPayload,
  parseRenderPayloadJson,
  normalizeRenderExecution,
  parseRenderExecutionJson,
  parseIsoDateOrNull,
  buildTaskPayload,
  normalizeTaskStatus,
  TASK_EXPECTED_RENDER_MATCH_ACTIVE_STATUSES,
});

const { createProjectsCatalogHelpers } = require('./server-postprod-auth-projects-catalog.cjs');
const {
  normalizePostprodProjectsResyncTtlMs: _normalizePostprodProjectsResyncTtlMs,
  resetPostprodProjectsCatalogCache: _resetPostprodProjectsCatalogCache,
  syncProjectsIndexFromSharedStore: _syncProjectsIndexFromSharedStore,
  buildSharedStoreProjectPathIndex: _buildSharedStoreProjectPathIndex,
  normalizeProjectMetaStatus: _normalizeProjectMetaStatus,
  isValidatedPostprodProjectStatus: _isValidatedPostprodProjectStatus,
  getPostprodProjectVisibilityPolicy,
  buildSharedStoreProjectMetaIndex: _buildSharedStoreProjectMetaIndex,
  loadPostprodProjectsCatalog,
  buildProjectTaskRefCatalog,
  parseProjectUsageModeFilters,
  listPostprodProjects,
} = createProjectsCatalogHelpers({
  nowIso,
  normalizeProjectUsageMode,
  normalizeRoleLookupKey,
  normalizeRole,
  addTaskRefAlias,
  DEFAULT_FALLBACK_ROLE,
  AUTO_RENDER_PROJECT_USAGE_MODES,
  MIN_POSTPROD_PROJECTS_RESYNC_TTL_MS,
  MAX_POSTPROD_PROJECTS_RESYNC_TTL_MS,
  DEFAULT_POSTPROD_PROJECTS_RESYNC_TTL_MS,
});

const { createActivityAuditHelpers } = require('./server-postprod-auth-activity-audit.cjs');
const {
  parseAuditPayloadJson: _parseAuditPayloadJson,
  asOptionalPositiveInt: _asOptionalPositiveInt,
  normalizeActivityProjectRefs: _normalizeActivityProjectRefs,
  normalizeActivityDetailValue: _normalizeActivityDetailValue,
  buildUserActivityDetail: _buildUserActivityDetail,
  buildUserActivityPayload,
  buildAuditEntryPayload,
  escapeCsvCell: _escapeCsvCell,
  buildAuditCsvLine,
  matchesAuditSearch,
  summarizeUserActivity,
  parseActivityProjectRefsFilter: _parseActivityProjectRefsFilter,
  parseActivityFilters,
  activityMatchesProjectRefs,
  classifyActivityActionType: _classifyActivityActionType,
  activityMatchesActionType,
  activityMatchesSearchQuery,
} = createActivityAuditHelpers({
  normalizeTaskRefsInput,
  normalizeAscii,
  coercePositiveInt,
  parseIsoDateOrNull,
  MAX_TASK_REFS,
  MAX_TASK_COMMENT_LEN,
  MAX_ACTIVITY_SEARCH_LEN,
});

const { createResourcesCatalogHelpers } = require('./server-postprod-auth-resources-catalog.cjs');
const {
  sanitizeResourceIndexCode: _sanitizeResourceIndexCode,
  sanitizeResourceIndexType: _sanitizeResourceIndexType,
  sanitizeResourceIndexTitle: _sanitizeResourceIndexTitle,
  sanitizeResourceIndexSourcePath: _sanitizeResourceIndexSourcePath,
  normalizeResourceIndexMetadataForStorage: _normalizeResourceIndexMetadataForStorage,
  buildPostprodResourcePayload: _buildPostprodResourcePayload,
  syncResourcesIndexFromLibrary,
  buildResourceTaskRefCatalog,
  listPostprodResources,
  resolvePostprodResourceByRef,
} = createResourcesCatalogHelpers({
  safeParseObjectJson,
  normalizeJsonValueWithSize,
  nowIso,
  addTaskRefAlias,
  MAX_RESOURCE_CODE_LEN,
  MAX_RESOURCE_TYPE_LEN,
  MAX_RESOURCE_TITLE_LEN,
  MAX_RESOURCE_SOURCE_PATH_LEN,
  MAX_RESOURCE_METADATA_BYTES,
});

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
  const s = String(value || '').trim();
  // Reject unresolved template tokens like {{outputpath}}
  if (/^\{\{[^{}]+\}\}$/.test(s)) return '';
  return s.slice(0, MAX_RENDER_OUTPUT_PATH_LEN);
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
      const relLower = relativePosix.toLowerCase();
      const isFolderSequenceHint = (
        ext === '.uasset' &&
        !classified.isPreset &&
        !classified.isWrcPreset && (
          relLower.includes('/sequences/') ||
          relLower.includes('/levelsequences/') ||
          relLower.includes('/cinematics/') ||
          relLower.includes('/cinematic/') ||
          relLower.includes('/shots/')
        )
      );
      const effectiveIsSequence = classified.isSequence || isFolderSequenceHint;
      if ((effectiveIsSequence || classified.isPreset) && isLikelyUnrealRedirectorAsset(absPath)) {
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
      if (effectiveIsSequence) {
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
    if (groupProps.length > 0) {
      const wrcGroupName = String(group.Name || group.name || group.GroupName || group.groupName || '').trim();
      for (const entry of groupProps) {
        if (entry && typeof entry === 'object' && !entry._wrcGroupName) entry._wrcGroupName = wrcGroupName;
      }
      props = props.concat(groupProps);
    }
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

function buildRenderFormFieldsFromWrcPreset(presetPayload, wrcFile) {
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
    // Prefer property GUID as stable source_path identifier; fall back to composed path.
    const propertyGuidRaw = String(
      p.PropertyId || p.propertyId || p.PropertyID || p.propertyID
      || p.PropertyIdentifier || p.propertyIdentifier
      || p.EntityId || p.entityId
      || p.ID || p.id || p.Id
      || underlying.PropertyId || underlying.propertyId || underlying.PropertyID || underlying.propertyID
      || ''
    ).trim();
    const sourcePath = propertyGuidRaw || String(sourcePathRaw || '').trim();
    if (!sourcePath) continue;
    const groupName = sanitizeRenderFormFieldGroupName(p._wrcGroupName || '');

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
      groupName,
      payloadKey,
      defaultValue,
      validation: {},
      isRequired: false,
      isVisible: true,
      sortOrder,
      wrcFile: String(wrcFile || '').trim(),
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
  return {
    role,
    isReferent: perms.canSyncScenes === true || perms.canManageProjectPermissions === true,
    canValidate: perms.canValidate === true,
    canSync: perms.canSyncScenes === true,
    canLaunchRender: perms.canLaunchRenders === true,
    canEditData: (
      perms.canManageProjectPermissions === true
      || perms.canSyncScenes === true
      || perms.canLaunchRenders === true
    ),
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
      wrcFile: String(rawField.wrcFile ?? rawField.wrc_file ?? '').trim(),
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

function normalizeRoleRow(row = {}) {
  const key = sanitizeRoleKey(row?.key, '');
  if (!key) return null;
  const manageable = normalizeManageableRolesInput(
    parseManageableRolesJson(row?.manageable_roles_json ?? row?.manageableRoles)
  );
  const launchLiveRaw = row?.can_launch_live_projects ?? row?.canLaunchLiveProjects;
  const canLaunchLiveProjects = (launchLiveRaw === undefined || launchLiveRaw === null)
    ? true
    : (Number(launchLiveRaw) === 1 || launchLiveRaw === true);
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
    canManageConfiguration:
      Number(row?.can_manage_configuration ?? row?.canManageConfiguration) === 1
      || row?.canManageConfiguration === true,
    canBanUsers: Number(row?.can_ban_users ?? row?.canBanUsers) === 1 || row?.canBanUsers === true,
    canManageProjectPermissions:
      Number(row?.can_manage_project_permissions ?? row?.canManageProjectPermissions) === 1
      || row?.canManageProjectPermissions === true,
    canLaunchLiveProjects,
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
    canAssignRenderRequests:
      Number(row?.can_assign_render_requests ?? row?.canAssignRenderRequests) === 1
      || row?.canAssignRenderRequests === true,
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
    lastSourceStation: String(row?.last_source_station ?? row?.lastSourceStation ?? '').trim(),
    lastSourceVersion: Number.isFinite(Number(row?.last_source_version ?? row?.lastSourceVersion))
      ? Math.max(0, Math.trunc(Number(row?.last_source_version ?? row?.lastSourceVersion)))
      : 0,
  };
}

function buildRolesCache(roleRows = []) {
  const baseByKey = new Map();
  for (const row of roleRows) {
    const normalized = normalizeRoleRow(row);
    if (!normalized) continue;
    baseByKey.set(normalized.key, normalized);
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
      canManageConfiguration: row.canManageConfiguration === true,
      canBanUsers: row.canBanUsers === true,
      canManageProjectPermissions: row.canManageProjectPermissions === true,
      canLaunchLiveProjects: row.canLaunchLiveProjects !== false,
      canLaunchProjects: row.canLaunchProjects !== false,
      canViewResources: row.canViewResources === true,
      canCreateTasks: row.canCreateTasks === true,
      canAssignRenderRequests: row.canAssignRenderRequests === true,
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
      canUseLiveMode: false,
      canUsePostprodMode: true,
      canValidate: false,
      canSyncScenes: false,
      canManageUsers: false,
      canManageRoles: false,
      canManageForms: false,
      canManageMachines: false,
      canManageConfiguration: false,
      canBanUsers: false,
      canManageProjectPermissions: false,
      canLaunchLiveProjects: false,
      canLaunchProjects: false,
      canLaunchRenders: false,
      canViewResources: false,
      canCreateTasks: false,
      canAssignRenderRequests: false,
      canEditProjects: false,
      canManageLayouts: false,
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
    canManageRoles: policy.canManageRoles === true,
    canManageForms: policy.canManageForms === true,
    canManageMachines: policy.canManageMachines === true,
    canManageConfiguration: policy.canManageConfiguration === true,
    canBanUsers: canManageUsers && policy.canBanUsers === true,
    canManageProjectPermissions: canManageUsers && policy.canManageProjectPermissions === true,
    canLaunchLiveProjects: policy.canLaunchLiveProjects !== false,
    canLaunchProjects: policy.canLaunchProjects !== false,
    canLaunchRenders: policy.canLaunchRenders !== false,
    canViewResources: policy.canViewResources === true,
    canCreateTasks: policy.canCreateTasks === true,
    canAssignRenderRequests: policy.canAssignRenderRequests === true,
    canEditProjects: policy.canEditProjects === true,
    canManageLayouts: policy.canManageLayouts === true && policy.canUseLiveMode !== false,
    manageableRoles: manageable,
  };
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

function ensureDefaultRoles(db, bootstrapRolePolicies = [], logLine = () => {}) {
  const existingRoleCount = Number(db.prepare('SELECT COUNT(*) AS n FROM roles').get()?.n || 0);
  if (existingRoleCount > 0) {
    return;
  }
  const policies = normalizeBootstrapRolePolicies(bootstrapRolePolicies);
  if (policies.length <= 0) {
    logLine({
      level: 'warn',
      src: 'postprod',
      action: 'roles_seed_skipped',
      message: 'Aucun profil bootstrap valide configure: seed ignore.',
    });
    return;
  }
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
      can_manage_configuration,
      can_ban_users,
      can_manage_project_permissions,
      can_launch_live_projects,
      can_launch_projects,
      can_launch_renders,
      can_view_resources,
      can_create_tasks,
      can_assign_render_requests,
      can_edit_projects,
      can_manage_layouts,
      manageable_roles_json,
      is_system,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = nowIso();
  let inserted = 0;

  const tx = db.transaction(() => {
    for (const policy of policies) {
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
        policy?.canManageConfiguration === true ? 1 : 0,
        policy?.canBanUsers === true ? 1 : 0,
        policy?.canManageProjectPermissions === true ? 1 : 0,
        policy?.canLaunchLiveProjects !== false ? 1 : 0,
        policy?.canLaunchProjects !== false ? 1 : 0,
        policy?.canLaunchRenders !== false ? 1 : 0,
        policy?.canViewResources === true ? 1 : 0,
        policy?.canCreateTasks === true ? 1 : 0,
        policy?.canAssignRenderRequests === true ? 1 : 0,
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
      message: `${inserted} role(s) de bootstrap ajoutes`,
    });
  }
}

function normalizeBootstrapRolePolicyEntry(rawPolicy = {}) {
  if (!rawPolicy || typeof rawPolicy !== 'object' || Array.isArray(rawPolicy)) return null;
  const key = sanitizeRoleKey(rawPolicy?.key, '');
  if (!key) return null;
  return {
    key,
    displayName: sanitizeDisplayName(rawPolicy?.displayName, key),
    note: sanitizeRoleNote(rawPolicy?.note),
    canUseLiveMode: rawPolicy?.canUseLiveMode !== false,
    canUsePostprodMode: rawPolicy?.canUsePostprodMode !== false,
    canValidate: rawPolicy?.canValidate === true,
    canSyncScenes: rawPolicy?.canSyncScenes === true,
    canManageUsers: rawPolicy?.canManageUsers === true,
    canManageRoles: rawPolicy?.canManageRoles === true,
    canManageForms: rawPolicy?.canManageForms === true,
    canManageMachines: rawPolicy?.canManageMachines === true,
    canManageConfiguration: rawPolicy?.canManageConfiguration === true,
    canBanUsers: rawPolicy?.canBanUsers === true,
    canManageProjectPermissions: rawPolicy?.canManageProjectPermissions === true,
    canLaunchLiveProjects: rawPolicy?.canLaunchLiveProjects !== false,
    canLaunchProjects: rawPolicy?.canLaunchProjects !== false,
    canLaunchRenders: rawPolicy?.canLaunchRenders !== false,
    canViewResources: rawPolicy?.canViewResources === true,
    canCreateTasks: rawPolicy?.canCreateTasks === true,
    canAssignRenderRequests: rawPolicy?.canAssignRenderRequests === true,
    canEditProjects: rawPolicy?.canEditProjects === true,
    canManageLayouts: rawPolicy?.canManageLayouts === true,
    manageableRoles: normalizeManageableRolesInput(rawPolicy?.manageableRoles),
    isSystem: rawPolicy?.isSystem !== false,
  };
}

function normalizeBootstrapRolePolicies(rawPolicies = []) {
  const list = Array.isArray(rawPolicies) ? rawPolicies : [];
  const out = [];
  const seen = new Set();
  for (const policy of list) {
    const normalized = normalizeBootstrapRolePolicyEntry(policy);
    if (!normalized) continue;
    const lookup = normalizeRoleLookupKey(normalized.key);
    if (!lookup || seen.has(lookup)) continue;
    seen.add(lookup);
    out.push(normalized);
  }
  return out;
}

function rebaselineSystemRolesFromBootstrapPolicies(db, bootstrapRolePolicies = []) {
  const policies = normalizeBootstrapRolePolicies(bootstrapRolePolicies);
  if (policies.length <= 0) return { matched: 0, updated: 0 };

  const policyByLookup = new Map();
  for (const policy of policies) {
    const keyLookup = normalizeRoleLookupKey(policy?.key);
    if (keyLookup && !policyByLookup.has(keyLookup)) {
      policyByLookup.set(keyLookup, policy);
    }
    const displayLookup = normalizeRoleLookupKey(policy?.displayName);
    if (displayLookup && !policyByLookup.has(displayLookup)) {
      policyByLookup.set(displayLookup, policy);
    }
  }
  if (policyByLookup.size <= 0) return { matched: 0, updated: 0 };

  const systemRoles = db.prepare(`
    SELECT key, display_name
    FROM roles
    WHERE is_system = 1
  `).all();
  if (!Array.isArray(systemRoles) || systemRoles.length <= 0) {
    return { matched: 0, updated: 0 };
  }

  const updateRole = db.prepare(`
    UPDATE roles
    SET
      can_use_live_mode = ?,
      can_use_postprod_mode = ?,
      can_validate = ?,
      can_sync_scenes = ?,
      can_manage_users = ?,
      can_manage_roles = ?,
      can_manage_forms = ?,
      can_manage_machines = ?,
      can_manage_configuration = ?,
      can_ban_users = ?,
      can_manage_project_permissions = ?,
      can_launch_live_projects = ?,
      can_launch_projects = ?,
      can_launch_renders = ?,
      can_view_resources = ?,
      can_create_tasks = ?,
      can_assign_render_requests = ?,
      can_edit_projects = ?,
      can_manage_layouts = ?,
      manageable_roles_json = ?,
      updated_at = ?
    WHERE key = ?
      AND is_system = 1
  `);

  let matched = 0;
  let updated = 0;
  const now = nowIso();
  const tx = db.transaction(() => {
    for (const row of systemRoles) {
      const roleKey = sanitizeRoleKey(row?.key, '');
      if (!roleKey) continue;
      const roleLookup = normalizeRoleLookupKey(roleKey);
      const roleDisplay = sanitizeDisplayName(row?.display_name, roleKey);
      const displayLookup = normalizeRoleLookupKey(roleDisplay);
      const policy = (
        (roleLookup ? policyByLookup.get(roleLookup) : null)
        || (displayLookup ? policyByLookup.get(displayLookup) : null)
      );
      if (!policy) continue;

      matched += 1;
      const manageableRoles = normalizeManageableRolesInput(policy?.manageableRoles);
      const res = updateRole.run(
        policy?.canUseLiveMode !== false ? 1 : 0,
        policy?.canUsePostprodMode !== false ? 1 : 0,
        policy?.canValidate === true ? 1 : 0,
        policy?.canSyncScenes === true ? 1 : 0,
        policy?.canManageUsers === true ? 1 : 0,
        policy?.canManageRoles === true ? 1 : 0,
        policy?.canManageForms === true ? 1 : 0,
        policy?.canManageMachines === true ? 1 : 0,
        policy?.canManageConfiguration === true ? 1 : 0,
        policy?.canBanUsers === true ? 1 : 0,
        policy?.canManageProjectPermissions === true ? 1 : 0,
        policy?.canLaunchLiveProjects !== false ? 1 : 0,
        policy?.canLaunchProjects !== false ? 1 : 0,
        policy?.canLaunchRenders !== false ? 1 : 0,
        policy?.canViewResources === true ? 1 : 0,
        policy?.canCreateTasks === true ? 1 : 0,
        policy?.canAssignRenderRequests === true ? 1 : 0,
        policy?.canEditProjects === true ? 1 : 0,
        policy?.canManageLayouts === true ? 1 : 0,
        JSON.stringify(manageableRoles),
        now,
        roleKey
      );
      updated += Number(res?.changes || 0);
    }
  });
  tx();

  return { matched, updated };
}

function loadBootstrapRolePoliciesFromFile({ configFile = '', logLine = () => {} } = {}) {
  const normalizedFile = String(configFile || '').trim();
  const templatePolicies = normalizeBootstrapRolePolicies(DEFAULT_ROLE_POLICIES_TEMPLATE);
  if (templatePolicies.length <= 0) return [];
  if (!normalizedFile) return templatePolicies;

  const writeTemplateFile = () => {
    try {
      fs.mkdirSync(path.dirname(normalizedFile), { recursive: true });
      fs.writeFileSync(normalizedFile, `${JSON.stringify(templatePolicies, null, 2)}\n`, 'utf8');
      logLine({
        level: 'info',
        src: 'postprod',
        action: 'roles_bootstrap_config_created',
        message: `Fichier profils bootstrap cree: ${normalizedFile}`,
      });
    } catch (err) {
      logLine({
        level: 'warn',
        src: 'postprod',
        action: 'roles_bootstrap_config_write_failed',
        message: `Impossible d'ecrire ${normalizedFile}: ${String(err?.message || err)}`,
      });
    }
  };

  if (!fs.existsSync(normalizedFile)) {
    writeTemplateFile();
    return templatePolicies;
  }

  try {
    const raw = fs.readFileSync(normalizedFile, 'utf8');
    const parsed = JSON.parse(raw || '[]');
    const source = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed?.roles) ? parsed.roles : []);
    const policies = normalizeBootstrapRolePolicies(source);
    if (policies.length > 0) return policies;
    logLine({
      level: 'warn',
      src: 'postprod',
      action: 'roles_bootstrap_config_empty',
      message: `Fichier profils bootstrap vide/invalide: ${normalizedFile}. Fallback template.`,
    });
    return templatePolicies;
  } catch (err) {
    logLine({
      level: 'warn',
      src: 'postprod',
      action: 'roles_bootstrap_config_read_failed',
      message: `Lecture impossible de ${normalizedFile}: ${String(err?.message || err)}. Fallback template.`,
    });
    return templatePolicies;
  }
}

function ensureSchema(db, { logLine = () => {}, bootstrapRolePolicies = [] } = {}) {
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
        user_note TEXT NOT NULL DEFAULT '',
        avatar_path TEXT NOT NULL DEFAULT '',
        must_change_password INTEGER NOT NULL DEFAULT 0,
        failed_login_count INTEGER NOT NULL DEFAULT 0,
        locked_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_login_at TEXT,
        last_source_station TEXT NOT NULL DEFAULT '',
        last_source_version INTEGER NOT NULL DEFAULT 0
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
        can_manage_configuration INTEGER NOT NULL DEFAULT 0,
        can_ban_users INTEGER NOT NULL DEFAULT 0,
        can_manage_project_permissions INTEGER NOT NULL DEFAULT 0,
        can_launch_live_projects INTEGER NOT NULL DEFAULT 1,
        can_launch_projects INTEGER NOT NULL DEFAULT 1,
        can_launch_renders INTEGER NOT NULL DEFAULT 1,
        can_view_resources INTEGER NOT NULL DEFAULT 1,
        can_create_tasks INTEGER NOT NULL DEFAULT 1,
        can_assign_render_requests INTEGER NOT NULL DEFAULT 0,
        can_edit_projects INTEGER NOT NULL DEFAULT 1,
        can_manage_layouts INTEGER NOT NULL DEFAULT 1,
        manageable_roles_json TEXT NOT NULL DEFAULT '[]',
        is_system INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_source_station TEXT NOT NULL DEFAULT '',
        last_source_version INTEGER NOT NULL DEFAULT 0
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
        WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur') THEN 1
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
          WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur') THEN 1
          ELSE 0
        END,
        can_manage_project_permissions = CASE
          WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur') THEN 1
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
        WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur') THEN 1
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
        WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur', 'Operateur') THEN 1
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
          WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur', 'Operateur', 'Graphiste', 'Journaliste') THEN 1
          ELSE CASE WHEN can_use_live_mode = 1 OR can_use_postprod_mode = 1 THEN 1 ELSE 0 END
        END,
        can_create_tasks = CASE
          WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur', 'Operateur', 'Graphiste', 'Journaliste') THEN 1
          ELSE CASE WHEN can_launch_renders = 1 THEN 1 ELSE 0 END
        END,
        can_edit_projects = CASE
          WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur', 'Operateur') THEN 1
          WHEN key IN ('Graphiste', 'Journaliste') THEN 0
          ELSE CASE WHEN can_launch_projects = 1 THEN 1 ELSE 0 END
        END,
        can_manage_layouts = CASE
          WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur', 'Operateur') THEN 1
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

  const hasV39 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 39 LIMIT 1')
    .get();
  if (!hasV39) {
    const renderJobCols = db.prepare('PRAGMA table_info(render_jobs)').all();
    const renderJobColNames = new Set(renderJobCols.map((c) => String(c?.name || '').trim()));
    if (!renderJobColNames.has('scheduled_at')) {
      db.exec('ALTER TABLE render_jobs ADD COLUMN scheduled_at TEXT DEFAULT NULL');
    }
    if (!renderJobColNames.has('queue_order')) {
      db.exec('ALTER TABLE render_jobs ADD COLUMN queue_order INTEGER NOT NULL DEFAULT 0');
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(39, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v39',
      message: 'Migration SQLite postprod v39 appliquee (scheduled_at et queue_order sur render_jobs)',
    });
  }

  const hasV40 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 40 LIMIT 1')
    .get();
  if (!hasV40) {
    const renderJobCols = db.prepare('PRAGMA table_info(render_jobs)').all();
    const renderJobColNames = new Set(renderJobCols.map((c) => String(c?.name || '').trim()));
    if (!renderJobColNames.has('render_station')) {
      db.exec("ALTER TABLE render_jobs ADD COLUMN render_station TEXT NOT NULL DEFAULT 'local'");
    }
    if (!renderJobColNames.has('render_station_name')) {
      db.exec("ALTER TABLE render_jobs ADD COLUMN render_station_name TEXT NOT NULL DEFAULT ''");
    }
    if (!renderJobColNames.has('origin_station_ip')) {
      db.exec("ALTER TABLE render_jobs ADD COLUMN origin_station_ip TEXT NOT NULL DEFAULT ''");
    }
    if (!renderJobColNames.has('origin_station_name')) {
      db.exec("ALTER TABLE render_jobs ADD COLUMN origin_station_name TEXT NOT NULL DEFAULT ''");
    }
    if (!renderJobColNames.has('remote_job_id')) {
      db.exec('ALTER TABLE render_jobs ADD COLUMN remote_job_id INTEGER DEFAULT NULL');
    }
    if (!renderJobColNames.has('station_status')) {
      db.exec("ALTER TABLE render_jobs ADD COLUMN station_status TEXT NOT NULL DEFAULT ''");
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(40, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v40',
      message: 'Migration SQLite postprod v40 appliquee (render_station, origin_station, remote_job_id, station_status)',
    });
  }

  const hasV41 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 41 LIMIT 1')
    .get();
  if (!hasV41) {
    const userCols = db.prepare('PRAGMA table_info(users)').all();
    const userColNames = new Set(userCols.map((c) => String(c?.name || '').trim()));
    if (!userColNames.has('last_source_station')) {
      db.exec("ALTER TABLE users ADD COLUMN last_source_station TEXT NOT NULL DEFAULT ''");
    }
    if (!userColNames.has('last_source_version')) {
      db.exec('ALTER TABLE users ADD COLUMN last_source_version INTEGER NOT NULL DEFAULT 0');
    }

    const roleCols = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames = new Set(roleCols.map((c) => String(c?.name || '').trim()));
    if (!roleColNames.has('last_source_station')) {
      db.exec("ALTER TABLE roles ADD COLUMN last_source_station TEXT NOT NULL DEFAULT ''");
    }
    if (!roleColNames.has('last_source_version')) {
      db.exec('ALTER TABLE roles ADD COLUMN last_source_version INTEGER NOT NULL DEFAULT 0');
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS user_sync_events (
        version INTEGER PRIMARY KEY AUTOINCREMENT,
        op_id TEXT NOT NULL UNIQUE,
        source_station TEXT NOT NULL DEFAULT '',
        source_version INTEGER NOT NULL DEFAULT 0,
        entity_type TEXT NOT NULL,
        entity_public_id TEXT NOT NULL DEFAULT '',
        entity_key TEXT NOT NULL DEFAULT '',
        op TEXT NOT NULL,
        payload_json TEXT NOT NULL DEFAULT '{}',
        occurred_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_user_sync_events_entity_type
        ON user_sync_events(entity_type, occurred_at DESC, version DESC);
      CREATE INDEX IF NOT EXISTS idx_user_sync_events_source_station
        ON user_sync_events(source_station, version DESC);

      CREATE TABLE IF NOT EXISTS user_sync_cursors (
        peer_station TEXT PRIMARY KEY,
        last_version INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_tombstones (
        public_id TEXT PRIMARY KEY,
        deleted_at TEXT NOT NULL,
        source_station TEXT NOT NULL DEFAULT '',
        op_id TEXT NOT NULL DEFAULT '',
        payload_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_user_tombstones_deleted_at
        ON user_tombstones(deleted_at DESC);
    `);

    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(41, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v41',
      message: 'Migration SQLite postprod v41 appliquee (sync users/roles P2P)',
    });
  }

  const hasV42 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 42 LIMIT 1')
    .get();
  if (!hasV42) {
    const syncEventCols = db.prepare('PRAGMA table_info(user_sync_events)').all();
    const syncEventColNames = new Set(syncEventCols.map((c) => String(c?.name || '').trim()));
    if (!syncEventColNames.has('source_version')) {
      db.exec('ALTER TABLE user_sync_events ADD COLUMN source_version INTEGER NOT NULL DEFAULT 0');
    }
    db.exec(`
      UPDATE user_sync_events
      SET source_version = version
      WHERE COALESCE(source_version, 0) <= 0;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(42, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v42',
      message: 'Migration SQLite postprod v42 appliquee (source_version sync users/roles)',
    });
  }

  const hasV43 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 43 LIMIT 1')
    .get();
  if (!hasV43) {
    const workerCols43 = db.prepare('PRAGMA table_info(render_workers)').all();
    const workerColNames43 = new Set(workerCols43.map((c) => String(c?.name || '').trim()));
    if (!workerColNames43.has('apte')) {
      db.exec('ALTER TABLE render_workers ADD COLUMN apte INTEGER NOT NULL DEFAULT 0');
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(43, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v43',
      message: 'Migration SQLite postprod v43 appliquee (apte sur render_workers)',
    });
  }

  const hasV44 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 44 LIMIT 1')
    .get();
  if (!hasV44) {
    const rfCols44 = db.prepare('PRAGMA table_info(render_forms)').all();
    const rfColNames44 = new Set(rfCols44.map((c) => String(c?.name || '').trim()));
    if (!rfColNames44.has('allowed_sequences_json')) {
      db.exec("ALTER TABLE render_forms ADD COLUMN allowed_sequences_json TEXT NOT NULL DEFAULT '[]'");
    }
    if (!rfColNames44.has('allowed_presets_json')) {
      db.exec("ALTER TABLE render_forms ADD COLUMN allowed_presets_json TEXT NOT NULL DEFAULT '[]'");
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(44, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v44',
      message: 'Migration SQLite postprod v44 appliquee (allowed_sequences_json, allowed_presets_json sur render_forms)',
    });
  }

  const hasV45 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 45 LIMIT 1')
    .get();
  if (!hasV45) {
    const rfCols45 = db.prepare('PRAGMA table_info(render_forms)').all();
    const rfColNames45 = new Set(rfCols45.map((c) => String(c?.name || '').trim()));
    if (!rfColNames45.has('note_text')) {
      db.exec("ALTER TABLE render_forms ADD COLUMN note_text TEXT NOT NULL DEFAULT ''");
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(45, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v45',
      message: 'Migration SQLite postprod v45 appliquee (note_text sur render_forms)',
    });
  }

  const hasV46 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 46 LIMIT 1')
    .get();
  if (!hasV46) {
    const rfCols46 = db.prepare('PRAGMA table_info(render_forms)').all();
    const rfColNames46 = new Set(rfCols46.map((c) => String(c?.name || '').trim()));
    if (!rfColNames46.has('wrc_files_json')) {
      db.exec("ALTER TABLE render_forms ADD COLUMN wrc_files_json TEXT NOT NULL DEFAULT '[]'");
    }
    const rffCols46 = db.prepare('PRAGMA table_info(render_form_fields)').all();
    const rffColNames46 = new Set(rffCols46.map((c) => String(c?.name || '').trim()));
    if (!rffColNames46.has('wrc_file')) {
      db.exec("ALTER TABLE render_form_fields ADD COLUMN wrc_file TEXT NOT NULL DEFAULT ''");
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(46, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v46',
      message: 'Migration SQLite postprod v46 appliquee (wrc_files_json sur render_forms, wrc_file sur render_form_fields)',
    });
  }

  const hasV47 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 47 LIMIT 1')
    .get();
  if (!hasV47) {
    const roleCols47 = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames47 = new Set(roleCols47.map((c) => String(c?.name || '').trim()));
    if (!roleColNames47.has('can_assign_render_requests')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_assign_render_requests INTEGER NOT NULL DEFAULT 0");
    }
    db.exec(`
      UPDATE roles
      SET can_assign_render_requests = CASE
        WHEN key IN ('Admin', 'Responsable Fabrication', 'Integrateur') THEN 1
        ELSE 0
      END
      WHERE is_system = 1;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(47, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v47',
      message: 'Migration SQLite postprod v47 appliquee (permission can_assign_render_requests)',
    });
  }

  const hasV48 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 48 LIMIT 1')
    .get();
  if (!hasV48) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        task_id INTEGER NOT NULL DEFAULT 0,
        render_job_id INTEGER NOT NULL DEFAULT 0,
        created_by_user_id INTEGER NOT NULL DEFAULT 0,
        message TEXT NOT NULL DEFAULT '',
        meta_json TEXT NOT NULL DEFAULT '{}',
        resolved_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK(alert_type IN ('new_assignment', 'to_modify', 'render_error')),
        CHECK(status IN ('open', 'resolved')),
        CHECK(task_id >= 0),
        CHECK(render_job_id >= 0),
        CHECK(created_by_user_id >= 0),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_alerts_user_status_created
        ON user_alerts(user_id, status, created_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_user_alerts_render_status
        ON user_alerts(render_job_id, status, updated_at DESC, id DESC);
      CREATE INDEX IF NOT EXISTS idx_user_alerts_task_status
        ON user_alerts(task_id, status, updated_at DESC, id DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_alerts_open_unique
        ON user_alerts(user_id, alert_type, task_id, render_job_id)
        WHERE status = 'open';
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(48, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v48',
      message: 'Migration SQLite postprod v48 appliquee (table user_alerts pour notifications rendu)',
    });
  }

  const hasV50 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 50 LIMIT 1')
    .get();
  if (!hasV50) {
    const roleCols50 = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames50 = new Set(roleCols50.map((c) => String(c?.name || '').trim()));
    const hadCanLaunchLiveProjects = roleColNames50.has('can_launch_live_projects');
    if (!hadCanLaunchLiveProjects) {
      db.exec("ALTER TABLE roles ADD COLUMN can_launch_live_projects INTEGER NOT NULL DEFAULT 1");
    }
    if (!hadCanLaunchLiveProjects) {
      db.exec(`
        UPDATE roles
        SET can_launch_live_projects = CASE
          WHEN can_launch_projects = 1 THEN 1
          ELSE 0
        END;
      `);
    } else {
      db.exec(`
        UPDATE roles
        SET can_launch_live_projects = CASE
          WHEN can_launch_projects = 1 THEN 1
          ELSE 0
        END
        WHERE can_launch_live_projects IS NULL;
      `);
    }
    const res = rebaselineSystemRolesFromBootstrapPolicies(db, bootstrapRolePolicies);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(50, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v50',
      message: `Migration SQLite postprod v50 appliquee (permission can_launch_live_projects + rebase roles systeme: ${res.updated}/${res.matched})`,
    });
  }

  const hasV49 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 49 LIMIT 1')
    .get();
  if (!hasV49) {
    const res = rebaselineSystemRolesFromBootstrapPolicies(db, bootstrapRolePolicies);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(49, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v49',
      message: `Migration SQLite postprod v49 appliquee (roles systeme rebase sur policies bootstrap: ${res.updated}/${res.matched})`,
    });
  }

  const hasV51 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 51 LIMIT 1')
    .get();
  if (!hasV51) {
    const roleCols51 = db.prepare('PRAGMA table_info(roles)').all();
    const roleColNames51 = new Set(roleCols51.map((c) => String(c?.name || '').trim()));
    if (!roleColNames51.has('can_manage_configuration')) {
      db.exec("ALTER TABLE roles ADD COLUMN can_manage_configuration INTEGER NOT NULL DEFAULT 0");
    }
    db.exec(`
      UPDATE roles
      SET can_manage_configuration = CASE
        WHEN key = 'Admin' THEN 1
        ELSE 0
      END
      WHERE is_system = 1;
    `);
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(51, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v51',
      message: 'Migration SQLite postprod v51 appliquee (permission can_manage_configuration)',
    });
  }

  const hasV52 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 52 LIMIT 1')
    .get();
  if (!hasV52) {
    const userCols52 = db.prepare('PRAGMA table_info(users)').all();
    const userColNames52 = new Set(userCols52.map((c) => String(c?.name || '').trim()));
    if (userColNames52.has('employment_type')) {
      db.exec(`
        DROP INDEX IF EXISTS idx_users_employment_type;
        ALTER TABLE users DROP COLUMN employment_type;
      `);
    }
    db.prepare('INSERT INTO schema_migrations(version, applied_at) VALUES(52, ?)').run(nowIso());
    logLine({
      level: 'info',
      src: 'postprod',
      action: 'db_migration_v52',
      message: 'Migration SQLite postprod v52 appliquee (suppression colonne employment_type)',
    });
  }

  ensureDefaultRoles(db, bootstrapRolePolicies, logLine);
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
        u.user_note,
        u.avatar_path,
        u.must_change_password,
        u.failed_login_count,
        u.locked_until,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        u.last_source_station,
        u.last_source_version,
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
        u.user_note,
        u.avatar_path,
        u.must_change_password,
        u.failed_login_count,
        u.locked_until,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        u.last_source_station,
        u.last_source_version,
        COALESCE(up.timezone, '') AS timezone,
        COALESCE(up.language, 'fr') AS language,
        COALESCE(up.notification_preferences_json, '{}') AS notification_preferences_json
      FROM users u
      LEFT JOIN user_preferences up ON up.user_id = u.id
      WHERE u.id = ?
      LIMIT 1
    `),
    findUserByPublicIdFull: db.prepare(`
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
        u.user_note,
        u.avatar_path,
        u.must_change_password,
        u.failed_login_count,
        u.locked_until,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        u.last_source_station,
        u.last_source_version,
        COALESCE(up.timezone, '') AS timezone,
        COALESCE(up.language, 'fr') AS language,
        COALESCE(up.notification_preferences_json, '{}') AS notification_preferences_json
      FROM users u
      LEFT JOIN user_preferences up ON up.user_id = u.id
      WHERE u.public_id = ?
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
        u.user_note,
        u.avatar_path,
        u.must_change_password,
        u.failed_login_count,
        u.locked_until,
        u.created_at,
        u.updated_at,
        u.last_login_at,
        u.last_source_station,
        u.last_source_version,
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
        user_note,
        avatar_path,
        must_change_password,
        failed_login_count,
        locked_until,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    deleteUserByPublicId: db.prepare(`
      DELETE FROM users
      WHERE public_id = ?
    `),
    updateUserSyncSourceById: db.prepare(`
      UPDATE users
      SET
        last_source_station = ?,
        last_source_version = ?
      WHERE id = ?
    `),
    insertUserFromSync: db.prepare(`
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
        user_note,
        avatar_path,
        must_change_password,
        failed_login_count,
        locked_until,
        created_at,
        updated_at,
        last_login_at,
        last_source_station,
        last_source_version
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    updateUserFromSyncByPublicId: db.prepare(`
      UPDATE users
      SET
        username = ?,
        password_hash = ?,
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
        user_note = ?,
        avatar_path = ?,
        must_change_password = ?,
        failed_login_count = ?,
        locked_until = ?,
        updated_at = ?,
        last_login_at = ?,
        last_source_station = ?,
        last_source_version = ?
      WHERE public_id = ?
    `),
    findUserByUsernameExcludingPublicId: db.prepare(`
      SELECT id, public_id, username
      FROM users
      WHERE username = ?
        AND public_id <> ?
      LIMIT 1
    `),
    getMaxUserSyncEventVersion: db.prepare('SELECT COALESCE(MAX(version), 0) AS n FROM user_sync_events'),
    getMaxUserSyncSourceVersionByStation: db.prepare(`
      SELECT COALESCE(MAX(source_version), 0) AS n
      FROM user_sync_events
      WHERE source_station = ?
    `),
    findUserSyncEventByOpId: db.prepare(`
      SELECT version, source_station, source_version, op_id
      FROM user_sync_events
      WHERE op_id = ?
      LIMIT 1
    `),
    listUserSyncEventsSinceVersion: db.prepare(`
      SELECT
        version,
        source_station,
        source_version,
        op_id,
        entity_type,
        entity_public_id,
        entity_key,
        op,
        payload_json,
        occurred_at
      FROM user_sync_events
      WHERE version > ?
      ORDER BY version ASC
      LIMIT ?
    `),
    insertUserSyncEvent: db.prepare(`
      INSERT INTO user_sync_events(
        op_id,
        source_station,
        source_version,
        entity_type,
        entity_public_id,
        entity_key,
        op,
        payload_json,
        occurred_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    findUserSyncCursorByPeer: db.prepare(`
      SELECT peer_station, last_version, updated_at
      FROM user_sync_cursors
      WHERE peer_station = ?
      LIMIT 1
    `),
    upsertUserSyncCursorByPeer: db.prepare(`
      INSERT INTO user_sync_cursors(peer_station, last_version, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(peer_station) DO UPDATE SET
        last_version = excluded.last_version,
        updated_at = excluded.updated_at
    `),
    findUserTombstoneByPublicId: db.prepare(`
      SELECT public_id, deleted_at, source_station, op_id, payload_json, updated_at
      FROM user_tombstones
      WHERE public_id = ?
      LIMIT 1
    `),
    upsertUserTombstone: db.prepare(`
      INSERT INTO user_tombstones(public_id, deleted_at, source_station, op_id, payload_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(public_id) DO UPDATE SET
        deleted_at = excluded.deleted_at,
        source_station = excluded.source_station,
        op_id = excluded.op_id,
        payload_json = excluded.payload_json,
        updated_at = excluded.updated_at
    `),
    deleteUserTombstoneByPublicId: db.prepare(`
      DELETE FROM user_tombstones
      WHERE public_id = ?
    `),
    countActiveUsersWithManageRolesExcluding: db.prepare(`
      SELECT COUNT(*) AS n
      FROM users u
      JOIN roles r ON r.key = u.role
      WHERE u.is_active = 1
        AND r.can_manage_roles = 1
        AND u.id <> ?
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
    countAllAuditEntries: db.prepare(`
      SELECT COUNT(*) AS n
      FROM audit_log
    `),
    deleteAllAuditEntries: db.prepare(`
      DELETE FROM audit_log
    `),
    deleteAuditByActorUserId: db.prepare(`
      DELETE FROM audit_log WHERE actor_user_id = ?
    `),
    insertOpenUserAlert: db.prepare(`
      INSERT OR IGNORE INTO user_alerts(
        user_id,
        alert_type,
        status,
        task_id,
        render_job_id,
        created_by_user_id,
        message,
        meta_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)
    `),
    touchOpenUserAlertByScope: db.prepare(`
      UPDATE user_alerts
      SET
        created_by_user_id = ?,
        message = ?,
        meta_json = ?,
        updated_at = ?
      WHERE user_id = ?
        AND alert_type = ?
        AND task_id = ?
        AND render_job_id = ?
        AND status = 'open'
    `),
    resolveOpenUserAlertsByRenderIdAndType: db.prepare(`
      UPDATE user_alerts
      SET
        status = 'resolved',
        resolved_at = ?,
        updated_at = ?
      WHERE status = 'open'
        AND render_job_id = ?
        AND alert_type = ?
    `),
    resolveOpenUserAlertsByTaskIdAndType: db.prepare(`
      UPDATE user_alerts
      SET
        status = 'resolved',
        resolved_at = ?,
        updated_at = ?
      WHERE status = 'open'
        AND task_id = ?
        AND alert_type = ?
    `),
    resolveOpenUserAlertsByRenderId: db.prepare(`
      UPDATE user_alerts
      SET
        status = 'resolved',
        resolved_at = ?,
        updated_at = ?
      WHERE status = 'open'
        AND render_job_id = ?
    `),
    resolveOpenUserAlertsByTaskId: db.prepare(`
      UPDATE user_alerts
      SET
        status = 'resolved',
        resolved_at = ?,
        updated_at = ?
      WHERE status = 'open'
        AND task_id = ?
    `),
    resolveOpenUserAlertsByUserTaskIdAndType: db.prepare(`
      UPDATE user_alerts
      SET
        status = 'resolved',
        resolved_at = ?,
        updated_at = ?
      WHERE status = 'open'
        AND user_id = ?
        AND task_id = ?
        AND alert_type = ?
    `),
    listOpenUserAlertsByUserId: db.prepare(`
      SELECT
        id,
        user_id,
        alert_type,
        status,
        task_id,
        render_job_id,
        created_by_user_id,
        message,
        meta_json,
        resolved_at,
        created_at,
        updated_at
      FROM user_alerts
      WHERE user_id = ?
        AND status = 'open'
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `),
    countOpenUserAlertsByUserId: db.prepare(`
      SELECT
        COUNT(*) AS total_open,
        SUM(CASE WHEN alert_type = 'to_modify' THEN 1 ELSE 0 END) AS to_modify_open,
        SUM(CASE WHEN alert_type = 'render_error' THEN 1 ELSE 0 END) AS render_error_open,
        SUM(CASE WHEN alert_type = 'new_assignment' THEN 1 ELSE 0 END) AS new_assignment_open
      FROM user_alerts
      WHERE user_id = ?
        AND status = 'open'
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
        rf.wrc_files_json,
        rf.mode_default,
        rf.is_active,
        rf.layout_json,
        rf.allowed_sequences_json,
        rf.allowed_presets_json,
        rf.note_text,
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
        rf.wrc_files_json,
        rf.mode_default,
        rf.is_active,
        rf.layout_json,
        rf.allowed_sequences_json,
        rf.allowed_presets_json,
        rf.note_text,
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
        rf.wrc_files_json,
        rf.mode_default,
        rf.is_active,
        rf.layout_json,
        rf.allowed_sequences_json,
        rf.allowed_presets_json,
        rf.note_text,
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
        rf.wrc_files_json,
        rf.mode_default,
        rf.is_active,
        rf.layout_json,
        rf.allowed_sequences_json,
        rf.allowed_presets_json,
        rf.note_text,
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
        wrc_files_json,
        mode_default,
        is_active,
        layout_json,
        allowed_sequences_json,
        allowed_presets_json,
        note_text,
        created_by_user_id,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        wrc_files_json = ?,
        mode_default = ?,
        is_active = ?,
        layout_json = ?,
        allowed_sequences_json = ?,
        allowed_presets_json = ?,
        note_text = ?,
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
        rff.wrc_file,
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
    deleteRenderFormFieldById: db.prepare(`
      DELETE FROM render_form_fields
      WHERE id = ?
    `),
    updateRenderFormFieldMeta: db.prepare(`
      UPDATE render_form_fields
      SET
        group_name = ?,
        default_value_json = ?,
        updated_at = ?
      WHERE id = ?
    `),
    deleteRenderFormFieldsByWrcFile: db.prepare(`
      DELETE FROM render_form_fields
      WHERE form_id = ? AND wrc_file = ?
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
        wrc_file,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        r.scheduled_at,
        r.queue_order,
        r.render_station,
        r.render_station_name,
        r.origin_station_ip,
        r.origin_station_name,
        r.remote_job_id,
        r.station_status,
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
        r.scheduled_at,
        r.queue_order,
        r.render_station,
        r.render_station_name,
        r.origin_station_ip,
        r.origin_station_name,
        r.remote_job_id,
        r.station_status,
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
    reserveRenderJobId: db.prepare(`
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
        scheduled_at,
        queue_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),
    deleteReservedRenderJobById: db.prepare(`
      DELETE FROM render_jobs
      WHERE id = ? AND status = 'Reserved'
    `),
    insertRenderJobWithId: db.prepare(`
      INSERT INTO render_jobs(
        id,
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
        scheduled_at,
        queue_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        scheduled_at,
        queue_order,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    updateRenderJobPayload: db.prepare(`
      UPDATE render_jobs
      SET payload_json = ?, updated_at = ?
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
      SELECT u.id
      FROM users u
      LEFT JOIN roles r ON r.key = u.role
      WHERE u.is_active = 1
        AND COALESCE(r.can_launch_renders, 0) = 1
      ORDER BY
        COALESCE(r.can_manage_project_permissions, 0) DESC,
        COALESCE(r.can_sync_scenes, 0) DESC,
        u.id ASC
      LIMIT 1
    `),
    findRenderDetectionFallbackActor: db.prepare(`
      SELECT u.id
      FROM users u
      LEFT JOIN roles r ON r.key = u.role
      WHERE u.is_active = 1
      ORDER BY
        COALESCE(r.can_launch_renders, 0) DESC,
        COALESCE(r.can_create_tasks, 0) DESC,
        u.id ASC
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
        w.apte,
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
        w.apte,
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
        -- apte n'est PAS mis à jour ici : il ne change que via PATCH /aptitude
    `),
    updateRenderWorkerAptitude: db.prepare(`
      UPDATE render_workers
      SET apte = ?, updated_at = ?
      WHERE worker_key = ?
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
    listDispatchableRenderJobsScheduled: db.prepare(`
      SELECT
        id,
        project_name,
        payload_json,
        status,
        requires_validation,
        validated_by_user_id,
        created_at,
        scheduled_at,
        queue_order
      FROM render_jobs
      WHERE status = 'Queued'
        AND assigned_worker_id IS NULL
        AND (
          requires_validation = 0
          OR validated_by_user_id IS NOT NULL
        )
        AND (scheduled_at IS NULL OR scheduled_at <= ?)
      ORDER BY queue_order ASC, created_at ASC, id ASC
      LIMIT ?
    `),
    listQueuedRenderJobs: db.prepare(`
      SELECT *
      FROM render_jobs
      WHERE status = 'Queued'
      ORDER BY queue_order ASC, created_at ASC
    `),
    countActiveRenderJobs: db.prepare(`
      SELECT COUNT(*) AS n
      FROM render_jobs
      WHERE status IN ('Queued', 'Running')
    `),
    updateRenderJobRemoteOrigin: db.prepare(`
      UPDATE render_jobs
      SET
        origin_station_ip   = ?,
        origin_station_name = ?,
        remote_job_id       = ?,
        render_station      = ?,
        render_station_name = ?,
        station_status      = ?,
        updated_at          = ?
      WHERE id = ?
    `),
    updateRenderJobSchedule: db.prepare(`
      UPDATE render_jobs
      SET scheduled_at = ?, updated_at = ?
      WHERE id = ?
        AND status IN ('Queued')
    `),
    updateRenderJobQueueOrder: db.prepare(`
      UPDATE render_jobs
      SET queue_order = ?, updated_at = ?
      WHERE id = ?
    `),
    deleteRenderJobById: db.prepare(`
      DELETE FROM render_jobs
      WHERE id = ?
    `),
    listAllRenderJobsForExport: db.prepare(`
      SELECT *
      FROM render_jobs
      ORDER BY queue_order ASC, created_at ASC
    `),
    updateRenderJobStationStatus: db.prepare(`
      UPDATE render_jobs
      SET station_status = ?, updated_at = ?
      WHERE id = ?
    `),
    findRenderJobByRemoteId: db.prepare(`
      SELECT *
      FROM render_jobs
      WHERE origin_station_ip = ?
        AND remote_job_id = ?
      LIMIT 1
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
        AND apte = 1
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
        can_manage_configuration,
        can_ban_users,
        can_manage_project_permissions,
        can_launch_live_projects,
        can_launch_projects,
        can_launch_renders,
        can_view_resources,
        can_create_tasks,
        can_assign_render_requests,
        can_edit_projects,
        can_manage_layouts,
        manageable_roles_json,
        is_system,
        created_at,
        updated_at,
        last_source_station,
        last_source_version
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
        can_manage_configuration,
        can_ban_users,
        can_manage_project_permissions,
        can_launch_live_projects,
        can_launch_projects,
        can_launch_renders,
        can_view_resources,
        can_create_tasks,
        can_assign_render_requests,
        can_edit_projects,
        can_manage_layouts,
        manageable_roles_json,
        is_system,
        created_at,
        updated_at,
        last_source_station,
        last_source_version
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
        can_manage_configuration,
        can_ban_users,
        can_manage_project_permissions,
        can_launch_live_projects,
        can_launch_projects,
        can_launch_renders,
        can_view_resources,
        can_create_tasks,
        can_assign_render_requests,
        can_edit_projects,
        can_manage_layouts,
        manageable_roles_json,
        is_system,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        can_manage_configuration = ?,
        can_ban_users = ?,
        can_manage_project_permissions = ?,
        can_launch_live_projects = ?,
        can_launch_projects = ?,
        can_launch_renders = ?,
        can_view_resources = ?,
        can_create_tasks = ?,
        can_assign_render_requests = ?,
        can_edit_projects = ?,
        can_manage_layouts = ?,
        manageable_roles_json = ?,
        updated_at = ?
      WHERE key = ?
    `),
    updateRoleSyncSourceByKey: db.prepare(`
      UPDATE roles
      SET
        last_source_station = ?,
        last_source_version = ?
      WHERE key = ?
    `),
    countRolesManageRolesExcluding: db.prepare(`
      SELECT COUNT(*) AS n
      FROM roles
      WHERE can_manage_roles = 1
        AND key <> ?
    `),
    updateUsersRoleByRoleKey: db.prepare(`
      UPDATE users
      SET role = ?, updated_at = ?
      WHERE role = ?
    `),
    deleteRoleByKey: db.prepare(`
      DELETE FROM roles WHERE key = ?
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
    canManageConfiguration: row?.canManageConfiguration === true,
    canBanUsers: row?.canBanUsers === true,
    canManageProjectPermissions: row?.canManageProjectPermissions === true,
    canLaunchLiveProjects: row?.canLaunchLiveProjects !== false,
    canLaunchProjects: row?.canLaunchProjects !== false,
    canLaunchRenders: row?.canLaunchRenders !== false,
    canViewResources: row?.canViewResources === true,
    canCreateTasks: row?.canCreateTasks === true,
    canAssignRenderRequests: row?.canAssignRenderRequests === true,
    canEditProjects: row?.canEditProjects === true,
    canManageLayouts: row?.canManageLayouts === true,
    manageableRoles: normalizeManageableRolesInput(row?.manageableRoles),
    isSystem: row?.isSystem === true,
    createdAt: row?.createdAt || null,
    updatedAt: row?.updatedAt || null,
  };
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
    wrcFiles: parseJsonArray(row?.wrc_files_json),
    modeDefault: normalizeRenderFormModeDefault(row?.mode_default, 'edit'),
    isActive: Number(row?.is_active) === 1,
    layout: parseJsonValue(row?.layout_json, {}),
    allowedSequences: parseJsonArray(row?.allowed_sequences_json),
    allowedPresets: parseJsonArray(row?.allowed_presets_json),
    note: String(row?.note_text || ''),
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
    wrcFile: String(row?.wrc_file || ''),
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
    scheduledAt: row?.scheduled_at || null,
    queueOrder: Number.isFinite(Number(row?.queue_order)) ? Math.trunc(Number(row?.queue_order)) : 0,
    renderStation: String(row?.render_station || 'local'),
    renderStationName: String(row?.render_station_name || ''),
    originStationIp: String(row?.origin_station_ip || ''),
    originStationName: String(row?.origin_station_name || ''),
    remoteJobId: row?.remote_job_id != null ? Number(row.remote_job_id) : null,
    stationStatus: String(row?.station_status || ''),
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
    apte: Number(row?.apte) === 1,
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
      remoteBridge: null,
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
      remoteBridge: null,
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
  const usersSyncPollIntervalRaw = Number(process.env.UU_POSTPROD_USERS_SYNC_POLL_INTERVAL_MS);
  const usersSyncPollIntervalMs =
    Number.isFinite(usersSyncPollIntervalRaw)
      ? Math.max(
          MIN_USERS_SYNC_POLL_INTERVAL_MS,
          Math.min(MAX_USERS_SYNC_POLL_INTERVAL_MS, Math.trunc(usersSyncPollIntervalRaw))
        )
      : DEFAULT_USERS_SYNC_POLL_INTERVAL_MS;
  const usersSyncRemoteTimeoutRaw = Number(process.env.UU_POSTPROD_USERS_SYNC_REMOTE_TIMEOUT_MS);
  const usersSyncRemoteTimeoutMs =
    Number.isFinite(usersSyncRemoteTimeoutRaw)
      ? Math.max(
          MIN_USERS_SYNC_REMOTE_TIMEOUT_MS,
          Math.min(MAX_USERS_SYNC_REMOTE_TIMEOUT_MS, Math.trunc(usersSyncRemoteTimeoutRaw))
        )
      : DEFAULT_USERS_SYNC_REMOTE_TIMEOUT_MS;
  const usersSyncFetchLimitRaw = Number(process.env.UU_POSTPROD_USERS_SYNC_FETCH_LIMIT);
  const usersSyncFetchLimit =
    Number.isFinite(usersSyncFetchLimitRaw)
      ? Math.max(1, Math.min(MAX_USERS_SYNC_FETCH_LIMIT, Math.trunc(usersSyncFetchLimitRaw)))
      : DEFAULT_USERS_SYNC_FETCH_LIMIT;
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

  function buildRenderOutputSubdir(jobId, projectId, baseDir) {
    const renderId = String(Math.trunc(Math.max(0, Number(jobId) || 0)));
    const cleanProjectId = String(projectId || '').trim().replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'projet';
    const subdirName = `${renderId}_${cleanProjectId}`;
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
      let projectId = '';
      try {
        const projects = loadPostprodProjectsCatalog(sharedStore, stmts);
        const nameNorm = String(projectName || '').trim().toLowerCase();
        const matched = projects.find((p) => (
          String(p?.name || '').trim().toLowerCase() === nameNorm ||
          String(p?.id || '').trim().toLowerCase() === nameNorm
        ));
        projectId = String(matched?.id || '').trim();
      } catch {}
      const jobDir = buildRenderOutputSubdir(jobId, projectId || projectName, baseDir);
      fs.mkdirSync(path.join(jobDir, 'logs'), { recursive: true });
      fs.mkdirSync(path.join(jobDir, 'images'), { recursive: true });
      fs.mkdirSync(path.join(jobDir, 'proxy'), { recursive: true });
      return { ok: true, outputPath: jobDir };
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
    const filePath = sanitizeRenderOutputPath(
      payload?.filePath ||
      payload?.outputPath ||
      ''
    );
    const fileNameLower = String(
      payload?.fileName
      || (filePath ? path.basename(filePath) : '')
      || ''
    ).trim().toLowerCase();
    const filePathLower = String(filePath || '').replace(/\\/g, '/').toLowerCase();
    if (
      fileNameLower === 'proxy.mp4'
      || fileNameLower === 'proxy_alpha.mp4'
      || fileNameLower === 'thumbnail.jpg'
      || /\/_?proxy\/(proxy|proxy_alpha)\.mp4$/i.test(filePathLower)
      || /\/images\/thumbnail\.jpg$/i.test(filePathLower)
    ) {
      return false;
    }

    if (roots.length <= 0) return true;

    const sourceDir = sanitizeRenderOutputPath(payload?.sourceDir || '');

    if (sourceDir) {
      return roots.some((root) => isPathUnderRoot(sourceDir, root));
    }
    if (filePath) {
      return roots.some((root) => isPathUnderRoot(filePath, root));
    }
    return true;
  }

  const bootstrapRolesConfigFile = resolveAbsPathSafe(
    String(process.env.UU_POSTPROD_BOOTSTRAP_ROLES_FILE || '').trim()
    || path.join(rootDataDir, 'postprod-default-roles.json')
  );
  const bootstrapRolePolicies = loadBootstrapRolePoliciesFromFile({
    configFile: bootstrapRolesConfigFile,
    logLine,
  });

  const dbPath = path.join(rootDataDir, 'postprod.sqlite');
  let db;
  try {
    fs.mkdirSync(rootDataDir, { recursive: true });
    db = new BetterSqlite3(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    ensureSchema(db, { logLine, bootstrapRolePolicies });
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
      remoteBridge: null,
    };
  }

  let stmts;
  try {
    stmts = createStatements(db);
  } catch (err) {
    const reason = `Erreur preparation SQL (createStatements): ${String(err?.message || err)}`;
    logLine({ level: 'error', src: 'postprod', action: 'db_init_failed', message: reason });
    return {
      available: false,
      dbPath,
      handleRoutes: buildUnavailableHandler(reason),
      remoteBridge: null,
    };
  }
  let rolesCache = buildRolesCache(stmts.listRoles.all());
  function resolveBootstrapAdminRoleKey() {
    const byKey = rolesCache?.byKey instanceof Map ? rolesCache.byKey : new Map();
    const preferredRoles = ['Admin', DEFAULT_FALLBACK_ROLE];
    for (const candidate of preferredRoles) {
      const resolved = resolveRoleInput(candidate, rolesCache, '');
      if (resolved && byKey.has(resolved)) return resolved;
    }
    for (const roleRow of byKey.values()) {
      const roleKey = String(roleRow?.key || '').trim();
      if (!roleKey) continue;
      const perms = rolePermissions(roleKey, rolesCache);
      if (perms?.canManageUsers === true && perms?.canManageRoles === true) {
        return roleKey;
      }
    }
    const firstRoleKey = Array.isArray(rolesCache?.list) && rolesCache.list.length > 0
      ? String(rolesCache.list[0]?.key || '').trim()
      : '';
    if (firstRoleKey) return firstRoleKey;
    return DEFAULT_FALLBACK_ROLE || 'Admin';
  }

  function ensureBootstrapAdminUser() {
    const usersCountRaw = Number(stmts.countUsers.get()?.n || 0);
    const usersCount = Number.isFinite(usersCountRaw) ? Math.max(0, Math.trunc(usersCountRaw)) : 0;
    if (usersCount > 0) return null;

    const roleKey = resolveBootstrapAdminRoleKey();
    const username = normalizeUsername('admin') || 'admin';
    const displayName = 'Admin';
    const firstName = 'Admin';
    const now = nowIso();
    const publicId = 'usr_bootstrap_admin';
    try {
      const result = stmts.insertUser.run(
        publicId,
        username,
        hashPassword('admin', pbkdf2Iters),
        roleKey,
        1,
        displayName,
        firstName,
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
      const createdId = Number(result?.lastInsertRowid || 0);
      if (Number.isFinite(createdId) && createdId > 0) {
        stmts.upsertUserPreferences.run(
          createdId,
          '',
          DEFAULT_USER_LANGUAGE,
          '{}',
          now,
          now
        );
      }
      const created = stmts.findUserById.get(createdId);
      logLine({
        level: 'info',
        src: 'postprod',
        action: 'bootstrap_admin_seeded',
        message: `Utilisateur bootstrap cree: ${username} / admin`,
      });
      return created || null;
    } catch (err) {
      logLine({
        level: 'warn',
        src: 'postprod',
        action: 'bootstrap_admin_seed_failed',
        message: `Creation utilisateur bootstrap impossible: ${String(err?.message || err)}`,
      });
      return null;
    }
  }
  const bootstrappedAdminUser = ensureBootstrapAdminUser();

  // Merge WRC fields into existing SQLite fields, scoped to a single wrcFile.
  // - Match by source_path (stable WRC GUID identifier) within the wrcFile scope.
  // - Matched: update only group_name + default_value_json (preserve user customizations).
  // - New (not in existing for this wrcFile): insert with sort_order after all existing ones.
  // - Orphaned (in SQLite for this wrcFile but not in incoming list): delete.
  // If wrcFile is empty, the editor save is treated as a full form snapshot replacement.
  function mergeRenderFormFieldsTx(formId, normalizedFields, wrcFile, nowIsoValue, localStmts) {
    const s = localStmts || stmts;
    const scopedWrcFile = String(wrcFile || '').trim();
    db.transaction(() => {
      const allExisting = s.listRenderFormFieldsByFormId.all(formId);
      function reserveUniqueFieldKey(rawFieldKey, sourcePath, usedSet) {
        const baseKey = sanitizeRenderFormFieldKey(rawFieldKey, sourcePath);
        if (!baseKey) return '';
        let candidate = baseKey;
        let dedupeIndex = 2;
        while (usedSet.has(candidate.toLowerCase())) {
          candidate = sanitizeRenderFormFieldKey(`${baseKey}_${dedupeIndex}`, baseKey);
          dedupeIndex += 1;
          if (!candidate) break;
        }
        if (!candidate) return '';
        usedSet.add(candidate.toLowerCase());
        return candidate;
      }
      function reserveUniquePayloadKey(rawPayloadKey, fieldKey, usedSet) {
        const baseKey = sanitizeRenderFormFieldPayloadKey(rawPayloadKey, fieldKey) || fieldKey;
        let candidate = baseKey;
        let dedupeIndex = 2;
        while (usedSet.has(candidate.toLowerCase())) {
          candidate = sanitizeRenderFormFieldPayloadKey(`${baseKey}_${dedupeIndex}`, fieldKey) || `${fieldKey}_${dedupeIndex}`;
          dedupeIndex += 1;
        }
        usedSet.add(candidate.toLowerCase());
        return candidate;
      }

      // Manual editor save (no WRC scope): replace the full form field snapshot.
      if (!scopedWrcFile) {
        s.deleteRenderFormFieldsByFormId.run(formId);
        const usedFieldKeys = new Set();
        const usedPayloadKeys = new Set();
        const incoming = (Array.isArray(normalizedFields) ? normalizedFields : [])
          .slice()
          .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0));
        let nextSortOrder = 1;
        for (const field of incoming) {
          const sourcePath = String(field?.sourcePath || '').trim();
          const fieldKeySeed = sourcePath || `field_${nextSortOrder}`;
          const nextFieldKey = reserveUniqueFieldKey(field?.fieldKey, fieldKeySeed, usedFieldKeys);
          if (!nextFieldKey) continue;
          const nextPayloadKey = reserveUniquePayloadKey(field?.payloadKey, nextFieldKey, usedPayloadKeys);
          s.insertRenderFormField.run(
            formId,
            nextFieldKey,
            field?.fieldLabel,
            sourcePath,
            field?.sourceType,
            field?.inputKind,
            field?.valueType,
            field?.groupName,
            nextPayloadKey,
            field?.placeholder,
            field?.helpText,
            field?.optionsJson,
            field?.validationJson,
            field?.defaultValueJson,
            field?.isRequired ? 1 : 0,
            field?.isVisible ? 1 : 0,
            nextSortOrder,
            String(field?.wrcFile || '').trim(),
            nowIsoValue,
            nowIsoValue
          );
          nextSortOrder += 1;
        }
        return;
      }

      // Scope to matching wrc_file
      const existing = scopedWrcFile
        ? allExisting.filter((row) => String(row.wrc_file || '').trim() === scopedWrcFile)
        : allExisting;

      const existingBySourcePath = new Map();
      for (const row of existing) {
        const key = String(row.source_path || '').trim();
        if (key) existingBySourcePath.set(key, row);
      }

      const incomingSourcePaths = new Set();
      const incomingBySourcePath = new Map();
      for (const field of normalizedFields) {
        const key = String(field.sourcePath || '').trim();
        if (key) {
          incomingSourcePaths.add(key);
          incomingBySourcePath.set(key, field);
        }
      }

      // Update matched fields (only WRC-sourced metadata).
      for (const [sourcePath, row] of existingBySourcePath) {
        if (incomingSourcePaths.has(sourcePath)) {
          const incoming = incomingBySourcePath.get(sourcePath);
          s.updateRenderFormFieldMeta.run(
            incoming.groupName,
            incoming.defaultValueJson,
            nowIsoValue,
            row.id
          );
        } else {
          // Orphaned within this wrcFile scope: delete.
          s.deleteRenderFormFieldById.run(row.id);
        }
      }

      // Insert new fields (not yet in SQLite for this wrcFile scope).
      const maxExistingSortOrder = allExisting.reduce(
        (max, row) => Math.max(max, Number(row.sort_order || 0)),
        0
      );
      const usedFieldKeys = new Set(
        allExisting
          .map((row) => String(row?.field_key || '').trim().toLowerCase())
          .filter(Boolean)
      );
      const usedPayloadKeys = new Set(
        allExisting
          .map((row) => String(row?.payload_key || '').trim().toLowerCase())
          .filter(Boolean)
      );
      let nextSortOrder = maxExistingSortOrder + 1;
      for (const field of normalizedFields) {
        const sourcePath = String(field.sourcePath || '').trim();
        if (!sourcePath || existingBySourcePath.has(sourcePath)) continue;
        const nextFieldKey = reserveUniqueFieldKey(field.fieldKey, sourcePath, usedFieldKeys);
        if (!nextFieldKey) continue;
        const nextPayloadKey = reserveUniquePayloadKey(field.payloadKey, nextFieldKey, usedPayloadKeys);
        s.insertRenderFormField.run(
          formId,
          nextFieldKey,
          field.fieldLabel,
          field.sourcePath,
          field.sourceType,
          field.inputKind,
          field.valueType,
          field.groupName,
          nextPayloadKey,
          field.placeholder,
          field.helpText,
          field.optionsJson,
          field.validationJson,
          field.defaultValueJson,
          field.isRequired ? 1 : 0,
          field.isVisible ? 1 : 0,
          nextSortOrder,
          scopedWrcFile,
          nowIsoValue,
          nowIsoValue
        );
        nextSortOrder += 1;
      }
    })();
  }

  function removeWrcFileFieldsTx(formId, wrcFile, localStmts) {
    const s = localStmts || stmts;
    const scopedWrcFile = String(wrcFile || '').trim();
    if (!scopedWrcFile) return;
    db.transaction(() => {
      s.deleteRenderFormFieldsByWrcFile.run(formId, scopedWrcFile);
    })();
  }

  function refreshRolesCache() {
    rolesCache = buildRolesCache(stmts.listRoles.all());
    return rolesCache;
  }

  const {
    emitUserSyncUpsert,
    emitUserSyncDelete,
    emitRoleSyncUpsert,
    runUsersSyncPoll,
    startUsersSyncPollLoop,
  } = createUsersSyncHelpers({
    stmts,
    commonServerFile,
    hostsServerFile,
    hostsToList,
    normalizeHostCandidate,
    readCommonServerConfigFile,
    readHostsServerConfigFile,
    formatHostForHttpUrl,
    normalizeAscii,
    normalizeUsername,
    buildAutoUsername,
    MAX_USERNAME_LEN,
    normalizePublicId,
    normalizeRole,
    DEFAULT_FALLBACK_ROLE,
    sanitizeDisplayName,
    sanitizeFirstName,
    sanitizeLastName,
    sanitizeEmail,
    sanitizePhone,
    sanitizeUserNote,
    sanitizeAvatarPath,
    MAX_FAILED_LOGIN_COUNT,
    parseIsoDateOrNull,
    sanitizeTimezone,
    sanitizeUserLanguage,
    DEFAULT_USER_LANGUAGE,
    normalizeNotificationPreferences,
    normalizeRoleRow,
    normalizeManageableRolesInput,
    sanitizeRoleKey,
    usersSyncFetchLimit,
    usersSyncRemoteTimeoutMs,
    MIN_USERS_SYNC_REMOTE_TIMEOUT_MS,
    DEFAULT_USERS_SYNC_REMOTE_TIMEOUT_MS,
    usersSyncPollIntervalMs,
    MIN_USERS_SYNC_POLL_INTERVAL_MS,
    MAX_USERS_SYNC_POLL_INTERVAL_MS,
    DEFAULT_USERS_SYNC_POLL_INTERVAL_MS,
    DEFAULT_USERS_SYNC_AGENT_PORT,
    listDiscoveredUsersSyncPeers: () => Object.values(getPresenceVolatile() || {}),
    nowIso,
    safeParseObjectJson,
    refreshRolesCache,
    logLine,
  });

  function isUsersSyncPeerAllowed(req) {
    const common = readCommonServerConfigFile(commonServerFile);
    const hosts = hostsToList(readHostsServerConfigFile(hostsServerFile));
    const sources = [hosts];
    if (common?.usersSyncDetectedPeers !== false) {
      sources.push(getPresenceVolatile() || {});
    }
    const candidates = collectPeerAddressCandidates(...sources);
    return isAllowedPeerAddress(req?.socket?.remoteAddress, candidates);
  }
  if (bootstrappedAdminUser && typeof emitUserSyncUpsert === 'function') {
    try {
      emitUserSyncUpsert(bootstrappedAdminUser, {
        actorUserId: null,
        reason: 'bootstrap_admin_seed',
      });
    } catch {}
  }

  function audit(actorUserId, action, payload = {}, scopeType = 'auth', scopeId = '') {
    try {
      const countRow = stmts.countAllAuditEntries.get();
      const count = Number.isFinite(Number(countRow?.n)) ? Math.trunc(Number(countRow.n)) : 0;
      if (count >= AUDIT_HARD_LIMIT_LINES) return;
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

  function getAuditStorageStatus() {
    try {
      const row = stmts.countAllAuditEntries.get();
      const count = Number.isFinite(Number(row?.n)) ? Math.trunc(Number(row.n)) : 0;
      return {
        count,
        warnAt: AUDIT_WARN_LINES,
        hardLimit: AUDIT_HARD_LIMIT_LINES,
        saturated: count >= AUDIT_HARD_LIMIT_LINES,
        warnReached: count >= AUDIT_WARN_LINES,
      };
    } catch {
      return { count: 0, warnAt: AUDIT_WARN_LINES, hardLimit: AUDIT_HARD_LIMIT_LINES, saturated: false, warnReached: false };
    }
  }
  const {
    renderDetectedScanState,
    isRenderDetectedAutoScanBusy,
    importDetectedRenderOutputs,
    startRenderDetectedAutoScanLoop,
  } = createRenderDetectedAutoScanHelpers({
    db,
    stmts,
    sharedStore,
    resolveRenderDetectedRoots,
    renderDetectedExtensions,
    DEFAULT_RENDER_DETECTED_EXTENSIONS,
    renderDetectedScanMaxFiles,
    renderDetectedScanIntervalMs,
    MIN_RENDER_DETECTED_SCAN_INTERVAL_MS,
    MAX_RENDER_DETECTED_SCAN_INTERVAL_MS,
    DEFAULT_RENDER_DETECTED_SCAN_INTERVAL_MS,
    nowIso,
    logLine,
    audit,
    resolveProjectForRender,
    sanitizeRenderProjectName,
    sanitizeRenderTemplateName,
    DEFAULT_RENDER_DETECTED_TEMPLATE_NAME,
    buildExpectedRenderTaskMatchCatalog,
    findExpectedRenderTaskMatch,
    buildRenderDetectedFileSignature,
    sanitizeRenderOutputPath,
    sanitizeTaskExpectedRenderName,
    normalizeTaskExpectedRenderCount,
    scheduleProxyGenerationForDoneRender: (renderId) => {
      const normalizedRenderId = Number(renderId || 0);
      if (!Number.isFinite(normalizedRenderId) || normalizedRenderId <= 0) return;
      scheduleProxyGenerationForDoneRenderShared({
        renderId: Math.trunc(normalizedRenderId),
        stmts,
        readCommonServerConfigFile,
        commonServerFile,
        nowIso,
        logLine,
      });
    },
  });
  const {
    resourcesIndexSyncState,
    maybeSyncResourcesIndexFromLibrary,
  } = createResourcesIndexSyncHelpers({
    stmts,
    sharedStore,
    syncResourcesIndexFromLibrary,
    resourcesIndexAutoSyncIntervalMs,
    nowIso,
    audit,
  });

  maybeSyncResourcesIndexFromLibrary({ force: true });
  startRenderDetectedAutoScanLoop();
  startUsersSyncPollLoop();
  const usersSyncBootTimer = setTimeout(() => {
    runUsersSyncPoll().catch(() => {});
  }, 1200);
  if (typeof usersSyncBootTimer?.unref === 'function') {
    usersSyncBootTimer.unref();
  }
  const {
    getRenderHealthAuditMaintenanceSnapshot,
    maybePurgeRenderHealthAuditEvents,
  } = createRenderHealthAuditMaintenanceHelpers({
    nowIso,
    stmts,
    logLine,
    subtractDays,
    POSTPROD_RENDER_HEALTH_AUDIT_ACTION,
    renderHealthEventRetentionDays,
    renderHealthEventCleanupIntervalMs,
    DEFAULT_RENDER_HEALTH_EVENT_RETENTION_DAYS,
  });

  const {
    asCount,
    requireSession,
    requireManageUsers,
    requireBanUsers: _requireBanUsers,
    requireManageProjectPermissions,
    requireManageRoles,
    requireManageConfiguration,
    requireRenderTemplateManage,
    requireRenderTemplateManageForProject,
    requireRenderLaunchForProject,
    requireRenderDispatch,
    sweepStaleWorkersAndRequeue,
  } = createPostprodAuthGuards({
    getAuthToken,
    nowIso,
    stmts,
    rolePermissions,
    getRolesCache: () => rolesCache,
    resolveRoleInput,
    DEFAULT_FALLBACK_ROLE,
    sanitizeProjectRef,
    resolveProjectForApi,
    sharedStore,
    buildProjectPermissionPayload,
    db,
    audit,
  });
  const {
    listTaskProjectRefsFromRelations: _listTaskProjectRefsFromRelations,
    listTaskResourceRefsFromRelations: _listTaskResourceRefsFromRelations,
    replaceTaskRefsRelations,
    buildTaskPayloadWithRelations,
    computeTaskTransitionState,
    computeRenderTransitionState,
  } = createTaskRenderStateHelpers({
    stmts,
    db,
    nowIso,
    parseIsoDateOrNull,
    normalizeTaskRefsInput,
    sanitizeTaskRefForStorage,
    buildTaskPayload,
    normalizeTaskStatus,
    TASK_STATUSES,
    normalizeRenderStatus,
    RENDER_STATUSES,
    sanitizeRenderOutputPath,
    sanitizeRenderErrorMessage,
    inferRenderReviewStatus,
  });
  const {
    postprodRouteHandlerDeps,
    postprodRouteCoreDeps,
    postprodRouteAuthIdentityDeps,
    postprodRouteActivityAuditDeps,
    postprodRouteUserProfileDeps,
    postprodRouteProjectCatalogDeps,
    postprodRouteDataDeps,
    postprodRouteResourcesDeps,
    postprodRouteTaskDeps,
    postprodRouteRenderFormsTemplatesDeps,
    postprodRouteRenderExecutionDeps,
    postprodRouteRenderStateDeps,
    postprodRouteUsersRolesDeps,
  } = buildPostprodRouteDispatchGroups({
    handlePostprodAuthAndHealthRoutes,
    handlePostprodActivityAndAuditMaintenanceRoutes,
    handlePostprodAuditRoutes,
    handlePostprodMeRoutes,
    handlePostprodUserAlertsRoutes,
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
    nowIso,
    addSeconds,
    RENDER_WORKER_ONLINE_TTL_SECONDS,
    sweepStaleWorkersAndRequeue,
    stmts,
    resolveRenderDispatchConfig,
    buildRenderDispatchPolicyPayload,
    audit,
    asCount,
    renderDetectedScanIntervalMs,
    renderDetectedScanMaxFiles,
    renderDetectedExtensions,
    renderDetectedScanState,
    logLine,
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
    isUsersSyncPeerAllowed,
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
    normalizeRenderFormModeDefault,
    parseBooleanFlag,
    normalizeRenderFormLayout,
    buildRenderFormPayload,
    normalizeRenderFormFields,
    mergeRenderFormFieldsTx,
    removeWrcFileFieldsTx,
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
    selectBestStation,
    sendJobToStation,
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
    emitUserSyncUpsert,
    emitUserSyncDelete,
    emitRoleSyncUpsert,
    getAuditStorageStatus,
  });

  const postprodRouteDispatchDeps = createPostprodRouteDispatchDeps({
    postprodRouteHandlerDeps,
    postprodRouteCoreDeps,
    postprodRouteAuthIdentityDeps,
    postprodRouteActivityAuditDeps,
    postprodRouteUserProfileDeps,
    postprodRouteProjectCatalogDeps,
    postprodRouteDataDeps,
    postprodRouteResourcesDeps,
    postprodRouteTaskDeps,
    postprodRouteRenderFormsTemplatesDeps,
    postprodRouteRenderExecutionDeps,
    postprodRouteRenderStateDeps,
    postprodRouteUsersRolesDeps,
    getRenderDetectedAutoScanBusy: isRenderDetectedAutoScanBusy,
    getRolesCache: () => rolesCache,
  });
  async function handleRoutes(req, res, url, { sendJSON, parseBody }) {
    const pathname = String(url?.pathname || '');
    if (!pathname.startsWith('/agent/postprod')) return false;
    const requestNow = nowIso();
    maybePurgeRenderHealthAuditEvents(requestNow);
    const isAuthHealthRoute = pathname === '/agent/postprod/auth/health';
    const routesHandled = await dispatchPostprodRouteHandlers({
      req,
      res,
      url,
      pathname,
      parseBody,
      sendJSON,
      security: {
        isAuthHealthRoute,
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
    remoteBridge: {
      stmts,
      nowIso,
      buildRenderJobPayload,
      ensureProjectCanAutoRender,
      sanitizeRenderTemplateName,
      sanitizeRenderProjectName,
      normalizeRenderPayload,
      sharedStore,
      commonServerFile,
      readCommonServerConfigFile,
      requireConfigurationAccess(req, res, sendJSON) {
        const auth = requireSession(req, res, sendJSON);
        if (!auth) return null;
        const permissions = requireManageConfiguration(auth, res, sendJSON);
        if (!permissions) return null;
        return { auth, permissions };
      },
    },
  };
}

module.exports = {
  createPostprodAuth,
  normalizeRole,
  applyAuditStorageLimitsFromCommon,
};







