import { getLayout } from '../../utils/agent';

function readWidgetTargets(widget) {
  return Object.entries(widget?.targets || {})
    .filter(([, enabled]) => !!enabled)
    .map(([ip]) => String(ip || '').trim())
    .filter(Boolean);
}

function resolveWidgetValue(widget) {
  if (widget.currentValue !== undefined) return widget.currentValue;
  if (widget.value !== undefined) return widget.value;
  if (widget.defaultValue !== undefined) return widget.defaultValue;
  if (widget.mediaPath !== undefined) return widget.mediaPath;
  return '';
}

function pushStartLayoutWidgetLog({
  entry,
  widgetLog,
  emitStartLayoutLog,
  t,
  projectKey,
  start,
  wrcAttemptsRef,
}) {
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
}

async function sendWidgetValue({
  widget,
  hosts,
  commonForProject,
  buildToggleFunctionWidget,
  wrcPutPropertyForWidget,
  wrcCallFunctionForWidget,
  wrcSendJoystickForWidget,
  pushWidgetLog,
}) {
  if (!widget || !widget.targets) return;
  const type = String(widget.type || '').toLowerCase();
  if (type === 'zone' || type === 'timeline') return;
  const widgetId = String(widget.id || '').trim();
  const widgetLabel = String(widget.label || '').trim();
  const widgetRef = widgetId || widgetLabel || type || 'unknown';
  const targets = readWidgetTargets(widget);
  const value = resolveWidgetValue(widget);

  try {
    if (type === 'button') {
      await wrcCallFunctionForWidget(widget, hosts, commonForProject);
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
      const isFunctionBinding = String(widget?.binding?.kind || '').toLowerCase() === 'function';
      if (isFunctionBinding) {
        const functionWidget = buildToggleFunctionWidget(widget, !!value);
        await wrcCallFunctionForWidget(functionWidget, hosts, commonForProject);
      } else {
        await wrcPutPropertyForWidget(widget, hosts, commonForProject, !!value);
      }
      pushWidgetLog({
        kind: 'widget',
        ref: widgetRef,
        ok: true,
        widgetId,
        widgetType: type,
        widgetLabel,
        targets,
        sentValue: !!value,
      });
      return;
    }
    if (type === 'joystick') {
      const nextValue = value || { X: 0, Y: 0 };
      await wrcSendJoystickForWidget(widget, hosts, commonForProject, nextValue);
      pushWidgetLog({
        kind: 'widget',
        ref: widgetRef,
        ok: true,
        widgetId,
        widgetType: type,
        widgetLabel,
        targets,
        sentValue: nextValue,
      });
      return;
    }
    await wrcPutPropertyForWidget(widget, hosts, commonForProject, value);
    pushWidgetLog({
      kind: 'widget',
      ref: widgetRef,
      ok: true,
      widgetId,
      widgetType: type,
      widgetLabel,
      targets,
      sentValue: value,
    });
  } catch (error) {
    console.warn('[LaunchControl][StartLayout] send widget failed', widget?.id, error);
    pushWidgetLog({
      kind: 'widget',
      ref: widgetRef,
      ok: false,
      widgetId,
      widgetType: type,
      widgetLabel,
      targets,
      sentValue: value,
      error: String(error?.message || error || ''),
    });
  }
}

