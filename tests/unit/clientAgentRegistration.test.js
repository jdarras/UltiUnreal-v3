import test from 'node:test';
import assert from 'node:assert/strict';
import { clientAgentRegistrations, createClientAgentRegistrar, createClientHostLoader, createClientRegistrationReporter } from '../../app/utils/clientAgentRegistration.js';

const identity = { role: 'client', localIp: '192.0.2.2', serverIp: '192.0.2.1', agentPort: 4000 };
const own = { ip: identity.localIp, syncRoot: 'D:\\Projects', unrealEditors: { '5.6': 'D:\\UE\\UnrealEditor.exe' } };
const hosts = [{ ip: identity.serverIp, name: 'Controller' }, own, { ip: '192.0.2.99' }];

test('local registration failures reach Logs once per failure episode', async () => {
  const logs = [];
  const report = createClientRegistrationReporter(async (event) => logs.push(event));
  const error = new Error('agent unavailable');
  await report(error);
  await report(error);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].level, 'warn');
  assert.equal(logs[0].action, 'client_agent_registration_failed');
  assert.match(logs[0].message, /liste des stations reste disponible/);
  report.reset();
  await report(error);
  assert.equal(logs.length, 2);
});

test('unavailable log endpoint does not reject and is retried', async () => {
  let attempts = 0;
  const report = createClientRegistrationReporter(async () => {
    if (++attempts === 1) throw new Error('offline');
  });
  await report(new Error('agent unavailable'));
  await report(new Error('agent unavailable'));
  await report(new Error('agent unavailable'));
  assert.equal(attempts, 2);
});

test('host list is available while local agent registration is still pending', async () => {
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const load = createClientHostLoader(async () => hosts, () => identity, () => pending, assert.fail);
  try {
    const result = await Promise.race([
      load(),
      new Promise((resolve) => setImmediate(() => resolve('blocked'))),
    ]);
    assert.equal(result, hosts);
  } finally {
    finish();
  }
});

test('failed local registration is reported without rejecting the host list', async () => {
  const failure = new Error('local agent unavailable');
  const errors = [];
  const load = createClientHostLoader(
    async () => hosts,
    () => identity,
    async () => { throw failure; },
    (error) => errors.push(error),
  );
  assert.equal(await load(), hosts);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(errors, [failure]);
});

test('client registration mirrors only its explicitly selected controller and own persisted configuration', () => {
  const registrations = clientAgentRegistrations(identity, hosts);
  assert.deepEqual(registrations.map((row) => row.ip), [identity.serverIp, identity.localIp]);
  assert.deepEqual(registrations[1].body, own);
  assert.deepEqual(clientAgentRegistrations(identity, []), []);
  assert.deepEqual(clientAgentRegistrations({ ...identity, mode: 'postprod' }, hosts), []);
  assert.deepEqual(clientAgentRegistrations({ ...identity, role: 'server' }, hosts), []);
});

test('settings are mirrored on loopback once per change, without overwriting newer settings concurrently', async () => {
  const sent = [];
  const register = createClientAgentRegistrar(async (method, url, body) => {
    sent.push({ method, url, body });
    return { ok: true, data: { ok: true } };
  });
  await Promise.all([register(identity, hosts), register(identity, hosts)]);
  assert.equal(sent.length, 2);
  assert.ok(sent.every((request) => new URL(request.url).hostname === '127.0.0.1'));
  await register(identity, [hosts[0], { ...own, syncRoot: 'E:\\Projects' }]);
  assert.equal(sent.length, 4);
  assert.equal(sent.at(-1).body.syncRoot, 'E:\\Projects');
});

test('a local persistence failure is reported and retried instead of cached as success', async () => {
  let fail = true;
  let requests = 0;
  const register = createClientAgentRegistrar(async () => {
    requests++;
    return fail ? { ok: false, error: 'unavailable' } : { ok: true, text: '{"ok":true}' };
  });
  await assert.rejects(register(identity, hosts), /unavailable/);
  fail = false;
  await register(identity, hosts);
  assert.equal(requests, 3);
});
