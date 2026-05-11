import { useCallback, useEffect, useMemo, useState } from "react";

export function useRenderQueueSelection({
  filteredRenderQueueTasks = [],
  getQueueEntryLaunchMeta = () => ({ canLaunchFromQueue: false }),
} = {}) {
  const [selectedQueueTaskIds, setSelectedQueueTaskIds] = useState([]);

  const launchableQueueTaskIdSet = useMemo(() => (
    new Set(
      filteredRenderQueueTasks
        .filter((entry) => getQueueEntryLaunchMeta(entry).canLaunchFromQueue)
        .map((entry) => Number(entry?.task?.id || 0))
        .filter((id) => Number.isFinite(id) && id > 0)
        .map((id) => Math.trunc(id))
    )
  ), [filteredRenderQueueTasks, getQueueEntryLaunchMeta]);

  useEffect(() => {
    setSelectedQueueTaskIds((prev) => {
      const current = (Array.isArray(prev) ? prev : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
        .map((id) => Math.trunc(id));
      const next = current.filter((id) => launchableQueueTaskIdSet.has(id));
      if (current.length === next.length && current.every((id, index) => id === next[index])) {
        return prev;
      }
      return next;
    });
  }, [launchableQueueTaskIdSet]);

  const selectedQueueEntrySet = useMemo(() => (
    new Set(
      (Array.isArray(selectedQueueTaskIds) ? selectedQueueTaskIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
        .map((id) => Math.trunc(id))
    )
  ), [selectedQueueTaskIds]);

  const selectedQueueEntries = useMemo(() => (
    filteredRenderQueueTasks.filter((entry) => {
      const taskId = Number(entry?.task?.id || 0);
      return Number.isFinite(taskId) && taskId > 0 && selectedQueueEntrySet.has(Math.trunc(taskId));
    })
  ), [filteredRenderQueueTasks, selectedQueueEntrySet]);

  const selectedLaunchableQueueEntries = useMemo(
    () => selectedQueueEntries.filter((entry) => getQueueEntryLaunchMeta(entry).canLaunchFromQueue),
    [selectedQueueEntries, getQueueEntryLaunchMeta]
  );

  const allLaunchableQueueEntriesSelected = useMemo(() => (
    launchableQueueTaskIdSet.size > 0
    && selectedQueueEntrySet.size > 0
    && selectedQueueEntrySet.size === launchableQueueTaskIdSet.size
  ), [launchableQueueTaskIdSet, selectedQueueEntrySet]);

  const toggleQueueTaskSelection = useCallback((taskIdRaw) => {
    const taskId = Number(taskIdRaw);
    if (!Number.isFinite(taskId) || taskId <= 0) return;
    const normalizedTaskId = Math.trunc(taskId);
    if (!launchableQueueTaskIdSet.has(normalizedTaskId)) return;
    setSelectedQueueTaskIds((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      if (current.some((id) => Number(id) === normalizedTaskId)) {
        return current.filter((id) => Number(id) !== normalizedTaskId);
      }
      return [...current, normalizedTaskId];
    });
  }, [launchableQueueTaskIdSet]);

  const toggleSelectAllQueueEntries = useCallback(() => {
    if (allLaunchableQueueEntriesSelected) {
      setSelectedQueueTaskIds([]);
      return;
    }
    setSelectedQueueTaskIds(
      [...launchableQueueTaskIdSet]
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
        .map((id) => Math.trunc(id))
    );
  }, [allLaunchableQueueEntriesSelected, launchableQueueTaskIdSet]);

  return {
    selectedQueueTaskIds,
    setSelectedQueueTaskIds,
    selectedQueueEntrySet,
    launchableQueueTaskIdSet,
    selectedLaunchableQueueEntries,
    toggleQueueTaskSelection,
    toggleSelectAllQueueEntries,
  };
}

export default useRenderQueueSelection;
