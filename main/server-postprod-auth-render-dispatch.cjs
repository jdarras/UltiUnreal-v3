'use strict';

function createRenderDispatchHelpers(options = {}) {
  const {
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
  } = options;

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

  return {
    sanitizeRenderWorkerKey,
    sanitizeRenderWorkerName,
    normalizeRenderWorkerCapabilityKey,
    normalizeRenderWorkerCapabilityAtom,
    normalizeRenderWorkerCapabilitiesObject,
    normalizeRenderWorkerCapabilities,
    parseRenderWorkerCapabilitiesJson,
    extractRenderJobRequiredCapabilities,
    extractRenderJobPreferredWorkerKey,
    computeRenderWorkerCapabilitiesScore,
    normalizeCapabilityCollection,
    workerCapabilityContains,
    doesWorkerMatchRequiredCapabilities,
    buildRenderDispatchPairs,
    normalizeRenderDispatchPriority,
    normalizeRenderDispatchQuota,
    normalizeRenderDispatchProjectMap,
    normalizeRenderDispatchPolicy,
    serializeRenderDispatchProjectMap,
    buildRenderDispatchPolicyStorageJson,
    resolveRenderDispatchConfig,
    buildRenderDispatchPolicyPayload,
    resolveRequestedRenderDispatchConfig,
    computeRenderDispatchFetchLimit,
    normalizeRenderProjectLoadMap,
    countRenderJobsByProject,
    normalizeDispatchRenderIds,
    isDispatchableRenderRow,
    toDispatchableRenderRow,
    selectRenderJobsForDispatch,
  };
}

module.exports = {
  createRenderDispatchHelpers,
};