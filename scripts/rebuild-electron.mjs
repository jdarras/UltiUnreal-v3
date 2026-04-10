import { spawn } from "node:child_process";

const MAX_ATTEMPTS = 4;
const RETRY_DELAY_MS = 1800;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runElectronRebuild() {
  return new Promise((resolve) => {
    const args = ["electron-rebuild", "-f", "-w", "better-sqlite3"];
    const child = spawn("npx", args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      windowsHide: false,
      env: process.env,
    });

    let combined = "";
    child.stdout.on("data", (chunk) => {
      const txt = String(chunk || "");
      combined += txt;
      process.stdout.write(txt);
    });
    child.stderr.on("data", (chunk) => {
      const txt = String(chunk || "");
      combined += txt;
      process.stderr.write(txt);
    });

    child.on("close", (code) => {
      resolve({
        ok: Number(code || 0) === 0,
        code: Number(code || 0),
        output: combined,
      });
    });
  });
}

function isRetryableLockError(output = "") {
  const txt = String(output || "").toLowerCase();
  return (
    txt.includes("eperm") &&
    txt.includes("better_sqlite3.node") &&
    (txt.includes("unlink") || txt.includes("operation not permitted"))
  );
}

function runCommand(exe, args = []) {
  return new Promise((resolve) => {
    const child = spawn(exe, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: true,
      env: process.env,
    });
    let out = "";
    child.stdout.on("data", (chunk) => { out += String(chunk || ""); });
    child.stderr.on("data", (chunk) => { out += String(chunk || ""); });
    child.on("close", (code) => resolve({ ok: Number(code || 0) === 0, code: Number(code || 0), out }));
    child.on("error", (err) => resolve({ ok: false, code: 1, out: String(err?.message || err) }));
  });
}

async function releaseWindowsLocks() {
  if (process.platform !== "win32") return;
  const selfPid = Number(process.pid || 0);
  const psScript = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    `$selfPid = ${selfPid}`,
    "$portOwners = Get-NetTCPConnection -LocalPort 4000 -State Listen | Select-Object -ExpandProperty OwningProcess",
    "foreach ($pid in $portOwners) { if ($pid -and $pid -ne $selfPid) { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } }",
    "$targets = Get-CimInstance Win32_Process | Where-Object {",
    "  $_.ProcessId -ne $selfPid -and",
    "  (($_.Name -ieq 'electron.exe' -or $_.Name -ieq 'node.exe') -and",
    "   ($_.CommandLine -like '*UltiUnreal*' -or $_.CommandLine -like '*main\\\\server.cjs*'))",
    "}",
    "foreach ($p in $targets) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue }",
    "Write-Output 'lock_release_done'",
  ].join("\n");

  const result = await runCommand("powershell", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    psScript,
  ]);
  if (!result.ok) {
    console.warn("[rebuild-electron] impossible de libérer certains verrous:", result.out.trim());
  }
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = await runElectronRebuild();
    if (result.ok) {
      process.exit(0);
      return;
    }

    if (attempt >= MAX_ATTEMPTS || !isRetryableLockError(result.output)) {
      process.exit(result.code || 1);
      return;
    }

    await releaseWindowsLocks();
    console.warn(
      `[rebuild-electron] verrou détecté sur better_sqlite3.node (tentative ${attempt}/${MAX_ATTEMPTS}), nouvelle tentative dans ${RETRY_DELAY_MS}ms...`
    );
    await wait(RETRY_DELAY_MS);
  }

  process.exit(1);
}

main().catch((err) => {
  console.error("[rebuild-electron] échec inattendu:", err);
  process.exit(1);
});
