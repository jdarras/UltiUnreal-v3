// Rafraîchissement automatique de l'onglet Rendus (toutes les 10 s) : tous les
// chargements sont silencieux. Un indicateur « Chargement… » affiché à chaque
// cycle faisait sauter la page.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";

const entry = "app/hooks/usePostprodTabRefreshPolling.js";

async function loadHook() {
  const compiled = await build({
    entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", logLevel: "silent",
    plugins: [{
      name: "test-mocks",
      setup(b) {
        b.onResolve({ filter: /^(react|\.\/postprodAsyncLoop)$/ }, (args) => ({ path: args.path, namespace: "mock" }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
          contents: args.path === "react"
            ? "export const useCallback = (f) => f; export const useEffect = (f) => { f(); };"
            : "export const startPostprodAsyncLoop = (o) => { globalThis.loops.push(o); return () => {}; };",
        }));
      },
    }],
  });
  const context = { module: { exports: {} }, loops: [] };
  context.globalThis = context;
  vm.runInNewContext(compiled.outputFiles[0].text, context);
  return { hook: context.module.exports.usePostprodTabRefreshPolling, loops: context.loops };
}

const LOADERS = [
  "loadPostprodUsers", "loadPostprodMyActivity", "loadPostprodRoles", "loadPostprodTasks",
  "loadPostprodTaskCatalog", "loadPostprodProjects", "loadPostprodResources", "loadPostprodRenderTemplates",
  "loadPostprodRenderWorkers", "loadPostprodRenderForms", "loadPostprodRenders", "loadPostprodRenderProjectCatalog",
  "loadPostprodAudit", "loadPostprodRenderHealth", "loadPostprodUserAlerts",
];

test("the 10-second refresh of the Renders tab never shows a loading indicator", async () => {
  const { hook, loops } = await loadHook();
  const calls = [];
  const loaders = Object.fromEntries(LOADERS.map((name) => [name, async (options) => {
    calls.push({ name, silent: options?.silent === true });
  }]));
  hook({
    appMode: "postprod", postprodAuthenticated: true, current: "Rendus", postprodRefreshMs: 5000,
    postprodCanManageUsers: true, postprodCanManageRoles: true,
    postprodCanManageRenderTemplates: true, postprodCanAccessResources: true,
    postprodTaskFormOpen: false, postprodUserEditorOpen: false,
    ...loaders,
  });

  const rendersLoop = loops.find((loop) => loop.intervalMs === 10000);
  assert.ok(rendersLoop, "boucle de 10 s de l'onglet Rendus");
  await rendersLoop.tick();

  assert.ok(calls.some((call) => call.name === "loadPostprodRenderForms"));
  assert.ok(calls.some((call) => call.name === "loadPostprodRenderHealth"));
  assert.deepEqual(calls.filter((call) => !call.silent).map((call) => call.name), []);
});
