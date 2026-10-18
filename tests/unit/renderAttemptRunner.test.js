import test from "node:test";
import assert from "node:assert/strict";

import {
  canStartRenderAfterReconcile,
  runSupervisedRenderAttempt,
  shouldReleaseAssignedRender,
  releaseAssignedRenderIfUnstarted,
} from "../../app/utils/renderAttemptRunner.js";

const T = 1_800_000_000_000;

// Superviseur simulé : la phase du job évolue au fil des lectures.
function fakeJob({ existing = null, phases = [], start = { ok: true, spawnedAtMs: T }, stop = { ok: true } } = {}) {
  const calls = { start: 0, stop: 0, delete: 0, reads: 0, output: [] };
  let clock = T;
  return {
    calls,
    deps: {
      pidTag: "r7",
      command: "UnrealEditor-Cmd.exe",
      timeoutMs: 60_000,
      now: () => clock,
      waitMs: async (ms) => { clock += ms; },
      pollIntervalMs: 10_000,
      readRenderJob: async () => {
        calls.reads += 1;
        if (calls.reads === 1) return existing || { exists: false };
        return phases.length ? phases.shift() : { exists: true, phase: "running" };
      },
      startRenderJob: async () => { calls.start += 1; return start; },
      stopRenderJob: async () => { calls.stop += 1; return stop; },
      deleteRenderJob: async () => { calls.delete += 1; },
      resolveOutput: async (since) => { calls.output.push(since); return { ok: true }; },
    },
  };
}

test("a launcher that exits while its child still renders does not end the attempt", async () => {
  // Le job reste « running » (l'enfant vit) puis se vide avec le code 0.
  const job = fakeJob({ phases: [
    { exists: true, phase: "running" },
    { exists: true, phase: "running" },
    { exists: true, phase: "exited", rootExitCode: 0 },
  ] });

  const result = await runSupervisedRenderAttempt(job.deps);

  assert.equal(job.calls.reads, 4);
  assert.equal(result.ok, true);
  assert.equal(job.calls.delete, 1);
});

test("a non-zero exit code fails the attempt even if a media exists", async () => {
  const job = fakeJob({ phases: [{ exists: true, phase: "exited", rootExitCode: 3 }] });

  const result = await runSupervisedRenderAttempt(job.deps);

  assert.deepEqual([result.ok, result.error], [false, "process_exit_3"]);
  assert.deepEqual(job.calls.output, []);
});

test("timeout stops the whole job; a job that survives keeps its tracking", async () => {
  const stopped = fakeJob();
  const survived = fakeJob({ stop: { ok: false } });

  const a = await runSupervisedRenderAttempt(stopped.deps);
  const b = await runSupervisedRenderAttempt(survived.deps);

  assert.deepEqual([a.error, a.processStillRunning, stopped.calls.delete], ["timeout", false, 1]);
  assert.deepEqual([b.error, b.processStillRunning, survived.calls.delete], ["timeout_process_still_running", true, 0]);
});

test("a resumed attempt keeps the original start time and deadline", async () => {
  const job = fakeJob({ existing: { exists: true, phase: "running", spawnedAtMs: T - 55_000 } });

  const result = await runSupervisedRenderAttempt(job.deps);

  assert.equal(job.calls.start, 0);
  assert.equal(result.error, "timeout");
  assert.equal(result.processStartMs, T - 55_000);
});

test("a supervisor that disappeared fails the attempt", async () => {
  const job = fakeJob({ phases: [{ exists: true, phase: "lost" }] });

  const result = await runSupervisedRenderAttempt(job.deps);

  assert.deepEqual([result.ok, result.error], [false, "supervisor_lost"]);
});

test("output freshness is checked against the launch time", async () => {
  const job = fakeJob({ start: { ok: true, spawnedAtMs: T + 123 }, phases: [{ exists: true, phase: "exited", rootExitCode: 0 }] });

  await runSupervisedRenderAttempt(job.deps);

  assert.deepEqual(job.calls.output, [T + 123]);
});

test("a failed launch is reported and nothing is polled", async () => {
  const job = fakeJob({ start: { ok: false, error: "create_process_failed:2" } });

  const result = await runSupervisedRenderAttempt(job.deps);

  assert.deepEqual([result.ok, result.error, job.calls.reads], [false, "create_process_failed:2", 1]);
});

test("a station starts a render only after a successful reconcile with no survivor", () => {
  assert.equal(canStartRenderAfterReconcile({ ok: true, busyTags: [] }), true);
  assert.equal(canStartRenderAfterReconcile({ ok: false, busyTags: [], error: "user_data_unreadable" }), false);
  assert.equal(canStartRenderAfterReconcile({ ok: true, busyTags: [{ tag: "r3" }] }), false);
  assert.equal(canStartRenderAfterReconcile({ ok: true }), false);
  assert.equal(canStartRenderAfterReconcile(null), false);
});

test("a job stopped by the supervisor never becomes a success on resume", async () => {
  const job = fakeJob({ existing: { exists: true, phase: "exited", rootExitCode: 0, stopped: true, spawnedAtMs: T } });

  const result = await runSupervisedRenderAttempt(job.deps);

  assert.deepEqual([result.ok, result.error], [false, "job_stopped"]);
  assert.deepEqual(job.calls.output, []);
});

