// Noms des fichiers dérivés d'un rendu (proxy, proxy alpha, vignette).
// Miroir de main/render-artifact-names.cjs (test de parité :
// tests/unit/renderArtifactNames.test.mjs) — modifier les deux ensemble.

const LEGACY_ARTIFACT_NAMES = new Set(['proxy.mp4', 'proxy_alpha.mp4', 'thumbnail.jpg']);

function fileNameOf(filePath = '') {
  const parts = String(filePath || '').split(/[\\/]/);
  return String(parts[parts.length - 1] || '').trim();
}

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

export {
  renderArtifactBaseName,
  proxyFileName,
  proxyAlphaFileName,
  thumbnailFileName,
  isRenderArtifactFileName,
};
