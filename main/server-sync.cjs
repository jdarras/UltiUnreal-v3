// main/server-sync.cjs
// Gestion complète de la synchronisation des projets Unreal

const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const {
  readJSON,
  collectFilesRecursive,
  getJSON,
  ensureDir,
} = require("./server-files.cjs");

const { hostsToList } = require("./server-normalize.cjs");
const { saveProjects, readProjectMeta } = require("./server-projects.cjs");
const { statSync, readdirSync } = fs;

function resolveUprojectPath(rawPath) {
  const p = String(rawPath || "").trim();
  if (!p) return "";
  if (p.toLowerCase().endsWith(".uproject")) return p;
  try {
    const st = statSync(p);
    if (st && st.isDirectory()) {
      const files = readdirSync(p, { withFileTypes: true });
      const found = files.find(
        (f) => f.isFile() && f.name.toLowerCase().endsWith(".uproject")
      );
      if (found) return path.join(p, found.name);
    }
  } catch {
    // ignore
  }
  return p;
}

const SYNC_IGNORE_DIRS = [
  "Intermediate",
  "Saved",
  "DerivedDataCache",
  ".vs",
  "Binaries",
];

const SYNC_MTIME_TOLERANCE_MS = 2;

function fileMtimeMs(file) {
  const raw = Number(file?.mtimeMs);
  return Number.isFinite(raw) ? raw : null;
}

function fileMetadataMatches(srcFile, dstFile) {
  if (!srcFile || !dstFile) return false;
  if (srcFile.size !== dstFile.size) return false;
  const srcMtimeMs = fileMtimeMs(srcFile);
  const dstMtimeMs = fileMtimeMs(dstFile);
  if (srcMtimeMs === null || dstMtimeMs === null) {
    return srcMtimeMs === dstMtimeMs;
  }
  return Math.abs(srcMtimeMs - dstMtimeMs) <= SYNC_MTIME_TOLERANCE_MS;
}

function addMtimeParam(url, mtimeMs) {
  const raw = Number(mtimeMs);
  if (!Number.isFinite(raw) || raw <= 0) return url;
  return `${url}&mtimeMs=${encodeURIComponent(String(raw))}`;
}

function computeDiffs(srcFiles, dstFiles) {
  const added = [];
  const modified = [];
  const removed = [];

  const a = srcFiles || {};
  const b = dstFiles || {};

  const all = new Set([
    ...Object.keys(a),
    ...Object.keys(b),
  ]);

  for (const rel of all) {
    const fa = a[rel];
    const fb = b[rel];

    if (fa && !fb) {
      added.push(rel);
    } else if (!fa && fb) {
      removed.push(rel);
    } else if (fa && fb && !fileMetadataMatches(fa, fb)) {
      modified.push(rel);
    }
  }

  return { added, modified, removed };
}

function shouldIgnore(relPath, patterns) {
  if (!patterns || patterns.length === 0) return false;
  const unixPath = String(relPath || "").replace(/\\/g, "/").toLowerCase();

  for (const raw of patterns) {
    const p = String(raw || "").trim().toLowerCase();
    if (!p) continue;

    // On supporte des patterns simples : "*.log", "Saved/**", "Config/Default*.ini"
    const pattern = p.replace(/\\/g, "/");

    const regex = new RegExp(
      "^" +
        pattern
          .replace(/\./g, "\\.")
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^/]*") +
        "$"
    );

    if (regex.test(unixPath)) return true;
  }

  return false;
}

// Ces constantes seront injectées par server.cjs au moment de l’appel
let logLine, sendJSON, COMMON_FILE, HOSTS_FILE, loadProjects;
const lastSyncCheckSignatureByHost = new Map();
const lastSyncCheckStateByHost = new Map(); // "ok" | "error"

function normalizeProjectUsageModeLocal(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const key = raw.toLowerCase();
  const aliases = new Map([
    ["live", "live"],
    ["auto_render", "auto_render"],
    ["render", "auto_render"],
    ["rendu_automatique", "auto_render"],
    ["rendu automatique", "auto_render"],
    ["live_auto_render", "live_auto_render"],
    ["live + rendu automatique", "live_auto_render"],
    ["live et rendu automatique", "live_auto_render"],
    ["live_and_auto_render", "live_auto_render"],
    ["other", "other"],
    ["autre", "other"],
  ]);
  return aliases.get(key) || "";
}

function isRenderAutoUsageMode(value) {
  const mode = normalizeProjectUsageModeLocal(value);
  return mode === "auto_render" || mode === "live_auto_render";
}

function resolveProjectSyncIgnore(project, ip) {
  const syncIgnore =
    project &&
    project.syncIgnore &&
    typeof project.syncIgnore === "object"
      ? project.syncIgnore
      : {};
  return [
    ...(Array.isArray(syncIgnore.default) ? syncIgnore.default : []),
    ...(Array.isArray(syncIgnore[ip]) ? syncIgnore[ip] : []),
  ]
    .map((v) => String(v || "").replace(/\\/g, "/").trim())
    .filter(Boolean);
}

function resolveRenderEligibleProjects(projectsDoc) {
  const projects = Array.isArray(projectsDoc?.projects) ? projectsDoc.projects : [];
  return projects.filter((project) => {
    if (!project || typeof project !== "object") return false;
    let usageMode = String(project.metaUsageMode || project.usageMode || "").trim();
    if (!usageMode) {
      try {
        const meta = readProjectMeta(String(project.id || "").trim()) || {};
        usageMode = String(meta.usageMode || meta.modeDefault || "").trim();
      } catch {
        usageMode = "";
      }
    }
    return isRenderAutoUsageMode(usageMode);
  });
}

