// main/server-launch.cjs
// Gestion du Launch Control + hosts
// Routes couvertes :
//   GET  /agent/hosts
//   POST /agent/host/:ip
//   POST /agent/host/:ip/launch
//   POST /agent/host/:ip/stop
//   POST /agent/host/:ip/delete
//   POST /agent/launch        (agent local)
//   POST /agent/stop          (agent local)

const fs   = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

const {
  readJSON,
  writeJSON,
  writeJSONIfChanged,
} = require('./server-files.cjs');

const {
  loadProjects,
  saveProjects,
  readProjectDoc,
  writeProjectDoc,
} = require('./server-projects.cjs');

const { hostsToList } = require('./server-normalize.cjs');

function extractUnrealEditors(cfg = {}) {
  const map = {};

  if (cfg.unrealEditors && typeof cfg.unrealEditors === 'object') {
    for (const [ver, p] of Object.entries(cfg.unrealEditors)) {
      map[String(ver).trim()] = String(p || '').trim();
    }
  } else if (cfg.unreal_editors && typeof cfg.unreal_editors === 'object') {
    for (const [ver, p] of Object.entries(cfg.unreal_editors)) {
      map[String(ver).trim()] = String(p || '').trim();
    }
  }

  return map;
}

function resolveExeForVersion(cfg, engineVersion) {
  const ver = String(engineVersion || '').trim();
  if (!ver) return '';
  const map = extractUnrealEditors(cfg);
  return map[ver] || '';
}

const UNREAL_PROCESS_NAMES = [
  'UnrealEditor.exe',
  'UE4Editor.exe',
  'UE5Editor.exe',
  'UE4Game.exe',
  'UE5Game.exe',
];

function parsePidList(txt) {
  return String(txt || '')
    .split(/[\r\n]+/)
    .map((v) => Number(String(v || '').trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function execCmd(cmd) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr });
    });
  });
}

