import test from "node:test";
import assert from "node:assert/strict";

import {
  canStartRenderAfterReconcile,
  runSupervisedRenderAttempt,
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
