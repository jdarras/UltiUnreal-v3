// Supervision d'un rendu par un Job Object Windows.
//
// Un superviseur PowerShell (détaché d'UltiUnreal) crée un Job Object avec
// JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE, lance la commande suspendue, l'associe au
// job puis la démarre : tous ses descendants appartiennent au job, y compris
// ceux créés via un intermédiaire déjà terminé. Le superviseur :
//   - déclare la fin quand le job ne contient plus aucun processus actif ;
//   - arrête tout le job (TerminateJobObject) si le fichier d'arrêt apparaît ;
//   - écrit son état dans un fichier JSON (starting/running/exited/failed).
// S'il meurt, Windows ferme le job et arrête tous les processus qu'il contient :
// aucun processus de rendu ne peut subsister sans suivi.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const crypto = require('crypto');

const SUPERVISOR_SCRIPT = String.raw`param(
  [Parameter(Mandatory = $true)][string]$StateFile,
  [Parameter(Mandatory = $true)][string]$StopFile,
  [Parameter(Mandatory = $true)][string]$JobFile,
  [Parameter(Mandatory = $true)][string]$ClaimFile,
  [Parameter(Mandatory = $true)][string]$AttemptId,
  [Parameter(Mandatory = $true)][string]$CommandLineB64,
  [string]$Cwd = ''
)
$ErrorActionPreference = 'Stop'

# 1. Prise exclusive de la tentative, avant toute autre opération. Elle arbitre
#    avec l'application : si celle-ci a déclaré la tentative abandonnée (même
#    fichier, création exclusive), ce superviseur tardif ne lance rien et
#    n'écrit rien (une nouvelle tentative peut utiliser le même rendu).
try {
  $claim = [IO.File]::Open($ClaimFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
  $bytes = [Text.Encoding]::UTF8.GetBytes("supervisor:$PID")
  $claim.Write($bytes, 0, $bytes.Length)
  $claim.Close()
} catch {
  exit 0
}

# 2. La réservation doit toujours exister et porter cet identifiant de tentative.
try {
  $reservation = [IO.File]::ReadAllText($JobFile) | ConvertFrom-Json
  if ([string]$reservation.attemptId -ne $AttemptId) { exit 0 }
} catch {
  exit 0
}

function Write-State($values) {
  $values['supervisorPid'] = $PID
  $values['at'] = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $json = ($values | ConvertTo-Json -Compress)
  $tmp = "$StateFile.tmp"
  [IO.File]::WriteAllText($tmp, $json)
  Move-Item -LiteralPath $tmp -Destination $StateFile -Force
}

try {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class UURenderJob {
  [StructLayout(LayoutKind.Sequential)]
  struct BASIC_LIMIT {
    public long PerProcessUserTimeLimit; public long PerJobUserTimeLimit; public uint LimitFlags;
    public UIntPtr MinimumWorkingSetSize; public UIntPtr MaximumWorkingSetSize; public uint ActiveProcessLimit;
    public UIntPtr Affinity; public uint PriorityClass; public uint SchedulingClass;
  }
  [StructLayout(LayoutKind.Sequential)]
  struct IO_COUNTERS {
    public ulong ReadOperationCount; public ulong WriteOperationCount; public ulong OtherOperationCount;
    public ulong ReadTransferCount; public ulong WriteTransferCount; public ulong OtherTransferCount;
  }
  [StructLayout(LayoutKind.Sequential)]
  struct EXTENDED_LIMIT {
    public BASIC_LIMIT BasicLimitInformation; public IO_COUNTERS IoInfo;
    public UIntPtr ProcessMemoryLimit; public UIntPtr JobMemoryLimit;
    public UIntPtr PeakProcessMemoryUsed; public UIntPtr PeakJobMemoryUsed;
  }
  [StructLayout(LayoutKind.Sequential)]
  struct BASIC_ACCOUNTING {
    public long TotalUserTime; public long TotalKernelTime; public long ThisPeriodTotalUserTime;
    public long ThisPeriodTotalKernelTime; public uint TotalPageFaultCount; public uint TotalProcesses;
    public uint ActiveProcesses; public uint TotalTerminatedProcesses;
  }
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  struct STARTUPINFO {
    public int cb; public string lpReserved; public string lpDesktop; public string lpTitle;
    public int dwX; public int dwY; public int dwXSize; public int dwYSize; public int dwXCountChars;
    public int dwYCountChars; public int dwFillAttribute; public int dwFlags; public short wShowWindow;
    public short cbReserved2; public IntPtr lpReserved2; public IntPtr hStdInput; public IntPtr hStdOutput;
    public IntPtr hStdError;
  }
  [StructLayout(LayoutKind.Sequential)]
  struct PROCESS_INFORMATION { public IntPtr hProcess; public IntPtr hThread; public int dwProcessId; public int dwThreadId; }

  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern IntPtr CreateJobObject(IntPtr attributes, string name);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool SetInformationJobObject(IntPtr job, int infoClass, ref EXTENDED_LIMIT info, int size);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool QueryInformationJobObject(IntPtr job, int infoClass, out BASIC_ACCOUNTING info, int size, IntPtr returnLength);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool TerminateJobObject(IntPtr job, uint exitCode);
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
  static extern bool CreateProcess(string app, System.Text.StringBuilder commandLine, IntPtr processAttributes,
    IntPtr threadAttributes, bool inheritHandles, uint flags, IntPtr environment, string currentDirectory,
    ref STARTUPINFO startupInfo, out PROCESS_INFORMATION processInformation);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern uint ResumeThread(IntPtr thread);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool TerminateProcess(IntPtr process, uint exitCode);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool GetExitCodeProcess(IntPtr process, out uint exitCode);
  [DllImport("kernel32.dll", SetLastError = true)]
  static extern bool CloseHandle(IntPtr handle);

  const uint KILL_ON_JOB_CLOSE = 0x2000;
  const uint CREATE_SUSPENDED = 0x4;
  const uint CREATE_NEW_CONSOLE = 0x10;
  const uint CREATE_UNICODE_ENVIRONMENT = 0x400;

  static IntPtr job = IntPtr.Zero;
  static IntPtr root = IntPtr.Zero;
  public static int RootPid = 0;

  public static string Start(string commandLine, string cwd) {
    job = CreateJobObject(IntPtr.Zero, null);
    if (job == IntPtr.Zero) return "create_job_failed:" + Marshal.GetLastWin32Error();
    EXTENDED_LIMIT limit = new EXTENDED_LIMIT();
    limit.BasicLimitInformation.LimitFlags = KILL_ON_JOB_CLOSE;
    if (!SetInformationJobObject(job, 9, ref limit, Marshal.SizeOf(typeof(EXTENDED_LIMIT))))
      return "set_job_info_failed:" + Marshal.GetLastWin32Error();
    STARTUPINFO si = new STARTUPINFO();
    si.cb = Marshal.SizeOf(typeof(STARTUPINFO));
    PROCESS_INFORMATION pi;
    string dir = String.IsNullOrEmpty(cwd) ? null : cwd;
    if (!CreateProcess(null, new System.Text.StringBuilder(commandLine), IntPtr.Zero, IntPtr.Zero, false,
        CREATE_SUSPENDED | CREATE_NEW_CONSOLE | CREATE_UNICODE_ENVIRONMENT, IntPtr.Zero, dir, ref si, out pi))
      return "create_process_failed:" + Marshal.GetLastWin32Error();
    if (!AssignProcessToJobObject(job, pi.hProcess)) {
      int err = Marshal.GetLastWin32Error();
      TerminateProcess(pi.hProcess, 1);
      CloseHandle(pi.hThread); CloseHandle(pi.hProcess);
      return "assign_job_failed:" + err;
    }
    ResumeThread(pi.hThread);
    CloseHandle(pi.hThread);
    root = pi.hProcess;
    RootPid = pi.dwProcessId;
    return "";
  }

  public static int ActiveProcesses() {
    BASIC_ACCOUNTING info;
    if (!QueryInformationJobObject(job, 1, out info, Marshal.SizeOf(typeof(BASIC_ACCOUNTING)), IntPtr.Zero)) return -1;
    return (int)info.ActiveProcesses;
  }

  public static void Terminate() { TerminateJobObject(job, 1); }

  public static long RootExitCode() {
    uint code;
    if (root == IntPtr.Zero || !GetExitCodeProcess(root, out code)) return -1;
    return code;
  }
}
'@
} catch {
  Write-State @{ state = 'failed'; error = ('compile_failed: ' + $_.Exception.Message) }
  exit 2
}

Write-State @{ state = 'starting' }
if (Test-Path -LiteralPath $StopFile) {
  # Arrêt demandé avant le démarrage : rien n'est lancé.
  Write-State @{ state = 'exited'; stopped = $true; rootExitCode = -1 }
  exit 0
}
$commandLine = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($CommandLineB64))
$startError = [UURenderJob]::Start($commandLine, $Cwd)
if ($startError) {
  Write-State @{ state = 'failed'; error = $startError }
  exit 3
}
Write-State @{ state = 'running'; rootPid = [UURenderJob]::RootPid }

$stopRequested = $false
while ($true) {
  if (-not $stopRequested -and (Test-Path -LiteralPath $StopFile)) {
    $stopRequested = $true
    [UURenderJob]::Terminate()
  }
  $active = [UURenderJob]::ActiveProcesses()
  if ($active -eq 0) { break }
  if ($active -lt 0) {
    Write-State @{ state = 'failed'; error = 'job_query_failed'; rootPid = [UURenderJob]::RootPid }
    exit 4
  }
  Start-Sleep -Milliseconds 500
}

Write-State @{
  state = 'exited'
  rootPid = [UURenderJob]::RootPid
  rootExitCode = [UURenderJob]::RootExitCode()
  stopped = $stopRequested
}
exit 0
`;

