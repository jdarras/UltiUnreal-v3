import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'main');
const outDir = path.join(rootDir, 'main-dist');

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function ensureCleanDir(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {}
  await fs.mkdir(dir, { recursive: true });
}

function splitInputs(files) {
  const cjsEntries = [];
  const jsEntries = [];
  const assets = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext === '.cjs') {
      cjsEntries.push(file);
    } else if (ext === '.js') {
      jsEntries.push(file);
    } else {
      assets.push(file);
    }
  }

  return { cjsEntries, jsEntries, assets };
}

async function buildEntries(entryPoints, outExtension) {
  if (!entryPoints.length) return;
  await esbuild.build({
    entryPoints,
    outdir: outDir,
    outbase: srcDir,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    minify: true,
    bundle: false,
    sourcemap: false,
    logLevel: 'info',
    outExtension,
  });
}

async function copyAssets(assets) {
  for (const file of assets) {
    const rel = path.relative(srcDir, file);
    const dest = path.join(outDir, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(file, dest);
  }
}

async function main() {
  const files = await collectFiles(srcDir);
  const { cjsEntries, jsEntries, assets } = splitInputs(files);

  if (!cjsEntries.length && !jsEntries.length) {
    throw new Error('No main process files found to build.');
  }

  await ensureCleanDir(outDir);

  await buildEntries(cjsEntries, { '.js': '.cjs' });
  await buildEntries(jsEntries, { '.js': '.js' });
  await copyAssets(assets);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
