const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatPidFileContent,
  parsePidFileContent,
  terminateOwnedRenderProcess,
} = require('../../main/render-process-control.cjs');

const SPAWNED_AT = 1_800_000_000_000;

function fakeProcess({ alive = true, startTimeMs = SPAWNED_AT + 400, diesOnKill = true } = {}) {
  const state = { alive, kills: [] };
  return {
    state,
    isAlive: async () => state.alive,
    getStartTimeMs: async () => startTimeMs,
    killTree: async (pid) => {
      state.kills.push(pid);
      if (diesOnKill) state.alive = false;
    },
    wait: async () => {},
  };
}

test('pid file keeps the pid on the first line and records the spawn time', () => {
  const content = formatPidFileContent(4242, SPAWNED_AT);

  assert.equal(parseInt(content, 10), 4242);
  assert.deepEqual(parsePidFileContent(content), { pid: 4242, spawnedAtMs: SPAWNED_AT });
});

test('legacy pid file falls back to the file modification time', () => {
  assert.deepEqual(parsePidFileContent('4242', SPAWNED_AT), { pid: 4242, spawnedAtMs: SPAWNED_AT });
  assert.equal(parsePidFileContent('not-a-pid'), null);
});

test('a timed-out render process is terminated and its exit confirmed', async () => {
  const proc = fakeProcess();

  const result = await terminateOwnedRenderProcess({ pid: 4242, spawnedAtMs: SPAWNED_AT, ...proc });

  assert.deepEqual(result, { ok: true, status: 'terminated' });
  assert.deepEqual(proc.state.kills, [4242]);
});

test('a reused pid belonging to another program is never killed', async () => {
  const proc = fakeProcess({ startTimeMs: SPAWNED_AT + 3_600_000 });

  const result = await terminateOwnedRenderProcess({ pid: 4242, spawnedAtMs: SPAWNED_AT, ...proc });

  assert.equal(result.status, 'not_owned');
  assert.deepEqual(proc.state.kills, []);
});

test('nothing is killed when the process start time cannot be read', async () => {
  const proc = fakeProcess({ startTimeMs: null });

  const result = await terminateOwnedRenderProcess({ pid: 4242, spawnedAtMs: SPAWNED_AT, ...proc });

  assert.deepEqual(result, { ok: false, status: 'ownership_unverified' });
  assert.deepEqual(proc.state.kills, []);
});

test('a process that survives the kill is reported as still running', async () => {
  const proc = fakeProcess({ diesOnKill: false });

  const result = await terminateOwnedRenderProcess({
    pid: 4242, spawnedAtMs: SPAWNED_AT, maxWaitMs: 0, ...proc,
  });

  assert.deepEqual(result, { ok: false, status: 'still_running' });
});

test('an already exited process needs no action', async () => {
  const proc = fakeProcess({ alive: false });

  const result = await terminateOwnedRenderProcess({ pid: 4242, spawnedAtMs: SPAWNED_AT, ...proc });

  assert.deepEqual(result, { ok: true, status: 'already_exited' });
  assert.deepEqual(proc.state.kills, []);
});
