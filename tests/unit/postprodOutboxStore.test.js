import test from "node:test";
import assert from "node:assert/strict";

import { createSyncedOutbox } from "../../app/utils/postprodOutboxStore.js";
import { appendToOutboxWithinCapacity } from "../../app/utils/postprodOutboxHelpers.js";

const items = (count) => Array.from({ length: count }, (_, i) => ({ id: String(i + 1) }));

function makeStore(initial) {
  const commits = [];
  const store = createSyncedOutbox({ initial, commit: (list) => commits.push(list.length) });
  const tryAppend = (item) => store.tryUpdate((current) => {
    const result = appendToOutboxWithinCapacity(current, item, 100);
    return { next: result.list, accepted: result.accepted };
  });
  return { store, commits, tryAppend };
}

test("V3: with 99 pending, two simultaneous additions: exactly one accepted, one refused", () => {
  const { store, tryAppend } = makeStore(items(99));

  const a = tryAppend({ id: "A" });
  const b = tryAppend({ id: "B" });

  assert.deepEqual([a.accepted, b.accepted], [true, false]);
  assert.equal(store.get().length, 100);
  assert.equal(store.get().at(-1).id, "A");
});

test("a refused addition does not commit anything", () => {
  const { commits, tryAppend } = makeStore(items(100));

  assert.equal(tryAppend({ id: "X" }).accepted, false);
  assert.deepEqual(commits, []);
});

test("functional updates apply to the current queue and are committed", () => {
  const { store, commits, tryAppend } = makeStore(items(2));
  tryAppend({ id: "A" });

  store.update((current) => current.filter((entry) => entry.id !== "1"));

  assert.deepEqual(store.get().map((entry) => entry.id), ["2", "A"]);
  assert.deepEqual(commits, [3, 2]);
});