function resolveSourceUprojectForProject(project, hostList, projectsDoc) {
  const list = Array.isArray(hostList) ? hostList : [];
  const pj = projectsDoc && typeof projectsDoc === "object" ? projectsDoc : {};
  const activeByHost =
    pj?.activeByHost && typeof pj.activeByHost === "object"
      ? pj.activeByHost
      : {};
  const projectId = String(project?.id || "").trim();
  const sourceIp = String(project?.sourceHostIp || "").trim();
  const sourceHost = sourceIp
    ? (list.find((h) => String(h?.ip || h?.address || "").trim() === sourceIp) || null)
    : null;

  let sourceUproject = "";
  if (sourceIp && projectId) {
    const perHost = activeByHost[sourceIp];
    if (perHost && typeof perHost === "object") {
      const raw = perHost[projectId];
      if (raw) sourceUproject = resolveUprojectPath(raw);
    }
  }

  if (!sourceUproject) {
    sourceUproject = resolveUprojectPath(
      project?.uproject || project?.projectPath || project?.path || ""
    );
  }

  if (!sourceUproject && sourceHost && sourceHost.uproject) {
    sourceUproject = resolveUprojectPath(sourceHost.uproject);
  }

  return {
    sourceUproject,
    sourceIp,
    sourceHostName: String(sourceHost?.name || sourceIp || "").trim(),
  };
}

async function getRemoteInventory({ ip, agentPort, destDir }) {
  const urlInv = `http://${ip}:${agentPort}/agent/sync/inventory?destDir=${encodeURIComponent(
    destDir
  )}`;
  const inv = await getJSON(urlInv, 8000);
  if (!inv?.ok || typeof inv.files !== "object") {
    const safeInv = {
      ok: inv?.ok || false,
      error: inv?.error || null,
      text: typeof inv?.text === "string" ? inv.text.slice(0, 2000) : undefined,
      filesKeysCount:
        inv && typeof inv.files === "object" ? Object.keys(inv.files).length : undefined,
    };
    const err = new Error("Réponse d'inventaire distante invalide");
    err.syncCheckData = safeInv;
    throw err;
  }
  return inv.files || {};
}

function buildScopeResponseStatus(projectRows) {
  const rows = Array.isArray(projectRows) ? projectRows : [];
  if (rows.length === 0) return "no_projects";
  if (rows.some((r) => r && r.status === "error")) return "error";
  if (rows.some((r) => r && r.status === "desync")) return "desync";
  if (rows.some((r) => r && r.status === "no_root")) return "no_root";
  if (rows.some((r) => r && r.status === "no_source")) return "no_source";
  return "in_sync";
}

async function checkRenderScopeForHost({ ip, hostList, projectsDoc, agentPort }) {
  const list = Array.isArray(hostList) ? hostList : [];
  const targetHost = list.find((h) => (h.ip || h.address || "").trim() === ip);
  if (!targetHost) {
    return {
      ok: false,
      error: "unknown_host",
      message: `Machine ${ip} introuvable.`,
    };
  }

  const syncRoot = String(targetHost.syncRoot || "").trim();
  if (!syncRoot) {
    return {
      ok: true,
      scope: "render_auto",
      status: "no_root",
      message: "Aucun dossier de synchro défini.",
      projectCount: 0,
      desyncCount: 0,
      diffCount: 0,
      rawDiffCount: 0,
      projects: [],
    };
  }

  const renderProjects = resolveRenderEligibleProjects(projectsDoc);
  if (renderProjects.length === 0) {
    return {
      ok: true,
      scope: "render_auto",
      status: "no_projects",
      message: "Aucun projet en mode rendu automatique.",
      projectCount: 0,
      desyncCount: 0,
      diffCount: 0,
      rawDiffCount: 0,
      projects: [],
    };
  }

  const rows = [];
  let totalDiff = 0;
  let totalRawDiff = 0;
  let desyncCount = 0;

  for (const project of renderProjects) {
    const projectId = String(project?.id || "").trim();
    const projectName = String(project?.name || projectId || "").trim();
    const source = resolveSourceUprojectForProject(project, list, projectsDoc);
    if (!source.sourceUproject) {
      rows.push({
        projectId,
        projectName,
        status: "no_source",
        message: "Aucune source de vérité détectée.",
        sourceHostIp: source.sourceIp,
        sourceHostName: source.sourceHostName,
        sourceDir: "",
        destDir: "",
        diffCount: 0,
        rawDiffCount: 0,
        added: [],
        modified: [],
        removed: [],
        effectiveAdded: [],
        effectiveModified: [],
        effectiveRemoved: [],
      });
      continue;
    }

    const sourceDir = path.dirname(source.sourceUproject);
    const projectFolderName = path.basename(sourceDir);
    const destDir = path.join(syncRoot, projectFolderName);

    try {
      const srcFilesAll = await collectFilesRecursive(sourceDir, SYNC_IGNORE_DIRS);
      const srcFiles = {};
      for (const rel of Object.keys(srcFilesAll)) srcFiles[rel] = srcFilesAll[rel];

      const dstFiles = await getRemoteInventory({ ip, agentPort, destDir });
      const { added, modified, removed } = computeDiffs(srcFiles, dstFiles);

      const ignorePatterns = resolveProjectSyncIgnore(project, ip);
      const isIgnored = (rel) =>
        shouldIgnore(String(rel || "").replace(/\\/g, "/"), ignorePatterns);

      const effectiveAdded = added.filter((rel) => !isIgnored(rel));
      const effectiveModified = modified.filter((rel) => !isIgnored(rel));
      const effectiveRemoved = removed.filter((rel) => !isIgnored(rel));
      const effectiveDiffCount =
        effectiveAdded.length + effectiveModified.length + effectiveRemoved.length;
      const rawDiffCount = added.length + modified.length + removed.length;
      const status = effectiveDiffCount === 0 ? "in_sync" : "desync";
      if (status === "desync") desyncCount += 1;
      totalDiff += effectiveDiffCount;
      totalRawDiff += rawDiffCount;

      rows.push({
        projectId,
        projectName,
        status,
        sourceHostIp: source.sourceIp,
        sourceHostName: source.sourceHostName,
        sourceDir,
        destDir,
        diffCount: effectiveDiffCount,
        rawDiffCount,
        added,
        modified,
        removed,
        effectiveAdded,
        effectiveModified,
        effectiveRemoved,
      });
    } catch (e) {
      rows.push({
        projectId,
        projectName,
        status: "error",
        message: String(e?.message || "Erreur de comparaison"),
        sourceHostIp: source.sourceIp,
        sourceHostName: source.sourceHostName,
        sourceDir,
        destDir,
        diffCount: 0,
        rawDiffCount: 0,
        added: [],
        modified: [],
        removed: [],
        effectiveAdded: [],
        effectiveModified: [],
        effectiveRemoved: [],
      });
    }
  }

  return {
    ok: true,
    scope: "render_auto",
    status: buildScopeResponseStatus(rows),
    projectCount: rows.length,
    desyncCount,
    diffCount: totalDiff,
    rawDiffCount: totalRawDiff,
    projects: rows,
  };
}

