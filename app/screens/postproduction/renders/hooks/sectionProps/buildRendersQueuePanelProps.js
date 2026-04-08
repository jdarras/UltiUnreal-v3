import { buildProps } from "../../../shared/objectProps";

const DIRECT_KEYS = [
  "t",
  "tasksLoading",
  "rendersLoading",
  "renderQueueTasks",
  "filteredRenderQueueTasks",
  "sortedRenderQueueTasks",
  "selectedQueueEntrySet",
  "launchableQueueTaskIdSet",
  "selectedLaunchableQueueEntries",
  "queueStateSummary",
  "queueBatchBusyMode",
  "queueBatchError",
  "queueBatchFeedback",
  "queueSortIndicator",
  "canLaunchRenders",
  "busyScheduledTaskId",
  "queueEntryWorkerLabel",
  "getQueueEntryLaunchMeta",
  "queueTaskPriorityLabel",
];

const ALIASES = {
  onToggleSelectAllQueueEntries: "toggleSelectAllQueueEntries",
  onToggleQueueSort: "toggleQueueSort",
  onToggleQueueTaskSelection: "toggleQueueTaskSelection",
  onOpenRenderDetail: "openRenderDetail",
};

function buildQueuePanelProps(input = {}) {
  const launchQueueBatch = input?.launchQueueBatch;
  const launchScheduledTaskRender = input?.launchScheduledTaskRender;

  return {
    ...buildProps(input, {
      keys: DIRECT_KEYS,
      aliases: ALIASES,
    }),
    onLaunchQueueBatch: (entries) => {
      if (typeof launchQueueBatch === "function") void launchQueueBatch(entries);
    },
    onLaunchScheduledTaskRender: (task, queueEntry) => {
      if (typeof launchScheduledTaskRender === "function") {
        void launchScheduledTaskRender(task, queueEntry);
      }
    },
  };
}

export {
  buildQueuePanelProps,
};

export default buildQueuePanelProps;
