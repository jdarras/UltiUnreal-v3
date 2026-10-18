// Rôles et permissions effectives : ce qui décide des droits de chaque compte.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeRole,
  normalizeRoleRow,
  buildRolesCache,
  resolveRoleInput,
  rolePermissions,
} = require('../../main/server-postprod-roles.cjs');

// Lignes telles qu'elles sortent de la base (0/1, JSON en texte).
const ROWS = [
  {
    key: 'Admin', display_name: 'Administrateur', is_system: 1,
    can_manage_users: 1, can_ban_users: 1, can_manage_project_permissions: 1,
    can_manage_roles: 1, can_manage_configuration: 1, can_use_live_mode: 1, can_manage_layouts: 1,
    manageable_roles_json: '["Operateur","Graphiste","Inconnu","operateur"]',
  },
  { key: 'Operateur', display_name: 'Opérateur', is_system: 1, can_use_live_mode: 1, can_launch_renders: 1 },
  { key: 'Graphiste', display_name: 'Graphiste', can_use_live_mode: 0, can_manage_layouts: 1 },
  {
    key: 'Chef', display_name: 'Chef sans équipe',
    can_manage_users: 1, can_ban_users: 1, can_manage_project_permissions: 1, manageable_roles_json: '[]',
  },
];

test('database rows are read as booleans; launching live projects is allowed unless explicitly refused', () => {
  const row = normalizeRoleRow({ key: ' Operateur ', can_manage_users: 0, can_validate: 1, can_launch_live_projects: null });
  assert.equal(row.key, 'Operateur');
  assert.equal(row.canManageUsers, false);
  assert.equal(row.canValidate, true);
  assert.equal(row.canLaunchLiveProjects, true);
  assert.equal(normalizeRoleRow({ key: 'X', can_launch_live_projects: 0 }).canLaunchLiveProjects, false);
  assert.equal(normalizeRoleRow({ key: '  ' }), null);
});

test('known aliases are mapped to their canonical role; an empty role falls back', () => {
  assert.equal(normalizeRole('administrateur'), 'Admin');
  assert.equal(normalizeRole('Responsable_Fabrication'), 'Responsable Fabrication');
  assert.equal(normalizeRole('Opérateur'), 'Operateur');
  assert.equal(normalizeRole(''), 'Operateur');
  assert.equal(normalizeRole('Role Maison'), 'Role Maison');
});

test('a role is found by key, display name or alias, never invented', () => {
  const cache = buildRolesCache(ROWS);
  assert.equal(resolveRoleInput('admin', cache), 'Admin');
  assert.equal(resolveRoleInput('Chef sans équipe', cache), 'Chef');
  assert.equal(resolveRoleInput('operator', cache), 'Operateur');
  assert.equal(resolveRoleInput('Inconnu', cache), '');
  assert.equal(resolveRoleInput('Inconnu', cache, 'Graphiste'), 'Graphiste');
});

test('manageable roles keep only existing roles, without duplicates', () => {
  const perms = rolePermissions('Admin', buildRolesCache(ROWS));
  assert.deepEqual(perms.manageableRoles, ['Operateur', 'Graphiste']);
  assert.equal(perms.canManageUsers, true);
  assert.equal(perms.canBanUsers, true);
  assert.equal(perms.canManageProjectPermissions, true);
});

test('managing users requires at least one manageable role; ban and project rights follow', () => {
  const perms = rolePermissions('Chef', buildRolesCache(ROWS));
  assert.deepEqual(
    [perms.canManageUsers, perms.canBanUsers, perms.canManageProjectPermissions, perms.manageableRoles.length],
    [false, false, false, 0]
  );
});

test('layouts can only be managed by a role that has live mode', () => {
  const perms = rolePermissions('Graphiste', buildRolesCache(ROWS));
  assert.equal(perms.canUseLiveMode, false);
  assert.equal(perms.canManageLayouts, false);
});

test('an unknown role gets the fallback role rights, never more', () => {
  const cache = buildRolesCache(ROWS);
  assert.deepEqual(rolePermissions('Pirate', cache), rolePermissions('Operateur', cache));
  assert.equal(rolePermissions('Pirate', cache).canManageUsers, false);
});

test('without any known role, every sensitive right is refused', () => {
  const perms = rolePermissions('Admin', buildRolesCache([]));
  const granted = Object.entries(perms).filter(([, value]) => value === true).map(([key]) => key);
  assert.deepEqual(granted, ['canUsePostprodMode']);
  assert.deepEqual(perms.manageableRoles, []);
});
