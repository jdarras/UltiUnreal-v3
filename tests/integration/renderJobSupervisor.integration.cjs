// Essais réels du superviseur Job Object (Windows uniquement).
// Lancement : npm run test:integration
// Seuls des processus node créés par ces essais sont lancés et arrêtés.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  SUPERVISOR_SCRIPT,
  buildWindowsCommandLine,
  buildSupervisorLaunch,
  parseJobState,
} = require('../../main/render-job-supervisor.cjs');

const isWindows = process.platform === 'win32';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function makeDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-job-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// Petits programmes node : chacun écrit son pid dans dir/pids pour vérification.
function writeScripts(dir) {
  const pidsDir = path.join(dir, 'pids');
  fs.mkdirSync(pidsDir);
  const record = `require('fs').writeFileSync(require('path').join(${JSON.stringify(pidsDir)}, String(process.pid)), '');`;
  const spawnChild = (script, extra = '') => `require('child_process').spawn(process.execPath, [${JSON.stringify(path.join(dir, script))}${extra}], { detached: true, stdio: 'ignore' }).unref();`;
  const files = {
    'sleep.cjs': `${record} setTimeout(() => {}, 600000);`,
    'exit3.cjs': `${record} setTimeout(() => process.exit(3), 300);`,
    'launcher.cjs': `${record} ${spawnChild('sleep.cjs')} setTimeout(() => process.exit(0), 500);`,
    'intermediate.cjs': `${record} ${spawnChild('sleep.cjs')} setTimeout(() => process.exit(0), 300);`,
    'grand-launcher.cjs': `${record} ${spawnChild('intermediate.cjs')} setTimeout(() => process.exit(0), 800);`,
    'spawner.cjs': `${record} setInterval(() => { ${spawnChild('sleep.cjs')} }, 100);`,
  };
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
  return pidsDir;
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function recordedPids(pidsDir) {
  return fs.readdirSync(pidsDir).map(Number).filter((pid) => pid > 0);
}

function startSupervisor(dir, script) {
  const scriptFile = path.join(dir, 'supervisor.ps1');
  fs.writeFileSync(scriptFile, SUPERVISOR_SCRIPT);
  const stateFile = path.join(dir, 'state.json');
  const stopFile = path.join(dir, 'stop');
  const commandLine = buildWindowsCommandLine(process.execPath, [path.join(dir, script)]);
  // Même relais que l'application.
  const launch = buildSupervisorLaunch({ scriptFile, stateFile, stopFile, commandLine });
  const supervisorPid = Number(execFileSync(launch.file, launch.args, { windowsHide: true, encoding: 'utf8' }).trim());
  return {
    supervisorPid,
    readState: () => {
      try { return parseJobState(fs.readFileSync(stateFile, 'utf8')); } catch { return null; }
    },
    requestStop: () => fs.writeFileSync(stopFile, ''),
  };
}

async function waitFor(predicate, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await sleep(250);
  }
  return null;
}

test('a normal run reports exited with the exit code of the launched process', { skip: !isWindows }, async (t) => {
  const dir = makeDir(t);
  writeScripts(dir);
  const job = startSupervisor(dir, 'exit3.cjs');

  const state = await waitFor(() => (job.readState()?.state === 'exited' ? job.readState() : null));

  assert.equal(state?.rootExitCode, 3);
  assert.equal(state?.stopped, false);
});

test('the job keeps running while a child outlives its launcher, then stops it entirely', { skip: !isWindows }, async (t) => {
  const dir = makeDir(t);
  const pidsDir = writeScripts(dir);
  const job = startSupervisor(dir, 'launcher.cjs');
  await waitFor(() => recordedPids(pidsDir).length >= 2);
  await sleep(1500); // le lanceur s'est terminé avec le code 0

  assert.equal(job.readState()?.state, 'running');

  job.requestStop();
  const state = await waitFor(() => (job.readState()?.state === 'exited' ? job.readState() : null));
  assert.equal(state?.stopped, true);
  assert.deepEqual(recordedPids(pidsDir).filter(isAlive), []);
});

