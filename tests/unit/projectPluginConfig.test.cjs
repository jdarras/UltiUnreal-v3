const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  resolveProjectPluginSpec,
  listProjectPluginPackageCandidates,
  resolveProjectPluginStatus,
  resolveEngineVersionTagVariants,
} = require('../../main/server-project-config.cjs');

test('resolveEngineVersionTagVariants accepts UE and raw engine versions', () => {
  assert.deepEqual(resolveEngineVersionTagVariants('5.7.0'), ['UE5.7', 'UE_5.7']);
  assert.deepEqual(resolveEngineVersionTagVariants('UE5.7'), ['UE5.7', 'UE_5.7']);
});

test('resolveProjectPluginSpec resolves live plugin aliases to internal names', () => {
  assert.equal(resolveProjectPluginSpec('UU_Camera')?.pluginName, 'UltiUnrealCamera');
  assert.equal(resolveProjectPluginSpec('UltiUnrealTexture')?.key, 'UU_Texture');
  assert.equal(resolveProjectPluginSpec('render_bridge')?.pluginName, 'UltiUnrealRenderBridge');
});

test('listProjectPluginPackageCandidates includes new live and rendu layouts', () => {
  const textureCandidates = listProjectPluginPackageCandidates('UU_Texture', '5.7.0')
    .map((candidate) => path.normalize(candidate.packageDir));
  assert.ok(textureCandidates.some((candidate) => (
    candidate.endsWith(path.normalize(path.join('plugins', 'Live', 'UU_Texture', 'UE5.7')))
  )));
  assert.ok(textureCandidates.some((candidate) => (
    candidate.endsWith(path.normalize(path.join('plugins', 'Live', 'UU_Texture', 'UE_5.7')))
  )));

  const renderCandidates = listProjectPluginPackageCandidates('UltiUnrealRenderBridge', '5.7.0')
    .map((candidate) => path.normalize(candidate.packageDir));
  assert.ok(renderCandidates.some((candidate) => (
    candidate.endsWith(path.normalize(path.join('plugins', 'Rendu', 'UltiUnrealRenderBridge', 'UE5.7')))
  )));
  assert.ok(renderCandidates.some((candidate) => (
    candidate.endsWith(path.normalize(path.join('plugins', 'UE5.7', 'UltiUnrealRenderBridge')))
  )));
  const render58Candidates = listProjectPluginPackageCandidates('UltiUnrealRenderBridge', '5.8.0')
    .map((candidate) => path.normalize(candidate.packageDir));
  assert.ok(render58Candidates.some((candidate) => (
    candidate.endsWith(path.normalize(path.join('plugins', 'Rendu', 'UltiUnrealRenderBridge', 'UE5.8')))
  )));

  const unsupportedCandidates = listProjectPluginPackageCandidates('UU_Camera', '5.9.0')
    .map((candidate) => path.normalize(candidate.packageDir));
  assert.equal(unsupportedCandidates.some((candidate) => candidate.includes('UE5.8')), false);
});

test('resolveProjectPluginStatus detects installed live plugin and uproject activation', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-plugin-status-'));
  const projectDir = path.join(tmpRoot, 'MyProject');
  const pluginDir = path.join(projectDir, 'Plugins', 'UU_Texture');
  fs.mkdirSync(pluginDir, { recursive: true });
  const uprojectPath = path.join(projectDir, 'MyProject.uproject');
  fs.writeFileSync(path.join(pluginDir, 'UltiUnrealTexture.uplugin'), '{}\n', 'utf8');
  fs.writeFileSync(
    uprojectPath,
    `${JSON.stringify({ Plugins: [{ Name: 'UltiUnrealTexture', Enabled: true }] }, null, 2)}\n`,
    'utf8',
  );

  const status = resolveProjectPluginStatus({ uproject: uprojectPath, engineVersion: '5.7.0' }, 'UU_Texture');
  assert.equal(status.ok, true);
  assert.equal(status.installedInProject, true);
  assert.equal(status.enabledInProject, true);
  assert.equal(status.ready, true);
  assert.equal(status.projectInstalledPluginDir, pluginDir);
});

test('resolveProjectPluginStatus accepts enabled Marketplace live plugins without a project copy', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-plugin-marketplace-'));
  const projectDir = path.join(tmpRoot, 'MarketplaceProject');
  fs.mkdirSync(projectDir, { recursive: true });
  const uprojectPath = path.join(projectDir, 'MarketplaceProject.uproject');
  fs.writeFileSync(
    uprojectPath,
    `${JSON.stringify({
      Plugins: [{
        Name: 'UltiUnrealCamera',
        Enabled: true,
        MarketplaceURL: 'com.epicgames.launcher://ue/Fab/product/example',
      }],
    }, null, 2)}\n`,
    'utf8',
  );

  const status = resolveProjectPluginStatus(
    { uproject: uprojectPath, engineVersion: '5.7.0' },
    'UU_Camera',
  );
  assert.equal(status.installedInProject, false);
  assert.equal(status.declaredInProject, true);
  assert.equal(status.enabledInProject, true);
  assert.equal(status.marketplaceReference, true);
  assert.equal(status.availableInProject, true);
  assert.equal(status.installationSource, 'marketplace');
  assert.equal(status.ready, true);
});

test('resolveProjectPluginStatus keeps a missing non-Marketplace plugin unavailable', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uu-plugin-missing-'));
  const projectDir = path.join(tmpRoot, 'MissingProject');
  fs.mkdirSync(projectDir, { recursive: true });
  const uprojectPath = path.join(projectDir, 'MissingProject.uproject');
  fs.writeFileSync(
    uprojectPath,
    `${JSON.stringify({ Plugins: [{ Name: 'UltiUnrealCamera', Enabled: true }] }, null, 2)}\n`,
    'utf8',
  );

  const status = resolveProjectPluginStatus(
    { uproject: uprojectPath, engineVersion: '5.7.0' },
    'UU_Camera',
  );
  assert.equal(status.installedInProject, false);
  assert.equal(status.marketplaceReference, false);
  assert.equal(status.availableInProject, false);
  assert.equal(status.ready, false);
});
