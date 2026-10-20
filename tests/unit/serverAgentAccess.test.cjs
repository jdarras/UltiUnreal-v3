const test = require('node:test');
const assert = require('node:assert/strict');
const { isAgentRequestAllowed, isConfiguredPeer } = require('../../main/server-peer-security.cjs');
const presence = require('../../main/server-hosts-online.cjs');

const remote = '192.0.2.123';
function req(method = 'POST', ip = remote) {
  return { method, socket: { remoteAddress: ip }, headers: {} };
}

test('sensitive agent operations require a manually registered station', () => {
  const routes = ['/agent/launch', '/agent/stop', '/agent/common', '/agent/host/192.0.2.1',
    '/agent/sync/file', '/agent/sync/copy', '/agent/projects/import', '/agent/logs/purge',
    '/agent/postprod/remote/users-sync/events', '/agent/postprod/remote/jobs/start'];
  for (const route of routes) {
    assert.equal(isAgentRequestAllowed(req(), route, {}), false, route);
    assert.equal(isAgentRequestAllowed(req(), route, [{ ip: remote }]), true, route);
    assert.equal(isAgentRequestAllowed(req('POST', '127.0.0.1'), route, {}), true, route);
  }
});

test('discovery remains available but cannot enroll a trusted station', async (t) => {
  presence.setPresenceVolatile({});
  t.after(() => presence.setPresenceVolatile({}));
  assert.equal(isAgentRequestAllowed(req('GET'), '/agent/ping', {}), true);
  assert.equal(isAgentRequestAllowed(req(), '/agent/presence', {}), true);
  let status;
  await presence.handleHostsOnlineRoutes(req(), {}, new URL('http://localhost/agent/presence'), {
    parseBody: async () => ({ ip: remote, name: 'Discovered only' }),
    sendJSON: (_, code) => { status = code; },
  });
  assert.equal(status, 200);
  assert.ok(presence.getPresenceVolatile()[remote]);
  assert.equal(isAgentRequestAllowed(req(), '/agent/launch', {}), false);
  assert.equal(isAgentRequestAllowed(req('GET'), '/agent/postprod/remote/users-sync/events', {}), false);
  const hosts = { [remote]: { name: 'Manually added' } };
  assert.equal(isConfiguredPeer(remote, hosts), true);
  assert.equal(isConfiguredPeer(remote, {}), false, 'removing the station revokes access immediately');
});

test('Postprod user routes reach their session guards; headers do not forge peer access', () => {
  assert.equal(isAgentRequestAllowed(req(), '/agent/postprod/auth/login', {}), true);
  assert.equal(isAgentRequestAllowed(req('GET'), '/agent/postprod/me', {}), true);
  const forged = req();
  forged.headers = { 'x-forwarded-for': '127.0.0.1', 'x-real-ip': '127.0.0.1' };
  assert.equal(isAgentRequestAllowed(forged, '/agent/common', {}), false);
});