test('a grandchild reached through a dead intermediate is still owned and stopped', { skip: !isWindows }, async (t) => {
  const dir = makeDir(t);
  const pidsDir = writeScripts(dir);
  const job = startSupervisor(dir, 'grand-launcher.cjs');
  await waitFor(() => recordedPids(pidsDir).length >= 3);
  await sleep(1500); // lanceur et intermédiaire terminés, seul le petit-enfant vit

  assert.equal(recordedPids(pidsDir).filter(isAlive).length, 1);
  assert.equal(job.readState()?.state, 'running');

  job.requestStop();
  await waitFor(() => job.readState()?.state === 'exited');
  assert.deepEqual(recordedPids(pidsDir).filter(isAlive), []);
});

test('children created while the job is being stopped do not survive', { skip: !isWindows }, async (t) => {
  const dir = makeDir(t);
  const pidsDir = writeScripts(dir);
  const job = startSupervisor(dir, 'spawner.cjs');
  await waitFor(() => recordedPids(pidsDir).length >= 5);

  job.requestStop();
  await waitFor(() => job.readState()?.state === 'exited');
  await sleep(500);

  assert.ok(recordedPids(pidsDir).length >= 5);
  assert.deepEqual(recordedPids(pidsDir).filter(isAlive), []);
});

test('killing the supervisor stops every process of the job (no untracked orphan)', { skip: !isWindows }, async (t) => {
  const dir = makeDir(t);
  const pidsDir = writeScripts(dir);
  const job = startSupervisor(dir, 'launcher.cjs');
  await waitFor(() => recordedPids(pidsDir).length >= 2);

  execFileSync('taskkill', ['/PID', String(job.supervisorPid), '/F'], { stdio: 'ignore' });
  await waitFor(() => recordedPids(pidsDir).filter(isAlive).length === 0, 10000);

  assert.deepEqual(recordedPids(pidsDir).filter(isAlive), []);
});

test('the supervisor survives the exit of the application that launched it', { skip: !isWindows }, async (t) => {
  const dir = makeDir(t);
  const pidsDir = writeScripts(dir);
  const scriptFile = path.join(dir, 'supervisor.ps1');
  fs.writeFileSync(scriptFile, SUPERVISOR_SCRIPT);
  const stateFile = path.join(dir, 'state.json');
  const stopFile = path.join(dir, 'stop');
  const launch = buildSupervisorLaunch({
    scriptFile, stateFile, stopFile,
    commandLine: buildWindowsCommandLine(process.execPath, [path.join(dir, 'sleep.cjs')]),
  });
  // Application simulée : un processus node qui lance le relais puis se termine.
  const appScript = path.join(dir, 'fake-app.cjs');
  fs.writeFileSync(appScript, `require('child_process').execFileSync(${JSON.stringify(launch.file)}, ${JSON.stringify(launch.args)}, { windowsHide: true }); process.exit(0);`);
  execFileSync(process.execPath, [appScript], { windowsHide: true });
  const readState = () => { try { return parseJobState(fs.readFileSync(stateFile, 'utf8')); } catch { return null; } };

  await waitFor(() => recordedPids(pidsDir).length >= 1);
  await sleep(1500);
  assert.equal(readState()?.state, 'running');
  assert.equal(recordedPids(pidsDir).filter(isAlive).length, 1);

  fs.writeFileSync(stopFile, '');
  await waitFor(() => readState()?.state === 'exited');
  assert.deepEqual(recordedPids(pidsDir).filter(isAlive), []);
});

