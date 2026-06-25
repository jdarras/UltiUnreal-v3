const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  refreshProjectEngineVersion,
  refreshMissingProjectEngineVersion,
  getProjectFsInfoAsync,
} = require('../../main/server-projects.cjs');

test('refreshProjectEngineVersion replaces a stored GUID after Unreal reassociation', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-engine-version-'));
  try {
    const uprojectPath = path.join(tmpRoot, 'Reassociated.uproject');
    fs.writeFileSync(
      uprojectPath,
      `${JSON.stringify({ EngineAssociation: '5.8' }, null, 2)}\n`,
      'utf8',
    );
    const project = {
      uproject: uprojectPath,
      engineVersion: '{CA96E3A0-40D9-21F2-03A1-C08DBB8DBCE5}',
    };

    assert.equal(refreshProjectEngineVersion(project), true);
    assert.equal(project.engineVersion, '5.8');
    assert.equal(refreshProjectEngineVersion(project), false);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('refreshProjectEngineVersion preserves stored value when the uproject is unavailable', () => {
  const project = {
    uproject: path.join(os.tmpdir(), 'missing-ultiunreal-project.uproject'),
    engineVersion: '5.7',
  };

  assert.equal(refreshProjectEngineVersion(project), false);
  assert.equal(project.engineVersion, '5.7');
});

test('refreshMissingProjectEngineVersion does not rescan an indexed project during list loading', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-engine-list-'));
  try {
    const uprojectPath = path.join(tmpRoot, 'Indexed.uproject');
    fs.writeFileSync(
      uprojectPath,
      `${JSON.stringify({ EngineAssociation: '5.8' }, null, 2)}\n`,
      'utf8',
    );
    const project = {
      uproject: uprojectPath,
      engineVersion: '{CA96E3A0-40D9-21F2-03A1-C08DBB8DBCE5}',
    };

    assert.equal(refreshMissingProjectEngineVersion(project), false);
    assert.equal(project.engineVersion, '{CA96E3A0-40D9-21F2-03A1-C08DBB8DBCE5}');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('getProjectFsInfoAsync locates thumbnails without embedding image data', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-project-thumb-'));
  try {
    const uprojectPath = path.join(tmpRoot, 'AsyncProject.uproject');
    const thumbnailDir = path.join(tmpRoot, 'Saved', 'AutoScreenshot');
    const thumbnailPath = path.join(thumbnailDir, 'AutoScreenshot.png');
    fs.mkdirSync(thumbnailDir, { recursive: true });
    fs.writeFileSync(uprojectPath, '{}\n', 'utf8');
    fs.writeFileSync(thumbnailPath, Buffer.from([137, 80, 78, 71]));

    const info = await getProjectFsInfoAsync(uprojectPath, 'AsyncProject');
    assert.equal(path.normalize(info.thumbPath), path.normalize(thumbnailPath));
    assert.equal(info.thumbData, '');
    assert.ok(info.lastModified);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
