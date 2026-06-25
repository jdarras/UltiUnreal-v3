import test from 'node:test';
import assert from 'node:assert/strict';

import { filterSyncTargetHosts } from '../../app/screens/hooks/useSyncServerViewModel.js';
import { buildSyncServerHostCardModel } from '../../app/screens/syncServerHostCardModel.js';

test('render synchronization keeps the local station as a valid target', () => {
  const hosts = [
    { ip: '192.168.1.10' },
    { ip: '192.168.1.20' },
  ];
  assert.deepEqual(
    filterSyncTargetHosts(hosts, '192.168.1.10', true).map((host) => host.ip),
    ['192.168.1.10', '192.168.1.20']
  );
});

test('render copy stays disabled until a verified difference exists', () => {
  const base = {
    host: { ip: '192.168.1.20', syncRoot: 'D:\\Sync' },
    index: 0,
    isRenderMode: true,
    displayProjectName: '',
    sourceProjectName: '',
    t: (key) => key,
    syncDetails: {},
    syncDiffs: {},
    syncCopyProjects: {},
    syncSelection: {},
    diffFoldState: {},
  };
  assert.equal(buildSyncServerHostCardModel({ ...base, syncStatus: {} }).canCopy, false);
  assert.equal(
    buildSyncServerHostCardModel({
      ...base,
      syncStatus: { '192.168.1.20': 'desync' },
    }).canCopy,
    true
  );
  assert.equal(
    buildSyncServerHostCardModel({
      ...base,
      syncStatus: { '192.168.1.20': 'no_source' },
    }).canCopy,
    false
  );
});

test('legacy Live synchronization still excludes its server station', () => {
  const hosts = [
    { ip: '192.168.1.10' },
    { ip: '192.168.1.20' },
  ];
  assert.deepEqual(
    filterSyncTargetHosts(hosts, '192.168.1.10', false).map((host) => host.ip),
    ['192.168.1.20']
  );
});
