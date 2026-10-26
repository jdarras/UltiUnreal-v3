// Fiche de fin de rendu écrite par le plugin UltiUnrealRenderBridge
// (UURenderResultSubsystem) : succès rapporté par Unreal et liste exacte des
// fichiers produits.
//
// Décision :
//   failure : Unreal a rapporté un échec (quels que soient les fichiers présents) ;
//   success : sortie retenue = fichier listé par la fiche (vidéo en priorité,
//             séquence d'images désignée par son modèle Shot.####.exr) ;
//   unknown : pas de fiche exploitable (ancien plugin, Unreal arrêté avant la
//             fin, fiche d'une autre tentative) → méthode de recherche actuelle.

export const RENDER_RESULT_SCHEMA = 1;

const VIDEO_EXTS = new Set(['mp4', 'mov', 'mxf', 'avi', 'mkv', 'webm']);
const IMAGE_EXTS = new Set(['exr', 'png', 'jpg', 'jpeg', 'tga', 'bmp', 'dpx', 'hdr', 'tif', 'tiff', 'webp']);

function extOf(filePath = '') {
  const match = /\.([^./\\]+)$/.exec(String(filePath || ''));
  return match ? match[1].toLowerCase() : '';
}

function splitPath(filePath = '') {
  const raw = String(filePath || '');
  const cut = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
  return { dir: cut >= 0 ? raw.slice(0, cut + 1) : '', name: cut >= 0 ? raw.slice(cut + 1) : raw };
}

// Modèle d'une séquence d'images (Shot.0001.exr … → Shot.####.exr) si tous
// les fichiers sont des images numérotées de la même séquence.
export function sequencePatternOf(files = []) {
  if (!Array.isArray(files) || files.length < 2) return '';
  let pattern = '';
  for (const file of files) {
    if (!IMAGE_EXTS.has(extOf(file))) return '';
    const { dir, name } = splitPath(file);
    const match = /^(.*?)(\d{2,})(\.[^.]+)$/.exec(name);
    if (!match) return '';
    const candidate = `${dir}${match[1]}${'#'.repeat(match[2].length)}${match[3]}`;
    if (pattern && candidate.toLowerCase() !== pattern.toLowerCase()) return '';
    pattern = pattern || candidate;
  }
  return pattern;
}

export function chooseRenderOutputFromFiles(files = []) {
  const list = (Array.isArray(files) ? files : []).map((f) => String(f || '').trim()).filter(Boolean);
  if (list.length === 0) return '';
  const video = list.find((f) => VIDEO_EXTS.has(extOf(f)));
  if (video) return video;
  return sequencePatternOf(list) || list[0];
}

// status : réponse de « read-render-result » ({ state, manifest }).
// expectedJobId : identifiant transmis à Unreal pour ce lancement précis
// (numéro du rendu et horodatage), jamais celui d'une tentative précédente.
export function buildRenderResultJobId(renderId, startedAtMs = Date.now()) {
  return `${Math.trunc(Number(renderId) || 0)}.${Math.trunc(Number(startedAtMs) || 0)}`;
}

export function evaluateRenderResultManifest(status, { expectedJobId = '' } = {}) {
  if (!status || status.state !== 'present' || !status.manifest || typeof status.manifest !== 'object') {
    return { decision: 'unknown', reason: status?.state === 'invalid' ? 'manifest_invalid' : 'manifest_absent' };
  }
  const manifest = status.manifest;
  if (Number(manifest.schema) !== RENDER_RESULT_SCHEMA) return { decision: 'unknown', reason: 'manifest_schema' };
  if (!String(expectedJobId || '').trim() || String(manifest.jobId ?? '').trim() !== String(expectedJobId).trim()) return { decision: 'unknown', reason: 'manifest_other_job' };
  if (manifest.success !== true) return { decision: 'failure', error: 'unreal_reported_failure' };
  const files = Array.isArray(manifest.files) ? manifest.files.map((f) => String(f || '').trim()).filter(Boolean) : [];
  const outputPath = chooseRenderOutputFromFiles(files);
  if (!outputPath) return { decision: 'unknown', reason: 'manifest_no_files' };
  return { decision: 'success', outputPath, files };
}
