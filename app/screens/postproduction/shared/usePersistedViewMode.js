import { useState } from "react";
import { readStorageString } from "./storage";
import { useDebouncedLocalStorage } from "./useDebouncedLocalStorage";

export function usePersistedViewMode({
  storageKey = "",
  allowedModes = [],
  fallbackMode = "thumbs",
  writeDelayMs = 180,
} = {}) {
  const normalizedStorageKey = String(storageKey || "").trim();
  const allowed = Array.isArray(allowedModes) && allowedModes.length > 0
    ? allowedModes
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
    : [String(fallbackMode || "thumbs").trim().toLowerCase()].filter(Boolean);
  const fallback = String(fallbackMode || "thumbs").trim().toLowerCase() || "thumbs";
  const allowedSet = new Set(allowed);

  const [viewMode, setViewMode] = useState(() => {
    const raw = readStorageString(normalizedStorageKey).trim().toLowerCase();
    if (raw && allowedSet.has(raw)) return raw;
    return fallback;
  });

  useDebouncedLocalStorage(normalizedStorageKey, String(viewMode || fallback), writeDelayMs);

  return {
    viewMode,
    setViewMode,
  };
}
