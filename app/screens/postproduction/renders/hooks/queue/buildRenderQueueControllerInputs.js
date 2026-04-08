function buildRenderQueueDerivedDataInput({
  t,
  tasks = [],
  renders = [],
  renderWorkers = [],
  searchQuery = "",
  queueSortKey = "status",
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
  queueSortKey = "status",
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
} = {}) {
  return {
    t,
    onCreateRender,
    onDispatchRenders,
    setSelectedQueueTaskIds,
  };
}

export {
  buildRenderQueueDerivedDataInput,
  buildRenderQueueSelectionInput,
  buildRenderQueueSortingInput,
  buildRenderQueueLaunchInput,
};

export default buildRenderQueueDerivedDataInput;
