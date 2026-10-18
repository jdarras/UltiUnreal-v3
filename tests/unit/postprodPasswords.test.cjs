// Empreintes de mots de passe : seul le bon mot de passe est accepté, et toute
// empreinte mal formée est refusée (jamais acceptée par défaut).
const test = require('node:test');
const assert = require('node:assert/strict');

const { hashPassword, verifyPassword } = require('../../main/server-postprod-passwords.cjs');

// Nombre d'itérations minimal autorisé : tests rapides.
const ITERS = 10000;

test('the right password is accepted, any other is refused', () => {
  const encoded = hashPassword('Secret-123', ITERS);
  assert.equal(verifyPassword('Secret-123', encoded), true);
  assert.equal(verifyPassword('secret-123', encoded), false);
  assert.equal(verifyPassword('', encoded), false);
});

test('each hash uses its own salt', () => {
  const a = hashPassword('Secret-123', ITERS);
  const b = hashPassword('Secret-123', ITERS);
  assert.notEqual(a, b);
  assert.match(a, /^pbkdf2\$sha256\$10000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
});

test('the iteration count can never go below the minimum', () => {
  assert.match(hashPassword('x', 1), /^pbkdf2\$sha256\$10000\$/);
});

test('malformed or foreign hashes are refused', () => {
  const [scheme, digest, rounds, salt, hash] = hashPassword('Secret-123', ITERS).split('$');
  const variants = [
    '',
    'plain-text-password',
    ['md5', digest, rounds, salt, hash].join('$'),
    [scheme, 'sha1', rounds, salt, hash].join('$'),
    [scheme, digest, rounds, salt].join('$'),
    [scheme, digest, rounds, '', hash].join('$'),
    [scheme, digest, rounds, salt, 'zz'].join('$'),
    [scheme, digest, rounds, salt, hash.slice(0, 32)].join('$'),
    [scheme, digest, 'abc', salt, hash].join('$'),
    [scheme, digest, '', salt, hash].join('$'),
    [scheme, digest, '5000', salt, hash].join('$'),
    [scheme, digest, '1e4', salt, hash].join('$'),
    null,
  ];
  for (const encoded of variants) {
    assert.equal(verifyPassword('Secret-123', encoded), false, String(encoded));
  }
});
