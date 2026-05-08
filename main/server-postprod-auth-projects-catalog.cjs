function createProjectsCatalogHelpers(deps = {}) {
  const {
    nowIso = () => new Date().toISOString(),
    normalizeProjectUsageMode = (value) => String(value || '').trim(),
    normalizeRoleLookupKey = (value) => String(value || '').trim().toLowerCase(),
    addTaskRefAlias = () => {},
    AUTO_RENDER_PROJECT_USAGE_MODES = new Set(['auto_render', 'live_auto_render']),
    MIN_POSTPROD_PROJECTS_RESYNC_TTL_MS = 250,
    MAX_POSTPROD_PROJECTS_RESYNC_TTL_MS = 300000,
    DEFAULT_POSTPROD_PROJECTS_RESYNC_TTL_MS = 10000,
  } = deps;

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

function getPostprodProjectVisibilityPolicy(actorPermissions = null) {
  const perms = actorPermissions && typeof actorPermissions === 'object'
    ? actorPermissions
    : {};
  if (perms.canManageProjectPermissions === true || perms.canSyncScenes === true) {
    return 'all';
  }
  if (perms.canLaunchRenders === true || perms.canCreateTasks === true) {
    return 'postprod_only';
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

function listPostprodProjects(sharedStore, usageModeFilters = [], stmts = null, actorPermissions = null) {
  const usageFilterSet = new Set(
    (Array.isArray(usageModeFilters) ? usageModeFilters : [])
      .map((mode) => normalizeProjectUsageMode(mode))
      .filter(Boolean)
  );

  const roleVisibilityPolicy = getPostprodProjectVisibilityPolicy(actorPermissions);
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


  return {
    normalizePostprodProjectsResyncTtlMs,
    resetPostprodProjectsCatalogCache,
    syncProjectsIndexFromSharedStore,
    buildSharedStoreProjectPathIndex,
    normalizeProjectMetaStatus,
    isValidatedPostprodProjectStatus,
    getPostprodProjectVisibilityPolicy,
    buildSharedStoreProjectMetaIndex,
    loadPostprodProjectsCatalog,
    buildProjectTaskRefCatalog,
    parseProjectUsageModeFilters,
    listPostprodProjects,
  };
}

module.exports = { createProjectsCatalogHelpers };

