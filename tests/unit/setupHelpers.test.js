import test from 'node:test';
import assert from 'node:assert/strict';

import { hostArrayToEditList } from '../../app/screens/setupHelpers.js';

test('hostArrayToEditList preserves explicit synchronization settings', () => {
  const [host] = hostArrayToEditList([
    {
      ip: '192.168.1.40',
      name: 'Render 01',
      syncRoot: 'D:\\RenderSync',
      syncEnabled: false,
      renderAvailability: 'capable',
    },
  ]);

  assert.equal(host.syncRoot, 'D:\\RenderSync');
  assert.equal(host.syncEnabled, false);
});

test('hostArrayToEditList enables synchronization for legacy hosts with only a sync root', () => {
  const [host] = hostArrayToEditList([
    {
      ip: '192.168.1.41',
      name: 'Render 02',
      sync_root: 'E:\\Sync',
      renderAvailability: 'capable',
    },
  ]);

  assert.equal(host.syncRoot, 'E:\\Sync');
  assert.equal(host.syncEnabled, true);
});
