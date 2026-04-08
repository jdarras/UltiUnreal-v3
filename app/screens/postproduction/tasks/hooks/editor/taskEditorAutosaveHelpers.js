function toPayloadSignature(payload) {
  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}

async function runTaskEditAutosaveCycle({
  showCreateForm = false,
  isEditingTask = false,
  onUpdateTask = null,
  tasksLoading = false,
  buildTaskPayloadFromCurrentForm = null,
  editAutosaveStateRef = null,
  editingTaskId = 0,
  setFormError = null,
  rerun = null,
} = {}) {
  if (!showCreateForm || !isEditingTask || typeof onUpdateTask !== "function") return;
  if (tasksLoading || typeof buildTaskPayloadFromCurrentForm !== "function") return;
  const built = buildTaskPayloadFromCurrentForm();
  if (!built?.ok) return;

  const signature = toPayloadSignature(built.taskPayload);
  if (!signature || !editAutosaveStateRef?.current) return;

  const state = editAutosaveStateRef.current;
  if (state.signature === signature) return;
  if (state.inFlight) {
    state.pending = true;
    return;
  }

  state.inFlight = true;
  try {
    const saved = await Promise.resolve(onUpdateTask(editingTaskId, built.taskPayload));
    if (saved !== false) {
      state.signature = signature;
      if (typeof setFormError === "function") setFormError("");
    }
  } finally {
    state.inFlight = false;
    if (state.pending) {
      state.pending = false;
      if (typeof rerun === "function") void rerun();
    }
  }
}

export {
  toPayloadSignature,
  runTaskEditAutosaveCycle,
};

export default runTaskEditAutosaveCycle;