// Ligne de commande Windows selon les règles de CommandLineToArgvW.
function quoteWindowsArg(arg) {
  const value = String(arg ?? '');
  if (value && !/[\s"]/.test(value)) return value;
  let out = '"';
  let backslashes = 0;
  for (const ch of value) {
    if (ch === '\\') {
      backslashes += 1;
      continue;
    }
    if (ch === '"') {
      out += '\\'.repeat(backslashes * 2 + 1) + '"';
    } else {
      out += '\\'.repeat(backslashes) + ch;
    }
    backslashes = 0;
  }
  return `${out}${'\\'.repeat(backslashes * 2)}"`;
}

function buildWindowsCommandLine(command, args = []) {
  const program = String(command || '').trim();
  const head = /[\s]/.test(program) ? `"${program}"` : program;
  return [head, ...(Array.isArray(args) ? args : []).map(quoteWindowsArg)].join(' ');
}

// Lancement du superviseur via un relais PowerShell court (Start-Process) :
// - un PowerShell lancé en mode « détaché » sans console se ferme aussitôt ;
// - lancé normalement, il hériterait du job de Node (arrêté avec UltiUnreal).
// Le relais crée le superviseur avec sa propre console cachée, hors du job de
// Node, et écrit son numéro de processus sur la sortie standard.
function buildSupervisorLaunch({
  scriptFile, stateFile, stopFile, jobFile, claimFile, attemptId, commandLine, cwd = '',
}) {
  const supervisorArgs = [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', scriptFile,
    '-StateFile', stateFile,
    '-StopFile', stopFile,
    '-JobFile', jobFile,
    '-ClaimFile', claimFile,
    '-AttemptId', attemptId,
    '-CommandLineB64', Buffer.from(String(commandLine || ''), 'utf8').toString('base64'),
    '-Cwd', String(cwd || ''),
  ].map(quoteWindowsArg).join(' ');
  const relay = [
    `$p = Start-Process -FilePath 'powershell.exe' -ArgumentList '${supervisorArgs.replace(/'/g, "''")}' -WindowStyle Hidden -PassThru`,
    '[Console]::Out.Write($p.Id)',
  ].join('; ');
  return {
    file: 'powershell.exe',
    args: [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-EncodedCommand', Buffer.from(relay, 'utf16le').toString('base64'),
    ],
  };
}

// Exécute le relais et renvoie le numéro du superviseur créé (ou null).
function runSupervisorRelay(launch) {
  return new Promise((resolve) => {
    execFile(launch.file, launch.args, { windowsHide: true, timeout: 30000 }, (err, stdout) => {
      const pid = parseInt(String(stdout || '').trim(), 10);
      resolve(!err && Number.isFinite(pid) && pid > 0 ? pid : null);
    });
  });
}

function parseJobState(text) {
  try {
    const parsed = JSON.parse(String(text || ''));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

// Phase du rendu à partir de l'état écrit par le superviseur et de la présence
// de ce même superviseur (vérifiée sur son identité exacte).
//   running  : le job contient encore au moins un processus
//   exited   : plus aucun processus ; rootExitCode = code du processus lancé
//   failed   : le lancement ou la supervision a échoué
//   lost     : superviseur disparu avant la fin ; Windows a arrêté le job
//   unknown  : état illisible alors que le superviseur vit (lecture à refaire)
function interpretJobState(state, { supervisorAlive }) {
  const phase = String(state?.state || '');
  if (phase === 'exited') {
    const code = Number(state?.rootExitCode);
    return {
      phase: 'exited',
      rootExitCode: Number.isInteger(code) && code >= 0 ? code : null,
      stopped: state?.stopped === true,
    };
  }
  if (phase === 'failed') return { phase: 'failed', error: String(state?.error || 'supervisor_failed') };
  if (supervisorAlive === true) {
    return phase === 'running' || phase === 'starting'
      ? { phase: 'running', rootPid: Number(state?.rootPid) || null }
      : { phase: 'unknown' };
  }
  if (supervisorAlive === false) return { phase: 'lost' };
  return { phase: 'unknown' };
}

// Délai pendant lequel une réservation sans superviseur connu est considérée
// comme « en cours de lancement ». Au-delà, sans aucun état écrit par un
// superviseur, la tentative est abandonnée (aucun processus n'a été lancé).
const RESERVATION_GRACE_MS = 60000;

// Suivi des rendus supervisés dans un dossier : <dir>/uu_render_<tag>.job
// (réservation puis lancement), .state (écrit par le superviseur), .stop
// (demande d'arrêt). listProcesses({ pid }) renvoie la table ou null.
// Un fichier absent et un fichier illisible sont distingués : dans le second
// cas le suivi est « unverifiable » et bloque la station.
function createRenderJobStore({
  dir,
  listProcesses,
  runRelay,
  readProcessStartMs,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  newAttemptId = () => crypto.randomBytes(16).toString('hex'),
}) {
  const fileFor = (tag, ext) => path.join(dir, `uu_render_${tag}.${ext}`);

  function readJsonFile(file) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (err) {
      return err?.code === 'ENOENT' ? { status: 'absent' } : { status: 'invalid' };
    }
    try {
      const value = JSON.parse(text);
      return value && typeof value === 'object' ? { status: 'ok', value } : { status: 'invalid' };
    } catch {
      return { status: 'invalid' };
    }
  }

  // Publication atomique : écriture complète dans un fichier temporaire, puis renommage.
  function writeJsonAtomic(file, value) {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value));
    fs.renameSync(tmp, file);
  }

  // Prise d'une tentative : fichier créé une seule fois (création exclusive),
  // par le superviseur (« supervisor:<pid> ») ou par l'application quand elle
  // déclare la tentative abandonnée (« abandoned »).
  const claimFileFor = (tag, attemptId) => fileFor(tag, `claim.${attemptId}`);

  function readClaim(tag, attemptId) {
    let text;
    try {
      text = fs.readFileSync(claimFileFor(tag, attemptId), 'utf8').trim();
    } catch (err) {
      return err?.code === 'ENOENT' ? { status: 'absent' } : { status: 'invalid' };
    }
    if (text === 'abandoned') return { status: 'abandoned' };
    const match = /^supervisor:(\d+)$/.exec(text);
    if (match) return { status: 'supervisor', pid: Number(match[1]) };
    // Fichier en cours d'écriture par le superviseur (créé puis rempli).
    return text ? { status: 'invalid' } : { status: 'pending' };
  }

  // L'application ne peut abandonner une tentative qu'en remportant la prise :
  // un superviseur tardif trouvera alors « abandoned » et ne lancera rien.
  function claimAbandonment(tag, attemptId) {
    try {
      fs.writeFileSync(claimFileFor(tag, attemptId), 'abandoned', { flag: 'wx' });
      return true;
    } catch {
      return false;
    }
  }

  function requestStopFile(tag) {
    try {
      fs.writeFileSync(fileFor(tag, 'stop'), String(now()));
      return true;
    } catch {
      return false;
    }
  }

  function removeFiles(tag) {
    for (const ext of ['job', 'job.tmp', 'state', 'stop', 'state.tmp']) {
      try { fs.rmSync(fileFor(tag, ext), { force: true }); } catch {}
    }
    // Prises de tentatives : un superviseur tardif sans réservation valide ne
    // lance rien, la prise peut donc être retirée avec le reste du suivi.
    let names = [];
    try { names = fs.readdirSync(dir); } catch {}
    const prefix = `uu_render_${tag}.claim.`;
    for (const name of names) {
      if (name.startsWith(prefix)) {
        try { fs.rmSync(path.join(dir, name), { force: true }); } catch {}
      }
    }
  }

  // true/false si la table des processus est lisible, null sinon.
  async function isSupervisorAlive({ pid, startMs, spawnedAtMs }) {
    if (!Number.isFinite(pid) || pid <= 0) return false;
    const table = await listProcesses({ pid });
    if (!Array.isArray(table)) return null;
    const entry = table.find((item) => item.pid === pid);
    if (!entry) return false;
    if (Number.isFinite(startMs)) return entry.startMs === startMs;
    return entry.startMs >= spawnedAtMs - 2000 && entry.startMs <= spawnedAtMs + RESERVATION_GRACE_MS;
  }

  async function read(tag) {
    const metaFile = readJsonFile(fileFor(tag, 'job'));
    if (metaFile.status === 'absent') return { exists: false };
    if (metaFile.status === 'invalid') return { exists: true, phase: 'unverifiable', error: 'job_meta_invalid' };
    const meta = metaFile.value;
    const spawnedAtMs = Number(meta.spawnedAtMs) || 0;
    const base = { exists: true, spawnedAtMs: spawnedAtMs || null };

    const stateFile = readJsonFile(fileFor(tag, 'state'));
    const state = stateFile.status === 'ok' ? stateFile.value : null;
    if (state?.state === 'exited' || state?.state === 'failed') {
      return { ...base, ...interpretJobState(state, { supervisorAlive: null }) };
    }

    // Identité du superviseur : celle enregistrée par l'application, sinon celle
    // qu'il a écrite lui-même dans son état (application arrêtée pendant le lancement).
    let supervisorPid = Number(meta.supervisorPid) || Number(state?.supervisorPid) || 0;
    if (!supervisorPid) {
      if (stateFile.status === 'invalid') return { ...base, phase: 'unverifiable', error: 'job_state_invalid' };
      const attemptId = String(meta.attemptId || '');
      if (!/^[a-f0-9]{16,64}$/.test(attemptId)) return { ...base, phase: 'unverifiable', error: 'job_attempt_invalid' };
      let claim = readClaim(tag, attemptId);
      if (claim.status === 'absent') {
        // Le temps écoulé seul ne prouve rien : l'abandon n'est acquis que si
        // l'application remporte la prise exclusive de la tentative.
        if (now() - spawnedAtMs <= RESERVATION_GRACE_MS) return { ...base, phase: 'unknown' };
        if (claimAbandonment(tag, attemptId)) return { ...base, phase: 'abandoned' };
        claim = readClaim(tag, attemptId);
      }
      if (claim.status === 'abandoned') return { ...base, phase: 'abandoned' };
      if (claim.status === 'pending') return { ...base, phase: 'unknown' };
      if (claim.status !== 'supervisor') return { ...base, phase: 'unverifiable', error: 'job_claim_invalid' };
      supervisorPid = claim.pid;
    }
    const supervisorAlive = await isSupervisorAlive({
      pid: supervisorPid,
      startMs: Number.isFinite(meta.supervisorStartMs) ? meta.supervisorStartMs : null,
      spawnedAtMs,
    });
    return { ...base, ...interpretJobState(state, { supervisorAlive }) };
  }

  // Arrêt du job entier, confirmé : job vide, ou superviseur disparu (Windows
  // arrête alors tout le job grâce à KILL_ON_JOB_CLOSE). Un suivi illisible
  // n'est jamais considéré comme arrêté.
  async function stop(tag, { maxWaitMs = 30000 } = {}) {
    const first = await read(tag);
    if (!first.exists) return { ok: true, phase: 'none' };
    if (first.phase === 'unverifiable') return { ok: false, phase: 'unverifiable' };
    if (first.phase !== 'running' && first.phase !== 'unknown') return { ok: true, phase: first.phase };
    requestStopFile(tag);
    const deadline = now() + maxWaitMs;
    while (now() < deadline) {
      await sleep(500);
      const job = await read(tag);
      if (['exited', 'lost', 'failed', 'abandoned'].includes(job.phase)) return { ok: true, phase: job.phase };
      if (job.phase === 'unverifiable') return { ok: false, phase: 'unverifiable' };
    }
    return { ok: false, phase: 'still_running' };
  }

  async function start({ tag, scriptFile, command, args = [], cwd = '', startTimeoutMs = 30000 }) {
    removeFiles(tag);
    const spawnedAtMs = now();
    const attemptId = newAttemptId();
    // 1. Réservation durable AVANT tout lancement : si elle échoue, rien n'est lancé.
    //    Le superviseur vérifiera qu'elle porte toujours son identifiant de tentative.
    try {
      writeJsonAtomic(fileFor(tag, 'job'), { phase: 'launching', attemptId, spawnedAtMs, command });
    } catch {
      return { ok: false, error: 'job_meta_unwritable' };
    }
    const launch = buildSupervisorLaunch({
      scriptFile,
      stateFile: fileFor(tag, 'state'),
      stopFile: fileFor(tag, 'stop'),
      jobFile: fileFor(tag, 'job'),
      claimFile: claimFileFor(tag, attemptId),
      attemptId,
      commandLine: buildWindowsCommandLine(command, args),
      cwd,
    });
    const supervisorPid = await runRelay(launch);
    if (!supervisorPid) {
      // Lancement incertain : arrêt demandé, réservation conservée pour la réconciliation.
      requestStopFile(tag);
      return { ok: false, error: 'supervisor_launch_failed' };
    }
    // 2. Identité du superviseur.
    const supervisorStartMs = await readProcessStartMs(supervisorPid);
    try {
      writeJsonAtomic(fileFor(tag, 'job'), { phase: 'launched', attemptId, spawnedAtMs, command, supervisorPid, supervisorStartMs });
    } catch {
      // Le superviseur tourne : arrêt demandé ; la réservation et son état
      // (qui contient son numéro) permettent à la réconciliation de le retrouver.
      requestStopFile(tag);
      return { ok: false, error: 'job_meta_unwritable' };
    }
    // 3. Démarrage confirmé par le superviseur.
    const deadline = now() + startTimeoutMs;
    while (now() < deadline) {
      const stateFile = readJsonFile(fileFor(tag, 'state'));
      const state = stateFile.status === 'ok' ? stateFile.value : null;
      if (state?.state === 'running' || state?.state === 'exited') {
        return { ok: true, detached: true, supervised: true, pid: Number(state.rootPid) || null, spawnedAtMs };
      }
      if (state?.state === 'failed') {
        // Échec écrit par le superviseur lui-même : aucun processus du job ne tourne.
        removeFiles(tag);
        return { ok: false, error: String(state.error || 'supervisor_failed') };
      }
      await sleep(250);
    }
    // Démarrage non confirmé : arrêt demandé, le suivi reste pour la réconciliation.
    requestStopFile(tag);
    return { ok: false, error: 'supervisor_start_timeout' };
  }

  // Lève une erreur si le dossier ne peut pas être lu (la réconciliation bloque alors).
  function listTags() {
    return fs.readdirSync(dir)
      .map((name) => /^uu_render_([a-z0-9_-]+)\.job$/i.exec(name)?.[1] || '')
      .filter(Boolean);
  }

  return { read, stop, start, removeFiles, listTags };
}

module.exports = {
  SUPERVISOR_SCRIPT,
  createRenderJobStore,
  quoteWindowsArg,
  buildWindowsCommandLine,
  buildSupervisorLaunch,
  runSupervisorRelay,
  parseJobState,
  interpretJobState,
};
