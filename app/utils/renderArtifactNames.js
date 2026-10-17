// Noms des fichiers dérivés d'un rendu (proxy, proxy alpha, vignette).
// Miroir de main/render-artifact-names.cjs (test de parité :
// tests/unit/renderArtifactNames.test.mjs) — modifier les deux ensemble.

const LEGACY_ARTIFACT_NAMES = new Set(['proxy.mp4', 'proxy_alpha.mp4', 'thumbnail.jpg']);

function fileNameOf(filePath = '') {
  const parts = String(filePath || '').split(/[\\/]/);
  return String(parts[parts.length - 1] || '').trim();
}

const IMAGE_SEQUENCE_EXTS = new Set(['exr', 'png', 'jpg', 'jpeg', 'tga', 'bmp', 'dpx', 'hdr', 'tif', 'tiff', 'webp']);

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

export {
  renderArtifactBaseName,
  proxyFileName,
  proxyAlphaFileName,
  thumbnailFileName,
  isRenderArtifactFileName,
};
