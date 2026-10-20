// Rattrapage des aperçus manquants : seuls les rendus terminés sans aperçu
// valide sont repris, jamais deux fois en même temps, et un échec n'est pas
// retenté en boucle.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createProxyRecoveryLoop,
  endProxyGeneration,
  selectRendersMissingProxy,
  tryBeginProxyGeneration,
} = require('../../main/render-proxy-recovery.cjs');

const row = (id, status, payload = {}, outputPath = `D:/out/${id}.mp4`) => ({
  id, status, output_path: outputPath, payload_json: JSON.stringify(payload),
});
const existing = new Set(['D:/out/2.proxy.mp4']);
const fileExists = (p) => existing.has(p);

test('only finished renders without a usable preview are selected', () => {
  const rows = [
    row(1, 'Done'),
    row(2, 'Done', { proxyPath: 'D:/out/2.proxy.mp4' }),
    row(3, 'Done', { proxyPath: 'D:/out/3.proxy.mp4' }),
    row(4, 'Running'),
    row(5, 'Failed'),
    row(6, 'Done', {}, ''),
    row(7, 'Done', {}, 'D:/out/{{name}}.mp4'),
  ];
  const ids = selectRendersMissingProxy(rows, { fileExists }).map((r) => r.id);
  assert.deepEqual(ids, [1, 3]);
});

test('a preview being generated is never started a second time', () => {
  assert.equal(tryBeginProxyGeneration(10), true);
  assert.equal(tryBeginProxyGeneration(10), false);
  assert.deepEqual(selectRendersMissingProxy([row(10, 'Done')], { fileExists }), []);
  endProxyGeneration(10);
  assert.equal(selectRendersMissingProxy([row(10, 'Done')], { fileExists }).length, 1);
});

test('the loop recovers missing previews one by one and does not retry a failure', async () => {
  const calls = [];
  const loop = createProxyRecoveryLoop({
    listRows: () => [row(20, 'Done'), row(21, 'Done'), row(22, 'Done', {}, 'D:/out/22.wav')],
    isProxyEnabled: () => true,
    regenerate: async (r) => {
      calls.push(r.id);
      if (r.id === 20) return { ok: true, regenerated: 1, failed: 0 };
      if (r.id === 21) return { ok: true, regenerated: 0, failed: 1 };
      return { ok: true, regenerated: 0, failed: 0, skipped: 1 };
    },
    fileExists,
  });

  assert.deepEqual(await loop.runOnce(), { recovered: 1, failed: 1 });
  assert.deepEqual(await loop.runOnce(), { recovered: 0, failed: 0 });
  assert.deepEqual(calls, [20, 21, 22]);
});

test('nothing is generated when previews are disabled', async () => {
  let called = false;
  const loop = createProxyRecoveryLoop({
    listRows: () => [row(30, 'Done')],
    isProxyEnabled: () => false,
    regenerate: async () => { called = true; },
    fileExists,
  });
  await loop.runOnce();
  assert.equal(called, false);
});

test('the generation registry refuses a second reservation until it is released', async () => {
  // Contrat utilisé par la régénération manuelle (server.cjs) et la fin de rendu.
  assert.equal(tryBeginProxyGeneration(40), true);
  try {
    assert.equal(tryBeginProxyGeneration(40), false);
  } finally {
    endProxyGeneration(40);
  }
  assert.equal(tryBeginProxyGeneration(40), true);
  endProxyGeneration(40);
});
