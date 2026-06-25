// main/server-sync.cjs
// Gestion complète de la synchronisation des projets Unreal

const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { randomUUID } = require("crypto");
const { pipeline } = require("stream/promises");
const {
  readJSON,
  collectFilesRecursive,
  getJSON,
  ensureDir,
} = require("./server-files.cjs");

const { hostsToList } = require("./server-normalize.cjs");
const { saveProjects, readProjectMeta, setProjectSource } = require("./server-projects.cjs");
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
  ".git",
  ".svn",
  ".ultiunreal-tmp",
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

function computeConflictPaths(srcFiles, dstFiles, modified, removed) {
  const sourceFiles = srcFiles || {};
  const targetFiles = dstFiles || {};
  const newerModified = (Array.isArray(modified) ? modified : []).filter((rel) => {
    const sourceMtime = fileMtimeMs(sourceFiles[rel]);
    const targetMtime = fileMtimeMs(targetFiles[rel]);
    return sourceMtime !== null
      && targetMtime !== null
      && targetMtime > sourceMtime + SYNC_MTIME_TOLERANCE_MS;
  });
  return [...newerModified, ...(Array.isArray(removed) ? removed : [])];
}

async function assertReadableSourceProject(uprojectPath) {
  const sourceUproject = String(uprojectPath || "").trim();
  if (!sourceUproject) throw new Error("Aucun fichier .uproject source défini.");
  let projectStat;
  try {
    projectStat = await fsp.stat(sourceUproject);
  } catch {
    throw new Error(`Projet source introuvable : ${sourceUproject}`);
  }
  if (!projectStat.isFile() || !sourceUproject.toLowerCase().endsWith(".uproject")) {
    throw new Error(`Source Unreal invalide : ${sourceUproject}`);
  }
  const sourceDir = path.dirname(sourceUproject);
  try {
    const dirStat = await fsp.stat(sourceDir);
    if (!dirStat.isDirectory()) throw new Error("not_directory");
    await fsp.access(sourceDir, fs.constants.R_OK);
  } catch {
    throw new Error(`Dossier source inaccessible : ${sourceDir}`);
  }
  return sourceDir;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const list = Array.isArray(items) ? items : [];
  const limit = Math.max(1, Math.min(Number(concurrency) || 1, list.length || 1));
  const results = new Array(list.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < list.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(list[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
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
          .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^/]*") +
        "$"
    );

    if (regex.test(unixPath)) return true;
  }

  return false;
}

