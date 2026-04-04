// app/screens/launchcontrol.jsx
import React from 'react';
import {
  getHosts,
  getProjects,
  getLayout,
  postLaunch,
  postStop,
  getOnlineMap,
  getCommon,
  postCommon,
  checkSync,
  logWidgetAction,
  wrcGetPreset,
} from '../utils/agent';
import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';
import { NoticeContext } from '../NoticeContext';

function sortHosts(list, locale = 'fr') {
  const collator = new Intl.Collator(locale || 'fr', { numeric: true, sensitivity: 'base' });
  return [...(Array.isArray(list) ? list : [])]
    .filter((h) => h && h.eligible !== false)
    .sort((a, b) => {
      const ai = Number(a?.sortIndex);
      const bi = Number(b?.sortIndex);
      const hasAi = Number.isFinite(ai);
      const hasBi = Number.isFinite(bi);
      if (hasAi && hasBi && ai !== bi) return ai - bi;
      if (hasAi && !hasBi) return -1;
      if (!hasAi && hasBi) return 1;

      const na = String(a?.name || '').trim();
      const nb = String(b?.name || '').trim();
      if (na && nb) {
        const c = collator.compare(na, nb);
        if (c !== 0) return c;
      } else if (na) {
        return -1;
      } else if (nb) {
        return 1;
      }
      return collator.compare(String(a?.ip || ''), String(b?.ip || ''));
    });
}

function buildHostsSignature(list) {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((h) => {
      const ip = String(h?.ip || '').trim();
      const name = String(h?.name || '').trim();
      const color = String(h?.color || '').trim();
      const uproject = String(h?.uproject || '').trim();
      const syncRoot = String(h?.syncRoot || '').trim();
      const eligible = h?.eligible === false ? '0' : '1';
      const syncEnabled = h?.syncEnabled ? '1' : '0';
      const sortIndexRaw = Number(h?.sortIndex);
      const sortIndex = Number.isFinite(sortIndexRaw) ? String(sortIndexRaw) : '';
      return `${ip}|${name}|${color}|${uproject}|${syncRoot}|${eligible}|${syncEnabled}|${sortIndex}`;
    })
    .sort()
    .join('||');
}

function buildProjectsSignature(payload) {
  const activeId = String(payload?.activeId || '').trim();
  const activeName = String(payload?.activeName || '').trim();

  const projectsSig = (Array.isArray(payload?.projects) ? payload.projects : [])
    .map((project) => {
      const id = String(project?.id || '').trim();
      const name = String(project?.name || '').trim();
      const uproject = String(project?.uproject || '').trim();
      const projectPath = String(project?.projectPath || '').trim();
      const pathValue = String(project?.path || '').trim();
      const engineVersion = String(project?.engineVersion || '').trim();
      return `${id}|${name}|${uproject}|${projectPath}|${pathValue}|${engineVersion}`;
    })
    .sort()
    .join('||');

  const activeByHost = payload?.activeByHost && typeof payload.activeByHost === 'object'
    ? payload.activeByHost
    : {};
  const activeByHostSig = Object.entries(activeByHost)
    .map(([ip, mapping]) => {
      const mapObj = mapping && typeof mapping === 'object' ? mapping : {};
      const mappingSig = Object.entries(mapObj)
        .map(([projectId, up]) => `${String(projectId || '').trim()}:${String(up || '').trim()}`)
        .sort()
        .join(',');
      return `${String(ip || '').trim()}=>${mappingSig}`;
    })
    .sort()
    .join('||');

  return `${activeId}|${activeName}|${projectsSig}|${activeByHostSig}`;
}

