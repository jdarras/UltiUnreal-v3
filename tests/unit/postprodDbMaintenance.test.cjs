// Entretien de la base : purge des sessions périmées, compactage seulement
// quand beaucoup d'espace est libre (base simulée).
const test = require('node:test');
const assert = require('node:assert/strict');

const { maybeVacuum, purgeOldSessions } = require('../../main/server-postprod-db-maintenance.cjs');

function fakeDb({ pageSize = 4096, pageCount = 1000, freePages = 0, vacuumError = null } = {}) {
  const calls = { exec: [], runArgs: [] };
  return {
    calls,
    prepare: () => ({ run: (...args) => { calls.runArgs.push(args); return { changes: 3 }; } }),
    pragma: (name) => ({ page_size: pageSize, page_count: pageCount, freelist_count: freePages }[name]),
    exec: (sql) => {
      calls.exec.push(sql);
      if (vacuumError) throw vacuumError;
    },
  };
}

test('sessions expired or revoked more than seven days ago are purged', () => {
  const db = fakeDb();
  const purged = purgeOldSessions(db, { now: new Date('2026-10-20T12:00:00.000Z') });
  assert.equal(purged, 3);
  assert.deepEqual(db.calls.runArgs[0], ['2026-10-13T12:00:00.000Z', '2026-10-13T12:00:00.000Z']);
});

test('the database is compacted only when much space is free', () => {
  const busy = fakeDb({ pageCount: 12_000, freePages: 4_300 }); // 49 Mo dont 17,6 Mo libres
  assert.equal(maybeVacuum(busy).vacuumed, true);
  assert.deepEqual(busy.calls.exec, ['VACUUM']);

  const smallRatio = fakeDb({ pageCount: 100_000, freePages: 3_000 });
  assert.equal(maybeVacuum(smallRatio).vacuumed, false);
  const smallAmount = fakeDb({ pageCount: 1_000, freePages: 600 });
  assert.equal(maybeVacuum(smallAmount).vacuumed, false);
});

test('a busy database is not compacted and the attempt is logged', () => {
  const db = fakeDb({ pageCount: 12_000, freePages: 4_300, vacuumError: new Error('database is locked') });
  const logs = [];
  assert.equal(maybeVacuum(db, { logLine: (l) => logs.push(l.action) }).vacuumed, false);
  assert.deepEqual(logs, ['db_vacuum_skipped']);
});
