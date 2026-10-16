// Arrêt contrôlé d'un processus de rendu détaché.
// Le fichier PID contient "pid\nspawnedAtMs" ; seul un processus dont l'heure de
// démarrage correspond à ce lancement est arrêté (protection contre la
// réutilisation d'un numéro de processus par Windows).

const OWNERSHIP_TOLERANCE_MS = 30000;

function formatPidFileContent(pid, spawnedAtMs) {
  return `${pid}\n${Math.trunc(Number(spawnedAtMs) || 0)}`;
}

function parsePidFileContent(content = '', fileMtimeMs = null) {
  const lines = String(content || '').trim().split(/\r?\n/);
  const pid = parseInt(String(lines[0] || '').trim(), 10);
  if (!Number.isFinite(pid) || pid <= 0) return null;
  const recorded = Number(String(lines[1] || '').trim());
  const fallback = Number(fileMtimeMs);
  let spawnedAtMs = null;
  if (Number.isFinite(recorded) && recorded > 0) spawnedAtMs = recorded;
  else if (Number.isFinite(fallback) && fallback > 0) spawnedAtMs = fallback;
  return { pid, spawnedAtMs };
}

async function waitUntilExited({ pid, isAlive, wait, maxWaitMs, stepMs = 500 }) {
  const deadline = Date.now() + maxWaitMs;
  while (await isAlive(pid)) {
    if (Date.now() >= deadline) return false;
    await wait(stepMs);
  }
  return true;
}

async function terminateOwnedRenderProcess({
  pid,
  spawnedAtMs,
  isAlive,
  getStartTimeMs,
  killTree,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxWaitMs = 10000,
  ownershipToleranceMs = OWNERSHIP_TOLERANCE_MS,
} = {}) {
  if (!(await isAlive(pid))) return { ok: true, status: 'already_exited' };

  const startTimeMs = await getStartTimeMs(pid);
  if (!Number.isFinite(startTimeMs) || !Number.isFinite(Number(spawnedAtMs))) {
    return { ok: false, status: 'ownership_unverified' };
  }
  if (Math.abs(startTimeMs - Number(spawnedAtMs)) > ownershipToleranceMs) {
    // Le numéro désigne un autre programme : le processus de rendu est déjà terminé.
    return { ok: true, status: 'not_owned' };
  }

  try {
    await killTree(pid);
  } catch {}
  const exited = await waitUntilExited({ pid, isAlive, wait, maxWaitMs });
  return exited
    ? { ok: true, status: 'terminated' }
    : { ok: false, status: 'still_running' };
}

module.exports = {
  OWNERSHIP_TOLERANCE_MS,
  formatPidFileContent,
  parsePidFileContent,
  terminateOwnedRenderProcess,
};
