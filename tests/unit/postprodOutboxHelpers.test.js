import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS,
  MAX_POSTPROD_WORKER_COMPLETION_OUTBOX_ITEMS,
  appendToOutboxWithinCapacity,
  normalizePostprodOfflineOutbox,
  normalizePostprodWorkerCompletionOutbox,
} from "../../app/utils/postprodOutboxHelpers.js";

const renderEntries = (count) => Array.from({ length: count }, (_, i) => ({
  id: String(i + 1), kind: "create_render", payload: {},
}));
const completionEntries = (count) => Array.from({ length: count }, (_, i) => ({
  id: `c${i + 1}`, kind: "worker_complete", workerKey: "w", renderId: i + 1, payload: {},
}));

test("normalizing the offline queue never drops a pending request", () => {
  const normalized = normalizePostprodOfflineOutbox(renderEntries(MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS + 1));

  assert.equal(normalized.length, MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS + 1);
  assert.equal(normalized[0].id, "1");
});

test("normalizing the worker completion queue never drops a pending completion", () => {
  const normalized = normalizePostprodWorkerCompletionOutbox(completionEntries(MAX_POSTPROD_WORKER_COMPLETION_OUTBOX_ITEMS + 1));

  assert.equal(normalized.length, MAX_POSTPROD_WORKER_COMPLETION_OUTBOX_ITEMS + 1);
  assert.equal(normalized[0].id, "c1");
});

test("a new entry is refused when the queue is full, and the queue is left unchanged", () => {
  const full = renderEntries(MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS);

  const result = appendToOutboxWithinCapacity(full, { id: "new" }, MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS);

  assert.equal(result.accepted, false);
  assert.equal(result.list, full);
});

test("a new entry is appended below capacity", () => {
  const result = appendToOutboxWithinCapacity(renderEntries(MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS - 1), { id: "new" }, MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS);

  assert.equal(result.accepted, true);
  assert.equal(result.list.length, MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS);
  assert.equal(result.list.at(-1).id, "new");
});

// ---- Stockage local saturé : l'échec d'enregistrement n'est plus silencieux ----
import {
  writePostprodOfflineOutbox,
  writePostprodWorkerCompletionOutbox,
  createPersistenceFailureNotifier,
} from "../../app/utils/postprodOutboxHelpers.js";

function withLocalStorage(storage, run) {
  const previous = globalThis.localStorage;
  globalThis.localStorage = storage;
  try { return run(); } finally { globalThis.localStorage = previous; }
}

function memoryStorage({ full = false } = {}) {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    removeItem: (key) => data.delete(key),
    setItem: (key, value) => {
      if (full) throw Object.assign(new Error("quota"), { name: "QuotaExceededError" });
      data.set(key, value);
    },
  };
}

test("writing a queue reports success, and stores compact JSON", () => {
  const storage = memoryStorage();
  const ok = withLocalStorage(storage, () => writePostprodOfflineOutbox(renderEntries(2)));

  assert.equal(ok, true);
  const stored = [...storage.data.values()][0];
  assert.equal(stored.includes("\n"), false);
  assert.equal(JSON.parse(stored).length, 2);
});

test("a full local storage makes both queue writes report a failure", () => {
  const storage = memoryStorage({ full: true });

  assert.equal(withLocalStorage(storage, () => writePostprodOfflineOutbox(renderEntries(1))), false);
  assert.equal(withLocalStorage(storage, () => writePostprodWorkerCompletionOutbox(completionEntries(1))), false);
});

test("the failure notifier warns once per failure episode and re-arms after a success", () => {
  const warnings = [];
  const report = createPersistenceFailureNotifier(() => warnings.push("warn"));

  report(false);
  report(false);
  report(true);
  report(false);

  assert.equal(warnings.length, 2);
});
