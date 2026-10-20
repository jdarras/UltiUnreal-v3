const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { isApprovedUnrealExecutable } = require('../../main/server-launch-policy.cjs');
const { handleLaunch } = require('../../main/server-launch.cjs');

test('only Unreal executables configured for this station are approved', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-launch-policy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const executable = path.join(root, 'UnrealEditor.exe');
  const other = path.join(root, 'UE4Editor.exe');
  fs.writeFileSync(executable, 'fixture, never executed');
  fs.writeFileSync(other, 'fixture, never executed');
  const hosts = [{ ip: '127.0.0.1', unrealEditors: { '5.6': executable } }];
  assert.equal(isApprovedUnrealExecutable(executable, hosts), true);
  assert.equal(isApprovedUnrealExecutable(other, hosts), false);
  assert.equal(isApprovedUnrealExecutable(executable, [{ ip: '192.0.2.99', unrealEditors: { '5.6': executable } }]), false);
  assert.equal(isApprovedUnrealExecutable(process.execPath, [{ ip: '127.0.0.1', unreal_editor: process.execPath }]), false);
  assert.equal(isApprovedUnrealExecutable('UnrealEditor.exe', hosts), false);
});

test('the launch route rejects an arbitrary existing executable before spawning', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-launch-route-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const hosts = path.join(root, 'hosts.json');
  const common = path.join(root, 'common.json');
  fs.writeFileSync(hosts, '{}');
  fs.writeFileSync(common, '{}');
  let response;
  await handleLaunch({ method: 'POST' }, {}, new URL('http://localhost/agent/launch'), {
    HOSTS_FILE: hosts, COMMON_FILE: common,
    parseBody: async () => ({ exe: process.execPath, editorOnly: true }),
    sendJSON: (_, status, body) => { response = { status, ...body }; },
    setCurrentProcess: () => assert.fail('must not spawn'),
  });
  assert.equal(response.status, 403);
  assert.equal(response.error, 'unapproved_unreal_executable');
});
