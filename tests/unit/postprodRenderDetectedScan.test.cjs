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

const { sequenceKey, parseSequenceFrame } = require('../../main/render-image-sequence.cjs');

test('every way of writing a frame number designates the same sequence', () => {
  const keys = ['D:/R/Shot.0001.exr', 'D:\\R\\Shot.{frame_number}.exr', 'D:/R/Shot.%04d.exr', 'D:/R/Shot.####.exr']
    .map(sequenceKey);
  assert.equal(new Set(keys).size, 1);
  assert.equal(sequenceKey('D:/R/Take_001.mp4'), '');
  assert.equal(parseSequenceFrame('Shot.0012.exr').frame, 12);
  assert.equal(parseSequenceFrame('Shot.mov'), null);
});

function writeFrames(dir, count, ageMs) {
  fs.mkdirSync(dir, { recursive: true });
  const mtime = new Date(Date.now() - ageMs);
  for (let i = 1; i <= count; i += 1) {
    const f = path.join(dir, `Shot.${String(i).padStart(4, '0')}.exr`);
    fs.writeFileSync(f, 'x');
    fs.utimesSync(f, mtime, mtime);
  }
}

function sequenceHarness(t, renders) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-detected-seq-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const inserted = [];
  const run = (list) => ({ run: (...args) => { list.push(args); return { lastInsertRowid: 900 + list.length }; } });
  const helpers = createRenderDetectedAutoScanHelpers({
    db: { transaction: (fn) => (arg) => fn(arg) },
    stmts: {
      listRenderJobs: { all: () => renders(root) },
      findRenderDetectedFileBySignature: { get: () => undefined },
      countRenderDetectedFilesByTaskId: { get: () => ({ n: 0 }) },
      updateRenderJobPayload: run([]), updateRenderJobTransition: run([]), updateRenderJobOutputPath: run([]),
      clearRenderWorkerCurrentJobByRenderId: run([]), insertRenderJobEvent: run([]), insertRenderDetectedFile: run([]),
      insertRenderJob: run(inserted),
    },
    resolveRenderDetectedRoots: () => [root],
    renderDetectedExtensions: new Set(['.exr', '.png', '.mp4']),
    buildRenderDetectedFileSignature: (p, size, mtimeAt) => `${p}|${size}|${mtimeAt}`,
  });
  return { root, helpers, inserted };
}

test('an image sequence of a finished render is never re-imported frame by frame', (t) => {
  const { root, helpers, inserted } = sequenceHarness(t, (dir) => [{
    id: 400, status: 'Done', review_status: 'to_validate', assigned_worker_id: 4,
    output_path: path.join(dir, '400_0069', 'Shot.{frame_number}.exr'), payload_json: '{}',
  }]);
  writeFrames(path.join(root, '400_0069'), 25, 10 * 60_000);
  helpers.importDetectedRenderOutputs({ actorUserId: 1, force: true });
  assert.equal(inserted.length, 0);
});

test('an unknown image sequence is imported once, as a pattern', (t) => {
  const { root, helpers, inserted } = sequenceHarness(t, () => []);
  writeFrames(path.join(root, 'manuel'), 25, 10 * 60_000);
  const candidates = helpers.listRenderDetectedFileCandidates([root]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].fileName, 'Shot.####.exr');
  assert.equal(candidates[0].frameCount, 25);
  const summary = helpers.importDetectedRenderOutputs({ actorUserId: 1, force: true });
  assert.equal(summary.imported, 1);
  assert.equal(inserted.length, 1);
  assert.match(inserted[0][8], /Shot\.####\.exr$/);
});

test('a sequence still being written is not imported yet', (t) => {
  const { root, helpers, inserted } = sequenceHarness(t, () => []);
  const dir = path.join(root, 'en-cours');
  writeFrames(dir, 24, 10 * 60_000);
  fs.writeFileSync(path.join(dir, 'Shot.0025.exr'), 'x');
  helpers.importDetectedRenderOutputs({ actorUserId: 1, force: true });
  assert.equal(inserted.length, 0);
});

test('beyond the selection limit, the most recent files are the ones examined', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-detected-limit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (let i = 0; i < 30; i += 1) {
    const f = path.join(root, `old-${i}.mp4`);
    fs.writeFileSync(f, 'x');
    const mtime = new Date(Date.now() - (60 + i) * 60_000);
    fs.utimesSync(f, mtime, mtime);
  }
  fs.writeFileSync(path.join(root, 'nouveau.mp4'), 'x');
  const { listRenderDetectedFileCandidates } = createRenderDetectedAutoScanHelpers({
    renderDetectedExtensions: new Set(['.mp4']),
    renderDetectedScanMaxFiles: 5,
  });
  const names = listRenderDetectedFileCandidates([root]).map((c) => c.fileName);
  assert.equal(names.length, 5);
  assert.ok(names.includes('nouveau.mp4'));
});

test('repeated scans eventually examine every output, including those beyond 500', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-detected-rotation-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (let i = 0; i < 505; i += 1) fs.writeFileSync(path.join(root, `render-${i}.mp4`), 'x');
  const { listRenderDetectedFileCandidates } = createRenderDetectedAutoScanHelpers({
    renderDetectedExtensions: new Set(['.mp4']),
  });
  const first = listRenderDetectedFileCandidates([root]);
  const second = listRenderDetectedFileCandidates([root]);
  assert.equal(first.length, 500);
  assert.equal(second.length, 5);
  assert.equal(new Set([...first, ...second].map((c) => c.filePath)).size, 505);
  assert.equal(listRenderDetectedFileCandidates([root]).length, 500, 'a new cycle rechecks changed files');
});

test('bounded traversal resumes inside a directory and never publishes a partial sequence', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-detected-resume-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  writeFrames(root, 8, 10 * 60_000);
  const helpers = createRenderDetectedAutoScanHelpers({
    renderDetectedExtensions: new Set(['.exr']),
    renderDetectedScanMaxVisitedFiles: 3,
  });
  assert.deepEqual(helpers.listRenderDetectedFileCandidates([root]), []);
  assert.equal(helpers.renderDetectedScanState.traversalPending, true);
  assert.deepEqual(helpers.listRenderDetectedFileCandidates([root]), []);
  const final = helpers.listRenderDetectedFileCandidates([root]);
  assert.equal(final.length, 1);
  assert.equal(final[0].frameCount, 8);
  assert.equal(helpers.renderDetectedScanState.traversalPending, false);
});

test('changing roots abandons a pending traversal of the old directory', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-detected-roots-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const oldRoot = path.join(root, 'old');
  const newRoot = path.join(root, 'new');
  writeFrames(oldRoot, 8, 10 * 60_000);
  fs.mkdirSync(newRoot);
  fs.writeFileSync(path.join(newRoot, 'new.mp4'), 'x');
  const helpers = createRenderDetectedAutoScanHelpers({
    renderDetectedExtensions: new Set(['.exr', '.mp4']),
    renderDetectedScanMaxVisitedFiles: 3,
  });
  assert.deepEqual(helpers.listRenderDetectedFileCandidates([oldRoot]), []);
  const next = helpers.listRenderDetectedFileCandidates([newRoot]);
  assert.deepEqual(next.map((entry) => entry.fileName), ['new.mp4']);
});
