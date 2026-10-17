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

// Extensions de séquences d'images : toutes les images d'une séquence
// partagent volontairement les mêmes dérivés.
const IMAGE_SEQUENCE_EXTS = new Set(['exr', 'png', 'jpg', 'jpeg', 'tga', 'bmp', 'dpx', 'hdr', 'tif', 'tiff', 'webp']);

// Identité d'un fichier source : son nom complet, extension comprise (Shot.mov
// et Shot.mp4 restent distincts). Pour une séquence d'images seulement, la
// numérotation (%04d, ####, {frame_number}, .0001) est retirée.
function renderArtifactBaseName(sourcePath = '') {
  const fileName = fileNameOf(sourcePath);
  const extMatch = /\.([^.]+)$/.exec(fileName);
  const ext = extMatch ? extMatch[1] : '';
  let stem = extMatch ? fileName.slice(0, -extMatch[0].length) : fileName;
  if (IMAGE_SEQUENCE_EXTS.has(ext.toLowerCase())) {
    stem = stem
      .replace(/\.?%0?\d*d$/i, '')
      .replace(/\.?#+$/, '')
      .replace(/\.?\{[^}]*\}$/, '')
      .replace(/\.\d+$/, '');
  }
  const name = (ext ? `${stem}.${ext}` : stem)
    .replace(/[<>:"/\\|?*]/g, '_')
    .trim();
  return stem.trim() ? name : 'render';
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
