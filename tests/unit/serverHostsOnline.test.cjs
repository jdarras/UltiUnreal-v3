const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  handleHostsOnlineRoutes,
  runLanDiscoveryOnce,
  buildLanDiscoveryCandidates,
  buildLanBroadcastAddresses,
  getPresenceVolatile,
  setPresenceVolatile,
  listDetectedStations,
} = require('../../main/server-hosts-online.cjs');

test('runLanDiscoveryOnce records reachable UltiUnreal agents', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-hosts-online-'));
  const commonFile = path.join(tmpDir, 'common_server.json');
  fs.writeFileSync(commonFile, JSON.stringify({
    agentPort: 4242,
    stationDiscoveryConcurrency: 2,
    stationDiscoveryTimeoutMs: 100,
  }), 'utf8');

  const originalFetch = global.fetch;
  setPresenceVolatile({});
  global.fetch = async (url) => {
    const requestUrl = String(url || '');
    if (requestUrl.includes('203.0.113.12')) {
      return {
        ok: true,
        json: async () => ({
          ok: true,
          stationName: 'Render B',
          port: 4242,
          renderAvailability: 'busy',
        }),
      };
    }
    return { ok: false, json: async () => ({ ok: false }) };
  };

  try {
    const result = await runLanDiscoveryOnce({
      COMMON_FILE: commonFile,
      discoveryCandidates: ['203.0.113.11', '203.0.113.12'],
    });

    assert.equal(result.ok, true);
    assert.equal(result.detected, 1);
    const presence = getPresenceVolatile();
    assert.equal(presence['203.0.113.12'].name, 'Render B');
    assert.equal(presence['203.0.113.12'].agentPort, 4242);
    assert.equal(presence['203.0.113.12'].renderAvailability, 'busy');
    const detectedStations = listDetectedStations();
    assert.equal(detectedStations.length, 1);
    assert.equal(detectedStations[0].ip, '203.0.113.12');
    assert.equal(detectedStations[0].renderAvailability, 'busy');
    assert.equal(presence['203.0.113.11'], undefined);
  } finally {
    global.fetch = originalFetch;
    setPresenceVolatile({});
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('handleHostsOnlineRoutes does not expose local presence as detected', async () => {
  setPresenceVolatile({
    '127.0.0.1': {
      ip: '127.0.0.1',
      name: 'local',
      ts: new Date().toISOString(),
    },
    '203.0.113.42': {
      ip: '203.0.113.42',
      name: 'remote',
      agentPort: 4000,
      ts: new Date().toISOString(),
    },
  });

  let payload = null;
  await handleHostsOnlineRoutes(
    { method: 'GET' },
    {},
    { pathname: '/agent/online' },
    {
      sendJSON: (_res, status, body) => {
        payload = { status, body };
        return payload;
      },
      parseBody: async () => ({}),
    }
  );

  assert.equal(payload.status, 200);
  assert.equal(payload.body.detected['127.0.0.1'], undefined);
  assert.equal(payload.body.detected['203.0.113.42'].name, 'remote');
  assert.equal(payload.body.detected['203.0.113.42'].agentPort, 4000);
  setPresenceVolatile({});
});

test('handleHostsOnlineRoutes ignores posted local presence', async () => {
  setPresenceVolatile({});

  let payload = null;
  await handleHostsOnlineRoutes(
    { method: 'POST' },
    {},
    { pathname: '/agent/presence' },
    {
      sendJSON: (_res, status, body) => {
        payload = { status, body };
        return payload;
      },
      parseBody: async () => ({ ip: '127.0.0.1', name: 'local' }),
    }
  );

  assert.equal(payload.status, 200);
  assert.equal(payload.body.ignored, true);
  assert.equal(getPresenceVolatile()['127.0.0.1'], undefined);
  setPresenceVolatile({});
});

test('LAN discovery ignores VPN and point-to-point interfaces by default', () => {
  const originalNetworkInterfaces = os.networkInterfaces;
  os.networkInterfaces = () => ({
    McAfee_VPN: [
      {
        address: '10.0.7.89',
        netmask: '255.255.255.255',
        cidr: '10.0.7.89/32',
        family: 'IPv4',
        internal: false,
      },
    ],
    Ethernet: [
      {
        address: '192.168.1.40',
        netmask: '255.255.255.0',
        cidr: '192.168.1.40/24',
        family: 'IPv4',
        internal: false,
      },
    ],
  });

  try {
    const candidates = buildLanDiscoveryCandidates();
    assert.equal(candidates.includes('192.168.1.10'), true);
    assert.equal(candidates.includes('10.0.7.83'), false);
    const broadcasts = buildLanBroadcastAddresses();
    assert.equal(broadcasts.includes('192.168.1.255'), true);
    assert.equal(broadcasts.includes('10.0.7.89'), false);
  } finally {
    os.networkInterfaces = originalNetworkInterfaces;
  }
});

test('listDetectedStations dedupes same station name and prefers LAN address', () => {
  const originalNetworkInterfaces = os.networkInterfaces;
  os.networkInterfaces = () => ({
    Ethernet: [
      {
        address: '192.168.1.40',
        netmask: '255.255.255.0',
        cidr: '192.168.1.40/24',
        family: 'IPv4',
        internal: false,
      },
    ],
  });

  try {
    setPresenceVolatile({
      '10.0.7.83': {
        ip: '10.0.7.83',
        name: 'JDarras',
        agentPort: 4000,
        source: 'lan',
        ts: new Date().toISOString(),
      },
      '192.168.1.10': {
        ip: '192.168.1.10',
        name: 'JDarras',
        agentPort: 4000,
        source: 'udp',
        ts: new Date().toISOString(),
      },
    });

    const detectedStations = listDetectedStations();
    assert.equal(detectedStations.length, 1);
    assert.equal(detectedStations[0].ip, '192.168.1.10');
    assert.equal(detectedStations[0].name, 'JDarras');
  } finally {
    os.networkInterfaces = originalNetworkInterfaces;
    setPresenceVolatile({});
  }
});
