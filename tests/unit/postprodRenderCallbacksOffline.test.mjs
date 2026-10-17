// V3 : véritable callback de création de rendu, compilé avec esbuild ; seuls
// React et le transport réseau sont remplacés. La file est le magasin
// synchrone réellement utilisé par l'application.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { build } from "esbuild";

import { createSyncedOutbox } from "../../app/utils/postprodOutboxStore.js";
import { normalizePostprodOfflineOutbox } from "../../app/utils/postprodOutboxHelpers.js";

const entry = "app/hooks/usePostprodRenderCallbacks.js";

async function loadHook() {
  const source = fs.readFileSync(entry, "utf8");
  const imports = [...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)];
  const agentNames = imports.find((m) => m[2] === "../utils/agent")[1].split(",").map((x) => x.trim()).filter(Boolean);
  const compiled = await build({
    entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", logLevel: "silent",
    plugins: [{
      name: "test-mocks",
      setup(b) {
        b.onResolve({ filter: /^(react|\.\.\/utils\/agent)$/ }, (args) => ({ path: args.path, namespace: "mock" }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
          contents: args.path === "react"
            ? "export const useCallback = (f) => f;"
            : agentNames.map((n) => `export const ${n} = (...args) => globalThis.callAgent('${n}', ...args);`).join("\n"),
        }));
      },
    }],
  });
  const context = {
    module: { exports: {} },
    console,
    callAgent: async (name) => {
      if (name === "postprodCreateRender") throw new Error("network offline");
      return {};
    },
  };
  vm.runInNewContext(compiled.outputFiles[0].text, context);
  return context.module.exports.usePostprodRenderCallbacks;
}

function pendingRequests(count) {
  return Array.from({ length: count }, (_, i) => ({ id: `old-${i}`, kind: "create_render", payload: {} }));
}

test("V3: two simultaneous offline submissions with 99 pending: one queued, one refused, messages match", async () => {
  const usePostprodRenderCallbacks = await loadHook();
  const store = createSyncedOutbox({ initial: pendingRequests(99), normalize: normalizePostprodOfflineOutbox });
  const notices = [];
  const hook = usePostprodRenderCallbacks({
    postprodAuth: { token: "test", user: { id: 1 } },
    postprodRenderWorkers: { items: [] },
    tryUpdatePostprodOfflineOutbox: (decide) => store.tryUpdate(decide),
    setPostprodRenders: () => {},
    t: (key) => key,
    showNotice: (message, kind) => notices.push({ message, kind }),
  });

  await Promise.all([
    hook.handlePostprodCreateRender({ name: "A" }),
    hook.handlePostprodCreateRender({ name: "B" }),
  ]);

  assert.equal(store.get().length, 100);
  assert.equal(store.get()[0].id, "old-0");
  assert.equal(notices.filter((n) => n.message === "postprod.renders.msg.queuedOffline").length, 1);
  assert.equal(notices.filter((n) => n.message === "postprod.renders.msg.offlineQueueFull").length, 1);
});
