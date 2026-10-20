const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { handleLaunch } = require('../../main/server-launch.cjs');
const { handleSync } = require('../../main/server-sync.cjs');
const { isConfiguredPeer } = require('../../main/server-peer-security.cjs');
const { isApprovedUnrealExecutable } = require('../../main/server-launch-policy.cjs');

test('client settings persisted through the real host route enable its controller, Unreal path and sync root', async (t) => {
  const { createClientAgentRegistrar } = await import('../../app/utils/clientAgentRegistration.js');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-client-provision-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const hostsFile = path.join(root, 'hosts.json');
  const commonFile = path.join(root, 'common.json');
  const executable = path.join(root, 'UnrealEditor.exe');
  const syncRoot = path.join(root, 'projects');
  fs.writeFileSync(executable, 'fixture, never launched');
  fs.writeFileSync(hostsFile, '{}');
  fs.writeFileSync(commonFile, '{"localIp":"192.0.2.2"}');
  const identity = { role: 'client', localIp: '192.0.2.2', serverIp: '192.0.2.1' };
  const register = createClientAgentRegistrar(async (method, rawUrl, body) => {
    let result;
    await handleLaunch({ method }, {}, new URL(rawUrl), {
      HOSTS_FILE: hostsFile, COMMON_FILE: commonFile,
      parseBody: async () => body,
      sendJSON: (_, status, data) => { result = { ok: status === 200, data }; },
    });
    return result;
  });
  await register(identity, [{ ip: identity.localIp, unrealEditors: { '5.6': executable }, syncRoot }]);
  const hosts = JSON.parse(fs.readFileSync(hostsFile, 'utf8'));
  assert.equal(isConfiguredPeer(identity.serverIp, hosts), true);
  assert.equal(isApprovedUnrealExecutable(executable, hosts, { localIp: identity.localIp }), true);
  const req = Readable.from(['asset']);
  req.method = 'POST';
  let response;
  await handleSync(req, {}, new URL(`http://localhost/agent/sync/file?${new URLSearchParams({
    destDir: syncRoot, rel: 'Content/asset.uasset',
  })}`), {
    HOSTS_FILE: hostsFile, COMMON_FILE: commonFile, stationIp: identity.localIp,
    sendJSON: (_, status, body) => { response = { status, ...body }; }, logLine: () => {},
  });
  assert.equal(response.ok, true);
  assert.equal(fs.readFileSync(path.join(syncRoot, 'Content/asset.uasset'), 'utf8'), 'asset');
});
