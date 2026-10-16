import test from "node:test";
import assert from "node:assert/strict";

import { runTaskEditAutosaveCycle } from "../../app/screens/postproduction/renderEditor/hooks/editor/taskEditorAutosaveHelpers.js";

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function newState() {
  return { signature: "", inFlight: false, pendingArgs: null };
}

// Simule un rendu React : chaque rendu fournit sa propre fermeture sur le formulaire.
function makeCycle(stateRef, title, { onUpdateTask, editingTaskId = 1 }) {
  return () => runTaskEditAutosaveCycle({
    showCreateForm: true,
    isEditingTask: true,
    editingTaskId,
    editAutosaveStateRef: stateRef,
    onUpdateTask,
    buildTaskPayloadFromCurrentForm: () => ({ ok: true, taskPayload: { title } }),
  });
}

test("a change made while a save is in flight is saved afterwards", async () => {
  const stateRef = { current: newState() };
  const firstSave = deferred();
  const saved = [];
  const onUpdateTask = async (_id, payload) => {
    saved.push(payload.title);
    if (saved.length === 1) await firstSave.promise;
    return true;
  };
  const oldCycle = makeCycle(stateRef, "old", { onUpdateTask });
  const newCycle = makeCycle(stateRef, "new", { onUpdateTask });

  const first = oldCycle();
  await newCycle();
  firstSave.resolve();
  await first;
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(saved, ["old", "new"]);
  assert.equal(stateRef.current.signature, JSON.stringify({ title: "new" }));
});

test("only the latest pending change is saved after the in-flight one", async () => {
  const stateRef = { current: newState() };
  const firstSave = deferred();
  const saved = [];
  const onUpdateTask = async (_id, payload) => {
    saved.push(payload.title);
    if (saved.length === 1) await firstSave.promise;
    return true;
  };

  const first = makeCycle(stateRef, "v1", { onUpdateTask })();
  await makeCycle(stateRef, "v2", { onUpdateTask })();
  await makeCycle(stateRef, "v3", { onUpdateTask })();
  firstSave.resolve();
  await first;
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(saved, ["v1", "v3"]);
});

test("a pending change is dropped when the editor switched to another task", async () => {
  const stateRef = { current: newState() };
  const firstSave = deferred();
  const saved = [];
  const onUpdateTask = async (id, payload) => {
    saved.push([id, payload.title]);
    if (saved.length === 1) await firstSave.promise;
    return true;
  };

  const first = makeCycle(stateRef, "old", { onUpdateTask, editingTaskId: 1 })();
  await makeCycle(stateRef, "new", { onUpdateTask, editingTaskId: 1 })();
  stateRef.current = newState();
  firstSave.resolve();
  await first;
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(saved, [[1, "old"]]);
});

test("an unchanged form is not saved twice", async () => {
  const stateRef = { current: newState() };
  const saved = [];
  const onUpdateTask = async (_id, payload) => { saved.push(payload.title); return true; };

  await makeCycle(stateRef, "same", { onUpdateTask })();
  await makeCycle(stateRef, "same", { onUpdateTask })();

  assert.deepEqual(saved, ["same"]);
});

test("returning to the already saved value while another save is in flight is saved", async () => {
  const stateRef = { current: newState() };
  const bSave = deferred();
  const saved = [];
  const onUpdateTask = async (_id, payload) => {
    saved.push(payload.title);
    if (payload.title === "B") await bSave.promise;
    return true;
  };

  await makeCycle(stateRef, "A", { onUpdateTask })();
  const inFlightB = makeCycle(stateRef, "B", { onUpdateTask })();
  await makeCycle(stateRef, "A", { onUpdateTask })();
  bSave.resolve();
  await inFlightB;
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(saved, ["A", "B", "A"]);
  assert.equal(stateRef.current.signature, JSON.stringify({ title: "A" }));
});
