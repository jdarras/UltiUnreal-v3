// Identification du fichier produit par une tentative de rendu.
// Un média n'est retenu que s'il a été écrit après le lancement du processus
// et s'il porte le nom attendu pour ce rendu (nom.mov, nom.0001.exr...).

const OUTPUT_MTIME_TOLERANCE_MS = 2000;

function fileNameOf(filePath = '') {
  const parts = String(filePath || '').split(/[\\/]/);
  return String(parts[parts.length - 1] || '').trim();
}

function fileStemOf(filePath = '') {
  const name = fileNameOf(filePath);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

function stripQuotes(value = '') {
  return String(value || '').trim().replace(/^["']+|["']+$/g, '').trim();
}

// Valeur de -MovieName=... dans les arguments ; '' si absente ou encore tokenisée.
function extractMovieNameArg(args = []) {
  for (const arg of Array.isArray(args) ? args : []) {
    const match = /^-?MovieName=(.*)$/i.exec(String(arg || '').trim());
    if (!match) continue;
    const value = stripQuotes(match[1]);
    if (!value || /[{}]/.test(value)) return '';
    return value;
  }
  return '';
}

function buildExpectedOutputStems({ args = [], expectedName = '', outputPath = '' } = {}) {
  const stems = [
    fileStemOf(extractMovieNameArg(args)),
    fileStemOf(stripQuotes(expectedName)),
    fileStemOf(outputPath),
  ]
    .map((stem) => stem.toLowerCase())
    .filter((stem) => stem && !/[{}]/.test(stem));
  return [...new Set(stems)];
}

function matchesExpectedStem(filePath, expectedStems) {
  if (!expectedStems.length) return true;
  const name = fileNameOf(filePath).toLowerCase();
  return expectedStems.some((stem) => name.startsWith(`${stem}.`));
}

function isWrittenSince(mtimeMs, minMtimeMs) {
  const value = Number(mtimeMs);
  return Number.isFinite(value) && value >= minMtimeMs;
}

async function resolveRenderOutputArtifact({
  directCandidates = [],
  outputDirForSearch = '',
  expectedStems = [],
  processStartMs = 0,
  checkFileExists,
  findRenderOutputs,
  isLikelyRenderOutputMedia,
} = {}) {
  const minMtimeMs = Number(processStartMs || 0) - OUTPUT_MTIME_TOLERANCE_MS;

  for (const candidate of Array.isArray(directCandidates) ? directCandidates : []) {
    const candidatePath = String(candidate || '').trim();
    if (!candidatePath) continue;
    const fileRes = await checkFileExists(candidatePath);
    if (fileRes?.exists === true && isWrittenSince(fileRes?.mtimeMs, minMtimeMs)) {
      return { path: candidatePath, mismatchPath: '' };
    }
  }

  if (!outputDirForSearch) return { path: '', mismatchPath: '' };
  const scanRes = await findRenderOutputs({
    rootDir: outputDirForSearch,
    minMtimeMs: Math.max(0, minMtimeMs),
    maxDepth: 6,
    limit: 300,
  });
  const files = Array.isArray(scanRes?.files) ? scanRes.files : [];
  let mismatchPath = '';
  for (const entry of files) {
    const candidatePath = String(entry?.path || '').trim();
    if (!candidatePath) continue;
    if (!isLikelyRenderOutputMedia(candidatePath)) continue;
    if (!isWrittenSince(entry?.mtimeMs, minMtimeMs)) continue;
    if (matchesExpectedStem(candidatePath, expectedStems)) {
      return { path: candidatePath, mismatchPath: '' };
    }
    if (!mismatchPath) mismatchPath = candidatePath;
  }
  return { path: '', mismatchPath };
}

export {
  OUTPUT_MTIME_TOLERANCE_MS,
  extractMovieNameArg,
  buildExpectedOutputStems,
  resolveRenderOutputArtifact,
};
