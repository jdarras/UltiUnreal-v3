import { useCallback, useMemo } from "react";
import { sortIndicator as sortArrowIndicator } from "../../../shared/helpers";
import {
  compareRendersBySortKey,
  RENDER_LIST_ALLOWED_SORT_KEYS,
  toSortTimestamp,
} from "./renderListUtils";

export function useRenderListSorting({
  displayedRenders = [],
  listSortKey = "updatedAt",
  listSortDir = "desc",
  setListSortKey = null,
  setListSortDir = null,
} = {}) {
  const toggleListSort = useCallback((key) => {
    const normalized = String(key || "").trim();
    if (!normalized) return;
    if (listSortKey === normalized) {
      if (typeof setListSortDir === "function") {
        setListSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      }
      return;
    }
    if (typeof setListSortKey === "function") {
      setListSortKey(normalized);
    }
    if (typeof setListSortDir === "function") {
      setListSortDir(normalized === "updatedAt" ? "desc" : "asc");
    }
  }, [listSortKey, setListSortDir, setListSortKey]);

  const setListSortFromSelect = useCallback((valueRaw) => {
    const raw = String(valueRaw || "").trim();
    const [nextKeyRaw, nextDirRaw] = raw.split(":");
    const nextKey = String(nextKeyRaw || "").trim();
    const nextDir = String(nextDirRaw || "").trim().toLowerCase();
    const key = RENDER_LIST_ALLOWED_SORT_KEYS.has(nextKey) ? nextKey : "updatedAt";
    const dir = nextDir === "asc" ? "asc" : "desc";
    if (typeof setListSortKey === "function") {
      setListSortKey(key);
    }
    if (typeof setListSortDir === "function") {
      setListSortDir(dir);
    }
  }, [setListSortDir, setListSortKey]);

  const listSortIndicator = useCallback((key) => (
    sortArrowIndicator(key, listSortKey, listSortDir, true)
  ), [listSortDir, listSortKey]);

  const sortedDisplayedRenders = useMemo(() => {
    const list = [...displayedRenders];
    const dir = listSortDir === "asc" ? 1 : -1;

    list.sort((a, b) => {
      let cmp = compareRendersBySortKey(a, b, listSortKey);
      if (cmp === 0) {
        cmp = toSortTimestamp(a?.updatedAt) - toSortTimestamp(b?.updatedAt);
      }
      if (cmp === 0) {
        cmp = Number(a?.id || 0) - Number(b?.id || 0);
      }
      return cmp * dir;
    });
    return list;
  }, [displayedRenders, listSortDir, listSortKey]);

  return {
    sortedDisplayedRenders,
    listSortIndicator,
    toggleListSort,
    setListSortFromSelect,
  };
}
