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
