// Choisir une destination sur un rendu déjà validé le copie tout de suite ;
// sur un rendu pas encore validé, la copie attend la validation.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { handlePostprodRendersRoutes } = require('../../main/server-postprod-routes-renders.cjs');

function setup(t, reviewStatus) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-export-dest-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const output = path.join(root, 'renders', '363_0069', 'test-b-r001.mp4');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, 'video');
  const destDir = path.join(root, 'livraison');
  fs.mkdirSync(destDir);

  const row = {
    id: 363, status: 'Done', review_status: reviewStatus, project_name: '0069',
    output_path: output, payload_json: JSON.stringify({ source: 'task_auto_render_now' }),
  };
  const send = async () => {
    let response = null;
    await handlePostprodRendersRoutes({
      req: { method: 'PUT' },
      res: {},
      pathname: '/agent/postprod/renders/363/export-destinations',
      parseBody: async () => ({ exportDestinationIds: ['dest-1'] }),
      sendJSON: (_res, status, payload) => { response = { status, payload }; },
      requireSession: () => ({ session: { user_id: 1, role: 'Admin' } }),
      rolePermissions: () => ({ canLaunchRenders: true }),
      requireRenderLaunchForProject: () => true,
      stmts: {
        findRenderJobById: { get: () => row },
        updateRenderJobPayload: { run: (json) => { row.payload_json = json; } },
        insertRenderJobEvent: { run: () => {} },
      },
      buildRenderJobPayload: (r) => ({ id: r.id }),
      nowIso: () => '2026-10-20T12:30:00.000Z',
      audit: () => {},
      readCommonServerConfigFile: () => ({
        renderExportDestinations: [{ id: 'dest-1', name: 'Livraison', path: destDir, isActive: true }],
      }),
    });
    // La copie est lancée en tâche de fond.
    await new Promise((resolve) => setImmediate(resolve));
    return response;
  };
  return { send, destDir };
}

test('a validated render is copied as soon as a destination is chosen', async (t) => {
  const { send, destDir } = setup(t, 'validated');
  const response = await send();
  assert.equal(response.status, 200);
  assert.equal(fs.readdirSync(destDir).length, 1);
});

test('a render not yet validated waits for its validation', async (t) => {
  const { send, destDir } = setup(t, 'to_validate');
  await send();
  assert.deepEqual(fs.readdirSync(destDir), []);
});

const { resolveRenderExportDestinationIds } = require('../../main/server-postprod-export-destinations.cjs');
const { scheduleRenderExportForValidatedRender } = require('../../main/server-postprod-routes-render-transitions.cjs');

const task = { auto_render_config_json: JSON.stringify({ payload: { exportDestinationIds: ['dest-1'] } }) };

test('destinations: those of the render first, otherwise those of its request (same rule as the screen)', () => {
  assert.deepEqual(resolveRenderExportDestinationIds({ exportDestinationIds: ['dest-2'] }, task), ['dest-2']);
  // Liste vide enregistrée sur le rendu : choix explicite « aucune destination ».
  assert.deepEqual(resolveRenderExportDestinationIds({ exportDestinationIds: [] }, task), []);
  assert.deepEqual(resolveRenderExportDestinationIds({ taskId: 86 }, task), ['dest-1']);
  assert.deepEqual(resolveRenderExportDestinationIds({ taskId: 86 }, null), []);
});

test('a validated render without its own destination is copied to the destination of its request', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-export-task-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const output = path.join(root, '363_0069', 'test-b-r001.mp4');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, 'video');
  const destDir = path.join(root, 'livraison');
  fs.mkdirSync(destDir);

  scheduleRenderExportForValidatedRender({
    renderId: 363,
    renderRow: { id: 363, output_path: output, payload_json: JSON.stringify({ taskId: 86 }) },
    readCommonServerConfigFile: () => ({
      renderExportDestinations: [{ id: 'dest-1', name: 'Livraison', path: destDir, isActive: true }],
    }),
    findTaskById: { get: (id) => (id === 86 ? task : undefined) },
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(fs.readdirSync(destDir).length, 1);
});