test("a job stopped while being polled is a failure even with exit code 0", async () => {
  const job = fakeJob({ phases: [{ exists: true, phase: "exited", rootExitCode: 0, stopped: true }] });

  const result = await runSupervisedRenderAttempt(job.deps);

  assert.deepEqual([result.ok, result.error], [false, "job_stopped"]);
  assert.deepEqual(job.calls.output, []);
});

test("an unverifiable tracking blocks: nothing is launched and tracking is kept", async () => {
  const job = fakeJob({ existing: { exists: true, phase: "unverifiable", error: "job_meta_invalid" } });

  const result = await runSupervisedRenderAttempt(job.deps);

  assert.equal(job.calls.start, 0);
  assert.deepEqual([result.ok, result.error, result.processStillRunning], [false, "job_tracking_unverifiable", true]);
  assert.equal(job.calls.delete, 0);
});

test("tracking becoming unreadable while polling blocks instead of waiting for the timeout", async () => {
  const job = fakeJob({ phases: [{ exists: true, phase: "unverifiable", error: "job_meta_invalid" }] });

  const result = await runSupervisedRenderAttempt(job.deps);

  assert.deepEqual([result.ok, result.error, result.processStillRunning], [false, "job_tracking_unverifiable", true]);
  assert.equal(job.calls.delete, 0);
});

test("an abandoned reservation (no supervisor ever started) fails at once", async () => {
  const resumed = fakeJob({ existing: { exists: true, phase: "abandoned", spawnedAtMs: T } });
  const polled = fakeJob({ phases: [{ exists: true, phase: "abandoned" }] });

  const a = await runSupervisedRenderAttempt(resumed.deps);
  const b = await runSupervisedRenderAttempt(polled.deps);

  assert.deepEqual([a.error, b.error], ["supervisor_launch_abandoned", "supervisor_launch_abandoned"]);
  assert.equal(polled.calls.reads, 2);
});

test("a blocked station gives back an assigned render only if it never started it", () => {
  assert.equal(shouldReleaseAssignedRender({ renderId: 7, localJob: { exists: false }, legacyPid: { state: "absent", pid: null } }), true);
  // W1 : un fichier PID présent mais invalide ou illisible n'est pas une absence.
  assert.equal(shouldReleaseAssignedRender({ renderId: 7, localJob: { exists: false }, legacyPid: { state: "invalid", pid: null } }), false);
  assert.equal(shouldReleaseAssignedRender({ renderId: 7, localJob: { exists: false }, legacyPid: { state: "unreadable", pid: null } }), false);
  assert.equal(shouldReleaseAssignedRender({ renderId: 7, localJob: { exists: false }, legacyPid: { pid: null } }), false);
  assert.equal(shouldReleaseAssignedRender({ renderId: 7, localJob: { exists: true, phase: "running" } }), false);
  assert.equal(shouldReleaseAssignedRender({ renderId: 7, localJob: { exists: true, phase: "unverifiable" } }), false);
  assert.equal(shouldReleaseAssignedRender({ renderId: 7, localJob: { exists: false }, legacyPid: { pid: 4242 } }), false);
  assert.equal(shouldReleaseAssignedRender({ renderId: 7, localJob: null }), false);
  assert.equal(shouldReleaseAssignedRender({ renderId: 0, localJob: { exists: false } }), false);
});

// W1 : trajet complet, du vrai lecteur de fichier PID jusqu'à la décision.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const { readRenderPidStatus } = createRequire(import.meta.url)("../../main/render-process-control.cjs");

test("only a truly missing legacy pid file allows giving back a render", (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "uu-release-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, "tronque.pid"), "abc");
  fs.mkdirSync(path.join(dir, "illisible.pid"));
  const decide = (file) => shouldReleaseAssignedRender({
    renderId: 7,
    localJob: { exists: false },
    legacyPid: readRenderPidStatus(path.join(dir, file)),
  });

  assert.equal(decide("absent.pid"), true);
  assert.equal(decide("tronque.pid"), false);
  assert.equal(decide("illisible.pid"), false);
});

// W2 : la même station peut se voir réattribuer le rendu (signal d'indisponibilité
// en retard ou perdu) : chaque cycle bloqué le rend de nouveau.
test("a render reassigned to the blocked station is given back again on the next cycle", async () => {
  const released = [];
  const deps = {
    readRenderJob: async () => ({ exists: false }),
    readRenderPid: async () => ({ state: "absent", pid: null }),
    release: async (id) => { released.push(id); },
  };

  const first = await releaseAssignedRenderIfUnstarted({ renderId: 7, ...deps });
  const second = await releaseAssignedRenderIfUnstarted({ renderId: 7, ...deps });

  assert.deepEqual([first.released, second.released], [true, true]);
  assert.deepEqual(released, [7, 7]);
});

test("nothing is given back when a local trace exists or the release fails", async () => {
  const base = { renderId: 7, readRenderPid: async () => ({ state: "absent", pid: null }) };
  const traced = await releaseAssignedRenderIfUnstarted({
    ...base, readRenderJob: async () => ({ exists: true, phase: "running" }), release: async () => assert.fail("must not release"),
  });
  const failed = await releaseAssignedRenderIfUnstarted({
    ...base, readRenderJob: async () => ({ exists: false }), release: async () => { throw Object.assign(new Error("x"), { code: "offline" }); },
  });

  assert.deepEqual([traced.released, traced.reason], [false, "local_trace_present"]);
  assert.deepEqual([failed.released, failed.reason], [false, "offline"]);
});
