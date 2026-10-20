const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  cleanupRenderArtifacts,
  handlePostprodRendersRoutes,
} = require('../../main/server-postprod-routes-renders.cjs');
const { createOwnedRenderJobFolder } = require('../../main/render-job-folder.cjs');

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

// ---- Sous-dossier exclusif créé par le serveur à l'attribution (<racine>/<id>_<projet>) ----
function jobRow(id, outputPath, payload = {}) {
  return { id, ...renderRow(outputPath, payload) };
}

test('the exclusive job folder created for the render is deleted with it', (t) => {
  const root = makeRoot(t);
  const jobDir = path.join(root, '12_ProjetA');
  assert.equal(createOwnedRenderJobFolder(jobDir, 12).owned, true);
  const out = writeFile(path.join(jobDir, 'Shot_12.mov'));
  writeFile(path.join(jobDir, 'logs', 'uu-worker-render-12.log'));
  writeFile(path.join(jobDir, 'proxy', 'proxy.mp4'));

  const result = cleanup(root, jobRow(12, out, { outputDir: jobDir }));

  assert.equal(fs.existsSync(jobDir), false);
  assert.ok(result.deleted.some((entry) => entry.type === 'dir' && entry.path === fs.realpathSync.native(root) + path.sep + '12_ProjetA'));
});

test('a folder named like another render job is never deleted', (t) => {
  const root = makeRoot(t);
  const otherJob = path.join(root, '13_ProjetA');
  const kept = writeFile(path.join(otherJob, 'Shot_13.mov'));

  cleanup(root, jobRow(12, path.join(otherJob, 'A.mov'), { outputDir: otherJob }));

  assert.equal(fs.existsSync(kept), true);
});

test('a job folder still referenced by another render is kept', (t) => {
  const root = makeRoot(t);
  const jobDir = path.join(root, '12_ProjetA');
  writeFile(path.join(jobDir, 'Shot_12.mov'));
  const shared = writeFile(path.join(jobDir, 'Shot_99.mov'));

  cleanup(root, jobRow(12, path.join(jobDir, 'Shot_12.mov'), { outputDir: jobDir }), [jobRow(99, shared)]);

  assert.equal(fs.existsSync(shared), true);
});

test('a job folder nested deeper than the root, or reached through a junction, is not deleted recursively', (t) => {
  const root = makeRoot(t);
  const nested = path.join(root, 'sub', '12_ProjetA');
  const keptNested = writeFile(path.join(nested, 'notes.txt'));
  cleanup(root, jobRow(12, path.join(nested, 'x.mov'), { outputDir: nested }));
  assert.equal(fs.existsSync(keptNested), true);

  const outside = makeRoot(t);
  const keptOutside = writeFile(path.join(outside, 'notes.txt'));
  const link = path.join(root, '12_Link');
  fs.symlinkSync(outside, link, 'junction');
  cleanup(root, jobRow(12, path.join(link, 'x.mov'), { outputDir: link }));
  assert.equal(fs.existsSync(keptOutside), true);
});

// V1 : un nom en <id>_ ne prouve pas la propriété ; seul le marqueur déposé à
// la création du dossier par le serveur l'autorise.
test('a user folder merely named <id>_... is never deleted recursively', (t) => {
  const root = makeRoot(t);
  const userDir = path.join(root, '12_Archives-personnelles');
  const notes = writeFile(path.join(userDir, 'notes.txt'));
  const out = writeFile(path.join(userDir, 'Shot_12.mov'));

  cleanup(root, jobRow(12, out, { outputDir: userDir }));

  assert.equal(fs.existsSync(out), false);
  assert.equal(fs.existsSync(notes), true);
});

test('a pre-existing folder is not claimed by the server when the job folder is created', (t) => {
  const root = makeRoot(t);
  const jobDir = path.join(root, '12_ProjetA');
  const notes = writeFile(path.join(jobDir, 'notes.txt'));

  assert.equal(createOwnedRenderJobFolder(jobDir, 12).owned, false);
  cleanup(root, jobRow(12, path.join(jobDir, 'x.mov'), { outputDir: jobDir }));

  assert.equal(fs.existsSync(notes), true);
});

test('a marker of another render, or for another path, does not authorise the deletion', (t) => {
  const root = makeRoot(t);
  const jobDir = path.join(root, '12_ProjetA');
  createOwnedRenderJobFolder(jobDir, 13);
  const notes = writeFile(path.join(jobDir, 'notes.txt'));
  cleanup(root, jobRow(12, path.join(jobDir, 'x.mov'), { outputDir: jobDir }));
  assert.equal(fs.existsSync(notes), true);

  const copied = path.join(root, '12_Copie');
  fs.mkdirSync(copied);
  fs.copyFileSync(path.join(jobDir, '.uu-render-job.json'), path.join(copied, '.uu-render-job.json'));
  const copiedNotes = writeFile(path.join(copied, 'notes.txt'));
  cleanup(root, jobRow(13, path.join(copied, 'x.mov'), { outputDir: copied }));
  assert.equal(fs.existsSync(copiedNotes), true);
});

// Un ancien scan a pu importer le marqueur comme un rendu : supprimer cette
// fausse entrée ne touche ni au marqueur ni au vrai rendu du dossier, et le
// dossier reste supprimable avec son vrai rendu.
test('deleting a render that points at a job folder marker keeps the marker', (t) => {
  const root = makeRoot(t);
  const jobDir = path.join(root, '361_0069');
  assert.equal(createOwnedRenderJobFolder(jobDir, 361).owned, true);
  const realOutput = writeFile(path.join(jobDir, 'test-a-r001.mp4'));
  const marker = path.join(jobDir, '.uu-render-job.json');
  const realRow = jobRow(361, realOutput, { outputDir: jobDir });

  const result = cleanup(root, jobRow(362, marker), [realRow]);

  assert.equal(fs.existsSync(marker), true);
  assert.equal(fs.existsSync(realOutput), true);
  assert.ok(result.skipped.some((entry) => entry.reason === 'render_job_marker'));

  cleanup(root, realRow);
  assert.equal(fs.existsSync(jobDir), false);
});
