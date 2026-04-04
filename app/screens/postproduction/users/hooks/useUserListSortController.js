import { useCallback } from "react";
import { USER_LIST_SORT_COLUMNS } from "../userSharedHelpers";

function useUserListSortController({
  listSortMode = "lastName",
  setListSortMode = null,
  listSortDir = "asc",
  setListSortDir = null,
}) {
  const handleListSort = useCallback((column) => {
    const nextColumn = String(column || "").trim();
    if (!USER_LIST_SORT_COLUMNS.includes(nextColumn)) return;
    if (nextColumn === listSortMode) {
      setListSortDir?.((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setListSortMode?.(nextColumn);
    if (nextColumn === "isActive") {
      setListSortDir?.("desc");
    } else {
      setListSortDir?.("asc");
    }
  }, [listSortMode, setListSortDir, setListSortMode]);

  const listSortArrowFor = useCallback((column) => {
    const col = String(column || "").trim();
    if (col !== listSortMode) return "";
    return listSortDir === "asc" ? "▲" : "▼";
  }, [listSortMode, listSortDir]);

  return {
    handleListSort,
    listSortArrowFor,
  };
}

export { useUserListSortController };
