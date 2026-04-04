import { safeT } from "../../shared/helpers";
import { RendersQueueHeader } from "./queue/RendersQueueHeader";
import { RendersQueueTable } from "./queue/RendersQueueTable";

function RendersQueuePanel({
  t,
  tasksLoading = false,
  rendersLoading = false,
  renderQueueTasks = [],
  filteredRenderQueueTasks = [],
  sortedRenderQueueTasks = [],
  selectedQueueEntrySet = new Set(),
  launchableQueueTaskIdSet = new Set(),
  selectedLaunchableQueueEntries = [],
  queueStateSummary = { waiting: 0, running: 0, error: 0 },
  queueBatchBusyMode = "",
  queueBatchError = "",
  queueBatchFeedback = "",
  queueSortIndicator = null,
  canLaunchRenders = false,
  busyScheduledTaskId = 0,
  queueEntryWorkerLabel = null,
  getQueueEntryLaunchMeta = null,
  queueTaskPriorityLabel = null,
  onToggleSelectAllQueueEntries = null,
  onLaunchQueueBatch = null,
  onToggleQueueSort = null,
  onToggleQueueTaskSelection = null,
  onLaunchScheduledTaskRender = null,
  onOpenRenderDetail = null,
}) {
  const queueTaskCount = Array.isArray(renderQueueTasks) ? renderQueueTasks.length : 0;
  const queueFilteredCount = Array.isArray(filteredRenderQueueTasks) ? filteredRenderQueueTasks.length : 0;

  return (
    <div className="uu-card mt-12">
      <RendersQueueHeader
        t={t}
        renderQueueTasks={renderQueueTasks}
        filteredRenderQueueTasks={filteredRenderQueueTasks}
        selectedQueueEntrySet={selectedQueueEntrySet}
        launchableQueueTaskIdSet={launchableQueueTaskIdSet}
        queueStateSummary={queueStateSummary}
        tasksLoading={tasksLoading}
        rendersLoading={rendersLoading}
        queueBatchBusyMode={queueBatchBusyMode}
        selectedLaunchableQueueEntries={selectedLaunchableQueueEntries}
        canLaunchRenders={canLaunchRenders}
        onToggleSelectAllQueueEntries={onToggleSelectAllQueueEntries}
        onLaunchQueueBatch={onLaunchQueueBatch}
      />
      {queueBatchError ? <div className="uu-msg warn mt-12">{queueBatchError}</div> : null}
      {queueBatchFeedback ? <div className="uu-msg ok mt-12">{queueBatchFeedback}</div> : null}
      {tasksLoading ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.renders.queue.loading", "Chargement de la file d'attente...")}</div>
      ) : null}
      {!tasksLoading && queueTaskCount <= 0 ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.renders.queue.empty", "Aucun rendu en attente.")}</div>
      ) : null}
      {!tasksLoading && queueTaskCount > 0 && queueFilteredCount <= 0 ? (
        <div className="uu-muted mt-12">{safeT(t, "postprod.renders.queue.noResults", "Aucune tache de la file ne correspond aux filtres.")}</div>
      ) : null}
      {!tasksLoading && queueFilteredCount > 0 ? (
        <RendersQueueTable
          t={t}
          sortedRenderQueueTasks={sortedRenderQueueTasks}
          selectedQueueEntrySet={selectedQueueEntrySet}
          busyScheduledTaskId={busyScheduledTaskId}
          rendersLoading={rendersLoading}
          canLaunchRenders={canLaunchRenders}
          queueEntryWorkerLabel={queueEntryWorkerLabel}
          getQueueEntryLaunchMeta={getQueueEntryLaunchMeta}
          queueTaskPriorityLabel={queueTaskPriorityLabel}
          queueSortIndicator={queueSortIndicator}
          onToggleQueueSort={onToggleQueueSort}
          onToggleQueueTaskSelection={onToggleQueueTaskSelection}
          onLaunchScheduledTaskRender={onLaunchScheduledTaskRender}
          onOpenRenderDetail={onOpenRenderDetail}
        />
      ) : null}
    </div>
  );
}

export { RendersQueuePanel };
