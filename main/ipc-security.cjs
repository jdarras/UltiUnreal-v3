'use strict';

const ALLOWED_EXTERNAL_PROTOCOLS = new Set([
  'http:',
  'https:',
  'mailto:',
  'com.epicgames.launcher:',
]);

function parseUrl(value, { maxLength = 8192 } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return { ok: false, error: 'missing_url', url: null, raw: '' };
  if (raw.length > maxLength) return { ok: false, error: 'url_too_long', url: null, raw };
  if (/[\r\n]/.test(raw)) return { ok: false, error: 'invalid_url', url: null, raw };
  try {
    return { ok: true, error: '', url: new URL(raw), raw };
  } catch {
    return { ok: false, error: 'invalid_url', url: null, raw };
  }
}

function validateExternalTarget(value) {
  const parsed = parseUrl(value);
  if (!parsed.ok) return parsed;
  const protocol = String(parsed.url.protocol || '').toLowerCase();
  if (!ALLOWED_EXTERNAL_PROTOCOLS.has(protocol)) {
    return { ...parsed, ok: false, error: 'unsupported_url_protocol' };
  }
  if ((protocol === 'http:' || protocol === 'https:') && (parsed.url.username || parsed.url.password)) {
    return { ...parsed, ok: false, error: 'url_credentials_not_allowed' };
  }
  return parsed;
}

function validateHttpTarget(value) {
  const parsed = parseUrl(value);
  if (!parsed.ok) return parsed;
  const protocol = String(parsed.url.protocol || '').toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    return { ...parsed, ok: false, error: 'unsupported_url_protocol' };
  }
  if (parsed.url.username || parsed.url.password) {
    return { ...parsed, ok: false, error: 'url_credentials_not_allowed' };
  }
  return parsed;
}

function isAllowedRendererNavigation(targetUrl, allowedUrls = []) {
  const target = parseUrl(targetUrl);
  if (!target.ok) return false;
  for (const allowedValue of Array.isArray(allowedUrls) ? allowedUrls : []) {
    const allowed = parseUrl(allowedValue);
    if (!allowed.ok) continue;
    if (allowed.url.protocol === 'file:') {
      if (target.url.protocol === 'file:' && target.url.pathname === allowed.url.pathname) return true;
      continue;
    }
    if (target.url.origin === allowed.url.origin) return true;
  }
  return false;
}

module.exports = {
  validateExternalTarget,
  validateHttpTarget,
  isAllowedRendererNavigation,
};
