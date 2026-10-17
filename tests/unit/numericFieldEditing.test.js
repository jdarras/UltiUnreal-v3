// Comportement figé de la saisie numérique des widgets Transform et Vecteur
// (valeurs relevées sur le code existant avant mutualisation).
import test from "node:test";
import assert from "node:assert/strict";

import { decimalsCount, isIntermediateNumeric, stepFromCaret } from "../../app/widgets/numericFieldEditing.js";

test("the step follows the digit just before the caret", () => {
  const cases = [
    ["12.345", 6, 0.001],
    ["12.345", 1, 10],
    ["12.345", 2, 1],
    ["12.345", 3, 1],
    ["12.345", 4, 0.1],
    ["-7.5", 1, 1],
    ["-7.5", 2, 1],
    ["-7.5", 4, 0.1],
    ["100", 0, 100],
    ["100", 1, 100],
    ["100", 3, 1],
    ["", 0, 1],
    [".5", 0, 0.1],
    ["3,25", 4, 0.01],
  ];
  for (const [value, caret, expected] of cases) {
    assert.equal(stepFromCaret(value, caret), expected, `${value} @${caret}`);
  }
});

test("decimals are counted after the dot", () => {
  assert.equal(decimalsCount("1.250"), 3);
  assert.equal(decimalsCount("12"), 0);
});

test("partial inputs are recognised while typing", () => {
  for (const value of ["", "-", ".", "-.", ","]) assert.equal(isIntermediateNumeric(value), true, value);
  assert.equal(isIntermediateNumeric("1"), false);
});
