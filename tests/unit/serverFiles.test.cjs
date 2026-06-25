const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  readJSON,
  writeJSON,
  writeJSONIfChanged,
} = require('../../main/server-files.cjs');

test('JSON writes replace content without leaving temporary files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-server-files-'));
  const filePath = path.join(root, 'nested', 'common.json');
  try {
    writeJSON(filePath, { version: 1 });
    assert.deepEqual(readJSON(filePath), { version: 1 });
    assert.equal(writeJSONIfChanged(filePath, { version: 1 }), false);
    assert.equal(writeJSONIfChanged(filePath, { version: 2 }), true);
    assert.deepEqual(readJSON(filePath), { version: 2 });
    const leftovers = fs.readdirSync(path.dirname(filePath)).filter((name) => name.endsWith('.tmp'));
    assert.deepEqual(leftovers, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
