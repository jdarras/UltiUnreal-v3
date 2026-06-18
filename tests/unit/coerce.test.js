import test from 'node:test';
import assert from 'node:assert/strict';

import {
  toTrimmedString,
  toPositiveInt,
  firstNonEmptyString,
  firstPositiveInt,
} from '../../app/utils/coerce.js';

test('toTrimmedString coerces and trims any value', () => {
  assert.equal(toTrimmedString('  hello  '), 'hello');
  assert.equal(toTrimmedString(null), '');
  assert.equal(toTrimmedString(undefined), '');
  assert.equal(toTrimmedString(0), '');
  assert.equal(toTrimmedString(42), '42');
});

test('toPositiveInt parses numbers, numeric strings and #-prefixed strings', () => {
  assert.equal(toPositiveInt(5), 5);
  assert.equal(toPositiveInt('7'), 7);
  assert.equal(toPositiveInt('#123'), 123);
  assert.equal(toPositiveInt(3.9), 3);
  assert.equal(toPositiveInt(0), 0);
  assert.equal(toPositiveInt(-4), 0);
  assert.equal(toPositiveInt('abc'), 0);
  assert.equal(toPositiveInt(''), 0);
});

test('firstNonEmptyString returns the first non-empty trimmed string', () => {
  assert.equal(firstNonEmptyString(['', '  ', 'x', 'y']), 'x');
  assert.equal(firstNonEmptyString([null, undefined, 0, 'ok']), 'ok');
  assert.equal(firstNonEmptyString([]), '');
  assert.equal(firstNonEmptyString(null), '');
});

test('firstPositiveInt returns the first strictly positive int', () => {
  assert.equal(firstPositiveInt([0, -1, '', '4', 9]), 4);
  assert.equal(firstPositiveInt(['#10', 3]), 10);
  assert.equal(firstPositiveInt([0, -2]), 0);
  assert.equal(firstPositiveInt(null), 0);
});
