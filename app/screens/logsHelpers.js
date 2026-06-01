const LEVELS = ['success', 'info', 'warn', 'error', 'debug'];

const BASE_ACTION_FILTERS = [
  { id: 'all', labelKey: 'logs.filters.all' },
  { id: 'widget_press', labelKey: 'logs.filters.widget' },
  { id: 'sync', labelKey: 'logs.filters.sync' },
  { id: 'wrc', labelKey: 'logs.filters.wrc' },
];

function parseTsMs(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const numericValue = Number(raw);
  if (Number.isFinite(numericValue)) {
    if (numericValue > 0 && numericValue < 1e12) return Math.trunc(numericValue * 1000);
    return Math.trunc(numericValue);
  }
  const dateValue = new Date(raw);
  const timestampMs = dateValue.getTime();
  return Number.isFinite(timestampMs) ? timestampMs : null;
}

function formatTs(ts) {
  try {
    const timestampMs = parseTsMs(ts);
    if (timestampMs === null) return String(ts || '');
    const dateValue = new Date(timestampMs);
    const pad = (n) => String(n).padStart(2, '0');
    const ms = String(dateValue.getMilliseconds()).padStart(3, '0');
    return `${dateValue.getFullYear()}-${pad(dateValue.getMonth() + 1)}-${pad(dateValue.getDate())} ${pad(dateValue.getHours())}:${pad(dateValue.getMinutes())}:${pad(dateValue.getSeconds())}.${ms}`;
  } catch {
    return ts;
  }
}

function addLocalTs(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const withMeta = list.map((entry, index) => {
    const tsRaw = entry?.ts ?? entry?.timestamp ?? entry?.time ?? '';
    return {
      ...entry,
      tsLocal: formatTs(tsRaw),
      _tsMs: parseTsMs(tsRaw) ?? 0,
      _idx: index,
    };
  });
  withMeta.sort((a, b) => {
    if (a._tsMs !== b._tsMs) return a._tsMs - b._tsMs;
    return a._idx - b._idx;
  });
  return withMeta.map(({ _tsMs, _idx, ...entry }) => entry);
}

function buildLogsActionOptions({
  items,
  actionFilter,
  t,
  baseActionFilters = BASE_ACTION_FILTERS,
}) {
  const baseIds = new Set(baseActionFilters.map((entry) => entry.id));
  let hasWidget = false;
  let hasSync = false;
  let hasWrc = false;
  const dynamicActionSet = new Set();

  items.forEach((entry) => {
    const actionValue = String(entry?.action || '').trim();
    if (!actionValue) return;
    dynamicActionSet.add(actionValue);
    if (actionValue === 'widget_press') hasWidget = true;
    if (actionValue.startsWith('sync_')) hasSync = true;
    if (actionValue.startsWith('wrc_')) hasWrc = true;
  });

  if (actionFilter && !baseIds.has(actionFilter)) {
    dynamicActionSet.add(actionFilter);
  }

  const base = baseActionFilters
    .filter((entry) => {
      if (entry.id === 'all') return true;
      if (entry.id === actionFilter) return true;
      if (entry.id === 'widget_press') return hasWidget;
      if (entry.id === 'sync') return hasSync;
      if (entry.id === 'wrc') return hasWrc;
      return true;
    })
    .map((entry) => ({
      id: entry.id,
      label: t(entry.labelKey),
    }));

  const dynamic = Array.from(dynamicActionSet)
    .filter((id) => !baseIds.has(id))
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({ id, label: id }));

  return [...base, ...dynamic];
}

function buildItemsWithHaystack(items) {
  return items.map((entry) => ({
    ...entry,
    _haystack: [
      entry.level,
      entry.src,
      entry.host,
      entry.action,
      entry.message,
      JSON.stringify(entry.data || {}),
    ].join(' ').toLowerCase(),
  }));
}

function filterLogsItems({
  itemsWithHaystack,
  levelFilter,
  text,
  actionFilter,
  fromAtLocal,
  toAtLocal,
}) {
  const query = String(text || '').trim().toLowerCase();
  const fromMs = fromAtLocal ? new Date(fromAtLocal).getTime() : null;
  const toMs = toAtLocal ? new Date(toAtLocal).getTime() : null;

  return itemsWithHaystack.filter((entry) => {
    if (!levelFilter.has(String(entry.level || 'info'))) return false;
    if (fromMs !== null && (entry._tsMs ?? 0) < fromMs) return false;
    if (toMs !== null && (entry._tsMs ?? 0) > toMs) return false;

    const actionValue = String(entry.action || '');
    if (actionFilter === 'widget_press' && actionValue !== 'widget_press') return false;
    if (actionFilter === 'sync' && !actionValue.startsWith('sync_')) return false;
    if (actionFilter === 'wrc' && !actionValue.startsWith('wrc_')) return false;
    if (actionFilter !== 'all' && actionFilter !== 'widget_press' && actionFilter !== 'sync' && actionFilter !== 'wrc') {
      if (actionValue !== actionFilter) return false;
    }

    if (!query) return true;
    return entry._haystack.includes(query);
  });
}

export {
  LEVELS,
  BASE_ACTION_FILTERS,
  parseTsMs,
  formatTs,
  addLocalTs,
  buildLogsActionOptions,
  buildItemsWithHaystack,
  filterLogsItems,
};
