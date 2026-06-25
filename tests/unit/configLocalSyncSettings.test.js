import test from 'node:test';
import assert from 'node:assert/strict';

import { findLocalHost } from '../../app/screens/configLocalSyncHelpers.js';

test('findLocalHost returns the host matching the local IP', () => {
  const hosts = [
    { ip: '192.168.1.10', name: 'Server' },
    { ip: '192.168.1.42', name: 'Local' },
  ];

  assert.deepEqual(findLocalHost(hosts, '192.168.1.42'), hosts[1]);
});

test('findLocalHost accepts address aliases and ignores missing local IP', () => {
  const hosts = [
    { address: '10.0.0.12', name: 'AliasHost' },
  ];

  assert.deepEqual(findLocalHost(hosts, '10.0.0.12'), hosts[0]);
  assert.equal(findLocalHost(hosts, ''), null);
});

test('findLocalHost falls back to station name when the saved IP changed', () => {
  const hosts = [
    { ip: '192.168.1.40', name: 'Station-B', syncRoot: 'D:\\Sync' },
  ];
  assert.equal(findLocalHost(hosts, '10.0.7.89', 'station-b'), hosts[0]);
});
