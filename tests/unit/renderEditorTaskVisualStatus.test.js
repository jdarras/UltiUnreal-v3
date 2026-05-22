import test from "node:test";
import assert from "node:assert/strict";

import { normalizeTaskVisualStatusKey } from "../../app/screens/postproduction/renderEditor/helpers.js";

test("normalizeTaskVisualStatusKey maps legacy review aliases to rejected", () => {
  assert.equal(normalizeTaskVisualStatusKey("rejected"), "rejected");
  assert.equal(normalizeTaskVisualStatusKey("to_modify"), "rejected");
  assert.equal(normalizeTaskVisualStatusKey("canceled"), "rejected");
  assert.equal(normalizeTaskVisualStatusKey("cancelled"), "rejected");
});

test("normalizeTaskVisualStatusKey keeps known visual statuses", () => {
  assert.equal(normalizeTaskVisualStatusKey("Validee"), "validated");
  assert.equal(normalizeTaskVisualStatusKey("A valider"), "to_validate");
  assert.equal(normalizeTaskVisualStatusKey("En cours"), "running");
});

test("normalizeTaskVisualStatusKey falls back to planned for unknown values", () => {
  assert.equal(normalizeTaskVisualStatusKey("something_unexpected"), "planned");
});
