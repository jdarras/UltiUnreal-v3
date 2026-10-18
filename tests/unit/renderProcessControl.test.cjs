const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatPidFileContent,
  parsePidFileContent,
  parseProcessTableLines,
  selectOwnedProcesses,
  terminateOwnedRenderProcess,
} = require('../../main/render-process-control.cjs');

const T = 1_800_000_000_000;

// Table de processus simulée : killProcess retire l'entrée (sauf processus résistants).
function fakeSystem(entries, { resistant = [] } = {}) {
  const state = { table: entries.map((entry) => ({ ...entry })), kills: [] };
  return {
    state,
    listProcesses: async () => state.table.map((entry) => ({ ...entry })),
    killProcess: async (pid) => {
      state.kills.push(pid);
      if (!resistant.includes(pid)) state.table = state.table.filter((entry) => entry.pid !== pid);
    },
    wait: async () => {},
  };
}

test('pid file keeps the pid first and records spawn time and exact start', () => {
  const content = formatPidFileContent(4242, T, T + 7);

  assert.equal(parseInt(content, 10), 4242);
  assert.deepEqual(parsePidFileContent(content), { pid: 4242, spawnedAtMs: T, processStartMs: T + 7 });
});

test('legacy pid files are still read', () => {
  assert.deepEqual(parsePidFileContent('4242', T), { pid: 4242, spawnedAtMs: T, processStartMs: null });
  assert.deepEqual(parsePidFileContent(`4242\n${T}`), { pid: 4242, spawnedAtMs: T, processStartMs: null });
  assert.equal(parsePidFileContent('not-a-pid'), null);
});

test('a pid reused 10 seconds later by another program is never killed', async () => {
  const sys = fakeSystem([{ pid: 4242, ppid: 1, startMs: T + 10_000 }]);

  const result = await terminateOwnedRenderProcess({ pid: 4242, processStartMs: T, spawnedAtMs: T, ...sys });

  assert.equal(result.status, 'already_exited');
  assert.deepEqual(sys.state.kills, []);
});

test('the owned process and its whole tree are terminated and confirmed', async () => {
  const sys = fakeSystem([
    { pid: 4242, ppid: 1, startMs: T },
    { pid: 5000, ppid: 4242, startMs: T + 500 },
    { pid: 5001, ppid: 5000, startMs: T + 900 },
    { pid: 6000, ppid: 1, startMs: T + 100 },
  ]);

  const result = await terminateOwnedRenderProcess({ pid: 4242, processStartMs: T, ...sys });

  assert.equal(result.status, 'terminated');
  assert.deepEqual(sys.state.kills.sort(), [4242, 5000, 5001]);
  assert.deepEqual(sys.state.table.map((entry) => entry.pid), [6000]);
});

test('children surviving a dead parent are still found and terminated', async () => {
  const sys = fakeSystem([
    { pid: 5000, ppid: 4242, startMs: T + 500 },
    { pid: 5001, ppid: 5000, startMs: T + 900 },
  ]);

  const result = await terminateOwnedRenderProcess({ pid: 4242, processStartMs: T, ...sys });

  assert.equal(result.status, 'terminated');
  assert.deepEqual(sys.state.kills.sort(), [5000, 5001]);
});

test('children of a program that reused the pid are not taken for render children', () => {
  const owned = selectOwnedProcesses([
    { pid: 4242, ppid: 1, startMs: T + 60_000 },
    { pid: 5000, ppid: 4242, startMs: T + 500 },
    { pid: 7000, ppid: 4242, startMs: T + 61_000 },
  ], { pid: 4242, processStartMs: T });

  assert.deepEqual(owned.map((entry) => entry.pid), [5000]);
});

test('a process older than its supposed parent is not a descendant', () => {
  const owned = selectOwnedProcesses([
    { pid: 4242, ppid: 1, startMs: T },
    { pid: 3000, ppid: 4242, startMs: T - 5_000 },
  ], { pid: 4242, processStartMs: T });

  assert.deepEqual(owned.map((entry) => entry.pid), [4242]);
});

