// Séquences d'images d'un rendu (une image = un fichier : Shot.0001.exr …).
//
// Une séquence est représentée par un modèle de nom (Shot.####.exr), le
// format déjà lu par la génération d'aperçu (server-postprod-ffmpeg.cjs).
// Sa clé de comparaison ignore l'écriture du numéro d'image : Shot.0001.exr,
// Shot.{frame_number}.exr, Shot.%04d.exr et Shot.####.exr désignent la même
// séquence.

const path = require('path');

const IMAGE_SEQUENCE_EXTS = new Set([
  '.exr', '.png', '.jpg', '.jpeg', '.tga', '.bmp', '.dpx', '.hdr', '.tif', '.tiff', '.webp',
]);

// Image numérotée : préfixe, numéro (au moins 2 chiffres), extension.
function parseSequenceFrame(fileName = '') {
  const name = String(fileName || '').trim();
  const ext = path.extname(name).toLowerCase();
  if (!IMAGE_SEQUENCE_EXTS.has(ext)) return null;
  const match = /^(.*?)(\d{2,})(\.[^.]+)$/.exec(name);
  if (!match) return null;
  return { prefix: match[1], digits: match[2], frame: Number(match[2]), ext: match[3] };
}

function sequencePatternName({ prefix = '', digits = '', ext = '' } = {}) {
  return `${prefix}${'#'.repeat(Math.max(1, String(digits).length))}${ext}`;
}

function normalizePathKey(value = '') {
  return String(value || '').trim().replace(/\\/g, '/').replace(/\/+$/g, '').toLowerCase();
}

// Clé d'une séquence d'images (chemin d'une image, modèle ou motif) ; vide
// pour un fichier qui n'est pas une image.
function sequenceKey(filePath = '') {
  const key = normalizePathKey(filePath);
  if (!key) return '';
  const slash = key.lastIndexOf('/');
  const dir = key.slice(0, slash + 1);
  const base = key.slice(slash + 1);
  if (!IMAGE_SEQUENCE_EXTS.has(path.extname(base))) return '';
  const tokenized = base
    .replace(/\{[^}]*\}/g, '#')
    .replace(/%0?\d*d/g, '#')
    .replace(/#+/g, '#');
  const normalized = tokenized.includes('#')
    ? tokenized
    : tokenized.replace(/\d{2,}(\.[^.]+)$/, '#$1');
  return normalized.includes('#') ? `${dir}${normalized}` : '';
}

module.exports = {
  IMAGE_SEQUENCE_EXTS,
  parseSequenceFrame,
  sequenceKey,
  sequencePatternName,
};
