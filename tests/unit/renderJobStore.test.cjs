const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createRenderJobStore } = require('../../main/render-job-supervisor.cjs');

const T = 1_800_000_000_000;

function makeDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-store-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// Système simulé : table des processus et relais contrôlés par le test.
function makeStore(dir, { table = [], relayPid = 900, onRelay = () => {}, clock = { now: T } } = {}) {
  return createRenderJobStore({
    dir,
    listProcesses: async () => table,
    runRelay: async () => { onRelay(); return relayPid; },
    readProcessStartMs: async (pid) => table.find((entry) => entry.pid === pid)?.startMs ?? null,
    sleep: async (ms) => { clock.now += ms; },
    now: () => clock.now,
  });
}

const file = (dir, ext) => path.join(dir, `uu_render_r1.${ext}`);

test('a truncated tracking file is unverifiable, never absent, and is not stopped as done', async (t) => {
  const dir = makeDir(t);
  fs.writeFileSync(file(dir, 'job'), '{"supervisorPid": 9');
  fs.writeFileSync(file(dir, 'state'), JSON.stringify({ state: 'running', supervisorPid: 900 }));
  const store = makeStore(dir);

  assert.deepEqual(await store.read('r1'), { exists: true, phase: 'unverifiable', error: 'job_meta_invalid' });
  assert.deepEqual(await store.stop('r1'), { ok: false, phase: 'unverifiable' });
  assert.equal(fs.existsSync(file(dir, 'job')), true);
});

test('a tracking path that cannot be read as a file is unverifiable', async (t) => {
  const dir = makeDir(t);
  fs.mkdirSync(file(dir, 'job'));
  const store = makeStore(dir);

  assert.equal((await store.read('r1')).phase, 'unverifiable');
});

test('a truly absent tracking file is reported as absent', async (t) => {
  const store = makeStore(makeDir(t));

  assert.deepEqual(await store.read('r1'), { exists: false });
  assert.deepEqual(await store.stop('r1'), { ok: true, phase: 'none' });
});

test('the attempt is reserved before the supervisor is launched', async (t) => {
  const dir = makeDir(t);
  let reservedBeforeRelay = false;
  const store = makeStore(dir, {
    relayPid: null,
    onRelay: () => { reservedBeforeRelay = fs.existsSync(file(dir, 'job')); },
  });

  const started = await store.start({ tag: 'r1', scriptFile: 'x.ps1', command: 'cmd.exe' });

  assert.equal(reservedBeforeRelay, true);
  assert.equal(started.ok, false);
  // Relais incertain : la réservation est conservée et un arrêt demandé.
  assert.equal(fs.existsSync(file(dir, 'job')), true);
  assert.equal(fs.existsSync(file(dir, 'stop')), true);
});

test('nothing is launched when the reservation cannot be written', async (t) => {
  const dir = makeDir(t);
  fs.mkdirSync(file(dir, 'job.tmp'));
  let relayed = false;
  const store = makeStore(dir, { onRelay: () => { relayed = true; } });

  const started = await store.start({ tag: 'r1', scriptFile: 'x.ps1', command: 'cmd.exe' });

  assert.deepEqual([started.ok, started.error, relayed], [false, 'job_meta_unwritable', false]);
});

test('a supervisor launched just before the app died is found through its own state', async (t) => {
  const dir = makeDir(t);
  // Réservation sans numéro de superviseur ; le superviseur a écrit son état.
  fs.writeFileSync(file(dir, 'job'), JSON.stringify({ spawnedAtMs: T, phase: 'launching' }));
  fs.writeFileSync(file(dir, 'state'), JSON.stringify({ state: 'running', supervisorPid: 900, rootPid: 901 }));
  const clock = { now: T + 5_000 };
  const store = makeStore(dir, { table: [{ pid: 900, ppid: 1, startMs: T + 800 }], clock });

  assert.equal((await store.read('r1')).phase, 'running');
});

test('a reservation still launching is unknown, an old one without any supervisor is abandoned', async (t) => {
  const dir = makeDir(t);
  fs.writeFileSync(file(dir, 'job'), JSON.stringify({ spawnedAtMs: T, phase: 'launching' }));

  assert.equal((await makeStore(dir, { clock: { now: T + 5_000 } }).read('r1')).phase, 'unknown');
  const late = makeStore(dir, { clock: { now: T + 120_000 } });
  assert.equal((await late.read('r1')).phase, 'abandoned');
  assert.deepEqual(await late.stop('r1'), { ok: true, phase: 'abandoned' });
});

test('an unreadable state with a live supervisor is unknown, not finished', async (t) => {
  const dir = makeDir(t);
  fs.writeFileSync(file(dir, 'job'), JSON.stringify({ spawnedAtMs: T, supervisorPid: 900, supervisorStartMs: T + 800 }));
  fs.writeFileSync(file(dir, 'state'), '{"state":"exi');
  const store = makeStore(dir, { table: [{ pid: 900, ppid: 1, startMs: T + 800 }], clock: { now: T + 5_000 } });

  assert.equal((await store.read('r1')).phase, 'unknown');
});
