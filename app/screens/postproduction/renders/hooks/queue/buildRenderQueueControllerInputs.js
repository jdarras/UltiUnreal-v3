function buildRenderQueueDerivedDataInput({
  t,
  tasks = [],
  renders = [],
  renderWorkers = [],
  searchQuery = "",
  queueSortKey = "startAt",
  queueSortDir = "asc",
} = {}) {
  return {
    t,
    tasks,
    renders,
    renderWorkers,
    searchQuery,
    queueSortKey,
    queueSortDir,
  };
}

function buildRenderQueueSelectionInput({
  filteredRenderQueueTasks = [],
  getQueueEntryLaunchMeta = null,
} = {}) {
  return {
    filteredRenderQueueTasks,
    getQueueEntryLaunchMeta,
  };
}

function buildRenderQueueSortingInput({
  queueSortKey = "startAt",
  queueSortDir = "asc",
  setQueueSortKey = null,
  setQueueSortDir = null,
} = {}) {
  return {
    queueSortKey,
    queueSortDir,
    setQueueSortKey,
    setQueueSortDir,
  };
}

function buildRenderQueueLaunchInput({
  t,
  onCreateRender = null,
  onDispatchRenders = null,
  setSelectedQueueTaskIds = null,
  canLaunchRendersForUser = false,
  queueRuntimeMode = "active",
  sortedRenderQueueTasks = [],
  getQueueEntryLaunchMeta = null,
} = {}) {
  return {
    t,
    onCreateRender,
    onDispatchRenders,
    setSelectedQueueTaskIds,
    canLaunchRendersForUser,
    queueRuntimeMode,
    sortedRenderQueueTasks,
    getQueueEntryLaunchMeta,
  };
}

export {
  buildRenderQueueDerivedDataInput,
  buildRenderQueueSelectionInput,
  buildRenderQueueSortingInput,
  buildRenderQueueLaunchInput,
};

export default buildRenderQueueDerivedDataInput;
