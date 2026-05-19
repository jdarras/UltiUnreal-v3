import { useRenderQueueDerivedData } from "./queue/useRenderQueueDerivedData";
import { useRenderQueueSelection } from "./queue/useRenderQueueSelection";
import { useRenderQueueSorting } from "./queue/useRenderQueueSorting";
import { useRenderQueueLaunch } from "./queue/useRenderQueueLaunch";
import {
  buildRenderQueueDerivedDataInput,
  buildRenderQueueLaunchInput,
  buildRenderQueueSelectionInput,
  buildRenderQueueSortingInput,
} from "./queue/buildRenderQueueControllerInputs";
import { buildRenderQueueControllerOutput } from "./queue/buildRenderQueueControllerOutput";

export function useRenderQueueController({
  t,
  tasks = [],
  renders = [],
  renderWorkers = [],
  searchQuery = "",
  queueSortKey = "startAt",
  queueSortDir = "asc",
  queueRuntimeMode = "active",
  setQueueSortKey = null,
  setQueueSortDir = null,
  onCreateRender = null,
  onDispatchRenders = null,
  canLaunchRendersForUser = false,
}) {
  const derived = useRenderQueueDerivedData(
    buildRenderQueueDerivedDataInput({
      t,
      tasks,
      renders,
      renderWorkers,
      searchQuery,
      queueSortKey,
      queueSortDir,
    })
  );

  const { filteredRenderQueueTasks, sortedRenderQueueTasks, getQueueEntryLaunchMeta } = derived;

  const selection = useRenderQueueSelection(
    buildRenderQueueSelectionInput({
      filteredRenderQueueTasks,
      getQueueEntryLaunchMeta,
    })
  );

  const { setSelectedQueueTaskIds } = selection;

  const sorting = useRenderQueueSorting(
    buildRenderQueueSortingInput({
      queueSortKey,
      queueSortDir,
      setQueueSortKey,
      setQueueSortDir,
    })
  );

  const launch = useRenderQueueLaunch(
    buildRenderQueueLaunchInput({
      t,
      onCreateRender,
      onDispatchRenders,
      setSelectedQueueTaskIds,
      canLaunchRendersForUser,
      queueRuntimeMode,
      sortedRenderQueueTasks,
      getQueueEntryLaunchMeta,
    })
  );

  return buildRenderQueueControllerOutput({
    derived,
    selection,
    sorting,
    launch,
  });
}
