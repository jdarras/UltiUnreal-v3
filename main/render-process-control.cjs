// Arrêt contrôlé d'un processus de rendu détaché et de ses descendants.
//
// Fichier PID : "pid\nspawnedAtMs\nprocessStartMs". processStartMs est l'heure de
// création exacte relevée dans la table des processus du système juste après le
// lancement ; elle identifie le processus sans ambiguïté (un numéro réutilisé par
// le système a une autre heure de création).
//
// La table des processus fournit { pid, ppid, startMs } : un descendant n'est
// rattaché que s'il a pour parent un processus possédé et qu'il a démarré après
// lui, ce qui retrouve aussi les enfants d'un parent déjà terminé.

const fs = require('fs');
const { execFile } = require('child_process');

// Anciens fichiers PID sans heure de création exacte : seule l'heure d'écriture
// du fichier, juste après le lancement, est connue.
const LEGACY_OWNERSHIP_TOLERANCE_MS = 2000;

function formatPidFileContent(pid, spawnedAtMs, processStartMs = null) {
  const exact = Number.isFinite(Number(processStartMs)) && Number(processStartMs) > 0
    ? String(Math.trunc(Number(processStartMs)))
    : '';
  return `${pid}\n${Math.trunc(Number(spawnedAtMs) || 0)}\n${exact}`;
}

