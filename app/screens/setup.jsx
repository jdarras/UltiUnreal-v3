// app/screens/setup.jsx
import React from 'react';
import { colorClass, normalizeMachineColor } from '../utils/colors';
import { readIdentity } from '../utils/identity';
import {
  getHosts,
  getCommon,
  getProjects,
  postHost,
  deleteHost,
  getOnlineStatus,
  setProjectAssociation,
} from '../utils/agent';
import { createT } from '../i18n';

const EMPTY_CFG = {
  machines: [],
};

// Couleurs possibles pour les machines (10 au total)
const MACHINE_COLORS = [
  { value: '#60A5FA', label: 'Bleu' },
  { value: '#22D3EE', label: 'Cyan' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#7A1B3C', label: 'Bordeaux' },
  { value: '#A78BFA', label: 'Violet' },
  { value: '#14B8A6', label: 'Turquoise' },
  { value: '#F472B6', label: 'Rose' },
  { value: '#FACC15', label: 'Jaune' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#6B7280', label: 'Gris' },
];

// Options de résolution communes (évite de les recréer par carte)
const PRESET_OPTIONS = [
  { k: 'manual', label: 'Manuel', x: null, y: null },
  { k: '720x486', label: '720 × 486', x: 720, y: 486 },
  { k: '720x576', label: '720 × 576', x: 720, y: 576 },
  { k: '1280x720', label: '1280 × 720', x: 1280, y: 720 },
  { k: '1920x1080', label: '1920 × 1080', x: 1920, y: 1080 },
  { k: '2048x1080', label: '2048 × 1080', x: 2048, y: 1080 },
  { k: '3840x2160', label: '3840 × 2160', x: 3840, y: 2160 },
  { k: '4096x2160', label: '4096 × 2160', x: 4096, y: 2160 },
  { k: '7680x4320', label: '7680 × 4320', x: 7680, y: 4320 },
  { k: '8192x4320', label: '8192 × 4320', x: 8192, y: 4320 },
];

function hostArrayToEditList(list, locale = 'fr') {
  const presetKeyFromRes = (x, y) => {
    const px = Number(x);
    const py = Number(y);
    const presets = [
      { k: '720x486', x: 720, y: 486 },
      { k: '720x576', x: 720, y: 576 },
      { k: '1280x720', x: 1280, y: 720 },
      { k: '1920x1080', x: 1920, y: 1080 },
      { k: '2048x1080', x: 2048, y: 1080 },
      { k: '3840x2160', x: 3840, y: 2160 },
      { k: '4096x2160', x: 4096, y: 2160 },
      { k: '7680x4320', x: 7680, y: 4320 },
      { k: '8192x4320', x: 8192, y: 4320 },
    ];
    const hit = presets.find((p) => p.x === px && p.y === py);
    return hit ? hit.k : 'manual';
  };

  const collator = new Intl.Collator(locale || 'fr', { numeric: true, sensitivity: 'base' });

  const withIndex = [...(Array.isArray(list) ? list : [])].map((h, idx) => {
    const n = Number(h?.sortIndex);
    return { host: h, sortIndex: Number.isFinite(n) ? n : idx };
  });

  const sorted = withIndex.sort((a, b) => {
    if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
    const na = String(a.host?.name || '').trim();
    const nb = String(b.host?.name || '').trim();
    if (na && nb) {
      const c = collator.compare(na, nb);
      if (c !== 0) return c;
    } else if (na) {
      return -1;
    } else if (nb) {
      return 1;
    }
    return collator.compare(String(a.host?.ip || ''), String(b.host?.ip || ''));
  });

  const out = [];
  for (const { host: h, sortIndex } of sorted) {
    const a = h.args || {};
    out.push({
      name: h.name || '',
      color: normalizeMachineColor(h.color),
      ip: h.ip || '',
      uproject: h.uproject || '',
      args: {
        resx: a.resx ?? '',
        resy: a.resy ?? '',
        frameRateLimit: (a.FrameRateLimit ?? a.frameRateLimit) ?? '',
        execCmds: a.ExecCmds ?? a.execCmds ?? '',
        renderOffscreen: !!a.RenderOffscreen || !!a.renderOffscreen,
        noScreenMessages: !!a.NoScreenMessages || !!a.noScreenMessages,
        videoCard: a.videoCard ?? '',
        resPreset: a.resPreset ?? presetKeyFromRes(a.resx, a.resy),
      },
      showEditor: false,
      showArgs: false,
      status: 'unknown',
      lastMsg: '',
      lastMsgType: '',
      eligible: h.eligible === false ? false : true,
      renderEnabled: h.renderEnabled === false ? false : true,
      sortIndex,
    });
  }
  return out;
}

// Validation minimale IPv4 pour éviter les enregistrements avec une IP partielle
function isValidIpv4(ip) {
  const s = String(ip || '').trim();
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return false;
  return m.slice(1).every((x) => {
    const n = Number(x);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function normalizeEditorsMap(map = {}) {
  const out = {};
  if (!map || typeof map !== 'object') return out;
  for (const [k, v] of Object.entries(map)) {
    const key = String(k || '').trim();
    if (!key) continue;
    out[key] = String(v || '').trim();
  }
  return out;
}

function buildEditorsSignature(map = {}) {
  const norm = normalizeEditorsMap(map);
  const keys = Object.keys(norm).sort((a, b) =>
    String(a || '').localeCompare(String(b || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );
  return keys.map((k) => `${k}:${norm[k]}`).join('|');
}

export default function SetupScreen({ clientSyncEnabled, onClientSyncChange }) {
  const id = React.useMemo(readIdentity, []);
  const role = String(id.role || 'server').trim();
  const localIp = String(id.localIp || '').trim();
  const lang = String(id.lang || 'fr').trim();
  const appMode = String(id.mode || '').trim().toLowerCase();
  const isRenderMode = appMode === 'postprod';

  const t = React.useMemo(() => createT(lang), [lang]);

  /* ====================== ÉTAT / EFFETS CÔTÉ CLIENT ====================== */
  const LS_EDITORS_KEY = 'uu_client_unrealEditors';
  const LS_SYNC_KEY = 'uu_client_syncEnabled';
  const LS_VERSIONS_KEY = 'uu_client_unrealVersions';
  const LS_CLIENT_ASSOC = 'uu_client_project_assoc';
  const versionsFromCache = React.useMemo(() => {
    try {
      const raw = localStorage.getItem(LS_EDITORS_KEY) || '{}';
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object') return Object.keys(obj).filter(Boolean);
    } catch {}
    try {
      const rawVers = localStorage.getItem(LS_VERSIONS_KEY) || '[]';
      const arr = JSON.parse(rawVers);
      if (Array.isArray(arr)) return arr.map((v) => String(v || '').trim()).filter(Boolean);
    } catch {}
    return [];
  }, []);

  const readCachedEditors = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_EDITORS_KEY) || '{}';
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  }, []);

  const writeCachedEditors = React.useCallback((obj) => {
    try {
      localStorage.setItem(LS_EDITORS_KEY, JSON.stringify(obj || {}, null, 2));
    } catch {}
  }, []);

  const readCachedSync = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_SYNC_KEY);
      if (raw === 'true') return true;
      if (raw === 'false') return false;
      return null;
    } catch {
      return null;
    }
  }, []);

  const readCachedAssoc = React.useCallback(() => {
    try {
      return String(localStorage.getItem(LS_CLIENT_ASSOC) || '');
    } catch {
      return '';
    }
  }, []);

  const writeCachedSync = React.useCallback((val) => {
    try {
      localStorage.setItem(LS_SYNC_KEY, String(!!val));
    } catch {}
  }, []);

  const readCachedVersions = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(LS_VERSIONS_KEY) || '[]';
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr.map((v) => String(v || '').trim()).filter(Boolean);
      }
    } catch {}
    return [];
  }, []);

  const writeCachedVersions = React.useCallback((arr) => {
    try {
      const list = Array.isArray(arr) ? arr : [];
      localStorage.setItem(
        LS_VERSIONS_KEY,
        JSON.stringify(list.map((v) => String(v || '').trim()).filter(Boolean))
      );
    } catch {}
  }, []);

  const [clientVersions, setClientVersions] = React.useState(versionsFromCache); // ["5.6","5.7"]
  const [clientEditors, setClientEditors] = React.useState(() => {
    try {
      const raw = localStorage.getItem(LS_EDITORS_KEY) || '{}';
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch {
      return {};
    }
  });   // { "5.6": "C:\\...\\UE.exe" }
  const [clientHostExists, setClientHostExists] = React.useState(false);
  const [clientMsg, setClientMsg] = React.useState('');
  const [clientMsgType, setClientMsgType] = React.useState(''); // 'ok' | 'error' | 'info'
  const [clientSyncState, setClientSyncState] = React.useState(() => {
    const cached = readCachedSync();
    return cached !== null ? cached : !!clientSyncEnabled;
  });
  const [versionsLoaded, setVersionsLoaded] = React.useState(false);
  const clientSaveTimer = React.useRef(null);
  const clientSaveReady = React.useRef(false);
  const lastClientSaveSigRef = React.useRef('');

  React.useEffect(() => {
    setClientSyncState(!!clientSyncEnabled);
  }, [clientSyncEnabled]);
  React.useEffect(() => {
    if (role !== 'client') return;
    if (!localIp) return;
    if (!clientSaveReady.current) {
      clientSaveReady.current = true;
      return;
    }
    if (clientSaveTimer.current) clearTimeout(clientSaveTimer.current);
    clientSaveTimer.current = setTimeout(() => {
      saveClientEditors();
    }, 600);
    return () => {
      if (clientSaveTimer.current) clearTimeout(clientSaveTimer.current);
    };
  }, [clientEditors, clientVersions, clientSyncState, role, localIp]);

  // Charger les versions Unreal + l'état "mode synchro" pour la machine locale
  React.useEffect(() => {
  (async () => {
    try {
      const [common, hosts] = await Promise.all([
        getCommon().catch(() => ({})),
        getHosts().catch(() => []),
      ]);

      const extractVersionsFromHosts = (list = []) => {
        const set = new Set();
        (list || []).forEach((h) => {
          if (!h || typeof h !== 'object') return;
          Object.keys(h).forEach((k) => {
            const m = /^unreal_editor_(.+)$/i.exec(String(k || '').trim());
            if (m && m[1]) set.add(m[1]);
          });
          if (h.unrealEditors && typeof h.unrealEditors === 'object') {
            Object.keys(h.unrealEditors).forEach((k) => {
              if (k) set.add(String(k).trim());
            });
          }
        });
        return Array.from(set).filter(Boolean);
      };

      const extractEditorsForHost = (host = {}) => {
        const map = {};
        if (host.unrealEditors && typeof host.unrealEditors === 'object') {
          for (const [k, v] of Object.entries(host.unrealEditors)) {
            map[String(k || '').trim()] = String(v || '').trim();
          }
        }
        if (host.unreal_editors && typeof host.unreal_editors === 'object') {
          for (const [k, v] of Object.entries(host.unreal_editors)) {
            const key = String(k || '').trim();
            if (!map[key]) map[key] = String(v || '').trim();
          }
        }
        Object.keys(host || {}).forEach((k) => {
          const m = /^unreal_editor_(.+)$/i.exec(String(k || '').trim());
          if (m && m[1]) {
            const key = String(m[1]).trim();
            if (!map[key]) map[key] = String(host[k] || '').trim();
          }
        });
        return map;
      };

      const cachedEditorKeys = Object.keys(clientEditors || {}).filter(Boolean);
      const cachedVers = readCachedVersions();
      const versFromCommon =
        Array.isArray(common?.unrealVersions) && common.unrealVersions.length
          ? common.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
          : [];
      // Si le serveur fournit déjà la liste des versions, on l'injecte tout de suite
      if (versFromCommon.length) {
        setClientVersions(versFromCommon);
        writeCachedVersions(versFromCommon);
      }
      const versFromHosts = extractVersionsFromHosts(hosts);

      // Union pour ne jamais perdre une info disponible (common -> hosts -> cache)
      const versionSet = new Set([
        ...versFromCommon,
        ...versFromHosts,
        ...cachedEditorKeys,
        ...cachedVers,
      ]);

      const localHost =
        hosts.find(
          (h) =>
            h &&
            String(h.ip || h.address || '').trim().toLowerCase() ===
              String(localIp || '').trim().toLowerCase()
        ) ||
        (hosts.length === 1 ? hosts[0] : null);

      setClientHostExists(!!localHost);

      setCfg(prev => ({ ...prev, machines: hostArrayToEditList(hosts) }));

      if (localHost) {
        const editors = extractEditorsForHost(localHost);
      setClientEditors(editors);
      writeCachedEditors(editors);
      const editorKeys = Object.keys(editors).filter(Boolean);
      editorKeys.forEach((v) => versionSet.add(v));
      if (role === 'client') {
        const enabled =
          typeof localHost.syncEnabled === 'boolean'
            ? localHost.syncEnabled
            : !!localHost.syncRoot;
        setClientSyncState(enabled);
        writeCachedSync(enabled);
      }
      } else {
        // Pas d'entrée host pour cette IP : on garde le cache local si présent
        const cached = readCachedEditors();
        if (Object.keys(cached).length > 0) {
          setClientEditors(cached);
          Object.keys(cached).forEach((v) => versionSet.add(v));
        }
        const cachedSync = readCachedSync();
        if (cachedSync !== null) {
          setClientSyncState(cachedSync);
        }
      }

      // Priorité : ce qui vient du serveur (common + hosts), complété par le cache
      const finalVers = Array.from(versionSet).filter(Boolean);
      if (finalVers.length) {
        setClientVersions(finalVers);
        writeCachedVersions(finalVers);
      } else if (versFromCommon.length) {
        setClientVersions(versFromCommon);
        writeCachedVersions(versFromCommon);
      }

      await refreshStatuses();
    } catch {
      // Fallback complet : réinjecter le cache si les appels réseau échouent
      try {
        const raw = localStorage.getItem(LS_EDITORS_KEY) || '{}';
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object') {
          setClientEditors(obj);
          setClientVersions(Object.keys(obj).filter(Boolean));
        }
      } catch {}
      const cachedVers = readCachedVersions();
      if (cachedVers.length) setClientVersions(cachedVers);
      const cachedSync = readCachedSync();
      if (cachedSync !== null) {
        setClientSyncState(cachedSync);
      }
    } finally {
      setVersionsLoaded(true);
    }
  })();
  }, [role, localIp, onClientSyncChange, readCachedVersions, writeCachedVersions]);

  async function saveClientEditors(editorsOverride = null) {
    if (!localIp) {
      setClientMsg(t('setup.client.msg.localIpMissing'));
      setClientMsgType('error');
      setTimeout(() => {
        setClientMsg('');
        setClientMsgType('');
      }, 2500);
      return;
    }

    // pour l'autosave, on ne spam pas le message "enregistrement" en continu
    // on conserve uniquement les messages de succès/erreur

    const sourceEditors =
      editorsOverride && typeof editorsOverride === 'object'
        ? editorsOverride
        : clientEditors;

    const payload = { unrealEditors: {}, syncEnabled: !!clientSyncState };
    const versionsForSave = clientVersions.length
      ? clientVersions
      : Object.keys(sourceEditors || {}).filter(Boolean);
    versionsForSave.forEach((ver) => {
      const v = String(ver || '').trim();
      if (v) {
        payload.unrealEditors[v] = String(sourceEditors[v] || '').trim();
      }
    });
    const payloadSig = (() => {
      const entries = Object.entries(payload.unrealEditors)
        .map(([k, v]) => `${String(k || '').trim()}:${String(v || '').trim()}`)
        .sort((a, b) =>
          String(a || '').localeCompare(String(b || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        );
      return `${payload.syncEnabled ? '1' : '0'}|${entries.join('|')}`;
    })();
    if (payloadSig === lastClientSaveSigRef.current) {
      return;
    }
    // Cache local immédiatement pour survivre aux redémarrages même si l'agent est down
    writeCachedEditors(payload.unrealEditors);
    writeCachedSync(payload.syncEnabled);

    if (!clientHostExists) {
      setClientMsg(t('setup.client.msg.hostMissingOnServer'));
      setClientMsgType('error');
      setTimeout(() => {
        setClientMsg('');
        setClientMsgType('');
      }, 2500);
      return;
    }

    try {
      const r = await postHost(localIp, payload);
      const ok = r && r.ok !== false;
      if (ok) {
        lastClientSaveSigRef.current = payloadSig;
      }
      setClientMsg(ok ? t('setup.client.msg.saveOk') : t('setup.client.msg.saveError'));
      setClientMsgType(ok ? 'ok' : 'error');

      if (ok) {
        try {
          const hosts = await getHosts().catch(() => []);
          const localHost = (hosts || []).find(
            (h) =>
              h &&
              String(h.ip || h.address || '').trim().toLowerCase() ===
                String(localIp || '').trim().toLowerCase()
          );
          if (localHost) {
            const editors = {};
            if (localHost.unrealEditors && typeof localHost.unrealEditors === 'object') {
              for (const [k, v] of Object.entries(localHost.unrealEditors)) {
                editors[String(k || '').trim()] = String(v || '').trim();
              }
            }
            if (localHost.unreal_editors && typeof localHost.unreal_editors === 'object') {
              for (const [k, v] of Object.entries(localHost.unreal_editors)) {
                const key = String(k || '').trim();
                if (!editors[key]) editors[key] = String(v || '').trim();
              }
            }
            Object.keys(localHost || {}).forEach((k) => {
              const m = /^unreal_editor_(.+)$/i.exec(String(k || '').trim());
              if (m && m[1]) {
                const key = String(m[1]).trim();
                if (!editors[key]) editors[key] = String(localHost[k] || '').trim();
              }
            });
            setClientEditors((prev) => {
              const prevSig = buildEditorsSignature(prev);
              const nextSig = buildEditorsSignature(editors);
              return prevSig === nextSig ? prev : editors;
            });
            writeCachedEditors(editors);
          }
        } catch {}
      }
    } catch {
      setClientMsg(t('setup.client.msg.saveError'));
      setClientMsgType('error');
    }

    setTimeout(() => {
      setClientMsg('');
      setClientMsgType('');
    }, 2500);
  }

  async function handleClientToggleSync(e) {
  const enabled = e.target.checked;
  setClientSyncState(enabled);
  writeCachedSync(enabled);

  if (typeof onClientSyncChange === 'function') {
    onClientSyncChange(enabled);
  }

  if (!localIp) {
    setClientMsg(t('setup.client.msg.localIpMissing'));
    setClientMsgType('error');
    setTimeout(() => {
      setClientMsg('');
      setClientMsgType('');
    }, 2500);
    return;
  }

  if (!clientHostExists) {
    setClientMsg(t('setup.client.msg.hostMissingOnServer'));
    setClientMsgType('error');
    setTimeout(() => {
      setClientMsg('');
      setClientMsgType('');
    }, 2500);
    return;
  }

  try {
    const assocPath = !enabled ? readCachedAssoc() : '';
    const r = await postHost(localIp, {
      syncEnabled: enabled,
      ...(assocPath ? { uproject: assocPath } : {})
    });
    const ok = r && r.ok !== false;

    if (ok && !enabled) {
      if (assocPath) {
        try {
          const p = await getProjects().catch(() => ({}));
          const activeId = String(p?.activeId || '').trim();
          const activeName = String(p?.activeName || '').trim();
          const projectKey = activeId || activeName;
          if (projectKey) {
            await setProjectAssociation(localIp, projectKey, assocPath);
          }
        } catch (e) {
          console.warn('sync disable: setProjectAssociation failed', e);
        }
      }
    }

    setClientMsg(
      ok
        ? (enabled
            ? t('setup.client.msg.syncEnabled')
            : t('setup.client.msg.syncDisabled'))
        : t('setup.client.msg.syncUpdateError')
    );
    setClientMsgType(ok ? 'ok' : 'error');
  } catch {
    setClientMsg(t('setup.client.msg.syncUpdateError'));
    setClientMsgType('error');
  }

  setTimeout(() => {
    setClientMsg('');
    setClientMsgType('');
  }, 2500);
}

  /* ====================== RÔLE CLIENT : interface minimale ====================== */
  if (role === 'client') {
    const versionsToDisplay =
      clientVersions.length
        ? clientVersions
        : Object.keys(clientEditors || {}).filter(Boolean);

  return (
    <div className="uu-page">
      <h2>{t('setup.client.title')}</h2>

      {/* Bloc UnrealEditor.exe versionné */}
      <div className="uu-section uu-maxw-640">
        {!versionsLoaded && versionsToDisplay.length === 0 ? (
          <div className="uu-muted">{t('common.loading')}</div>
        ) : versionsToDisplay.length === 0 ? (
          <div className="uu-muted">{t('setup.client.noVersions')}</div>
        ) : (
          versionsToDisplay.map((ver) => (
            <div key={ver} className="uu-grid-field mt-8">
              <label className="uu-label w-160">
                {t('setup.client.unrealVersionLabel', { version: ver })}
              </label>
              <div className="uu-grid-2" style={{ gridTemplateColumns: '1fr auto' }}>
                <input
                  className="uu-input"
                  value={clientEditors[ver] || ''}
                  onChange={(e) =>
                    setClientEditors((prev) => ({
                      ...prev,
                      [ver]: e.target.value,
                    }))
                  }
                  onBlur={() => {
                    saveClientEditors();
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    saveClientEditors();
                  }}
                  placeholder={t('setup.client.editorPlaceholder')}
                />
                <button
                  className="uu-btn"
                  type="button"
                  onClick={async () => {
                    if (!window.electron?.openExecutable) {
                      setClientMsg(t('setup.client.msg.browseUnavailable'));
                      setClientMsgType('error');
                      setTimeout(() => {
                        setClientMsg('');
                        setClientMsgType('');
                      }, 2500);
                      return;
                    }
                    let file = '';
                    try {
                      file = await window.electron.openExecutable({
                        defaultPath: String(clientEditors?.[ver] || '').trim(),
                      });
                    } catch {}
                    if (!file) return;
                    const path = String(file).trim();
                    const nextEditors = {
                      ...(clientEditors && typeof clientEditors === 'object' ? clientEditors : {}),
                      [ver]: path,
                    };
                    setClientEditors(nextEditors);
                    saveClientEditors(nextEditors);
                  }}
                >
                  {t('common.browse')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bloc Synchronisation projet */}
      <div className="uu-section uu-maxw-640 mt-16">
        <div className="uu-grid-field">
          <label className="uu-label">
            <input
              type="checkbox"
              checked={!!clientSyncState}
              onChange={handleClientToggleSync}
            />{' '}
            {t('setup.client.syncCheckboxLabel')}
          </label>
          <p className="uu-hint">
            {t('setup.client.syncHint.beforeTab')}{' '}
            <strong>{t('nav.sync')}</strong>{' '}
            {t('setup.client.syncHint.afterTab')}
          </p>
        </div>
      </div>

      {clientMsg && (
        <div className={`uu-msg ${clientMsgType || ''} mt-8`}>
          {clientMsg}
        </div>
      )}
    </div>
  );
}

  /* ====================== RÔLE SERVEUR ====================== */
  const [cfg, setCfg] = React.useState(EMPTY_CFG);
  const cfgRef = React.useRef(cfg);
  React.useEffect(() => {
    cfgRef.current = cfg;
  }, [cfg]);
  const [detected, setDetected] = React.useState([]); // présences non déclarées
  const sortLocale = lang || 'fr';
  const serverSaveTimers = React.useRef({});

  React.useEffect(() => {
    (async () => {
      if (role === 'client') return; // le bloc serveur ne s'applique pas côté client
      try {
        const c = await getCommon();
        setCfg(prev => ({
          ...prev,
          rcHttpPort: c.rcHttpPort ?? prev.rcHttpPort,
          rcWsPort: c.rcWsPort ?? prev.rcWsPort,
          webRemoteControlName: c.webRemoteControlName ?? prev.webRemoteControlName,
          refreshSec: c.refreshSec ?? prev.refreshSec,
          agentPort: c.agentPort ?? prev.agentPort,
        }));
      } catch {}

      try {
        const hosts = await getHosts(); // already array normalized
        setCfg(prev => ({ ...prev, machines: hostArrayToEditList(hosts, sortLocale) }));
        // après avoir chargé les machines, on déclenche un refresh des statuts
        await refreshStatuses();
      } catch {}

    })();
  }, [sortLocale, role, localIp]);

  // Polling réseau (online + présence détectée) selon refreshSec
  React.useEffect(() => {
    if (role !== 'server') return;
    let stopped = false;
    let timer = null;

    const tick = async () => {
      await refreshStatuses();
      if (stopped) return;
      const sec = Math.max(2, Number(cfg.refreshSec || 5));
      timer = setTimeout(tick, sec * 1000);
    };

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [role, cfg.refreshSec]);

  function updateMachine(i, changes) {
    const isIpChange = Object.prototype.hasOwnProperty.call(changes || {}, 'ip');
    const skipAutosave = isIpChange; // on ne déclenche pas l'autosave pendant la saisie de l'IP
    const shouldTriggerSave = (() => {
      const keys = Object.keys(changes || {});
      // ne pas déclencher pour les messages/affichages/états visuels
      const IGNORE = new Set(['lastMsg', 'lastMsgType', 'status', 'showEditor', 'showArgs', 'prevIp']);
      return keys.some((k) => !IGNORE.has(k)) && !skipAutosave;
    })();

    setCfg((prev) => {
      const m = [...prev.machines];
      const prevIp = String(m[i]?.ip || '').trim();
      const nextIp = String(changes.ip ?? prevIp).trim();
      const next = {
        ...m[i],
        ...changes,
        prevIp:
          isIpChange && prevIp && prevIp !== nextIp
            ? prevIp
            : m[i]?.prevIp || '',
      };
      m[i] = next;
      if (role === 'server' && shouldTriggerSave) {
        // Ne déclenche la sauvegarde que si l'IP est complète/valide
        if (isValidIpv4(next.ip)) {
          scheduleServerSave(i, next);
        } else {
          const timers = serverSaveTimers.current || {};
          if (timers[i]) {
            clearTimeout(timers[i]);
            delete timers[i];
          }
        }
      }
      return { ...prev, machines: m };
    });
  }
  function addMachine() {
    setCfg(prev => {
      const nextIndex = prev.machines.length;
      return {
        ...prev,
        machines: [
          ...prev.machines,
          {
            name: `Machine ${prev.machines.length + 1}`,
            color: '',
            ip: '',
            uproject: '',
            args: {},
            showEditor: false,
            showArgs: false,
            status: 'unknown',
            lastMsg: '',
            lastMsgType: '',
            eligible: true,
            renderEnabled: true,
            sortIndex: nextIndex,
            prevIp: '',
          },
        ],
      };
    });
  }
  async function removeMachine(i) {
    const ip = String(cfg.machines[i]?.ip || '').trim();
    if (ip) { try { await deleteHost(ip); } catch {} }
    setCfg(prev => ({ ...prev, machines: prev.machines.filter((_, idx) => idx !== i) }));
  }

  function normalizeArgsForServer(a = {}) {
    const out = {};
    if (a.resx !== undefined && a.resx !== '') out.resx = Number(a.resx);
    if (a.resy !== undefined && a.resy !== '') out.resy = Number(a.resy);
    if (a.frameRateLimit !== undefined && a.frameRateLimit !== '') out.FrameRateLimit = Number(a.frameRateLimit);
    if (a.resPreset !== undefined && a.resPreset !== '') out.resPreset = String(a.resPreset);
    if (a.execCmds !== undefined && a.execCmds !== '') out.ExecCmds = String(a.execCmds);
    if (a.renderOffscreen === true) out.RenderOffscreen = true;
    if (a.noScreenMessages === true) out.NoScreenMessages = true;
    if (a.videoCard) {
      const card = String(a.videoCard || '').trim().toLowerCase();
      if (card === 'aja') out.videoCard = 'AJA';
      else if (card === 'blackmagic') out.videoCard = 'BlackMagic';
    }
    return out;
  }

    // Met à jour uniquement les pastilles de statut (agent joignable / inaccessible), sans toucher aux messages d'enregistrement
    function normalizeOnlineItems(res) {
      let items = res && res.items ? res.items : {};
      if (Array.isArray(items)) {
        const map = {};
        for (const it of items) {
          const key = String(it?.ip || '').trim();
          if (key) map[key] = it;
        }
        items = map;
      } else if (!items || typeof items !== 'object') {
        items = {};
      }
      return items;
    }

    function normalizeDetectedList(res) {
      const raw = res && res.detected ? res.detected : {};
      const list = [];
      if (Array.isArray(raw)) {
        for (const entry of raw) {
          const ip = String(entry?.ip || '').trim();
          if (!ip) continue;
          list.push({
            ip,
            name: String(entry?.name || '').trim(),
            ts: entry?.ts || '',
          });
        }
        return list;
      }
      if (raw && typeof raw === 'object') {
        for (const [ip, entry] of Object.entries(raw)) {
          const key = String(ip || '').trim();
          if (!key) continue;
          list.push({
            ip: key,
            name: String(entry?.name || '').trim(),
            ts: entry?.ts || '',
          });
        }
      }
      return list;
    }

    async function refreshStatuses() {
      try {
        const res = await getOnlineStatus().catch(() => ({}));
        const online = normalizeOnlineItems(res);
        if (res && (Array.isArray(res.detected) || typeof res.detected === 'object')) {
          setDetected(normalizeDetectedList(res));
        }

        setCfg((prev) => {
          const machines = (prev.machines || []).map((m) => {
            const ip = String(m.ip || '').trim();
            if (!ip) {
              return { ...m, status: 'unknown' };
            }

            const st = online[ip];

            // Aucun retour pour cette IP dans la map -> on garde "inconnu" ou "ok" si IP locale
            if (!st) {
              return {
                ...m,
                status: ip === localIp ? 'ok' : 'unknown',
              };
            }

            const isOnline = !!st.online;
            const isLocalMachine = ip === localIp;

            return {
              ...m,
              status: isOnline ? 'ok' : isLocalMachine ? 'warn' : 'fail',
            };
          });

          return { ...prev, machines };
        });
      } catch (e) {
        console.warn('refreshStatuses error', e);
      }
    }

  function scheduleServerSave(i, machine) {
    const timers = serverSaveTimers.current || {};
    const ip =
      String(machine?.ip || '').trim() ||
      String(cfgRef.current?.machines?.[i]?.ip || '').trim();
    const key = ip || String(i);
    if (timers[key]) clearTimeout(timers[key]);
    if (!isValidIpv4(ip)) {
      delete timers[key];
      return;
    }
    timers[key] = setTimeout(() => saveArgsToServer(key, machine), 700);
    serverSaveTimers.current = timers;
  }

  async function saveArgsToServer(key = null, machineOverride = null) {
    const stateMachines = Array.isArray(cfgRef.current?.machines)
      ? cfgRef.current.machines
      : [];
    const keyIsIp = typeof key === 'string' && key.trim();

    let m = machineOverride;
    let ip = '';

    if (!m && keyIsIp) {
      ip = String(key).trim();
      m =
        stateMachines.find(
          (h) => String(h?.ip || '').trim().toLowerCase() === ip.toLowerCase()
        ) || null;
    }

    if (!m && typeof key === 'number') {
      m = stateMachines[key] || null;
    }

    if (m && !ip) {
      ip = String(m?.ip || '').trim();
    }

    if (!m && ip) {
      m =
        stateMachines.find(
          (h) => String(h?.ip || '').trim().toLowerCase() === ip.toLowerCase()
        ) || null;
    }

    if (!m) return;

    ip = String(ip || m?.ip || '').trim();
    const idxInState = ip
      ? stateMachines.findIndex(
          (h) => String(h?.ip || '').trim().toLowerCase() === ip.toLowerCase()
        )
      : -1;
    if (!ip) {
      if (idxInState >= 0) {
        updateMachine(idxInState, {
          lastMsg: t('setup.server.msg.hostIpMissing'),
          lastMsgType: 'error',
        });
        setTimeout(
          () => updateMachine(idxInState, { lastMsg: '', lastMsgType: '' }),
          1500
        );
      }
      return;
    }

    const stateMatch =
      (idxInState >= 0 ? stateMachines[idxInState] : null) ||
      stateMachines.find(
        (h) => String(h?.ip || '').trim().toLowerCase() === ip.toLowerCase()
      ) ||
      m;
    const args = normalizeArgsForServer(stateMatch.args || m.args || {});
    const sortIdxFromState = Number(stateMatch?.sortIndex);
    const sortIndex = Number.isFinite(sortIdxFromState)
      ? sortIdxFromState
      : idxInState >= 0
        ? idxInState
        : Number(m.sortIndex);
    const eligibleFlag =
      stateMatch?.eligible === false
        ? false
        : m?.eligible === false
          ? false
          : true;
    const payload = {
      ip,
      name: String(stateMatch.name ?? m.name ?? '').trim(),
      color: String(stateMatch.color ?? m.color ?? '').trim(),
      args,
      eligible: eligibleFlag,
      renderEnabled: stateMatch?.renderEnabled === false ? false : true,
      sortIndex: Number.isFinite(sortIndex) ? sortIndex : undefined,
    };

    const r = await postHost(ip, payload);
    const ok = r && r.ok !== false;
    if (idxInState >= 0) {
      updateMachine(idxInState, {
        lastMsg: ok
          ? t('setup.server.msg.hostSaved')
          : t('setup.server.msg.hostSaveError'),
        lastMsgType: ok ? 'ok' : 'error',
      });
      setTimeout(
        () => updateMachine(idxInState, { lastMsg: '', lastMsgType: '' }),
        3000
      );
    }

    // re-ping après enregistrement (si IP présente)
    if (ip) refreshStatuses();
  }

  // pastille IP selon m.status
  function statusDot(status) {
    const cls =
      status === 'ok'
        ? 'ok'
        : status === 'fail'
          ? 'fail'
          : status === 'warn'
            ? 'warn'
            : 'unknown';
    const title =
      status === 'ok'
        ? t('setup.server.status.agentOk')
        : status === 'fail'
          ? t('setup.server.status.agentFail')
          : status === 'warn'
            ? t('setup.server.status.agentWarn')
            : t('setup.server.status.agentUnknown');
    return <span className={`uu-dot ${cls}`} title={title} />;
  }

  const eligibleList = cfg.machines.map((m, idx) => ({ ...m, _idx: idx })).filter((m) => m.eligible !== false);
  const excludedList = cfg.machines.map((m, idx) => ({ ...m, _idx: idx })).filter((m) => m.eligible === false);

  const dragInfo = React.useRef(null);

  const reindexAndPersist = React.useCallback(
    async (machines) => {
      const list = Array.isArray(machines) ? machines : [];
      const updated = list.map((m, idx) => ({ ...m, sortIndex: idx }));

      // met à jour l'état immédiatement pour refléter l'ordre courant
      setCfg((prev) => ({ ...prev, machines: updated }));
      cfgRef.current = { ...cfgRef.current, machines: updated };

      // poste chaque machine connue (si IP renseignée) avec le sortIndex recalculé
      for (const vm of updated) {
        const ip = String(vm?.ip || '').trim();
        if (!ip) continue;
        try {
          await postHost(ip, {
            ip,
            name: String(vm.name || '').trim(),
            color: String(vm.color || '').trim(),
            args: normalizeArgsForServer(vm.args || {}),
            eligible: vm.eligible === false ? false : true,
            renderEnabled: vm.renderEnabled === false ? false : true,
            sortIndex: Number(vm.sortIndex),
          });
        } catch {}
      }

      try {
        const hosts = await getHosts().catch(() => []);
        const machineList = hostArrayToEditList(hosts, lang);
        setCfg((prev) => ({ ...prev, machines: machineList }));
      } catch {}

      await refreshStatuses();
    },
    [lang]
  );

  // ajoute une machine depuis la section "détectées" (ip déjà connue)
  const addDetectedMachine = React.useCallback(
    async (entry) => {
      const ip = String(entry?.ip || '').trim();
      if (!ip) return;
      const base = Array.isArray(cfgRef.current?.machines) ? cfgRef.current.machines : [];
      if (base.some((m) => String(m?.ip || '').trim().toLowerCase() === ip.toLowerCase())) return;

      const nextMachine = {
        name: entry?.name || `Machine ${base.length + 1}`,
        color: '',
        ip,
        uproject: '',
        args: {},
        showEditor: false,
        showArgs: false,
        status: 'unknown',
        lastMsg: '',
        lastMsgType: '',
        eligible: true,
        renderEnabled: true,
        sortIndex: base.length,
        prevIp: '',
      };

      const merged = [...base, nextMachine].map((m, idx) => ({ ...m, sortIndex: idx }));
      setCfg((prev) => ({ ...prev, machines: merged }));
      cfgRef.current = { ...cfgRef.current, machines: merged };
      await reindexAndPersist(merged);
    },
    [reindexAndPersist]
  );

  // Bascule eligible/Excluded via bouton et force le sortIndex en fin de segment cible
  const toggleEligibility = React.useCallback(
    async (idxInState, toEligible) => {
      const list = Array.isArray(cfgRef.current?.machines)
        ? [...cfgRef.current.machines]
        : [];
      if (idxInState < 0 || idxInState >= list.length) return;

      const target = { ...list[idxInState], eligible: !!toEligible };
      const rest = list.filter((_, i) => i !== idxInState);

      const eligible = rest.filter((m) => m.eligible !== false);
      const excluded = rest.filter((m) => m.eligible === false);

      if (toEligible) {
        eligible.push(target);
      } else {
        excluded.push(target);
      }

      const merged = [...eligible, ...excluded].map((m, idx) => ({
        ...m,
        sortIndex: idx,
      }));

      setCfg((prev) => ({ ...prev, machines: merged }));
      cfgRef.current = { ...cfgRef.current, machines: merged };

      await reindexAndPersist(merged);
    },
    [reindexAndPersist]
  );

  const handleIpBlur = async (idx) => {
    const current =
      Array.isArray(cfgRef.current?.machines) && cfgRef.current.machines[idx]
        ? cfgRef.current.machines[idx]
        : null;
    if (!current) return;
    const ip = String(current.ip || '').trim();
    if (!ip) return;

    const prevIp = String(current.prevIp || '').trim();
    await saveArgsToServer(idx, current);

    if (prevIp && prevIp !== ip && isValidIpv4(prevIp)) {
      try {
        await deleteHost(prevIp);
      } catch {}
    }
    updateMachine(idx, { prevIp: '' });

    await reindexAndPersist(cfgRef.current?.machines || []);
  };

  const reorderWithin = async (segment, fromIdx, toIdx) => {
    let next = null;
    setCfg((prev) => {
      const list = [...prev.machines];
      const eligible = list.filter((m) => m.eligible !== false);
      const excluded = list.filter((m) => m.eligible === false);
      const arr = segment === 'eligible' ? eligible : excluded;
      if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return prev;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      const merged = [...eligible, ...excluded].map((m, idx) => ({ ...m, sortIndex: idx }));
      next = merged;
      return { ...prev, machines: merged };
    });
    if (next) await reindexAndPersist(next);
  };

  const moveBetween = async (fromSegment, toSegment, fromIdx, _toIdx = null) => {
    // Désactivé : on utilise les boutons pour changer de segment
    return;
  };

  const onDragStart = (segment, idx) => {
    dragInfo.current = { segment, idx };
  };
  const onDragOver = (e) => {
    e.preventDefault();
  };
  const onDrop = (segment, idx) => {
    const info = dragInfo.current;
    dragInfo.current = null;
    if (!info) return;
    if (info.segment === segment) {
      reorderWithin(segment, info.idx, idx);
    } else {
      moveBetween(info.segment, segment, info.idx, idx);
    }
  };

  const renderCard = (m, segment, position) => {
    const a = m.args || {};
    const presetOptions = PRESET_OPTIONS.map((p) => ({
      ...p,
      label: p.k === 'manual'
          ? t('setup.server.resPreset.manual')
        : p.label,
    }));

    const paramsOpen = !isRenderMode && !!(m.showEditor || m.showArgs);
    const toggleParams = () => {
      const next = !paramsOpen;
      updateMachine(m._idx, { showEditor: next, showArgs: next });
    };

    const usedByOthers = new Set(
      (cfg.machines || [])
        .map((other, idx) =>
          idx === m._idx ? '' : String(other.color || '').trim()
        )
        .filter(Boolean)
    );

    const currentColor = String(m.color || '').trim();
    const availableColors = MACHINE_COLORS.filter(
      (c) => c.value === currentColor || !usedByOthers.has(c.value)
    );

    const statusIsFail = m.status === 'fail';
    const statusIsWarn = m.status === 'warn';
    const cardStateClass = statusIsFail
      ? 'launch-host-invalid'
      : (statusIsWarn ? 'launch-host-warn' : '');

    return (
      <div
        key={`${segment}-${m._idx}`}
        className={`uu-card ${cardStateClass}`}
        draggable
        onDragStart={() => onDragStart(segment, position)}
        onDragEnd={() => reindexAndPersist(cfgRef.current?.machines || [])}
        onDragOver={onDragOver}
        onDrop={(e) => { e.preventDefault(); onDrop(segment, position); }}
        style={{ marginBottom: '12px' }}
      >
        <div className="uu-row">
          <span className={`uu-pastille ${colorClass(m.color)}`} />
          <input className="uu-input w-160" value={m.name||''} onChange={(e)=>updateMachine(m._idx,{name:e.target.value})} />
          <select
            className="uu-input w-160"
            value={m.color || ''}
            onChange={(e) => updateMachine(m._idx, { color: e.target.value })}
          >
            <option value="">(sans couleur)</option>
            {availableColors.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {statusDot(m.status)}
          <input
            className="uu-input w-160"
            value={m.ip}
            onChange={(e)=>updateMachine(m._idx,{ip:e.target.value})}
            onBlur={() => handleIpBlur(m._idx)}
          />

          {!isRenderMode ? (
            <button onClick={toggleParams} className="uu-btn">
              {paramsOpen
                ? t('setup.server.toggleParams.hide')
                : t('setup.server.toggleParams.show')}
            </button>
          ) : null}

          {segment === 'eligible' ? (
            <button
              onClick={() => toggleEligibility(m._idx, false)}
              className="uu-btn"
            >
              {isRenderMode ? t('setup.render.exclude') : t('setup.launchControl.exclude')}
            </button>
          ) : (
            <button
              onClick={() => toggleEligibility(m._idx, true)}
              className="uu-btn"
            >
              {isRenderMode ? t('setup.render.reinclude') : t('setup.launchControl.reinclude')}
            </button>
          )}

          <button onClick={()=>removeMachine(m._idx)} className="uu-btn">{t('common.delete')}</button>
          <span
            style={{ marginLeft: 'auto', cursor: 'grab', opacity: 0.6 }}
            title={t('setup.launchControl.dragToReorder')}
          >⋯</span>
        </div>

        {paramsOpen && (
          <>
            <div className="uu-args">
              <div className="uu-args-title">{t('setup.server.argsTitle')}</div>
            <div
              className="uu-grid-3"
              style={{ columnGap: '24px', gridTemplateColumns: '260px 260px 260px' }}
            >
              <div className="uu-grid-field">
            <label className="uu-label w-160">{t('setup.server.resPresetLabel')}</label>
                <select
                  className="uu-input"
                  value={a.resPreset || 'manual'}
                  onChange={(e) => {
                    const val = e.target.value || 'manual';
                    const preset = presetOptions.find((p) => p.k === val);
                    if (preset && preset.x && preset.y) {
                      updateMachine(m._idx, {
                        args: {
                          ...(m.args || {}),
                          resPreset: val,
                          resx: preset.x,
                          resy: preset.y,
                        },
                      });
                    } else {
                      updateMachine(m._idx, {
                        args: { ...(m.args || {}), resPreset: 'manual' },
                      });
                    }
                  }}
                >
                  {presetOptions.map((p) => (
                    <option key={p.k} value={p.k}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="uu-grid-field">
                <label className="uu-label w-160">{t('setup.server.resx')}</label>
                <input
                  type="number"
                  className="uu-input"
                  value={a.resx ?? ''}
                  disabled={a.resPreset && a.resPreset !== 'manual'}
                  onChange={(e) =>
                    updateMachine(m._idx, {
                      args: { ...(m.args || {}), resx: e.target.value, resPreset: 'manual' },
                    })
                  }
                />
              </div>
              <div className="uu-grid-field">
                <label className="uu-label w-160">{t('setup.server.resy')}</label>
                <input
                  type="number"
                  className="uu-input"
                  value={a.resy ?? ''}
                  disabled={a.resPreset && a.resPreset !== 'manual'}
                  onChange={(e) =>
                    updateMachine(m._idx, {
                      args: { ...(m.args || {}), resy: e.target.value, resPreset: 'manual' },
                    })
                  }
                />
              </div>
              <div
                className="uu-grid-3 mt-12"
                style={{ columnGap: '24px', alignItems: 'center', gridTemplateColumns: '260px 200px 200px 220px' }}
              >
                <div className="uu-grid-field">
                  <label className="uu-label w-160">{t('setup.server.frameRateLimit')}</label>
                  <select
                    className="uu-input"
                    value={a.frameRateLimit ?? ''}
                    onChange={(e) =>
                      updateMachine(m._idx, {
                        args: { ...(m.args || {}), frameRateLimit: e.target.value },
                      })
                    }
                  >
                    <option value="">{'—'}</option>
                    <option value="23.98">23.98 fps</option>
                    <option value="24">24 fps</option>
                    <option value="25">25 fps</option>
                    <option value="29.97">29.97 fps</option>
                    <option value="30">30 fps</option>
                    <option value="47.95">47.95 fps</option>
                    <option value="48">48 fps</option>
                    <option value="50">50 fps</option>
                    <option value="59.94">59.94 fps</option>
                    <option value="60">60 fps</option>
                  </select>
                </div>
                <div className="uu-grid-field">
                  <label className="uu-check" style={{ alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!a.renderOffscreen}
                      onChange={(e) =>
                        updateMachine(m._idx, { args: { ...(m.args || {}), renderOffscreen: !!e.target.checked } })
                      }
                    />
                    {t('setup.server.renderOffscreen')}
                  </label>
                </div>
                <div className="uu-grid-field">
                  <label className="uu-check" style={{ alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!a.noScreenMessages}
                      onChange={(e) =>
                        updateMachine(m._idx, { args: { ...(m.args || {}), noScreenMessages: !!e.target.checked } })
                      }
                    />
                    {t('setup.server.noScreenMessages')}
                  </label>
                </div>
              </div>
            </div>
            <div
              className="uu-grid-2 mt-12"
              style={{ gridTemplateColumns: '0.3fr 0.7fr' }}
            >
              <div className="uu-grid-field">
                <label className="uu-label w-160">{t('setup.server.videoCard')}</label>
                <select
                  className="uu-input"
                  value={a.videoCard || ''}
                  onChange={(e) =>
                    updateMachine(m._idx, {
                      args: { ...(m.args || {}), videoCard: e.target.value },
                    })
                  }
                >
                  <option value="">{t('setup.server.videoCard.none')}</option>
                  <option value="AJA">{t('setup.server.videoCard.aja')}</option>
                  <option value="BlackMagic">{t('setup.server.videoCard.blackmagic')}</option>
                </select>
              </div>
              <div className="uu-grid-field">
                <label>{t('setup.server.execCmds')}</label>
                <input
                  className="uu-input"
                  value={a.execCmds || ''}
                  onChange={(e) =>
                    updateMachine(m._idx, {
                      args: { ...(m.args || {}), execCmds: e.target.value },
                    })
                  }
                />
              </div>
            </div>
            <div className="uu-grid-field mt-8">
              <label className="uu-check" style={{ alignItems: 'center', whiteSpace: 'nowrap', width: 'max-content' }}>
                <input
                  type="checkbox"
                  checked={m.renderEnabled !== false}
                  onChange={(e) =>
                    updateMachine(m._idx, { renderEnabled: !!e.target.checked })
                  }
                />
                {t('setup.server.renderEnabled')}
              </label>
            </div>
          </div>
          </>
        )}

        {m?.lastMsg && (
          <div className={`uu-msg ${m.lastMsgType || ''} mt-8`}>
            {m.lastMsg}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="uu-page">
      <div className="uu-row-col">
        <div>
          <button onClick={addMachine} className="uu-btn">
            {t('setup.server.addMachine')}
          </button>
        </div>
      </div>

      <div className="uu-section">
        <h3 className="uu-h3 uu-block-title">
          {isRenderMode ? t('setup.server.machinesRenderEligible') : t('setup.server.machinesEligible')}
        </h3>
        {eligibleList.length === 0 ? (
          <div className="uu-muted">{t('setup.server.noEligible')}</div>
        ) : (
          eligibleList.map((m, idx) => renderCard(m, 'eligible', idx))
        )}
      </div>

      <div className="uu-section">
        <h3 className="uu-h3 uu-block-title">
          {isRenderMode ? t('setup.server.machinesRenderExcluded') : t('setup.server.machinesExcluded')}
        </h3>
        {excludedList.length === 0 ? (
          <div className="uu-muted">
            {isRenderMode ? t('setup.server.noRenderExcluded') : t('setup.server.noExcluded')}
          </div>
        ) : (
          excludedList.map((m, idx) => renderCard(m, 'excluded', idx))
        )}
      </div>

      {(() => {
        const known = new Set(
          (cfg.machines || [])
            .map((m) => String(m.ip || '').trim().toLowerCase())
            .filter(Boolean)
        );
        const unknownDetected = (detected || []).filter(
          (d) =>
            d &&
            String(d.ip || '').trim() &&
            !known.has(String(d.ip || '').trim().toLowerCase())
        );
        if (unknownDetected.length === 0) return null;
        return (
          <div className="uu-section">
            <h3 className="uu-h3 uu-block-title">{t('setup.server.detectedUnknown')}</h3>
            <div className="uu-list">
              {unknownDetected.map((d) => (
                <div key={d.ip} className="uu-card uu-row" style={{ alignItems: 'center' }}>
                  <div className="uu-col">
                    <div className="uu-item-title">{d.name || d.ip}</div>
                    <div className="uu-item-sub">{d.ip}</div>
                    {d.ts ? (
                      <div className="uu-item-sub">
                        {t('setup.server.detectedAt').replace('{ts}', d.ts)}
                      </div>
                    ) : null}
                  </div>
                  <div className="uu-col uu-actions">
                    <button className="uu-btn" onClick={() => addDetectedMachine(d)}>
                      {t('setup.server.addDetected')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

