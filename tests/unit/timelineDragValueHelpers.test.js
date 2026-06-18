import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveTimelineDragValueFromY } from '../../app/widgets/timeline/timelineDragValueHelpers.js';

test('resolveTimelineDragValueFromY maps y position to coerced timeline value', () => {
  const calls = [];
  const coerceNumericValue = (value, meta, range) => {
    calls.push({ value, meta, range });
    return Math.round(value * 100) / 100;
  };

  assert.equal(
    resolveTimelineDragValueFromY({
      y: 25,
      bounds: { top: 0, bottom: 100 },
      range: { min: -10, max: 10 },
      meta: { numericKind: 'float' },
      coerceNumericValue,
    }),
    5
  );
  assert.deepEqual(calls[0], {
    value: 5,
    meta: { numericKind: 'float' },
    range: { min: -10, max: 10 },
  });
});

test('resolveTimelineDragValueFromY keeps previous fallback ratio for missing or flat bounds', () => {
  const coerceNumericValue = (value) => value;
  const args = {
    y: 25,
    range: { min: -10, max: 10 },
    meta: { numericKind: 'float' },
    coerceNumericValue,
  };

  assert.equal(resolveTimelineDragValueFromY({ ...args, bounds: null }), -10);
  assert.equal(
    resolveTimelineDragValueFromY({ ...args, bounds: { top: 5, bottom: 5 } }),
    -10
  );
});

test('resolveTimelineDragValueFromY forwards null coercion result', () => {
  assert.equal(
    resolveTimelineDragValueFromY({
      y: 25,
      bounds: { top: 0, bottom: 100 },
      range: { min: 0, max: 1 },
      meta: { numericKind: 'float' },
      coerceNumericValue: () => null,
    }),
    null
  );
});
