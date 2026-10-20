// Mots de passe : empreinte PBKDF2-SHA256 salée, vérification à temps constant.
// Format : pbkdf2$sha256$<itérations>$<sel : 32 hex>$<empreinte : 64 hex>.
const crypto = require('crypto');
const { DEFAULT_PBKDF2_ITERS, PASSWORD_KEY_LEN } = require('./server-postprod-auth-constants.cjs');
const { coercePositiveInt } = require('./server-postprod-auth-utils-core.cjs');

const MIN_PBKDF2_ITERS = 10000;
// Au-delà, une vérification bloquerait le serveur (et Node refuse 2^31 et plus).
const MAX_PBKDF2_ITERS = 10_000_000;
const SALT_BYTES = 16;
const SALT_PATTERN = new RegExp(`^[0-9a-f]{${SALT_BYTES * 2}}$`, 'i');
const HASH_PATTERN = new RegExp(`^[0-9a-f]{${PASSWORD_KEY_LEN * 2}}$`, 'i');

function clampPbkdf2Iterations(iterations) {
  return Math.min(MAX_PBKDF2_ITERS, coercePositiveInt(iterations, DEFAULT_PBKDF2_ITERS, MIN_PBKDF2_ITERS));
}

function hashPassword(password, iterations = DEFAULT_PBKDF2_ITERS) {
  const rounds = clampPbkdf2Iterations(iterations);
  const salt = crypto.randomBytes(SALT_BYTES).toString('hex');
  const hash = crypto
    .pbkdf2Sync(String(password || ''), salt, rounds, PASSWORD_KEY_LEN, 'sha256')
    .toString('hex');
  return `pbkdf2$sha256$${rounds}$${salt}$${hash}`;
}

// Toute empreinte qui ne respecte pas exactement le format est refusée,
// sans exception levée.
function verifyPassword(password, encoded) {
  const raw = String(encoded || '').trim();
  const parts = raw.split('$');
  if (parts.length !== 5) return false;
  const [scheme, digest, roundsRaw, salt, expectedHash] = parts;
  if (scheme !== 'pbkdf2' || digest !== 'sha256') return false;
  if (!/^\d+$/.test(roundsRaw)) return false;
  const rounds = Number(roundsRaw);
  if (!Number.isSafeInteger(rounds) || rounds < MIN_PBKDF2_ITERS || rounds > MAX_PBKDF2_ITERS) return false;
  if (!SALT_PATTERN.test(salt) || !HASH_PATTERN.test(expectedHash)) return false;
  const actualBuf = crypto.pbkdf2Sync(String(password || ''), salt, rounds, PASSWORD_KEY_LEN, 'sha256');
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
}

module.exports = { clampPbkdf2Iterations, hashPassword, verifyPassword };
