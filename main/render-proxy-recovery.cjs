// Rattrapage des aperçus basse définition (proxy) manquants.
//
// L'aperçu est généré juste après la fin d'un rendu, en tâche de fond : si
// l'application s'arrête pendant ce temps, rien ne s'en souvient. Une boucle
// lente (au démarrage du serveur puis à intervalle régulier) retrouve les
// rendus terminés sans aperçu et le génère, un rendu à la fois.
//
// Un rendu dont l'aperçu est en cours de génération dans ce processus est
// sauté (registre partagé avec la génération immédiate) : deux générations
// n'écrivent jamais le même fichier en même temps. Un échec n'est retenté
// qu'au prochain démarrage (pas de boucle d'échecs).

const fs = require('fs');

const inFlight = new Set();

// Réserve la génération de l'aperçu d'un rendu ; faux si elle est déjà en cours.
function tryBeginProxyGeneration(renderId) {
  const id = Math.trunc(Number(renderId) || 0);
  if (id <= 0 || inFlight.has(id)) return false;
  inFlight.add(id);
  return true;
}

function endProxyGeneration(renderId) {
  inFlight.delete(Math.trunc(Number(renderId) || 0));
}

function parsePayload(row) {
  try {
    const value = JSON.parse(String(row?.payload_json || '{}'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function defaultFileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

// Rendus terminés dont la sortie existe mais dont l'aperçu est absent (jamais
// enregistré, ou fichier disparu).
function selectRendersMissingProxy(rows = [], { fileExists = defaultFileExists, skipIds = new Set() } = {}) {
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = Math.trunc(Number(row?.id) || 0);
    if (id <= 0 || skipIds.has(id) || inFlight.has(id)) continue;
    if (String(row?.status || '').trim() !== 'Done') continue;
    const payload = parsePayload(row);
    const outputPath = String(row?.output_path || payload.outputPath || '').trim();
    if (!outputPath || /\{\{[^{}]+\}\}/.test(outputPath)) continue;
    const proxyPath = String(payload.proxyPath || '').trim();
    if (proxyPath && fileExists(proxyPath)) continue;
    out.push(row);
  }
  return out;
}

function createProxyRecoveryLoop({
  listRows,
  isProxyEnabled,
  regenerate,
  logLine = () => {},
  firstDelayMs = 30_000,
  intervalMs = 15 * 60_000,
  fileExists = defaultFileExists,
  setTimer = (fn, ms) => {
    const timer = setTimeout(fn, ms);
    timer.unref?.();
    return timer;
  },
} = {}) {
  const attempted = new Set();
  let stopped = false;

  async function runOnce() {
    if (typeof isProxyEnabled === 'function' && !isProxyEnabled()) return { recovered: 0, failed: 0 };
    const candidates = selectRendersMissingProxy(listRows(), { fileExists, skipIds: attempted });
    let recovered = 0;
    let failed = 0;
    for (const row of candidates) {
      if (stopped) break;
      const id = Math.trunc(Number(row.id));
      if (inFlight.has(id)) continue;
      attempted.add(id);
      try {
        // regenerate réserve lui-même le rendu dans le registre (et le saute
        // s'il est déjà en cours ailleurs).
        const summary = await regenerate(row);
        // Rendu ignoré (type sans aperçu, hors des dossiers de rendu, déjà en
        // cours) : ni rattrapé ni en échec.
        if (Number(summary?.regenerated) > 0) recovered += 1;
        else if (Number(summary?.failed) > 0 || summary?.ok === false) failed += 1;
      } catch {
        failed += 1;
      }
    }
    if (recovered > 0 || failed > 0) {
      logLine({
        level: failed > 0 ? 'warn' : 'info',
        src: 'ffmpeg',
        action: 'proxy_recovery',
        message: `Aperçus rattrapés : ${recovered}, échecs : ${failed}`,
        data: { recovered, failed },
      });
    }
    return { recovered, failed };
  }

  function schedule(delayMs) {
    if (stopped) return;
    setTimer(async () => {
      try {
        await runOnce();
      } catch {}
      schedule(intervalMs);
    }, delayMs);
  }

  return {
    start() { schedule(firstDelayMs); },
    stop() { stopped = true; },
    runOnce,
  };
}

module.exports = {
  createProxyRecoveryLoop,
  endProxyGeneration,
  selectRendersMissingProxy,
  tryBeginProxyGeneration,
};
