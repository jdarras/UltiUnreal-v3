import { normalizeMultiFilterValues } from "./filterValues";
import { readStorageString } from "./storage";

function readEnumStorage(key, allowedSet, fallback) {
  const raw = readStorageString(key).trim();
  return allowedSet.has(raw) ? raw : fallback;
}

function readEnumLowerStorage(key, allowedSet, fallback) {
  const raw = readStorageString(key).trim().toLowerCase();
  return allowedSet.has(raw) ? raw : fallback;
}

function readMultiFilterStorage(key) {
  const raw = readStorageString(key).trim();
  if (!raw || raw.toLowerCase() === "all") return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return normalizeMultiFilterValues(parsed);
  } catch {}
  return normalizeMultiFilterValues([raw]);
}

function serializeMultiFilterStorage(value = []) {
  return JSON.stringify(normalizeMultiFilterValues(value));
}

export {
  readEnumLowerStorage,
  readEnumStorage,
  readMultiFilterStorage,
  serializeMultiFilterStorage,
};
