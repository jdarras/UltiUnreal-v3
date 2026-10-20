const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { Readable } = require('node:stream');
const { handleSync } = require('../../main/server-sync.cjs');
const { collectFilesRecursive } = require('../../main/server-files.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-sync-safety-'));
  const allowed = path.join(root, 'allowed');
  const outside = path.join(root, 'outside');
  fs.mkdirSync(allowed);
  fs.mkdirSync(outside);
  const hosts = path.join(root, 'hosts.json');
  fs.writeFileSync(hosts, JSON.stringify([{ ip: '192.0.2.1', syncRoot: allowed }]));
  t.after(() => {
    assert.ok(root.startsWith(path.join(os.tmpdir(), 'uu-sync-safety-')));
    fs.rmSync(root, { recursive: true, force: true });
  });
  async function request(destDir, rel, { op = '', content = 'new content', method = 'POST' } = {}) {
    const req = Readable.from([content]);
    req.method = method;
    const route = method === 'GET' ? 'inventory' : 'file';
    let response;
    await handleSync(req, {}, new URL(`http://localhost/agent/sync/${route}?${new URLSearchParams({ destDir, rel, op })}`), {
      HOSTS_FILE: hosts, COMMON_FILE: path.join(root, 'common.json'), stationIp: '192.0.2.1',
      loadProjects: () => ({}), logLine: () => {},
      sendJSON: (_, status, body) => { response = { status, ...body }; },
    });
    return response;
  }
  return { root, allowed, outside, hosts, request };
}

test('sync creates new nested folders and replaces an existing file', async (t) => {
  const f = fixture(t);
  assert.equal((await f.request(f.allowed, 'Content/New/asset.uasset')).ok, true);
  assert.equal((await f.request(f.allowed, 'Content/New/asset.uasset', { content: 'replacement' })).ok, true);
  assert.equal(fs.readFileSync(path.join(f.allowed, 'Content/New/asset.uasset'), 'utf8'), 'replacement');
});

test('sync without a configured root refuses writes, deletes and inventory', async (t) => {
  const f = fixture(t);
  fs.writeFileSync(f.hosts, '{}');
  fs.writeFileSync(path.join(f.outside, 'keep.txt'), 'keep');
  assert.equal((await f.request(f.outside, 'new.txt')).status, 403);
  assert.equal((await f.request(f.outside, 'keep.txt', { op: 'delete' })).status, 403);
  assert.equal((await f.request(f.outside, '', { method: 'GET' })).status, 403);
  assert.equal(fs.readFileSync(path.join(f.outside, 'keep.txt'), 'utf8'), 'keep');
});

test('sync rejects junctions for writes, deletes, inventory and staging', async (t) => {
  const f = fixture(t);
  fs.symlinkSync(f.outside, path.join(f.allowed, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  fs.writeFileSync(path.join(f.outside, 'keep.txt'), 'keep');
  assert.equal((await f.request(f.allowed, 'linked/new.txt')).status, 403);
  assert.equal((await f.request(f.allowed, 'linked/keep.txt', { op: 'delete' })).status, 403);
  assert.equal((await f.request(path.join(f.allowed, 'linked'), '', { method: 'GET' })).status, 403);
  fs.symlinkSync(f.outside, path.join(f.allowed, '.ultiunreal-tmp'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await f.request(f.allowed, 'new.txt')).ok, false);
  assert.deepEqual(fs.readdirSync(f.outside), ['keep.txt']);
});

test('an unreadable source subtree aborts the inventory instead of returning missing files', async (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.allowed, 'Content'));
  const original = fs.promises.readdir;
  t.mock.method(fs.promises, 'readdir', async (dir, options) => {
    if (dir === path.join(f.allowed, 'Content')) throw Object.assign(new Error('denied'), { code: 'EACCES' });
    return original.call(fs.promises, dir, options);
  });
  await assert.rejects(collectFilesRecursive(f.allowed, [], { strict: true }), { code: 'incomplete_inventory' });
  assert.equal((await f.request(f.allowed, '', { method: 'GET' })).ok, false);
});

test('an unreadable inventory root is not reported as absent', async (t) => {
  const f = fixture(t);
  const original = fs.promises.stat;
  t.mock.method(fs.promises, 'stat', async (target, ...args) => {
    if (target === f.allowed) throw Object.assign(new Error('denied'), { code: 'EACCES' });
    return original.call(fs.promises, target, ...args);
  });
  assert.equal((await f.request(f.allowed, '', { method: 'GET' })).ok, false);
});

test('a failed transfer preserves the existing destination and removes staging files', async (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.allowed, 'keep.txt'), 'old content');
  const original = fs.promises.rename;
  t.mock.method(fs.promises, 'rename', async (source, destination) => {
    if (destination === path.join(f.allowed, 'keep.txt')) throw Object.assign(new Error('locked'), { code: 'EPERM' });
    return original.call(fs.promises, source, destination);
  });
  assert.equal((await f.request(f.allowed, 'keep.txt')).ok, false);
  assert.equal(fs.readFileSync(path.join(f.allowed, 'keep.txt'), 'utf8'), 'old content');
  assert.equal(fs.existsSync(path.join(f.allowed, '.ultiunreal-tmp')), false);
});
