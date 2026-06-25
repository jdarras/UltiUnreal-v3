// main/server-files.cjs
// Helpers fichiers / JSON pour UltiUnreal Agent (CommonJS)

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

// ---------- Utils fichiers / JSON ----------
function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function ensureDirPath(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readJSON(p) {
  try {
    const t = fs.readFileSync(p, 'utf8');
    return t ? JSON.parse(t) : {};
  } catch (e) {
    try {
      console.warn('[UltiUnreal][Agent] readJSON failed, returning {}', p, e && e.message ? e.message : e);
    } catch {}
    return {};
  }
}

function writeFileAtomicSync(filePath, content, encoding = 'utf8') {
  ensureDir(filePath);
  const directory = path.dirname(filePath);
  const baseName = path.basename(filePath);
  const tempName = '.' + baseName + '.' + process.pid + '.' + Date.now() + '.'
    + Math.random().toString(16).slice(2) + '.tmp';
  const tempPath = path.join(directory, tempName);
  try {
    const fd = fs.openSync(tempPath, 'w');
    try {
      fs.writeFileSync(fd, content, encoding);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    try {
      fs.renameSync(tempPath, filePath);
    } catch {
      fs.copyFileSync(tempPath, filePath);
      fs.unlinkSync(tempPath);
    }
  } catch (error) {
    try { fs.unlinkSync(tempPath); } catch {}
    throw error;
  }
}

function writeJSON(p, obj) {
  writeFileAtomicSync(p, JSON.stringify(obj ?? {}, null, 2), 'utf8');
}

// Write only if content changed to reduce needless disk I/O
function writeJSONIfChanged(p, obj) {
  ensureDir(p);
  const next = JSON.stringify(obj ?? {}, null, 2);
  try {
    const prev = fs.readFileSync(p, 'utf8');
    if (prev === next) return false;
  } catch {
    // file missing or unreadable: proceed with write
  }
  writeFileAtomicSync(p, next, 'utf8');
  return true;
}

// Inventaire récursif d'un dossier (hors certains sous-dossiers)
async function collectFilesRecursive(root, excludeDirs = []) {
  const out = {};
  const excludesLower = Array.isArray(excludeDirs)
    ? excludeDirs.map((d) => String(d || '').toLowerCase())
    : [];

  async function walk(current, relBase) {
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const name = entry.name;
      const relPath = relBase ? path.join(relBase, name) : name;
      const fullPath = path.join(current, name);

      if (entry.isDirectory()) {
        const lower = String(name || '').toLowerCase();
        if (excludesLower.includes(lower)) continue;
        await walk(fullPath, relPath);
      } else if (entry.isFile()) {
        try {
          const st = await fsp.stat(fullPath);
          out[relPath] = { size: st.size, mtimeMs: st.mtimeMs };
        } catch {
          // ignore
        }
      }
    }
  }

  await walk(root, '');
  return out;
}

// Petit helper HTTP JSON avec timeout
async function getJSON(url, timeoutMs = 3000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const txt = await r.text();
    try {
      return JSON.parse(txt || '{}');
    } catch {
      return { ok: false, text: txt };
    }
  } catch (e) {
    const raw = String(e?.message || e || "");
    const name = String(e?.name || "");
    const aborted = name === "AbortError" || /aborted|abort/i.test(raw);
    if (aborted) {
      return { ok: false, error: "Requête annulée (délai dépassé)" };
    }
    return { ok: false, error: raw };
  } finally {
    clearTimeout(t);
  }
}

module.exports = {
  ensureDir,
  ensureDirPath,
  readJSON,
  writeFileAtomicSync,
  writeJSON,
  writeJSONIfChanged,
  collectFilesRecursive,
  getJSON,
};
