import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeProjectLookupKey,
  normalizeProjectNumericKey,
  readProjectLabel,
  resolveLinkedRenderFormEntry,
  extractFormIdFromTemplateLike,
  resolveRenderPayload,
} from "../../app/screens/postproduction/renders/renderLookupHelpers.js";

test("project keys are normalized for lookups", () => {
  assert.equal(normalizeProjectLookupKey("  ProjetA "), "projeta");
  assert.equal(normalizeProjectNumericKey(" 0012 "), "12");
  assert.equal(normalizeProjectNumericKey("12a"), "");
  assert.equal(normalizeProjectNumericKey(""), "");
});

test("project labels are found by key, then by numeric key", () => {
  const labels = new Map([["projeta", "Projet A"], ["12", "Projet Douze"]]);

  assert.equal(readProjectLabel(labels, "ProjetA"), "Projet A");
  assert.equal(readProjectLabel(labels, "012"), "Projet Douze");
  assert.equal(readProjectLabel(labels, "inconnu"), "");
  assert.equal(readProjectLabel(null, "ProjetA"), "");
});

test("the linked render form is found by positive id", () => {
  const forms = [{ id: 3, name: "A" }, { id: 7, name: "B" }];

  assert.equal(resolveLinkedRenderFormEntry("7", forms)?.name, "B");
  assert.equal(resolveLinkedRenderFormEntry(0, forms), null);
  assert.equal(resolveLinkedRenderFormEntry(9, forms), null);
});

test("form ids are extracted from template-like names", () => {
  assert.equal(extractFormIdFromTemplateLike("Form #12"), 12);
  assert.equal(extractFormIdFromTemplateLike("form-5"), 5);
  assert.equal(extractFormIdFromTemplateLike("Formulaire 5"), 0);
  assert.equal(extractFormIdFromTemplateLike(""), 0);
});

test("the render payload is an object or empty", () => {
  assert.deepEqual(resolveRenderPayload({ payload: { a: 1 } }), { a: 1 });
  assert.deepEqual(resolveRenderPayload({ payload: [1] }), {});
  assert.deepEqual(resolveRenderPayload(null), {});
});