test('paths and arguments with spaces and quotes reach the launched process intact', { skip: !isWindows }, async (t) => {
  const base = makeDir(t);
  const dir = path.join(base, "dossier avec espaces l'été");
  fs.mkdirSync(dir);
  const out = path.join(dir, 'args.json');
  fs.writeFileSync(path.join(dir, 'echo.cjs'), `require('fs').writeFileSync(${JSON.stringify(out)}, JSON.stringify(process.argv.slice(2)));`);
  const scriptFile = path.join(dir, 'supervisor.ps1');
  fs.writeFileSync(scriptFile, SUPERVISOR_SCRIPT);
  const stateFile = path.join(dir, 'state.json');
  const args = ['-MovieName=Shot "A" 01', 'C:\\chemin avec espace\\', 'simple', ''];
  const launch = buildSupervisorLaunch({
    scriptFile, stateFile, stopFile: path.join(dir, 'stop'),
    commandLine: buildWindowsCommandLine(process.execPath, [path.join(dir, 'echo.cjs'), ...args]),
    cwd: dir,
  });
  execFileSync(launch.file, launch.args, { windowsHide: true });

  await waitFor(() => { try { return parseJobState(fs.readFileSync(stateFile, 'utf8'))?.state === 'exited'; } catch { return false; } });
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), args);
});

// ---- Suivi de bout en bout avec le code de l'application (store + relais) ----
const { createRenderJobStore, runSupervisorRelay } = require('../../main/render-job-supervisor.cjs');
const { listSystemProcesses, readSystemProcessStartMs } = require('../../main/render-process-control.cjs');

function makeStore(dir) {
  const scriptFile = path.join(dir, 'supervisor.ps1');
  fs.writeFileSync(scriptFile, SUPERVISOR_SCRIPT);
  const store = createRenderJobStore({
    dir, listProcesses: listSystemProcesses, runRelay: runSupervisorRelay, readProcessStartMs: readSystemProcessStartMs,
  });
  const start = (script) => store.start({ tag: 'r1', scriptFile, command: process.execPath, args: [path.join(dir, script)] });
  return { store, start };
}

test('store: a launched render is read as running, stopped with confirmation, then cleaned', { skip: !isWindows }, async (t) => {
  const dir = makeDir(t);
  const pidsDir = writeScripts(dir);
  const { store, start } = makeStore(dir);

  const started = await start('launcher.cjs');
  assert.equal(started.ok, true);
  await waitFor(() => recordedPids(pidsDir).length >= 2);
  await sleep(1500); // lanceur terminé, enfant vivant

  assert.equal((await store.read('r1')).phase, 'running');
  const stop = await store.stop('r1');
  assert.deepEqual(stop, { ok: true, phase: 'exited' });
  assert.deepEqual(recordedPids(pidsDir).filter(isAlive), []);

  store.removeFiles('r1');
  assert.deepEqual(await store.read('r1'), { exists: false });
});

test('store: a killed supervisor is reported as lost and its job is gone', { skip: !isWindows }, async (t) => {
  const dir = makeDir(t);
  const pidsDir = writeScripts(dir);
  const { store, start } = makeStore(dir);

  await start('sleep.cjs');
  await waitFor(() => recordedPids(pidsDir).length >= 1);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'uu_render_r1.job'), 'utf8'));
  assert.ok(Number.isFinite(meta.supervisorStartMs));
  execFileSync('taskkill', ['/PID', String(meta.supervisorPid), '/F'], { stdio: 'ignore' });
  await waitFor(() => recordedPids(pidsDir).filter(isAlive).length === 0, 10000);

  assert.equal((await store.read('r1')).phase, 'lost');
  assert.deepEqual(recordedPids(pidsDir).filter(isAlive), []);
});

test('store: a missing command is reported as a launch failure', { skip: !isWindows }, async (t) => {
  const dir = makeDir(t);
  const { store } = makeStore(dir);

  const started = await store.start({
    tag: 'r1', scriptFile: path.join(dir, 'supervisor.ps1'), command: path.join(dir, 'absent.exe'), args: [],
  });

  assert.equal(started.ok, false);
  assert.match(started.error, /^create_process_failed:2$/);
});
