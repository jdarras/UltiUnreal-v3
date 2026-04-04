import { useState } from "react";
import { readStorageString } from "../../shared/storage";
import { useDebouncedLocalStorage } from "../../shared/useDebouncedLocalStorage";

const STORAGE_KEYS = Object.freeze({
  view: "uu_postprod_users_view",
  listSortMode: "uu_postprod_users_list_sort_mode",
  listSortDir: "uu_postprod_users_list_sort_dir",
});

export function useUsersPreferences({
  allowedSortColumns = [],
  defaultViewMode = "list",
  defaultSortMode = "lastName",
  defaultSortDir = "asc",
} = {}) {
  const [viewMode, setViewMode] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.view).trim().toLowerCase();
    if (raw === "thumbs" || raw === "list") return raw;
    if (raw === "cards") return "thumbs";
    return defaultViewMode;
  });

  const [listSortMode, setListSortMode] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.listSortMode).trim();
    if (Array.isArray(allowedSortColumns) && allowedSortColumns.includes(raw)) return raw;
    return defaultSortMode;
  });

  const [listSortDir, setListSortDir] = useState(() => {
    const raw = readStorageString(STORAGE_KEYS.listSortDir).trim().toLowerCase();
    if (raw === "asc" || raw === "desc") return raw;
    return defaultSortDir;
  });

  useDebouncedLocalStorage(STORAGE_KEYS.view, String(viewMode || defaultViewMode), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortMode, String(listSortMode || defaultSortMode), 180);
  useDebouncedLocalStorage(STORAGE_KEYS.listSortDir, String(listSortDir || defaultSortDir), 180);

  return {
    viewMode,
    setViewMode,
    listSortMode,
    setListSortMode,
    listSortDir,
    setListSortDir,
  };
}

export default useUsersPreferences;
