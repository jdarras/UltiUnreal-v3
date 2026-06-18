import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { computeDiffs } = require('../../main/server-sync.cjs');

test('computeDiffs ignores tiny mtime precision differences', () => {
  const src = {
    'Config/DefaultGame.ini': { size: 42, mtimeMs: 1000.9 },
  };
  const dst = {
    'Config/DefaultGame.ini': { size: 42, mtimeMs: 1000 },
  };

  assert.deepEqual(computeDiffs(src, dst), {
    added: [],
    modified: [],
    removed: [],
  });
});

test('computeDiffs reports meaningful mtime differences', () => {
  const src = {
    'Config/DefaultGame.ini': { size: 42, mtimeMs: 1000 },
  };
  const dst = {
    'Config/DefaultGame.ini': { size: 42, mtimeMs: 1005 },
  };

  assert.deepEqual(computeDiffs(src, dst), {
    added: [],
    modified: ['Config/DefaultGame.ini'],
    removed: [],
  });
});