function isPathInsideRoot(candidatePath, rootPath) {
  const candidateRaw = String(candidatePath || "").trim();
  const rootRaw = String(rootPath || "").trim();
  if (!candidateRaw || !rootRaw) return false;
  const candidate = path.resolve(candidateRaw);
  const root = path.resolve(rootRaw);
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

// Ces constantes seront injectées par server.cjs au moment de l’appel
let logLine, sendJSON, COMMON_FILE, HOSTS_FILE, loadProjects, stationIp;
const lastSyncCheckSignatureByHost = new Map();
const lastSyncCheckStateByHost = new Map(); // "ok" | "error"
let renderSyncSummaryCache = { at: 0, value: null };
let renderSyncSummaryPromise = null;

function isConfiguredSyncDestination(destDir) {
  const destination = String(destDir || "").trim();
  if (!destination || !HOSTS_FILE) return false;
  const hosts = hostsToList(readJSON(HOSTS_FILE) || {});
  const localHost = hosts.find((host) => (
    String(host?.ip || host?.address || "").trim() === String(stationIp || "").trim()
  ));
  const localRoot = String(localHost?.syncRoot || "").trim();
  if (!localRoot) return true;
  return isPathInsideRoot(destination, localRoot);
}

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

function isRenderProjectSyncSelected(usageMode, syncIncluded) {
  return isRenderAutoUsageMode(usageMode) && syncIncluded === true;
}

function resolveRenderEligibleProjects(projectsDoc) {
  const projects = Array.isArray(projectsDoc?.projects) ? projectsDoc.projects : [];
  return projects.filter((project) => {
    if (!project || typeof project !== "object") return false;
    let meta = {};
    try {
      meta = readProjectMeta(String(project.id || "").trim()) || {};
    } catch {}
    const usageMode = String(
      project.metaUsageMode || project.usageMode || meta.usageMode || meta.modeDefault || ""
    ).trim();
    let syncIncluded = project.syncIncluded === true;
    if (Object.prototype.hasOwnProperty.call(meta, "syncIncluded")) {
      syncIncluded = meta.syncIncluded === true;
    }
    return isRenderProjectSyncSelected(usageMode, syncIncluded);
  });
}

function resolveProjectSourceOptions(project, hostList, projectsDoc) {
  const list = Array.isArray(hostList) ? hostList : [];
  const activeByHost = projectsDoc?.activeByHost && typeof projectsDoc.activeByHost === "object"
    ? projectsDoc.activeByHost
    : {};
  const projectId = String(project?.id || "").trim();
  const options = [];
  const seen = new Set();

  for (const host of list) {
    const ip = String(host?.ip || host?.address || "").trim();
    if (!ip || seen.has(ip)) continue;
    const rawPath = activeByHost?.[ip]?.[projectId];
    if (!rawPath) continue;
    seen.add(ip);
    options.push({
      ip,
      name: String(host?.name || ip).trim() || ip,
      uproject: String(rawPath || "").trim(),
    });
  }
  const configuredSourceIp = String(project?.sourceHostIp || "").trim();
  if (configuredSourceIp && !seen.has(configuredSourceIp)) {
    const host = list.find((item) => String(item?.ip || item?.address || "").trim() === configuredSourceIp);
    seen.add(configuredSourceIp);
    options.push({
      ip: configuredSourceIp,
      name: String(host?.name || configuredSourceIp).trim() || configuredSourceIp,
      uproject: String(project?.uproject || project?.projectPath || project?.path || "").trim(),
    });
  }
  const localProjectPath = resolveUprojectPath(project?.uproject || project?.projectPath || project?.path || "");
  if (stationIp && localProjectPath && fs.existsSync(localProjectPath) && !seen.has(stationIp)) {
    const localHost = list.find((item) => String(item?.ip || item?.address || "").trim() === stationIp);
    options.push({
      ip: stationIp,
      name: String(localHost?.name || stationIp).trim() || stationIp,
      uproject: localProjectPath,
    });
  }
  return options;
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

  if (!sourceUproject && sourceIp) {
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

function findDestinationFolderCollisions(projects, hostList, projectsDoc) {
  const byFolder = new Map();
  for (const project of Array.isArray(projects) ? projects : []) {
    const projectId = String(project?.id || "").trim();
    if (!projectId) continue;
    const source = resolveSourceUprojectForProject(project, hostList, projectsDoc);
    if (!source.sourceUproject) continue;
    const folder = path.basename(path.dirname(source.sourceUproject)).trim().toLowerCase();
    if (!folder) continue;
    const ids = byFolder.get(folder) || [];
    ids.push(projectId);
    byFolder.set(folder, ids);
  }
  const collisions = new Set();
  for (const ids of byFolder.values()) {
    if (ids.length < 2) continue;
    ids.forEach((id) => collisions.add(id));
  }
  return collisions;
}

async function getRemoteInventory({ ip, agentPort, destDir }) {
  const urlInv = `http://${ip}:${agentPort}/agent/sync/inventory?destDir=${encodeURIComponent(
    destDir
  )}`;
  const inv = await getJSON(urlInv, 120000);
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

async function parseFetchJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text || "{}");
  } catch {
    return {};
  }
}

async function sendFileToHost({ ip, agentPort, destDir, rel, srcPath, mtimeMs }) {
  const urlFileBase = `http://${ip}:${agentPort}/agent/sync/file?destDir=${encodeURIComponent(
    destDir
  )}&rel=${encodeURIComponent(rel)}`;
  const urlFile = addMtimeParam(urlFileBase, mtimeMs);
  const body = fs.createReadStream(srcPath);
  try {
    const response = await fetch(urlFile, {
      method: "POST",
      body,
      duplex: "half",
    });
    return await parseFetchJson(response);
  } finally {
    body.destroy();
  }
}

async function deleteFileOnHost({ ip, agentPort, destDir, rel }) {
  const url = `http://${ip}:${agentPort}/agent/sync/file?destDir=${encodeURIComponent(
    destDir
  )}&rel=${encodeURIComponent(rel)}&op=delete`;
  const response = await fetch(url, { method: "POST" });
  return await parseFetchJson(response);
}

function buildScopeResponseStatus(projectRows) {
  const rows = Array.isArray(projectRows) ? projectRows : [];
  if (rows.length === 0) return "no_projects";
  if (rows.some((r) => r && r.status === "error")) return "error";
  if (rows.some((r) => r && r.status === "no_root")) return "no_root";
  if (rows.some((r) => r && r.status === "no_source")) return "no_source";
  if (rows.some((r) => r && r.status === "conflict")) return "conflict";
  if (rows.some((r) => r && r.status === "desync")) return "desync";
  return "in_sync";
}

async function checkRenderScopeForHost({
  ip,
  hostList,
  projectsDoc,
  agentPort,
  projectId = "",
  forceLocalSource = false,
  targetSyncRoot = "",
  sourceIpOverride = "",
}) {
  const list = Array.isArray(hostList) ? hostList : [];
  const targetHostRaw = list.find((h) => (h.ip || h.address || "").trim() === ip);
  const targetHost = targetHostRaw
    ? { ...targetHostRaw, ...(targetSyncRoot ? { syncRoot: targetSyncRoot } : {}) }
    : (targetSyncRoot ? { ip, name: ip, syncRoot: targetSyncRoot, syncEnabled: true } : null);
  if (!targetHost) {
    return {
      ok: false,
      error: "unknown_host",
      message: `Machine ${ip} introuvable.`,
    };
  }

  const requestedProjectId = String(projectId || "").trim();
  const renderProjects = requestedProjectId
    ? (Array.isArray(projectsDoc?.projects)
        ? projectsDoc.projects
            .filter((project) => String(project?.id || "").trim() === requestedProjectId)
            .map((project) => sourceIpOverride ? { ...project, sourceHostIp: sourceIpOverride } : project)
        : [])
    : resolveRenderEligibleProjects(projectsDoc);
  if (renderProjects.length === 0) {
    return {
      ok: true,
      scope: "render_auto",
      status: "no_projects",
      message: "Aucun projet inclus dans la synchronisation.",
      projectCount: 0,
      desyncCount: 0,
      diffCount: 0,
      rawDiffCount: 0,
      projects: [],
    };
  }

  const syncRoot = String(targetHost.syncRoot || "").trim();
  if (!syncRoot) {
    return {
      ok: true,
      scope: "render_auto",
      status: "no_root",
      message: "Aucun dossier de synchro défini pour cette station.",
      projectCount: renderProjects.length,
      desyncCount: renderProjects.length,
      diffCount: 0,
      rawDiffCount: 0,
      projects: renderProjects.map((project) => ({
        projectId: String(project?.id || "").trim(),
        projectName: String(project?.name || project?.id || "").trim(),
        status: "no_root",
        message: "Aucun dossier de synchro défini pour cette station.",
        availableSources: resolveProjectSourceOptions(project, list, projectsDoc),
      })),
    };
  }

  const rows = [];
  const destinationCollisions = findDestinationFolderCollisions(renderProjects, list, projectsDoc);
  let totalDiff = 0;
  let totalRawDiff = 0;
  let desyncCount = 0;

  for (const project of renderProjects) {
    const projectId = String(project?.id || "").trim();
    const projectName = String(project?.name || projectId || "").trim();
    const source = resolveSourceUprojectForProject(project, list, projectsDoc);
    const availableSources = resolveProjectSourceOptions(project, list, projectsDoc);
    if (destinationCollisions.has(projectId)) {
      rows.push({
        projectId,
        projectName,
        status: "error",
        message: "Plusieurs projets utilisent le même nom de dossier source. Renommez un dossier avant de synchroniser.",
        sourceHostIp: source.sourceIp,
        sourceHostName: source.sourceHostName,
        availableSources,
        diffCount: 0,
        rawDiffCount: 0,
      });
      continue;
    }
    if (source.sourceIp && source.sourceIp === ip) {
      rows.push({
        projectId,
        projectName,
        status: "source",
        message: "Station source sélectionnée.",
        sourceHostIp: source.sourceIp,
        sourceHostName: source.sourceHostName,
        availableSources,
        sourceDir: source.sourceUproject ? path.dirname(source.sourceUproject) : "",
        destDir: "",
        diffCount: 0,
        rawDiffCount: 0,
        added: [],
        modified: [],
        removed: [],
        effectiveAdded: [],
        effectiveModified: [],
        effectiveRemoved: [],
        conflictPaths: [],
      });
      continue;
    }
    if (
      !forceLocalSource
      && source.sourceIp
      && stationIp
      && source.sourceIp !== stationIp
    ) {
      try {
        const remoteUrl = `http://${source.sourceIp}:${agentPort}/agent/sync/project/check?projectId=${encodeURIComponent(projectId)}&targetIp=${encodeURIComponent(ip)}&targetRoot=${encodeURIComponent(syncRoot)}&sourceIp=${encodeURIComponent(source.sourceIp)}`;
        const remote = await getJSON(remoteUrl, 120000);
        if (!remote?.ok || !remote?.project) {
          throw new Error(remote?.message || remote?.error || "Comparaison distante impossible");
        }
        const remoteRow = {
          ...remote.project,
          sourceHostIp: source.sourceIp,
          sourceHostName: source.sourceHostName,
          availableSources,
        };
        rows.push(remoteRow);
        const remoteDiffCount = Number(remoteRow.diffCount || 0);
        const remoteRawDiffCount = Number(remoteRow.rawDiffCount || remoteDiffCount);
        totalDiff += remoteDiffCount;
        totalRawDiff += remoteRawDiffCount;
        if (remoteRow.status === "desync" || remoteRow.status === "conflict") desyncCount += 1;
        continue;
      } catch (error) {
        rows.push({
          projectId,
          projectName,
          status: "error",
          message: String(error?.message || error),
          sourceHostIp: source.sourceIp,
          sourceHostName: source.sourceHostName,
          availableSources,
          diffCount: 0,
          rawDiffCount: 0,
        });
        continue;
      }
    }
    if (!source.sourceUproject) {
      rows.push({
        projectId,
        projectName,
        status: "no_source",
        message: "Aucune source de vérité détectée.",
        sourceHostIp: source.sourceIp,
        sourceHostName: source.sourceHostName,
        availableSources,
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

    try {
      const sourceDir = await assertReadableSourceProject(source.sourceUproject);
      const projectFolderName = path.basename(sourceDir);
      const destDir = path.join(syncRoot, projectFolderName);
      const srcFiles = await collectFilesRecursive(sourceDir, SYNC_IGNORE_DIRS);

      const dstFiles = await getRemoteInventory({ ip, agentPort, destDir });
      const { added, modified, removed } = computeDiffs(srcFiles, dstFiles);

      const effectiveAdded = added;
      const effectiveModified = modified;
      const effectiveRemoved = removed;
      const conflictPaths = computeConflictPaths(
        srcFiles,
        dstFiles,
        effectiveModified,
        effectiveRemoved
      );
      const effectiveDiffCount =
        effectiveAdded.length + effectiveModified.length + effectiveRemoved.length;
      const rawDiffCount = added.length + modified.length + removed.length;
      const status = effectiveDiffCount === 0 ? "in_sync" : (conflictPaths.length > 0 ? "conflict" : "desync");
      if (status === "desync" || status === "conflict") desyncCount += 1;
      totalDiff += effectiveDiffCount;
      totalRawDiff += rawDiffCount;

      rows.push({
        projectId,
        projectName,
        status,
        sourceHostIp: source.sourceIp,
        sourceHostName: source.sourceHostName,
        availableSources,
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
        conflictPaths,
      });
    } catch (e) {
      const sourceDir = source.sourceUproject ? path.dirname(source.sourceUproject) : "";
      const destDir = sourceDir ? path.join(syncRoot, path.basename(sourceDir)) : "";
      rows.push({
        projectId,
        projectName,
        status: "error",
        message: String(e?.message || "Erreur de comparaison"),
        sourceHostIp: source.sourceIp,
        sourceHostName: source.sourceHostName,
        availableSources,
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

async function buildRenderSyncSummary() {
  const rawHosts = readJSON(HOSTS_FILE) || {};
  const hostList = hostsToList(rawHosts);
  const common = readJSON(COMMON_FILE) || {};
  const agentPort = common.agentPort || 4000;
  const projectsDoc = typeof loadProjects === "function" ? loadProjects() : {};
  const projects = resolveRenderEligibleProjects(projectsDoc);
  const targets = hostList.filter((host) => (
    host
    && host.syncEnabled === true
    && host.renderAvailability !== "excluded"
    && host.eligible !== false
  ));

  if (projects.length === 0 || targets.length === 0) {
    return {
      ok: true,
      needed: false,
      status: "in_sync",
      projectCount: projects.length,
      targetCount: targets.length,
      desyncCount: 0,
      conflictCount: 0,
      errorCount: 0,
    };
  }

  const checks = await mapWithConcurrency(targets, 2, async (host) => {
    const ip = String(host?.ip || host?.address || "").trim();
    try {
      return await checkRenderScopeForHost({ ip, hostList, projectsDoc, agentPort });
    } catch (error) {
      return { ok: false, status: "error", message: String(error?.message || error), projects: [] };
    }
  });
  const projectRows = checks.flatMap((check) => Array.isArray(check?.projects) ? check.projects : []);
  const conflictCount = projectRows.filter((row) => row?.status === "conflict").length;
  const desyncCount = projectRows.filter((row) => row?.status === "desync").length;
  const rowErrorCount = projectRows.filter((row) => ["error", "no_source", "no_root"].includes(row?.status)).length;
  const checkErrorCount = checks.filter((check) => (
    (!check || check.ok === false || check.status === "error")
    && (!Array.isArray(check?.projects) || check.projects.length === 0)
  )).length;
  const errorCount = rowErrorCount + checkErrorCount;
  const needed = conflictCount > 0 || desyncCount > 0 || errorCount > 0;
  return {
    ok: true,
    needed,
    status: conflictCount > 0 ? "conflict" : (errorCount > 0 ? "error" : (desyncCount > 0 ? "desync" : "in_sync")),
    projectCount: projects.length,
    targetCount: targets.length,
    desyncCount,
    conflictCount,
    errorCount,
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
  ({ logLine, sendJSON, COMMON_FILE, HOSTS_FILE, loadProjects, stationIp } = context);
  const parseBody = context.parseBody;

  if (req.method === "GET" && url.pathname === "/agent/sync/project/check") {
    const projectId = String(url.searchParams.get("projectId") || "").trim();
    const targetIp = String(url.searchParams.get("targetIp") || "").trim();
    const targetRoot = String(url.searchParams.get("targetRoot") || "").trim();
    const sourceIp = String(url.searchParams.get("sourceIp") || "").trim();
    if (!projectId || !targetIp || !targetRoot) {
      return sendJSON(res, 400, { ok: false, error: "missing_project_target_or_root" });
    }
    const rawHosts = readJSON(HOSTS_FILE) || {};
    const list = hostsToList(rawHosts);
    const common = readJSON(COMMON_FILE) || {};
    const agentPort = common.agentPort || 4000;
    const projectsDoc = typeof loadProjects === "function" ? loadProjects() : {};
    const scoped = await checkRenderScopeForHost({
      ip: targetIp,
      hostList: list,
      projectsDoc,
      agentPort,
      projectId,
      forceLocalSource: true,
      targetSyncRoot: targetRoot,
      sourceIpOverride: sourceIp,
    });
    return sendJSON(res, 200, {
      ok: scoped?.ok !== false,
      project: Array.isArray(scoped?.projects) ? scoped.projects[0] || null : null,
      message: scoped?.message || "",
    });
  }

  if (req.method === "POST" && url.pathname === "/agent/sync/source") {
    try {
      const body = await parseBody(req);
      const projectId = String(body?.projectId || "").trim();
      const sourceIp = String(body?.sourceIp || "").trim();
      if (!projectId || !sourceIp) {
        return sendJSON(res, 400, { ok: false, error: "missing_project_or_source" });
      }
      const projectsDoc = typeof loadProjects === "function" ? loadProjects() : {};
      const project = (projectsDoc?.projects || []).find((item) => String(item?.id || "").trim() === projectId);
      if (!project) {
        return sendJSON(res, 404, { ok: false, error: "unknown_project" });
      }
      const hosts = hostsToList(readJSON(HOSTS_FILE) || {});
      const allowedSources = resolveProjectSourceOptions(project, hosts, projectsDoc);
      if (!allowedSources.some((item) => item.ip === sourceIp)) {
        return sendJSON(res, 400, { ok: false, error: "source_project_unavailable" });
      }
      if (!setProjectSource(projectId, sourceIp)) {
        return sendJSON(res, 500, { ok: false, error: "source_update_failed" });
      }
      renderSyncSummaryCache = { at: 0, value: null };
      return sendJSON(res, 200, { ok: true, projectId, sourceIp });
    } catch (error) {
      const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 400;
      return sendJSON(res, status, {
        ok: false,
        error: String(error?.code || "invalid_source_request"),
        message: String(error?.message || error),
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/agent/sync/summary") {
    const forceRefresh = String(url.searchParams.get("refresh") || "").trim() === "1";
    const now = Date.now();
    if (!forceRefresh && renderSyncSummaryCache.value && now - renderSyncSummaryCache.at < 30000) {
      return sendJSON(res, 200, renderSyncSummaryCache.value);
    }
    if (!renderSyncSummaryPromise) {
      renderSyncSummaryPromise = buildRenderSyncSummary()
        .then((value) => {
          renderSyncSummaryCache = { at: Date.now(), value };
          return value;
        })
        .finally(() => {
          renderSyncSummaryPromise = null;
        });
    }
    const summary = await renderSyncSummaryPromise;
    return sendJSON(res, 200, summary);
  }

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
    if (!isConfiguredSyncDestination(destDir)) {
      return sendJSON(res, 403, {
        ok: false,
        error: "destination_not_configured",
        message: "Le dossier demandé n'appartient à aucun dossier de synchronisation configuré.",
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
        await assertReadableSourceProject(sourceUproject);
        // Inventaire source (serveur)
        const srcFiles = await collectFilesRecursive(sourceDir, SYNC_IGNORE_DIRS);

        const urlInv = `http://${ip}:${agentPort}/agent/sync/inventory?destDir=${encodeURIComponent(
          destDir
        )}`;
        const inv = await getJSON(urlInv, 120000);
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
    if (!isConfiguredSyncDestination(destDir)) {
      return sendJSON(res, 403, {
        ok: false,
        error: "destination_not_configured",
        message: "Le dossier demandé n'appartient à aucun dossier de synchronisation configuré.",
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
    const tempDir = path.join(absDest, ".ultiunreal-tmp");
    const tempPath = path.join(tempDir, `${process.pid}-${randomUUID()}.tmp`);
    try {
      ensureDir(tempPath);
      await pipeline(req, fs.createWriteStream(tempPath, { flags: "wx" }));
      await fsp.copyFile(tempPath, fullPath);
      if (hasRequestedMtime) {
        const mtime = new Date(requestedMtimeMs);
        await fsp.utimes(fullPath, mtime, mtime);
      }
      const written = await fsp.stat(fullPath);
      return sendJSON(res, 200, {
        ok: true,
        rel,
        size: written.size,
        ...(hasRequestedMtime ? { mtimeMs: requestedMtimeMs } : {}),
      });
    } catch (e) {
      return sendJSON(res, 200, { ok: false, error: "write_error", message: e.message });
    } finally {
      try { await fsp.unlink(tempPath); } catch {}
      try { await fsp.rmdir(tempDir); } catch {}
    }
  }

    // ======================= SERVEUR: COPIE SYNCHRO =======================
  if (req.method === "POST" && url.pathname === "/agent/sync/copy") {
    const ip = (url.searchParams.get("ip") || "").trim();
    const scope = String(url.searchParams.get("scope") || "").trim().toLowerCase();
    const direction = String(url.searchParams.get("direction") || "auto").trim().toLowerCase();
    const requestedProjectId = String(url.searchParams.get("projectId") || "").trim();
    const forceLocalSource = String(url.searchParams.get("forceLocal") || "").trim() === "1";
    const targetRootOverride = String(url.searchParams.get("targetRoot") || "").trim();
    const sourceIpOverride = String(url.searchParams.get("sourceIp") || "").trim();
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
      selection = await parseBody(req);
    } catch (error) {
      const status = Number.isFinite(Number(error?.status)) ? Number(error.status) : 400;
      return sendJSON(res, status, {
        ok: false,
        error: String(error?.code || "invalid_selection"),
        message: String(error?.message || error),
      });
    }

    const common = readJSON(COMMON_FILE) || {};
    const agentPort = common.agentPort || 4000;
    const rawHosts = readJSON(HOSTS_FILE) || {};
    const list = hostsToList(rawHosts);
    const targetHostRaw = list.find((h) => (h.ip || h.address || "").trim() === ip);
    const targetHost = targetHostRaw
      ? { ...targetHostRaw, ...(targetRootOverride ? { syncRoot: targetRootOverride } : {}) }
      : (targetRootOverride ? { ip, name: ip, syncRoot: targetRootOverride, syncEnabled: true } : null);
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
      const renderProjects = requestedProjectId
        ? (Array.isArray(projectsDoc?.projects)
            ? projectsDoc.projects
                .filter((project) => String(project?.id || "").trim() === requestedProjectId)
                .map((project) => sourceIpOverride ? { ...project, sourceHostIp: sourceIpOverride } : project)
            : [])
        : resolveRenderEligibleProjects(projectsDoc);
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
      const destinationCollisions = findDestinationFolderCollisions(renderProjects, list, projectsDoc);

      for (const project of renderProjects) {
        const projectId = String(project?.id || "").trim();
        const projectName = String(project?.name || projectId || "").trim();
        const source = resolveSourceUprojectForProject(project, list, projectsDoc);
        if (destinationCollisions.has(projectId)) {
          projectRows.push({
            projectId,
            projectName,
            status: "error",
            message: "Collision de dossier cible avec un autre projet synchronisé.",
            copied: 0,
            deleted: 0,
            copyErrors: 1,
            deleteErrors: 0,
            addedCount: 0,
            modifiedCount: 0,
            removedCount: 0,
          });
          totalCopyErrors += 1;
          continue;
        }
        if (source.sourceIp && source.sourceIp === ip) {
          projectRows.push({
            projectId,
            projectName,
            status: "source",
            message: "Station source sélectionnée.",
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
        if (
          !forceLocalSource
          && source.sourceIp
          && stationIp
          && source.sourceIp !== stationIp
        ) {
          try {
            const remoteUrl = `http://${source.sourceIp}:${agentPort}/agent/sync/copy?ip=${encodeURIComponent(ip)}&scope=render_auto&projectId=${encodeURIComponent(projectId)}&forceLocal=1&targetRoot=${encodeURIComponent(syncRoot)}&sourceIp=${encodeURIComponent(source.sourceIp)}`;
            const remoteResponse = await fetch(remoteUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(selection || {}),
            });
            const remoteText = await remoteResponse.text();
            const remote = JSON.parse(remoteText || "{}");
            const remoteRow = Array.isArray(remote?.projects) ? remote.projects[0] : null;
            if (!remoteRow || remote.status === "error") {
              throw new Error(remoteRow?.message || remote?.message || remote?.error || "Copie distante impossible");
            }
            projectRows.push(remoteRow);
            totalCopied += Number(remoteRow.copied || 0);
            totalDeleted += Number(remoteRow.deleted || 0);
            totalCopyErrors += Number(remoteRow.copyErrors || 0);
            totalDeleteErrors += Number(remoteRow.deleteErrors || 0);
            totalAddedCount += Number(remoteRow.addedCount || 0);
            totalModifiedCount += Number(remoteRow.modifiedCount || 0);
            totalRemovedCount += Number(remoteRow.removedCount || 0);
            continue;
          } catch (error) {
            projectRows.push({
              projectId,
              projectName,
              status: "error",
              message: String(error?.message || error),
              copied: 0,
              deleted: 0,
              copyErrors: 1,
              deleteErrors: 0,
              addedCount: 0,
              modifiedCount: 0,
              removedCount: 0,
            });
            totalCopyErrors += 1;
            continue;
          }
        }
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
          await assertReadableSourceProject(source.sourceUproject);
          const srcFiles = await collectFilesRecursive(sourceDir, SYNC_IGNORE_DIRS);
          const dstFiles = await getRemoteInventory({ ip, agentPort, destDir });
          const { added, modified, removed } = computeDiffs(srcFiles, dstFiles);

          const effectiveAdded = added;
          const effectiveModified = modified;
          const effectiveRemoved = removed;
          const conflictPaths = computeConflictPaths(
            srcFiles,
            dstFiles,
            effectiveModified,
            effectiveRemoved
          );
          const newerTargetPaths = conflictPaths.filter((rel) => effectiveModified.includes(rel));

          const toCopy = [...effectiveAdded, ...effectiveModified];
          const toDelete = [...effectiveRemoved];
          addedCount = effectiveAdded.length;
          modifiedCount = effectiveModified.length;
          removedCount = effectiveRemoved.length;

          if (
            (toDelete.length > 0 && selection?.allowDelete !== true)
            || (newerTargetPaths.length > 0 && selection?.allowOverwriteNewer !== true)
          ) {
            totalAddedCount += addedCount;
            totalModifiedCount += modifiedCount;
            totalRemovedCount += removedCount;
            projectRows.push({
              projectId,
              projectName,
              status: "confirmation_required",
              message: toDelete.length > 0
                ? "Confirmation requise avant suppression de fichiers sur la cible."
                : "Confirmation requise avant écrasement de fichiers plus récents sur la cible.",
              copied: 0,
              deleted: 0,
              copyErrors: 0,
              deleteErrors: 0,
              addedCount,
              modifiedCount,
              removedCount,
            });
            continue;
          }

          for (const rel of toCopy) {
            try {
              const srcPath = path.join(sourceDir, rel);
              const parsed = await sendFileToHost({
                ip,
                agentPort,
                destDir,
                rel,
                srcPath,
                mtimeMs: srcFiles[rel]?.mtimeMs,
              });
              if (parsed && parsed.ok) copied += 1;
              else copyErrors += 1;
            } catch {
              copyErrors += 1;
            }
          }

          for (const rel of toDelete) {
            try {
              const parsed = await deleteFileOnHost({ ip, agentPort, destDir, rel });
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

      const status = projectRows.some((r) => r.status === "error" || r.status === "no_source")
        ? "error"
        : projectRows.some((r) => r.status === "confirmation_required")
        ? "confirmation_required"
        : projectRows.some((r) => r.status === "partial")
        ? "partial"
        : "ok";

      renderSyncSummaryCache = { at: 0, value: null };
      return sendJSON(res, 200, {
        ok: status === "ok" && totalCopyErrors === 0 && totalDeleteErrors === 0,
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
        ...(status === "confirmation_required"
          ? { message: "La copie nécessite une confirmation après une nouvelle vérification." }
          : (status === "error"
              ? { message: "Au moins un projet n'a pas pu être synchronisé." }
              : {})),
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
      await assertReadableSourceProject(sourceUproject);
      // 2) Inventaire local + distant
      const srcFiles = await collectFilesRecursive(sourceDir, SYNC_IGNORE_DIRS);

      const urlInv = `http://${ip}:${agentPort}/agent/sync/inventory?destDir=${encodeURIComponent(
        destDir
      )}`;
      const inv = await getJSON(urlInv, 120000);
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
        const { added, modified, removed } = computeDiffs(srcFiles, dstFiles);
        toCopy = [...added, ...modified];
        toDelete = [];
        addedCount = added.length;
        modifiedCount = modified.length;
        deletedCount = 0;
        ignoredCount += removed.length;
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
          const parsed = await sendFileToHost({
            ip,
            agentPort,
            destDir,
            rel,
            srcPath,
            mtimeMs: srcFiles[rel]?.mtimeMs,
          });
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
          const parsed = await deleteFileOnHost({ ip, agentPort, destDir, rel });
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
      const data = await parseBody(req);

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
      const status = Number.isFinite(Number(e?.status)) ? Number(e.status) : 400;
      return sendJSON(res, status, {
        ok: false,
        error: String(e?.code || "update_error"),
        message: e.message,
      });
    }
  }

  // Si aucune route ne correspond
  return false;
}

module.exports = {
  handleSync,
  computeDiffs,
  isRenderProjectSyncSelected,
  buildScopeResponseStatus,
  isPathInsideRoot,
  computeConflictPaths,
  findDestinationFolderCollisions,
  shouldIgnore,
  assertReadableSourceProject,
};
