const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeNetworkAddress,
  isAllowedPeerAddress,
  collectPeerAddressCandidates,
} = require('../../main/server-peer-security.cjs');

test('normalizeNetworkAddress handles mapped IPv4 and IPv6 zones', () => {
  assert.equal(normalizeNetworkAddress('::ffff:192.168.1.40'), '192.168.1.40');
  assert.equal(normalizeNetworkAddress('[fe80::1%17]'), 'fe80::1');
});

test('isAllowedPeerAddress allows loopback and declared stations only', () => {
  assert.equal(isAllowedPeerAddress('127.0.0.1', []), true);
  assert.equal(isAllowedPeerAddress('::ffff:192.168.1.40', ['192.168.1.40']), true);
  assert.equal(isAllowedPeerAddress('192.168.1.99', ['192.168.1.40']), false);
});

test('collectPeerAddressCandidates reads host maps and detected presence', () => {
  const candidates = collectPeerAddressCandidates(
    { '192.168.1.40': { name: 'A' } },
    { stationB: { stationIp: '192.168.1.41' } },
  );
  assert.deepEqual(new Set(candidates), new Set(['192.168.1.40', '192.168.1.41']));
});
