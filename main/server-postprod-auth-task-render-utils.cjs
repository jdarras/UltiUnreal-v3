function createTaskRenderHelpers(deps = {}) {
  const {
    normalizeAscii = (value) => String(value || '').trim().toLowerCase(),
    MAX_TASK_TITLE_LEN = 220,
    MAX_TASK_DESCRIPTION_LEN = 8000,
    MAX_TASK_COMMENT_LEN = 4000,
    MAX_TASK_EXPECTED_RENDER_NAME_LEN = 220,
    MAX_TASK_AUTO_RENDER_TEXT_LEN = 2000,
    MAX_TASK_EXPECTED_RENDER_COUNT = 50,
    MAX_TASK_REF_LEN = 240,
    MAX_TASK_REFS = 64,
    TASK_REQUEST_TYPES = ['manual', 'auto_render'],
    DEFAULT_TASK_REQUEST_TYPE = 'manual',
    MAX_TASK_AUTO_RENDER_CONFIG_BYTES = 256 * 1024,
    safeParseObjectJson = () => ({}),
    sanitizeRenderProjectName = (value) => String(value || '').trim(),
    sanitizeRenderTemplateName = (value) => String(value || '').trim(),
    sanitizeRenderWorkerKey = (value) => String(value || '').trim(),
    sanitizeRenderMapName = (value) => String(value || '').trim(),
    sanitizeRenderSequenceName = (value) => String(value || '').trim(),
    sanitizeRenderOutputProfile = (value) => String(value || '').trim(),
    sanitizeRenderOutputPath = (value) => String(value || '').trim(),
    normalizeRenderPayload = () => ({ ok: true, payloadJson: '{}' }),
    parseRenderPayloadJson = () => ({}),
    normalizeRenderExecution = () => ({ ok: true, executionJson: '{}' }),
    parseRenderExecutionJson = () => ({}),
    parseIsoDateOrNull = () => '',
    buildTaskPayload = () => ({}),
    normalizeTaskStatus = (value) => String(value || ''),
    TASK_EXPECTED_RENDER_MATCH_ACTIVE_STATUSES = new Set(),
  } = deps;

  const asOptionalPositiveInt = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.trunc(n);
  };

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
  if (sequenceName) config.sequenceName = sequenceName;
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


  return {
    sanitizeTaskTitle,
    sanitizeTaskDescription,
    sanitizeTaskComment,
    normalizeTaskRequestType,
    sanitizeTaskExpectedRenderName,
    sanitizeTaskAutoRenderText,
    normalizeTaskExpectedRenderCount,
    normalizeTaskExpectedRenderNamesInput,
    buildTaskExpectedRenderNameBase,
    generateTaskExpectedRenderNames,
    resolveTaskExpectedRenderNames,
    normalizeExpectedRenderLookupKey,
    safeIsoToTs,
    sortTaskExpectedRenderCandidates,
    normalizeTaskRefsInput,
    sanitizeTaskRefForStorage,
    parseTaskRefsJson,
    normalizeTaskRefLookup,
    addTaskRefAlias,
    parseTaskAutoRenderConfig,
    normalizeTaskAutoRenderConfig,
    buildExpectedRenderTaskMatchCatalog,
    findExpectedRenderTaskMatch,
  };
}

module.exports = { createTaskRenderHelpers };

