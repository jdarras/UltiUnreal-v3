export function summarizeQueueStates({
  renderQueueTasks = [],
  getQueueEntryLaunchMeta = () => ({ renderState: "waiting" }),
} = {}) {
  let waiting = 0;
  let running = 0;
  let error = 0;
  for (const entry of renderQueueTasks) {
    const state = String(getQueueEntryLaunchMeta(entry).renderState || "").trim().toLowerCase();
    if (state === "running") {
      running += 1;
    } else if (state === "error") {
      error += 1;
    } else {
      waiting += 1;
    }
  }
  return { waiting, running, error };
}

export default summarizeQueueStates;
