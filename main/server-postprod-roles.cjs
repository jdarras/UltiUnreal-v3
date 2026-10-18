// Rôles et permissions : normalisation des rôles enregistrés, cache des rôles
// et permissions effectives d'un rôle (fonctions pures, sans base de données).
const { DEFAULT_FALLBACK_ROLE, ROLE_ALIAS_MAP } = require('./server-postprod-auth-constants.cjs');
const {
  normalizeRoleLookupKey,
  sanitizeDisplayName,
  sanitizeRoleKey,
  sanitizeRoleNote,
} = require('./server-postprod-auth-utils-core.cjs');

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

module.exports = {
  normalizeRole,
  parseManageableRolesJson,
  normalizeManageableRolesInput,
  normalizeRoleRow,
  buildRolesCache,
  resolveRoleInput,
  rolePermissions,
};
