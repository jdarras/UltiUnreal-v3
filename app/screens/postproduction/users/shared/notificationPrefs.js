function normalizeNotificationPrefsCategories(input) {
  const values = Array.isArray(input)
    ? input
    : String(input || "")
      .split(/[,\n;]+/g)
      .map((entry) => String(entry || "").trim());
  const dedup = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(normalized);
  }
  return dedup;
}

const DEFAULT_NOTIFICATION_PREFS = Object.freeze({
  email: true,
  inApp: true,
  categories: [],
});

function parseNotificationPrefs(value) {
  let parsed = value;
  if (typeof parsed === "string") {
    const trimmed = String(parsed || "").trim();
    if (!trimmed) {
      parsed = {};
    } else {
      try {
        parsed = JSON.parse(trimmed);
      } catch {
        parsed = {};
      }
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    parsed = {};
  }
  return {
    email: parsed.email !== false,
    inApp: parsed.inApp !== false,
    categories: normalizeNotificationPrefsCategories(parsed.categories),
  };
}

function stringifyNotificationPrefs(value) {
  const prefs = parseNotificationPrefs(value);
  return JSON.stringify({
    email: prefs.email !== false,
    inApp: prefs.inApp !== false,
    categories: normalizeNotificationPrefsCategories(prefs.categories),
  });
}

export {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefsCategories,
  parseNotificationPrefs,
  stringifyNotificationPrefs,
};

export default {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefsCategories,
  parseNotificationPrefs,
  stringifyNotificationPrefs,
};
