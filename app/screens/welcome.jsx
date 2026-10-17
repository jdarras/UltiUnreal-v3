// app/screens/welcome.jsx
import React from 'react';
import { pingLocalAgent, postCommonAtPort } from '../utils/agent';
import { readIdentity, writeIdentity, LS_IDENTITY } from '../utils/identity';
import { createT } from '../i18n';
import appIcon from '../assets/icon.png';

const LOCAL_IP_MANUAL = '__manual__';
const APP_MODE_LIVE = 'live';
const APP_MODE_POSTPROD = 'postprod';
const DEFAULT_AGENT_PORT = '4000';
const LOCKED_MODE_ROW_STYLE = { gap: '8px', flexWrap: 'wrap' };
const LOCAL_IP_ROW_STYLE = { flex: 1, minWidth: 0 };
const LOCAL_IP_INPUT_STYLE = { flex: 1, minWidth: 160 };

function normalizeMode(mode) {
  return String(mode || '').trim().toLowerCase() === APP_MODE_POSTPROD
    ? APP_MODE_POSTPROD
    : APP_MODE_LIVE;
}

function resolveAgentPortDefault(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return DEFAULT_AGENT_PORT;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) return DEFAULT_AGENT_PORT;
  return String(n);
}

export default function WelcomeScreen({
  onContinue,
  appVersion = '',
  modeAccess = null,
  currentUser = null,
}) {
  // Charger identité sauvegardée (via helper identity.js)
  const savedIdentity = React.useMemo(() => readIdentity() || {}, []);
  const [identity, setIdentity] = React.useState(() => {
    const saved = savedIdentity || {};
    return {
      lang: saved.lang || 'fr',
      mode: normalizeMode(saved.mode),
      role: String(saved.role || '').trim().toLowerCase() === 'client' ? 'client' : 'server',
      localIp: saved.localIp || '',
      serverIp: saved.serverIp || '',
      agentPort: resolveAgentPortDefault(saved.agentPort),
      localIpChoice: saved.localIpChoice || '',
    };
  });

  const lang = identity.lang || 'fr';
  const t = React.useMemo(() => createT(lang), [lang]);
  const canUseLiveMode = modeAccess && typeof modeAccess === 'object'
    ? modeAccess.canUseLive !== false
    : true;
  const canUsePostprodMode = modeAccess && typeof modeAccess === 'object'
    ? modeAccess.canUsePostprod !== false
    : true;
  const canChooseMode = modeAccess && typeof modeAccess === 'object'
    ? modeAccess.canChooseMode !== false
    : true;
  const forcedModeRaw = modeAccess && typeof modeAccess === 'object'
    ? String(modeAccess.forcedMode || '').trim().toLowerCase()
    : '';
  const forcedMode = forcedModeRaw === APP_MODE_LIVE || forcedModeRaw === APP_MODE_POSTPROD
    ? forcedModeRaw
    : null;
  const normalizedMode = normalizeMode(identity.mode);
  const effectiveMode = forcedMode || normalizedMode;
  const selectedRole = String(identity.role || '').trim().toLowerCase() === 'client' ? 'client' : 'server';
  const showServerIpInput = effectiveMode === APP_MODE_LIVE && selectedRole === 'client';
  const currentRoleName = String(currentUser?.role || '').trim();

  // message sous les boutons
  const [msg, setMsg] = React.useState('');
  const [msgKind, setMsgKind] = React.useState('info'); // 'info' | 'error' | 'ok'
  const [busy, setBusy] = React.useState(false);
  const [localIpOptions, setLocalIpOptions] = React.useState([]);
  const [localIpChoice, setLocalIpChoice] = React.useState(identity.localIpChoice || '');
  const [localIpChoiceTouched, setLocalIpChoiceTouched] = React.useState(false);
  const [manualIp, setManualIp] = React.useState(() => String(savedIdentity?.localIp || ''));
  const effectiveLocalIpChoice = localIpChoice || LOCAL_IP_MANUAL;
  const resolvedLocalIpChoice = localIpOptions.includes(effectiveLocalIpChoice)
    ? effectiveLocalIpChoice
    : LOCAL_IP_MANUAL;

  // remount léger si besoin
  const [resetTick, setResetTick] = React.useState(0);

  // refs pour focus
  const localIpSelectRef = React.useRef(null);
  const localIpManualRef = React.useRef(null);
  const serverIpRef = React.useRef(null);
  const agentPortRef = React.useRef(null);
  const msgTimerRef = React.useRef(null);

  const clearMsg = React.useCallback(() => {
    if (msgTimerRef.current) {
      clearTimeout(msgTimerRef.current);
      msgTimerRef.current = null;
    }
    setMsg('');
    setMsgKind('info');
  }, []);

  const showMsg = React.useCallback((text, kind = 'info', clearAfterMs = 0) => {
    if (msgTimerRef.current) {
      clearTimeout(msgTimerRef.current);
      msgTimerRef.current = null;
    }
    const message = String(text || '');
    const level = String(kind || 'info');
    setMsg(message);
    setMsgKind(level);
    const delay = Number(clearAfterMs);
    const timeoutMs = Number.isFinite(delay) && delay > 0 ? Math.trunc(delay) : 0;
    if (!message || timeoutMs <= 0) return;
    msgTimerRef.current = setTimeout(() => {
      msgTimerRef.current = null;
      setMsg('');
      setMsgKind('info');
    }, timeoutMs);
  }, []);

  // Sauvegarde locale (uu_identity via helper)
  const saveIdentity = React.useCallback((patch) => {
    setIdentity(prev => {
      const merged = { ...prev, ...patch };
      writeIdentity(merged);
      clearMsg();
      return merged;
    });
  }, [clearMsg]);

  React.useEffect(() => {
    return () => {
      if (msgTimerRef.current) {
        clearTimeout(msgTimerRef.current);
        msgTimerRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    const raw = String(identity.agentPort ?? '').trim();
    if (raw) return;
    saveIdentity({ agentPort: DEFAULT_AGENT_PORT });
  }, [identity.agentPort, saveIdentity]);

  React.useEffect(() => {
    if (canChooseMode || !forcedMode) return;
    if (normalizeMode(identity.mode) === forcedMode) return;
    saveIdentity({ mode: forcedMode, role: 'server', serverIp: '' });
  }, [canChooseMode, forcedMode, identity.mode, saveIdentity]);

  React.useEffect(() => {
    if (effectiveMode !== APP_MODE_POSTPROD) return;
    const currentRole = String(identity.role || '').trim().toLowerCase() === 'client' ? 'client' : 'server';
    const currentServerIp = String(identity.serverIp || '').trim();
    if (currentRole !== 'server' || currentServerIp) {
      saveIdentity({ role: 'server', serverIp: '' });
    }
  }, [effectiveMode, identity.role, identity.serverIp, saveIdentity]);

  function focusLocalIp() {
    if (resolvedLocalIpChoice === LOCAL_IP_MANUAL) {
      localIpManualRef.current?.focus();
      if (!localIpManualRef.current) {
        localIpSelectRef.current?.focus();
      }
      return;
    }
    localIpSelectRef.current?.focus();
  }

  function focusServerIp() {
    serverIpRef.current?.focus();
  }

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const getLocalIps = window.electron?.getLocalIps;
      if (!getLocalIps) return;
      try {
        const res = await getLocalIps({ mode: 'ethernet' });
        const list = Array.isArray(res)
          ? res.map((ip) => String(ip || '').trim()).filter(Boolean)
          : [];
        if (cancelled) return;
        setLocalIpOptions(list);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!localIpChoiceTouched) {
      if (identity.localIp && localIpOptions.includes(identity.localIp)) {
        setLocalIpChoice(identity.localIp);
        return;
      }
      if (!identity.localIp && localIpOptions.length === 1) {
        const ip = localIpOptions[0];
        setLocalIpChoice(ip);
        saveIdentity({ localIp: ip });
        return;
      }
      if (!localIpChoice) {
        setLocalIpChoice(LOCAL_IP_MANUAL);
        if (identity.localIp && !localIpOptions.includes(identity.localIp)) {
          setManualIp(identity.localIp);
        }
        return;
      }
    }
    if (localIpChoice && localIpChoice !== LOCAL_IP_MANUAL && !localIpOptions.includes(localIpChoice)) {
      if (!localIpChoiceTouched && localIpOptions.length === 1) {
        const ip = localIpOptions[0];
        setLocalIpChoice(ip);
        saveIdentity({ localIp: ip });
      } else {
        setLocalIpChoice(LOCAL_IP_MANUAL);
        if (identity.localIp) setManualIp(identity.localIp);
      }
    }
  }, [identity.localIp, localIpChoice, localIpChoiceTouched, localIpOptions, saveIdentity]);

  // Continuer (pas d'alert : messages inline)
  async function handleContinue() {
    if (busy) return;
    const mode = effectiveMode;
    const effectiveRole = mode === APP_MODE_LIVE
      ? selectedRole
      : 'server';
    const desired = String(identity.agentPort || '').trim();
    const locIp = String(identity.localIp || '').trim();
    const srvIp = effectiveRole === 'client' ? String(identity.serverIp || '').trim() : '';
    if (!locIp) {
      showMsg(t('welcome.validation.localIpRequired'), 'error');
      focusLocalIp();
      return;
    }
    if (!isValidHost(locIp)) {
      showMsg(t('welcome.validation.localIpInvalid'), 'error');
      focusLocalIp();
      return;
    }
    if (effectiveRole === 'client' && !srvIp) {
      showMsg(t('welcome.validation.serverIpRequired'), 'error');
      focusServerIp();
      return;
    }
    if (effectiveRole === 'client' && !isValidHost(srvIp)) {
      showMsg(t('welcome.validation.serverIpInvalid'), 'error');
      focusServerIp();
      return;
    }
    if (!desired) {
      showMsg(t('welcome.validation.agentPortRequired'), 'error');
      agentPortRef.current?.focus();
      return;
    }
    if (!isValidPort(desired)) {
      showMsg(t('welcome.validation.agentPortRequired'), 'error');
      agentPortRef.current?.focus();
      return;
    }

    try {
      setBusy(true);
      // 1) Lancer l’agent sur le port saisi (si bridge présent)
      if (window.electron?.startAgent) {
        await window.electron.startAgent(desired);
      }

      // 2) Attendre qu’il réponde (~4s max), via agent.js
      let ok = false;
      for (let i = 0; i < 30; i++) { // ~6s max
        const r = await pingLocalAgent(desired); // -> { ok:true,... } ou { ok:false }
        if (r && r.ok !== false) { ok = true; break; }
        await new Promise((r) => setTimeout(r, 200));
      }

      if (!ok) {
        showMsg(
          t('welcome.msg.agentNotFound').replace('{target}', String(desired)),
          'error'
        );
        setBusy(false);
        return;
      }

      // 3) On pousse le port au serveur sur /agent/common le cas échéant
      if (effectiveRole === 'server') {
        const res = await postCommonAtPort(desired, {
          agentPort: Number(desired),
        });

        if (!res || res.ok === false) {
          const msg = (res && (res.message || res.error)) || '';
          console.error('postCommonAtPort error', msg || res);

          const MainOk = res && res.mainOk !== false;
          if (!MainOk) {
            showMsg(t('welcome.msg.writeCommonFailed'), 'error');
            return;
          }
        }
      }

      showMsg(t('welcome.msg.ok'), 'ok', 1800);
      if (onContinue) {
        await onContinue({
          ...identity,
          mode,
          role: effectiveRole,
          serverIp: srvIp,
        });
      }
    } catch (e) {
      const details = e?.message || e;
      showMsg(
        t('welcome.msg.errorWithDetails').replace(
          '{details}',
          String(details)
        ),
        'error'
      );
    } finally {
      setBusy(false);
    }
  }

  // Réinitialiser — on efface la clé et on repart sur un objet vide
  function handleReset() {
    const resetMode = forcedMode || APP_MODE_LIVE;
    localStorage.removeItem(LS_IDENTITY);
    setIdentity({
      lang: identity.lang || 'fr',
      mode: resetMode,
      role: 'server',
      localIp: '',
      serverIp: '',
      agentPort: DEFAULT_AGENT_PORT,
      localIpChoice: '',
    });
    setManualIp('');
    setLocalIpChoice(LOCAL_IP_MANUAL);
    setLocalIpChoiceTouched(false);
    setResetTick(t => t + 1);
    showMsg(t('welcome.msg.resetDone'), 'info', 1800);

    // refocus doux
    setTimeout(() => {
      localIpSelectRef.current?.focus() || agentPortRef.current?.focus();
    }, 0);
  }

  // ---- UI : mise en page inchangée ----
  return (
    <div key={resetTick} className="welcome-root">
      <div className="card welcome-card">
        <h1 className="uu-title welcome-title">
          <span className="welcome-title-line">
            <img src={appIcon} alt="" className="welcome-logo" />
            <span className="welcome-title-main">
              UltiUnreal
              {appVersion ? <span className="welcome-version">v{appVersion}</span> : null}
            </span>
          </span>
        </h1>

        <h2 className="welcome-section-title uu-block-title">
          {t('welcome.section.machine')}
        </h2>

        <div className="welcome-grid">
          {/* Sélecteur de mode (uniquement si autorisé aux 2 modes) */}
          <div className="welcome-row uu-row-nowrap">
            <label className="uu-label w-160">{t('welcome.mode.label')}</label>
            {canChooseMode && canUseLiveMode && canUsePostprodMode ? (
              <div className="uu-chip-group">
                <button
                  type="button"
                  className={`uu-chip lvl-info ${effectiveMode === APP_MODE_LIVE ? 'chip-on' : 'chip-off'}`}
                  onClick={() => saveIdentity({ mode: APP_MODE_LIVE })}
                  disabled={busy}
                >
                  {t('welcome.mode.live')}
                </button>
                <button
                  type="button"
                  className={`uu-chip lvl-info ${effectiveMode === APP_MODE_POSTPROD ? 'chip-on' : 'chip-off'}`}
                  onClick={() => saveIdentity({
                    mode: APP_MODE_POSTPROD,
                    role: 'server',
                    serverIp: '',
                  })}
                  disabled={busy}
                >
                  {t('welcome.mode.postprod')}
                </button>
              </div>
            ) : (
              <div className="uu-row" style={LOCKED_MODE_ROW_STYLE}>
                <span className="uu-chip lvl-info chip-on">
                  {effectiveMode === APP_MODE_POSTPROD ? t('welcome.mode.postprod') : t('welcome.mode.live')}
                </span>
                <span className="uu-muted">
                  {t('welcome.mode.locked')}
                  {currentRoleName ? ` (${currentRoleName})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Role Live uniquement */}
          {effectiveMode === APP_MODE_LIVE ? (
            <div className="welcome-row uu-row-nowrap">
              <label className="uu-label w-160">{t('welcome.role.label')}</label>
              <select
                className="uu-input"
                value={selectedRole}
                onChange={(e) => {
                  const nextRole = e.target.value === 'client' ? 'client' : 'server';
                  saveIdentity({
                    role: nextRole,
                    ...(nextRole === 'server' ? { serverIp: '' } : {}),
                  });
                }}
                disabled={busy}
              >
                <option value="server">{t('welcome.role.server')}</option>
                <option value="client">{t('welcome.role.client')}</option>
              </select>
            </div>
          ) : null}

          {showServerIpInput ? (
            <div className="welcome-row uu-row-nowrap">
              <label className="uu-label w-160">{t('welcome.serverIp.label')}</label>
              <input
                ref={serverIpRef}
                className="uu-input"
                type="text"
                placeholder={t('welcome.serverIp.placeholder')}
                value={identity.serverIp || ''}
                onChange={(e) => saveIdentity({ serverIp: e.target.value })}
                disabled={busy}
              />
            </div>
          ) : null}

          {/* IP locale */}
          <div className="welcome-row uu-row-nowrap">
            <label className="uu-label w-160">{t('welcome.localIp.label')}</label>
            <div className="uu-row uu-row-nowrap" style={LOCAL_IP_ROW_STYLE}>
              <select
                ref={localIpSelectRef}
                className="uu-input"
                value={resolvedLocalIpChoice}
                onChange={(e) => {
                  const next = e.target.value;
                  setLocalIpChoice(next);
                  setLocalIpChoiceTouched(true);
                  if (next === LOCAL_IP_MANUAL) {
                    const fallback = manualIp || identity.localIp || '';
                    if (!manualIp && fallback) {
                      setManualIp(fallback);
                    }
                    saveIdentity({ localIp: fallback, localIpChoice: LOCAL_IP_MANUAL });
                    return;
                  }
                  saveIdentity({ localIp: next, localIpChoice: next });
                }}
                disabled={busy}
                style={LOCAL_IP_INPUT_STYLE}
              >
                {localIpOptions.map((ip) => (
                  <option key={ip} value={ip}>{ip}</option>
                ))}
                <option value={LOCAL_IP_MANUAL}>{t('welcome.localIp.manual')}</option>
              </select>

              {resolvedLocalIpChoice === LOCAL_IP_MANUAL && (
                <input
                  ref={localIpManualRef}
                  className="uu-input"
                  type="text"
                  placeholder=""
                  value={manualIp}
                  onChange={(e) => {
                    const next = e.target.value;
                    setManualIp(next);
                    setLocalIpChoice(LOCAL_IP_MANUAL);
                    setLocalIpChoiceTouched(true);
                    saveIdentity({ localIp: next, localIpChoice: LOCAL_IP_MANUAL });
                  }}
                  disabled={busy}
                  style={LOCAL_IP_INPUT_STYLE}
                />
              )}
            </div>
          </div>


          {/* Agent Port — toujours visible */}
          <div className="welcome-row uu-row-nowrap">
            <label className="uu-label w-160">{t('welcome.agentPort.label')}</label>
          <input
            ref={agentPortRef}
            className="uu-input"
            type="number"
            min={1}
            placeholder=""
            value={identity.agentPort || ''}
            onChange={(e) => saveIdentity({ agentPort: e.target.value })}
            disabled={busy}
          />
        </div>


          {/* Boutons + message inline */}
          <div className="welcome-row">
            <button className="uu-btn" onClick={handleContinue} disabled={busy}>
              {busy ? '...' : t('common.continue')}
            </button>
            <button className="uu-btn" onClick={handleReset} disabled={busy}>
              {t('common.reset')}
            </button>
            {msg ? <div className={`uu-msg ${msgKind}`}>{msg}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
  const isValidPort = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 && n <= 65535;
  };

  const isValidHost = (s) => {
    const v = String(s || '').trim();
    if (!v) return false;
    // IPv4 simple
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(v);
    if (m) {
      return m.slice(1).every((x) => {
        const n = Number(x);
        return Number.isInteger(n) && n >= 0 && n <= 255;
      });
    }
    // hostname basique (lettres/chiffres/.-)
    return /^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(v);
  };
