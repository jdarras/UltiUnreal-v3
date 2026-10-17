export const EMPTY_COMMON = {
  refreshSec: '',
  logWarnLines: 1500,
  logHardLimitLines: 2000,
  auditWarnLines: 5000,
  auditHardLimitLines: 10000,
  renderOutputDir: '',
  proxyEnabled: false,
  proxyResolution: 50,
  proxyCrf: 23,
  renderExportDestinations: [],
  rcHttpPort: '',
  rcWsPort: '',
  wrcMaxAttempts: 10,
  wrcRetryDelaySec: 3,
  startLayoutSendDelaySec: 3,
  fabResourcesEnabled: false,
  showUnrealLaunchButtons: false,
  allowStartDesynced: false,
  useStartLayout: false,
};

export const APP_MODE_POSTPROD = 'postprod';
const PROXY_RESOLUTION_ALLOWED = new Set([25, 50, 75]);
const PROXY_CRF_ALLOWED = new Set([18, 23, 28]);

export function sanitizeExportDestinationId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function buildExportDestinationId(name = '', pathValue = '', index = 0) {
  const byName = sanitizeExportDestinationId(name);
  if (byName) return byName;
  const byPath = sanitizeExportDestinationId(String(pathValue || '').replace(/[\\/]+/g, '-'));
  if (byPath) return byPath;
  return `dest-${Math.max(1, Number(index) + 1)}`;
}

export function normalizeExportDestinations(value, fallback = [], options = {}) {
  const keepEmpty = options && typeof options === 'object' && options.keepEmpty === true;
  const src = Array.isArray(value)
    ? value
    : (Array.isArray(fallback) ? fallback : []);
  const out = [];
  const seen = new Set();
  for (let index = 0; index < src.length; index += 1) {
    const entry = src[index];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const destinationPath = String(entry.path || entry.destinationPath || entry.dir || '').trim();
    if (!destinationPath && !keepEmpty) continue;
    const name = String(entry.name || entry.label || entry.title || '').trim();
    const id = sanitizeExportDestinationId(
      entry.id
      || entry.destinationId
      || buildExportDestinationId(name, destinationPath, index)
    );
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name: name || id,
      path: destinationPath,
      isActive: entry.isActive !== false && entry.enabled !== false,
    });
  }
  return out;
}

export function normalizeProxyResolution(value, fallback = 50) {
  const n = Number(value);
  const normalized = Number.isFinite(n) ? Math.trunc(n) : Math.trunc(Number(fallback) || 50);
  return PROXY_RESOLUTION_ALLOWED.has(normalized) ? normalized : 50;
}

export function normalizeProxyCrf(value, fallback = 23) {
  const n = Number(value);
  const normalized = Number.isFinite(n) ? Math.trunc(n) : Math.trunc(Number(fallback) || 23);
  return PROXY_CRF_ALLOWED.has(normalized) ? normalized : 23;
}

export function normalizeInterfaceLanguage(value) {
  return String(value || '').trim().toLowerCase() === 'en' ? 'en' : 'fr';
}

export function formatDateTime(value, lang) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const locale = lang === 'en' ? 'en-US' : 'fr-FR';
  return date.toLocaleString(locale, { hour12: false });
}

export function normalizePathKey(p) {
  return String(p || '')
    .trim()
    .replace(/\\/g, '/')
    .toLowerCase();
}

export function normalizeProjectRoots(list = []) {
  const out = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach((val) => {
    const raw = String(val || '').trim();
    if (!raw) return;
    const key = raw.replace(/\\/g, '/').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(raw);
  });
  return out;
}

export function parseNotificationPrefsObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }
  const raw = String(value || '').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

export function resolveShowFabResourcesPreference(value) {
  const parsed = parseNotificationPrefsObject(value);
  return parsed?.showFabResources !== false;
}
