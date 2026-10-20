// L'adresse enregistrée dans les sessions et le journal est celle de la
// connexion : un client ne peut pas la remplacer par un en-tête.
const test = require('node:test');
const assert = require('node:assert/strict');

const { getRequestIp } = require('../../main/server-request-ip.cjs');

test('a forged x-forwarded-for header is ignored', () => {
  const req = {
    headers: { 'x-forwarded-for': '10.0.0.99, 10.0.0.1', 'x-real-ip': '10.0.0.98' },
    socket: { remoteAddress: '192.168.1.20' },
  };
  assert.equal(getRequestIp(req), '192.168.1.20');
});

test('the connection address is used as is', () => {
  assert.equal(getRequestIp({ headers: {}, socket: { remoteAddress: '::ffff:192.168.1.21' } }), '::ffff:192.168.1.21');
  assert.equal(getRequestIp({ headers: {} }), '');
  assert.equal(getRequestIp(null), '');
});
