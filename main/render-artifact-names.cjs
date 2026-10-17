// Noms des fichiers dérivés d'un rendu (proxy, proxy alpha, vignette).
//
// Ils sont nommés d'après le fichier source (« Shot_12.proxy.mp4 ») : deux
// rendus écrivant dans le même dossier n'écrasent plus le proxy l'un de
// l'autre. Les anciens noms fixes (proxy.mp4, proxy_alpha.mp4, thumbnail.jpg)
// restent reconnus pour les données existantes.
// Miroir côté interface : app/utils/renderArtifactNames.js (test de parité).

const LEGACY_ARTIFACT_NAMES = new Set(['proxy.mp4', 'proxy_alpha.mp4', 'thumbnail.jpg']);

function fileNameOf(filePath = '') {
  const parts = String(filePath || '').split(/[\\/]/);
  return String(parts[parts.length - 1] || '').trim();
}

// Nom de base d'un fichier source, sans extension ni motif de numérotation
// d'image (%04d, ####, {frame_number}, .0001), et sans caractère interdit.
function renderArtifactBaseName(sourcePath = '') {
  let name = fileNameOf(sourcePath).replace(/\.[^.]+$/, '');
  name = name
    .replace(/%0?\d*d/gi, '')
    .replace(/#+/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\.\d+$/, '')
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/[._\s-]+$/g, '')
    .trim();
  return name || 'render';
}

function proxyFileName(sourcePath) {
  return `${renderArtifactBaseName(sourcePath)}.proxy.mp4`;
}

function proxyAlphaFileName(sourcePath) {
  return `${renderArtifactBaseName(sourcePath)}.proxy_alpha.mp4`;
}

function thumbnailFileName(sourcePath) {
  return `${renderArtifactBaseName(sourcePath)}.thumbnail.jpg`;
}

function isRenderArtifactFileName(name = '') {
  const lower = String(name || '').trim().toLowerCase();
  if (!lower) return false;
  if (LEGACY_ARTIFACT_NAMES.has(lower)) return true;
  return /\.proxy(_alpha)?\.mp4$/.test(lower) || /\.thumbnail\.jpg$/.test(lower);
}

module.exports = {
  renderArtifactBaseName,
  proxyFileName,
  proxyAlphaFileName,
  thumbnailFileName,
  isRenderArtifactFileName,
};
