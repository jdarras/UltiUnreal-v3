// Mots de passe : empreinte PBKDF2-SHA256 salée, vérification à temps constant.
const crypto = require('crypto');
const { DEFAULT_PBKDF2_ITERS, PASSWORD_KEY_LEN } = require('./server-postprod-auth-constants.cjs');
const { coercePositiveInt } = require('./server-postprod-auth-utils-core.cjs');

const MIN_PBKDF2_ITERS = 10000;

function hashPassword(password, iterations = DEFAULT_PBKDF2_ITERS) {
  const rounds = coercePositiveInt(iterations, DEFAULT_PBKDF2_ITERS, MIN_PBKDF2_ITERS);
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password || ''), salt, rounds, PASSWORD_KEY_LEN, 'sha256')
    .toString('hex');
  return `pbkdf2$sha256$${rounds}$${salt}$${hash}`;
}

function verifyPassword(password, encoded) {
  const raw = String(encoded || '').trim();
  const parts = raw.split('$');
  if (parts.length !== 5) return false;
  const [scheme, digest, roundsRaw, salt, expectedHash] = parts;
  if (scheme !== 'pbkdf2' || digest !== 'sha256') return false;
  // Nombre d'itérations illisible ou inférieur au minimum : empreinte refusée.
  if (!/^\d+$/.test(roundsRaw)) return false;
  const rounds = Number(roundsRaw);
  if (!Number.isSafeInteger(rounds) || rounds < MIN_PBKDF2_ITERS) return false;
  if (!salt || !expectedHash) return false;
  const actualHash = crypto
    .pbkdf2Sync(String(password || ''), salt, rounds, PASSWORD_KEY_LEN, 'sha256')
    .toString('hex');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  const actualBuf = Buffer.from(actualHash, 'hex');
  if (!expectedBuf.length || expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

module.exports = { hashPassword, verifyPassword };
