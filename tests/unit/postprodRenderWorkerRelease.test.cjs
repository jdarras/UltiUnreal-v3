// Une station bloquée rend au serveur un rendu qu'elle n'a pas commencé :
// il repart en file pour une autre station.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  handlePostprodRenderDispatchRoutes,
} = require('../../main/server-postprod-routes-render-dispatch.cjs');

const NOW = '2026-10-17T12:00:00.000Z';

function makeServer({ render, worker = { id: 5, worker_key: 'station-a' }, canLaunchRenders = true } = {}) {
  const calls = { requeue: [], clear: [], events: [], audits: [] };
  const renders = new Map(render ? [[render.id, { ...render }]] : []);
  const stmts = {
    findRenderWorkerByKey: { get: (key) => (worker && key === worker.worker_key ? worker : undefined) },
    findRenderJobById: { get: (id) => renders.get(id) },
    requeueRenderJobReleasedByWorker: {
      run: (now, id, workerId) => {
        calls.requeue.push([id, workerId]);
        const row = renders.get(id);
        if (!row || row.status !== 'Running' || row.assigned_worker_id !== workerId) return { changes: 0 };
        row.status = 'Queued';
        row.assigned_worker_id = null;
        return { changes: 1 };
      },
    },
    clearRenderWorkerCurrentJobByRenderId: { run: (now, id) => calls.clear.push(id) },
    insertRenderJobEvent: { run: (...args) => calls.events.push(args) },
  };
  const send = async (pathname, body) => {
    let response = null;
    const handled = await handlePostprodRenderDispatchRoutes({
      req: { method: 'POST' },
      res: {},
      pathname,
      parseBody: async () => body,
      sendJSON: (_res, status, payload) => { response = { status, payload }; },
      requireSession: () => ({ session: { user_id: 1, role: 'worker' } }),
      rolePermissions: () => ({ canLaunchRenders }),
      sanitizeRenderWorkerKey: (value) => String(value || '').trim(),
      nowIso: () => NOW,
      audit: (...args) => calls.audits.push(args),
      db: { transaction: (fn) => () => fn() },
      stmts,
    });
    return { handled, ...response };
  };
  return { send, calls, renders };
}

test('a blocked station gives back a render assigned to it: the render is queued again', async () => {
  const server = makeServer({ render: { id: 12, status: 'Running', assigned_worker_id: 5 } });

  const res = await server.send('/agent/postprod/render-workers/station-a/release-job', { renderId: 12 });

  assert.deepEqual([res.handled, res.status, res.payload], [true, 200, { ok: true, requeued: true }]);
  assert.equal(server.renders.get(12).status, 'Queued');
  assert.deepEqual(server.calls.clear, [12]);
  assert.deepEqual(server.calls.events[0].slice(0, 3), [12, 'Running', 'Queued']);
  assert.equal(server.calls.events[0][4], 'worker_blocked_requeue');
});

test('a station cannot give back a render assigned to another station', async () => {
  const server = makeServer({ render: { id: 12, status: 'Running', assigned_worker_id: 9 } });

  const res = await server.send('/agent/postprod/render-workers/station-a/release-job', { renderId: 12 });

  assert.deepEqual([res.status, res.payload.error], [409, 'render_not_assigned_to_worker']);
  assert.equal(server.renders.get(12).status, 'Running');
  assert.deepEqual(server.calls.clear, []);
});

test('a render that is no longer running is not touched', async () => {
  const server = makeServer({ render: { id: 12, status: 'Done', assigned_worker_id: 5 } });

  const res = await server.send('/agent/postprod/render-workers/station-a/release-job', { renderId: 12 });

  assert.equal(res.status, 409);
  assert.equal(server.renders.get(12).status, 'Done');
});

test('unknown station, invalid render id and missing permission are refused', async () => {
  const unknown = await makeServer({ render: { id: 12, status: 'Running', assigned_worker_id: 5 } })
    .send('/agent/postprod/render-workers/autre/release-job', { renderId: 12 });
  const invalid = await makeServer().send('/agent/postprod/render-workers/station-a/release-job', { renderId: 'x' });
  const forbidden = await makeServer({ canLaunchRenders: false })
    .send('/agent/postprod/render-workers/station-a/release-job', { renderId: 12 });

  assert.deepEqual([unknown.status, invalid.status, forbidden.status], [404, 400, 403]);
});
