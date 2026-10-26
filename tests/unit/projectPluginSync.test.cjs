// Copie d'un plugin installée dans un projet comparée à la version fournie.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { isInstalledPluginOutdated } = require('../../main/project-plugin-sync.cjs');

function makePlugin(root, { dll = 'v1', withPdb = 'a' } = {}) {
  fs.mkdirSync(path.join(root, 'Binaries', 'Win64'), { recursive: true });
  fs.writeFileSync(path.join(root, 'Plugin.uplugin'), '{"Version":1}');
  fs.writeFileSync(path.join(root, 'Binaries', 'Win64', 'UnrealEditor-Plugin.dll'), dll);
  fs.writeFileSync(path.join(root, 'Binaries', 'Win64', 'UnrealEditor.modules'), '{"BuildId":"1"}');
  fs.writeFileSync(path.join(root, 'Binaries', 'Win64', 'UnrealEditor-Plugin.pdb'), withPdb);
}

function dirs(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-plugin-sync-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { pkg: path.join(root, 'package'), installed: path.join(root, 'project') };
}

test('an identical copy is up to date, even if debug symbols differ', (t) => {
  const { pkg, installed } = dirs(t);
  makePlugin(pkg, { withPdb: 'a' });
  makePlugin(installed, { withPdb: 'b' });
  assert.equal(isInstalledPluginOutdated(pkg, installed), false);
});

test('a different compiled library means an update is available', (t) => {
  const { pkg, installed } = dirs(t);
  makePlugin(pkg, { dll: 'v2' });
  makePlugin(installed, { dll: 'v1' });
  assert.equal(isInstalledPluginOutdated(pkg, installed), true);
});

test('a missing file in the project copy means an update is available', (t) => {
  const { pkg, installed } = dirs(t);
  makePlugin(pkg);
  makePlugin(installed);
  fs.rmSync(path.join(installed, 'Binaries', 'Win64', 'UnrealEditor.modules'));
  assert.equal(isInstalledPluginOutdated(pkg, installed), true);
});

function addSource(root, text) {
  fs.mkdirSync(path.join(root, 'Source', 'Plugin', 'Private'), { recursive: true });
  fs.writeFileSync(path.join(root, 'Source', 'Plugin', 'Private', 'Plugin.cpp'), text);
}

test('with source code, the version is read from the source, not from binaries rebuilt by Unreal', (t) => {
  const { pkg, installed } = dirs(t);
  makePlugin(pkg, { dll: 'compilé par UltiUnreal' });
  makePlugin(installed, { dll: 'recompilé par Unreal dans le projet' });
  addSource(pkg, 'int a = 1;\n');
  addSource(installed, 'int a = 1;\r\n');
  assert.equal(isInstalledPluginOutdated(pkg, installed), false);

  addSource(pkg, 'int a = 2;\n');
  assert.equal(isInstalledPluginOutdated(pkg, installed), true);
});

test('without a usable package, nothing can be concluded', (t) => {
  const { pkg, installed } = dirs(t);
  makePlugin(installed);
  assert.equal(isInstalledPluginOutdated(pkg, installed), null);
  assert.equal(isInstalledPluginOutdated('', installed), null);
});
