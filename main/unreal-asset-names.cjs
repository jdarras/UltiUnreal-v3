// Noms et chemins des assets Unreal d'un projet (catalogue des niveaux,
// séquences, préréglages de rendu et préréglages WRC). Partagé par le
// catalogue de projets et le serveur postprod.

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

// Content/Maps/Main.umap → /Game/Maps/Main.Main
function buildUnrealAssetPathFromRelative(relativePath) {
  const normalizedRelative = toPosixPath(relativePath)
    .replace(/^\/+/, '')
    .trim();
  if (!normalizedRelative) return '';
  const withoutExt = normalizedRelative.replace(/\.[^/.\\]+$/g, '').trim();
  if (!withoutExt) return '';
  const segments = withoutExt.split('/').filter(Boolean);
  const leaf = segments[segments.length - 1] || '';
  if (!leaf) return '';
  return `/Game/${withoutExt}.${leaf}`;
}

function classifyUnrealAssetFromName(fileName = '', ext = '') {
  const normalizedExt = String(ext || '').trim().toLowerCase();
  const baseName = String(fileName || '').trim().replace(/\.[^/.\\]+$/g, '');
  const lower = baseName.toLowerCase();
  const isLevel = normalizedExt === '.umap';
  const isWrcPreset = (
    normalizedExt === '.uasset' && (
      lower.includes('remotecontrol') ||
      lower.includes('remote_control') ||
      lower.includes('wrc_preset') ||
      lower.includes('rcpreset') ||
      /\bwrc(?:_|-|\b)/.test(lower)
    )
  );
  const isSequence = (
    normalizedExt === '.uasset' && (
      lower.startsWith('ls_') ||
      lower.includes('levelsequence') ||
      lower.includes('sequence') ||
      lower.endsWith('_seq')
    )
  );
  const isPreset = (
    normalizedExt === '.uasset' && (
      lower.includes('mrg') ||
      lower.includes('mrq') ||
      lower.includes('mrc') ||
      lower.includes('moviepipeline') ||
      lower.includes('renderpreset') ||
      lower.includes('preset')
    ) &&
    !isWrcPreset
  );
  return { isLevel, isSequence, isPreset, isWrcPreset };
}

module.exports = {
  buildUnrealAssetPathFromRelative,
  classifyUnrealAssetFromName,
  toPosixPath,
};
