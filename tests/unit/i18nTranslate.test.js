import test from "node:test";
import assert from "node:assert/strict";

import { translateWith } from "../../app/i18n/translate.js";

const dict = { "a.count": "{count} rendus", "a.plain": "Bonjour" };

test("dictionary entries win; missing keys fall back to the fallback, then to the key", () => {
  assert.equal(translateWith(dict, "a.plain"), "Bonjour");
  assert.equal(translateWith(dict, "a.plain", "Repli"), "Bonjour");
  assert.equal(translateWith(dict, "a.missing", "Repli"), "Repli");
  assert.equal(translateWith(dict, "a.missing"), "a.missing");
});

test("parameters are replaced with the two-argument form", () => {
  assert.equal(translateWith(dict, "a.count", { count: 3 }), "3 rendus");
});

test("parameters are replaced with the fallback + parameters form", () => {
  assert.equal(translateWith(dict, "a.count", "{count} repli", { count: 4 }), "4 rendus");
  assert.equal(translateWith({}, "a.count", "{count} rendus en erreur", { count: 2 }), "2 rendus en erreur");
});

test("parameter values are inserted literally (no pattern interpretation)", () => {
  assert.equal(translateWith({ k: "{path}" }, "k", { path: "C:\\a$1\\b" }), "C:\\a$1\\b");
});
