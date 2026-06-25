const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateBrowserOrigin } = require('../../main/server-request-security.cjs');

test('evaluateBrowserOrigin preserves agent traffic without browser origin', () => {
  assert.deepEqual(evaluateBrowserOrigin(''), { allowed: true, origin: '' });
});

test('evaluateBrowserOrigin allows local development origins', () => {
  assert.equal(evaluateBrowserOrigin('http://localhost:5173').allowed, true);
  assert.equal(evaluateBrowserOrigin('http://127.0.0.1:5173').allowed, true);
  assert.equal(evaluateBrowserOrigin('https://[::1]:5173').allowed, true);
});

test('evaluateBrowserOrigin rejects third-party and opaque browser origins', () => {
  assert.equal(evaluateBrowserOrigin('https://malicious.example').allowed, false);
  assert.equal(evaluateBrowserOrigin('null').allowed, false);
  assert.equal(evaluateBrowserOrigin('file://').allowed, false);
});
