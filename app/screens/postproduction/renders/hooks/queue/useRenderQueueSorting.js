import { useCallback } from "react";
import { sortIndicator as sortArrowIndicator } from "../../../shared/helpers";

export function useRenderQueueSorting({
  queueSortKey = "startAt",
  queueSortDir = "asc",
  setQueueSortKey = null,
  setQueueSortDir = null,
} = {}) {
  const queueSortIndicator = useCallback((key) => (
    sortArrowIndicator(key, queueSortKey, queueSortDir, true)
  ), [queueSortDir, queueSortKey]);

  const toggleQueueSort = useCallback((key) => {
    const normalized = String(key || "").trim();
    if (!normalized) return;
    if (queueSortKey === normalized) {
      if (typeof setQueueSortDir === "function") {
        setQueueSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      }
      return;
    }
    if (typeof setQueueSortKey === "function") {
      setQueueSortKey(normalized);
    }
    if (typeof setQueueSortDir === "function") {
      setQueueSortDir("asc");
    }
  }, [queueSortKey, setQueueSortDir, setQueueSortKey]);

  return {
    queueSortIndicator,
    toggleQueueSort,
  };
}