function logSyncCheckError(ip, message, data = undefined) {
  if (typeof logLine !== "function") return;
  const host = String(ip || "").trim();
  const prevState = lastSyncCheckStateByHost.get(host);
  // Limiter le bruit: on log uniquement au passage en état KO.
  if (prevState === "error") return;
  lastSyncCheckStateByHost.set(host, "error");
  const safeMessage = String(message || "Erreur sync_check");
  const entry = {
    level: "error",
    src: "server",
    action: "sync_check_error",
    host,
    message: safeMessage,
  };
  if (data && typeof data === "object") entry.data = data;
  logLine(entry);
}

function resolveSourceUproject(hostList) {
  const list = Array.isArray(hostList) ? hostList : [];
  const pj = typeof loadProjects === "function" ? loadProjects() : {};
  const projects = Array.isArray(pj?.projects) ? pj.projects : [];
  const activeId = pj?.activeId || "";
  const activeByHost =
    pj?.activeByHost && typeof pj.activeByHost === "object"
      ? pj.activeByHost
      : {};

  let active = null;
  if (activeId) {
    active = projects.find((p) => p && p.id === activeId) || null;
  }

  // Utiliser sourceHostIp du projet actif pour identifier la machine source
  const sourceIp = String(active?.sourceHostIp || "").trim();
  const sourceHost = sourceIp
    ? (list.find((h) => String(h?.ip || h?.address || "").trim() === sourceIp) || null)
    : null;

  // Fallback : première machine de la liste (hôte local)
  const localHost = list[0] || null;
  const effectiveHost = sourceHost || localHost;
  const effectiveIp = effectiveHost
    ? String(effectiveHost.ip || effectiveHost.address || "").trim()
    : "";

  // 1) activeByHost pour la machine source (clé = projectId)
  let sourceUproject = "";
  if (effectiveIp) {
    const perHost = activeByHost[effectiveIp];
    const key = (active && active.id) || "";
    if (perHost && typeof perHost === "object") {
      if (key && perHost[key]) {
        sourceUproject = resolveUprojectPath(perHost[key]);
      }
      if (!sourceUproject) {
        const first = Object.values(perHost).find(Boolean);
        if (first) sourceUproject = resolveUprojectPath(first);
      }
    }
  }

  // 2) Projet actif (uproject / projectPath / path)
  if (!sourceUproject) {
    sourceUproject =
      resolveUprojectPath(
        active?.uproject || active?.projectPath || active?.path || ""
      ) || "";
  }

  // 3) uproject direct sur la machine source (fallback)
  if (!sourceUproject && effectiveHost && effectiveHost.uproject) {
    sourceUproject = resolveUprojectPath(effectiveHost.uproject);
  }

  // 4) Dernier recours : premier projet de la liste
  if (!sourceUproject && projects.length) {
    const firstProj = projects[0];
    sourceUproject = resolveUprojectPath(
      firstProj?.uproject || firstProj?.projectPath || firstProj?.path || ""
    );
  }

  return sourceUproject;
}

