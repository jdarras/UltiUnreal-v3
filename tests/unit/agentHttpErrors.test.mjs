import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';

const compiled = await build({
  entryPoints: ['app/utils/agentHttp.js'],
  bundle: true, write: false, platform: 'node', format: 'cjs', logLevel: 'silent',
  plugins: [{
    name: 'identity',
    setup(b) {
      b.onResolve({ filter: /^\.\/identity$/ }, () => ({ path: 'identity', namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: 'export const readIdentity = () => ({role:"client",serverIp:"192.0.2.1"});',
      }));
    },
  }],
});

for (const bridge of [false, true]) {
  test(`station refusal is readable for GET, POST and generic requests (${bridge ? 'Electron' : 'fetch'})`, async () => {
    const text = JSON.stringify({ error: 'station_not_registered' });
    const response = { ok: false, status: 403, text, error: 'HTTP 403' };
    const context = {
      module: { exports: {} }, AbortController, setTimeout, clearTimeout,
      window: { electron: bridge ? {
        httpGet: async () => response, httpJson: async () => response,
      } : undefined },
      fetch: async () => ({ ...response, text: async () => text }),
    };
    vm.runInNewContext(compiled.outputFiles[0].text, context);
    const api = context.module.exports;
    for (const call of [() => api.httpGet('/agent/hosts'), () => api.httpPost('/agent/host/test')]) {
      await assert.rejects(call(), (error) => {
        assert.match(error.message, /Station non ajoutée/);
        assert.equal(error.code, 'station_not_registered');
        assert.equal(error.status, 403);
        return true;
      });
    }
    assert.match(api.toRequestError(await api.httpRequest('/agent/hosts')).message, /Station non ajoutée/);
    assert.match(api.__toAgentError({ code: 'station_not_registered', status: 403 }).message, /Station non ajoutée/);
    assert.equal(api.toRequestError({ status: 403, text: 'not JSON' }).message, 'HTTP 403');
    assert.equal(api.toRequestError({ status: 500, text: '{"message":"Failure"}' }).message, 'Failure');
  });
}
