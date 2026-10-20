'use strict';

const fs = require('fs');
const path = require('path');

function isPathInsideRoot(candidate, root) {
  if (!String(candidate || '').trim() || !String(root || '').trim()) return false;
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

// A configured root may itself be mounted. Below it, never follow junctions
// or symlinks, including the destination file and temporary directory.
function assertSafeSyncPath(candidate, root) {
  if (!path.isAbsolute(String(root || '')) || !path.isAbsolute(String(candidate || '')) || !isPathInsideRoot(candidate, root)) {
    throw Object.assign(new Error('Chemin hors du dossier de synchronisation'), { code: 'unsafe_sync_path' });
  }
  const absoluteRoot = path.resolve(root);
  const relative = path.relative(absoluteRoot, path.resolve(candidate));
  let current = absoluteRoot;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw Object.assign(new Error('Lien ou jonction interdit dans le dossier de synchronisation'), { code: 'unsafe_sync_path' });
      }
    } catch (error) {
      if (error.code === 'ENOENT') break;
      throw error;
    }
  }
  return path.resolve(candidate);
}

module.exports = { isPathInsideRoot, assertSafeSyncPath };
