const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  setPresenceVolatile,
} = require('../../main/server-hosts-online.cjs');
const {
  handlePostprodRenderDispatchRoutes,
} = require('../../main/server-postprod-routes-render-dispatch.cjs');
const {
  selectBestStation,
} = require('../../main/server-postprod-remote-dispatcher.cjs');

test('render-workers exposes LAN detected stations as remote workers', async () => {
  setPresenceVolatile({
    '203.0.113.50': {
      ip: '203.0.113.50',
      name: 'Render Peer',
      agentPort: 4000,
      renderAvailability: 'capable',
      source: 'udp',
      ts: new Date().toISOString(),
    },
  });

  let payload = null;
  const handled = await handlePostprodRenderDispatchRoutes({
    req: { method: 'GET' },
    res: {},
    pathname: '/agent/postprod/render-workers',
    sendJSON: (_res, status, body) => {
      payload = { status, body };
      return payload;
    },
    requireSession: () => ({ session: { user_id: 1, role: 'admin' } }),
    nowIso: () => '2026-06-18T10:00:00.000Z',
    addSeconds: () => '2026-06-18T09:59:30.000Z',
    RENDER_WORKER_ONLINE_TTL_SECONDS: 30,
    sweepStaleWorkersAndRequeue: () => {},
    stmts: {
      listRenderWorkers: { all: () => [] },
    },
    buildRenderWorkerPayload: (row) => row,
  });

  assert.equal(handled, true);
  assert.equal(payload.status, 200);
  assert.equal(payload.body.workers.length, 1);
  assert.equal(payload.body.workers[0].workerKey, '203.0.113.50');
  assert.equal(payload.body.workers[0].displayName, 'Render Peer');
  assert.equal(payload.body.workers[0].isDiscovered, true);
  assert.equal(payload.body.workers[0].isOnline, true);
  assert.equal(payload.body.workers[0].renderAvailability, 'capable');
  setPresenceVolatile({});
});

test('auto remote dispatcher probes LAN detected stations', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-postprod-remote-dispatcher-'));
  const previousDataDir = process.env.UU_DATA_DIR;
  const previousFetch = global.fetch;
  process.env.UU_DATA_DIR = tmpDir;
  fs.writeFileSync(path.join(tmpDir, 'hosts_server.json'), JSON.stringify({}), 'utf8');
  setPresenceVolatile({
    '203.0.113.77': {
      ip: '203.0.113.77',
      name: 'Render Auto Peer',
      agentPort: 4321,
      source: 'udp',
      ts: new Date().toISOString(),
    },
  });

  const requestedUrls = [];
  global.fetch = async (url) => {
    requestedUrls.push(String(url || ''));
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        ok: true,
        queueLength: 0,
        isEditing: false,
        stationName: 'Render Auto Peer',
      }),
    };
  };

  try {
    const station = await selectBestStation('', 4000);
    assert.equal(station.ip, '203.0.113.77');
    assert.equal(station.stationName, 'Render Auto Peer');
    assert.equal(requestedUrls.length, 1);
    assert.match(requestedUrls[0], /^http:\/\/203\.0\.113\.77:4321\/agent\/postprod\/remote\/queue-length$/);
  } finally {
    global.fetch = previousFetch;
    setPresenceVolatile({});
    if (previousDataDir === undefined) {
      delete process.env.UU_DATA_DIR;
    } else {
      process.env.UU_DATA_DIR = previousDataDir;
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
