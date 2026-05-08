const LS_POSTPROD_OFFLINE_OUTBOX_KEY = 'uu_postprod_offline_outbox_v1';
const LS_POSTPROD_WORKER_COMPLETION_OUTBOX_KEY = 'uu_postprod_worker_completion_outbox_v1';
const MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS = 100;
const MAX_POSTPROD_WORKER_COMPLETION_OUTBOX_ITEMS = 200;

function normalizePostprodOfflineOutbox(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  const normalized = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const id = String(raw?.id || '').trim();
    const kind = String(raw?.kind || '').trim().toLowerCase();
    if (!id || kind !== 'create_render') continue;
    const payload = raw?.payload && typeof raw.payload === 'object' ? raw.payload : {};
    const userIdRaw = Number(raw?.userId || 0);
    const userId = Number.isFinite(userIdRaw) && userIdRaw > 0 ? Math.trunc(userIdRaw) : null;
    const attemptsRaw = Number(raw?.attempts || 0);
    normalized.push({
      id,
      kind: 'create_render',
      userId,
      payload,
      createdAt: String(raw?.createdAt || '').trim(),
      attempts: Number.isFinite(attemptsRaw) && attemptsRaw > 0 ? Math.trunc(attemptsRaw) : 0,
      lastAttemptAt: String(raw?.lastAttemptAt || '').trim(),
      lastError: String(raw?.lastError || '').trim(),
    });
  }
  if (normalized.length <= MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS) return normalized;
  return normalized.slice(normalized.length - MAX_POSTPROD_OFFLINE_OUTBOX_ITEMS);
}

function readPostprodOfflineOutbox() {
  try {
    const raw = localStorage.getItem(LS_POSTPROD_OFFLINE_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizePostprodOfflineOutbox(parsed);
  } catch {
    return [];
  }
}

function writePostprodOfflineOutbox(entries = []) {
  try {
    const normalized = normalizePostprodOfflineOutbox(entries);
    if (normalized.length <= 0) {
      localStorage.removeItem(LS_POSTPROD_OFFLINE_OUTBOX_KEY);
      return;
    }
    localStorage.setItem(
      LS_POSTPROD_OFFLINE_OUTBOX_KEY,
      JSON.stringify(normalized, null, 2)
    );
  } catch {}
}

function normalizePostprodWorkerCompletionOutbox(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  const normalized = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const id = String(raw?.id || '').trim();
    const kind = String(raw?.kind || '').trim().toLowerCase();
    const workerKey = String(raw?.workerKey || '').trim();
    const renderIdRaw = Number(raw?.renderId || 0);
    const renderId = Number.isFinite(renderIdRaw) && renderIdRaw > 0 ? Math.trunc(renderIdRaw) : 0;
    if (!id || kind !== 'worker_complete' || !workerKey || renderId <= 0) continue;
    const payload = raw?.payload && typeof raw.payload === 'object' ? raw.payload : {};
    const userIdRaw = Number(raw?.userId || 0);
    const userId = Number.isFinite(userIdRaw) && userIdRaw > 0 ? Math.trunc(userIdRaw) : null;
    const attemptsRaw = Number(raw?.attempts || 0);
    normalized.push({
      id,
      kind: 'worker_complete',
      workerKey,
      renderId,
      userId,
      payload,
      createdAt: String(raw?.createdAt || '').trim(),
      attempts: Number.isFinite(attemptsRaw) && attemptsRaw > 0 ? Math.trunc(attemptsRaw) : 0,
      lastAttemptAt: String(raw?.lastAttemptAt || '').trim(),
      lastError: String(raw?.lastError || '').trim(),
    });
  }
  if (normalized.length <= MAX_POSTPROD_WORKER_COMPLETION_OUTBOX_ITEMS) return normalized;
  return normalized.slice(normalized.length - MAX_POSTPROD_WORKER_COMPLETION_OUTBOX_ITEMS);
}

function readPostprodWorkerCompletionOutbox() {
  try {
    const raw = localStorage.getItem(LS_POSTPROD_WORKER_COMPLETION_OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return normalizePostprodWorkerCompletionOutbox(parsed);
  } catch {
    return [];
  }
}

function writePostprodWorkerCompletionOutbox(entries = []) {
  try {
    const normalized = normalizePostprodWorkerCompletionOutbox(entries);
    if (normalized.length <= 0) {
      localStorage.removeItem(LS_POSTPROD_WORKER_COMPLETION_OUTBOX_KEY);
      return;
    }
    localStorage.setItem(
      LS_POSTPROD_WORKER_COMPLETION_OUTBOX_KEY,
      JSON.stringify(normalized, null, 2)
    );
  } catch {}
}

function isPostprodRecoverableOfflineError(err) {
  const status = Number(err?.status || 0);
  if (!Number.isFinite(status) || status === 0) return true;
  if (status >= 500 && status <= 599) return true;
  const code = String(err?.code || '').trim().toLowerCase();
  if (!code && status <= 0) return true;
  if (code === 'postprod_unavailable') return true;
  const message = String(err?.message || '').trim().toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('abort')
  );
}

export {
  normalizePostprodOfflineOutbox,
  readPostprodOfflineOutbox,
  writePostprodOfflineOutbox,
  normalizePostprodWorkerCompletionOutbox,
  readPostprodWorkerCompletionOutbox,
  writePostprodWorkerCompletionOutbox,
  isPostprodRecoverableOfflineError,
};
