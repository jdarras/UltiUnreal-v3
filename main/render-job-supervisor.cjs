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

const SUPERVISOR_SCRIPT = String.raw`param(
  [Parameter(Mandatory = $true)][string]$StateFile,
  [Parameter(Mandatory = $true)][string]$StopFile,
  [Parameter(Mandatory = $true)][string]$CommandLineB64,
  [string]$Cwd = ''
)
$ErrorActionPreference = 'Stop'

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
function buildSupervisorLaunch({ scriptFile, stateFile, stopFile, commandLine, cwd = '' }) {
  const supervisorArgs = [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
    '-File', scriptFile,
    '-StateFile', stateFile,
    '-StopFile', stopFile,
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

// Suivi des rendus supervisés dans un dossier : <dir>/uu_render_<tag>.job
// (lancement), .state (écrit par le superviseur), .stop (demande d'arrêt).
// listProcesses({ pid }) renvoie la table { pid, ppid, startMs } ou null.
function createRenderJobStore({
  dir,
  listProcesses,
  runRelay,
  readProcessStartMs,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
}) {
  const fileFor = (tag, ext) => path.join(dir, `uu_render_${tag}.${ext}`);
  const readJson = (file) => {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  function removeFiles(tag) {
    for (const ext of ['job', 'state', 'stop', 'state.tmp']) {
      try { fs.unlinkSync(fileFor(tag, ext)); } catch {}
    }
  }

  // true/false si la table des processus est lisible, null sinon.
  async function isSupervisorAlive(meta) {
    const pid = Number(meta?.supervisorPid || 0);
    if (!Number.isFinite(pid) || pid <= 0) return false;
    const table = await listProcesses({ pid });
    if (!Array.isArray(table)) return null;
    const entry = table.find((item) => item.pid === pid);
    if (!entry) return false;
    if (Number.isFinite(meta?.supervisorStartMs)) return entry.startMs === meta.supervisorStartMs;
    const spawnedAtMs = Number(meta?.spawnedAtMs || 0);
    return entry.startMs >= spawnedAtMs - 2000 && entry.startMs <= spawnedAtMs + 60000;
  }

  async function read(tag) {
    const meta = readJson(fileFor(tag, 'job'));
    if (!meta) return { exists: false };
    const state = readJson(fileFor(tag, 'state'));
    const finished = state?.state === 'exited' || state?.state === 'failed';
    const supervisorAlive = finished ? null : await isSupervisorAlive(meta);
    return {
      exists: true,
      spawnedAtMs: Number(meta.spawnedAtMs) || null,
      ...interpretJobState(state, { supervisorAlive }),
    };
  }

  // Arrêt du job entier, confirmé : job vide, ou superviseur disparu (Windows
  // arrête alors tout le job grâce à KILL_ON_JOB_CLOSE).
  async function stop(tag, { maxWaitMs = 30000 } = {}) {
    const first = await read(tag);
    if (!first.exists) return { ok: true, phase: 'none' };
    if (first.phase !== 'running' && first.phase !== 'unknown') return { ok: true, phase: first.phase };
    try { fs.writeFileSync(fileFor(tag, 'stop'), String(now())); } catch {}
    const deadline = now() + maxWaitMs;
    while (now() < deadline) {
      await sleep(500);
      const job = await read(tag);
      if (job.phase === 'exited' || job.phase === 'lost' || job.phase === 'failed') return { ok: true, phase: job.phase };
    }
    return { ok: false, phase: 'still_running' };
  }

  async function start({ tag, scriptFile, command, args = [], cwd = '', startTimeoutMs = 30000 }) {
    removeFiles(tag);
    const spawnedAtMs = now();
    const launch = buildSupervisorLaunch({
      scriptFile,
      stateFile: fileFor(tag, 'state'),
      stopFile: fileFor(tag, 'stop'),
      commandLine: buildWindowsCommandLine(command, args),
      cwd,
    });
    const supervisorPid = await runRelay(launch);
    if (!supervisorPid) return { ok: false, error: 'supervisor_launch_failed' };
    const supervisorStartMs = await readProcessStartMs(supervisorPid);
    try {
      fs.writeFileSync(fileFor(tag, 'job'), JSON.stringify({ supervisorPid, supervisorStartMs, spawnedAtMs, command }));
    } catch {
      return { ok: false, error: 'job_meta_unwritable' };
    }
    const deadline = now() + startTimeoutMs;
    while (now() < deadline) {
      const state = readJson(fileFor(tag, 'state'));
      if (state?.state === 'running' || state?.state === 'exited') {
        return { ok: true, detached: true, supervised: true, pid: Number(state.rootPid) || null, spawnedAtMs };
      }
      if (state?.state === 'failed') {
        removeFiles(tag);
        return { ok: false, error: String(state.error || 'supervisor_failed') };
      }
      await sleep(250);
    }
    // Démarrage non confirmé : arrêt demandé, le suivi reste pour la réconciliation.
    try { fs.writeFileSync(fileFor(tag, 'stop'), String(now())); } catch {}
    return { ok: false, error: 'supervisor_start_timeout' };
  }

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
