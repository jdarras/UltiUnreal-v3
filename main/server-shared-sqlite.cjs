// main/server-shared-sqlite.cjs
// Shared SQLite-backed storage for data used by both Live and Post-production.

const fs = require('fs');
const path = require('path');
const { readJSON, writeJSONIfChanged } = require('./server-files.cjs');
const { getDataDir } = require('./data-path.cjs');

const STORE_CACHE = new Map();

const DEFAULT_PROJECTS_DOC = Object.freeze({
  projects: [],
  nextId: 1,
  activeId: '',
  activeName: '',
  activeByHost: {},
});

const DEFAULT_LIBRARY_INDEX_DOC = Object.freeze({
  items: [],
  meta: {},
});

const DEFAULT_LIBRARY_DETAILS_DOC = Object.freeze({
  items: {},
  meta: {},
});

const KEY_PROJECTS = 'live.projects';
const KEY_LIBRARY_INDEX = 'library.index';
const KEY_LIBRARY_DETAILS = 'library.details';
const KEY_PREFIX_PROJECT_META = 'project.meta:';
const KEY_PREFIX_PROJECT_DOC = 'project.doc:';

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(text, fallback = {}) {
  try {
    const parsed = JSON.parse(String(text || '{}'));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {}
  return fallback;
}

function normalizeObject(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  return fallback;
}

function normalizeProjectsDoc(doc) {
  const src = normalizeObject(doc, {});
  const projects = Array.isArray(src.projects) ? src.projects : [];
  const activeByHost = normalizeObject(src.activeByHost, {});
  const nextIdRaw = Number(src.nextId);
  const nextId = Number.isFinite(nextIdRaw) && nextIdRaw > 0 ? Math.trunc(nextIdRaw) : 1;
  return {
    ...src,
    projects,
    nextId,
    activeId: String(src.activeId || '').trim(),
    activeName: String(src.activeName || ''),
    activeByHost,
  };
}

function normalizeLibraryIndexDoc(doc) {
  const src = normalizeObject(doc, {});
  return {
    ...src,
    items: Array.isArray(src.items) ? src.items : [],
    meta: normalizeObject(src.meta, {}),
  };
}

function normalizeLibraryDetailsDoc(doc) {
  const src = normalizeObject(doc, {});
  return {
    items: normalizeObject(src.items, {}),
    meta: normalizeObject(src.meta, {}),
  };
}

function normalizeProjectId(projectId) {
  return String(projectId || '').trim();
}

function buildPaths(rootDataDir) {
  return {
    rootDataDir,
    dbPath: path.join(rootDataDir, 'postprod.sqlite'),
    projectsFile: path.join(rootDataDir, 'projects_server.json'),
    projectMetaDir: path.join(rootDataDir, 'projects'),
    productionDir: path.join(rootDataDir, 'production'),
    libraryFile: path.join(rootDataDir, 'library_server.json'),
    libraryDetailsFile: path.join(rootDataDir, 'library_details_server.json'),
  };
}

function readLegacyJson(filePath, fallback = {}) {
  if (!filePath) return fallback;
  if (!fs.existsSync(filePath)) return fallback;
  return readJSON(filePath) || fallback;
}

function removeLegacyFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

function createFallbackStore(paths, reason = '') {
  return {
    available: false,
    dbPath: paths.dbPath,
    reason,

    loadProjectsDoc() {
      return normalizeProjectsDoc(readLegacyJson(paths.projectsFile, { ...DEFAULT_PROJECTS_DOC }));
    },
    saveProjectsDoc(doc, { onlyIfChanged = false } = {}) {
      const normalized = normalizeProjectsDoc(doc);
      if (!onlyIfChanged) {
        writeJSONIfChanged(paths.projectsFile, normalized);
        return true;
      }
      return writeJSONIfChanged(paths.projectsFile, normalized);
    },

    readProjectMeta(projectId) {
      const pid = normalizeProjectId(projectId);
      if (!pid) return {};
      return normalizeObject(readLegacyJson(path.join(paths.projectMetaDir, `${pid}.json`), {}), {});
    },
    writeProjectMeta(projectId, meta, { onlyIfChanged = false } = {}) {
      const pid = normalizeProjectId(projectId);
      if (!pid) return false;
      const filePath = path.join(paths.projectMetaDir, `${pid}.json`);
      const normalized = normalizeObject(meta, {});
      if (!onlyIfChanged) {
        writeJSONIfChanged(filePath, normalized);
        return true;
      }
      return writeJSONIfChanged(filePath, normalized);
    },
    deleteProjectMeta(projectId) {
      const pid = normalizeProjectId(projectId);
      if (!pid) return false;
      removeLegacyFile(path.join(paths.projectMetaDir, `${pid}.json`));
      return true;
    },

    readProjectDoc(projectId) {
      const pid = normalizeProjectId(projectId);
      if (!pid) return {};
      return normalizeObject(readLegacyJson(path.join(paths.productionDir, `${pid}.json`), {}), {});
    },
    writeProjectDoc(projectId, doc, { onlyIfChanged = false } = {}) {
      const pid = normalizeProjectId(projectId);
      if (!pid) return false;
      const filePath = path.join(paths.productionDir, `${pid}.json`);
      const normalized = normalizeObject(doc, {});
      if (!onlyIfChanged) {
        writeJSONIfChanged(filePath, normalized);
        return true;
      }
      return writeJSONIfChanged(filePath, normalized);
    },
    deleteProjectDoc(projectId) {
      const pid = normalizeProjectId(projectId);
      if (!pid) return false;
      removeLegacyFile(path.join(paths.productionDir, `${pid}.json`));
      return true;
    },

    loadLibraryIndexDoc() {
      return normalizeLibraryIndexDoc(readLegacyJson(paths.libraryFile, { ...DEFAULT_LIBRARY_INDEX_DOC }));
    },
    saveLibraryIndexDoc(doc, { onlyIfChanged = false } = {}) {
      const normalized = normalizeLibraryIndexDoc(doc);
      if (!onlyIfChanged) {
        writeJSONIfChanged(paths.libraryFile, normalized);
        return true;
      }
      return writeJSONIfChanged(paths.libraryFile, normalized);
    },

    loadLibraryDetailsDoc() {
      return normalizeLibraryDetailsDoc(readLegacyJson(paths.libraryDetailsFile, { ...DEFAULT_LIBRARY_DETAILS_DOC }));
    },
    saveLibraryDetailsDoc(doc, { onlyIfChanged = false } = {}) {
      const normalized = normalizeLibraryDetailsDoc(doc);
      if (!onlyIfChanged) {
        writeJSONIfChanged(paths.libraryDetailsFile, normalized);
        return true;
      }
      return writeJSONIfChanged(paths.libraryDetailsFile, normalized);
    },
  };
}

function createSqliteStore(paths, logLine = () => {}) {
  let BetterSqlite3 = null;
  try {
    BetterSqlite3 = require('better-sqlite3');
  } catch (err) {
    return createFallbackStore(paths, `better-sqlite3 unavailable: ${String(err?.message || err)}`);
  }

  try {
    fs.mkdirSync(paths.rootDataDir, { recursive: true });
    fs.mkdirSync(paths.projectMetaDir, { recursive: true });
    fs.mkdirSync(paths.productionDir, { recursive: true });
  } catch {}

  let db = null;
  try {
    db = new BetterSqlite3(paths.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  } catch (err) {
    return createFallbackStore(paths, `sqlite open failed: ${String(err?.message || err)}`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_json_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS shared_json_store (
      key TEXT PRIMARY KEY,
      json_text TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_shared_json_store_updated_at
      ON shared_json_store(updated_at);
  `);

  const hasV1 = db.prepare('SELECT 1 FROM shared_json_migrations WHERE version = 1 LIMIT 1').get();
  if (!hasV1) {
    db.prepare('INSERT INTO shared_json_migrations(version, applied_at) VALUES(1, ?)').run(nowIso());
    try {
      logLine({
        level: 'info',
        src: 'shared_store',
        action: 'db_migration_v1',
        message: 'Migration shared SQLite v1 applied',
      });
    } catch {}
  }

  const stmts = {
    getByKey: db.prepare('SELECT json_text FROM shared_json_store WHERE key = ?'),
    upsertByKey: db.prepare(`
      INSERT INTO shared_json_store(key, json_text, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        json_text = excluded.json_text,
        updated_at = excluded.updated_at
    `),
    deleteByKey: db.prepare('DELETE FROM shared_json_store WHERE key = ?'),
  };

  function readByKey(key, fallback, legacyFilePath = '') {
    const row = stmts.getByKey.get(String(key || ''));
    if (row && typeof row.json_text === 'string') {
      return safeJsonParse(row.json_text, fallback);
    }
    const fromLegacy = readLegacyJson(legacyFilePath, fallback);
    const payload = fromLegacy && typeof fromLegacy === 'object' ? fromLegacy : fallback;
    stmts.upsertByKey.run(String(key || ''), JSON.stringify(payload || {}), nowIso());
    return payload;
  }

  function writeByKey(key, doc, { onlyIfChanged = false, legacyFilePath = '' } = {}) {
    const normalized = normalizeObject(doc, {});
    const nextText = JSON.stringify(normalized);
    const prev = stmts.getByKey.get(String(key || ''));
    const changed = !(prev && prev.json_text === nextText);
    if (!onlyIfChanged || changed) {
      stmts.upsertByKey.run(String(key || ''), nextText, nowIso());
    }
    if (legacyFilePath) {
      writeJSONIfChanged(legacyFilePath, normalized);
    }
    return changed;
  }

  function readProjectMeta(projectId) {
    const pid = normalizeProjectId(projectId);
    if (!pid) return {};
    const key = `${KEY_PREFIX_PROJECT_META}${pid}`;
    const legacyPath = path.join(paths.projectMetaDir, `${pid}.json`);
    return normalizeObject(readByKey(key, {}, legacyPath), {});
  }

  function writeProjectMeta(projectId, meta, { onlyIfChanged = false } = {}) {
    const pid = normalizeProjectId(projectId);
    if (!pid) return false;
    const key = `${KEY_PREFIX_PROJECT_META}${pid}`;
    const legacyPath = path.join(paths.projectMetaDir, `${pid}.json`);
    return writeByKey(key, normalizeObject(meta, {}), { onlyIfChanged, legacyFilePath: legacyPath });
  }

  function readProjectDoc(projectId) {
    const pid = normalizeProjectId(projectId);
    if (!pid) return {};
    const key = `${KEY_PREFIX_PROJECT_DOC}${pid}`;
    const legacyPath = path.join(paths.productionDir, `${pid}.json`);
    return normalizeObject(readByKey(key, {}, legacyPath), {});
  }

  function writeProjectDoc(projectId, doc, { onlyIfChanged = false } = {}) {
    const pid = normalizeProjectId(projectId);
    if (!pid) return false;
    const key = `${KEY_PREFIX_PROJECT_DOC}${pid}`;
    const legacyPath = path.join(paths.productionDir, `${pid}.json`);
    return writeByKey(key, normalizeObject(doc, {}), { onlyIfChanged, legacyFilePath: legacyPath });
  }

  function importLegacyMetaAndDocs() {
    // Sync project meta: file fills in any fields missing from SQLite cache
    try {
      const metaFiles = fs.readdirSync(paths.projectMetaDir, { withFileTypes: true });
      for (const entry of metaFiles) {
        if (!entry || !entry.isFile() || !/\.json$/i.test(entry.name || '')) continue;
        const pid = path.basename(entry.name, '.json');
        if (!pid) continue;
        const key = `${KEY_PREFIX_PROJECT_META}${pid}`;
        const legacyPath = path.join(paths.projectMetaDir, entry.name);
        const existing = stmts.getByKey.get(key);
        if (!existing) {
          const fromFile = normalizeObject(readLegacyJson(legacyPath, {}), {});
          stmts.upsertByKey.run(key, JSON.stringify(fromFile), nowIso());
        } else {
          const fromDb = safeJsonParse(existing.json_text, {});
          const fromFile = normalizeObject(readLegacyJson(legacyPath, {}), {});
          // SQLite wins for fields it already has; file fills in missing fields
          const merged = { ...fromFile, ...fromDb };
          const mergedText = JSON.stringify(merged);
          if (mergedText !== existing.json_text) {
            stmts.upsertByKey.run(key, mergedText, nowIso());
          }
        }
      }
    } catch {}

    // Sync project docs (same merge strategy)
    try {
      const docFiles = fs.readdirSync(paths.productionDir, { withFileTypes: true });
      for (const entry of docFiles) {
        if (!entry || !entry.isFile() || !/\.json$/i.test(entry.name || '')) continue;
        const pid = path.basename(entry.name, '.json');
        if (!pid) continue;
        const key = `${KEY_PREFIX_PROJECT_DOC}${pid}`;
        const legacyPath = path.join(paths.productionDir, entry.name);
        const existing = stmts.getByKey.get(key);
        if (!existing) {
          const fromFile = normalizeObject(readLegacyJson(legacyPath, {}), {});
          stmts.upsertByKey.run(key, JSON.stringify(fromFile), nowIso());
        } else {
          const fromDb = safeJsonParse(existing.json_text, {});
          const fromFile = normalizeObject(readLegacyJson(legacyPath, {}), {});
          const merged = { ...fromFile, ...fromDb };
          const mergedText = JSON.stringify(merged);
          if (mergedText !== existing.json_text) {
            stmts.upsertByKey.run(key, mergedText, nowIso());
          }
        }
      }
    } catch {}
  }

  const baseProjects = normalizeProjectsDoc(readByKey(
    KEY_PROJECTS,
    { ...DEFAULT_PROJECTS_DOC },
    paths.projectsFile
  ));
  writeByKey(KEY_PROJECTS, baseProjects, { onlyIfChanged: false, legacyFilePath: paths.projectsFile });

  const baseLibraryIndex = normalizeLibraryIndexDoc(readByKey(
    KEY_LIBRARY_INDEX,
    { ...DEFAULT_LIBRARY_INDEX_DOC },
    paths.libraryFile
  ));
  writeByKey(KEY_LIBRARY_INDEX, baseLibraryIndex, { onlyIfChanged: false, legacyFilePath: paths.libraryFile });

  const baseLibraryDetails = normalizeLibraryDetailsDoc(readByKey(
    KEY_LIBRARY_DETAILS,
    { ...DEFAULT_LIBRARY_DETAILS_DOC },
    paths.libraryDetailsFile
  ));
  writeByKey(KEY_LIBRARY_DETAILS, baseLibraryDetails, {
    onlyIfChanged: false,
    legacyFilePath: paths.libraryDetailsFile,
  });

  importLegacyMetaAndDocs();

  return {
    available: true,
    dbPath: paths.dbPath,
    reason: '',

    loadProjectsDoc() {
      return normalizeProjectsDoc(readByKey(KEY_PROJECTS, { ...DEFAULT_PROJECTS_DOC }, paths.projectsFile));
    },
    saveProjectsDoc(doc, { onlyIfChanged = false } = {}) {
      const normalized = normalizeProjectsDoc(doc);
      return writeByKey(KEY_PROJECTS, normalized, { onlyIfChanged, legacyFilePath: paths.projectsFile });
    },

    readProjectMeta,
    writeProjectMeta,
    deleteProjectMeta(projectId) {
      const pid = normalizeProjectId(projectId);
      if (!pid) return false;
      const key = `${KEY_PREFIX_PROJECT_META}${pid}`;
      const deleted = Number(stmts.deleteByKey.run(key)?.changes || 0) > 0;
      removeLegacyFile(path.join(paths.projectMetaDir, `${pid}.json`));
      return deleted;
    },

    readProjectDoc,
    writeProjectDoc,
    deleteProjectDoc(projectId) {
      const pid = normalizeProjectId(projectId);
      if (!pid) return false;
      const key = `${KEY_PREFIX_PROJECT_DOC}${pid}`;
      const deleted = Number(stmts.deleteByKey.run(key)?.changes || 0) > 0;
      removeLegacyFile(path.join(paths.productionDir, `${pid}.json`));
      return deleted;
    },

    loadLibraryIndexDoc() {
      return normalizeLibraryIndexDoc(readByKey(
        KEY_LIBRARY_INDEX,
        { ...DEFAULT_LIBRARY_INDEX_DOC },
        paths.libraryFile
      ));
    },
    saveLibraryIndexDoc(doc, { onlyIfChanged = false } = {}) {
      const normalized = normalizeLibraryIndexDoc(doc);
      return writeByKey(KEY_LIBRARY_INDEX, normalized, {
        onlyIfChanged,
        legacyFilePath: paths.libraryFile,
      });
    },

    loadLibraryDetailsDoc() {
      return normalizeLibraryDetailsDoc(readByKey(
        KEY_LIBRARY_DETAILS,
        { ...DEFAULT_LIBRARY_DETAILS_DOC },
        paths.libraryDetailsFile
      ));
    },
    saveLibraryDetailsDoc(doc, { onlyIfChanged = false } = {}) {
      const normalized = normalizeLibraryDetailsDoc(doc);
      return writeByKey(KEY_LIBRARY_DETAILS, normalized, {
        onlyIfChanged,
        legacyFilePath: paths.libraryDetailsFile,
      });
    },
  };
}

function getSharedStore({ dataDir, logLine = () => {} } = {}) {
  const rootDataDir = String(dataDir || getDataDir() || '').trim();
  const resolvedRoot = rootDataDir ? path.resolve(rootDataDir) : path.resolve(getDataDir());
  if (STORE_CACHE.has(resolvedRoot)) return STORE_CACHE.get(resolvedRoot);

  const store = createSqliteStore(buildPaths(resolvedRoot), logLine);
  STORE_CACHE.set(resolvedRoot, store);
  return store;
}

module.exports = {
  getSharedStore,
};

