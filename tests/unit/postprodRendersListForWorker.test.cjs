// Liste des rendus : une station ne télécharge que ses rendus en cours, et la
// liste complète n'est plus envoyée en double.
const test = require('node:test');
const assert = require('node:assert/strict');

const { handlePostprodRendersRoutes } = require('../../main/server-postprod-routes-renders.cjs');

function makeServer() {
  const calls = { full: 0, byWorker: [], scans: 0 };
  const rows = [
    { id: 1, status: 'Running', assigned_worker_key: 'station-a' },
    { id: 2, status: 'Running', assigned_worker_key: 'station-b' },
    { id: 3, status: 'Done', assigned_worker_key: 'station-a' },
  ];
  const send = async (query = '') => {
    let response = null;
    await handlePostprodRendersRoutes({
      req: { method: 'GET' },
      res: {},
      pathname: '/agent/postprod/renders',
      url: new URL(`http://localhost/agent/postprod/renders${query}`),
      sendJSON: (_res, status, body) => { response = { status, body }; },
      requireSession: () => ({ session: { user_id: 1, role: 'worker' } }),
      rolePermissions: () => ({ canLaunchRenders: true }),
      parseBooleanFlag: (value, fallback) => (value == null ? fallback : value === 'true'),
      importDetectedRenderOutputs: () => { calls.scans += 1; return { imported: 0 }; },
      resolveRenderDetectedRoots: () => [],
      shouldExposeDetectedRender: () => true,
      buildRenderJobPayload: (row) => ({ id: row.id, status: row.status, assignedWorkerKey: row.assigned_worker_key }),
      stmts: {
        listRenderJobs: { all: () => { calls.full += 1; return rows; } },
        listRunningRenderJobsByWorkerKey: {
          all: (key) => {
            calls.byWorker.push(key);
            return rows.filter((row) => row.status === 'Running' && row.assigned_worker_key === key);
          },
        },
      },
    });
    return response;
  };
  return { send, calls };
}

test('a station only receives its own running renders, without a full listing or disk scan', async () => {
  const server = makeServer();

  const res = await server.send('?assignedWorker=station-a');

  assert.equal(res.status, 200);
  assert.deepEqual(res.body.renders.map((render) => render.id), [1]);
  assert.deepEqual(server.calls.byWorker, ['station-a']);
  assert.equal(server.calls.full, 0);
  assert.equal(server.calls.scans, 0);
});

test('the full listing is still available and no longer duplicated', async () => {
  const server = makeServer();

  const res = await server.send();

  assert.deepEqual(res.body.renders.map((render) => render.id), [1, 2, 3]);
  assert.equal('renderJobs' in res.body, false);
  assert.equal(server.calls.scans, 1);
});
