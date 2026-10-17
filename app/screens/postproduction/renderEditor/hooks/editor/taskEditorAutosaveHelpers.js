function toPayloadSignature(payload) {
  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}

async function runTaskEditAutosaveCycle(args = {}) {
  const {
    showCreateForm = false,
    isEditingTask = false,
    allowAutosave = true,
    onUpdateTask = null,
    tasksLoading = false,
    buildTaskPayloadFromCurrentForm = null,
    editAutosaveStateRef = null,
    editingTaskId = 0,
    setFormError = null,
  } = args;
  if (!showCreateForm || !isEditingTask || typeof onUpdateTask !== "function") return;
  if (allowAutosave !== true) return;
  if (tasksLoading || typeof buildTaskPayloadFromCurrentForm !== "function") return;
  const built = buildTaskPayloadFromCurrentForm();
  if (!built?.ok) return;

  const signature = toPayloadSignature(built.taskPayload);
  if (!signature || !editAutosaveStateRef?.current) return;

  const state = editAutosaveStateRef.current;
  if (state.inFlight) {
    // Mémorise les paramètres du dernier appel : ils portent le formulaire à jour,
    // y compris un retour à la valeur déjà sauvegardée avant l'envoi en cours.
    state.pendingArgs = args;
    return;
  }
  if (state.signature === signature) return;

  state.inFlight = true;
  try {
    const saved = await Promise.resolve(onUpdateTask(editingTaskId, built.taskPayload));
    if (saved !== false) {
      state.signature = signature;
      if (typeof setFormError === "function") setFormError("");
    }
  } finally {
    state.inFlight = false;
    const pendingArgs = state.pendingArgs;
    state.pendingArgs = null;
    // Relance seulement si l'éditeur est toujours sur la même tâche (état non réinitialisé).
    if (pendingArgs && editAutosaveStateRef.current === state) {
      void runTaskEditAutosaveCycle(pendingArgs);
    }
  }
}

export {
  toPayloadSignature,
  runTaskEditAutosaveCycle,
};
