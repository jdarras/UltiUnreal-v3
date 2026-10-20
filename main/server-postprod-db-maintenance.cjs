// Entretien de la base postprod : purge des sessions périmées et compactage
// quand beaucoup d'espace a été libéré (la base n'était jamais compactée :
// 17,5 Mo libres sur 49 Mo constatés).

const SESSION_RETENTION_DAYS = 7;
const VACUUM_MIN_FREE_RATIO = 0.25;
const VACUUM_MIN_FREE_BYTES = 8 * 1024 * 1024;

// Sessions expirées ou révoquées depuis plus de `retentionDays` jours.
function purgeOldSessions(db, { now = new Date(), retentionDays = SESSION_RETENTION_DAYS } = {}) {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare(`
    DELETE FROM sessions
    WHERE expires_at < ?
       OR (revoked_at IS NOT NULL AND revoked_at < ?)
  `).run(cutoff, cutoff);
  return Number(result?.changes || 0);
}

function readFreeSpace(db) {
  const pageSize = Number(db.pragma('page_size', { simple: true })) || 0;
  const pageCount = Number(db.pragma('page_count', { simple: true })) || 0;
  const freePages = Number(db.pragma('freelist_count', { simple: true })) || 0;
  return { totalBytes: pageSize * pageCount, freeBytes: pageSize * freePages };
}

// Compacte la base si l'espace libre dépasse à la fois le ratio et le seuil.
// À appeler au démarrage, avant de servir des requêtes.
function maybeVacuum(db, {
  minFreeRatio = VACUUM_MIN_FREE_RATIO,
  minFreeBytes = VACUUM_MIN_FREE_BYTES,
  logLine = () => {},
} = {}) {
  const before = readFreeSpace(db);
  if (before.totalBytes <= 0) return { vacuumed: false, ...before };
  if (before.freeBytes < minFreeBytes || before.freeBytes / before.totalBytes < minFreeRatio) {
    return { vacuumed: false, ...before };
  }
  try {
    db.exec('VACUUM');
  } catch (err) {
    // Base occupée par une autre connexion : reporté au prochain démarrage.
    logLine({ level: 'warn', src: 'postprod', action: 'db_vacuum_skipped', message: String(err?.message || err) });
    return { vacuumed: false, ...before };
  }
  const after = readFreeSpace(db);
  logLine({
    level: 'info',
    src: 'postprod',
    action: 'db_vacuum',
    message: `Base compactée : ${(before.totalBytes / 1e6).toFixed(1)} Mo → ${(after.totalBytes / 1e6).toFixed(1)} Mo`,
  });
  return { vacuumed: true, before, after };
}

module.exports = {
  SESSION_RETENTION_DAYS,
  maybeVacuum,
  purgeOldSessions,
};
