export async function spawnDetachedRender({ command = '', args = [], cwd = '', pidTag = '' } = {}) {
  if (typeof window.electron?.runProcess !== 'function') {
    return { ok: false, error: 'run_process_unavailable' };
  }
  return await window.electron.runProcess({
    command: String(command || '').trim(),
    args: Array.isArray(args) ? args : [],
    cwd: String(cwd || '').trim(),
    detached: true,
    pidTag: String(pidTag || '').trim(),
  });
}

export async function checkPidAlive(pid) {
  if (typeof window.electron?.checkPidAlive !== 'function') return { alive: false };
  return await window.electron.checkPidAlive(pid);
}

export async function checkFileExists(filePath) {
  if (typeof window.electron?.checkFileExists !== 'function') return { exists: false };
  return await window.electron.checkFileExists(filePath);
}

export async function findRenderOutputs({
  rootDir = '',
  minMtimeMs = 0,
  maxDepth = 4,
  limit = 200,
} = {}) {
  if (typeof window.electron?.findRenderOutputs !== 'function') {
    return { ok: false, error: 'find_render_outputs_unavailable', files: [] };
  }
  return await window.electron.findRenderOutputs({
    rootDir: String(rootDir || '').trim(),
    minMtimeMs: Number.isFinite(Number(minMtimeMs)) ? Number(minMtimeMs) : 0,
    maxDepth: Number.isFinite(Number(maxDepth)) ? Math.max(1, Math.trunc(Number(maxDepth))) : 4,
    limit: Number.isFinite(Number(limit)) ? Math.max(1, Math.trunc(Number(limit))) : 200,
  });
}

export async function readRenderPid(pidTag) {
  if (typeof window.electron?.readRenderPid !== 'function') return { pid: null };
  return await window.electron.readRenderPid(pidTag);
}

export async function terminateRenderProcess(pidTag) {
  if (typeof window.electron?.terminateRenderProcess !== 'function') return { ok: false, status: 'unavailable' };
  return await window.electron.terminateRenderProcess(pidTag);
}

// Sans réconciliation possible, la station ne doit rien lancer (ok: false).
export async function reconcileRenderProcesses(opts = {}) {
  if (typeof window.electron?.reconcileRenderProcesses !== 'function') {
    return { ok: false, busyTags: [], error: 'reconcile_unavailable' };
  }
  return await window.electron.reconcileRenderProcesses(opts);
}

export async function supportsRenderJobs() {
  if (typeof window.electron?.supportsRenderJobs !== 'function') return false;
  return (await window.electron.supportsRenderJobs()) === true;
}

export async function startRenderJob({ command = '', args = [], cwd = '', pidTag = '' } = {}) {
  if (typeof window.electron?.runProcess !== 'function') {
    return { ok: false, error: 'run_process_unavailable' };
  }
  return await window.electron.runProcess({
    command: String(command || '').trim(),
    args: Array.isArray(args) ? args : [],
    cwd: String(cwd || '').trim(),
    detached: true,
    supervised: true,
    pidTag: String(pidTag || '').trim(),
  });
}

// Fiche de fin de rendu du plugin : emplacement préparé avant le lancement,
// lecture après la fin du processus.
export async function prepareRenderResult(pidTag) {
  if (typeof window.electron?.prepareRenderResult !== 'function') return { ok: false, error: 'unavailable' };
  return await window.electron.prepareRenderResult(pidTag);
}

export async function readRenderResult(pidTag) {
  if (typeof window.electron?.readRenderResult !== 'function') return { state: 'absent' };
  return await window.electron.readRenderResult(pidTag);
}

export async function readRenderJob(pidTag) {
  if (typeof window.electron?.readRenderJob !== 'function') return { exists: false };
  return await window.electron.readRenderJob(pidTag);
}

export async function stopRenderJob(pidTag) {
  if (typeof window.electron?.stopRenderJob !== 'function') return { ok: false, phase: 'unavailable' };
  return await window.electron.stopRenderJob(pidTag);
}

export async function readRenderExit(pidTag) {
  if (typeof window.electron?.readRenderExit !== 'function') return { known: false };
  return await window.electron.readRenderExit(pidTag);
}

export async function deleteRenderPid(pidTag) {
  if (typeof window.electron?.deleteRenderPid !== 'function') return { ok: false };
  return await window.electron.deleteRenderPid(pidTag);
}
