const path = require('path');
const crypto = require('crypto');
const {
  MAX_USERNAME_LEN,
  MAX_DISPLAY_NAME_LEN,
  MAX_USER_EMAIL_LEN,
  MAX_USER_PHONE_LEN,
  MAX_EMPLOYMENT_TYPE_LEN,
  MAX_TIMEZONE_LEN,
  MAX_USER_LANGUAGE_LEN,
  MAX_USER_NOTE_LEN,
  MAX_USER_AVATAR_PATH_LEN,
  MAX_ROLE_KEY_LEN,
  MAX_ROLE_NOTE_LEN,
  DEFAULT_USER_LANGUAGE,
  USER_LANGUAGE_ALLOWED,
  EMPLOYMENT_TYPE_LOOKUP,
} = require('./server-postprod-auth-constants.cjs');

function coercePositiveInt(value, fallback, min = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return Math.max(min, Number(fallback) || min);
  return Math.max(min, Math.trunc(n));
}

function parseBooleanFlag(value, fallback = false) {
  if (value == null) return fallback === true;
  if (value === true || value === false) return value;
  if (value === 1 || value === 0) return value === 1;
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return fallback === true;
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'oui' || raw === 'on') return true;
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'non' || raw === 'off') return false;
  return fallback === true;
}

function parseEnvPathList(value) {
  return String(value || '')
    .split(/[;\n\r]+/g)
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeRenderDetectedExtensions(value) {
  const out = new Set();
  const push = (entry) => {
    const raw = String(entry || '').trim().toLowerCase();
    if (!raw) return;
    if (raw === '*') return;
    const ext = raw.startsWith('.') ? raw : `.${raw}`;
    out.add(ext);
  };
  if (Array.isArray(value)) {
    for (const item of value) push(item);
  } else {
    String(value || '')
      .split(/[,\s;]+/g)
      .forEach((item) => push(item));
  }
  return out;
}

function normalizeRenderDetectedFilePathForSignature(value) {
  let abs = '';
  try {
    abs = path.resolve(String(value || '').trim());
  } catch {
    abs = String(value || '').trim();
  }
  return abs.replace(/\\/g, '/').toLowerCase();
}

function buildRenderDetectedFileSignature(filePath, size = 0, mtimeIso = '') {
  return crypto
    .createHash('sha1')
    .update(
      `${normalizeRenderDetectedFilePathForSignature(filePath)}|${Math.max(0, Math.trunc(Number(size) || 0))}|${String(mtimeIso || '').trim()}`
    )
    .digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeAscii(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeRoleLookupKey(value) {
  return normalizeAscii(value).replace(/[\s_-]+/g, ' ').trim();
}

function normalizeUsername(value) {
  return normalizeAscii(value).replace(/\s+/g, '');
}

function normalizeUsernameSeed(value) {
  const raw = normalizeAscii(value);
  if (!raw) return '';
  const normalized = raw
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
  return normalized.slice(0, Math.min(32, MAX_USERNAME_LEN));
}

function buildAutoUsername(stmts, seeds = []) {
  const list = Array.isArray(seeds) ? seeds : [seeds];
  let base = '';
  for (const seed of list) {
    const candidate = normalizeUsernameSeed(seed);
    if (!candidate) continue;
    base = candidate;
    break;
  }
  if (!base) base = 'user';

  let username = base.slice(0, MAX_USERNAME_LEN);
  let suffix = 2;
  while (stmts.findUserByUsername.get(username)) {
    const suffixLabel = `.${suffix++}`;
    const maxBaseLen = Math.max(1, MAX_USERNAME_LEN - suffixLabel.length);
    username = `${base.slice(0, maxBaseLen)}${suffixLabel}`;
    if (suffix > 10000) {
      const randomSuffix = crypto.randomBytes(3).toString('hex');
      const hardMaxBaseLen = Math.max(1, MAX_USERNAME_LEN - (randomSuffix.length + 1));
      username = `${base.slice(0, hardMaxBaseLen)}.${randomSuffix}`;
      if (!stmts.findUserByUsername.get(username)) break;
    }
  }
  return username;
}

function sanitizeDisplayName(value, fallback = '') {
  const raw = String(value || '').trim();
  const safe = raw || String(fallback || '').trim();
  return safe.slice(0, MAX_DISPLAY_NAME_LEN);
}

function sanitizeFirstName(value) {
  return String(value || '').trim().slice(0, MAX_DISPLAY_NAME_LEN);
}

function sanitizeLastName(value) {
  return String(value || '').trim().slice(0, MAX_DISPLAY_NAME_LEN);
}

function sanitizeEmail(value) {
  return String(value || '').trim().toLowerCase().slice(0, MAX_USER_EMAIL_LEN);
}

function sanitizePhone(value) {
  return String(value || '').trim().slice(0, MAX_USER_PHONE_LEN);
}

function sanitizeEmploymentType(value) {
  const raw = String(value || '').trim().slice(0, MAX_EMPLOYMENT_TYPE_LEN);
  if (!raw) return '';
  const normalized = normalizeAscii(raw).replace(/[\s_-]+/g, '');
  return EMPLOYMENT_TYPE_LOOKUP.get(normalized) || '';
}

function buildPublicId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

function normalizePublicId(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (!/^[0-9a-f-]{36}$/.test(raw)) return '';
  const parts = raw.split('-');
  if (parts.length !== 5) return '';
  if (parts[0].length !== 8 || parts[1].length !== 4 || parts[2].length !== 4 || parts[3].length !== 4 || parts[4].length !== 12) {
    return '';
  }
  return raw;
}

function resolvePhoneFromBody(body = {}, fallback = '') {
  const hasPhone = Object.prototype.hasOwnProperty.call(body || {}, 'phone');
  const hasMobilePhone = Object.prototype.hasOwnProperty.call(body || {}, 'mobilePhone');
  const hasOfficePhone = Object.prototype.hasOwnProperty.call(body || {}, 'officePhone');
  if (!hasPhone && !hasMobilePhone && !hasOfficePhone) {
    return {
      hasAny: false,
      hasLegacyMobile: false,
      hasLegacyOffice: false,
      value: sanitizePhone(fallback),
    };
  }
  const rawValue = hasPhone
    ? body?.phone
    : hasMobilePhone
      ? body?.mobilePhone
      : body?.officePhone;
  return {
    hasAny: true,
    hasLegacyMobile: hasMobilePhone,
    hasLegacyOffice: hasOfficePhone,
    value: sanitizePhone(rawValue),
  };
}

function resolveNotificationPrefsFromBody(body = {}, fallback = '{}') {
  const hasNotificationPrefsJson = Object.prototype.hasOwnProperty.call(body || {}, 'notificationPrefsJson');
  const hasNotificationPreferences = Object.prototype.hasOwnProperty.call(body || {}, 'notificationPreferences');
  if (!hasNotificationPrefsJson && !hasNotificationPreferences) {
    return {
      hasAny: false,
      hasLegacy: false,
      value: normalizeNotificationPreferences(fallback),
    };
  }
  return {
    hasAny: true,
    hasLegacy: hasNotificationPreferences,
    value: normalizeNotificationPreferences(
      hasNotificationPrefsJson ? body?.notificationPrefsJson : body?.notificationPreferences
    ),
  };
}

function sanitizeTimezone(value) {
  return String(value || '').trim().slice(0, MAX_TIMEZONE_LEN);
}

function sanitizeUserLanguage(value, fallback = DEFAULT_USER_LANGUAGE) {
  const raw = String(value || '').trim().toLowerCase().slice(0, MAX_USER_LANGUAGE_LEN);
  if (USER_LANGUAGE_ALLOWED.has(raw)) return raw;
  const fallbackRaw = String(fallback || DEFAULT_USER_LANGUAGE)
    .trim()
    .toLowerCase()
    .slice(0, MAX_USER_LANGUAGE_LEN);
  if (USER_LANGUAGE_ALLOWED.has(fallbackRaw)) return fallbackRaw;
  return DEFAULT_USER_LANGUAGE;
}

function sanitizeUserNote(value) {
  return String(value || '').trim().slice(0, MAX_USER_NOTE_LEN);
}

function sanitizeAvatarPath(value) {
  return String(value || '').trim().slice(0, MAX_USER_AVATAR_PATH_LEN);
}

function isValidAvatarPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return true;
  if (raw.length > MAX_USER_AVATAR_PATH_LEN) return false;
  if (/[\r\n]/.test(raw)) return false;
  if (/^data:/i.test(raw)) {
    return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+$/i.test(raw);
  }
  return true;
}

function isValidEmail(value) {
  const mail = String(value || '').trim();
  if (!mail) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
}

function normalizeNotificationPreferences(value) {
  if (value == null || value === '') return '{}';
  let parsed = null;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(String(value || '{}'));
    } catch {
      return '{}';
    }
  } else if (typeof value === 'object') {
    parsed = value;
  } else {
    return '{}';
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return '{}';
  try {
    return JSON.stringify(parsed);
  } catch {
    return '{}';
  }
}

function parseNotificationPreferencesJson(value) {
  try {
    const parsed = JSON.parse(String(value || '{}'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {}
  return {};
}

function sanitizeRoleKey(value, fallback = '') {
  const raw = String(value || '').replace(/\s+/g, ' ').trim();
  const safe = raw || String(fallback || '').replace(/\s+/g, ' ').trim();
  return safe.slice(0, MAX_ROLE_KEY_LEN);
}

function sanitizeRoleNote(value) {
  return String(value || '').trim().slice(0, MAX_ROLE_NOTE_LEN);
}


module.exports = {
  coercePositiveInt,
  parseBooleanFlag,
  parseEnvPathList,
  normalizeRenderDetectedExtensions,
  normalizeRenderDetectedFilePathForSignature,
  buildRenderDetectedFileSignature,
  nowIso,
  normalizeAscii,
  normalizeRoleLookupKey,
  normalizeUsername,
  normalizeUsernameSeed,
  buildAutoUsername,
  sanitizeDisplayName,
  sanitizeFirstName,
  sanitizeLastName,
  sanitizeEmail,
  sanitizePhone,
  sanitizeEmploymentType,
  buildPublicId,
  normalizePublicId,
  resolvePhoneFromBody,
  resolveNotificationPrefsFromBody,
  sanitizeTimezone,
  sanitizeUserLanguage,
  sanitizeUserNote,
  sanitizeAvatarPath,
  isValidAvatarPath,
  isValidEmail,
  normalizeNotificationPreferences,
  parseNotificationPreferencesJson,
  sanitizeRoleKey,
  sanitizeRoleNote
};


