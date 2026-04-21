import { useCallback, useMemo, useState } from "react";
import { safeT } from "../../shared/helpers";
import { RendersQueueHeader } from "./queue/RendersQueueHeader";
import { RendersQueueTable } from "./queue/RendersQueueTable";

function normalizeRenderStatus(value = "") {
  return String(value || "").trim().toLowerCase();
}

function resolveQueueRenderId(queueEntry = null) {
  const renderIdRaw = Number(
    queueEntry?.linkedRender?.id
    || queueEntry?.linkedRenderId
    || 0
  );
  return Number.isFinite(renderIdRaw) && renderIdRaw > 0 ? Math.trunc(renderIdRaw) : 0;
}

function resolveQueueEntryTaskId(queueEntry = null) {
  const taskIdRaw = Number(queueEntry?.task?.id || 0);
  return Number.isFinite(taskIdRaw) && taskIdRaw > 0 ? Math.trunc(taskIdRaw) : 0;
}

function resolveQueueEntryOrderValue(queueEntry = null) {
  const queueOrderRaw = Number(queueEntry?.linkedRender?.queueOrder);
  return Number.isFinite(queueOrderRaw) ? Math.trunc(queueOrderRaw) : null;
}

function resolveQueueEntryTimestamp(queueEntry = null) {
  const task = queueEntry?.task && typeof queueEntry.task === "object" ? queueEntry.task : {};
  const linkedRender = queueEntry?.linkedRender && typeof queueEntry.linkedRender === "object"
    ? queueEntry.linkedRender
    : {};
  const candidates = [
    linkedRender?.scheduledAt,
    linkedRender?.createdAt,
    linkedRender?.updatedAt,
    task?.scheduledAt,
    task?.createdAt,
    task?.updatedAt,
  ];
  for (const candidate of candidates) {
    const timestamp = Date.parse(String(candidate || "").trim());
    if (Number.isFinite(timestamp) && timestamp > 0) return timestamp;
  }
  return 0;
}

function compareQueueEntriesByQueueOrder(a, b) {
  const queueOrderA = resolveQueueEntryOrderValue(a);
  const queueOrderB = resolveQueueEntryOrderValue(b);
  if (queueOrderA != null || queueOrderB != null) {
    if (queueOrderA != null && queueOrderB != null && queueOrderA !== queueOrderB) {
      return queueOrderA - queueOrderB;
    }
    if (queueOrderA != null && queueOrderB == null) return -1;
    if (queueOrderA == null && queueOrderB != null) return 1;
  }
  const timestampA = resolveQueueEntryTimestamp(a);
  const timestampB = resolveQueueEntryTimestamp(b);
  if (timestampA !== timestampB) return timestampA - timestampB;
  return resolveQueueEntryTaskId(a) - resolveQueueEntryTaskId(b);
}

function isQueueEntryReorderable(queueEntry = null) {
  const renderId = resolveQueueRenderId(queueEntry);
  if (renderId <= 0) return false;
  const linkedStatus = normalizeRenderStatus(queueEntry?.linkedRender?.status);
  return linkedStatus === "queued";
}

