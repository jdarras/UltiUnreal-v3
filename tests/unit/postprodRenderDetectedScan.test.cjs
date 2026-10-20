// Scan des dossiers de sortie : seuls de vrais fichiers de rendu sont
// proposés à l'import (jamais un fichier caché comme le marqueur de dossier).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createRenderDetectedAutoScanHelpers } = require('../../main/server-postprod-auth-render-detected.cjs');
const { createOwnedRenderJobFolder } = require('../../main/render-job-folder.cjs');

test('the job folder marker and hidden files are never offered as renders', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-detected-scan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const jobDir = path.join(root, '361_0069');
  createOwnedRenderJobFolder(jobDir, 361);
  fs.writeFileSync(path.join(jobDir, 'test-a-r001.mp4'), 'x');
  fs.writeFileSync(path.join(jobDir, '.cache.json'), '{}');
  fs.writeFileSync(path.join(jobDir, 'metadata.json'), '{}');
  fs.writeFileSync(path.join(jobDir, 'proxy', 'test-a-r001.mp4.proxy.mp4'), 'x');

  const { listRenderDetectedFileCandidates } = createRenderDetectedAutoScanHelpers({
    renderDetectedExtensions: new Set(['.mp4', '.json']),
  });
  const names = listRenderDetectedFileCandidates([root]).map((entry) => entry.fileName).sort();

  assert.deepEqual(names, ['metadata.json', 'test-a-r001.mp4']);
});

// Base simulée : rendus existants, fichiers déjà importés, écritures relevées.
function makeImportHarness(t, { renders, fileAgeMs = 5 * 60_000 }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-detected-import-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const jobDir = path.join(root, '363_0069');
  fs.mkdirSync(jobDir, { recursive: true });
  const file = path.join(jobDir, 'test-b-r001.mp4');
  fs.writeFileSync(file, 'x');
  const mtime = new Date(Date.now() - fileAgeMs);
  fs.utimesSync(file, mtime, mtime);

  const writes = { payloads: [], transitions: [], inserted: [] };
  const run = (list) => ({ run: (...args) => { list.push(args); return { lastInsertRowid: 900 }; } });
  const helpers = createRenderDetectedAutoScanHelpers({
    db: { transaction: (fn) => (arg) => fn(arg) },
    stmts: {
      listRenderJobs: { all: () => renders },
      findRenderDetectedFileBySignature: { get: () => undefined },
      countRenderDetectedFilesByTaskId: { get: () => ({ n: 0 }) },
      updateRenderJobPayload: run(writes.payloads),
      updateRenderJobTransition: run(writes.transitions),
      updateRenderJobOutputPath: run([]),
      clearRenderWorkerCurrentJobByRenderId: run([]),
      insertRenderJobEvent: run([]),
      insertRenderDetectedFile: run([]),
      insertRenderJob: run(writes.inserted),
    },
    resolveRenderDetectedRoots: () => [root],
    renderDetectedExtensions: new Set(['.mp4']),
    buildExpectedRenderTaskMatchCatalog: () => [],
    findExpectedRenderTaskMatch: () => ({ taskId: 86, expectedRenderName: 'test-b-r001', expectedRenderCount: 1 }),
    buildRenderDetectedFileSignature: (p, size, mtimeAt) => `${p}|${size}|${mtimeAt}`,
  });
  return { helpers, writes };
}

const renderRow = (status, assignedWorkerId, payload) => ({
  id: 363, status, review_status: 'to_validate', assigned_worker_id: assignedWorkerId,
  payload_json: JSON.stringify({ taskId: 86, matchedExpectedRenderName: 'test-b-r001', ...payload }),
});

test('a file of a render still running on a station is left to that station', (t) => {
  const { helpers, writes } = makeImportHarness(t, {
    renders: [renderRow('Running', 4, { exportDestinationIds: ['dest-1'] })],
  });
  const summary = helpers.importDetectedRenderOutputs({ actorUserId: 1, force: true });
  assert.equal(summary.imported, 0);
  assert.deepEqual([writes.payloads.length, writes.transitions.length, writes.inserted.length], [0, 0, 0]);
});

test('attaching a file to an existing render completes its record, never replaces it', (t) => {
  const { helpers, writes } = makeImportHarness(t, {
    renders: [renderRow('Queued', null, { exportDestinationIds: ['dest-1'], projectPath: 'D:/P/P.uproject' })],
  });
  helpers.importDetectedRenderOutputs({ actorUserId: 1, force: true });
  const payload = JSON.parse(writes.payloads[0][0]);
  assert.deepEqual(payload.exportDestinationIds, ['dest-1']);
  assert.equal(payload.projectPath, 'D:/P/P.uproject');
  assert.equal(payload.fileName, 'test-b-r001.mp4');
});

test('a file modified less than a minute ago is not imported yet', (t) => {
  const { helpers, writes } = makeImportHarness(t, { renders: [], fileAgeMs: 5_000 });
  const summary = helpers.importDetectedRenderOutputs({ actorUserId: 1, force: true });
  assert.equal(summary.imported, 0);
  assert.equal(writes.inserted.length, 0);
});
