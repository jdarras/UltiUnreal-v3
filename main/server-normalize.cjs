// main/server-normalize.cjs
// Helpers de normalisation pour les données côté serveur (hosts, etc.)
const path = require('path');

const DEFAULT_UNREAL_PROCESS_CANDIDATES = [
  'UnrealEditor.exe',
  'UE4Editor.exe',
  'UE5Editor.exe',
  'UE4Game.exe',
  'UE5Game.exe',
];

/**
 * Transforme le contenu brut de hosts_server.json (array ou objet)
 * en une liste normalisée de hosts : [{ ip, name, unreal_editor, uproject, syncRoot, syncEnabled, ... }]
 * - trim des IP/chemins
 * - déduplication par IP (1ère occurrence conservée)
 */
function hostsToList(rawHosts) {
  if (!rawHosts) return [];

  const normPath = (v) => String(v || '').trim();
  const seen = new Set();
  const out = [];

  const pushIfNew = (host) => {
    const ip = String(host?.ip || '').trim();
    if (!ip || seen.has(ip)) return;
    seen.add(ip);
    out.push({
      ...host,
      ip,
      unreal_editor: normPath(host?.unreal_editor),
      unrealEditors:
        (host.unrealEditors && typeof host.unrealEditors === 'object')
          ? Object.fromEntries(
              Object.entries(host.unrealEditors).map(([k, v]) => [
                String(k || '').trim(),
                normPath(v),
              ])
            )
          : (host.unreal_editors && typeof host.unreal_editors === 'object')
            ? Object.fromEntries(
                Object.entries(host.unreal_editors).map(([k, v]) => [
                  String(k || '').trim(),
                  normPath(v),
                ])
              )
            : {},
      uproject: normPath(host?.uproject),
      syncRoot: normPath(host?.syncRoot || host?.sync_root),
      syncEnabled: !!host?.syncEnabled || !!host?.sync_enabled,
      sortIndex: Number.isFinite(Number(host?.sortIndex))
        ? Number(host.sortIndex)
        : out.length,
      eligible: host?.eligible === false ? false : true,
      renderEnabled: host?.renderEnabled === false || host?.render_enabled === false ? false : true,
    });
  };

  // Cas 1 : déjà un tableau
  if (Array.isArray(rawHosts)) {
    for (const h of rawHosts.filter(Boolean)) {
      const ip = String(h.ip || h.address || '').trim();
      if (!ip) continue;
      pushIfNew({ ...h, ip });
    }
    return out;
  }

  // Cas 2 : objet { ip: { ...cfg }, ... }
  if (rawHosts && typeof rawHosts === 'object') {
    for (const [key, cfg] of Object.entries(rawHosts)) {
      if (!cfg || typeof cfg !== 'object') continue;
      const ipFromKey = String(key || '').trim();
      const ip = ipFromKey || String(cfg.ip || cfg.address || '').trim();
      if (!ip) continue;
      pushIfNew({ ip, ...cfg });
    }
    return out;
  }

  // Cas fallback
  return [];
}

function getUnrealProcessCandidates(host = {}) {
  const out = [];
  const seen = new Set();

  const pushBaseName = (v) => {
    const raw = String(v || '').trim();
    if (!raw) return;
    const base = path.basename(raw) || raw;
    const key = base.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(base);
  };

  const addMapValues = (map) => {
    if (!map || typeof map !== 'object') return;
    for (const p of Object.values(map)) pushBaseName(p);
  };

  // Nouveau format principal
  addMapValues(host.unrealEditors);
  // Legacy map
  addMapValues(host.unreal_editors);
  // Legacy champ unique
  pushBaseName(host.unreal_editor);
  // Legacy clés plates: unreal_editor_<version>
  for (const [k, v] of Object.entries(host || {})) {
    const key = String(k || '').trim();
    if (!/^unreal_editor_.+/i.test(key)) continue;
    pushBaseName(v);
  }

  // Fallback générique
  for (const n of DEFAULT_UNREAL_PROCESS_CANDIDATES) pushBaseName(n);

  return out;
}

module.exports = {
  hostsToList,
  getUnrealProcessCandidates,
};