function RendersQueuePanel({
  t,
  tasksLoading = false,
  rendersLoading = false,
  renderQueueTasks = [],
  filteredRenderQueueTasks = [],
  sortedRenderQueueTasks = [],
  launchableQueueTaskIdSet = new Set(),
  queueStateSummary = { waiting: 0, running: 0, error: 0 },
  queueBatchError = "",
  queueBatchFeedback = "",
  queueSortKey = "startAt",
  queueSortDir = "asc",
  queueRuntimeMode = "active",
  queueSortIndicator = null,
  canLaunchRenders = false,
  busyScheduledTaskId = 0,
  queueEntryWorkerLabel = null,
  getQueueEntryLaunchMeta = null,
  onSetQueueRuntimeMode = null,
  onToggleQueueSort = null,
  onLaunchScheduledTaskRender = null,
  onEditQueueTask = null,
  onDeleteQueueTask = null,
  onRequestOpenTasks = null,
  onReorderRenders = null,
}) {
  const [queueReorderBusy, setQueueReorderBusy] = useState(false);
  const queueTaskCount = Array.isArray(renderQueueTasks) ? renderQueueTasks.length : 0;
  const queueFilteredCount = Array.isArray(filteredRenderQueueTasks) ? filteredRenderQueueTasks.length : 0;
  const queueVisibleEntries = useMemo(() => {
    if (Array.isArray(filteredRenderQueueTasks) && filteredRenderQueueTasks.length > 0) return filteredRenderQueueTasks;
    return Array.isArray(sortedRenderQueueTasks) ? sortedRenderQueueTasks : [];
  }, [filteredRenderQueueTasks, sortedRenderQueueTasks]);

  const reorderableEntries = useMemo(() => (
    [...queueVisibleEntries]
      .filter(isQueueEntryReorderable)
      .sort(compareQueueEntriesByQueueOrder)
  ), [queueVisibleEntries]);

  const reorderableIndexByRenderId = useMemo(() => {
    const out = new Map();
    reorderableEntries.forEach((entry, index) => {
      const renderId = resolveQueueRenderId(entry);
      if (renderId > 0) out.set(renderId, index);
    });
    return out;
  }, [reorderableEntries]);

  const canMoveQueueEntry = useCallback((queueEntry, direction = 0) => {
    const renderId = resolveQueueRenderId(queueEntry);
    if (renderId <= 0 || !isQueueEntryReorderable(queueEntry)) return false;
    const index = reorderableIndexByRenderId.get(renderId);
    if (!Number.isFinite(index)) return false;
    const dir = Number(direction);
    if (dir < 0) return index > 0;
    if (dir > 0) return index < reorderableEntries.length - 1;
    return false;
  }, [reorderableEntries.length, reorderableIndexByRenderId]);

  const moveQueueEntry = useCallback(async (queueEntry, direction = 0) => {
    if (queueReorderBusy || typeof onReorderRenders !== "function") return false;
    const renderId = resolveQueueRenderId(queueEntry);
    if (renderId <= 0 || !isQueueEntryReorderable(queueEntry)) return false;
    const fromIndex = reorderableIndexByRenderId.get(renderId);
    if (!Number.isFinite(fromIndex)) return false;
    const dir = Number(direction);
    const toIndex = dir < 0 ? fromIndex - 1 : (dir > 0 ? fromIndex + 1 : fromIndex);
    if (toIndex < 0 || toIndex >= reorderableEntries.length || toIndex === fromIndex) return false;

    const reordered = [...reorderableEntries];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const order = reordered
      .map((entry, idx) => {
        const id = resolveQueueRenderId(entry);
        if (!Number.isFinite(id) || id <= 0) return null;
        return { id, queueOrder: idx };
      })
      .filter(Boolean);
    if (order.length <= 0) return false;

    // Règle UX: le réordonnancement manuel est toujours affiché en "Ordre" croissant.
    if ((queueSortKey !== "startAt" || queueSortDir !== "asc") && typeof onToggleQueueSort === "function") {
      onToggleQueueSort("startAt");
    }

    setQueueReorderBusy(true);
    try {
      await Promise.resolve(onReorderRenders(order));
      return true;
    } catch {
      return false;
    } finally {
      setQueueReorderBusy(false);
    }
  }, [
    onReorderRenders,
    onToggleQueueSort,
    queueReorderBusy,
    queueSortDir,
    queueSortKey,
    reorderableEntries,
    reorderableIndexByRenderId,
  ]);

  return (
    <div className="uu-card mt-12">
      <RendersQueueHeader
        t={t}
        renderQueueTasks={renderQueueTasks}
        filteredRenderQueueTasks={filteredRenderQueueTasks}
        launchableQueueTaskIdSet={launchableQueueTaskIdSet}
        queueStateSummary={queueStateSummary}
        canLaunchRenders={canLaunchRenders}
        queueRuntimeMode={queueRuntimeMode}
        onSetQueueRuntimeMode={onSetQueueRuntimeMode}
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
          busyScheduledTaskId={busyScheduledTaskId}
          rendersLoading={rendersLoading}
          canLaunchRenders={canLaunchRenders}
          queueEntryWorkerLabel={queueEntryWorkerLabel}
          getQueueEntryLaunchMeta={getQueueEntryLaunchMeta}
          queueRuntimeMode={queueRuntimeMode}
          queueSortIndicator={queueSortIndicator}
          onToggleQueueSort={onToggleQueueSort}
          onLaunchScheduledTaskRender={onLaunchScheduledTaskRender}
          onEditQueueTask={onEditQueueTask}
          onDeleteQueueTask={onDeleteQueueTask}
          onRequestOpenTasks={onRequestOpenTasks}
          queueReorderBusy={queueReorderBusy}
          canMoveQueueEntry={canMoveQueueEntry}
          onMoveQueueEntry={moveQueueEntry}
        />
      ) : null}
    </div>
  );
}

export { RendersQueuePanel };
