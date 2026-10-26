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

// Station bloquée : un rendu attribué n'est rendu au serveur que si cette
// station n'en a aucune trace de démarrage. Les deux suivis doivent être
// explicitement absents : suivi Job Object (exists: false) ET ancien fichier
// PID (state: 'absent', fichier inexistant). Un suivi présent, illisible,
// invalide ou une réponse incomplète peut signifier qu'un rendu tourne.
function shouldReleaseAssignedRender({ renderId, localJob, legacyPid } = {}) {
  const id = Number(renderId);
  if (!Number.isFinite(id) || id <= 0) return false;
  if (localJob?.exists !== false) return false;
  return legacyPid?.state === 'absent';
}

// Mode d'une tentative de rendu selon l'ancien suivi par fichier PID (W3) :
//   legacy-resume : un ancien lancement est enregistré (mise à jour pendant un
//                   rendu) : on reprend son suivi, jamais de second lancement ;
//   supervised    : aucun ancien suivi, lancement dans un Job Object (Windows) ;
//   legacy-spawn  : aucun ancien suivi, plateforme sans Job Object ;
//   blocked       : ancien suivi invalide, illisible ou réponse incomplète :
//                   aucune conclusion possible, rien n'est lancé ni effacé.
function chooseRenderAttemptMode({ supportsJobs = false, legacyPid = null } = {}) {
  const state = legacyPid?.state;
  if (state === 'present' && Number(legacyPid?.pid) > 0) return 'legacy-resume';
  if (state === 'absent') return supportsJobs === true ? 'supervised' : 'legacy-spawn';
  return 'blocked';
}

// Appelée à chaque cycle tant que la station est bloquée : sans mémoire d'un
// envoi précédent, une nouvelle attribution du même rendu est de nouveau
// rendue. Le serveur ne remet en file que si le rendu est toujours attribué à
// cette station (opération sans effet sinon).
async function releaseAssignedRenderIfUnstarted({ renderId, readRenderJob, readRenderPid, release, isStopped = () => false } = {}) {
  const id = Number(renderId);
  if (!Number.isFinite(id) || id <= 0) return { released: false, reason: 'no_assigned_render' };
  const tag = `r${Math.trunc(id)}`;
  const localJob = await readRenderJob(tag);
  const legacyPid = await readRenderPid(tag);
  if (isStopped()) return { released: false, reason: 'stopped' };
  if (!shouldReleaseAssignedRender({ renderId: id, localJob, legacyPid })) {
    return { released: false, reason: 'local_trace_present' };
  }
  try {
    await release(id);
    return { released: true };
  } catch (err) {
    return { released: false, reason: String(err?.code || err?.message || 'release_failed') };
  }
}

async function pollJobUntilDone({ pidTag, deadlineMs, now, isStopped, waitMs, pollIntervalMs, readRenderJob }) {
  while (true) {
    if (isStopped()) return { kind: 'stopped' };
    if (now() > deadlineMs) return { kind: 'timeout' };
    await waitMs(pollIntervalMs);
    if (isStopped()) return { kind: 'stopped' };
    const job = await readRenderJob(pidTag);
    if (job?.phase === 'exited') return { kind: 'done', rootExitCode: job.rootExitCode ?? null, stopped: job.stopped === true };
    if (job?.phase === 'lost') return { kind: 'lost' };
    if (job?.phase === 'abandoned') return { kind: 'abandoned' };
    if (job?.phase === 'unverifiable') return { kind: 'unverifiable' };
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
    if (existing.phase === 'unverifiable') {
      // Suivi présent mais illisible : un rendu peut encore tourner. Rien n'est
      // lancé ni supprimé ; la réconciliation bloque la station.
      return { status: 'finished', ok: false, error: 'job_tracking_unverifiable', processStartMs, processStillRunning: true };
    }
    if (existing.phase === 'exited') {
      outcome = { kind: 'done', rootExitCode: existing.rootExitCode ?? null, stopped: existing.stopped === true };
    } else if (existing.phase === 'lost') {
      outcome = { kind: 'lost' };
    } else if (existing.phase === 'abandoned') {
      outcome = { kind: 'abandoned' };
    } else if (existing.phase === 'failed') {
      outcome = { kind: 'failed', error: existing.error || 'supervisor_failed' };
    } else {
      outcome = await pollJobUntilDone(pollArgs());
    }
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
  if (outcome.kind === 'unverifiable') {
    return { status: 'finished', ok: false, error: 'job_tracking_unverifiable', processStartMs, processStillRunning: true };
  }

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
  } else if (outcome.kind === 'abandoned') {
    ok = false;
    error = 'supervisor_launch_abandoned';
  } else if (outcome.kind === 'failed') {
    ok = false;
    error = outcome.error;
  } else if (outcome.stopped) {
    // Job arrêté par le superviseur (délai dépassé avant une fermeture de
    // l'application, par exemple) : échec, quels que soient le code et les fichiers.
    ok = false;
    error = 'job_stopped';
  } else if (outcome.rootExitCode != null && outcome.rootExitCode !== 0) {
    ok = false;
    error = `process_exit_${outcome.rootExitCode}`;
  }

  if (ok === null) {
    const resolved = await resolveOutput(processStartMs);
    ok = resolved?.ok === true;
    mismatchPath = String(resolved?.mismatchPath || '');
    if (!ok) error = String(resolved?.error || '') || (mismatchPath ? 'output_name_mismatch' : 'output_file_not_found');
  }

  if (!processStillRunning) await deleteRenderJob(pidTag);
  return { status: 'finished', ok, error, mismatchPath, processStartMs, processStillRunning };
}

export {
  canStartRenderAfterReconcile,
  chooseRenderAttemptMode,
  releaseAssignedRenderIfUnstarted,
  runSupervisedRenderAttempt,
  shouldReleaseAssignedRender,
};
