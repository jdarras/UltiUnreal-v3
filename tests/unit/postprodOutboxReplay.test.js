import test from "node:test";
import assert from "node:assert/strict";

import {
  applyOutboxReplayOutcome,
  runOfflineOutboxReplay,
  runWorkerCompletionOutboxReplay,
} from "../../app/utils/postprodOutboxReplay.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const isRecoverableError = (err) => err?.code === "offline";

test("offline replay keeps a request queued while the previous one was being sent", async () => {
  const response = deferred();
  let queue = [{ id: "A", kind: "create_render", userId: 1, payload: {} }];
  const replay = runOfflineOutboxReplay({
    token: "tok",
    currentUserId: 1,
    outbox: queue,
    createRender: () => response.promise,
    isRecoverableError,
  });
  queue = [...queue, { id: "B", kind: "create_render", userId: 1, payload: {} }];
  response.resolve({ ok: true });
  const outcome = await replay;

  queue = applyOutboxReplayOutcome(queue, outcome);

  assert.equal(outcome.replayed, 1);
  assert.deepEqual(queue.map((entry) => entry.id), ["B"]);
});

test("offline replay stops on a recoverable error and only bumps that entry", async () => {
  const outbox = [
    { id: "A", kind: "create_render", payload: {}, attempts: 2 },
    { id: "B", kind: "create_render", payload: {} },
  ];
  const outcome = await runOfflineOutboxReplay({
    outbox,
    createRender: async () => { throw Object.assign(new Error("down"), { code: "offline" }); },
    isRecoverableError,
  });

  const next = applyOutboxReplayOutcome(outbox, outcome);

  assert.equal(outcome.stoppedOnRecoverableError, true);
  assert.deepEqual(next.map((entry) => [entry.id, entry.attempts]), [["A", 3], ["B", undefined]]);
  assert.equal(next[0].lastError, "down");
});

test("offline replay drops a rejected request and skips other users", async () => {
  const outbox = [
    { id: "A", kind: "create_render", userId: 1, payload: {} },
    { id: "O", kind: "create_render", userId: 2, payload: {} },
  ];
  const outcome = await runOfflineOutboxReplay({
    currentUserId: 1,
    outbox,
    createRender: async () => { throw new Error("invalid_payload"); },
    isRecoverableError,
  });

  assert.equal(outcome.dropped, 1);
  assert.deepEqual(applyOutboxReplayOutcome(outbox, outcome).map((entry) => entry.id), ["O"]);
});

test("worker completion replay keeps a completion queued during the replay", async () => {
  const response = deferred();
  let queue = [{ id: "C1", renderId: 7, workerKey: "w", payload: { a: 1 } }];
  const sent = [];
  const replay = runWorkerCompletionOutboxReplay({
    token: "tok",
    workerKey: "w",
    entries: queue,
    getRenderJob: async () => ({ render: { id: 7 } }),
    completeRenderJob: async (_token, renderId, payload) => { sent.push([renderId, payload]); return response.promise; },
    canReplay: () => true,
    buildReplayPayload: (payload) => ({ ...payload, replay: true }),
    isRecoverableError,
  });
  await Promise.resolve();
  queue = [...queue, { id: "C2", renderId: 8, workerKey: "w", payload: {} }];
  response.resolve({ ok: true });
  const outcome = await replay;

  queue = applyOutboxReplayOutcome(queue, outcome);

  assert.deepEqual(sent, [[7, { a: 1, replay: true }]]);
  assert.deepEqual(queue.map((entry) => entry.id), ["C2"]);
});

test("worker completion replay drops a completion that can no longer be replayed", async () => {
  const entries = [{ id: "C1", renderId: 7, workerKey: "w", payload: {} }];
  const outcome = await runWorkerCompletionOutboxReplay({
    workerKey: "w",
    entries,
    getRenderJob: async () => ({ render: { id: 7, status: "Done" } }),
    completeRenderJob: async () => assert.fail("must not complete"),
    canReplay: () => false,
    buildReplayPayload: (payload) => payload,
    isRecoverableError,
  });

  assert.equal(outcome.dropped, 1);
  assert.deepEqual(applyOutboxReplayOutcome(entries, outcome), []);
});

test("worker completion replay keeps the rebuilt payload on a recoverable error", async () => {
  const entries = [{ id: "C1", renderId: 7, workerKey: "w", payload: { a: 1 } }];
  const outcome = await runWorkerCompletionOutboxReplay({
    workerKey: "w",
    entries,
    getRenderJob: async () => ({ renderJob: { id: 7 } }),
    completeRenderJob: async () => { throw Object.assign(new Error("down"), { code: "offline" }); },
    canReplay: () => true,
    buildReplayPayload: (payload) => ({ ...payload, replay: true }),
    isRecoverableError,
  });

  const [entry] = applyOutboxReplayOutcome(entries, outcome);

  assert.deepEqual(entry.payload, { a: 1, replay: true });
  assert.equal(entry.attempts, 1);
});
