const test = require('node:test');
const assert = require('node:assert/strict');
const { dispatchPostprodRouteHandlers } = require('../../main/server-postprod-route-dispatcher.cjs');
const { handlePostprodAuthAndHealthRoutes } = require('../../main/server-postprod-routes-auth-health.cjs');
const { createUsersSyncHelpers } = require('../../main/server-postprod-auth-users-sync.cjs');
const { hostsToList } = require('../../main/server-normalize.cjs');

test('the dispatcher forwards peer authorization to the actual users sync route', async () => {
  for (const allowed of [false, true]) {
    let checked = 0;
    let response;
    await dispatchPostprodRouteHandlers({
      req: { method: 'GET', url: '/agent/postprod/remote/users-sync/events' }, res: {},
      pathname: '/agent/postprod/remote/users-sync/events',
      sendJSON: (_, status, body) => { response = { status, ...body }; },
      deps: {
        handlePostprodAuthAndHealthRoutes,
        isUsersSyncPeerAllowed: () => { checked++; return allowed; },
        stmts: {
          listUserSyncEventsSinceVersion: { all: () => [] },
          getMaxUserSyncEventVersion: { get: () => ({ n: 0 }) },
        },
      },
    });
    assert.equal(checked, 1);
    assert.equal(response.status, allowed ? 200 : 403);
  }
});

test('outbound account synchronization only contacts manually registered peers', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    calls.push(new URL(url).hostname);
    return { ok: true, text: async () => JSON.stringify({ ok: true, events: [], latestVersion: 0 }) };
  });
  const sync = createUsersSyncHelpers({
    hostsToList,
    readCommonServerConfigFile: () => ({ localIp: '192.0.2.1', usersSyncDetectedPeers: true }),
    readHostsServerConfigFile: () => [{ ip: '192.0.2.1' }, { ip: '192.0.2.2' }],
    listDiscoveredUsersSyncPeers: () => [{ ip: '192.0.2.99' }],
    stmts: {
      getMaxUserSyncSourceVersionByStation: { get: () => ({ n: 0 }) },
      findUserSyncCursorByPeer: { get: () => ({ last_version: 0 }) },
    },
  });
  await sync.runUsersSyncPoll();
  assert.deepEqual(calls, ['192.0.2.2']);
});

test('account sync advances by received pages, not the remote latest version', async (t) => {
  let cursor = 0;
  const requested = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    const since = Number(new URL(url).searchParams.get('since'));
    requested.push(since);
    return {
      ok: true,
      text: async () => JSON.stringify({
        ok: true, latestVersion: 3,
        events: since === 0 ? [{ version: 1, opId: 'one' }] : [{ version: 2, opId: 'two' }, { version: 3, opId: 'three' }],
      }),
    };
  });
  const sync = createUsersSyncHelpers({
    hostsToList,
    readCommonServerConfigFile: () => ({ localIp: '192.0.2.1' }),
    readHostsServerConfigFile: () => [{ ip: '192.0.2.2' }],
    stmts: {
      getMaxUserSyncSourceVersionByStation: { get: () => ({ n: 0 }) },
      findUserSyncCursorByPeer: { get: () => ({ last_version: cursor }) },
      findUserSyncEventByOpId: { get: () => ({ version: 1 }) }, // already applied, still consume each page
      upsertUserSyncCursorByPeer: { run: (_, version) => { cursor = version; } },
    },
  });
  await sync.runUsersSyncPoll();
  assert.equal(cursor, 1);
  await sync.runUsersSyncPoll();
  assert.equal(cursor, 3);
  assert.deepEqual(requested, [0, 1]);
});

test('account sync stops at a failed event and retries it on the next poll', async (t) => {
  let cursor = 0;
  let fail = true;
  const visited = [];
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, text: async () => JSON.stringify({
      ok: true, latestVersion: 3,
      events: [1, 2, 3].filter((version) => version > cursor).map((version) => ({ version, opId: String(version) })),
    }),
  }));
  const sync = createUsersSyncHelpers({
    hostsToList,
    readCommonServerConfigFile: () => ({ localIp: '192.0.2.1' }),
    readHostsServerConfigFile: () => [{ ip: '192.0.2.2' }],
    stmts: {
      getMaxUserSyncSourceVersionByStation: { get: () => ({ n: 0 }) },
      findUserSyncCursorByPeer: { get: () => ({ last_version: cursor }) },
      findUserSyncEventByOpId: { get: (id) => {
        visited.push(id);
        if (id === '2' && fail) throw new Error('database unavailable');
        return { version: Number(id) };
      } },
      upsertUserSyncCursorByPeer: { run: (_, version) => { cursor = version; } },
    },
  });
  await sync.runUsersSyncPoll();
  assert.equal(cursor, 1);
  assert.deepEqual(visited, ['1', '2']);
  fail = false;
  await sync.runUsersSyncPoll();
  assert.equal(cursor, 3);
  assert.deepEqual(visited, ['1', '2', '2', '3']);
});
