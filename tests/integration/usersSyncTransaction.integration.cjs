// Run with the runtime matching better-sqlite3 (Electron in this workspace).
const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { createUsersSyncHelpers } = require('../../main/server-postprod-auth-users-sync.cjs');
const { hostsToList } = require('../../main/server-normalize.cjs');

test('a failed account event rolls back its receipt and retries its effect', async (t) => {
  const db = new Database(':memory:');
  t.after(() => db.close());
  db.exec('CREATE TABLE events (version INTEGER PRIMARY KEY, op_id TEXT); CREATE TABLE tombstones (id TEXT)');
  let cursor = 0;
  let fail = true;
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, text: async () => JSON.stringify({
      ok: true, latestVersion: 1,
      events: [{ version: 1, opId: 'deletion-1', entityType: 'user', entityPublicId: 'user-1', op: 'delete' }],
    }),
  }));
  const helpers = createUsersSyncHelpers({
    db, hostsToList,
    readCommonServerConfigFile: () => ({ localIp: '192.0.2.1' }),
    readHostsServerConfigFile: () => [{ ip: '192.0.2.2' }],
    stmts: {
      getMaxUserSyncSourceVersionByStation: { get: () => ({ n: 0 }) },
      findUserSyncCursorByPeer: { get: () => ({ last_version: cursor }) },
      upsertUserSyncCursorByPeer: { run: (_, version) => { cursor = version; } },
      findUserSyncEventByOpId: db.prepare('SELECT version FROM events WHERE op_id = ?'),
      insertUserSyncEvent: { run: (opId) => db.prepare('INSERT INTO events(op_id) VALUES (?)').run(opId) },
      findUserByPublicIdFull: { get: () => undefined },
      upsertUserTombstone: { run: (id) => {
        db.prepare('INSERT INTO tombstones VALUES (?)').run(id);
        if (fail) throw new Error('simulated failure after writing');
      } },
    },
  });
  await helpers.runUsersSyncPoll();
  assert.equal(cursor, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM events').get().n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tombstones').get().n, 0);
  fail = false;
  await helpers.runUsersSyncPoll();
  assert.equal(cursor, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM events').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tombstones').get().n, 1);
});
