const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateExternalTarget,
  validateHttpTarget,
  isAllowedRendererNavigation,
} = require('../../main/ipc-security.cjs');

test('validateExternalTarget allows only supported external protocols', () => {
  assert.equal(validateExternalTarget('https://www.fab.com/listings/example').ok, true);
  assert.equal(validateExternalTarget('mailto:user@example.com').ok, true);
  assert.equal(validateExternalTarget('com.epicgames.launcher://ue/library').ok, true);
  assert.equal(validateExternalTarget('file:///C:/Windows/System32/calc.exe').ok, false);
  assert.equal(validateExternalTarget('javascript:alert(1)').ok, false);
  assert.equal(validateExternalTarget('C:\\Tools\\Launcher.exe').ok, false);
});

test('validateHttpTarget rejects non-http protocols and embedded credentials', () => {
  assert.equal(validateHttpTarget('http://192.168.1.10:4000/agent/ping').ok, true);
  assert.equal(validateHttpTarget('https://example.com/api').ok, true);
  assert.equal(validateHttpTarget('ftp://example.com/file').ok, false);
  assert.equal(validateHttpTarget('http://user:secret@example.com/api').ok, false);
});

test('isAllowedRendererNavigation accepts only configured UI locations', () => {
  assert.equal(isAllowedRendererNavigation('http://localhost:5173/projects', ['http://localhost:5173']), true);
  assert.equal(isAllowedRendererNavigation('https://example.com', ['http://localhost:5173']), false);
  assert.equal(
    isAllowedRendererNavigation('file:///D:/UltiUnreal/dist/index.html#projects', ['file:///D:/UltiUnreal/dist/index.html']),
    true,
  );
  assert.equal(
    isAllowedRendererNavigation('file:///D:/UltiUnreal/dist/other.html', ['file:///D:/UltiUnreal/dist/index.html']),
    false,
  );
});
