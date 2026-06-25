const test = require('node:test');
const assert = require('node:assert/strict');

const { createPostprodAuthGuards } = require('../../main/server-postprod-auth-guards.cjs');

function createGuards(canManageConfiguration) {
  return createPostprodAuthGuards({
    getAuthToken: () => 'token',
    nowIso: () => '2026-06-19T00:00:00.000Z',
    stmts: {},
    rolePermissions: () => ({ canManageConfiguration }),
    getRolesCache: () => ({}),
  });
}

test('requireManageConfiguration allows authorized roles', () => {
  const guards = createGuards(true);
  const result = guards.requireManageConfiguration({ session: { role: 'admin' } }, {}, () => {});
  assert.equal(result.canManageConfiguration, true);
});

test('requireManageConfiguration rejects unauthorized roles', () => {
  const guards = createGuards(false);
  let response = null;
  const result = guards.requireManageConfiguration(
    { session: { role: 'viewer' } },
    {},
    (_res, status, body) => { response = { status, body }; },
  );
  assert.equal(result, false);
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'forbidden_configuration_manage');
});
