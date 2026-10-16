// Identification du fichier produit par une tentative de rendu.
// Un média n'est retenu que s'il porte exactement le nom attendu pour ce rendu
// (nom.mov ou nom.0001.exr) et s'il a été écrit depuis le lancement du processus.
// Critère de fraîcheur : date de modification >= lancement - 2 s (granularité
// des dates de fichiers et léger décalage entre l'heure relevée et la création).
// Ce contrôle établit la présence d'un résultat, pas sa complétude : un code de
// sortie non nul reste prioritaire (voir le worker).

import { RENDER_OUTPUT_ALL_EXTS } from "./renderProcessHelpers.js";

const OUTPUT_MTIME_TOLERANCE_MS = 2000;
const MEDIA_EXT_PATTERN = RENDER_OUTPUT_ALL_EXTS.map((ext) => ext.slice(1)).join('|');

function fileNameOf(filePath = '') {
  const parts = String(filePath || '').split(/[\\/]/);
  return String(parts[parts.length - 1] || '').trim();
}

function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Retire l'extension seulement si c'est une extension média connue :
// « shot.v1 » reste « shot.v1 », « shot.v1.mov » devient « shot.v1 ».
function stripMediaExtension(name = '') {
  const value = String(name || '').trim();
  const match = new RegExp(`^(.+)\\.(${MEDIA_EXT_PATTERN})$`, 'i').exec(value);
  return match ? match[1] : value;
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
    stripMediaExtension(fileNameOf(extractMovieNameArg(args))),
    stripMediaExtension(fileNameOf(stripQuotes(expectedName))),
    stripMediaExtension(fileNameOf(outputPath)),
  ]
    .map((stem) => stem.toLowerCase())
    .filter((stem) => stem && !/[{}]/.test(stem));
  return [...new Set(stems)];
}

// Nom exact : « nom.ext » ou « nom.<numéro d'image>.ext », ext étant un média.
function matchesExpectedStem(filePath, expectedStems) {
  if (!expectedStems.length) return true;
  const name = fileNameOf(filePath).toLowerCase();
  return expectedStems.some((stem) => (
    new RegExp(`^${escapeRegExp(stem)}(\\.\\d+)?\\.(${MEDIA_EXT_PATTERN})$`, 'i').test(name)
  ));
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
    if (!isLikelyRenderOutputMedia(candidatePath)) continue;
    if (!matchesExpectedStem(candidatePath, expectedStems)) continue;
    const fileRes = await checkFileExists(candidatePath);
    if (
      fileRes?.exists === true
      && fileRes?.isFile === true
      && isWrittenSince(fileRes?.mtimeMs, minMtimeMs)
    ) {
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
