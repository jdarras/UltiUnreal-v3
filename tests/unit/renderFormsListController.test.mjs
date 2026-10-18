// Véritable contrôleur de la liste des formulaires de rendu, compilé avec
// esbuild ; seul React est remplacé par des hooks qui mémorisent réellement
// leurs valeurs entre deux rendus (comparaison des dépendances).
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { build } from "esbuild";

const entry = "app/screens/postproduction/catalogs/hooks/useRenderFormsListController.js";

const REACT_MOCK = `
const slots = []; let index = 0;
globalThis.beginRender = () => { index = 0; };
const sameDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length
  && a.every((value, i) => Object.is(value, b[i]));
export function useMemo(compute, deps) {
  const slot = slots[index++];
  if (slot && sameDeps(slot.deps, deps)) return slot.value;
  const value = compute();
  slots[index - 1] = { deps, value };
  return value;
}
export function useCallback(fn, deps) { return useMemo(() => fn, deps); }
`;

async function loadController() {
  const compiled = await build({
    entryPoints: [entry], bundle: true, write: false, platform: "node", format: "cjs", logLevel: "silent",
    plugins: [{
      name: "react-mock",
      setup(b) {
        b.onResolve({ filter: /^react$/ }, () => ({ path: "react", namespace: "mock" }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, () => ({ contents: REACT_MOCK }));
      },
    }],
  });
  const context = { module: { exports: {} } };
  context.globalThis = context;
  vm.runInNewContext(compiled.outputFiles[0].text, context);
  const hook = context.module.exports.useRenderFormsListController;
  return (props) => {
    context.beginRender();
    return hook(props);
  };
}

test("searching by project name follows project labels that arrive after the first render", async () => {
  const render = await loadController();
  const props = {
    renderForms: [{ id: 1, name: "Formulaire A", projectName: "proj1", isActive: true }],
    formsSearchQuery: "projet soleil",
    formsSearchAdvanced: {},
    formsFavorites: {},
  };

  const before = render({ ...props, projectOptions: [] });
  const after = render({ ...props, projectOptions: [{ ref: "proj1", label: "Projet Soleil", name: "Projet Soleil" }] });

  assert.equal(before.sortedForms.length, 0);
  // Avant correction, le résultat mémorisé du premier rendu restait affiché (0).
  assert.deepEqual(Array.from(after.sortedForms, (form) => form.id), [1]);
});
