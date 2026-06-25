const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  isRenderProjectSyncSelected,
  buildScopeResponseStatus,
  computeConflictPaths,
  findDestinationFolderCollisions,
  isPathInsideRoot,
  shouldIgnore,
  assertReadableSourceProject,
} = require('../../main/server-sync.cjs');

test('render synchronization requires both an eligible usage mode and project opt-in', () => {
  assert.equal(isRenderProjectSyncSelected('auto_render', true), true);
  assert.equal(isRenderProjectSyncSelected('live_auto_render', true), true);
  assert.equal(isRenderProjectSyncSelected('auto_render', false), false);
  assert.equal(isRenderProjectSyncSelected('live', true), false);
});

test('source validation rejects missing projects before inventory or deletion', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ultiunreal-sync-source-'));
  try {
    const projectPath = path.join(root, 'Project.uproject');
    fs.writeFileSync(projectPath, '{}', 'utf8');
    assert.equal(await assertReadableSourceProject(projectPath), root);
    await assert.rejects(
      () => assertReadableSourceProject(path.join(root, 'Missing.uproject')),
      /Projet source introuvable/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('conflict detection flags newer and target-only files', () => {
  const conflicts = computeConflictPaths(
    {
      'Content/A.uasset': { size: 10, mtimeMs: 100 },
      'Content/B.uasset': { size: 20, mtimeMs: 200 },
    },
    {
      'Content/A.uasset': { size: 10, mtimeMs: 150 },
      'Content/B.uasset': { size: 20, mtimeMs: 100 },
      'Content/C.uasset': { size: 30, mtimeMs: 300 },
    },
    ['Content/A.uasset', 'Content/B.uasset'],
    ['Content/C.uasset']
  );
  assert.deepEqual(conflicts, ['Content/A.uasset', 'Content/C.uasset']);
});

test('sync destination containment rejects sibling and traversal paths', () => {
  const root = 'D:\\Projects_Sync';
  assert.equal(isPathInsideRoot('D:\\Projects_Sync\\ProjectA', root), true);
  assert.equal(isPathInsideRoot('D:\\Projects_Sync', root), true);
  assert.equal(isPathInsideRoot('D:\\Projects_Sync_Other\\ProjectA', root), false);
  assert.equal(isPathInsideRoot('D:\\Projects_Sync\\..\\Windows', root), false);
});

test('sync ignore glob treats regex punctuation as literal text', () => {
  assert.equal(shouldIgnore('Config/file[1].ini', ['Config/file[1].ini']), true);
  assert.equal(shouldIgnore('Config/file11.ini', ['Config/file[1].ini']), false);
});

test('destination collision detection protects projects sharing a folder name', () => {
  const projects = [
    { id: '0001', sourceHostIp: '192.168.1.10' },
    { id: '0002', sourceHostIp: '192.168.1.20' },
  ];
  const projectsDoc = {
    projects,
    activeByHost: {
      '192.168.1.10': { '0001': 'D:\\Sources\\Shared\\One.uproject' },
      '192.168.1.20': { '0002': 'E:\\Other\\Shared\\Two.uproject' },
    },
  };
  const collisions = findDestinationFolderCollisions(projects, [], projectsDoc);
  assert.deepEqual(Array.from(collisions).sort(), ['0001', '0002']);
});

test('render synchronization scope prioritizes conflicts and errors', () => {
  assert.equal(buildScopeResponseStatus([{ status: 'in_sync' }]), 'in_sync');
  assert.equal(buildScopeResponseStatus([{ status: 'desync' }]), 'desync');
  assert.equal(buildScopeResponseStatus([{ status: 'conflict' }]), 'conflict');
  assert.equal(
    buildScopeResponseStatus([{ status: 'desync' }, { status: 'no_source' }]),
    'no_source'
  );
  assert.equal(
    buildScopeResponseStatus([{ status: 'conflict' }, { status: 'error' }]),
    'error'
  );
});