function parsePidFileContent(content = '', fileMtimeMs = null) {
  const lines = String(content || '').trim().split(/\r?\n/);
  const pid = parseInt(String(lines[0] || '').trim(), 10);
  if (!Number.isFinite(pid) || pid <= 0) return null;
  const positive = (value) => {
    const n = Number(String(value ?? '').trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  return {
    pid,
    spawnedAtMs: positive(lines[1]) ?? positive(fileMtimeMs),
    processStartMs: positive(lines[2]),
  };
}

// Lecture d'un ancien fichier PID avec un état explicite. Seule l'absence
// du fichier (ENOENT) prouve qu'aucun lancement n'a eu lieu ; un fichier
// illisible ou invalide est une trace dont on ne peut rien conclure.
function readRenderPidStatus(pidFile) {
  let content;
  try {
    content = fs.readFileSync(pidFile, 'utf8');
  } catch (err) {
    return err?.code === 'ENOENT'
      ? { state: 'absent', pid: null, error: 'pid_file_not_found' }
      : { state: 'unreadable', pid: null, error: 'pid_file_unreadable' };
  }
  let fileMtimeMs = null;
  try { fileMtimeMs = fs.statSync(pidFile).mtimeMs; } catch {}
  const parsed = parsePidFileContent(content, fileMtimeMs);
  if (!parsed) return { state: 'invalid', pid: null, error: 'invalid_pid_in_file' };
  return { state: 'present', pid: parsed.pid, spawnedAtMs: parsed.spawnedAtMs, processStartMs: parsed.processStartMs };
}

function isRootOwned(entry, { processStartMs, spawnedAtMs }) {
  if (!entry) return false;
  if (processStartMs != null) return entry.startMs === processStartMs;
  if (spawnedAtMs == null) return false;
  return Math.abs(entry.startMs - spawnedAtMs) <= LEGACY_OWNERSHIP_TOLERANCE_MS;
}

// Processus vivants appartenant au rendu : la racine si son identité correspond,
// puis ses descendants (y compris ceux dont le parent est déjà terminé).
function selectOwnedProcesses(table = [], { pid, processStartMs = null, spawnedAtMs = null } = {}) {
  const entries = (Array.isArray(table) ? table : []).filter((entry) => (
    Number.isFinite(entry?.pid) && Number.isFinite(entry?.startMs)
  ));
  const byPid = new Map(entries.map((entry) => [entry.pid, entry]));
  const live = byPid.get(pid);
  const rootOwned = isRootOwned(live, { processStartMs, spawnedAtMs });
  const rootStartMs = processStartMs ?? spawnedAtMs;
  if (!rootOwned && rootStartMs == null) return [];

  const owned = rootOwned ? [live] : [];
  // Parents à explorer : { pid, startMs, reusedSinceMs }. Si le numéro de la
  // racine est repris par un autre programme, ses enfants (plus récents que lui)
  // ne sont pas rattachés au rendu.
  const queue = [{
    pid,
    startMs: rootOwned ? live.startMs : rootStartMs,
    reusedSinceMs: !rootOwned && live ? live.startMs : null,
  }];
  const seen = new Set(owned.map((entry) => entry.pid));
  while (queue.length) {
    const parent = queue.shift();
    for (const child of entries) {
      if (child.ppid !== parent.pid || seen.has(child.pid)) continue;
      if (child.startMs < parent.startMs) continue;
      if (parent.reusedSinceMs != null && child.startMs >= parent.reusedSinceMs) continue;
      seen.add(child.pid);
      owned.push(child);
      queue.push({ pid: child.pid, startMs: child.startMs, reusedSinceMs: null });
    }
  }
  return owned;
}

// Lignes "pid|ppid|dateISO" produites par la requête PowerShell (Win32_Process).
// Une date absente ou illisible donne startMs: null : le processus existe mais
// son identité est inconnue (il n'est jamais retiré de la table).
function parseProcessTableLines(text = '') {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [pidRaw, ppidRaw, startRaw] = line.trim().split('|');
    const pid = parseInt(pidRaw, 10);
    if (!Number.isFinite(pid) || pid <= 0) continue;
    const ppid = parseInt(ppidRaw, 10);
    const startMs = Date.parse(String(startRaw || '').trim());
    out.push({ pid, ppid: Number.isFinite(ppid) ? ppid : 0, startMs: Number.isFinite(startMs) ? startMs : null });
  }
  return out;
}

async function terminateOwnedRenderProcess({
  pid,
  processStartMs = null,
  spawnedAtMs = null,
  listProcesses,
  killProcess,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  maxWaitMs = 10000,
  stepMs = 500,
} = {}) {
  const table = await listProcesses();
  if (!Array.isArray(table)) return { ok: false, status: 'process_table_unavailable' };
  // Racine présente sans date lisible : appartenance impossible à établir.
  if (table.some((entry) => entry?.pid === pid && !Number.isFinite(entry?.startMs))) {
    return { ok: false, status: 'ownership_unverified' };
  }
  const owned = selectOwnedProcesses(table, { pid, processStartMs, spawnedAtMs });
  if (owned.length <= 0) return { ok: true, status: 'already_exited' };

  for (const entry of owned) {
    try {
      await killProcess(entry.pid);
    } catch {}
  }

  // Fin confirmée seulement quand plus aucun processus possédé (même numéro ET
  // même heure de création) ne figure dans la table.
  const ownedKeys = new Set(owned.map((entry) => `${entry.pid}@${entry.startMs}`));
  const deadline = Date.now() + maxWaitMs;
  while (true) {
    const after = await listProcesses();
    if (!Array.isArray(after)) return { ok: false, status: 'process_table_unavailable' };
    // Un numéro possédé qui réapparaît sans date lisible n'est pas une fin confirmée.
    const ownedPids = new Set(owned.map((entry) => entry.pid));
    const survivors = after.filter((entry) => (
      ownedKeys.has(`${entry.pid}@${entry.startMs}`)
      || (ownedPids.has(entry.pid) && !Number.isFinite(entry.startMs))
    ));
    if (survivors.length <= 0) return { ok: true, status: 'terminated', killed: owned.length };
    if (Date.now() >= deadline) {
      return { ok: false, status: 'still_running', survivors: survivors.map((entry) => entry.pid) };
    }
    await wait(stepMs);
  }
}

// Table des processus { pid, ppid, startMs } ; null si elle ne peut pas être lue
// (aucun arrêt n'est alors tenté).
function listSystemProcesses({ pid = null } = {}) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const filter = Number.isFinite(pid) && pid > 0 ? ` -Filter "ProcessId=${Math.trunc(pid)}"` : '';
      const command = `Get-CimInstance Win32_Process${filter} | ForEach-Object { '{0}|{1}|{2}' -f $_.ProcessId, $_.ParentProcessId, $(if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { '' }) }`;
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command],
        { windowsHide: true, timeout: 20000, maxBuffer: 16 * 1024 * 1024 },
        (err, stdout) => resolve(err ? null : parseProcessTableLines(stdout)));
      return;
    }
    execFile('ps', ['-eo', 'pid=,ppid=,lstart='], { timeout: 20000, maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => {
      if (err) return resolve(null);
      const lines = String(stdout || '').split(/\r?\n/).map((line) => {
        const match = /^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/.exec(line);
        if (!match) return '';
        const startMs = Date.parse(match[3]);
        return Number.isFinite(startMs) ? `${match[1]}|${match[2]}|${new Date(startMs).toISOString()}` : '';
      });
      resolve(parseProcessTableLines(lines.join('\n')));
    });
  });
}

async function readSystemProcessStartMs(pid) {
  const table = await listSystemProcesses({ pid });
  const entry = Array.isArray(table) ? table.find((item) => item.pid === pid) : null;
  return entry ? entry.startMs : null;
}

module.exports = {
  LEGACY_OWNERSHIP_TOLERANCE_MS,
  formatPidFileContent,
  parsePidFileContent,
  readRenderPidStatus,
  parseProcessTableLines,
  listSystemProcesses,
  readSystemProcessStartMs,
  selectOwnedProcesses,
  terminateOwnedRenderProcess,
};