async function dispatchStartLayout({
  projectKey,
  hostsRef,
  projectsDataRef,
  rcHttpPortRef,
  wrcAttemptsRef,
  resolveWrcTarget,
  emitStartLayoutLog,
  setStatusMsg,
  t,
}) {
  const startLayoutStartedAt = Date.now();
  const currentProjectId = String(projectsDataRef.current?.activeId || '');
  const currentProjectName = String(projectsDataRef.current?.activeName || '');

  try {
    const layoutResult = await getLayout(projectKey);
    const layouts = Array.isArray(layoutResult?.layouts) ? layoutResult.layouts : [];
    const start = layouts.find((layout) => layout?.isStart) || null;
    if (!start) {
      setStatusMsg(t('launch.status.startLayoutMissing'));
      return { sent: false };
    }

    const {
      normalizeTimeline,
      createTimelinePlayer,
      resolveTimelineFps,
      buildToggleFunctionWidget,
    } = await import('../../utils/timeline');
    const {
      wrcPutPropertyForWidget,
      wrcCallFunctionForWidget,
      wrcSendJoystickForWidget,
    } = await import('../../utils/agent');

    const startWidgets = Array.isArray(start.layout) ? start.layout : [];
    const target = resolveWrcTarget();
    emitStartLayoutLog({
      level: 'info',
      action: 'start_layout_begin',
      message: t('launch.logs.startLayout.begin'),
      value: {
        projectKey,
        projectId: currentProjectId,
        projectName: currentProjectName,
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
      rcWsPort: 0,
    };

    const hosts = hostsRef.current || [];
    const { fps } = resolveTimelineFps(hosts);
    const widgetLog = [];

    const pushWidgetLog = (entry) =>
      pushStartLayoutWidgetLog({
        entry,
        widgetLog,
        emitStartLayoutLog,
        t,
        projectKey,
        start,
        wrcAttemptsRef,
      });

    await Promise.all(startWidgets.map((widget) =>
      sendWidgetValue({
        widget,
        hosts,
        commonForProject,
        buildToggleFunctionWidget,
        wrcPutPropertyForWidget,
        wrcCallFunctionForWidget,
        wrcSendJoystickForWidget,
        pushWidgetLog,
      })
    ));

    const timelines = startWidgets.filter((widget) => widget?.type === 'timeline');
    timelines.forEach((timelineWidget) => {
      try {
        const timeline = normalizeTimeline(timelineWidget.ui?.timeline);
        const innerWidgets = Array.isArray(timeline.widgets) ? timeline.widgets : [];
        if (!innerWidgets.length) return;
        const player = createTimelinePlayer({
          timeline,
          widgets: innerWidgets,
          hosts,
          common: commonForProject,
          fps,
          startFrame: 0,
          onError: () => {},
        });
        player.seek(0, { triggerEvents: true });
        const timelineId = String(timelineWidget?.id || '').trim();
        const timelineLabel = String(timelineWidget?.label || '').trim();
        const timelineRef = timelineId || timelineLabel || 'unnamed';
        pushWidgetLog({
          kind: 'timeline',
          ref: timelineRef,
          ok: true,
          widgetId: timelineId,
          widgetType: 'timeline',
          widgetLabel: timelineLabel,
          targets: readWidgetTargets(timelineWidget),
          sentValue: { frame: 0 },
        });
      } catch (error) {
        console.warn('[LaunchControl][StartLayout] timeline send failed', error);
        const timelineId = String(timelineWidget?.id || '').trim();
        const timelineLabel = String(timelineWidget?.label || '').trim();
        const timelineRef = timelineId || timelineLabel || 'unnamed';
        pushWidgetLog({
          kind: 'timeline',
          ref: timelineRef,
          ok: false,
          widgetId: timelineId,
          widgetType: 'timeline',
          widgetLabel: timelineLabel,
          targets: readWidgetTargets(timelineWidget),
          sentValue: { frame: 0 },
          error: String(error?.message || error || ''),
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
        projectId: currentProjectId,
        projectName: currentProjectName,
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
    return { sent: true };
  } catch (error) {
    console.warn('[LaunchControl][StartLayout] envoi échoué', error);
    emitStartLayoutLog({
      level: 'error',
      action: 'start_layout_end',
      message: t('launch.logs.startLayout.endError'),
      value: {
        projectKey,
        projectId: currentProjectId,
        projectName: currentProjectName,
        wrcAttempts: Number(wrcAttemptsRef.current || 0),
        error: String(error?.message || error || 'start_layout_failed'),
        durationMs: Math.max(0, Date.now() - startLayoutStartedAt),
      },
    });
    setStatusMsg(
      t('launch.status.startLayoutError') + ` (${error?.message || error})`
    );
    return { sent: false };
  }
}

export { dispatchStartLayout };