// Fonction principale appelée depuis server.cjs
async function handleSync(req, res, url, context) {
  // Récupération du contexte fourni par server.cjs
  ({ logLine, sendJSON, COMMON_FILE, HOSTS_FILE, loadProjects } = context);

  // ======================= AGENT LOCAL: INVENTAIRE =======================
  if (req.method === "GET" && url.pathname === "/agent/sync/inventory") {
    const destDir = (url.searchParams.get("destDir") || "").trim();
    if (!destDir) {
      return sendJSON(res, 400, {
        ok: false,
        error: "missing_destDir",
        message: "Paramètre destDir obligatoire pour /agent/sync/inventory",
      });
    }
    try {
      let stats = null;
      try {
        stats = await fsp.stat(destDir);
      } catch {
        stats = null;
      }
      if (!stats || !stats.isDirectory()) {
        return sendJSON(res, 200, { ok: true, exists: false, files: {} });
      }
      const files = await collectFilesRecursive(destDir, SYNC_IGNORE_DIRS);

      logLine({
        level: "debug",
        src: "agent",
        action: "sync_inventory",
        message: `Inventaire de ${destDir} (${Object.keys(files).length} fichiers)`,
      });
      return sendJSON(res, 200, { ok: true, exists: true, files });
    } catch (e) {
      logLine({
        level: "error",
        src: "agent",
        action: "sync_inventory_error",
        message: e.message,
      });
      return sendJSON(res, 200, { ok: false, error: "inventory_error", message: e.message });
    }
  }

  // ======================= SERVEUR: CHECK SYNCHRO =======================
  if (req.method === "GET" && url.pathname === "/agent/sync/check") {
    const ip = (url.searchParams.get("ip") || "").trim();
    const scope = String(url.searchParams.get("scope") || "").trim().toLowerCase();
    const direction = String(url.searchParams.get("direction") || "auto").trim().toLowerCase();
    if (!ip) {
      return sendJSON(res, 400, {
        ok: false,
        error: "missing_ip",
        message: "Paramètre ip manquant",
      });
    }

    const rawHosts = readJSON(HOSTS_FILE) || {};
    const list = hostsToList(rawHosts);
    const common = readJSON(COMMON_FILE) || {};
    const agentPort = common.agentPort || 4000;
    const projectsDoc = typeof loadProjects === "function" ? loadProjects() : {};

    if (scope === "render_auto") {
      try {
        const scoped = await checkRenderScopeForHost({
          ip,
          hostList: list,
          projectsDoc,
          agentPort,
        });
        return sendJSON(res, 200, {
          ...scoped,
          direction: direction || "auto",
        });
      } catch (e) {
        const errMessage = String(e?.message || "Erreur sync_check render_auto");
        return sendJSON(res, 200, {
          ok: false,
          scope: "render_auto",
          direction: direction || "auto",
          error: "compare_error",
          message: errMessage,
        });
      }
    }

    const sourceUproject = resolveSourceUproject(list);

    if (!sourceUproject)
      return sendJSON(res, 200, {
        ok: false,
        error: "no_source",
        message: "Aucun .uproject source trouvé sur le serveur.",
      });

    const sourceDir = path.dirname(sourceUproject);
    const targetHost = list.find((h) => (h.ip || h.address || "").trim() === ip);
    if (!targetHost)
      return sendJSON(res, 200, { ok: false, error: "unknown_host", message: `Machine ${ip} introuvable.` });

    const syncRoot = (targetHost.syncRoot || "").trim();
    if (!syncRoot)
      return sendJSON(res, 200, { ok: true, status: "no_root", message: "Aucun dossier de synchro défini." });

    const projectName = path.basename(sourceDir);
    const destDir = path.join(syncRoot, projectName);

        try {
        // Inventaire source (serveur)
        const srcFilesAll = await collectFilesRecursive(sourceDir, SYNC_IGNORE_DIRS);

        const srcFiles = {};
        for (const rel of Object.keys(srcFilesAll)) {
          srcFiles[rel] = srcFilesAll[rel];
        }

        const urlInv = `http://${ip}:${agentPort}/agent/sync/inventory?destDir=${encodeURIComponent(
          destDir
        )}`;
        const inv = await getJSON(urlInv, 8000);
        if (!inv?.ok || typeof inv.files !== "object") {
          const safeInv = {
            ok: inv?.ok || false,
            error: inv?.error || null,
            text: typeof inv?.text === "string" ? inv.text.slice(0, 2000) : undefined,
            filesKeysCount:
              inv && typeof inv.files === "object" ? Object.keys(inv.files).length : undefined,
          };
          const err = new Error("Réponse d'inventaire distante invalide");
          err.syncCheckData = safeInv;
          throw err;
        }

        // Inventaire destination (machine)
        const dstFilesAll = inv.files || {};
        const dstFiles = { ...dstFilesAll };

        // Calcul des diffs détaillés (listes de chemins relatifs)
        const { added, modified, removed } = computeDiffs(srcFiles, dstFiles);
        const rawDiffCount =
          (added.length || 0) +
          (modified.length || 0) +
          (removed.length || 0);

        // Diff "effectif" = différences non ignorées (syncIgnore global + machine)
        const pj = typeof loadProjects === "function" ? loadProjects() : {};
        const projects = Array.isArray(pj?.projects) ? pj.projects : [];
        const activeId = String(pj?.activeId || "").trim();
        const activeName = String(pj?.activeName || "").trim().toLowerCase();
        const activeProject =
          projects.find(
            (p) => p && String(p.id || "").trim() === activeId
          ) ||
          projects.find(
            (p) =>
              p &&
              activeName &&
              String(p.name || "").trim().toLowerCase() === activeName
          ) ||
          null;

        const syncIgnore =
          activeProject &&
          activeProject.syncIgnore &&
          typeof activeProject.syncIgnore === "object"
            ? activeProject.syncIgnore
            : {};
        const ignorePatterns = [
          ...(Array.isArray(syncIgnore.default) ? syncIgnore.default : []),
          ...(Array.isArray(syncIgnore[ip]) ? syncIgnore[ip] : []),
        ]
          .map((v) => String(v || "").replace(/\\/g, "/").trim())
          .filter(Boolean);

        const isIgnored = (rel) =>
          shouldIgnore(String(rel || "").replace(/\\/g, "/"), ignorePatterns);

        const effectiveAdded = added.filter((rel) => !isIgnored(rel));
        const effectiveModified = modified.filter((rel) => !isIgnored(rel));
        const effectiveRemoved = removed.filter((rel) => !isIgnored(rel));
        const effectiveDiffCount =
          (effectiveAdded.length || 0) +
          (effectiveModified.length || 0) +
          (effectiveRemoved.length || 0);

        const status = effectiveDiffCount === 0 && inv.exists ? "in_sync" : "desync";

        const syncSig = `${status}|${effectiveDiffCount}|${rawDiffCount}`;
        const prevSig = lastSyncCheckSignatureByHost.get(ip);
        if (prevSig !== syncSig) {
          lastSyncCheckSignatureByHost.set(ip, syncSig);
          logLine({
            level: status === "in_sync" ? "success" : "info",
            src: "server",
            action: "sync_check",
            host: ip,
            message: `sync_check ${status === "in_sync" ? "synchronisé" : "désynchronisé"} (effectif:${effectiveDiffCount}, brut:${rawDiffCount})`,
            data: {
              addedCount: added.length,
              modifiedCount: modified.length,
              removedCount: removed.length,
              effectiveAddedCount: effectiveAdded.length,
              effectiveModifiedCount: effectiveModified.length,
              effectiveRemovedCount: effectiveRemoved.length,
            },
          });
        }
        const prevSyncState = lastSyncCheckStateByHost.get(ip);
        if (prevSyncState === "error") {
          logLine?.({
            level: "success",
            src: "server",
            action: "sync_check_recovered",
            host: ip,
            message: "Communication de synchronisation rétablie",
          });
        }
        lastSyncCheckStateByHost.set(ip, "ok");

        return sendJSON(res, 200, {
          ok: true,
          status,
          // Compat: diffCount = diff effectif (utilisé pour décider "in_sync"/"desync")
          diffCount: effectiveDiffCount,
          effectiveDiffCount,
          rawDiffCount,
          ignoredDiffCount: Math.max(0, rawDiffCount - effectiveDiffCount),
          added,
          modified,
          removed,
          effectiveAdded,
          effectiveModified,
          effectiveRemoved,
          sourceDir,
          destDir,
          projectName,
        });
      } catch (e) {
        const errMessage = String(e?.message || "Erreur sync_check");
        const errData =
          e && typeof e === "object" && e.syncCheckData && typeof e.syncCheckData === "object"
            ? e.syncCheckData
            : undefined;
        logSyncCheckError(ip, errMessage, errData);
        return sendJSON(res, 200, {
          ok: false,
          error: "compare_error",
          message: errMessage,
        });
      }
 }

  // ======================= AGENT LOCAL: RÉCEPTION / SUPPRESSION FICHIER =======================
  if (req.method === "POST" && url.pathname === "/agent/sync/file") {
    const destDir = (url.searchParams.get("destDir") || "").trim();
    let rel = (url.searchParams.get("rel") || "").trim();
    const op = (url.searchParams.get("op") || "").trim(); // '', 'delete'
    const requestedMtimeMs = Number(url.searchParams.get("mtimeMs"));
    const hasRequestedMtime =
      Number.isFinite(requestedMtimeMs) && requestedMtimeMs > 0;

    if (!destDir || !rel) {
      return sendJSON(res, 400, {
        ok: false,
        error: "missing_params",
        message: "destDir et rel requis pour /agent/sync/file",
      });
    }

    rel = rel.replace(/^[/\\]+/, "");
    const absDest = path.resolve(destDir || "");
    const fullPath = path.resolve(absDest, rel);
    const relFromDest = path.relative(absDest, fullPath);
    if (!relFromDest || relFromDest.startsWith("..") || path.isAbsolute(relFromDest)) {
      return sendJSON(res, 400, {
        ok: false,
        error: "invalid_path",
        message: "Chemin hors de destDir interdit",
      });
    }

    // Mode suppression : on supprime le fichier, puis on tente de nettoyer
    // les répertoires vides parents jusqu'à destDir (prune).
    if (op === "delete") {
      // Défense : éviter les sorties de destDir via des chemins "../../"
      const absFull = fullPath;

      // Helper: tenter de supprimer des répertoires vides en remontant
      async function pruneEmptyDirs(baseDir, startRel) {
        let pruned = 0;
        if (!startRel) return pruned;
        let current = path.dirname(startRel);
        // Remonter tant que current n'est pas '.' et que le chemin résolu est sous baseDir
        while (current && current !== ".") {
          const curAbs = path.resolve(baseDir, current);
          if (!curAbs.startsWith(baseDir)) break;
          try {
            // rmdir ne supprime que si vide
            await fsp.rmdir(curAbs);
            pruned++;
          } catch (err) {
            if (err && (err.code === "ENOTEMPTY" || err.code === "EEXIST")) {
              // dossier non vide : stop
              break;
            }
            if (err && err.code === "ENOENT") {
              // déjà supprimé : continuer vers le parent
            } else {
              // autre erreur : arrêter
              break;
            }
          }
          // remonter d'un niveau
          const parent = path.dirname(current);
          if (!parent || parent === current) break;
          current = parent;
        }
        return pruned;
      }

      try {
        // Stat pour connaître le type
        let st = null;
        try {
          st = await fsp.stat(absFull);
        } catch {
          st = null;
        }

        if (st && st.isDirectory()) {
          // Tentative de suppression du répertoire uniquement si vide
          try {
            await fsp.rmdir(absFull);
            return sendJSON(res, 200, { ok: true, rel, deleted: true, dir: true, pruned: 1 });
          } catch (e) {
            if (e && e.code === "ENOTEMPTY") {
              return sendJSON(res, 200, { ok: false, error: "dir_not_empty", message: "Le répertoire n'est pas vide" });
            }
            if (e && e.code === "ENOENT") {
              return sendJSON(res, 200, { ok: true, rel, deleted: true });
            }
            return sendJSON(res, 200, { ok: false, error: "delete_error", message: e.message });
          }
        }

        // Suppression d'un fichier
        try {
          await fsp.unlink(absFull);
        } catch (e) {
          if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) {
            // fichier déjà absent ou path non-fichier -> considérer comme réussi
            return sendJSON(res, 200, { ok: true, rel, deleted: true });
          }
          return sendJSON(res, 200, { ok: false, error: "delete_error", message: e.message });
        }

        // Après suppression du fichier, tenter de supprimer les répertoires vides parents
        const relDir = path.dirname(rel || "");
        const pruned = await pruneEmptyDirs(absDest, relDir === "." ? "" : relDir);

        return sendJSON(res, 200, { ok: true, rel, deleted: true, pruned });
      } catch (e) {
        return sendJSON(res, 200, { ok: false, error: "delete_error", message: e.message });
      }
    }

    // Mode copie classique
    try {
      ensureDir(fullPath);
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const buf = Buffer.concat(chunks);
      await fsp.writeFile(fullPath, buf);
      if (hasRequestedMtime) {
        const mtime = new Date(requestedMtimeMs);
        await fsp.utimes(fullPath, mtime, mtime);
      }
      return sendJSON(res, 200, {
        ok: true,
        rel,
        size: buf.length,
        ...(hasRequestedMtime ? { mtimeMs: requestedMtimeMs } : {}),
      });
    } catch (e) {
      return sendJSON(res, 200, { ok: false, error: "write_error", message: e.message });
    }
  }

    // ======================= SERVEUR: COPIE SYNCHRO =======================
  if (req.method === "POST" && url.pathname === "/agent/sync/copy") {
    const ip = (url.searchParams.get("ip") || "").trim();
    const scope = String(url.searchParams.get("scope") || "").trim().toLowerCase();
    const direction = String(url.searchParams.get("direction") || "auto").trim().toLowerCase();
    if (!ip) {
      return sendJSON(res, 400, {
        ok: false,
        error: "missing_ip",
        message: "Paramètre ip manquant",
      });
    }

    // On lit éventuellement une sélection envoyée par le front :
    // { added: [...], modified: [...], removed: [...] }
    let selection = null;
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      if (chunks.length > 0) {
        const txt = Buffer.concat(chunks).toString("utf8");
        if (txt.trim()) {
          selection = JSON.parse(txt);
        }
      }
    } catch {
      selection = null;
    }

    const common = readJSON(COMMON_FILE) || {};
    const agentPort = common.agentPort || 4000;
    const rawHosts = readJSON(HOSTS_FILE) || {};
    const list = hostsToList(rawHosts);
    const targetHost = list.find((h) => (h.ip || h.address || "").trim() === ip);
    if (!targetHost) {
      return sendJSON(res, 200, {
        ok: false,
        error: "unknown_host",
        message: `Machine ${ip} introuvable.`,
      });
    }

    if (scope === "render_auto") {
      const syncRoot = String(targetHost.syncRoot || "").trim();
      if (!syncRoot) {
        return sendJSON(res, 200, {
          ok: true,
          scope: "render_auto",
          direction: direction || "auto",
          status: "no_root",
          message: "Aucun dossier de synchro défini.",
          copied: 0,
          deleted: 0,
          total: 0,
          copyErrors: 0,
          deleteErrors: 0,
          projectCount: 0,
          projects: [],
        });
      }

      const projectsDoc = typeof loadProjects === "function" ? loadProjects() : {};
      const renderProjects = resolveRenderEligibleProjects(projectsDoc);
      if (renderProjects.length === 0) {
        return sendJSON(res, 200, {
          ok: true,
          scope: "render_auto",
          direction: direction || "auto",
          status: "no_projects",
          message: "Aucun projet en mode rendu automatique.",
          copied: 0,
          deleted: 0,
          total: 0,
          copyErrors: 0,
          deleteErrors: 0,
          projectCount: 0,
          projects: [],
        });
      }

      let totalCopied = 0;
      let totalDeleted = 0;
      let totalCopyErrors = 0;
      let totalDeleteErrors = 0;
      let totalAddedCount = 0;
      let totalModifiedCount = 0;
      let totalRemovedCount = 0;
      const projectRows = [];

      const sendFileToHost = async (destDir, rel, buf, mtimeMs) => {
        const urlFileBase = `http://${ip}:${agentPort}/agent/sync/file?destDir=${encodeURIComponent(
          destDir
        )}&rel=${encodeURIComponent(rel)}`;
        const urlFile = addMtimeParam(urlFileBase, mtimeMs);
        const resp = await fetch(urlFile, { method: "POST", body: buf });
        const txt = await resp.text();
        try {
          return JSON.parse(txt || "{}");
        } catch {
          return {};
        }
      };

      const deleteFileOnHost = async (destDir, rel) => {
        const urlDel = `http://${ip}:${agentPort}/agent/sync/file?destDir=${encodeURIComponent(
          destDir
        )}&rel=${encodeURIComponent(rel)}&op=delete`;
        const resp = await fetch(urlDel, { method: "POST" });
        const txt = await resp.text();
        try {
          return JSON.parse(txt || "{}");
        } catch {
          return {};
        }
      };

      for (const project of renderProjects) {
        const projectId = String(project?.id || "").trim();
        const projectName = String(project?.name || projectId || "").trim();
        const source = resolveSourceUprojectForProject(project, list, projectsDoc);
        if (!source.sourceUproject) {
          projectRows.push({
            projectId,
            projectName,
            status: "no_source",
            message: "Aucune source de vérité détectée.",
            copied: 0,
            deleted: 0,
            copyErrors: 0,
            deleteErrors: 0,
            addedCount: 0,
            modifiedCount: 0,
            removedCount: 0,
          });
          continue;
        }

        const sourceDir = path.dirname(source.sourceUproject);
        const projectFolderName = path.basename(sourceDir);
        const destDir = path.join(syncRoot, projectFolderName);

        let copied = 0;
        let deleted = 0;
        let copyErrors = 0;
        let deleteErrors = 0;
        let addedCount = 0;
        let modifiedCount = 0;
        let removedCount = 0;

        try {
          const srcFilesAll = await collectFilesRecursive(sourceDir, SYNC_IGNORE_DIRS);
          const srcFiles = {};
          for (const rel of Object.keys(srcFilesAll)) srcFiles[rel] = srcFilesAll[rel];
          const dstFiles = await getRemoteInventory({ ip, agentPort, destDir });
          const { added, modified, removed } = computeDiffs(srcFiles, dstFiles);

          const ignorePatterns = resolveProjectSyncIgnore(project, ip);
          const isIgnored = (rel) =>
            shouldIgnore(String(rel || "").replace(/\\/g, "/"), ignorePatterns);

          const effectiveAdded = added.filter((rel) => !isIgnored(rel));
          const effectiveModified = modified.filter((rel) => !isIgnored(rel));
          const effectiveRemoved = removed.filter((rel) => !isIgnored(rel));

          const toCopy = [...effectiveAdded, ...effectiveModified];
          const toDelete = [...effectiveRemoved];
          addedCount = effectiveAdded.length;
          modifiedCount = effectiveModified.length;
          removedCount = effectiveRemoved.length;

          for (const rel of toCopy) {
            try {
              const srcPath = path.join(sourceDir, rel);
              const buf = await fsp.readFile(srcPath);
              const parsed = await sendFileToHost(destDir, rel, buf, srcFiles[rel]?.mtimeMs);
              if (parsed && parsed.ok) copied += 1;
              else copyErrors += 1;
            } catch {
              copyErrors += 1;
            }
          }

          for (const rel of toDelete) {
            try {
              const parsed = await deleteFileOnHost(destDir, rel);
              if (parsed && parsed.ok) deleted += 1;
              else deleteErrors += 1;
            } catch {
              deleteErrors += 1;
            }
          }

          totalCopied += copied;
          totalDeleted += deleted;
          totalCopyErrors += copyErrors;
          totalDeleteErrors += deleteErrors;
          totalAddedCount += addedCount;
          totalModifiedCount += modifiedCount;
          totalRemovedCount += removedCount;

          projectRows.push({
            projectId,
            projectName,
            status: copyErrors === 0 && deleteErrors === 0 ? "ok" : "partial",
            copied,
            deleted,
            copyErrors,
            deleteErrors,
            addedCount,
            modifiedCount,
            removedCount,
          });
        } catch (e) {
          projectRows.push({
            projectId,
            projectName,
            status: "error",
            message: String(e?.message || "Erreur de synchronisation"),
            copied,
            deleted,
            copyErrors: copyErrors + 1,
            deleteErrors,
            addedCount,
            modifiedCount,
            removedCount,
          });
          totalCopyErrors += copyErrors + 1;
          totalDeleteErrors += deleteErrors;
          totalCopied += copied;
          totalDeleted += deleted;
          totalAddedCount += addedCount;
          totalModifiedCount += modifiedCount;
          totalRemovedCount += removedCount;
        }
      }

      const status = projectRows.some((r) => r.status === "error")
        ? "error"
        : projectRows.some((r) => r.status === "partial")
        ? "partial"
        : "ok";

      return sendJSON(res, 200, {
        ok: totalCopyErrors === 0 && totalDeleteErrors === 0,
        scope: "render_auto",
        direction: direction || "auto",
        status,
        copied: totalCopied,
        deleted: totalDeleted,
        total: totalAddedCount + totalModifiedCount + totalRemovedCount,
        copyErrors: totalCopyErrors,
        deleteErrors: totalDeleteErrors,
        addedCount: totalAddedCount,
        modifiedCount: totalModifiedCount,
        deletedCount: totalRemovedCount,
        projectCount: projectRows.length,
        projects: projectRows,
      });
    }

    // 1) Résoudre le .uproject source (même logique que /agent/sync/check)
    const sourceUproject = resolveSourceUproject(list);

    if (!sourceUproject) {
      return sendJSON(res, 200, {
        ok: false,
        error: "no_source",
        message: "Aucun .uproject source trouvé sur le serveur.",
      });
    }

    const sourceDir = path.dirname(sourceUproject);
    const syncRoot = (targetHost.syncRoot || "").trim();
    if (!syncRoot) {
      return sendJSON(res, 200, {
        ok: true,
        status: "no_root",
        message: "Aucun dossier de synchro défini.",
      });
    }

    const projectName = path.basename(sourceDir);
    const destDir = path.join(syncRoot, projectName);

    try {
      // 2) Inventaire local + distant
      const srcFilesAll = await collectFilesRecursive(sourceDir, SYNC_IGNORE_DIRS);

      const srcFiles = {};
      for (const rel of Object.keys(srcFilesAll)) {
        srcFiles[rel] = srcFilesAll[rel];
      }

      const urlInv = `http://${ip}:${agentPort}/agent/sync/inventory?destDir=${encodeURIComponent(
        destDir
      )}`;
      const inv = await getJSON(urlInv, 8000);
      if (!inv?.ok || typeof inv.files !== "object") {
        // Log response content for debugging (sanitised)
        if (typeof logLine === "function") {
          const safeInv = {
            ok: inv?.ok || false,
            error: inv?.error || null,
            text: typeof inv?.text === 'string' ? inv.text.slice(0, 2000) : undefined,
            filesKeysCount: inv && typeof inv.files === 'object' ? Object.keys(inv.files).length : undefined,
          };
          try {
            logLine({
              level: "error",
              src: "server",
              action: "sync_copy_error",
              host: ip,
              message: "Réponse d'inventaire distante invalide (copy)",
              data: safeInv,
            });
          } catch {}
        }
        throw new Error("Réponse d'inventaire distante invalide");
      }

      const dstFilesAll = inv.files || {};
      const dstFiles = { ...dstFilesAll };

  let toCopy = [];
  let toDelete = [];

  // Initialisation des compteurs pour éviter les ReferenceError
  let addedCount = 0;
  let modifiedCount = 0;
  let deletedCount = 0;
  let ignoredCount = 0;
  let successCount = 0;
  let errorCount = 0;

      const hasSelection =
        selection &&
        (Array.isArray(selection.added) ||
          Array.isArray(selection.modified) ||
          Array.isArray(selection.removed));

      if (hasSelection) {
        const srcKeys = new Set(Object.keys(srcFiles));
        const dstKeys = new Set(Object.keys(dstFiles));

        const selAdded = Array.isArray(selection.added)
          ? selection.added
          : [];
        const selModified = Array.isArray(selection.modified)
          ? selection.modified
          : [];
        const selRemoved = Array.isArray(selection.removed)
          ? selection.removed
          : [];

        // Construction des listes à copier/supprimer selon la sélection
        toCopy = [
          ...selAdded.filter((rel) => srcKeys.has(rel)),
          ...selModified.filter((rel) => srcKeys.has(rel)),
        ];

        toDelete = selRemoved.filter((rel) => dstKeys.has(rel));

        // Compte rendu : nouveaux / modifiés / supprimés / ignorés
        addedCount = 0;
        modifiedCount = 0;
        deletedCount = toDelete.length || 0; // si on supprime explicitement
        ignoredCount = 0; // calcul possible plus tard si nécessaire

        for (const rel of toCopy) {
          const a = srcFiles[rel];
          const b = dstFiles[rel];
          if (a && !b) {
            addedCount++;
          } else if (a && b) {
            modifiedCount++;
          }
        }
      } else {
        // Compat : si aucune sélection n'est envoyée,
        // on reproduit l'ancien comportement :
        // copier tous les fichiers nouveaux ou modifiés, SUPPRIMER les fichiers en trop.
        const { added, modified, removed } = computeDiffs(srcFiles, dstFiles);
        toCopy = [...added, ...modified];
        toDelete = removed;
        addedCount = added.length;
        modifiedCount = modified.length;
        deletedCount = removed.length;
      }

        if (toCopy.length === 0 && toDelete.length === 0) {
              const summaryText =
                `${addedCount} nouveaux, ` +
                `${modifiedCount} modifiés, ` +
                `${deletedCount} supprimés, ` +
                `${ignoredCount} non pris en compte`;

              if (typeof logLine === "function") {
                logLine({
                  level: errorCount === 0 ? "success" : "warn",
                  src: "server",
                  action: "sync_summary",
                  host: ip,
                  message: `Sync ${ip}: ${summaryText}`,
                  data: {
                    added: addedCount,
                    modified: modifiedCount,
                    deleted: deletedCount,
                    ignored: ignoredCount,
                    copied: successCount,
                    errors: errorCount,
                    toCopy,
                  },
                });
              }

              return sendJSON(res, 200, {
                ok: errorCount === 0,
                copied: successCount,
                total: toCopy.length,
                errors: errorCount,
                addedCount,
                modifiedCount,
                deletedCount,
                ignoredCount,
                summaryText,
              });
        }

  // 3) Envoi des fichiers

      for (const rel of toCopy) {
        const srcPath = path.join(sourceDir, rel);
        try {
          const buf = await fsp.readFile(srcPath);
          const urlFileBase = `http://${ip}:${agentPort}/agent/sync/file?destDir=${encodeURIComponent(
            destDir
          )}&rel=${encodeURIComponent(rel)}`;
          const urlFile = addMtimeParam(urlFileBase, srcFiles[rel]?.mtimeMs);

          const resp = await fetch(urlFile, {
            method: "POST",
            body: buf,
          });
          const txt = await resp.text();
          let parsed;
          try {
            parsed = JSON.parse(txt || "{}");
          } catch {
            parsed = {};
          }
          if (parsed && parsed.ok) {
            successCount++;
          } else {
            errorCount++;
            logLine({
              level: "error",
              src: "agent",
              action: "sync_copy_file_error",
              host: ip,
              message: `Erreur lors de la copie de ${rel}`,
              data: { rel, response: parsed || null },
            });
          }
        } catch (e) {
          errorCount++;
          logLine({
            level: "error",
            src: "agent",
            action: "sync_copy_file_error",
            host: ip,
            message: `Exception lors de la copie de ${rel}`,
            data: { rel, error: String(e?.message || e) },
          });
        }
      }

      // 4) Suppression des fichiers cochés comme "supprimés"
      let deleteSuccess = 0;
      let deleteErrors = 0;

      for (const rel of toDelete) {
        try {
          const urlDel = `http://${ip}:${agentPort}/agent/sync/file?destDir=${encodeURIComponent(
            destDir
          )}&rel=${encodeURIComponent(rel)}&op=delete`;
          const resp = await fetch(urlDel, { method: "POST" });
          const txt = await resp.text();
          let parsed;
          try {
            parsed = JSON.parse(txt || "{}");
          } catch {
            parsed = {};
          }
          if (parsed && parsed.ok) {
            deleteSuccess++;
          } else {
            deleteErrors++;
            logLine({
              level: "error",
              src: "agent",
              action: "sync_delete_file_error",
              host: ip,
              message: `Erreur lors de la suppression de ${rel}`,
              data: { rel, response: parsed || null },
            });
          }
        } catch (e) {
          deleteErrors++;
          logLine({
            level: "error",
            src: "agent",
            action: "sync_delete_file_error",
            host: ip,
            message: `Exception lors de la suppression de ${rel}`,
            data: { rel, error: String(e?.message || e) },
          });
        }
      }

      const summaryText = `${addedCount} added, ${modifiedCount} modified, ${deletedCount} deleted (copied ${successCount}/${toCopy.length}, deleted ${deleteSuccess}/${toDelete.length})`;

      return sendJSON(res, 200, {
        ok: errorCount === 0 && deleteErrors === 0,
        copied: successCount,
        deleted: deleteSuccess,
        total: toCopy.length + toDelete.length,
        copyErrors: errorCount,
        deleteErrors,
        addedCount,
        modifiedCount,
        deletedCount,
        summaryText,
      });
    } catch (e) {
      logLine({
        level: "error",
        src: "agent",
        action: "sync_copy_error",
        host: ip,
        message: e.message,
      });
      return sendJSON(res, 200, {
        ok: false,
        error: "copy_error",
        message: e.message,
      });
    }
  }

    // ======================= SERVEUR: MAJ SYNCIGNORE =======================
  if (req.method === "POST" && url.pathname === "/agent/sync/update-ignore") {
    try {
      const bodyChunks = [];
      for await (const c of req) bodyChunks.push(c);
      const txt = Buffer.concat(bodyChunks).toString("utf8") || "{}";
      const data = JSON.parse(txt);

      const ip = String(data.ip || "").trim();
      const norm = (rel = "") => String(rel || "").replace(/\\/g, "/").trim();
      const added = Array.isArray(data.add)
        ? data.add.map(norm).filter(Boolean)
        : [];
      const removed = Array.isArray(data.remove)
        ? data.remove.map(norm).filter(Boolean)
        : [];

      if (!ip) {
        return sendJSON(res, 400, {
          ok: false,
          error: "missing_ip",
          message: "Adresse IP requise",
        });
      }

      const pj = loadProjects() || {};
      const list = Array.isArray(pj.projects) ? pj.projects : [];
      const activeId = pj.activeId || "";
      const project =
        list.find((p) => p && p.id === activeId);

      if (!project) {
        return sendJSON(res, 404, {
          ok: false,
          error: "project_not_found",
          message: "Projet actif introuvable",
        });
      }

      logLine?.({
        level: "info",
        src: "server",
        action: "sync_update_ignore_start",
        host: ip,
        message: `Update ignore for ${ip}`,
        data: { added, removed, projectId: project.id || "", projectName: project.name || "" },
      });

      if (!project.syncIgnore) project.syncIgnore = {};
      const current = project.syncIgnore[ip] || [];

      // Fusion : ajout des nouveaux ignorés
      const next = new Set(current);
      for (const rel of added) {
        if (typeof rel === "string" && rel.trim()) next.add(rel.trim());
      }

      // Suppression des chemins retirés
      for (const rel of removed) {
        next.delete(rel);
      }

      project.syncIgnore[ip] = Array.from(next).sort();

      // Réécriture du document projets via le store partagé
      const full = { ...pj };
      try {
        saveProjects(full, { onlyIfChanged: false });
      } catch (err) {
        logLine?.({
          level: "error",
          src: "server",
          action: "sync_update_ignore_write_error",
          host: ip,
          message: err?.message || String(err),
        });
        return sendJSON(res, 200, {
          ok: false,
          error: "write_error",
          message: err?.message || "writeJSON failed",
        });
      }

      logLine({
        level: "info",
        src: "server",
        action: "sync_update_ignore",
        host: ip,
        message: `MAJ syncIgnore pour ${ip}`,
        data: { added, removed },
      });

      return sendJSON(res, 200, { ok: true, added, removed });
    } catch (e) {
      logLine({
        level: "error",
        src: "server",
        action: "sync_update_ignore_error",
        message: e.message,
        data: { stack: e.stack },
      });
      return sendJSON(res, 200, {
        ok: false,
        error: "update_error",
        message: e.message,
      });
    }
  }

  // Si aucune route ne correspond
  return false;
}

module.exports = { handleSync, computeDiffs };
