// app/screens/setup.jsx
import React from 'react';
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
import {
  MACHINE_COLORS,
  PRESET_OPTIONS,
  RENDER_AVAILABILITY_VALUES,
  hostArrayToEditList,
  isValidIpv4,
  buildEditorsSignature,
} from './setupHelpers';
import {
  MachineArgsPanel,
  MachineCardHeaderRow,
  MachineGroupSection,
  UnknownDetectedSection,
} from './setupSections';

const EMPTY_CFG = {
  machines: [],
};

const CARD_MARGIN_BOTTOM_STYLE = { marginBottom: '12px' };
const GRID_ONE_AUTO_STYLE = { gridTemplateColumns: '1fr auto' };

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
  const clientMsgTimerRef = React.useRef(null);

  const clearClientMessage = React.useCallback(() => {
    if (clientMsgTimerRef.current) {
      clearTimeout(clientMsgTimerRef.current);
      clientMsgTimerRef.current = null;
    }
    setClientMsg('');
    setClientMsgType('');
  }, []);

  const scheduleClientMessageClear = React.useCallback((delayMs = 2500) => {
    if (clientMsgTimerRef.current) {
      clearTimeout(clientMsgTimerRef.current);
      clientMsgTimerRef.current = null;
    }
    const rawDelay = Number(delayMs);
    const timeoutMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? Math.trunc(rawDelay) : 0;
    if (timeoutMs <= 0) {
      return;
    }
    clientMsgTimerRef.current = setTimeout(() => {
      clientMsgTimerRef.current = null;
      clearClientMessage();
    }, timeoutMs);
  }, [clearClientMessage]);

  const showClientTransientMessage = React.useCallback((message, type = 'info', delayMs = 2500) => {
    const msg = String(message || '').trim();
    if (!msg) {
      clearClientMessage();
      return;
    }
    setClientMsg(msg);
    setClientMsgType(type);
    scheduleClientMessageClear(delayMs);
  }, [clearClientMessage, scheduleClientMessageClear]);

  React.useEffect(() => {
    return () => {
      if (clientMsgTimerRef.current) {
        clearTimeout(clientMsgTimerRef.current);
        clientMsgTimerRef.current = null;
      }
    };
  }, []);

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
      showClientTransientMessage(t('setup.client.msg.localIpMissing'), 'error', 2500);
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
      showClientTransientMessage(t('setup.client.msg.hostMissingOnServer'), 'error', 2500);
      return;
    }

    try {
      const r = await postHost(localIp, payload);
      const ok = r && r.ok !== false;
      if (ok) {
        lastClientSaveSigRef.current = payloadSig;
      }
      showClientTransientMessage(
        ok ? t('setup.client.msg.saveOk') : t('setup.client.msg.saveError'),
        ok ? 'ok' : 'error',
        2500
      );

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
      showClientTransientMessage(t('setup.client.msg.saveError'), 'error', 2500);
    }
  }

  async function handleClientToggleSync(e) {
  const enabled = e.target.checked;
  setClientSyncState(enabled);
  writeCachedSync(enabled);

  if (typeof onClientSyncChange === 'function') {
    onClientSyncChange(enabled);
  }

  if (!localIp) {
    showClientTransientMessage(t('setup.client.msg.localIpMissing'), 'error', 2500);
    return;
  }

  if (!clientHostExists) {
    showClientTransientMessage(t('setup.client.msg.hostMissingOnServer'), 'error', 2500);
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

    showClientTransientMessage(
      ok
        ? (enabled
            ? t('setup.client.msg.syncEnabled')
            : t('setup.client.msg.syncDisabled'))
        : t('setup.client.msg.syncUpdateError'),
      ok ? 'ok' : 'error',
      2500
    );
  } catch {
    showClientTransientMessage(t('setup.client.msg.syncUpdateError'), 'error', 2500);
  }
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
              <div className="uu-grid-2" style={GRID_ONE_AUTO_STYLE}>
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
                      showClientTransientMessage(t('setup.client.msg.browseUnavailable'), 'error', 2500);
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
  const serverMachineMsgTimers = React.useRef({});

  React.useEffect(() => {
    return () => {
      const saveTimers = serverSaveTimers.current || {};
      Object.values(saveTimers).forEach((timerId) => {
        if (timerId) clearTimeout(timerId);
      });
      serverSaveTimers.current = {};

      const msgTimers = serverMachineMsgTimers.current || {};
      Object.values(msgTimers).forEach((timerId) => {
        if (timerId) clearTimeout(timerId);
      });
      serverMachineMsgTimers.current = {};
    };
  }, []);

  React.useEffect(() => {
    (async () => {
      if (role === 'client') return; // le bloc serveur ne s'applique pas côté client
      try {
        const c = await getCommon();
        setCfg(prev => ({
          ...prev,
          rcHttpPort: c.rcHttpPort ?? prev.rcHttpPort,
          rcWsPort: c.rcWsPort ?? prev.rcWsPort,
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

  function toggleMachineParams(i, shouldOpen) {
    updateMachine(i, { showEditor: !!shouldOpen, showArgs: !!shouldOpen });
  }

  function updateMachineRenderReturnAt(i, iso) {
    updateMachine(i, { renderReturnAt: iso });
    const updated = { ...cfgRef.current?.machines?.[i], renderReturnAt: iso };
    saveArgsToServer(i, updated);
  }

  function updateMachineArgs(i, patch = {}) {
    const prevArgs = cfgRef.current?.machines?.[i]?.args || {};
    updateMachine(i, { args: { ...prevArgs, ...patch } });
  }

  function addMachine() {
    setCfg(prev => {
      const nextIndex = prev.machines.length;
      return {
        ...prev,
        machines: [
          ...prev.machines,
          {
            name: `Station ${prev.machines.length + 1}`,
            color: '',
            ip: '',
            uproject: '',
            args: {},
            showEditor: false,
            showArgs: false,
            status: 'unknown',
            lastMsg: '',
            lastMsgType: '',
            renderAvailability: 'capable',
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

  function clearMachineTransientMessage(idxInState) {
    if (!Number.isInteger(idxInState) || idxInState < 0) return;
    const timers = serverMachineMsgTimers.current || {};
    if (timers[idxInState]) {
      clearTimeout(timers[idxInState]);
      delete timers[idxInState];
    }
    serverMachineMsgTimers.current = timers;
    updateMachine(idxInState, { lastMsg: '', lastMsgType: '' });
  }

  function showMachineTransientMessage(idxInState, lastMsg, lastMsgType = 'info', clearAfterMs = 3000) {
    if (!Number.isInteger(idxInState) || idxInState < 0) return;
    updateMachine(idxInState, { lastMsg, lastMsgType });

    const timers = serverMachineMsgTimers.current || {};
    if (timers[idxInState]) {
      clearTimeout(timers[idxInState]);
      delete timers[idxInState];
    }
    const rawDelay = Number(clearAfterMs);
    const timeoutMs = Number.isFinite(rawDelay) && rawDelay >= 0 ? Math.trunc(rawDelay) : 0;
    if (timeoutMs <= 0) {
      return;
    }
    timers[idxInState] = setTimeout(() => {
      clearMachineTransientMessage(idxInState);
    }, timeoutMs);
    serverMachineMsgTimers.current = timers;
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
        showMachineTransientMessage(
          idxInState,
          t('setup.server.msg.hostIpMissing'),
          'error',
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
    const renderAvailability = (() => {
      const val = stateMatch?.renderAvailability ?? m?.renderAvailability;
      if (RENDER_AVAILABILITY_VALUES.includes(val)) return val;
      // Migration depuis les anciens champs
      if (stateMatch?.eligible === false || m?.eligible === false) return 'excluded';
      return 'capable';
    })();
    const renderReturnAt = renderAvailability === 'busy'
      ? (typeof (stateMatch?.renderReturnAt ?? m?.renderReturnAt) === 'string'
          ? (stateMatch?.renderReturnAt ?? m?.renderReturnAt) || null
          : null)
      : null;
    const payload = {
      ip,
      name: String(stateMatch.name ?? m.name ?? '').trim(),
      color: String(stateMatch.color ?? m.color ?? '').trim(),
      args,
      renderAvailability,
      renderReturnAt,
      sortIndex: Number.isFinite(sortIndex) ? sortIndex : undefined,
    };

    const r = await postHost(ip, payload);
    const ok = r && r.ok !== false;
    if (idxInState >= 0) {
      showMachineTransientMessage(
        idxInState,
        ok
          ? t('setup.server.msg.hostSaved')
          : t('setup.server.msg.hostSaveError'),
        ok ? 'ok' : 'error',
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

  const presetOptions = React.useMemo(() => (
    PRESET_OPTIONS.map((preset) => ({
      ...preset,
      label: preset.k === 'manual' ? t('setup.server.resPreset.manual') : preset.label,
    }))
  ), [t]);
  const { capableList, excludedList } = React.useMemo(() => {
    const capable = [];
    const excluded = [];
    for (let idx = 0; idx < (cfg.machines || []).length; idx += 1) {
      const machine = cfg.machines[idx];
      const entry = { ...machine, _idx: idx };
      if (machine?.renderAvailability === 'excluded') excluded.push(entry);
      else capable.push(entry);
    }
    return { capableList: capable, excludedList: excluded };
  }, [cfg.machines]);
  const machineColorUsageCounts = React.useMemo(() => {
    const counts = new Map();
    for (const machine of (cfg.machines || [])) {
      const color = String(machine?.color || '').trim();
      if (!color) continue;
      counts.set(color, (counts.get(color) || 0) + 1);
    }
    return counts;
  }, [cfg.machines]);
  const unknownDetected = React.useMemo(() => {
    const known = new Set(
      (cfg.machines || [])
        .map((machine) => String(machine.ip || '').trim().toLowerCase())
        .filter(Boolean)
    );
    return (detected || []).filter(
      (entry) =>
        entry &&
        String(entry.ip || '').trim() &&
        !known.has(String(entry.ip || '').trim().toLowerCase())
    );
  }, [cfg.machines, detected]);

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
          const vmAvail = RENDER_AVAILABILITY_VALUES.includes(vm.renderAvailability) ? vm.renderAvailability : 'capable';
          await postHost(ip, {
            ip,
            name: String(vm.name || '').trim(),
            color: String(vm.color || '').trim(),
            args: normalizeArgsForServer(vm.args || {}),
            renderAvailability: vmAvail,
            renderReturnAt: vmAvail === 'busy'
              ? (typeof vm.renderReturnAt === 'string' ? vm.renderReturnAt || null : null)
              : null,
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
        name: entry?.name || `Station ${base.length + 1}`,
        color: '',
        ip,
        uproject: '',
        args: {},
        showEditor: false,
        showArgs: false,
        status: 'unknown',
        lastMsg: '',
        lastMsgType: '',
        renderAvailability: 'capable',
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

  // Change renderAvailability d'une machine et force le sortIndex en fin de segment cible
  const setRenderAvailability = React.useCallback(
    async (idxInState, avail) => {
      if (!RENDER_AVAILABILITY_VALUES.includes(avail)) return;
      const list = Array.isArray(cfgRef.current?.machines)
        ? [...cfgRef.current.machines]
        : [];
      if (idxInState < 0 || idxInState >= list.length) return;

      const target = {
        ...list[idxInState],
        renderAvailability: avail,
        renderReturnAt: avail === 'busy' ? (list[idxInState]?.renderReturnAt || null) : null,
      };
      const rest = list.filter((_, i) => i !== idxInState);

      const capable = rest.filter((m) => m.renderAvailability !== 'excluded');
      const excluded = rest.filter((m) => m.renderAvailability === 'excluded');

      const merged = avail === 'excluded'
        ? [...capable, ...excluded, target]
        : [...capable, target, ...excluded];

      const reindexed = merged.map((m, idx) => ({ ...m, sortIndex: idx }));

      setCfg((prev) => ({ ...prev, machines: reindexed }));
      cfgRef.current = { ...cfgRef.current, machines: reindexed };

      await reindexAndPersist(reindexed);
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
      const capable = list.filter((m) => m.renderAvailability !== 'excluded');
      const excluded = list.filter((m) => m.renderAvailability === 'excluded');
      const arr = segment === 'capable' ? capable : excluded;
      if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return prev;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      const merged = [...capable, ...excluded].map((m, idx) => ({ ...m, sortIndex: idx }));
      next = merged;
      return { ...prev, machines: merged };
    });
    if (next) await reindexAndPersist(next);
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
    if (info.segment !== segment) return;
    reorderWithin(segment, info.idx, idx);
  };
  const onCardDragEnd = React.useCallback(() => {
    reindexAndPersist(cfgRef.current?.machines || []);
  }, [reindexAndPersist]);

  const renderCard = (m, segment, position) => {
    const a = m.args || {};

    const paramsOpen = !isRenderMode && !!(m.showEditor || m.showArgs);

    const currentColor = String(m.color || '').trim();
    const availableColors = MACHINE_COLORS.filter(
      (c) => c.value === currentColor || !machineColorUsageCounts.has(c.value)
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
        onDragEnd={onCardDragEnd}
        onDragOver={onDragOver}
        onDrop={(e) => { e.preventDefault(); onDrop(segment, position); }}
        style={CARD_MARGIN_BOTTOM_STYLE}
      >
        <MachineCardHeaderRow
          machine={m}
          machineIndex={m._idx}
          t={t}
          statusDot={statusDot}
          availableColors={availableColors}
          isRenderMode={isRenderMode}
          paramsOpen={paramsOpen}
          onToggleParams={toggleMachineParams}
          segment={segment}
          updateMachine={updateMachine}
          onSetRenderAvailability={setRenderAvailability}
          onRemoveMachine={removeMachine}
          onIpBlur={handleIpBlur}
          onRenderReturnAtChange={updateMachineRenderReturnAt}
        />

        {paramsOpen ? (
          <MachineArgsPanel
            machine={m}
            args={a}
            t={t}
            presetOptions={presetOptions}
            updateMachineArgs={updateMachineArgs}
          />
        ) : null}

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

      <MachineGroupSection
        title={isRenderMode ? t('setup.server.machinesRenderEligible') : t('setup.server.machinesEligible')}
        emptyText={t('setup.server.noEligible')}
        list={capableList}
        segment="capable"
        renderCard={renderCard}
      />

      <MachineGroupSection
        title={isRenderMode ? t('setup.server.machinesRenderExcluded') : t('setup.server.machinesExcluded')}
        emptyText={isRenderMode ? t('setup.server.noRenderExcluded') : t('setup.server.noExcluded')}
        list={excludedList}
        segment="excluded"
        renderCard={renderCard}
      />

      <UnknownDetectedSection
        t={t}
        unknownDetected={unknownDetected}
        addDetectedMachine={addDetectedMachine}
      />
    </div>
  );
}


