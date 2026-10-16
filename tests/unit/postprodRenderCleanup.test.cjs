const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  cleanupRenderArtifacts,
  handlePostprodRendersRoutes,
} = require('../../main/server-postprod-routes-renders.cjs');

function makeRoot(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-render-cleanup-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeFile(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, 'x');
  return filePath;
}

function renderRow(outputPath, payload = {}) {
  return { output_path: outputPath, payload_json: JSON.stringify(payload) };
}

function cleanup(root, row, otherRenderRows = []) {
  return cleanupRenderArtifacts({
    renderRow: row,
    readCommonServerConfigFile: () => ({ render_output_dirs: [root] }),
    resolveRenderDetectedRoots: () => [],
    otherRenderRows,
  });
}

test('deleting a render keeps the shared output folder and the other render files', (t) => {
  const root = makeRoot(t);
  const shared = path.join(root, 'ProjetA');
  const outA = writeFile(path.join(shared, 'A.mov'));
  const outB = writeFile(path.join(shared, 'B.mov'));
  const rowA = renderRow(outA, { outputDir: shared, renderOutputDir: shared });
  const rowB = renderRow(outB, { outputDir: shared });

  const result = cleanup(root, rowA, [rowB]);

  assert.equal(fs.existsSync(outA), false);
  assert.equal(fs.existsSync(outB), true);
  assert.equal(fs.existsSync(shared), true);
  assert.equal(result.ok, true);
});

test('output folder is never deleted recursively, even without other renders', (t) => {
  const root = makeRoot(t);
  const shared = path.join(root, 'ProjetA');
  const outA = writeFile(path.join(shared, 'A.mov'));
  const userFile = writeFile(path.join(shared, 'notes.txt'));

  cleanup(root, renderRow(outA, { outputDir: shared }));

  assert.equal(fs.existsSync(outA), false);
  assert.equal(fs.existsSync(userFile), true);
});

test('a proxy still referenced by another render is kept', (t) => {
  const root = makeRoot(t);
  const shared = path.join(root, 'ProjetA');
  const proxy = writeFile(path.join(shared, 'proxy', 'proxy.mp4'));
  const outA = writeFile(path.join(shared, 'A.mov'));
  const outB = writeFile(path.join(shared, 'B.mov'));

  cleanup(root, renderRow(outA, { proxyPath: proxy }), [renderRow(outB, { proxyPath: proxy })]);

  assert.equal(fs.existsSync(proxy), true);
});

test('an exclusive proxy is deleted and its now-empty folder removed', (t) => {
  const root = makeRoot(t);
  const jobDir = path.join(root, 'ProjetA', 'job_A');
  const outA = writeFile(path.join(jobDir, 'A.mov'));
  const proxy = writeFile(path.join(jobDir, 'proxy', 'proxy.mp4'));

  cleanup(root, renderRow(outA, { proxyPath: proxy, outputDir: jobDir }));

  assert.equal(fs.existsSync(proxy), false);
  assert.equal(fs.existsSync(path.dirname(proxy)), false);
  assert.equal(fs.existsSync(jobDir), true);
});

test('a render path pointing to a folder is not deleted recursively', (t) => {
  const root = makeRoot(t);
  const folder = path.join(root, 'ProjetA');
  const other = writeFile(path.join(folder, 'other.mov'));

  const result = cleanup(root, renderRow(folder));

  assert.equal(fs.existsSync(other), true);
  assert.equal(result.deleted.length, 0);
});

test('paths outside the allowed roots are never touched', (t) => {
  const root = makeRoot(t);
  const outside = makeRoot(t);
  const file = writeFile(path.join(outside, 'A.mov'));

  cleanup(root, renderRow(file));

  assert.equal(fs.existsSync(file), true);
});

test('a junction inside the allowed root cannot lead the cleanup outside of it', (t) => {
  const root = makeRoot(t);
  const outside = makeRoot(t);
  const victim = writeFile(path.join(outside, 'A.mov'));
  const linked = path.join(root, 'linked');
  fs.symlinkSync(outside, linked, 'junction');

  const result = cleanup(root, renderRow(path.join(linked, 'A.mov')));

  assert.equal(fs.existsSync(victim), true);
  assert.equal(result.deleted.length, 0);
});

test('a file shared through a junction alias is recognised as shared', (t) => {
  const root = makeRoot(t);
  const real = path.join(root, 'ProjetA');
  const proxy = writeFile(path.join(real, 'proxy', 'proxy.mp4'));
  const alias = path.join(root, 'alias');
  fs.symlinkSync(real, alias, 'junction');

  cleanup(
    root,
    renderRow(writeFile(path.join(real, 'A.mov')), { proxyPath: proxy }),
    [renderRow(path.join(alias, 'B.mov'), { proxyPath: path.join(alias, 'proxy', 'proxy.mp4') })],
  );

  assert.equal(fs.existsSync(proxy), true);
});

function deleteRenderViaRoute(root, rows, renderId, { failTransaction = false } = {}) {
  const sent = [];
  const deletedIds = [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  return handlePostprodRendersRoutes({
    req: { method: 'DELETE' },
    res: {},
    pathname: `/agent/postprod/renders/${renderId}`,
    sendJSON: (_res, status, body) => sent.push({ status, body }),
    requireSession: () => ({ session: { user_id: 1, role: 'admin' } }),
    rolePermissions: () => ({ canLaunchRenders: true }),
    buildRenderJobPayload: (row) => JSON.parse(row.payload_json || '{}'),
    stmts: {
      findRenderJobById: { get: (id) => byId.get(id) || null },
      listRenderJobs: { all: () => rows },
      deleteRenderJobById: { run: (id) => { deletedIds.push(id); return { changes: 1 }; } },
    },
    db: {
      transaction: (fn) => () => {
        if (failTransaction) throw new Error('db_failure');
        return fn();
      },
    },
    nowIso: () => new Date().toISOString(),
    audit: () => {},
    readCommonServerConfigFile: () => ({ render_output_dirs: [root] }),
    resolveRenderDetectedRoots: () => [],
  }).then(() => ({ sent, deletedIds }));
}

test('DELETE route removes only the deleted render file in a shared folder', async (t) => {
  const root = makeRoot(t);
  const shared = path.join(root, 'ProjetA');
  const outA = writeFile(path.join(shared, 'A.mov'));
  const outB = writeFile(path.join(shared, 'B.mov'));
  const rows = [
    { id: 1, status: 'Done', ...renderRow(outA, { outputDir: shared }) },
    { id: 2, status: 'Done', ...renderRow(outB, { outputDir: shared }) },
  ];

  const { sent, deletedIds } = await deleteRenderViaRoute(root, rows, 1);

  assert.deepEqual(deletedIds, [1]);
  assert.equal(sent.at(-1)?.status, 200);
  assert.equal(fs.existsSync(outA), false);
  assert.equal(fs.existsSync(outB), true);
});

test('DELETE route keeps files when the database deletion fails', async (t) => {
  const root = makeRoot(t);
  const outA = writeFile(path.join(root, 'ProjetA', 'A.mov'));
  const rows = [{ id: 1, status: 'Done', ...renderRow(outA) }];

  await assert.rejects(deleteRenderViaRoute(root, rows, 1, { failTransaction: true }));

  assert.equal(fs.existsSync(outA), true);
});
