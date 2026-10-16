// Déroulement d'une tentative de rendu supervisée par un Job Object (Windows).
// La fin du rendu est celle du job entier : un lanceur qui se termine avant
// le processus qu'il a créé ne termine pas la tentative.

// Une station ne lance un rendu que si la réconciliation des processus
// précédents a réussi ET qu'aucun d'eux ne survit. Toute réponse invalide ou
// en erreur bloque le lancement.
function canStartRenderAfterReconcile(reconcile) {
  if (!reconcile || typeof reconcile !== 'object') return false;
  if (reconcile.ok !== true) return false;
  return Array.isArray(reconcile.busyTags) && reconcile.busyTags.length === 0;
}

async function pollJobUntilDone({ pidTag, deadlineMs, now, isStopped, waitMs, pollIntervalMs, readRenderJob }) {
  while (true) {
    if (isStopped()) return { kind: 'stopped' };
    if (now() > deadlineMs) return { kind: 'timeout' };
    await waitMs(pollIntervalMs);
    if (isStopped()) return { kind: 'stopped' };
    const job = await readRenderJob(pidTag);
    if (job?.phase === 'exited') return { kind: 'done', rootExitCode: job.rootExitCode ?? null };
    if (job?.phase === 'lost') return { kind: 'lost' };
    if (job?.phase === 'failed') return { kind: 'failed', error: job.error || 'supervisor_failed' };
  }
}

async function runSupervisedRenderAttempt({
  pidTag,
  command,
  args = [],
  cwd = '',
  timeoutMs,
  now = () => Date.now(),
  isStopped = () => false,
  waitMs,
  pollIntervalMs = 10_000,
  readRenderJob,
  startRenderJob,
  stopRenderJob,
  deleteRenderJob,
  resolveOutput,
} = {}) {
  let processStartMs = now();
  let outcome = null;

  const existing = await readRenderJob(pidTag);
  if (isStopped()) return { status: 'stopped' };
  const pollArgs = () => ({
    pidTag, deadlineMs: processStartMs + timeoutMs, now, isStopped, waitMs, pollIntervalMs, readRenderJob,
  });

  if (existing?.exists === true) {
    // Reprise : heure de départ et délai du lancement d'origine.
    if (Number.isFinite(existing.spawnedAtMs)) processStartMs = existing.spawnedAtMs;
    if (existing.phase === 'exited') outcome = { kind: 'done', rootExitCode: existing.rootExitCode ?? null };
    else if (existing.phase === 'lost') outcome = { kind: 'lost' };
    else if (existing.phase === 'failed') outcome = { kind: 'failed', error: existing.error || 'supervisor_failed' };
    else outcome = await pollJobUntilDone(pollArgs());
  } else {
    const started = await startRenderJob({ command, args, cwd, pidTag });
    if (isStopped()) return { status: 'stopped' };
    if (started?.ok !== true) {
      return { status: 'finished', ok: false, error: started?.error || 'spawn_failed', processStartMs, processStillRunning: false };
    }
    if (Number.isFinite(started.spawnedAtMs)) processStartMs = started.spawnedAtMs;
    outcome = await pollJobUntilDone(pollArgs());
  }
  if (outcome.kind === 'stopped') return { status: 'stopped' };

  let ok = null;
  let error = '';
  let mismatchPath = '';
  let processStillRunning = false;

  if (outcome.kind === 'timeout') {
    // Arrêt de tout le job, confirmé par le superviseur ; s'il échoue, le suivi
    // reste sur disque et la réconciliation bloque la station.
    const stop = await stopRenderJob(pidTag);
    processStillRunning = stop?.ok !== true;
    ok = false;
    error = processStillRunning ? 'timeout_process_still_running' : 'timeout';
  } else if (outcome.kind === 'lost') {
    ok = false;
    error = 'supervisor_lost';
  } else if (outcome.kind === 'failed') {
    ok = false;
    error = outcome.error;
  } else if (outcome.rootExitCode != null && outcome.rootExitCode !== 0) {
    ok = false;
    error = `process_exit_${outcome.rootExitCode}`;
  }

  if (ok === null) {
    const resolved = await resolveOutput(processStartMs);
    ok = resolved?.ok === true;
    mismatchPath = String(resolved?.mismatchPath || '');
    if (!ok) error = mismatchPath ? 'output_name_mismatch' : 'output_file_not_found';
  }

  if (!processStillRunning) await deleteRenderJob(pidTag);
  return { status: 'finished', ok, error, mismatchPath, processStartMs, processStillRunning };
}

export {
  canStartRenderAfterReconcile,
  runSupervisedRenderAttempt,
};
