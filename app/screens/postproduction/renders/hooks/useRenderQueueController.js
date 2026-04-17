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
  setQueueSortKey = null,
  setQueueSortDir = null,
  onCreateRender = null,
  onDispatchRenders = null,
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

  const { filteredRenderQueueTasks, getQueueEntryLaunchMeta } = derived;

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
    })
  );

  return buildRenderQueueControllerOutput({
    derived,
    selection,
    sorting,
    launch,
  });
}

export default useRenderQueueController;
