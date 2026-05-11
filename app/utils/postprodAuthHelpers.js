const LS_POSTPROD_AUTH_KEY = 'uu_postprod_auth';
const LS_POSTPROD_RENDERS_QUEUE_RUNTIME_MODE_KEY = 'uu_postprod_renders_validation_queue_runtime_mode';

function readPostprodAuth() {
  try {
    const raw = localStorage.getItem(LS_POSTPROD_AUTH_KEY);
    if (!raw) return { token: '', user: null, expiresAt: '' };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { token: '', user: null, expiresAt: '' };
    return {
      token: String(parsed.token || '').trim(),
      user: parsed.user && typeof parsed.user === 'object' ? parsed.user : null,
      expiresAt: String(parsed.expiresAt || '').trim(),
    };
  } catch {
    return { token: '', user: null, expiresAt: '' };
  }
}

function writePostprodAuth(next = null) {
  try {
    if (!next || typeof next !== 'object' || !next.token) {
      localStorage.removeItem(LS_POSTPROD_AUTH_KEY);
      return;
    }
    localStorage.setItem(LS_POSTPROD_AUTH_KEY, JSON.stringify({
      token: String(next.token || '').trim(),
      user: next.user && typeof next.user === 'object' ? next.user : null,
      expiresAt: String(next.expiresAt || '').trim(),
    }, null, 2));
  } catch {}
}

function isPostprodQueueRuntimeActive() {
  try {
    const raw = String(localStorage.getItem(LS_POSTPROD_RENDERS_QUEUE_RUNTIME_MODE_KEY) || "").trim().toLowerCase();
    return raw !== "paused";
  } catch {
    return true;
  }
}

export {
  LS_POSTPROD_RENDERS_QUEUE_RUNTIME_MODE_KEY,
  readPostprodAuth,
  writePostprodAuth,
  isPostprodQueueRuntimeActive,
};