test('a process that survives the kill is reported with its survivors', async () => {
  const sys = fakeSystem([
    { pid: 4242, ppid: 1, startMs: T },
    { pid: 5000, ppid: 4242, startMs: T + 500 },
  ], { resistant: [5000] });

  const result = await terminateOwnedRenderProcess({ pid: 4242, processStartMs: T, maxWaitMs: 0, ...sys });

  assert.deepEqual(result, { ok: false, status: 'still_running', survivors: [5000] });
});

test('nothing is killed when the process table cannot be read', async () => {
  const kills = [];
  const result = await terminateOwnedRenderProcess({
    pid: 4242,
    processStartMs: T,
    listProcesses: async () => null,
    killProcess: async (pid) => kills.push(pid),
  });

  assert.deepEqual(result, { ok: false, status: 'process_table_unavailable' });
  assert.deepEqual(kills, []);
});

test('legacy pid file: only a process started within 2 s of the spawn is owned', () => {
  assert.equal(selectOwnedProcesses([{ pid: 4242, ppid: 1, startMs: T + 1_500 }], { pid: 4242, spawnedAtMs: T }).length, 1);
  assert.equal(selectOwnedProcesses([{ pid: 4242, ppid: 1, startMs: T + 10_000 }], { pid: 4242, spawnedAtMs: T }).length, 0);
});

test('process table lines from PowerShell are parsed; a missing date keeps the pid with an unknown identity', () => {
  const table = parseProcessTableLines(
    '4242|1|2026-10-16T12:36:24.3540484Z\r\n5000|4242|2026-10-16T12:36:25.0000000Z\r\n4|0|\r\n\r\n'
  );

  assert.deepEqual(table, [
    { pid: 4242, ppid: 1, startMs: Date.parse('2026-10-16T12:36:24.354Z') },
    { pid: 5000, ppid: 4242, startMs: Date.parse('2026-10-16T12:36:25.000Z') },
    { pid: 4, ppid: 0, startMs: null },
  ]);
});

test('legacy stop: a root or survivor without readable creation date is never killed nor declared gone', async () => {
  const unknownRoot = fakeSystem([{ pid: 4242, ppid: 1, startMs: null }]);
  const r1 = await terminateOwnedRenderProcess({ pid: 4242, processStartMs: T, ...unknownRoot });

  assert.deepEqual(r1, { ok: false, status: 'ownership_unverified' });
  assert.deepEqual(unknownRoot.state.kills, []);

  // Après l'arrêt, le numéro réapparaît sans date lisible : fin non confirmée.
  const sys = fakeSystem([{ pid: 4242, ppid: 1, startMs: T }], { resistant: [4242] });
  sys.state.table = [{ pid: 4242, ppid: 1, startMs: T }];
  const listOnce = sys.listProcesses;
  let calls = 0;
  sys.listProcesses = async () => (calls++ === 0 ? listOnce() : [{ pid: 4242, ppid: 1, startMs: null }]);
  const r2 = await terminateOwnedRenderProcess({ pid: 4242, processStartMs: T, maxWaitMs: 0, ...sys });

  assert.equal(r2.ok, false);
});

// ---- W1 : lecture d'un ancien fichier PID avec un état explicite ----
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readRenderPidStatus } = require('../../main/render-process-control.cjs');

test('the legacy pid file reader distinguishes absent, present, invalid and unreadable', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-pid-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const valid = path.join(dir, 'valid.pid');
  fs.writeFileSync(valid, `4242\n${T}\n${T + 7}`);
  const invalid = path.join(dir, 'invalid.pid');
  fs.writeFileSync(invalid, 'tronqu');
  const unreadable = path.join(dir, 'dossier.pid');
  fs.mkdirSync(unreadable);

  assert.deepEqual(readRenderPidStatus(path.join(dir, 'absent.pid')), { state: 'absent', pid: null, error: 'pid_file_not_found' });
  assert.deepEqual(readRenderPidStatus(valid), { state: 'present', pid: 4242, spawnedAtMs: T, processStartMs: T + 7 });
  assert.deepEqual(readRenderPidStatus(invalid), { state: 'invalid', pid: null, error: 'invalid_pid_in_file' });
  assert.deepEqual(readRenderPidStatus(unreadable), { state: 'unreadable', pid: null, error: 'pid_file_unreadable' });
});
