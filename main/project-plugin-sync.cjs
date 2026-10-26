// Copie d'un plugin maison installée dans un projet Unreal, comparée à la
// version fournie avec UltiUnreal : une différence signale une mise à jour
// disponible (le bouton « Mettre à jour » est alors proposé).
//
// Fichiers comparés par contenu : le descripteur (.uplugin) et le code source
// (Source), qui font la version du plugin. Unreal peut recompiler un plugin
// dans le projet : ses fichiers compilés diffèrent alors de ceux fournis sans
// que la version change. Les fichiers compilés (Binaries : .dll, .modules) ne
// servent qu'aux plugins fournis sans source ; les .pdb (symboles, ~60 Mo)
// sont toujours ignorés.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function listComparedFiles(rootDir) {
  const out = [];
  const walk = (dir, accept) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, accept);
      else if (entry.isFile() && accept(entry.name)) out.push(path.relative(rootDir, full));
    }
  };
  if (fs.existsSync(path.join(rootDir, 'Source'))) {
    walk(path.join(rootDir, 'Source'), () => true);
  } else {
    walk(path.join(rootDir, 'Binaries'), (name) => /\.(dll|modules|so|dylib)$/i.test(name));
  }
  for (const entry of (() => { try { return fs.readdirSync(rootDir); } catch { return []; } })()) {
    if (/\.uplugin$/i.test(entry)) out.push(entry);
  }
  return out.map((p) => p.replace(/\\/g, '/')).sort();
}

// Fichiers texte : fins de ligne ignorées (une copie Windows en CRLF reste
// identique à la même version en LF).
const TEXT_EXTENSIONS = /\.(cpp|h|hpp|inl|cs|uplugin|ini|json|txt|md)$/i;

function fileDigest(filePath) {
  try {
    let content = fs.readFileSync(filePath);
    if (TEXT_EXTENSIONS.test(filePath)) content = Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return '';
  }
}

// true : la copie du projet diffère de la version fournie (fichier modifié,
// manquant ou en trop). false : identique. null : comparaison impossible.
function isInstalledPluginOutdated(packageDir, installedDir) {
  if (!packageDir || !installedDir) return null;
  const packaged = listComparedFiles(packageDir);
  if (packaged.length === 0) return null;
  const installed = listComparedFiles(installedDir);
  if (packaged.length !== installed.length || packaged.some((p, i) => p.toLowerCase() !== installed[i].toLowerCase())) {
    return true;
  }
  return packaged.some((rel) => fileDigest(path.join(packageDir, rel)) !== fileDigest(path.join(installedDir, rel)));
}

module.exports = { isInstalledPluginOutdated };
