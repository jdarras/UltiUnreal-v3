const test = require('node:test');
const assert = require('node:assert/strict');

const { evaluateBrowserOrigin, corsOriginHeaders } = require('../../main/server-request-security.cjs');

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

test('corsOriginHeaders echoes the validated origin instead of a misleading "*"', () => {
  const headers = corsOriginHeaders('http://localhost:5173');
  assert.equal(headers['Access-Control-Allow-Origin'], 'http://localhost:5173');
  assert.equal(headers.Vary, 'Origin');
});

test('corsOriginHeaders emits no CORS origin for non-browser clients (no Origin)', () => {
  assert.deepEqual(corsOriginHeaders(''), {});
  assert.deepEqual(corsOriginHeaders(null), {});
  assert.deepEqual(corsOriginHeaders(undefined), {});
});

test('corsOriginHeaders never emits a wildcard origin', () => {
  for (const v of ['http://127.0.0.1:5173', 'https://[::1]:5173', '']) {
    assert.notEqual(corsOriginHeaders(v)['Access-Control-Allow-Origin'], '*');
  }
});
