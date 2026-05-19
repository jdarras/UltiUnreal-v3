import { useMemo } from "react";
import { toSortTimestamp } from "./taskListUtils";
import {
  compareTasksBySortKey,
  TASK_LIST_ALLOWED_SORT_KEYS,
} from "./taskListSortingHelpers";

export function useTaskListSorting({
  filteredTasks = [],
  listSortKey = "updatedAt",
  listSortDir = "desc",
  setListSortKey = null,
  setListSortDir = null,
  taskRenderStateByTaskId = new Map(),
  resolveTaskVisualStatus = () => "",
  taskExpectedRenderName = () => "",
  taskRenderWorkerLabel = () => "",
} = {}) {
  const displayedTasks = useMemo(() => {
    const list = [...filteredTasks];
    list.sort((a, b) => {
      let cmp = compareTasksBySortKey({
        a,
        b,
        listSortKey,
        taskRenderStateByTaskId,
        resolveTaskVisualStatus,
        taskExpectedRenderName,
        taskRenderWorkerLabel,
      });
      if (cmp === 0) {
        cmp = String(a?.title || "").toLowerCase().localeCompare(String(b?.title || "").toLowerCase());
      }
      if (cmp === 0) {
        cmp = toSortTimestamp(a?.updatedAt) - toSortTimestamp(b?.updatedAt);
      }
      return listSortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [
    filteredTasks,
    listSortKey,
    listSortDir,
    taskRenderStateByTaskId,
    resolveTaskVisualStatus,
    taskExpectedRenderName,
    taskRenderWorkerLabel,
  ]);

  function setListSortFromSelect(valueRaw) {
    const raw = String(valueRaw || "").trim();
    const [modeRaw, dirRaw] = raw.split(":");
    const mode = String(modeRaw || "").trim();
    const dir = String(dirRaw || "").trim().toLowerCase();
    if (
      TASK_LIST_ALLOWED_SORT_KEYS.has(mode)
    ) {
      setListSortKey?.(mode);
    }
    if (dir === "asc" || dir === "desc") {
      setListSortDir?.(dir);
    }
  }

  function toggleListSort(nextKey) {
    const key = String(nextKey || "").trim();
    if (!key) return;
    if (listSortKey === key) {
      setListSortDir?.((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setListSortKey?.(key);
    setListSortDir?.(
      key === "title"
      || key === "status"
      || key === "renderName"
      || key === "renderWorker"
        ? "asc"
        : "desc"
    );
  }

  return {
    displayedTasks,
    setListSortFromSelect,
    toggleListSort,
  };
}
