export function safeT(t, key, fallback, params) {
  if (typeof t !== "function") return fallback;
  const value = t(key, params);
  if (!value || value === key) return fallback;
  return value;
}
