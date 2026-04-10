function createActivityAuditHelpers(deps = {}) {
  const {
    normalizeTaskRefsInput = () => [],
    normalizeAscii = (value) => String(value || '').trim().toLowerCase(),
    coercePositiveInt = (value, fallback, min = 1) => {
      const n = Number(value);
      if (!Number.isFinite(n)) return Math.max(min, Number(fallback) || min);
      return Math.max(min, Math.trunc(n));
    },
    parseIsoDateOrNull = () => '',
    MAX_TASK_REFS = 64,
    MAX_TASK_COMMENT_LEN = 4000,
    MAX_ACTIVITY_SEARCH_LEN = 240,
  } = deps;

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


  return {
    parseAuditPayloadJson,
    asOptionalPositiveInt,
    normalizeActivityProjectRefs,
    normalizeActivityDetailValue,
    buildUserActivityDetail,
    buildUserActivityPayload,
    buildAuditEntryPayload,
    escapeCsvCell,
    buildAuditCsvLine,
    matchesAuditSearch,
    summarizeUserActivity,
    parseActivityProjectRefsFilter,
    parseActivityFilters,
    activityMatchesProjectRefs,
    classifyActivityActionType,
    activityMatchesActionType,
    activityMatchesSearchQuery
  };
}

module.exports = { createActivityAuditHelpers };


