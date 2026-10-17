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