async function listPidsByUproject(uproject) {
  const needle = String(uproject || '').trim();
  if (!needle) return [];

  if (process.platform === 'win32') {
    const safeNeedle = needle.replace(/'/g, "''");
    const nameRegex = UNREAL_PROCESS_NAMES
      .map((n) => n.replace('.exe', ''))
      .join('|');
    const ps = [
      'Get-CimInstance Win32_Process',
      `| Where-Object { $_.CommandLine -and $_.CommandLine -like '*${safeNeedle}*' -and ($_.Name -match '${nameRegex}') }`,
      '| Select-Object -ExpandProperty ProcessId',
    ].join(' ');
    const cmd = `powershell -NoProfile -Command "${ps.replace(/"/g, '\\"')}"`;
    const { stdout } = await execCmd(cmd);
    return parsePidList(stdout);
  }

  // Fallback POSIX
  const { stdout } = await execCmd('ps -A -o pid=,command=');
  const lines = String(stdout || '').split(/\r?\n/);
  const lowered = needle.toLowerCase();
  const nameSet = new Set(UNREAL_PROCESS_NAMES.map((n) => n.toLowerCase().replace('.exe', '')));
  const pids = [];
  for (const line of lines) {
    const m = line.trim().match(/^(\d+)\s+(.*)$/);
    if (!m) continue;
    const pid = Number(m[1]);
    const cmdline = String(m[2] || '');
    const cmdLower = cmdline.toLowerCase();
    if (!cmdLower.includes(lowered)) continue;
    const hasName = [...nameSet].some((n) => cmdLower.includes(n));
    if (hasName) pids.push(pid);
  }
  return pids;
}

async function killPids(pids = []) {
  const unique = [...new Set(pids.filter((n) => Number.isInteger(n) && n > 0))];
  if (!unique.length) return [];

  if (process.platform === 'win32') {
    const cmd = `taskkill /PID ${unique.join(' /PID ')} /T /F`;
    await execCmd(cmd);
    return unique;
  }

  for (const pid of unique) {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
  return unique;
}

async function killAllUnreal() {
  if (process.platform === 'win32') {
    for (const name of UNREAL_PROCESS_NAMES) {
      await execCmd(`taskkill /IM ${name} /T /F`);
    }
    return true;
  }

  for (const name of UNREAL_PROCESS_NAMES) {
    const base = name.replace('.exe', '');
    await execCmd(`pkill -f ${base}`);
  }
  return true;
}

// ---------------------------------------------------------------------------
// handleLaunch : appelé depuis server.cjs
// ---------------------------------------------------------------------------

async function handleLaunch(req, res, url, context) {
  const safeContext = context && typeof context === 'object' ? context : {};

  const {
    logLine,
    sendJSON,
    COMMON_FILE = '',
    HOSTS_FILE = '',
    PRODUCTION_DIR = '',
    parseBody = async () => ({}),
    postJSON,
    ensureGameFlags,
    getCurrentPid,
    setCurrentProcess,
    clearCurrentProcess,
  } = safeContext;

  // Petit garde-fou : si sendJSON n’est pas fourni, on ne fait rien
  if (typeof sendJSON !== 'function') {
    return false;
  }

  const log = typeof logLine === 'function' ? logLine : () => {};
  const httpPostJSON = typeof postJSON === 'function'
    ? postJSON
    : async (u, body) => {
        // fallback minimal (ne devrait normalement jamais servir)
        const res = await fetch(u, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body || {}),
        });
        const txt = await res.text();
        try {
          return JSON.parse(txt || '{}');
        } catch {
          return { ok: false, text: txt };
        }
      };

  const getPid  = (typeof getCurrentPid === 'function') ? getCurrentPid : () => null;
  const setProc = (typeof setCurrentProcess === 'function')
    ? setCurrentProcess
    : (_pid, _child) => { /* no-op */ };
  const clearProc = (typeof clearCurrentProcess === 'function')
    ? clearCurrentProcess
    : () => {};

  const cleanHostsUnrealVersions = (hostsObj, allowedSet) => {
    if (!allowedSet || !(allowedSet instanceof Set)) return { changed: false, hosts: hostsObj };
    const cleanHost = (cfg = {}) => {
      let touch = false;

      if (cfg.unrealEditors && typeof cfg.unrealEditors === 'object') {
        for (const ver of Object.keys(cfg.unrealEditors)) {
          const v = String(ver || '').trim();
          if (!allowedSet.has(v)) {
            delete cfg.unrealEditors[ver];
            touch = true;
          }
        }
        if (cfg.unrealEditors && typeof cfg.unrealEditors === 'object' && Object.keys(cfg.unrealEditors).length === 0) {
          delete cfg.unrealEditors;
          touch = true;
        }
      }

      if (cfg.unreal_editors && typeof cfg.unreal_editors === 'object') {
        for (const ver of Object.keys(cfg.unreal_editors)) {
          const v = String(ver || '').trim();
          if (!allowedSet.has(v)) {
            delete cfg.unreal_editors[ver];
            touch = true;
          }
        }
        if (cfg.unreal_editors && typeof cfg.unreal_editors === 'object' && Object.keys(cfg.unreal_editors).length === 0) {
          delete cfg.unreal_editors;
          touch = true;
        }
      }

      for (const key of Object.keys(cfg)) {
        const m = /^unreal_editor_(.+)$/i.exec(String(key || '').trim());
        if (m && m[1]) {
          const v = String(m[1]).trim();
          if (!allowedSet.has(v)) {
            delete cfg[key];
            touch = true;
          }
        }
      }

      return touch;
    };

    let changed = false;
    if (Array.isArray(hostsObj)) {
      hostsObj.forEach((cfg) => {
        if (cfg && typeof cfg === 'object') {
          if (cleanHost(cfg)) changed = true;
        }
      });
      return { changed, hosts: hostsObj };
    }
    if (hostsObj && typeof hostsObj === 'object') {
      for (const ip of Object.keys(hostsObj)) {
        const cfg = hostsObj[ip];
        if (cfg && typeof cfg === 'object') {
          if (cleanHost(cfg)) changed = true;
        }
      }
      return { changed, hosts: hostsObj };
    }
    return { changed: false, hosts: hostsObj };
  };

  // -------------------------------------------------------------------------
  // 1) /agent/hosts (GET)
  // -------------------------------------------------------------------------
  if (req.method === 'GET' && url.pathname === '/agent/hosts') {
    const hosts = readJSON(HOSTS_FILE) || {};
    let allowedSet = null;
    try {
      const common = readJSON(COMMON_FILE) || {};
      if (Array.isArray(common.unrealVersions)) {
        allowedSet = new Set(
          common.unrealVersions
            .map((v) => String(v || '').trim())
            .filter(Boolean)
        );
      }
    } catch {}

    if (allowedSet) {
      const { changed, hosts: cleaned } = cleanHostsUnrealVersions(hosts, allowedSet);
      if (changed) {
        try { writeJSON(HOSTS_FILE, cleaned); } catch {}
        return sendJSON(res, 200, cleaned);
      }
    }

    return sendJSON(res, 200, hosts);
  }

  // -------------------------------------------------------------------------
  // 2) /agent/host/:ip[/:action]
  // -------------------------------------------------------------------------
  if (url.pathname.startsWith('/agent/host/')) {
    const parts  = url.pathname.split('/');
    const ip     = decodeURIComponent(parts[3] || '').trim();
    const action = parts[4] || '';

    // 2.1) Upsert host : POST /agent/host/:ip
    if (req.method === 'POST' && !action) {
      const body  = await parseBody(req);
      if (!ip) {
        return sendJSON(res, 400, { ok: false, error: 'missing ip' });
      }
      const hosts = readJSON(HOSTS_FILE) || {};
      const list  = hostsToList(hosts);

      // Host courant (pour conserver les valeurs existantes si on ne les écrase pas)
      const curr = list.find(h => h && h.ip === ip) || {};

      const normPath = (v) => String(v || '').trim();
      const mergedEditors = (() => {
        const base = extractUnrealEditors(curr);
        const incoming = extractUnrealEditors(body);
        return { ...base, ...incoming };
      })();

      const syncRoot =
        body.syncRoot ??
        body.sync_root ??
        curr.syncRoot ??
        curr.sync_root ??
        '';

      const syncEnabledRaw =
        body.syncEnabled ??
        body.sync_enabled ??
        curr.syncEnabled ??
        curr.sync_enabled ??
        false;

      const syncEnabled = !!syncEnabledRaw;

      const eligible =
        typeof body.eligible === 'boolean'
          ? body.eligible
          : (typeof curr.eligible === 'boolean' ? curr.eligible : true);

      const renderEnabled =
        typeof body.renderEnabled === 'boolean'
          ? body.renderEnabled
          : (typeof body.render_enabled === 'boolean'
            ? body.render_enabled
            : (typeof curr.renderEnabled === 'boolean'
              ? curr.renderEnabled
              : (typeof curr.render_enabled === 'boolean' ? curr.render_enabled : true)));

      const sortIndex = (() => {
        const incoming = Number(body.sortIndex);
        if (Number.isFinite(incoming)) return incoming;
        const current = Number(curr.sortIndex);
        if (Number.isFinite(current)) return current;
        return list.length; // append at the end by default
      })();

      const up = {
        name:  body.name  ?? curr.name  ?? ip,
        color: body.color ?? curr.color ?? '',
        uproject: normPath(body.uproject ?? body.project ?? curr.uproject ?? ''),
        args: body.args ?? curr.args ?? {},
        syncRoot: normPath(syncRoot),
        syncEnabled,
        unrealEditors: mergedEditors,
        eligible,
        renderEnabled,
        sortIndex,
      };

      // On réécrit hosts_server.json en objet propre { ip: { ...cfg } }
      const base = {};
      for (const h of list) {
        if (!h) continue;
        const hip = String(h.ip || '').trim();
        if (!hip || hip === ip) continue;
        const { ip: _removed, ...cfg } = h;
        base[hip] = cfg;
      }

      const next = { ...base, [ip]: up };

      try {
        const changed = writeJSONIfChanged(HOSTS_FILE, next);
        if (changed) {
          log({
            level: 'success',
            action: 'write_json',
            host: ip,
            message: `Mise à jour hosts_server.json ${ip}`,
            data: up,
          });
        }
      } catch (e) {
        log({
          level: 'error',
          action: 'write_json_error',
          host: ip,
          message: `Échec de mise à jour hosts_server.json pour ${ip}`,
          data: { error: String(e && e.message ? e.message : e) },
        });
        return sendJSON(res, 500, { ok: false, error: 'write_hosts_failed' });
      }

      return sendJSON(res, 200, { ok: true, host: { ip, ...up } });
    }

    // 2.2) Lancer Unreal sur une machine : POST /agent/host/:ip/launch
    if (req.method === 'POST' && action === 'launch') {
      const hosts    = readJSON(HOSTS_FILE) || {};
      const projects = loadProjects();
      const common   = readJSON(COMMON_FILE) || {};

      const list = hostsToList(hosts);
      const cfg  = list.find(h => h && h.ip === ip) || null;


      if (!cfg) {
        return sendJSON(res, 404, { ok: false, error: `Machine inconnue ${ip}` });
      }

      const agentPort = common?.agentPort || 4000;

      // Mode global Production / Intégration
      const launchMode = (String(common.launchMode || '').toLowerCase() === 'integration')
        ? 'integration'
        : 'production';

      const activeId   = projects.activeId  || '';
      const activeName = projects.activeName || '';

      let uproject = '';

      // 1) association par host (clé = id uniquement)
      const ab = (projects.activeByHost && typeof projects.activeByHost === 'object')
        ? (projects.activeByHost[ip] || {})
        : {};

      if (activeId && ab[activeId]) {
        uproject = ab[activeId];
      }

      // 2) champ direct éventuel sur la machine
      if (!uproject) {
        uproject = cfg.uproject || cfg.project || '';
      }

      // 3) depuis la liste projets (par id)
      if (!uproject && Array.isArray(projects.projects)) {
        let found = null;
        if (activeId) {
          found = projects.projects.find(p => p && p.id === activeId) || null;
        }
        if (found) {
          uproject = found.uproject || found.path || found.projectPath || '';
        }
      }

      const normPath = (v) => String(v || '').trim();
      const activeProject =
        (Array.isArray(projects.projects)
          ? projects.projects.find(
              (p) =>
                (activeId && p && p.id === activeId)
            )
          : null) || null;

      const requiredVersion = String(activeProject?.engineVersion || '').trim();
      const uePath = resolveExeForVersion(cfg, requiredVersion);

      if (!uePath || !uproject) {
        log({
          level: 'warn',
          action: 'launch_host',
          host: ip,
          message: 'UnrealEditor.exe (version requise) ou .uproject manquant pour la machine',
          data: { ip, uePath, uproject, requiredVersion },
        });
        return sendJSON(res, 400, {
          ok: false,
          error: 'missing_exe_or_uproject',
          message: 'Chemin UnrealEditor.exe (version requise) ou .uproject manquant pour cette machine.',
          requiredVersion,
        });
      }

      const payload = {
        exe: uePath,
        uproject: normPath(uproject),
        args: cfg.args || {},
        activeName,
        webRemoteControlName: common.webRemoteControlName || '',
        rcHttpPort: common.rcHttpPort || '',
        rcWsPort: common.rcWsPort || '',
        mode: launchMode,
      };

      const target = `http://${ip}:${agentPort}/agent/launch`;
      log({
        level: 'info',
        action: 'http_call',
        host: ip,
        message: `POST ${target}`,
        data: { payload },
      });

      let r;
      try {
        r = await httpPostJSON(target, payload);
      } catch (e) {
        log({
          level: 'error',
          action: 'http_call_error',
          host: ip,
          message: `POST ${target} en échec`,
          data: { error: String(e && e.message ? e.message : e) },
        });
        return sendJSON(res, 200, { ok: false, error: 'launch_request_failed', message: String(e && e.message ? e.message : e) });
      }

      log({
        level: (r && r.ok !== false) ? 'success' : 'error',
        action: 'http_call',
        host: ip,
        message: `POST ${target} -> ${(r && r.ok !== false) ? '200' : 'ERR'}`,
        data: r,
      });

      return sendJSON(res, 200, r);
    }

    // 2.3) Stopper Unreal sur une machine : POST /agent/host/:ip/stop
    if (req.method === 'POST' && action === 'stop') {
      const common    = readJSON(COMMON_FILE) || {};
      const agentPort = common?.agentPort || 4000;
      const target    = `http://${ip}:${agentPort}/agent/stop`;

      log({
        level: 'info',
        action: 'http_call',
        host: ip,
        message: `POST ${target}`,
        data: {},
      });

      let r;
      try {
        r = await httpPostJSON(target, {});
      } catch (e) {
        log({
          level: 'error',
          action: 'http_call_error',
          host: ip,
          message: `POST ${target} en échec`,
          data: { error: String(e && e.message ? e.message : e) },
        });
        return sendJSON(res, 200, { ok: false, error: 'stop_request_failed', message: String(e && e.message ? e.message : e) });
      }

      log({
        level: (r && r.ok !== false) ? 'success' : 'error',
        action: 'http_call',
        host: ip,
        message: `POST ${target} -> ${(r && r.ok !== false) ? '200' : 'ERR'}`,
        data: r,
      });

      return sendJSON(res, 200, r);
    }

    // 2.4) Supprimer une machine : POST /agent/host/:ip/delete
    if (req.method === 'POST' && action === 'delete') {
      // 1) Supprimer la machine de hosts_server.json (en passant par hostsToList)
      const hosts = readJSON(HOSTS_FILE) || {};
      const list  = hostsToList(hosts);

      // host courant (pour savoir s'il existe)
      const cfg = list.find(h => h && h.ip === ip) || null;

      if (!cfg) {
        return sendJSON(res, 404, { ok: false, error: `Host inconnu : ${ip}` });
      }

      // on reconstruit un objet propre { ip: { ...cfg } } sans cette machine
      const next = {};
      for (const h of list) {
        if (!h || !h.ip) continue;
        if (h.ip === ip) continue;
        const { ip: hip, ...restCfg } = h;
        next[hip] = restCfg;
      }

      writeJSON(HOSTS_FILE, next);

      log({
        level: 'success',
        action: 'delete_host',
        host: ip,
        message: `Machine supprimée ${ip}`,
        data: {},
      });

      // 2) Nettoyer activeByHost dans projects_server.json
      try {
        const pj = loadProjects() || {};
        if (pj.activeByHost && typeof pj.activeByHost === 'object' && ip in pj.activeByHost) {
          delete pj.activeByHost[ip];
          saveProjects(pj, { onlyIfChanged: false });
          log({
            level: 'info',
            action: 'cleanup_activeByHost',
            host: ip,
            message: `Suppression de la machine ${ip} dans projects_server.json activeByHost`,
            data: { remainingHosts: Object.keys(pj.activeByHost || {}) },
          });
        }
      } catch (e) {
        log({
          level: 'error',
          action: 'cleanup_activeByHost_error',
          host: ip,
          message: `Erreur de nettoyage activeByHost après suppression de la machine ${ip}`,
          data: { error: String((e && e.stack) || e) },
        });
      }

      // 3) Nettoyer cette machine dans tous les layouts (targets des widgets)
      try {
        const pjLayouts = loadProjects() || {};
        const projectIds = Array.from(new Set(
          (Array.isArray(pjLayouts.projects) ? pjLayouts.projects : [])
            .map((p) => String(p?.id || '').trim())
            .filter(Boolean)
        ));

        for (const pid of projectIds) {
          const doc = readProjectDoc(pid) || {};
          const stripHostFromLayout = (arr) => {
            let did = false;
            for (const node of arr || []) {
              if (!node || typeof node !== 'object') continue;
              const t = node.targets;
              if (!t || typeof t !== 'object') continue;
              if (Object.prototype.hasOwnProperty.call(t, ip)) {
                delete t[ip];
                did = true;
              }
            }
            return did;
          };

          let touched = false;
          const layouts = Array.isArray(doc.layouts) ? doc.layouts : [];
          if (layouts.length) {
            for (const entry of layouts) {
              if (!entry || !Array.isArray(entry.layout)) continue;
              if (stripHostFromLayout(entry.layout)) touched = true;
            }
            const activeId = String(doc.activeLayoutId || '').trim();
            const active =
              layouts.find((l) => l && l.id === activeId) || layouts[0];
            if (active && Array.isArray(active.layout)) {
              doc.layout = active.layout;
            }
          } else if (Array.isArray(doc.layout)) {
            touched = stripHostFromLayout(doc.layout);
          } else {
            continue;
          }

          if (touched) {
            writeProjectDoc(pid, doc);
            log({
              level: 'info',
              action: 'cleanup_layout_targets',
              host: ip,
              message: `Suppression de la machine ${ip} dans les cibles des widgets du layout`,
              data: { projectId: pid, file: path.join(PRODUCTION_DIR, `${pid}.json`) },
            });
          }
        }
      } catch (e) {
        log({
          level: 'error',
          action: 'cleanup_layout_targets_error',
          host: ip,
          message: `Erreur de nettoyage des cibles widgets après suppression de la machine ${ip}`,
          data: { error: String((e && e.stack) || e) },
        });
      }

      return sendJSON(res, 200, { ok: true });
    }

    // Si on est dans /agent/host/... mais qu’aucune action ne matche
    // on considère que ce n’est pas géré ici
    return false;
  }

  // -------------------------------------------------------------------------
  // 3) AGENT LOCAL : LANCER UNREAL  (/agent/launch)
  // -------------------------------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/agent/launch') {
    const rawBody = await parseBody(req);
    const body = rawBody && typeof rawBody === 'object' ? rawBody : {};

    const normPath = (v) => String(v || '').trim();
    const exe      = normPath(body.exe);
    const uproject = normPath(body.uproject);
    const a        = body.args && typeof body.args === 'object' ? body.args : {};
    const editorOnly = body.editorOnly === true;

    // Mode de lancement : 'production' (par défaut) ou 'integration'
    const mode = (String(body.mode || '').toLowerCase() === 'integration')
      ? 'integration'
      : 'production';

    if (!exe) {
      log({
        level: 'warn',
        src: 'agent',
        action: 'launch',
        message: 'Chemin UnrealEditor manquant',
        data: { exe, uproject, editorOnly, args: a },
      });
      return sendJSON(res, 400, { ok: false, error: 'missing_exe', message: 'Chemin UnrealEditor manquant' });
    }

    if (!uproject && !editorOnly) {
      log({
        level: 'warn',
        src: 'agent',
        action: 'launch',
        message: 'Chemin .uproject manquant',
        data: { exe, uproject, editorOnly, args: a },
      });
      return sendJSON(res, 400, { ok: false, error: 'missing_uproject', message: 'Chemin .uproject manquant' });
    }

    if (!fs.existsSync(exe)) {
      log({
        level: 'warn',
        src: 'agent',
        action: 'launch',
        message: 'Chemin UnrealEditor introuvable',
        data: { exe, editorOnly },
      });
      return sendJSON(res, 400, { ok: false, error: 'invalid_exe_path', message: 'UnrealEditor introuvable' });
    }

    if (!editorOnly && !fs.existsSync(uproject)) {
      log({
        level: 'warn',
        src: 'agent',
        action: 'launch',
        message: 'Chemin .uproject introuvable',
        data: { uproject, editorOnly },
      });
      return sendJSON(res, 400, { ok: false, error: 'invalid_uproject_path', message: '.uproject introuvable' });
    }

    let args = editorOnly ? [] : [uproject];
    if (!editorOnly) {
      // --- Arguments de résolution / per-host (Setup) ---
      const toInt = (v) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
      };

      const resx = toInt(a.resx);
      const resy = toInt(a.resy);
      const frl  = toInt(a.FrameRateLimit);

      if (resx) args.push(`-ResX=${resx}`);
      if (resy) args.push(`-ResY=${resy}`);
      if (frl)  args.push(`-FrameRateLimit=${frl}`);
      if (a.RenderOffscreen) args.push('-RenderOffscreen');
      if (a.NoScreenMessages) args.push('-NoScreenMessages');
      if (typeof a.ExecCmds === 'string' && a.ExecCmds) {
        args.push(`-ExecCmds="${a.ExecCmds}"`);
      }
      if (typeof a.videoCard === 'string' && a.videoCard) {
        const card = a.videoCard.trim().toLowerCase();
        if (card === 'aja') args.push('-uu_card=aja');
        else if (card === 'blackmagic') args.push('-uu_card=blackmagic');
      }

      // --- Arguments Remote Control (dérivés de common_server.json) ---
      const rcHttp = Number(body.rcHttpPort || 0);
      const rcWs   = Number(body.rcWsPort  || 0);

      if (rcHttp) {
        // Exemple : rcHttp=30010 → WebControlPort=30000
        const webPort = (rcHttp > 20) ? (rcHttp - 10) : rcHttp;

        args.push('-RCWebControlEnable');
        args.push('-RCWebInterfaceEnable');
        args.push('-RemoteControlHttpEnable');
        args.push(`-WebControlPort=${webPort}`);
        args.push(`-RemoteControlHTTPPort=${rcHttp}`);
      }

      if (rcWs) {
        args.push(`-RemoteControlWebSocketPort=${rcWs}`);
      }

      // Toujours autoriser les IP distantes pour UltiUnreal
      args.push('-AllowRemoteControlFromAnyIP');

      // On lance en fenêtré (ok pour prod et intégration)
      args.push('-windowed');

      // Mode de lancement
      if (typeof ensureGameFlags === 'function') {
        if (mode === 'production') {
          // Production : forcer le mode Game (retirer -editor si présent)
          args = ensureGameFlags(args);
        } else {
          // Intégration : ne PAS forcer -game
          args = Array.isArray(args)
            ? args.filter(v => String(v).toLowerCase() !== '-game')
            : args;
        }
      }
    }

    const currentPid = getPid();
    if (currentPid) {
      let alive = true;
      try {
        process.kill(currentPid, 0);
      } catch {
        alive = false;
      }
      if (alive) {
        log({
          level: 'success',
          src: 'agent',
          action: 'launch',
          message: 'Unreal déjà en cours d’exécution',
          data: { exe, uproject, args: a, pid: currentPid },
        });
        return sendJSON(res, 200, { ok: true, alreadyRunning: true, pid: currentPid });
      }
    }

    try {
      const child = spawn(exe, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: false,
      });

      setProc(child.pid, child);
      child.unref();

      log({
        level: 'success',
        src: 'agent',
        action: 'launch',
        message: 'Démarrage Unreal',
        data: { exe, uproject, args, pid: getPid() },
      });

      return sendJSON(res, 200, { ok: true, pid: getPid(), cmd: [exe, ...args] });
    } catch (e) {
      console.error('Launch error:', e);
      log({
        level: 'error',
        src: 'agent',
        action: 'launch',
        message: 'Erreur de démarrage Unreal',
        data: { error: String(e?.message || e), exe, uproject, args },
      });
      return sendJSON(res, 500, { ok: false, error: String(e?.message || e) });
    }
  }

  // -------------------------------------------------------------------------
  // 4) AGENT LOCAL : STOPPER UNREAL  (/agent/stop)
  // -------------------------------------------------------------------------
  if (req.method === 'POST' && url.pathname === '/agent/stop') {
    const rawBody = await parseBody(req);
    const body = rawBody && typeof rawBody === 'object' ? rawBody : {};
    const mode = String(body?.mode || '').toLowerCase();
    const targetProject = String(body?.uproject || '').trim();
    const oldPid = getPid();
    let killed = [];
    let strategy = 'pid';

    try {
      if (mode === 'production') {
        await killAllUnreal();
        strategy = 'all';
      } else if (mode === 'integration') {
        const pids = await listPidsByUproject(targetProject);
        if (pids.length) {
          killed = await killPids(pids);
          strategy = 'uproject';
        } else if (!targetProject && oldPid) {
          killed = await killPids([oldPid]);
          strategy = 'pid';
        }
      } else if (oldPid) {
        killed = await killPids([oldPid]);
        strategy = 'pid';
      }
    } finally {
      clearProc();
    }

    log({
      level: 'success',
      src: 'agent',
      action: 'stop',
      message: 'Arrêt Unreal demandé',
      data: { pid: oldPid, mode, targetProject, killed, strategy },
    });

    return sendJSON(res, 200, { ok: true, killed, strategy });
  }

  // Si aucune route ne correspond, on indique à server.cjs qu’on n’a rien fait
  return false;
}

module.exports = { handleLaunch };

