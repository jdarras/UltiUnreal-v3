import test from "node:test";
import assert from "node:assert/strict";

import { keepIfUnchanged } from "../../app/utils/stateEquality.js";

test("a refresh bringing the same content keeps the previous state object", () => {
  const prev = { items: [{ id: 1 }], loading: false, error: "" };
  assert.equal(keepIfUnchanged(prev, { items: [{ id: 1 }], loading: false, error: "" }), prev);
});

test("a refresh bringing new content replaces the state", () => {
  const prev = { items: [{ id: 1 }], loading: false, error: "" };
  const next = { items: [{ id: 1 }, { id: 2 }], loading: false, error: "" };
  assert.equal(keepIfUnchanged(prev, next), next);
});