export default function LaunchControlScreen({ isVisible = true }) {
  const [hosts, setHosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState({}); // { [ip]: true }
  const [projectsData, setProjectsData] = React.useState({ activeName:'', activeId:'', projects:[], activeByHost:{} });
  const [onlineMap, setOnlineMap] = React.useState({});
  const [syncStatusMap, setSyncStatusMap] = React.useState({});
  const [refreshSec, setRefreshSec] = React.useState(5);
  const [launchMode, setLaunchMode] = React.useState('production'); // 'production' | 'integration'
  const [useStartLayout, setUseStartLayout] = React.useState(false);
  const [hasStartLayout, setHasStartLayout] = React.useState(false);
  const [showUeLaunch, setShowUeLaunch] = React.useState(false);
  const [allowStartDesynced, setAllowStartDesynced] = React.useState(false);
  const [ueVersions, setUeVersions] = React.useState([]); // ['5.7', ...]
  const [rcHttpPort, setRcHttpPort] = React.useState(30010);
  const [statusMsg, setStatusMsg] = React.useState('');
  const wrcProbeCancelRef = React.useRef(false);
  const [wrcReadyTick, setWrcReadyTick] = React.useState(0); // incrément à chaque connexion WRC
  const wrcAttemptsRef = React.useRef(0);
  const wrcProbeTimerRef = React.useRef(null);
  const startLayoutSendInProgressRef = React.useRef(false);
  const lastStartLayoutSigRef = React.useRef('');
  const startLayoutTimerRef = React.useRef(null);
  const startRequestedRef = React.useRef(false);
  const quickRefreshTimerRef = React.useRef(null);
  const quickRefreshPendingRef = React.useRef(false);
  const sortVersions = React.useCallback((list = []) => {
    return [...list].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, []);
  const editActiveProject = React.useCallback(() => {
    const pid = String(projectsData?.activeId || '').trim();
    if (!pid) return;
    if (window.goToProjectDetail) {
      window.goToProjectDetail(pid);
    }
  }, [projectsData]);
  const id = React.useMemo(readIdentity, []);
  const localIp = String(id?.localIp || '').trim();
  const lang = String(id.lang || 'fr').trim();
  const t = React.useMemo(() => createT(lang), [lang]);
  const sortLocale = lang || 'fr';
  const noticeApi = React.useContext(NoticeContext);

  const projectsDataRef = React.useRef(projectsData);
  const syncStatusRef = React.useRef(syncStatusMap);
  const commonCfgRef = React.useRef({});
  const rcHttpPortRef = React.useRef(rcHttpPort);
  const refreshSecRef = React.useRef(refreshSec);
  const useStartLayoutRef = React.useRef(useStartLayout);
  const hasStartLayoutRef = React.useRef(hasStartLayout);
  const wrcReadyRef = React.useRef(false);
  const setQuietModeFlag = React.useCallback(async (enabled) => {
    try {
      await postCommon({ quietMode: !!enabled });
    } catch {
      // silencieux : ne bloque pas l'action
    }
  }, []);
  const hostsRef = React.useRef(hosts);
  const hostsSigRef = React.useRef('');
  const projSigRef = React.useRef('');
  const startWrcProbeRef = React.useRef(null);

  React.useEffect(() => {
    projectsDataRef.current = projectsData;
  }, [projectsData]);
  React.useEffect(() => {
    syncStatusRef.current = syncStatusMap;
  }, [syncStatusMap]);
  React.useEffect(() => {
    rcHttpPortRef.current = rcHttpPort;
  }, [rcHttpPort]);
  React.useEffect(() => {
    refreshSecRef.current = refreshSec;
  }, [refreshSec]);
  React.useEffect(() => {
    useStartLayoutRef.current = useStartLayout;
  }, [useStartLayout]);
  React.useEffect(() => {
    hasStartLayoutRef.current = hasStartLayout;
  }, [hasStartLayout]);
  React.useEffect(() => {
    if (!statusMsg) return;
    const timer = setTimeout(() => setStatusMsg(''), 5000);
    return () => clearTimeout(timer);
  }, [statusMsg]);

  React.useEffect(() => {
    if (!noticeApi) return;
    if (error) {
      noticeApi.showNotice?.(error, 'error');
      return;
    }
    if (statusMsg) {
      noticeApi.showNotice?.(statusMsg, 'ok');
      return;
    }
    // on ne nettoie pas la notice pour conserver la bannière globale visible
  }, [error, statusMsg, noticeApi]);

  React.useEffect(() => {
    hostsRef.current = hosts;
  }, [hosts]);

  // -- Boucle dédiée de tentative WRC toutes les ~3s tant que non prêt --
  const resolveWrcTarget = React.useCallback(() => {
    const hlist = hostsRef.current || [];
    const activeProjects = projectsDataRef.current || {};
    const activeId = String(activeProjects.activeId || '').trim();
    const activeName = String(activeProjects.activeName || '').trim();
    const arr = Array.isArray(activeProjects.projects) ? activeProjects.projects : [];
    const activeProject =
      arr.find((p) => activeId && String(p?.id || '').trim() === activeId) ||
      arr.find(
        (p) =>
          activeName &&
          String(p?.name || '').trim().toLowerCase() === activeName.toLowerCase()
      ) ||
      null;

    const localIp = String(readIdentity()?.localIp || '').trim();
    const server = hlist.find((h) => localIp && h?.ip === localIp) || hlist[0] || {};

    const ip = server?.ip || localIp || '127.0.0.1';
    const port = Number(rcHttpPortRef.current || 30010);
    const preset =
      String(activeProject?.wrcName || '').trim() ||
      String(commonCfgRef.current?.webRemoteControlName || '').trim() ||
      'RemoteControlPreset';

    return { ip, port, preset };
  }, []);

  const emitStartLayoutLog = React.useCallback((event = {}) => {
    const payload = event && typeof event === 'object' ? event : {};
    const lvl = String(payload.level || '').trim().toLowerCase();
    const level = ['success', 'info', 'warn', 'error', 'debug'].includes(lvl)
      ? lvl
      : 'info';
    const action = String(payload.action || 'start_layout').trim() || 'start_layout';
    const message = String(payload.message || '').trim() || action;
    const value = payload.value && typeof payload.value === 'object' ? payload.value : {};
    const targets = Array.isArray(payload.targets) ? payload.targets : [];

    // fire-and-forget: la télémétrie ne doit jamais bloquer l'UI
    logWidgetAction({
      level,
      action,
      scope: 'launch_control',
      message,
      value,
      targets,
    });
  }, []);

  // Lance la boucle de sondes WRC (délai et nombre d'essais configurables)
  const startWrcProbe = React.useCallback(() => {
    if (launchMode !== 'production') return;
    wrcProbeCancelRef.current = false;
    if (wrcProbeTimerRef.current) {
      clearTimeout(wrcProbeTimerRef.current);
      wrcProbeTimerRef.current = null;
    }

    const maxAttempts = Math.max(1, Number(commonCfgRef.current?.wrcMaxAttempts || 10));
    const retryDelayMs = Math.max(500, Number(commonCfgRef.current?.wrcRetryDelaySec || 3) * 1000);

    const probe = async (attempt = 1) => {
      if (!startRequestedRef.current) return;
      if (launchMode !== 'production') return;
      if (wrcProbeCancelRef.current || wrcReadyRef.current) return;
      wrcAttemptsRef.current = attempt;
      if (attempt > maxAttempts) {
        const target = resolveWrcTarget();
        emitStartLayoutLog({
          level: 'warn',
          action: 'start_layout_probe',
          message: t('launch.logs.startLayout.probeExhausted'),
          value: {
            attempt,
            maxAttempts,
            ok: false,
            error: 'max_attempts_reached',
            durationMs: 0,
            target: {
              ip: String(target?.ip || ''),
              port: Number(target?.port || 0),
              preset: String(target?.preset || ''),
            },
          },
        });
        setStatusMsg(
          t('launch.status.wrcAborted', { attempts: maxAttempts })
        );
        console.warn('[LaunchControl][WRC] aborted after max attempts (no Start Layout will be sent)');
        startRequestedRef.current = false;
        return;
      }
      const target = resolveWrcTarget();
      const probeStartedAt = Date.now();
      let probeOk = false;
      let probeStatus = 0;
      let probeError = '';
      setStatusMsg(
        t('launch.status.wrcTrying', { attempt })
      );
      try {
        const res = await wrcGetPreset(target.ip, target.port, target.preset);
        probeStatus = Number(res?.status || 0);
        if (res?.ok) {
          probeOk = true;
          wrcReadyRef.current = true;
          setWrcReadyTick((n) => n + 1);
          if (useStartLayoutRef.current && hasStartLayoutRef.current) {
            setStatusMsg(
              t('launch.status.startLayoutPending', { preset: target.preset })
            );
          } else {
            setStatusMsg(
              t('launch.status.wrcConnected', { preset: target.preset })
            );
          }
          wrcProbeCancelRef.current = true;
          if (wrcProbeTimerRef.current) {
            clearTimeout(wrcProbeTimerRef.current);
            wrcProbeTimerRef.current = null;
          }
        } else {
          probeError = String(res?.error || (probeStatus ? `HTTP ${probeStatus}` : 'wrc_probe_failed'));
        }
      } catch (e) {
        probeError = String(e?.message || e || 'wrc_probe_error');
      } finally {
        emitStartLayoutLog({
          level: probeOk ? 'success' : 'warn',
          action: 'start_layout_probe',
          message: probeOk
            ? t('launch.logs.startLayout.probeOk')
            : t('launch.logs.startLayout.probeKo'),
          value: {
            attempt,
            maxAttempts,
            ok: probeOk,
            status: probeStatus || undefined,
            error: probeOk ? '' : probeError || (probeStatus ? `HTTP ${probeStatus}` : 'wrc_probe_failed'),
            durationMs: Math.max(0, Date.now() - probeStartedAt),
            target: {
              ip: String(target?.ip || ''),
              port: Number(target?.port || 0),
              preset: String(target?.preset || ''),
            },
          },
        });
      }
      if (probeOk) return;
      if (!wrcProbeCancelRef.current) {
        wrcProbeTimerRef.current = setTimeout(() => probe(attempt + 1), retryDelayMs);
      }
    };

    wrcProbeTimerRef.current = setTimeout(() => probe(1), retryDelayMs);
  }, [emitStartLayoutLog, launchMode, resolveWrcTarget, t]);
  startWrcProbeRef.current = startWrcProbe;

  // Auto-envoi du Start Layout dès que WRC est joignable et UE tourne
  React.useEffect(() => {
    if (!useStartLayoutRef.current || !hasStartLayoutRef.current) return;
    if (!wrcReadyRef.current) return;
    if (!startRequestedRef.current) return;
    if (launchMode !== 'production') return;

    const running = Object.values(onlineMap || {}).some((e) => e && e.unrealRunning);
    if (!running) return;

    const projectKey = String(projectsDataRef.current?.activeId || projectsDataRef.current?.activeName || '').trim();
    if (!projectKey) return;

    if (lastStartLayoutSigRef.current === projectKey) return;
    if (startLayoutSendInProgressRef.current) return;
    if (startLayoutTimerRef.current) return;

    startLayoutSendInProgressRef.current = true;
    const startDelaySec = Math.max(0, Number(commonCfgRef.current?.startLayoutSendDelaySec || 3));
    setStatusMsg(
      t('launch.status.startLayoutAutoPending', { delay: startDelaySec })
    );

    startLayoutTimerRef.current = setTimeout(async () => {
      const startLayoutStartedAt = Date.now();
      try {
        const layoutRes = await getLayout(projectKey);
        const layouts = Array.isArray(layoutRes?.layouts) ? layoutRes.layouts : [];
        const start = layouts.find((l) => l?.isStart) || null;
        if (!start) {
          setStatusMsg(t('launch.status.startLayoutMissing'));
          return;
        }

        const { normalizeTimeline, createTimelinePlayer, resolveTimelineFps, buildToggleFunctionWidget } = await import('../utils/timeline');
        const {
          wrcPutPropertyForWidget,
          wrcCallFunctionForWidget,
          wrcSendJoystickForWidget
        } = await import('../utils/agent');

        const startWidgets = Array.isArray(start.layout) ? start.layout : [];
        const target = resolveWrcTarget();
        emitStartLayoutLog({
          level: 'info',
          action: 'start_layout_begin',
          message: t('launch.logs.startLayout.begin'),
          value: {
            projectKey,
            projectId: String(projectsDataRef.current?.activeId || ''),
            projectName: String(projectsDataRef.current?.activeName || ''),
            layoutId: String(start?.id || ''),
            layoutName: String(start?.name || ''),
            widgetCount: startWidgets.length,
            wrcAttempts: Number(wrcAttemptsRef.current || 0),
            detailed: true,
            target: {
              ip: String(target?.ip || ''),
              port: Number(target?.port || 0),
              preset: String(target?.preset || ''),
            },
          },
        });
        const commonForProject = {
          rcHttpPort: Number(target.port || rcHttpPortRef.current || 30010),
          webRemoteControlName: target.preset || 'RemoteControlPreset',
          rcWsPort: 0
        };
        const { fps } = resolveTimelineFps(hostsRef.current || []);

        const widgetLog = [];

        const readTargets = (widget) =>
          Object.entries(widget?.targets || {})
            .filter(([, enabled]) => !!enabled)
            .map(([ip]) => String(ip || '').trim())
            .filter(Boolean);

        const pushWidgetLog = (entry) => {
          const payload = entry && typeof entry === 'object' ? entry : {};
          widgetLog.push(payload);
          emitStartLayoutLog({
            level: payload.ok ? 'info' : 'warn',
            action: 'start_layout_widget',
            message: payload.ok
              ? t('launch.logs.startLayout.widgetOk', {
                  kind: payload.kind || 'widget',
                  ref: payload.ref || 'unknown',
                })
              : t('launch.logs.startLayout.widgetFail', {
                  kind: payload.kind || 'widget',
                  ref: payload.ref || 'unknown',
                }),
            targets: Array.isArray(payload.targets) ? payload.targets : [],
            value: {
              projectKey,
              layoutId: String(start?.id || ''),
              layoutName: String(start?.name || ''),
              wrcAttempts: Number(wrcAttemptsRef.current || 0),
              ok: !!payload.ok,
              error: payload.error || '',
              widgetId: payload.widgetId || '',
              widgetType: payload.widgetType || payload.kind || 'widget',
              widgetLabel: payload.widgetLabel || '',
              sentValue: payload.sentValue,
            },
          });
        };

        // Envoi des widgets non-timeline (simulateur du bouton "Envoyer")
        const sendValueForWidget = async (widget) => {
          if (!widget || !widget.targets) return;
          const type = String(widget.type || '').toLowerCase();
          if (type === 'zone' || type === 'timeline') return;
          const widgetId = String(widget.id || '').trim();
          const widgetLabel = String(widget.label || '').trim();
          const widgetRef = widgetId || widgetLabel || type || 'unknown';
          const targets = readTargets(widget);

          const val =
            widget.currentValue !== undefined
              ? widget.currentValue
              : widget.value !== undefined
              ? widget.value
              : widget.defaultValue !== undefined
              ? widget.defaultValue
              : widget.mediaPath !== undefined
              ? widget.mediaPath
              : '';

          try {
            if (type === 'button') {
              await wrcCallFunctionForWidget(widget, hostsRef.current || [], commonForProject);
              pushWidgetLog({
                kind: 'widget',
                ref: widgetRef,
                ok: true,
                widgetId,
                widgetType: type,
                widgetLabel,
                targets,
                sentValue: '[function_call]',
              });
              return;
            }
            if (type === 'toggle') {
              const isFunc = String(widget?.binding?.kind || '').toLowerCase() === 'function';
              if (isFunc) {
                const fnWidget = buildToggleFunctionWidget(widget, !!val);
                await wrcCallFunctionForWidget(fnWidget, hostsRef.current || [], commonForProject);
              } else {
                await wrcPutPropertyForWidget(widget, hostsRef.current || [], commonForProject, !!val);
              }
              pushWidgetLog({
                kind: 'widget',
                ref: widgetRef,
                ok: true,
                widgetId,
                widgetType: type,
                widgetLabel,
                targets,
                sentValue: !!val,
              });
              return;
            }
            if (type === 'joystick') {
              const nextVal = val || { X: 0, Y: 0 };
              await wrcSendJoystickForWidget(widget, hostsRef.current || [], commonForProject, nextVal);
              pushWidgetLog({
                kind: 'widget',
                ref: widgetRef,
                ok: true,
                widgetId,
                widgetType: type,
                widgetLabel,
                targets,
                sentValue: nextVal,
              });
              return;
            }
            // autres widgets à valeur simple : text, slider, color, vector, transform, dropdown, enum, browse, etc.
            await wrcPutPropertyForWidget(widget, hostsRef.current || [], commonForProject, val);
            pushWidgetLog({
              kind: 'widget',
              ref: widgetRef,
              ok: true,
              widgetId,
              widgetType: type,
              widgetLabel,
              targets,
              sentValue: val,
            });
          } catch (e) {
            console.warn('[LaunchControl][StartLayout] send widget failed', widget?.id, e);
            pushWidgetLog({
              kind: 'widget',
              ref: widgetRef,
              ok: false,
              widgetId,
              widgetType: type,
              widgetLabel,
              targets,
              sentValue: val,
              error: String(e?.message || e || ''),
            });
          }
        };

        await Promise.all(startWidgets.map((w) => sendValueForWidget(w)));

        // Timelines : frame 0
        const timelines = startWidgets.filter((w) => w?.type === 'timeline');
        timelines.forEach((tw) => {
          try {
            const timeline = normalizeTimeline(tw.ui?.timeline);
            const innerWidgets = Array.isArray(timeline.widgets) ? timeline.widgets : [];
            if (!innerWidgets.length) return;
            const player = createTimelinePlayer({
              timeline,
              widgets: innerWidgets,
              hosts: hostsRef.current || [],
              common: commonForProject,
              fps,
              startFrame: 0,
              onError: () => {}
            });
            player.seek(0, { triggerEvents: true });
            const timelineId = String(tw?.id || '').trim();
            const timelineLabel = String(tw?.label || '').trim();
            const timelineRef = timelineId || timelineLabel || 'unnamed';
            pushWidgetLog({
              kind: 'timeline',
              ref: timelineRef,
              ok: true,
              widgetId: timelineId,
              widgetType: 'timeline',
              widgetLabel: timelineLabel,
              targets: readTargets(tw),
              sentValue: { frame: 0 },
            });
          } catch (e) {
            console.warn('[LaunchControl][StartLayout] timeline send failed', e);
            const timelineId = String(tw?.id || '').trim();
            const timelineLabel = String(tw?.label || '').trim();
            const timelineRef = timelineId || timelineLabel || 'unnamed';
            pushWidgetLog({
              kind: 'timeline',
              ref: timelineRef,
              ok: false,
              widgetId: timelineId,
              widgetType: 'timeline',
              widgetLabel: timelineLabel,
              targets: readTargets(tw),
              sentValue: { frame: 0 },
              error: String(e?.message || e || ''),
            });
          }
        });

        const total = widgetLog.length;
        const okCount = widgetLog.filter((entry) => !!entry?.ok).length;
        const failCount = Math.max(0, total - okCount);
        emitStartLayoutLog({
          level: failCount > 0 ? 'warn' : 'success',
          action: 'start_layout_end',
          message:
            failCount > 0
              ? t('launch.logs.startLayout.endWarn')
              : t('launch.logs.startLayout.endSuccess'),
          value: {
            projectKey,
            projectId: String(projectsDataRef.current?.activeId || ''),
            projectName: String(projectsDataRef.current?.activeName || ''),
            layoutId: String(start?.id || ''),
            layoutName: String(start?.name || ''),
            wrcAttempts: Number(wrcAttemptsRef.current || 0),
            target: {
              ip: String(target?.ip || ''),
              port: Number(target?.port || 0),
              preset: String(target?.preset || ''),
            },
            total,
            okCount,
            failCount,
            durationMs: Math.max(0, Date.now() - startLayoutStartedAt),
          },
        });
        setStatusMsg(t('launch.status.startLayoutSent'));
        lastStartLayoutSigRef.current = projectKey;
      } catch (e) {
        console.warn('[LaunchControl][StartLayout] envoi échoué', e);
        emitStartLayoutLog({
          level: 'error',
          action: 'start_layout_end',
          message: t('launch.logs.startLayout.endError'),
          value: {
            projectKey,
            projectId: String(projectsDataRef.current?.activeId || ''),
            projectName: String(projectsDataRef.current?.activeName || ''),
            wrcAttempts: Number(wrcAttemptsRef.current || 0),
            error: String(e?.message || e || 'start_layout_failed'),
            durationMs: Math.max(0, Date.now() - startLayoutStartedAt),
          },
        });
        setStatusMsg(
          t('launch.status.startLayoutError') +
            ` (${e?.message || e})`
        );
      } finally {
        startLayoutSendInProgressRef.current = false;
        startLayoutTimerRef.current = null;
      }
    }, startDelaySec * 1000);
  }, [onlineMap, wrcReadyTick, t, resolveWrcTarget, launchMode, emitStartLayoutLog]);

  // Nettoyage au démontage
  React.useEffect(() => () => {
    if (startLayoutTimerRef.current) {
      clearTimeout(startLayoutTimerRef.current);
      startLayoutTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => () => {
    wrcProbeCancelRef.current = true;
    if (wrcProbeTimerRef.current) {
      clearTimeout(wrcProbeTimerRef.current);
      wrcProbeTimerRef.current = null;
    }
  }, [resolveWrcTarget, t, launchMode]);

  const refreshHasStartLayout = React.useCallback(async (projectId) => {
    const pid = String(projectId || '').trim();
    if (!pid) {
      setHasStartLayout(false);
      setUseStartLayout(false);
      return;
    }
    try {
      const res = await getLayout(pid);
      const layouts = Array.isArray(res?.layouts) ? res.layouts : [];
      const anyStart = layouts.some((l) => l?.isStart);
      setHasStartLayout(anyStart);
      if (!anyStart) setUseStartLayout(false);
    } catch {
      // On conserve l'état actuel en cas d'échec réseau temporaire.
    }
  }, []);

  React.useEffect(() => {
    const pid = String(projectsData?.activeId || projectsData?.activeName || '').trim();
    refreshHasStartLayout(pid);
  }, [projectsData?.activeId, projectsData?.activeName, refreshHasStartLayout]);

  React.useEffect(() => {
    if (!isVisible) return;
    const pid = String(projectsData?.activeId || projectsData?.activeName || '').trim();
    if (!pid) return;
    refreshHasStartLayout(pid);
  }, [isVisible, projectsData?.activeId, projectsData?.activeName, refreshHasStartLayout]);

  // Chargement initial: hosts + projets + refreshSec
  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [h, p, c] = await Promise.all([getHosts(), getProjects({ light: true }), getCommon()]);
        hostsSigRef.current = buildHostsSignature(h);
        projSigRef.current = buildProjectsSignature(p);
        setHosts(sortHosts(h, sortLocale));
        setProjectsData({
          activeName: String(p?.activeName || ''),
          activeId: String(p?.activeId || ''),
          projects: Array.isArray(p?.projects) ? p.projects : [],
          activeByHost: (p?.activeByHost && typeof p.activeByHost === 'object') ? p.activeByHost : {}
        });
        const r = Number(c?.refreshSec || 0);
          if (r && r > 0) setRefreshSec(r);
          setShowUeLaunch(!!c?.show_start_new_ue);
          setAllowStartDesynced(!!c?.allowStartDesynced);
        const versInit =
          Array.isArray(c?.unrealVersions) && c.unrealVersions.length
            ? c.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
            : [];
          setUeVersions(sortVersions(versInit));

          // --- Mode de lancement (Production / Intégration) ---
          const mode = String(c?.launchMode || '').toLowerCase();
          if (mode === 'integration') {
            setLaunchMode('integration');
          } else {
            setLaunchMode('production');
          }

          if (typeof c?.useStartLayout === 'boolean') {
            setUseStartLayout(!!c.useStartLayout);
          }

          const rcPort = Number(c?.rcHttpPort || 0);
          if (rcPort) setRcHttpPort(rcPort);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    })
    ();
  }, []);

  // Heartbeat connexion (online/offline) + refresh hosts (allégé) + projets si changement
  React.useEffect(() => {
    let timer = null;
    let stopped = false;

    async function tick() {
      const tickStartedAt = Date.now();
      try {
        const [map, h, p, c] = await Promise.all([
          getOnlineMap().catch(() => ({})),
          getHosts().catch(() => []),
          getProjects({ light: true }).catch(() => null),
          getCommon().catch(() => null),
        ]);

        // état online/offline
        setOnlineMap(map || {});

        // hosts (dont syncRoot / syncEnabled / uproject)
        if (Array.isArray(h)) {
          const sig = buildHostsSignature(h);
          if (sig !== hostsSigRef.current) {
            const sorted = sortHosts(h, sortLocale);
            hostsSigRef.current = sig;
            setHosts(sorted);
          }
        }

        // sync check (uniquement pour les hosts en mode synchro ET éligibles)
        if (Array.isArray(h)) {
          const syncTargets = h.filter(
            (host) =>
              host &&
              host.eligible !== false &&
              host.syncEnabled &&
              String(host.syncRoot || '').trim()
          );
          if (syncTargets.length) {
            const results = await Promise.all(
              syncTargets.map(async (host) => {
                const ip = String(host?.ip || '').trim();
                if (!ip) return null;
                try {
                  // Ne bloque pas la boucle UI trop longtemps si un host ne répond pas.
                  const res = await checkSync(ip, 2500);
                  return { ip, res };
                } catch (e) {
                  return { ip, res: { ok: false, error: e?.message || String(e) } };
                }
              })
            );
            const next = { ...(syncStatusRef.current || {}) };
            for (const entry of results) {
              if (!entry?.ip) continue;
              next[entry.ip] = entry.res || {};
            }
            setSyncStatusMap(next);
          }
        }

        // projets (uniquement si changement)
        if (p && typeof p === 'object') {
          const sigP = buildProjectsSignature(p);
          if (sigP !== projSigRef.current) {
            projSigRef.current = sigP;
            setProjectsData({
              activeName: String(p?.activeName || ''),
              activeId: String(p?.activeId || ''),
              projects: Array.isArray(p?.projects) ? p.projects : [],
              activeByHost:
                p?.activeByHost && typeof p.activeByHost === 'object'
                  ? p.activeByHost
                  : {},
            });
            const pid = String(p?.activeId || p?.activeName || '').trim();
            refreshHasStartLayout(pid);
          }
        }

        // Refresh rapide si un host en mode projet local n'a pas encore de chemin
        const activeId = String(p?.activeId || '').trim();
        const activeByHost =
          p?.activeByHost && typeof p.activeByHost === 'object'
            ? p.activeByHost
            : {};
        const needsQuickRefresh =
          Array.isArray(h) &&
          activeId &&
          h.some((host) => {
            if (!host || host.eligible === false) return false;
            const ip = String(host.ip || '').trim();
            if (!ip || ip === localIp) return false;
            if (host.syncEnabled) return false;
            const perHost = activeByHost[ip] || {};
            const assoc = typeof perHost[activeId] === 'string' ? perHost[activeId].trim() : '';
            const uproj = typeof host.uproject === 'string' ? host.uproject.trim() : '';
            return !assoc && !uproj;
          });
        if (needsQuickRefresh && !quickRefreshPendingRef.current) {
          quickRefreshPendingRef.current = true;
          if (quickRefreshTimerRef.current) clearTimeout(quickRefreshTimerRef.current);
          quickRefreshTimerRef.current = setTimeout(() => {
            if (stopped) return;
            quickRefreshPendingRef.current = false;
            tick();
          }, 800);
        }

        // common settings (refreshSec / rcHttpPort / launchMode / preset name)
        if (c && typeof c === 'object') {
          commonCfgRef.current = c;
          setShowUeLaunch(!!c?.show_start_new_ue);
          setAllowStartDesynced(!!c?.allowStartDesynced);
          const vers =
            Array.isArray(c?.unrealVersions) && c.unrealVersions.length
              ? c.unrealVersions.map((v) => String(v || '').trim()).filter(Boolean)
              : [];
          setUeVersions(prev => {
            const next = sortVersions(vers);
            const same =
              prev.length === next.length &&
              prev.every((v, i) => v === next[i]);
            return same ? prev : next;
          });

          const r = Number(c.refreshSec || 0);
          if (r && r > 0 && r !== refreshSecRef.current) {
            setRefreshSec(r);
          }

          const portCfg = Number(c.rcHttpPort || 0);
          if (portCfg && portCfg !== rcHttpPortRef.current) {
            setRcHttpPort(portCfg);
          }

          const mode = String(c.launchMode || '').toLowerCase();
          if (mode === 'integration') {
            setLaunchMode('integration');
          } else if (mode === 'production') {
            setLaunchMode('production');
          }

          if (typeof c.useStartLayout === 'boolean' && c.useStartLayout !== useStartLayoutRef.current) {
            setUseStartLayout(!!c.useStartLayout);
          }
        }

        // --- Détection locale du WRC (Unreal lancé manuellement) ---
        const localHost = (Array.isArray(h) ? h : []).find(
          (x) => x && localIp && x.ip === localIp
        );
        const ip = localHost?.ip || localIp || '127.0.0.1';
        const port = Number(rcHttpPortRef.current || 30010);

        const list = Array.isArray(projectsDataRef.current?.projects)
          ? projectsDataRef.current.projects
          : [];
        const activePid = String(projectsDataRef.current?.activeId || '').trim();
        const activeName = String(projectsDataRef.current?.activeName || '').trim();
        const activeProject =
          list.find((proj) => String(proj?.id || '').trim() === activePid) ||
          list.find(
            (proj) =>
              activeName &&
              String(proj?.name || '').trim().toLowerCase() ===
                activeName.toLowerCase()
          ) ||
          null;

        const presetName =
          String(activeProject?.wrcName || '').trim() ||
          String(commonCfgRef.current?.webRemoteControlName || '').trim() ||
          'RemoteControlPreset';
        const entry = (map || {})[ip] || {};
        const alreadyRunning = !!entry.unrealRunning;

        // On ne teste le preset WRC que pour l'hôte local/serveur
        if (!alreadyRunning && ip) {
          const ctrl = new AbortController();
          const abortTimer = setTimeout(() => ctrl.abort(), 1200);
          try {
            const url = `http://${ip}:${port}/remote/preset/${encodeURIComponent(presetName)}`;
            const resp = await fetch(url, { signal: ctrl.signal });
            if (resp.ok) {
              if (!wrcReadyRef.current) {
                wrcReadyRef.current = true;
                setStatusMsg(
                  t('launch.status.wrcConnected', {
                    ip,
                    port,
                    preset: presetName
                  }) ||
                  `WRC connecté (${ip}:${port}/${presetName})`
                );
              }
              setOnlineMap((prev) => {
                const cur = { ...(prev || map || {}) };
                const mark = (key) => {
                  const e = cur[key] || {};
                  cur[key] = { ...e, online: true, unrealRunning: true };
                };
                mark(ip);
                mark('127.0.0.1');
                return cur;
              });
            }
          } catch {
            // ignore si unreachable
            wrcReadyRef.current = false;
          } finally {
            clearTimeout(abortTimer);
          }
        }
      } catch {
        // en cas d'erreur réseau on garde l'état actuel
      } finally {
        if (!stopped) {
          const everyMs = Math.max(2, Number(refreshSecRef.current || 5)) * 1000;
          const elapsed = Date.now() - tickStartedAt;
          // Maintient un cycle proche de refreshSec au lieu de "refreshSec + durée du tick".
          const waitMs = Math.max(150, everyMs - elapsed);
          timer = setTimeout(tick, waitMs);
        }
      }
    }

    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (quickRefreshTimerRef.current) {
        clearTimeout(quickRefreshTimerRef.current);
        quickRefreshTimerRef.current = null;
      }
    };
  }, [localIp, sortLocale]);


    // ---- Résolution du .uproject (prend en compte le mode synchro + serveur local) ----
  function resolveUprojectFor(h) {
    const ip = String(h?.ip || '').trim();

    const activeName = String(projectsData?.activeName || '').trim();
    const activeId = String(projectsData?.activeId || '').trim();
    const activeKey = activeId;
    if (!activeKey) return '';

    const arr = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
    const activeProject =
      arr.find((p) => {
        if (!p) return false;
        if (activeId && String(p.id || '').trim() === activeId) return true;
        return false;
      }) || null;

    const syncEnabled = !!h?.syncEnabled;
    const syncRoot = String(h?.syncRoot || '').trim();
    const isLocal =
      ip === '127.0.0.1' ||
      (localIp && ip === localIp);

    // === 0) MACHINE SERVEUR LOCALE ===
    // Toujours utiliser le chemin du projet actif (pas de recomposition via syncRoot)
    if (isLocal && activeProject) {
      return String(
        activeProject.uproject ||
          activeProject.path ||
          activeProject.projectPath ||
          ''
      ).trim();
    }

    // === 1) MODE SYNCHRO CLIENT ===
    if (syncEnabled && syncRoot) {
      let src = '';

      if (activeProject) {
        src =
          activeProject.uproject ||
          activeProject.path ||
          activeProject.projectPath ||
          '';
      }

      if (!src && projectsData?.activeByHost && typeof projectsData.activeByHost === 'object') {
        const perHost = projectsData.activeByHost[ip] || {};
        const candidate = perHost[activeKey];
        if (typeof candidate === 'string' && candidate) {
          src = candidate;
        }
      }

      if (src) {
        // On recalcule le nom du dossier projet comme dans /agent/sync/copy
        const norm = src.replace(/\\/g, '/');
        const lastSlash = norm.lastIndexOf('/');
        const file = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
        const sourceDir = lastSlash > 0 ? norm.slice(0, lastSlash) : '';

        const projectName = sourceDir
          ? sourceDir
              .replace(/[/\\]+$/, '')
              .split(/[/\\]/)
              .filter(Boolean)
              .slice(-1)[0] || activeName || activeKey
          : (activeName || activeKey);

        const baseDir = projectName ? `${syncRoot}\\${projectName}` : syncRoot;
        return `${baseDir}\\${file}`;
      }

      return `${syncRoot}\\${activeName || activeKey}\\<missing.uproject>`;
    }

    // === 2) MODE MANUEL PAR HOST ===
    if (projectsData?.activeByHost && typeof projectsData.activeByHost === 'object') {
      const perHost = projectsData.activeByHost[ip] || {};
      const candidate = perHost[activeKey];
      if (typeof candidate === 'string' && candidate) {
        return candidate.trim();
      }
    }

    // === 3) Fallback : champ uproject de la machine ===
    if (typeof h?.uproject === 'string' && h.uproject) {
      return String(h.uproject).trim();
    }

    // === 4) Fallback : projet actif global (uniquement hôte serveur local) ===
    if (isLocal && activeProject) {
      return String(
        activeProject.uproject ||
          activeProject.path ||
          activeProject.projectPath ||
          ''
      ).trim();
    }

    return '';
  }

  function getActiveProject() {
    const activeId = String(projectsData?.activeId || '').trim();
    const arr = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
    return (
      arr.find((p) => p && activeId && String(p.id || '').trim() === activeId) ||
      null
    );
  }

  function resolveExeForHost(h) {
    const activeProject = getActiveProject();
    const requiredVersion = String(activeProject?.engineVersion || '').trim();
    if (!requiredVersion) return '';

    const editors =
      (h && h.unrealEditors && typeof h.unrealEditors === 'object'
        ? h.unrealEditors
        : {}) || {};

    return editors[requiredVersion] || '';
  }

  // --- Résolution d'un exe UE spécifique (pour lancement éditeur seul) ---
  const serverHost = React.useMemo(
    () => hosts.find((h) => String(h.ip || '').trim() === String(localIp || '').trim()),
    [hosts, localIp]
  );

  function resolveEditorPath(host, version) {
    const map = host && typeof host.unrealEditors === 'object' ? host.unrealEditors : {};
    const v = String(version || '').trim();
    return v && map[v] ? map[v] : '';
  }

  const onLaunchEditor = React.useCallback(
    async (version) => {
      if (!serverHost) return;
      const ip = String(serverHost.ip || '').trim();
      if (!ip) return;
      const exe = resolveEditorPath(serverHost, version);
      if (!exe) {
        setError(t('launch.status.missingExeVersion', { version }));
        setTimeout(() => setError(''), 2000);
        return;
      }
      try {
        const launchRes = await postLaunch(ip, { editorOnly: true, requiredVersion: version, uproject: '' });
        maybeNotifyLocalFallback(launchRes);
        setError('');
      } catch (e) {
        console.error('[LaunchControl] launch editor failed', {
          ip,
          version,
          code: e?.code || '',
          status: e?.status || 0,
          message: e?.message || String(e),
          details: e?.details || '',
        });
        setError(getStartErrorMessage(e));
        setTimeout(() => setError(''), 2500);
      }
    },
    [serverHost, t, maybeNotifyLocalFallback]
  );

  // ---- Helpers: état d'association machine (EXE + .uproject spécifique IP) ----
  function isReadyHost(h) {
    const exe = resolveExeForHost(h);
    const uproj = resolveUprojectFor(h);
    const active = String(projectsData?.activeId || '').trim();
    const ip = String(h?.ip || '').trim();
    const syncEnabled = !!h?.syncEnabled;
    const syncRoot = String(h?.syncRoot || '').trim();
    const syncStatus = syncEnabled ? syncStatusMap[ip] : null;
    const syncStatusName = String(syncStatus?.status || '').trim().toLowerCase();
    const syncKnownStatus = syncStatusName === 'in_sync' || syncStatusName === 'desync';
    const syncError = syncEnabled && syncStatus && syncStatus.ok === false;
    const syncMissingRoot = syncEnabled && syncStatusName === 'no_root';
    const syncOk =
      !syncEnabled ||
      (!!syncRoot &&
        syncKnownStatus &&
        !syncError &&
        !syncMissingRoot &&
        (syncStatusName === 'in_sync' || !!allowStartDesynced));
    return !!active && !!exe && !!uproj && syncOk;
  }

  // Petites pastilles d'état réutilisables
  const renderStatusDot = (cls, title = '') => (
    <span
      className={`uu-dot ${cls}`}
      title={title}
      aria-label={title || cls}
      style={{ marginLeft: '6px' }}
    />
  );

  const renderColorDot = (color, title = '') => (
    <span
      className="uu-pastille"
      style={{
        background: color || '#6B7280',
        display: 'inline-block',
        width: 12,
        height: 12,
        marginRight: 8,
        borderRadius: '50%',
      }}
      title={title}
      aria-label={title || 'host color'}
    />
  );

  // ---- Changement de mode (Production / Intégration) ----
  async function onChangeLaunchMode(e) {
    const value = e.target.value; // 'production' ou 'integration'
    setLaunchMode(value);
    try {
      await postCommon({ launchMode: value });
      if (value !== 'production') {
        await setQuietModeFlag(false);
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  async function onToggleUseStartLayout(e) {
    const checked = !!e?.target?.checked;
    setUseStartLayout(checked);
    try {
      await postCommon({ useStartLayout: checked });
    } catch (err) {
      setError(err?.message || String(err));
      setUseStartLayout(useStartLayoutRef.current);
    }
  }

  function getStartErrorMessage(err) {
    const code = String(err?.code || '').trim().toLowerCase();
    if (code === 'invalid_exe_path' || code === 'missing_exe') {
      return t('launch.msg.errorUnrealNotFound');
    }
    if (code === 'invalid_uproject_path' || code === 'missing_uproject') {
      return t('launch.msg.errorProjectNotFound');
    }
    if (
      code === 'missing_exe_or_uproject' ||
      code === 'invalid paths' ||
      code === 'missing exe or uproject'
    ) {
      return t('launch.msg.errorProjectOrUnrealNotFound');
    }

    const status = Number(err?.status || 0);
    if (status === 400) return t('launch.msg.errorStartFailed');

    const msg = String(err?.message || '').trim();
    if (/^http\s*400$/i.test(msg)) return t('launch.msg.errorStartFailed');

    return t('launch.msg.errorStartFailed');
  }

  function maybeNotifyLocalFallback(res) {
    if (!res || typeof res !== 'object') return false;
    const fb = res.localFallback;
    if (!fb || fb.used !== true) return false;
    const msg = t('launch.msg.localFallback') || 'Reseau Ethernet inactif, bascule locale sur 127.0.0.1.';
    if (noticeApi?.showNotice) {
      noticeApi.showNotice(msg, 'warn');
    } else {
      setStatusMsg(msg);
    }
    return true;
  }

  // ---- Actions Start/Stop (unitaire) ----
  async function onStart(ip) {
    const targetIp = String(ip || '').trim();
    if (!targetIp) return;

    if (launchMode === 'production') {
      startRequestedRef.current = true;
      wrcReadyRef.current = false;
      lastStartLayoutSigRef.current = '';
      wrcAttemptsRef.current = 0;
      try {
        startWrcProbeRef.current?.();
      } catch {}
    }

    const host = hosts.find(h => String(h.ip || '').trim() === targetIp);
    if (!host) {
      setError(t('launch.msg.startOneErrorPrefix').replace('{ip}', targetIp) + 'host not found');
      return;
    }

    const exe = resolveExeForHost(host);
    const uproj = resolveUprojectFor(host);
    if (!isReadyHost(host)) {
      const activeProject = getActiveProject();
      const requiredVersion = String(activeProject?.engineVersion || '').trim();
      setError(
        !exe
          ? (requiredVersion
              ? t('launch.status.missingExeVersion', { version: requiredVersion })
              : t('launch.status.missingExe'))
          : (host?.syncEnabled
              ? t('launch.status.missingUprojectSync')
              : t('launch.status.missingUproject'))
      );
      return;
    }

    setBusy(b => ({ ...b, [targetIp]: true }));
    try {
      if (launchMode === 'production') {
        await setQuietModeFlag(true);
      } else if (launchMode === 'integration') {
        await postCommon({ launchMode: 'integration' });
      }
      const launchRes = await postLaunch(targetIp, { uproject: uproj });
      maybeNotifyLocalFallback(launchRes);
      setError('');
      if (launchMode === 'production' && useStartLayoutRef.current && hasStartLayoutRef.current) {
        setStatusMsg(
          wrcReadyRef.current
            ? t('launch.status.startLayoutSent')
            : t('launch.status.startLayoutWaiting')
        );
      }
      } catch (e) {
        console.error('[LaunchControl] start failed', {
          ip: targetIp,
          code: e?.code || '',
          status: e?.status || 0,
          message: e?.message || String(e),
          details: e?.details || '',
        });
        const prefix = t('launch.msg.startOneErrorPrefix').replace('{ip}', targetIp);
        const suffix = getStartErrorMessage(e);
        setError(prefix + suffix);
      } finally {
        setBusy(b => ({ ...b, [targetIp]: false }));
      }
    }

  async function onStop(ip) {
    setBusy(b => ({ ...b, [ip]: true }));
    try {
      const stopMode = launchMode === 'integration' ? 'integration' : 'production';
      const host = hosts.find(h => String(h.ip || '').trim() === String(ip));
      const uproject = stopMode === 'integration' && host ? resolveUprojectFor(host) : '';
      const stopRes = await postStop(ip, { mode: stopMode, uproject });
      maybeNotifyLocalFallback(stopRes);
      setError('');
      if (launchMode === 'production') {
        await setQuietModeFlag(false);
      }
    } catch (e) {
      const prefix = t('launch.msg.stopOneErrorPrefix').replace('{ip}', String(ip));
      const suffix = e?.message || String(e);
      setError(prefix + suffix);
    } finally {
        setBusy(b => ({ ...b, [ip]: false }));
      }
    }

  // ---- Actions groupées ----
  async function onStartAll() {
    if (launchMode !== 'production') return;
    startRequestedRef.current = true;
    wrcReadyRef.current = false;
    lastStartLayoutSigRef.current = '';
    wrcAttemptsRef.current = 0;
    try {
      startWrcProbeRef.current?.();
    } catch {}
    const targets = hosts
      .filter(h => isReadyHost(h) && (onlineMap[h.ip]?.online) && !busy[h.ip])
      .filter(h => !(onlineMap[h.ip]?.unrealRunning))
      .map(h => ({
        ip: h.ip,
        uproject: resolveUprojectFor(h),
      }));

    if (!targets.length) return;

    const ips = targets.map(t => t.ip);

    setBusy(b => ips.reduce((acc, ip) => ({ ...acc, [ip]: true }), { ...b }));
    try {
      if (launchMode === 'production') {
        await setQuietModeFlag(true);
      }
      const launchResults = await Promise.all(
        targets.map(async (target) => ({
          ip: target.ip,
          res: await postLaunch(target.ip, { uproject: target.uproject }),
        }))
      );
      const fallbackLaunch = launchResults.find((entry) => entry?.res?.localFallback?.used);
      if (fallbackLaunch) maybeNotifyLocalFallback(fallbackLaunch.res);
      setError('');
      if (useStartLayoutRef.current && hasStartLayoutRef.current) {
        setStatusMsg(
          wrcReadyRef.current
            ? t('launch.status.startLayoutSent')
            : t('launch.status.startLayoutWaiting')
        );
      }
    } catch (e) {
      console.error('[LaunchControl] start all failed', {
        code: e?.code || '',
        status: e?.status || 0,
        message: e?.message || String(e),
        details: e?.details || '',
      });
      const prefix = t('launch.msg.startAllErrorPrefix');
      const suffix = getStartErrorMessage(e);
      setError(prefix + suffix);
    } finally {
      setBusy(b => ips.reduce((acc, ip) => ({ ...acc, [ip]: false }), { ...b }));
    }
  }

  async function onStopAll() {
    const ips = hosts
      .filter((h) => onlineMap[h.ip]?.online && onlineMap[h.ip]?.unrealRunning)
      .map((h) => h.ip);
    if (!ips.length) return;
    setBusy(b => ips.reduce((acc, ip) => ({ ...acc, [ip]: true }), { ...b }));
    try {
      const stopMode = launchMode === 'integration' ? 'integration' : 'production';
      const stopResults = await Promise.all(
        ips.map((ip) => {
          const host = hosts.find(h => String(h.ip || '').trim() === String(ip));
          const uproject = stopMode === 'integration' && host ? resolveUprojectFor(host) : '';
          return postStop(ip, { mode: stopMode, uproject });
        })
      );
      const fallbackStop = stopResults.find((entry) => entry?.localFallback?.used);
      if (fallbackStop) maybeNotifyLocalFallback(fallbackStop);
      setError('');
      if (launchMode === 'production') {
        await setQuietModeFlag(false);
      }
    } catch (e) {
      const prefix = t('launch.msg.stopAllErrorPrefix');
      const suffix = e?.message || String(e);
      setError(prefix + suffix);
    } finally {
      setBusy(b => ips.reduce((acc, ip) => ({ ...acc, [ip]: false }), { ...b }));
    }
  }

  const hasMachines = hosts && hosts.length > 0;
  const pathOrND = (s) => {
    const v = (s || '').toString().replace(/\//g, '\\').replace(/\\+/g, '\\').trim();
    return v || t('launch.path.undefined');
  };

  const canStartAnyHost =
    hosts.some((h) => {
      const ip = String(h.ip || '').trim();
      const entry = onlineMap && onlineMap[ip];
      const online = !!(entry && entry.online);
      const running = !!(entry && entry.unrealRunning);
      const isServerHost = localIp && ip === localIp;
      const allowed =
        launchMode === 'production' ||
        (launchMode === 'integration' && isServerHost);
      return allowed && isReadyHost(h) && online && !running && !busy[h.ip];
    });

  const canStopAnyHost =
    hosts.some((h) => {
      const ip = String(h.ip || '').trim();
      const entry = onlineMap && onlineMap[ip];
      const running = !!(entry && entry.unrealRunning);
      const isServerHost = localIp && ip === localIp;
      const allowed =
        launchMode === 'production' ||
        (launchMode === 'integration' && isServerHost);
      return allowed && running && !busy[h.ip];
    });

  const activeLabel = loading
    ? t('launch.loading')
    : (projectsData.activeName || t('launch.activeProject.none'));

  return (
    <div className="uu-page uu-page-compact launch-page">
        <div className="uu-section">
        <div className="uu-toolbar">
          <div className="uu-kv">
            {projectsData?.activeId ? (
              <button className="uu-btn" onClick={editActiveProject}>
                {t('projects.actions.edit')}
              </button>
            ) : null}
            <span className="uu-k">{t('launch.activeProject.label')}</span>
            <span className="uu-v">
              {activeLabel}{' '}
              {projectsData.activeId ? (
                <span className="uu-id-tag uu-muted">[{projectsData.activeId}]</span>
              ) : null}
            </span>
          </div>
          <div className="uu-toolbar-actions">
            {launchMode !== 'integration' && hasStartLayout ? (
              <label className="uu-check uu-row uu-align-center uu-gap-8" style={{ marginRight: '12px' }}>
                {t('launch.useStartLayout')}
                <input
                  type="checkbox"
                  checked={!!useStartLayout}
                  onChange={onToggleUseStartLayout}
                />
              </label>
            ) : null}
            <select
              className="uu-select uu-launch-mode-select"
              value={launchMode}
              onChange={onChangeLaunchMode}
            >
              <option value="production">{t('launch.mode.production')}</option>
              <option value="integration">{t('launch.mode.integration')}</option>
            </select>
            <button
              className={`uu-btn ${
                launchMode === 'integration'
                  ? ''
                  : (canStartAnyHost ? 'prod-toggle-active' : '')
              }`}
              onClick={onStartAll}
              disabled={launchMode === 'integration' || !canStartAnyHost}
            >
              {t('launch.buttons.startAll')}
            </button>
            <button
              className={`uu-btn ${canStopAnyHost ? 'uu-btn-danger' : ''}`}
              onClick={onStopAll}
              disabled={!canStopAnyHost}
            >
              {t('launch.buttons.stopAll')}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="uu-muted">{t('launch.loading')}</div>
      )}

      {!loading && !hasMachines && (
        <div className="uu-muted">{t('launch.noMachines')}</div>
      )}

      {!loading && hasMachines && (
        <div className="uu-list">
          {hosts.map((h) => {
            const activeProject = getActiveProject();
            const requiredVersion = String(activeProject?.engineVersion || '').trim();
            const ue = resolveExeForHost(h);
            const ip = String(h.ip || '').trim();
            const entry = onlineMap && onlineMap[ip];
            const online = !!(entry && entry.online);
            const running = !!(entry && entry.unrealRunning);

            const canStart =
              isReadyHost(h) &&
              online &&
              !running &&
              !busy[h.ip];

            const canStop =
              !busy[h.ip] &&
              running;

            const uproj = resolveUprojectFor(h);


            // Statuts détaillés
            const agentStatus = (() => {
              if (busy[ip]) return { cls: 'testing', title: t('launch.status.testing') };
              if (online && running) return { cls: 'ok', title: t('launch.status.unrealRunning') };
              if (online) return { cls: 'ok', title: t('launch.status.agentOnline') };
              return { cls: 'fail', title: t('launch.status.agentOffline') };
            })();

            const projectStatus = (() => {
              const syncEnabled = !!h?.syncEnabled;
              const syncRoot = String(h?.syncRoot || '').trim();
              const syncStatus = syncEnabled ? syncStatusMap[ip] : null;
              const syncStatusName = String(syncStatus?.status || '').trim().toLowerCase();
              const rawDiffValue = syncEnabled
                ? Number(
                    syncStatus?.rawDiffCount ??
                      (syncStatusName === 'desync' ? syncStatus?.diffCount : 0)
                  )
                : 0;
              const rawDiffCount =
                Number.isFinite(rawDiffValue) && rawDiffValue > 0
                  ? Math.trunc(rawDiffValue)
                  : 0;
              const hasProject = !!uproj && (!syncEnabled || !!syncRoot);
              const syncDesync = syncEnabled && syncStatusName === 'desync';
              const syncError = syncEnabled && syncStatus && syncStatus.ok === false;
              const syncMissingRoot = syncEnabled && syncStatusName === 'no_root';
              return {
                cls: !hasProject || syncError || syncMissingRoot ? 'fail' : syncDesync ? 'warn' : 'ok',
                title: !hasProject
                  ? t('launch.status.missingUproject')
                  : (syncMissingRoot
                      ? t('launch.status.missingSyncRoot')
                      : (syncError
                          ? t('launch.status.syncError')
                          : (syncDesync
                              ? (t('launch.status.projectDesynced'))
                              : t('launch.status.projectDefined')))),
                rawDiffCount,
              };
            })();

            const exeStatus = (() => {
              const requiredVersion = String(getActiveProject()?.engineVersion || '').trim();
              const hasExe = !!ue;
              return {
                cls: hasExe ? 'ok' : 'fail',
                title: hasExe
                  ? t('launch.status.unrealExeReady')
                  : (requiredVersion
                    ? t('launch.status.missingExeVersion', { version: requiredVersion })
                  : t('launch.status.missingExe')),
              };
            })();

            const ipValid = !!ip && /\d/.test(ip);
            const hostInvalid =
              !ipValid ||
              !online ||
              projectStatus.cls === 'fail' ||
              exeStatus.cls === 'fail';
            const hostWarn = projectStatus.cls === 'warn';

            return (
              <div
                key={h.ip}
                className={`uu-card ${hostInvalid ? 'launch-host-invalid' : hostWarn ? 'launch-host-warn' : ''}`}
              >
                <div className="uu-row uu-row-launch-host">
                  <div className="uu-col">
                    <div className="uu-item-title">
                      {renderColorDot(h.color, h.name || h.ip)}
                      {h.name || h.ip}
                    </div>
                    <div
                      className="uu-item-sub"
                      title={
                        online
                          ? t('launch.status.agentOnline')
                          : t('launch.status.agentOffline')
                      }
                    >
                      {h.ip}
                      {renderStatusDot(agentStatus.cls, agentStatus.title)}
                    </div>
                  </div>

                  <div className="uu-col">
                    <div className="uu-kv">
                      <span className="uu-k">
                        {requiredVersion
                          ? t('launch.labels.unrealExeVersion', { version: requiredVersion })
                          : t('launch.labels.unrealExe')}
                      </span>
                      <span className="uu-v uu-row uu-row-gap4 uu-align-center">
                        {pathOrND(ue)}
                        {renderStatusDot(exeStatus.cls, exeStatus.title)}
                      </span>
                    </div>
                    <div className="uu-kv">
                      <span className="uu-k">
                        {h.syncEnabled && h.syncRoot
                          ? t('launch.labels.projectPathSync')
                          : t('launch.labels.projectPath')}
                      </span>
                      <span className="uu-v uu-row uu-row-gap4 uu-align-center">
                        {pathOrND(uproj)}
                        {renderStatusDot(projectStatus.cls, projectStatus.title)}
                        {projectStatus.cls === 'warn' ? (
                          <span className="uu-text-warn">
                            {t('launch.labels.desynced')}
                          </span>
                        ) : null}
                        {projectStatus.rawDiffCount > 0 ? (
                          <span className="uu-text-warn">
                            {t('launch.labels.diffFilesWarning', {
                              count: projectStatus.rawDiffCount,
                            })}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  </div>

                  <div className="uu-col uu-actions">
                    <button
                      className={`uu-btn ${canStart ? 'prod-toggle-active' : ''}`}
                      disabled={!canStart}
                      onClick={() => onStart(h.ip)}
                    >
                      {busy[h.ip]
                        ? t('launch.buttons.starting')
                        : t('launch.buttons.start')}
                    </button>
                    <button
                      className={`uu-btn ${canStop ? 'uu-btn-danger' : ''}`}
                      disabled={!canStop}
                      onClick={() => onStop(h.ip)}
                    >
                      {t('launch.buttons.stop')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bloc de lancement Unreal Editor (boutons plein format) en dessous des machines */}
      {showUeLaunch && serverHost && ueVersions.length > 0 ? (
        <div className="uu-section" style={{ marginTop: '12px' }}>
          <div className="uu-row uu-align-center uu-gap-12 uu-wrap" style={{ marginBottom: '8px' }}>
            <strong className="uu-block-title">
              {t('launch.unrealEditor.title')}
            </strong>
            <span className="uu-muted">{serverHost.name || serverHost.ip}</span>
          </div>
          <div className="uu-row uu-gap-12 uu-wrap">
            {ueVersions.map((ver, idx) => {
              const path = resolveEditorPath(serverHost, ver);
              const disabled = !path || !onlineMap[serverHost.ip]?.online;
              return (
                <button
                  key={`${ver}-${idx}`}
                  className={`uu-btn ${!disabled ? 'prod-toggle-active' : ''}`}
                  style={{ minWidth: '140px', padding: '10px 16px' }}
                  disabled={disabled}
                  onClick={() => onLaunchEditor(ver)}
                  title={path || t('launch.labels.unrealExe')}
                >
                  {t('launch.buttons.startVersion', { ver })}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
