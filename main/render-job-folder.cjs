// Sous-dossier exclusif d'un rendu, créé par le serveur à l'attribution
// (<racine>/<id>_<projet>). Un marqueur déposé à la création, et seulement si
// le dossier n'existait pas, prouve que le serveur le possède : c'est la seule
// condition qui autorise sa suppression complète avec le rendu. Un dossier
// préexistant, détecté ou de provenance inconnue n'est jamais réclamé.

const fs = require('fs');
const path = require('path');

const RENDER_JOB_MARKER = '.uu-render-job.json';
const RENDER_JOB_SUBDIRS = ['logs', 'images', 'proxy'];

function normalizeKey(value) {
  return String(value || '').replace(/[\\/]+/g, '/').replace(/\/+$/g, '').toLowerCase();
}

function realPathOrSelf(value) {
  try {
    return fs.realpathSync.native(value);
  } catch {
    return path.resolve(value);
  }
}

function createOwnedRenderJobFolder(jobDir, renderId) {
  const dir = path.resolve(String(jobDir || ''));
  const existed = fs.existsSync(dir);
  fs.mkdirSync(dir, { recursive: true });
  for (const sub of RENDER_JOB_SUBDIRS) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  if (existed) return { owned: false, jobDir: dir };
  const marker = { renderId: Math.trunc(Number(renderId) || 0), jobDir: realPathOrSelf(dir), createdAt: new Date().toISOString() };
  try {
    fs.writeFileSync(path.join(dir, RENDER_JOB_MARKER), JSON.stringify(marker), { flag: 'wx' });
    return { owned: true, jobDir: dir };
  } catch {
    return { owned: false, jobDir: dir };
  }
}

// Vrai seulement si le marqueur est un fichier ordinaire, désigne ce rendu et
// exactement ce dossier (un marqueur copié ailleurs ne vaut rien).
function isOwnedRenderJobFolder(realFolder, renderId) {
  const id = Math.trunc(Number(renderId) || 0);
  if (id <= 0) return false;
  const markerFile = path.join(realFolder, RENDER_JOB_MARKER);
  try {
    if (!fs.lstatSync(markerFile).isFile()) return false;
    const marker = JSON.parse(fs.readFileSync(markerFile, 'utf8'));
    if (Math.trunc(Number(marker?.renderId) || 0) !== id) return false;
    return normalizeKey(realPathOrSelf(String(marker?.jobDir || ''))) === normalizeKey(realFolder);
  } catch {
    return false;
  }
}

module.exports = {
  RENDER_JOB_MARKER,
  createOwnedRenderJobFolder,
  isOwnedRenderJobFolder,
};
