export function readStorageString(key, fallback = "") {
  try {
    if (typeof window === "undefined") return String(fallback ?? "");
    return String(window.localStorage.getItem(String(key || "")) || String(fallback ?? ""));
  } catch {
    return String(fallback ?? "");
  }
}

export function readStorageBoolean(key, fallback = false) {
  const raw = readStorageString(key, fallback ? "true" : "false").trim().toLowerCase();
  return raw === "true";
}

export function readStorageJsonObject(key, fallback = {}) {
  try {
    if (typeof window === "undefined") return fallback && typeof fallback === "object" ? fallback : {};
    const raw = window.localStorage.getItem(String(key || ""));
    if (!raw) return fallback && typeof fallback === "object" ? fallback : {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {}
  return fallback && typeof fallback === "object" ? fallback : {};
}
