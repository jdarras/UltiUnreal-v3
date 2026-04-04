// main/server-widgets.cjs
// Gestion des widgets UI / Companion (press / nudge)
// Endpoints couverts :
//   POST /agent/ui/widgets/:id/press
//   POST /agent/ui/widgets/:id/nudge
// (et éventuellement d'autres variantes liées aux widgets)

const { readJSON } = require('./server-files.cjs');
const { createServerTimelinePlayer } = require('./server-timeline-runtime.cjs');
const {
  loadProjects,
  readProjectDoc,
  writeProjectDoc,
  readProjectMeta,
} = require('./server-projects.cjs');

const widgetRuntimeState = {};
const widgetColorTypeCache = Object.create(null);
const widgetColorBindingSigCache = Object.create(null);
const timelineRuntimeByKey = new Map();

let colorUtilsPromise = null;
function getColorUtils() {
  if (!colorUtilsPromise) {
    // Ce fichier est dans main/, colorutils.mjs est à la racine du projet
    colorUtilsPromise = import('../app/utils/colorutils.mjs');
  }
  return colorUtilsPromise;
}

function cloneSerializable(value) {
  if (value === null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

function resolveWidgetResetValue(widget = {}, wtype = '') {
  if (
    Object.prototype.hasOwnProperty.call(widget, 'defaultValue') &&
    widget.defaultValue !== undefined &&
    widget.defaultValue !== null
  ) {
    return cloneSerializable(widget.defaultValue);
  }

  if (wtype === 'slider') {
    const raw = widget?.ui?.default;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }

  if (wtype === 'vector') {
    const ui = widget?.ui || {};
    const rawX = ui.defaultX;
    const rawY = ui.defaultY;
    const rawZ = ui.defaultZ;
    const hasAny =
      rawX !== undefined || rawY !== undefined || rawZ !== undefined;
    if (hasAny) {
      const nx = Number(rawX);
      const ny = Number(rawY);
      const nz = Number(rawZ);
      return {
        X: Number.isFinite(nx) ? nx : 0,
        Y: Number.isFinite(ny) ? ny : 0,
        Z: Number.isFinite(nz) ? nz : 0,
      };
    }
  }

  return undefined;
}

function isVectorRotatorBinding(widget = {}) {
  const valueType = String(widget?.binding?.valueType || '').trim().toLowerCase();
  const propName = String(widget?.binding?.propertyName || '').trim().toLowerCase();
  const path = String(widget?.binding?.path || '').trim().toLowerCase();

  if (valueType === 'rotator' || valueType === 'frotator') return true;
  if (propName.includes('rotation')) return true;
  if (path.includes('rotation')) return true;
  return false;
}

function toWrcVectorPropertyValue(widget = {}, rawValue = {}) {
  if (!rawValue || typeof rawValue !== 'object') return rawValue;
  if (!isVectorRotatorBinding(widget)) return rawValue;

  const X = rawValue.X ?? rawValue.x ?? rawValue.Roll ?? rawValue.roll ?? 0;
  const Y = rawValue.Y ?? rawValue.y ?? rawValue.Pitch ?? rawValue.pitch ?? 0;
  const Z = rawValue.Z ?? rawValue.z ?? rawValue.Yaw ?? rawValue.yaw ?? 0;

  return {
    Roll: Number(X) || 0,
    Pitch: Number(Y) || 0,
    Yaw: Number(Z) || 0,
  };
}

function toFiniteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function eulerToQuaternion(rot = {}) {
  const rollDeg = toFiniteNumber(rot.Roll ?? rot.roll, 0);
  const pitchDeg = toFiniteNumber(rot.Pitch ?? rot.pitch, 0);
  const yawDeg = toFiniteNumber(rot.Yaw ?? rot.yaw, 0);

  const roll = (rollDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const yaw = (yawDeg * Math.PI) / 180;

  const cr = Math.cos(roll * 0.5);
  const sr = Math.sin(roll * 0.5);
  const cp = Math.cos(pitch * 0.5);
  const sp = Math.sin(pitch * 0.5);
  const cy = Math.cos(yaw * 0.5);
  const sy = Math.sin(yaw * 0.5);

  return {
    X: sr * cp * cy - cr * sp * sy,
    Y: cr * sp * cy + sr * cp * sy,
    Z: cr * cp * sy - sr * sp * cy,
    W: cr * cp * cy + sr * sp * sy,
  };
}

function toWrcTransformPropertyValue(rawValue = {}) {
  if (!rawValue || typeof rawValue !== 'object') return rawValue;

  const translationSource =
    rawValue.Translation && typeof rawValue.Translation === 'object'
      ? rawValue.Translation
      : rawValue.Location && typeof rawValue.Location === 'object'
        ? rawValue.Location
        : {};

  const scaleSource =
    rawValue.Scale3D && typeof rawValue.Scale3D === 'object'
      ? rawValue.Scale3D
      : rawValue.Scale && typeof rawValue.Scale === 'object'
        ? rawValue.Scale
        : {};

  const rotationSource =
    rawValue.Rotation && typeof rawValue.Rotation === 'object'
      ? rawValue.Rotation
      : {};

  const hasQuaternion =
    typeof (rotationSource.W ?? rotationSource.w) !== 'undefined';

  const quaternion = hasQuaternion
    ? {
        X: toFiniteNumber(rotationSource.X ?? rotationSource.x, 0),
        Y: toFiniteNumber(rotationSource.Y ?? rotationSource.y, 0),
        Z: toFiniteNumber(rotationSource.Z ?? rotationSource.z, 0),
        W: toFiniteNumber(rotationSource.W ?? rotationSource.w, 1),
      }
    : eulerToQuaternion(rotationSource);

  const rotator = {
    Roll: toFiniteNumber(
      rotationSource.Roll ?? rotationSource.roll,
      0
    ),
    Pitch: toFiniteNumber(
      rotationSource.Pitch ?? rotationSource.pitch,
      0
    ),
    Yaw: toFiniteNumber(
      rotationSource.Yaw ?? rotationSource.yaw,
      0
    ),
  };

  if (!hasQuaternion) {
    // Si la source était en Euler, on conserve explicitement ces angles.
    rotator.Roll = toFiniteNumber(rotationSource.Roll ?? rotationSource.roll, rotator.Roll);
    rotator.Pitch = toFiniteNumber(rotationSource.Pitch ?? rotationSource.pitch, rotator.Pitch);
    rotator.Yaw = toFiniteNumber(rotationSource.Yaw ?? rotationSource.yaw, rotator.Yaw);
  }

  const translation = {
    X: toFiniteNumber(translationSource.X ?? translationSource.x, 0),
    Y: toFiniteNumber(translationSource.Y ?? translationSource.y, 0),
    Z: toFiniteNumber(translationSource.Z ?? translationSource.z, 0),
  };

  const scale3D = {
    X: toFiniteNumber(scaleSource.X ?? scaleSource.x, 1),
    Y: toFiniteNumber(scaleSource.Y ?? scaleSource.y, 1),
    Z: toFiniteNumber(scaleSource.Z ?? scaleSource.z, 1),
  };

  return {
    // Compat large: certains presets/structs lisent Translation, d'autres Location.
    Translation: translation,
    Location: translation,
    // Compat large: on fournit les clés quaternion + euler dans le même objet.
    Rotation: {
      X: quaternion.X,
      Y: quaternion.Y,
      Z: quaternion.Z,
      W: quaternion.W,
      Roll: rotator.Roll,
      Pitch: rotator.Pitch,
      Yaw: rotator.Yaw,
    },
    Scale3D: scale3D,
  };
}

let currentLogLine = null;
function logWrcCallError({ ip, url, widgetId, type, action, error }) {
  try {
    const fn = currentLogLine;
    if (typeof fn === 'function') {
      fn({
        level: 'error',
        src: 'server',
        action: 'wrc_call_error',
        host: ip || '',
        message: `WRC call failed for widget ${widgetId || '?'} (${type || '?'})`,
        data: {
          url,
          widgetId,
          type,
          action,
          error,
        },
      });
    } else {
      console.error('[UltiUnreal][Agent] WRC call error', {
        ip,
        url,
        widgetId,
        type,
        action,
        error,
      });
    }
  } catch {
    // on ne casse jamais le serveur pour un problème de log
  }
}

function resolveNudgeDispatchMeta({ isLive = false, hasAdjust = false } = {}) {
  const shouldDispatchNow = isLive || !hasAdjust;
  if (shouldDispatchNow) {
    return {
      shouldDispatchNow: true,
      dispatchState: 'dispatched',
      dispatchReason: isLive ? 'live_enabled' : 'explicit_send',
    };
  }
  return {
    shouldDispatchNow: false,
    dispatchState: 'staged',
    dispatchReason: 'live_disabled',
  };
}

function logWidgetNudge({
  logLine,
  widgetId,
  wtype,
  isLive,
  dispatchState,
  dispatchReason,
  path,
  value,
  valueForWrc,
  targets,
  results,
}) {
  if (typeof logLine !== 'function') return;
  logLine({
    level: 'info',
    src: 'server',
    action: 'widget_nudge',
    host: '',
    message: `widget_nudge ${wtype} ${widgetId}`,
    data: {
      widgetId,
      type: wtype,
      live: !!isLive,
      dispatchState,
      dispatchReason,
      path,
      value,
      valueForWrc,
      targets,
      results,
    },
  });
}

function resolveActiveLayout(doc = {}) {
  const layouts = Array.isArray(doc?.layouts) ? doc.layouts : [];
  if (layouts.length) {
    let activeId = String(doc.activeLayoutId || doc.layoutId || '').trim();
    let active = layouts.find((l) => l && l.id === activeId);
    if (!active) {
      active = layouts[0];
      activeId = String(active?.id || '').trim();
    }
    const layout = Array.isArray(active?.layout) ? active.layout : [];
    return { layout, layoutId: activeId, layouts, active };
  }
  const layout = Array.isArray(doc?.layout) ? doc.layout : [];
  return { layout, layoutId: '', layouts: [], active: null };
}

function findWidgetInLayout(layout = [], widgetId = '') {
  const wid = String(widgetId || '').trim();
  if (!wid || !Array.isArray(layout)) return null;
  return layout.find((w) => w && String(w.id || '').trim() === wid) || null;
}

function resolveWidgetContext(doc = {}, widgetId = '', requestedLayoutId = '') {
  const wid = String(widgetId || '').trim();
  const wantedLayoutId = String(requestedLayoutId || '').trim();
  const layouts = Array.isArray(doc?.layouts) ? doc.layouts : [];

  if (!layouts.length) {
    const layout = Array.isArray(doc?.layout) ? doc.layout : [];
    const widget = findWidgetInLayout(layout, wid);
    if (!widget) {
      return {
        ok: false,
        status: 404,
        error: `widget ${wid} not found`,
      };
    }
    return {
      ok: true,
      widget,
      layout,
      layoutId: '',
      activeLayoutId: '',
      layouts,
    };
  }

  const { layout: activeLayout, layoutId: activeLayoutId } = resolveActiveLayout(doc);
  const getLayoutById = (id) =>
    layouts.find((l) => String(l?.id || '').trim() === String(id || '').trim()) || null;

  if (wantedLayoutId) {
    const entry = getLayoutById(wantedLayoutId);
    if (!entry) {
      return {
        ok: false,
        status: 400,
        error: `unknown layout ${wantedLayoutId}`,
      };
    }
    const layout = Array.isArray(entry?.layout) ? entry.layout : [];
    const widget = findWidgetInLayout(layout, wid);
    if (!widget) {
      return {
        ok: false,
        status: 404,
        error: `widget ${wid} not found in layout ${wantedLayoutId}`,
      };
    }
    return {
      ok: true,
      widget,
      layout,
      layoutId: wantedLayoutId,
      activeLayoutId,
      layouts,
    };
  }

  const activeWidget = findWidgetInLayout(activeLayout, wid);
  if (activeWidget) {
    return {
      ok: true,
      widget: activeWidget,
      layout: activeLayout,
      layoutId: activeLayoutId,
      activeLayoutId,
      layouts,
    };
  }

  const matches = [];
  for (const entry of layouts) {
    const lid = String(entry?.id || '').trim();
    const layout = Array.isArray(entry?.layout) ? entry.layout : [];
    const widget = findWidgetInLayout(layout, wid);
    if (widget) {
      matches.push({ widget, layout, layoutId: lid });
    }
  }

  if (!matches.length) {
    return {
      ok: false,
      status: 404,
      error: `widget ${wid} not found`,
    };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      status: 409,
      error: `widget ${wid} is ambiguous across layouts`,
      layoutIds: matches.map((m) => m.layoutId).filter(Boolean),
    };
  }

  return {
    ok: true,
    widget: matches[0].widget,
    layout: matches[0].layout,
    layoutId: matches[0].layoutId,
    activeLayoutId,
    layouts,
  };
}

function isWidgetLive(widget = {}) {
  const raw = widget?.ui?.live;
  if (raw === true) return true;
  if (raw === 1) return true;
  if (typeof raw === 'string') {
    const norm = raw.trim().toLowerCase();
    if (norm === 'true' || norm === '1' || norm === 'yes' || norm === 'on') {
      return true;
    }
  }
  return false;
}

function normalizeWidgetRequestBody(input) {
  if (input === null || typeof input === 'undefined') return {};

  let out = input;
  let depth = 0;
  while (typeof out === 'string' && depth < 3) {
    const trimmed = out.trim();
    if (!trimmed) return {};
    const startsLikeJson =
      trimmed.startsWith('{') ||
      trimmed.startsWith('[') ||
      trimmed.startsWith('"');
    if (!startsLikeJson) break;
    try {
      out = JSON.parse(trimmed);
      depth += 1;
      continue;
    } catch {
      break;
    }
  }
  return out;
}

function normalizeColorTypeToken(rawType = '') {
  const t = String(rawType || '').trim().toLowerCase();
  if (!t) return '';
  if (t.includes('linearcolor')) return 'flinearcolor';
  if (t === 'fcolor' || (t.includes('fcolor') && !t.includes('linearcolor'))) {
    return 'fcolor';
  }
  if (t === 'color') return 'color';
  return t;
}

function inferColorTypeFromValue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const r = Number(value.R ?? value.r);
  const g = Number(value.G ?? value.g);
  const b = Number(value.B ?? value.b);
  const a = Number(value.A ?? value.a);
  const hasRgb =
    Number.isFinite(r) ||
    Number.isFinite(g) ||
    Number.isFinite(b);
  if (!hasRgb) return '';
  if (
    (Number.isFinite(r) && r > 1) ||
    (Number.isFinite(g) && g > 1) ||
    (Number.isFinite(b) && b > 1) ||
    (Number.isFinite(a) && a > 1)
  ) {
    return 'fcolor';
  }
  return 'flinearcolor';
}

function getWidgetColorBindingSignature(widget = {}) {
  const binding = widget?.binding || {};
  const owner = String(binding.ownerName || '').trim().toLowerCase();
  const path = String(binding.path || '').trim().toLowerCase();
  const property = String(binding.propertyName || '').trim().toLowerCase();
  return `${owner}::${path}::${property}`;
}

function getWidgetBindingColorType(widget = {}, doc = {}, rawValue = undefined) {
  const binding = widget?.binding || {};
  const widgetId = String(widget?.id || '').trim();
  if (widgetId) {
    const nextSig = getWidgetColorBindingSignature(widget);
    const prevSig = widgetColorBindingSigCache[widgetId] || '';
    if (prevSig && prevSig !== nextSig) {
      delete widgetColorTypeCache[widgetId];
    }
    widgetColorBindingSigCache[widgetId] = nextSig;
  }
  const declaredType = normalizeColorTypeToken(binding.valueType || '');
  if (declaredType && declaredType !== 'color') {
    if (widgetId) widgetColorTypeCache[widgetId] = declaredType;
    return declaredType;
  }

  if (widgetId && widgetColorTypeCache[widgetId]) {
    return widgetColorTypeCache[widgetId];
  }

  const props = Array.isArray(doc?.presetData?.props) ? doc.presetData.props : [];
  if (!props.length) {
    const inferred = inferColorTypeFromValue(rawValue);
    if (inferred) {
      if (widgetId) widgetColorTypeCache[widgetId] = inferred;
      return inferred;
    }
    return declaredType || 'color';
  }

  const bindingOwner = String(binding.ownerName || '').trim().toLowerCase();
  const bindingPath = String(binding.path || '').trim().toLowerCase();
  const bindingPropName = String(binding.propertyName || '').trim().toLowerCase();

  const matches = props.find((p) => {
    const ownerName = String(p?.ownerName || '').trim().toLowerCase();
    if (bindingOwner && ownerName && ownerName !== bindingOwner) return false;

    const raw = p?.raw || {};
    const underlying = raw?.UnderlyingProperty || raw?.underlyingProperty || {};
    const candidates = [
      p?.path,
      p?.displayName,
      p?.propertyName,
      raw?.Name,
      raw?.PropertyName,
      underlying?.Name,
      underlying?.DisplayName,
      underlying?.PropertyName
    ]
      .map((v) => String(v || '').trim().toLowerCase())
      .filter(Boolean);

    if (bindingPath && candidates.includes(bindingPath)) return true;
    if (bindingPropName && candidates.includes(bindingPropName)) return true;
    return false;
  });

  if (!matches) {
    const inferred = inferColorTypeFromValue(rawValue);
    if (inferred) {
      if (widgetId) widgetColorTypeCache[widgetId] = inferred;
      return inferred;
    }
    return declaredType || 'color';
  }

  const raw = matches?.raw || {};
  const underlying = raw?.UnderlyingProperty || raw?.underlyingProperty || {};
  const rawType = String(
    underlying?.Type ||
      underlying?.type ||
      raw?.Type ||
      raw?.type ||
      ''
  )
    .trim()
    .toLowerCase();

  const resolved = normalizeColorTypeToken(rawType);
  if (resolved) {
    if (widgetId) widgetColorTypeCache[widgetId] = resolved;
    return resolved;
  }
  const inferred = inferColorTypeFromValue(rawValue);
  if (inferred) {
    if (widgetId) widgetColorTypeCache[widgetId] = inferred;
    return inferred;
  }
  return declaredType || 'color';
}

function safeJsonHash(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return '';
  }
}

function getWidgetTargetIps(widget = {}) {
  const sel = widget?.targets || {};
  return Object.entries(sel)
    .filter(([ip, enabled]) => !!enabled && ip)
    .map(([ip]) => String(ip).trim());
}

function getTimelineRuntimeKey(projectId = '', layoutId = '', widgetId = '') {
  const pid = String(projectId || '').trim();
  const lid = String(layoutId || '').trim() || '__legacy_layout__';
  const wid = String(widgetId || '').trim();
  return `${pid}::${lid}::${wid}`;
}

function stopTimelineRuntimeEntry(entry = {}) {
  try {
    entry?.player?.stop?.();
  } catch {}
  entry.player = null;
  entry.playing = false;
}

function pruneTimelineRuntimesForProject(activeProjectId = '') {
  const pid = String(activeProjectId || '').trim();
  if (!pid) return;
  for (const [key, entry] of timelineRuntimeByKey.entries()) {
    if (String(entry?.projectId || '').trim() === pid) continue;
    stopTimelineRuntimeEntry(entry);
    timelineRuntimeByKey.delete(key);
  }
}

function resolveTimelineFpsFromHosts(hostsFile = '', timelineWidgets = [], fallback = 25) {
  const hosts =
    hostsFile && typeof hostsFile === 'string' ? readJSON(hostsFile) || {} : {};
  if (!hosts || typeof hosts !== 'object') return fallback;

  const targetIps = [];
  const seen = new Set();
  (Array.isArray(timelineWidgets) ? timelineWidgets : []).forEach((widget) => {
    Object.keys(widget?.targets || {}).forEach((ip) => {
      const key = String(ip || '').trim();
      if (!key || seen.has(key)) return;
      if (!widget?.targets?.[key]) return;
      seen.add(key);
      targetIps.push(key);
    });
  });

  const candidateIps = targetIps.length ? targetIps : Object.keys(hosts);
  const readHostFps = (hostCfg) => {
    if (!hostCfg || typeof hostCfg !== 'object') return null;
    const args = hostCfg.args && typeof hostCfg.args === 'object' ? hostCfg.args : {};
    const raw =
      args.FrameRateLimit ??
      args.frameRateLimit ??
      hostCfg.FrameRateLimit ??
      hostCfg.frameRateLimit;
    const fps = Number(raw);
    if (!Number.isFinite(fps) || fps <= 0) return null;
    return fps;
  };

  for (const ip of candidateIps) {
    const fps = readHostFps(hosts[ip]);
    if (Number.isFinite(fps) && fps > 0) return fps;
  }

  for (const hostCfg of Object.values(hosts)) {
    const fps = readHostFps(hostCfg);
    if (Number.isFinite(fps) && fps > 0) return fps;
  }

  return fallback;
}

function buildFunctionParametersFromWidget(widget = {}, overrideArgs = null) {
  const defaultArgs =
    widget?.binding?.argDefaults && typeof widget.binding.argDefaults === 'object'
      ? widget.binding.argDefaults
      : {};
  const currentArgs =
    widget?.binding?.argValues && typeof widget.binding.argValues === 'object'
      ? widget.binding.argValues
      : {};
  const rawArgs =
    overrideArgs && typeof overrideArgs === 'object'
      ? overrideArgs
      : { ...defaultArgs, ...currentArgs };
  const parameters = {};
  Object.entries(rawArgs || {}).forEach(([key, val]) => {
    if (val === '' || val === null || typeof val === 'undefined') return;
    parameters[key] = val;
  });
  return parameters;
}

function buildToggleFunctionWidget(widget = {}, nextValue = false) {
  const paramBools =
    widget?.binding?.paramBools && typeof widget.binding.paramBools === 'object'
      ? widget.binding.paramBools
      : {};
  const argValues = {};
  Object.keys(paramBools).forEach((name) => {
    const follows = !!paramBools[name];
    argValues[name] = follows ? !!nextValue : !nextValue;
  });
  return {
    ...widget,
    binding: {
      ...(widget?.binding || {}),
      kind: 'function',
      argValues,
    },
  };
}

async function sendTimelineFunctionToTargets({
  widget = {},
  targetIps = [],
  rcPort = 30010,
  presetName = 'RemoteControlPreset',
  parameters = {},
  action = 'timeline_dispatch',
}) {
  const displayName = widget?.binding?.displayName;
  if (!displayName) return [];
  const results = [];
  const widgetId = String(widget?.id || '').trim();
  const wtype = String(widget?.type || '').toLowerCase();

  for (const ip of targetIps) {
    const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
      presetName
    )}/function/${encodeURIComponent(displayName)}`;
    try {
      const r = await fetch(wrcUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Parameters: parameters || {},
          GenerateTransaction: true,
        }),
      });
      const txt = await r.text().catch(() => '');
      results.push({ ip, ok: r.ok, status: r.status, body: txt });
    } catch (e) {
      const errMsg = String(e && e.message ? e.message : e);
      logWrcCallError({
        ip,
        url: wrcUrl,
        widgetId,
        type: wtype,
        action,
        error: errMsg,
      });
      results.push({
        ip,
        ok: false,
        status: 0,
        error: errMsg,
      });
    }
  }

  return results;
}

async function sendTimelinePropertyToTargets({
  widget = {},
  targetIps = [],
  rcPort = 30010,
  presetName = 'RemoteControlPreset',
  propertyBody = null,
  path = '',
  action = 'timeline_dispatch',
}) {
  if (!path || !propertyBody || typeof propertyBody !== 'object') return [];
  const results = [];
  const widgetId = String(widget?.id || '').trim();
  const wtype = String(widget?.type || '').toLowerCase();
  for (const ip of targetIps) {
    const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
      presetName
    )}/property/${encodeURIComponent(path)}`;
    try {
      const r = await fetch(wrcUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propertyBody),
      });
      const txt = await r.text().catch(() => '');
      results.push({ ip, ok: r.ok, status: r.status, body: txt });
    } catch (e) {
      const errMsg = String(e && e.message ? e.message : e);
      logWrcCallError({
        ip,
        url: wrcUrl,
        widgetId,
        type: wtype,
        action,
        error: errMsg,
      });
      results.push({
        ip,
        ok: false,
        status: 0,
        error: errMsg,
      });
    }
  }
  return results;
}

async function dispatchTimelinePayloadToWrc(payload = {}, runtimeEntry = {}) {
  const kind = String(payload?.kind || '').trim().toLowerCase();
  const widget =
    payload?.widget && typeof payload.widget === 'object' ? payload.widget : null;
  if (!widget) return [];

  const targetIps = getWidgetTargetIps(widget);
  if (!targetIps.length) return [];

  const rcPort = Number(runtimeEntry?.rcPort || 30010);
  const presetName = String(runtimeEntry?.presetName || 'RemoteControlPreset');
  const doc = runtimeEntry?.doc || {};
  const wtype = String(widget?.type || '').toLowerCase();
  const action = `timeline_${kind || 'dispatch'}`;

  if (kind === 'event') {
    const overrideArgs =
      payload?.args && typeof payload.args === 'object' && !Array.isArray(payload.args)
        ? payload.args
        : null;
    const parameters = buildFunctionParametersFromWidget(widget, overrideArgs);
    return sendTimelineFunctionToTargets({
      widget,
      targetIps,
      rcPort,
      presetName,
      parameters,
      action,
    });
  }

  if (kind === 'toggle-function') {
    const fnWidget = buildToggleFunctionWidget(widget, !!payload?.value);
    const parameters = buildFunctionParametersFromWidget(fnWidget, null);
    return sendTimelineFunctionToTargets({
      widget: fnWidget,
      targetIps,
      rcPort,
      presetName,
      parameters,
      action,
    });
  }

  if (kind === 'joystick') {
    const value = payload?.value && typeof payload.value === 'object' ? payload.value : {};
    const linkType = String(widget?.ui?.linkType || 'vector2d').trim().toLowerCase();
    const xVal = Number(value?.X);
    const yVal = Number(value?.Y);
    const nextX = Number.isFinite(xVal) ? xVal : 0;
    const nextY = Number.isFinite(yVal) ? yVal : 0;

    if (linkType === 'manual') {
      const manualXPath = String(widget?.joystickBindings?.x?.path || '').trim();
      const manualYPath = String(widget?.joystickBindings?.y?.path || '').trim();
      let results = [];
      if (manualXPath) {
        results = results.concat(
          await sendTimelinePropertyToTargets({
            widget,
            targetIps,
            rcPort,
            presetName,
            path: manualXPath,
            propertyBody: {
              PropertyValue: nextX,
              GenerateTransaction: true,
            },
            action,
          })
        );
      }
      if (manualYPath) {
        results = results.concat(
          await sendTimelinePropertyToTargets({
            widget,
            targetIps,
            rcPort,
            presetName,
            path: manualYPath,
            propertyBody: {
              PropertyValue: nextY,
              GenerateTransaction: true,
            },
            action,
          })
        );
      }
      return results;
    }

    const path = String(widget?.binding?.path || '').trim();
    if (!path) return [];
    return sendTimelinePropertyToTargets({
      widget,
      targetIps,
      rcPort,
      presetName,
      path,
      propertyBody: {
        PropertyValue: { X: nextX, Y: nextY },
        GenerateTransaction: true,
      },
      action,
    });
  }

  if (kind === 'property') {
    const path = String(widget?.binding?.path || '').trim();
    if (!path) return [];

    const rawValue = payload?.value;
    let propertyBody;
    if (wtype === 'color') {
      const { buildColorPropertyBody } = await getColorUtils();
      const colorType = getWidgetBindingColorType(widget, doc, rawValue);
      propertyBody = buildColorPropertyBody(rawValue, colorType);
    } else {
      const valueForWrc =
        wtype === 'vector'
          ? toWrcVectorPropertyValue(widget, rawValue)
          : wtype === 'transform'
            ? toWrcTransformPropertyValue(rawValue)
            : rawValue;
      propertyBody = {
        PropertyValue: valueForWrc,
        GenerateTransaction: true,
      };
    }

    return sendTimelinePropertyToTargets({
      widget,
      targetIps,
      rcPort,
      presetName,
      path,
      propertyBody,
      action,
    });
  }

  return [];
}

function ensureTimelineRuntimePlayer(entry = {}) {
  if (entry.player) return entry.player;
  const timelineRaw = entry?.timelineRaw && typeof entry.timelineRaw === 'object'
    ? entry.timelineRaw
    : {};
  const timelineWidgets = Array.isArray(timelineRaw?.widgets) ? timelineRaw.widgets : [];
  const fps = resolveTimelineFpsFromHosts(entry.hostsFile, timelineWidgets);
  const startFrame =
    Number.isFinite(Number(entry.frame)) ? Number(entry.frame) : 0;
  const initialDirection = Number(entry.direction) === -1 ? -1 : 1;
  const player = createServerTimelinePlayer({
    timeline: timelineRaw,
    widgets: timelineWidgets,
    fps,
    startFrame,
    initialDirection,
    dispatch: (payload) => dispatchTimelinePayloadToWrc(payload, entry),
    onError: (err) => {
      if (typeof entry.logLine !== 'function') return;
      entry.logLine({
        level: 'warn',
        src: 'server',
        action: 'timeline_runtime_error',
        host: '',
        message: `timeline runtime error ${entry.widgetId || ''}`,
        data: {
          widgetId: entry.widgetId,
          layoutId: entry.layoutId,
          projectId: entry.projectId,
          error: err || {},
        },
      });
    },
    onFrame: (nextFrame) => {
      entry.frame = Number(nextFrame) || 0;
    },
    onStop: () => {
      entry.playing = false;
      if (!entry.paused) entry.boundary = null;
    },
    onBoundaryPause: (dir, frameAtBoundary) => {
      entry.frame = Number(frameAtBoundary) || 0;
      entry.direction = Number(dir) === -1 ? -1 : 1;
      entry.boundary = entry.direction < 0 ? 'end' : 'start';
      entry.paused = true;
      entry.playing = false;
    },
  });
  entry.player = player;
  entry.fps = fps;
  entry.maxFrame = Number(player?.getMaxFrame?.() || 0);
  return player;
}

async function executeTimelineTransportCommand({
  command = '',
  projectId = '',
  layoutId = '',
  timelineWidget = {},
  doc = {},
  rcPort = 30010,
  presetName = 'RemoteControlPreset',
  hostsFile = '',
  logLine = null,
}) {
  const widgetId = String(timelineWidget?.id || '').trim();
  const cmd = String(command || '').trim().toLowerCase();
  const key = getTimelineRuntimeKey(projectId, layoutId, widgetId);
  pruneTimelineRuntimesForProject(projectId);

  let entry = timelineRuntimeByKey.get(key);
  if (!entry) {
    entry = {
      key,
      projectId: String(projectId || '').trim(),
      layoutId: String(layoutId || '').trim(),
      widgetId,
      player: null,
      frame: 0,
      direction: 1,
      paused: false,
      playing: false,
      boundary: null,
      maxFrame: 0,
      fps: 25,
      timelineHash: '',
      timelineRaw: {},
      hostsFile: '',
      rcPort: 30010,
      presetName: 'RemoteControlPreset',
      logLine: null,
      doc: {},
    };
  }

  const timelineRaw =
    timelineWidget?.ui?.timeline && typeof timelineWidget.ui.timeline === 'object'
      ? timelineWidget.ui.timeline
      : {};
  const nextHash = safeJsonHash(timelineRaw);
  if (entry.timelineHash && entry.timelineHash !== nextHash) {
    stopTimelineRuntimeEntry(entry);
    entry.frame = 0;
    entry.direction = 1;
    entry.paused = false;
    entry.playing = false;
    entry.boundary = null;
  }

  entry.timelineHash = nextHash;
  entry.timelineRaw = timelineRaw;
  entry.doc = doc || {};
  entry.hostsFile = hostsFile || '';
  entry.rcPort = Number(rcPort || 30010);
  entry.presetName = String(presetName || 'RemoteControlPreset');
  entry.logLine = typeof logLine === 'function' ? logLine : null;
  timelineRuntimeByKey.set(key, entry);

  const buildState = () => {
    const player = entry.player;
    return {
      playing: !!entry.playing,
      paused: !!entry.paused,
      frame: Number(entry.frame) || 0,
      direction: Number(entry.direction) === -1 ? -1 : 1,
      boundary: entry.boundary || null,
      mode: player?.getMode?.() || String(timelineRaw?.mode || 'single'),
      maxFrame:
        Number(player?.getMaxFrame?.()) ||
        Number(entry.maxFrame) ||
        0,
      fps: Number(entry.fps) || 25,
    };
  };

  if (cmd === 'cue') {
    const player = ensureTimelineRuntimePlayer(entry);
    player?.seek?.(0, {
      triggerEvents: true,
      eventMode: 'state',
      forceEvents: true,
    });
    entry.frame = 0;
    entry.direction = 1;
    entry.paused = false;
    entry.boundary = null;
    entry.playing = !!player?.isPlaying?.();
    return {
      ok: true,
      backend: true,
      command: cmd,
      widgetId,
      layoutId,
      ...buildState(),
    };
  }

  if (cmd === 'play') {
    entry.direction = 1;
    entry.frame = 0;
    entry.paused = false;
    entry.boundary = null;
    stopTimelineRuntimeEntry(entry);
    const player = ensureTimelineRuntimePlayer(entry);
    const started = !!player?.start?.({ startFrame: 0, direction: 1 });
    entry.playing = started;
    entry.paused = false;
    return {
      ok: true,
      backend: true,
      command: cmd,
      started,
      widgetId,
      layoutId,
      ...buildState(),
    };
  }

  if (cmd === 'pause') {
    const player = entry.player;
    const wasPlaying = !!player?.isPlaying?.();
    if (wasPlaying) {
      entry.paused = true;
      player.pause?.();
      entry.playing = false;
    }
    return {
      ok: true,
      backend: true,
      command: cmd,
      pausedNow: !!entry.paused,
      widgetId,
      layoutId,
      ...buildState(),
    };
  }

  if (cmd === 'resume') {
    if (entry.player?.isPlaying?.()) {
      entry.playing = true;
      return {
        ok: true,
        backend: true,
        command: cmd,
        started: false,
        alreadyPlaying: true,
        widgetId,
        layoutId,
        ...buildState(),
      };
    }

    let dir = Number(entry.direction) === -1 ? -1 : 1;
    let startFrame = Number.isFinite(Number(entry.frame))
      ? Number(entry.frame)
      : 0;

    const mode =
      entry.player?.getMode?.() || String(timelineRaw?.mode || 'single');
    const maxFrame =
      Number(entry.player?.getMaxFrame?.()) ||
      Number(entry.maxFrame) ||
      0;
    if (mode === 'flipstopflop') {
      if (entry.boundary === 'end') {
        dir = -1;
        startFrame = Math.max(0, maxFrame - 1);
      } else if (entry.boundary === 'start') {
        dir = 1;
        startFrame = Math.min(maxFrame, 1);
      }
      entry.boundary = null;
    }

    entry.direction = dir;
    entry.frame = startFrame;
    entry.paused = false;
    stopTimelineRuntimeEntry(entry);
    const player = ensureTimelineRuntimePlayer(entry);
    const started = !!player?.start?.({
      startFrame,
      direction: dir,
    });
    entry.playing = started;
    return {
      ok: true,
      backend: true,
      command: cmd,
      started,
      widgetId,
      layoutId,
      ...buildState(),
    };
  }

  return {
    ok: false,
    backend: true,
    command: cmd,
    widgetId,
    layoutId,
    error: 'unsupported timeline command',
    ...buildState(),
  };
}

async function handleWidgets(req, res, url, context) {
  context = context || {};
  const { logLine, sendJSON, COMMON_FILE, HOSTS_FILE, parseBody } = context;

  // on mémorise la fonction de log dans une variable de module
  currentLogLine = (typeof logLine === 'function') ? logLine : null;

  if (typeof sendJSON !== 'function') {
    throw new Error('handleWidgets requires sendJSON in context');
  }
  if (!parseBody) {
    throw new Error('handleWidgets requires parseBody in context');
  }

  // ---- UI / Companion : widgets (press / nudge) ----
    if (url.pathname.startsWith('/agent/ui/widgets/')) {
      const parts = url.pathname.split('/');
      const widgetId = decodeURIComponent(parts[4] || '');
      const action = parts[5] || '';

      if (!widgetId) {
        return sendJSON(res, 400, { ok: false, error: 'missing widgetId' });
      }

      const method = req.method || 'GET';
      if (method !== 'POST' && method !== 'PUT') {
        return sendJSON(res, 405, { ok: false, error: 'method not allowed' });
      }

      const rawBody = await parseBody(req);
      const body = normalizeWidgetRequestBody(rawBody);

      const pj = loadProjects();
      const pid = pj.activeId || '';
      if (!pid) {
        return sendJSON(res, 400, { ok: false, error: 'no active project' });
      }

      const doc = readProjectDoc(pid) || {};
      const requestedLayoutId = String(
        url.searchParams.get('layoutId') ||
        (body && typeof body === 'object' ? body.layoutId : '') ||
        ''
      ).trim();
      const resolvedWidget = resolveWidgetContext(doc, widgetId, requestedLayoutId);
      if (!resolvedWidget?.ok) {
        return sendJSON(res, Number(resolvedWidget?.status) || 400, {
          ok: false,
          error: resolvedWidget?.error || `widget ${widgetId} not found`,
          widgetId,
          ...(Array.isArray(resolvedWidget?.layoutIds)
            ? { layoutIds: resolvedWidget.layoutIds }
            : {}),
        });
      }
      const widget = resolvedWidget.widget;
      const layout = resolvedWidget.layout;
      const layoutId = resolvedWidget.layoutId || '';
      const layouts = Array.isArray(resolvedWidget.layouts) ? resolvedWidget.layouts : [];
      if (layouts.length) {
        if (resolvedWidget.activeLayoutId) doc.activeLayoutId = resolvedWidget.activeLayoutId;
        doc.layout = Array.isArray(layout) ? layout : [];
      }

      const wtype = String(widget?.type || '').toLowerCase();
      const isTimelineWidget = wtype === 'timeline';
      const sel = widget.targets || {};
      const targetIps = Object.entries(sel)
        .filter(([ip, enabled]) => !!enabled && ip)
        .map(([ip]) => String(ip).trim());

      if (!targetIps.length && !isTimelineWidget) {
        return sendJSON(res, 200, {
          ok: true,
          widgetId,
          action,
          results: [],
          info: 'no active targets on widget',
        });
      }

      const common = readJSON(COMMON_FILE) || {};
      const rcPort = Number(common.rcHttpPort || 30010);
      const projectMeta = readProjectMeta(pid) || {};
      const projectPresetName = String(projectMeta?.wrcName || '').trim();
      const presetName =
        projectPresetName ||
        String(common.webRemoteControlName || 'RemoteControlPreset');

      const results = [];

      // ---------- ACTION: PRESS ----------
        if (action === 'press') {
          const isLive = isWidgetLive(widget);
          const bodyObj =
            body && typeof body === 'object' && !Array.isArray(body)
              ? body
              : {};
          const rawBodyAction = String(bodyObj.action || '').trim().toLowerCase();
          const wantsReset = rawBodyAction === 'reset';

          if (wtype === 'timeline') {
            const rawTimelineAction =
              bodyObj.action ??
              bodyObj.value ??
              (typeof body === 'string' ? body : '');
            const timelineAction = String(rawTimelineAction || '')
              .trim()
              .toLowerCase();
            const command = timelineAction || 'play';
            const allowed = new Set(['cue', 'play', 'pause', 'resume']);
            if (!allowed.has(command)) {
              return sendJSON(res, 400, {
                ok: false,
                error: 'invalid timeline action (expected cue|play|pause|resume)',
                widgetId,
                action,
                command,
              });
            }
            let timelineResult;
            try {
              timelineResult = await executeTimelineTransportCommand({
                command,
                projectId: pid,
                layoutId,
                timelineWidget: widget,
                doc,
                rcPort,
                presetName,
                hostsFile: HOSTS_FILE,
                logLine,
              });
            } catch (e) {
              const errMsg = String(e && e.message ? e.message : e);
              if (typeof logLine === 'function') {
                logLine({
                  level: 'error',
                  src: 'server',
                  action: 'timeline_transport_error',
                  host: '',
                  message: `timeline transport failed ${widgetId}`,
                  data: {
                    widgetId,
                    layoutId,
                    command,
                    error: errMsg,
                  },
                });
              }
              return sendJSON(res, 500, {
                ok: false,
                widgetId,
                action,
                type: wtype,
                layoutId,
                command,
                error: 'timeline backend transport failed',
                detail: errMsg,
              });
            }

            if (typeof logLine === 'function') {
              logLine({
                level: timelineResult?.ok ? 'info' : 'error',
                src: 'server',
                action: 'widget_press',
                host: '',
                message: `widget_press timeline ${widgetId}`,
                data: {
                  widgetId,
                  type: wtype,
                  layoutId,
                  command,
                  source: 'companion',
                  backend: true,
                  timelineState: timelineResult || {},
                },
              });
            }

            const status = timelineResult?.ok ? 200 : 400;
            return sendJSON(res, status, {
              ok: !!timelineResult?.ok,
              widgetId,
              action,
              type: wtype,
              layoutId,
              command,
              ...timelineResult,
            });
          }

        // Bouton = fonction WRC
                if (wtype === 'button') {
          const displayName = widget?.binding?.displayName;
          if (!displayName) {
            return sendJSON(res, 400, { ok: false, error: 'missing binding.displayName on widget' });
          }

          const defaultArgs =
            widget?.binding?.argDefaults &&
            typeof widget.binding.argDefaults === 'object'
              ? widget.binding.argDefaults
              : {};
          const currentArgs =
            widget?.binding?.argValues &&
            typeof widget.binding.argValues === 'object'
              ? widget.binding.argValues
              : {};
          if (wantsReset) {
            if (!widget.binding || typeof widget.binding !== 'object') {
              widget.binding = {};
            }
            widget.binding.argValues = cloneSerializable(defaultArgs) || {};
            try {
              writeProjectDoc(pid, doc);
            } catch (e) {
              console.error('[UltiUnreal][Agent] failed to persist button defaults', e);
            }
            return sendJSON(res, 200, {
              ok: true,
              widgetId,
              action,
              type: wtype,
              reset: true,
              argValues: widget.binding.argValues,
            });
          }
          const rawArgs = { ...defaultArgs, ...currentArgs };
          const parameters = {};
          if (rawArgs && typeof rawArgs === 'object') {
            for (const [key, val] of Object.entries(rawArgs)) {
              if (val === '' || val === null || typeof val === 'undefined') continue;
              parameters[key] = val;
            }
          }

          // Log résumé : press bouton (non live)
          logLine({
            level: 'info',
            src: 'server',
            action: 'widget_press',
            host: '',
            message: `widget_press button ${widgetId}`,
            data: {
              widgetId,
              type: wtype,
              parameters,
              live: false,
              targets: targetIps,
            },
          });

          for (const ip of targetIps) {
            const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
              presetName
            )}/function/${encodeURIComponent(displayName)}`;

            try {
              const r = await fetch(wrcUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  Parameters: parameters,
                  GenerateTransaction: true,
                }),
              });
              const txt = await r.text().catch(() => '');
              results.push({ ip, ok: r.ok, status: r.status, body: txt });
                        } catch (e) {
              const errMsg = String(e && e.message ? e.message : e);
              logWrcCallError({
                ip,
                url: wrcUrl,
                widgetId,
                type: wtype,
                action,
                error: errMsg,
              });
              results.push({
                ip,
                ok: false,
                status: 0,
                error: errMsg,
              });
            }
          }

          return sendJSON(res, 200, { ok: true, widgetId, action, type: wtype, results });
        }

        // Toggle = propriété booléenne
        if (wtype === 'toggle') {
          const path = widget?.binding?.path;
          if (!path) {
            return sendJSON(res, 400, { ok: false, error: 'missing binding.path on toggle widget' });
          }

          const toToggleBool = (raw, fallback = false) => {
            if (typeof raw === 'boolean') return raw;
            if (typeof raw === 'number' && Number.isFinite(raw)) return raw !== 0;
            if (typeof raw === 'string') {
              const s = raw.trim().toLowerCase();
              if (s === 'true' || s === '1' || s === 'on' || s === 'yes') return true;
              if (s === 'false' || s === '0' || s === 'off' || s === 'no' || s === '') return false;
            }
            return fallback;
          };

          let newValue;
          if (wantsReset) {
            const resetValue = resolveWidgetResetValue(widget, wtype);
            newValue = toToggleBool(
              typeof resetValue === 'undefined' ? false : resetValue,
              false
            );
          } else if (Object.prototype.hasOwnProperty.call(body, 'value')) {
            newValue = toToggleBool(body.value, false);
          } else {
            let cur = widgetRuntimeState[widgetId];
            if (typeof cur !== 'boolean') {
              const cv = widget.currentValue;
              cur = typeof cv === 'boolean' ? cv : false;
            }
            newValue = !cur;
          }
          widgetRuntimeState[widgetId] = newValue;
          widget.currentValue = newValue;
          try {
            writeProjectDoc(pid, doc);
          } catch (e) {
            console.error('[UltiUnreal][Agent] failed to persist toggle value', e);
          }

          // Log résumé : press toggle (non live)
          logLine({
            level: 'info',
            src: 'server',
            action: 'widget_press',
            host: '',
            message: `widget_press toggle ${widgetId}`,
            data: {
              widgetId,
              type: wtype,
              value: newValue,
              live: false,
              targets: targetIps,
            },
          });

          for (const ip of targetIps) {
            const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
              presetName
            )}/property/${encodeURIComponent(path)}`;

            try {
              const r = await fetch(wrcUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  PropertyValue: newValue,
                  GenerateTransaction: true,
                }),
              });
              const txt = await r.text().catch(() => '');
              results.push({ ip, ok: r.ok, status: r.status, body: txt });
            } catch (e) {
              const errMsg = String(e && e.message ? e.message : e);
              logWrcCallError({
                ip,
                url: wrcUrl,
                widgetId,
                type: wtype,
                action,
                error: errMsg,
              });
              results.push({
                ip,
                ok: false,
                status: 0,
                error: errMsg,
              });
            }
          }

          return sendJSON(res, 200, {
            ok: true,
            widgetId,
            action,
            type: wtype,
            ...(wantsReset ? { reset: true } : null),
            value: newValue,
            results,
          });
        }

        // Autres widgets propriété : dropdown, slider, joystick, vector, transform, color, text...
        const path = widget?.binding?.path;
        if (!path) {
          return sendJSON(res, 400, { ok: false, error: 'missing binding.path on widget' });
        }

        if (wantsReset) {
          const resetValue = resolveWidgetResetValue(widget, wtype);
          if (typeof resetValue === 'undefined') {
            return sendJSON(res, 400, {
              ok: false,
              error: 'no default value configured on widget',
              widgetId,
              type: wtype,
            });
          }
          widgetRuntimeState[widgetId] = resetValue;
          widget.currentValue = resetValue;
          try {
            writeProjectDoc(pid, doc);
          } catch (e) {
            console.error('[UltiUnreal][Agent] failed to persist widget default value', e);
          }
          return sendJSON(res, 200, {
            ok: true,
            widgetId,
            action,
            type: wtype,
            reset: true,
            value: resetValue,
            results: [],
          });
        }

        const bodyObjForValue =
          body && typeof body === 'object' && !Array.isArray(body) ? body : {};
        let hasValueInBody = Object.prototype.hasOwnProperty.call(bodyObjForValue, 'value');
        let value;

        const hasVectorDeltaInPress =
          wtype === 'vector' &&
          (
            Object.prototype.hasOwnProperty.call(bodyObjForValue, 'dX') ||
            Object.prototype.hasOwnProperty.call(bodyObjForValue, 'dx') ||
            Object.prototype.hasOwnProperty.call(bodyObjForValue, 'dY') ||
            Object.prototype.hasOwnProperty.call(bodyObjForValue, 'dy') ||
            Object.prototype.hasOwnProperty.call(bodyObjForValue, 'dZ') ||
            Object.prototype.hasOwnProperty.call(bodyObjForValue, 'dz')
          );

        // 1) Companion fournit explicitement une valeur (Ex. {"value":"#ff0000|1.000"})
        if (hasValueInBody) {
          value = bodyObjForValue.value;

        // 1bis) Vector: accepter aussi les deltas via /press (compat old Companion buttons)
        } else if (hasVectorDeltaInPress) {
          const base =
            widgetRuntimeState[widgetId] ||
            widget.currentValue ||
            widget.defaultValue ||
            {};
          const curX = Number(base?.X);
          const curY = Number(base?.Y);
          const curZ = Number(base?.Z);
          let dX = Number(bodyObjForValue.dX ?? bodyObjForValue.dx ?? 0);
          let dY = Number(bodyObjForValue.dY ?? bodyObjForValue.dy ?? 0);
          let dZ = Number(bodyObjForValue.dZ ?? bodyObjForValue.dz ?? 0);
          if (!Number.isFinite(dX)) dX = 0;
          if (!Number.isFinite(dY)) dY = 0;
          if (!Number.isFinite(dZ)) dZ = 0;
          value = {
            X: (Number.isFinite(curX) ? curX : 0) + dX,
            Y: (Number.isFinite(curY) ? curY : 0) + dY,
            Z: (Number.isFinite(curZ) ? curZ : 0) + dZ,
          };
          hasValueInBody = true;

        // 2) Sinon, on prend en priorité la valeur courante du layout (UI)
        } else if (Object.prototype.hasOwnProperty.call(widget, 'currentValue')) {
          value = widget.currentValue;

        // 3) Sinon, on regarde la dernière valeur utilisée en runtime pendant cette session
        } else if (Object.prototype.hasOwnProperty.call(widgetRuntimeState, widgetId)) {
          value = widgetRuntimeState[widgetId];

        // 4) Sinon, la valeur par défaut du widget (menu édition)
        } else if (Object.prototype.hasOwnProperty.call(widget, 'defaultValue')) {
          value = widget.defaultValue;

        // 5) Rien trouvé → erreur explicite
        } else {
          return sendJSON(res, 400, {
            ok: false,
            error: 'no value provided and no current/defaultValue on widget',
          });
        }

        // On mémorise la dernière valeur envoyée pour ce widget (mémoire runtime seulement)
        widgetRuntimeState[widgetId] = value;

        // Log résumé uniquement si le widget n'est pas en mode "live"
        if (!isLive) {
          logLine({
            level: 'info',
            src: 'server',
            action: 'widget_press',
            host: '',
            message: `widget_press ${wtype} ${widgetId}`,
            data: {
              widgetId,
              type: wtype,
              value,
              live: false,
              targets: targetIps,
            },
          });
        }
        
        // IMPORTANT :
        // - Si Companion a fourni UNE valeur (body.value présent), on met à jour le layout
        //   pour que l’UI reflète le changement.
        // - Si body {} (aucune valeur), on n’écrit PAS dans le layout → l’UI ne bouge pas.
        if (hasValueInBody) {
          widget.currentValue = value;
          try {
            writeProjectDoc(pid, doc);
          } catch (e) {
            console.error('[UltiUnreal][Agent] failed to persist widget value', e);
          }
        }

        // Corps de requête WRC (gestion spéciale de la couleur)
        let propertyBody;
        if (wtype === 'color') {
          const { buildColorPropertyBody } = await getColorUtils();
          const colorType = getWidgetBindingColorType(widget, doc, value);
          propertyBody = buildColorPropertyBody(value, colorType);
        } else {
          const valueForWrc =
            wtype === 'vector'
              ? toWrcVectorPropertyValue(widget, value)
              : wtype === 'transform'
                ? toWrcTransformPropertyValue(value)
                : value;
          propertyBody = {
            PropertyValue: valueForWrc,
            GenerateTransaction: true,
          };
        }

        // Envoi WRC vers toutes les cibles actives du widget
        for (const ip of targetIps) {
          const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
            presetName
          )}/property/${encodeURIComponent(path)}`;

          try {
            const r = await fetch(wrcUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(propertyBody),
            });
            const txt = await r.text().catch(() => '');
            results.push({ ip, ok: r.ok, status: r.status, body: txt });
          } catch (e) {
            logWrcCallError({
              ip,
              url: wrcUrl,
              widgetId,
              type: wtype,
              action,
              error: String(e && e.message ? e.message : e),
            });
            results.push({
              ip,
              ok: false,
              status: 0,
              error: String(e && e.message ? e.message : e),
            });
          }
        }

        return sendJSON(res, 200, {
          ok: true,
          widgetId,
          action,
          type: wtype,
          value,
          results,
        });
      }

      // ---------- ACTION: NUDGE ----------
      if (action === 'nudge') {
        const bodyObj =
          body && typeof body === 'object' && !Array.isArray(body)
            ? body
            : {};
        const isLive = isWidgetLive(widget);
        const rawBodyAction = String(bodyObj.action || '').trim().toLowerCase();
        const wantsReset = rawBodyAction === 'reset';

        if (wantsReset) {
          const resetValue = resolveWidgetResetValue(widget, wtype);
          if (typeof resetValue === 'undefined') {
            return sendJSON(res, 400, {
              ok: false,
              error: 'no default value configured on widget',
              widgetId,
              type: wtype,
            });
          }
          widgetRuntimeState[widgetId] = resetValue;
          widget.currentValue = resetValue;
          try {
            writeProjectDoc(pid, doc);
          } catch (e) {
            console.error('[UltiUnreal][Agent] failed to persist widget default value', e);
          }
          return sendJSON(res, 200, {
            ok: true,
            widgetId,
            action,
            type: wtype,
            reset: true,
            value: resetValue,
            results: [],
          });
        }

        // Slider : delta sur une valeur numérique
        if (wtype === 'slider') {
          const path = widget?.binding?.path;
          if (!path) {
            return sendJSON(res, 400, { ok: false, error: 'missing binding.path on slider widget' });
          }

          const ui = widget.ui || {};
          let min = typeof ui.min === 'number' ? ui.min : 0;
          let max = typeof ui.max === 'number' ? ui.max : 1;
          if (min > max) {
            const tmp = min;
            min = max;
            max = tmp;
          }

          const hasSliderValue = Object.prototype.hasOwnProperty.call(bodyObj, 'value');
          const hasSliderDelta = Object.prototype.hasOwnProperty.call(bodyObj, 'delta');
          let value;
          if (hasSliderValue) {
            value = Number(bodyObj.value);
            if (!Number.isFinite(value)) value = min;
          } else {
            let delta = Number(bodyObj.delta || 0);
            if (!Number.isFinite(delta)) delta = 0;

            let cur = widgetRuntimeState[widgetId];
            if (typeof cur !== 'number') {
              if (typeof widget.currentValue === 'number') cur = widget.currentValue;
              else if (typeof ui.default === 'number') cur = ui.default;
              else cur = min;
            }

            value = cur + delta;
          }

          if (value < min) value = min;
          if (value > max) value = max;

          widgetRuntimeState[widgetId] = value;
          widget.currentValue = value;
          try {
            writeProjectDoc(pid, doc);
          } catch (e) {
            console.error('[UltiUnreal][Agent] failed to persist slider value', e);
          }

          const sliderDispatch = resolveNudgeDispatchMeta({
            isLive,
            hasAdjust: hasSliderValue || hasSliderDelta,
          });
          if (!sliderDispatch.shouldDispatchNow) {
            logWidgetNudge({
              logLine,
              widgetId,
              wtype,
              isLive,
              dispatchState: sliderDispatch.dispatchState,
              dispatchReason: sliderDispatch.dispatchReason,
              path,
              value,
              valueForWrc: value,
              targets: targetIps,
              results: [],
            });
            return sendJSON(res, 200, {
              ok: true,
              widgetId,
              action,
              type: wtype,
              value,
              staged: true,
              dispatched: false,
              dispatchReason: sliderDispatch.dispatchReason,
              results: [],
            });
          }

          const valueForWrc = toWrcTransformPropertyValue(value);
          for (const ip of targetIps) {
            const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
              presetName
            )}/property/${encodeURIComponent(path)}`;

          try {
            const r = await fetch(wrcUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                PropertyValue: valueForWrc,
                GenerateTransaction: true,
              }),
            });
            const txt = await r.text().catch(() => '');
            results.push({ ip, ok: r.ok, status: r.status, body: txt });
          } catch (e) {
            logWrcCallError({
              ip,
              url: wrcUrl,
              widgetId,
              type: wtype,
              action,
              error: String(e && e.message ? e.message : e),
            });
            results.push({
              ip,
              ok: false,
              status: 0,
              error: String(e && e.message ? e.message : e),
            });
          }
          }

          logWidgetNudge({
            logLine,
            widgetId,
            wtype,
            isLive,
            dispatchState: sliderDispatch.dispatchState,
            dispatchReason: sliderDispatch.dispatchReason,
            path,
            value,
            valueForWrc,
            targets: targetIps,
            results,
          });
          return sendJSON(res, 200, {
            ok: true,
            widgetId,
            action,
            type: wtype,
            value,
            staged: false,
            dispatched: true,
            dispatchReason: sliderDispatch.dispatchReason,
            results,
          });
        }

        // Joystick : delta sur X / Y
        if (wtype === 'joystick') {
          const ui = widget.ui || {};
          const linkType = String(ui.linkType || 'vector2d').trim().toLowerCase();

          const vectorPath = widget?.binding?.path;
          const manualXPath = widget?.joystickBindings?.x?.path;
          const manualYPath = widget?.joystickBindings?.y?.path;

          if (linkType === 'manual') {
            if (!manualXPath && !manualYPath) {
              return sendJSON(res, 400, {
                ok: false,
                error: 'missing joystickBindings.x.path and joystickBindings.y.path on joystick widget',
              });
            }
          } else if (!vectorPath) {
            return sendJSON(res, 400, { ok: false, error: 'missing binding.path on joystick widget' });
          }

          let minX = Number(ui.minX);
          let maxX = Number(ui.maxX);
          let minY = Number(ui.minY);
          let maxY = Number(ui.maxY);
          if (!Number.isFinite(minX)) minX = -1;
          if (!Number.isFinite(maxX)) maxX = 1;
          if (!Number.isFinite(minY)) minY = -1;
          if (!Number.isFinite(maxY)) maxY = 1;

          const base = widgetRuntimeState[widgetId] || widget.currentValue || widget.defaultValue || {};
          let curX = typeof base.X === 'number' ? base.X : 0;
          let curY = typeof base.Y === 'number' ? base.Y : 0;
          let curZ = typeof base.Z === 'number' ? base.Z : 0;

          const hasJoystickValue = Object.prototype.hasOwnProperty.call(bodyObj, 'value');
          const hasJoystickDx =
            Object.prototype.hasOwnProperty.call(bodyObj, 'dx') ||
            Object.prototype.hasOwnProperty.call(bodyObj, 'dX');
          const hasJoystickDy =
            Object.prototype.hasOwnProperty.call(bodyObj, 'dy') ||
            Object.prototype.hasOwnProperty.call(bodyObj, 'dY');

          let hasJoystickValueX = false;
          let hasJoystickValueY = false;
          let newX = curX;
          let newY = curY;
          let newZ = curZ;

          if (hasJoystickValue) {
            const rawValue = bodyObj.value;
            if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
              return sendJSON(res, 400, {
                ok: false,
                error: 'invalid value on joystick nudge: expected object {X,Y}',
              });
            }

            const rawX = rawValue.X ?? rawValue.x;
            const rawY = rawValue.Y ?? rawValue.y;
            const rawZ = rawValue.Z ?? rawValue.z;

            hasJoystickValueX = typeof rawX !== 'undefined';
            hasJoystickValueY = typeof rawY !== 'undefined';
            if (!hasJoystickValueX && !hasJoystickValueY) {
              return sendJSON(res, 400, {
                ok: false,
                error: 'invalid value on joystick nudge: expected at least X or Y',
              });
            }

            let absX = Number(hasJoystickValueX ? rawX : curX);
            if (!Number.isFinite(absX)) absX = curX;
            let absY = Number(hasJoystickValueY ? rawY : curY);
            if (!Number.isFinite(absY)) absY = curY;
            const absZ = Number(rawZ);

            newX = absX;
            newY = absY;
            if (Number.isFinite(absZ)) newZ = absZ;
          } else {
            let dx = Number(bodyObj.dx ?? bodyObj.dX ?? 0);
            if (!Number.isFinite(dx)) dx = 0;
            let dy = Number(bodyObj.dy ?? bodyObj.dY ?? 0);
            if (!Number.isFinite(dy)) dy = 0;

            newX = curX + dx;
            newY = curY + dy;
          }

          if (newX < minX) newX = minX;
          if (newX > maxX) newX = maxX;
          if (newY < minY) newY = minY;
          if (newY > maxY) newY = maxY;

          const value = { X: newX, Y: newY, Z: newZ };
          widgetRuntimeState[widgetId] = value;
          widget.currentValue = value;
          try {
            writeProjectDoc(pid, doc);
          } catch (e) {
            console.error('[UltiUnreal][Agent] failed to persist joystick value', e);
          }

          const hasJoystickAdjust = hasJoystickValue || hasJoystickDx || hasJoystickDy;
          const joystickDispatch = resolveNudgeDispatchMeta({
            isLive,
            hasAdjust: hasJoystickAdjust,
          });
          const joystickPath =
            linkType === 'manual'
              ? { x: manualXPath || '', y: manualYPath || '' }
              : vectorPath;
          if (!joystickDispatch.shouldDispatchNow) {
            logWidgetNudge({
              logLine,
              widgetId,
              wtype,
              isLive,
              dispatchState: joystickDispatch.dispatchState,
              dispatchReason: joystickDispatch.dispatchReason,
              path: joystickPath,
              value,
              valueForWrc: value,
              targets: targetIps,
              results: [],
            });
            return sendJSON(res, 200, {
              ok: true,
              widgetId,
              action,
              type: wtype,
              value,
              staged: true,
              dispatched: false,
              dispatchReason: joystickDispatch.dispatchReason,
              results: [],
            });
          }

          for (const ip of targetIps) {
            if (linkType === 'manual') {
              let shouldWriteX = true;
              let shouldWriteY = true;
              if (hasJoystickValue) {
                shouldWriteX = hasJoystickValueX;
                shouldWriteY = hasJoystickValueY;
              } else if (hasJoystickAdjust) {
                shouldWriteX = hasJoystickDx;
                shouldWriteY = hasJoystickDy;
              }
              const manualWrites = [];
              if (manualXPath && shouldWriteX) {
                manualWrites.push({ path: manualXPath, value: newX });
              }
              if (manualYPath && shouldWriteY) {
                manualWrites.push({ path: manualYPath, value: newY });
              }

              for (const entry of manualWrites) {
                const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
                  presetName
                )}/property/${encodeURIComponent(entry.path)}`;

                try {
                  const r = await fetch(wrcUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      PropertyValue: entry.value,
                      GenerateTransaction: true,
                    }),
                  });
                  const txt = await r.text().catch(() => '');
                  results.push({ ip, ok: r.ok, status: r.status, body: txt });
                } catch (e) {
                  logWrcCallError({
                    ip,
                    url: wrcUrl,
                    widgetId,
                    type: wtype,
                    action,
                    error: String(e && e.message ? e.message : e),
                  });
                  results.push({
                    ip,
                    ok: false,
                    status: 0,
                    error: String(e && e.message ? e.message : e),
                  });
                }
              }
              continue;
            }

            const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
              presetName
            )}/property/${encodeURIComponent(vectorPath)}`;

            try {
              const r = await fetch(wrcUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  PropertyValue: value,
                  GenerateTransaction: true,
                }),
              });
              const txt = await r.text().catch(() => '');
              results.push({ ip, ok: r.ok, status: r.status, body: txt });
            } catch (e) {
              logWrcCallError({
                ip,
                url: wrcUrl,
                widgetId,
                type: wtype,
                action,
                error: String(e && e.message ? e.message : e),
              });
              results.push({
                ip,
                ok: false,
                status: 0,
                error: String(e && e.message ? e.message : e),
              });
            }
          }

          const joystickValueForWrc =
            linkType === 'manual'
              ? { X: newX, Y: newY }
              : value;
          logWidgetNudge({
            logLine,
            widgetId,
            wtype,
            isLive,
            dispatchState: joystickDispatch.dispatchState,
            dispatchReason: joystickDispatch.dispatchReason,
            path: joystickPath,
            value,
            valueForWrc: joystickValueForWrc,
            targets: targetIps,
            results,
          });
          return sendJSON(res, 200, {
            ok: true,
            widgetId,
            action,
            type: wtype,
            value,
            staged: false,
            dispatched: true,
            dispatchReason: joystickDispatch.dispatchReason,
            results,
          });
        }

        // Vector3 : delta sur X / Y / Z
        if (wtype === 'vector') {
          const path = widget?.binding?.path;
          if (!path) {
            return sendJSON(res, 400, { ok: false, error: 'missing binding.path on vector widget' });
          }

          const ui = widget.ui || {};
          const base = widgetRuntimeState[widgetId] || widget.currentValue || {};
          let curX = typeof base.X === 'number' ? base.X :
                     typeof ui.defaultX === 'number' ? ui.defaultX : 0;
          let curY = typeof base.Y === 'number' ? base.Y :
                     typeof ui.defaultY === 'number' ? ui.defaultY : 0;
          let curZ = typeof base.Z === 'number' ? base.Z :
                     typeof ui.defaultZ === 'number' ? ui.defaultZ : 0;

          const hasVectorValue = Object.prototype.hasOwnProperty.call(bodyObj, 'value');
          const hasVectorDx =
            Object.prototype.hasOwnProperty.call(bodyObj, 'dX') ||
            Object.prototype.hasOwnProperty.call(bodyObj, 'dx');
          const hasVectorDy =
            Object.prototype.hasOwnProperty.call(bodyObj, 'dY') ||
            Object.prototype.hasOwnProperty.call(bodyObj, 'dy');
          const hasVectorDz =
            Object.prototype.hasOwnProperty.call(bodyObj, 'dZ') ||
            Object.prototype.hasOwnProperty.call(bodyObj, 'dz');

          let value;
          if (hasVectorValue) {
            const rawValue = bodyObj.value;
            if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
              return sendJSON(res, 400, {
                ok: false,
                error: 'invalid value on vector nudge: expected object {X,Y,Z}',
              });
            }

            const hasValueX = typeof (rawValue.X ?? rawValue.x) !== 'undefined';
            const hasValueY = typeof (rawValue.Y ?? rawValue.y) !== 'undefined';
            const hasValueZ = typeof (rawValue.Z ?? rawValue.z) !== 'undefined';
            if (!hasValueX && !hasValueY && !hasValueZ) {
              return sendJSON(res, 400, {
                ok: false,
                error: 'invalid value on vector nudge: expected at least X, Y or Z',
              });
            }

            let absX = Number(hasValueX ? (rawValue.X ?? rawValue.x) : curX);
            if (!Number.isFinite(absX)) absX = curX;
            let absY = Number(hasValueY ? (rawValue.Y ?? rawValue.y) : curY);
            if (!Number.isFinite(absY)) absY = curY;
            let absZ = Number(hasValueZ ? (rawValue.Z ?? rawValue.z) : curZ);
            if (!Number.isFinite(absZ)) absZ = curZ;

            value = { X: absX, Y: absY, Z: absZ };
          } else {
            let dX = Number(bodyObj.dX ?? bodyObj.dx ?? 0);
            if (!Number.isFinite(dX)) dX = 0;
            let dY = Number(bodyObj.dY ?? bodyObj.dy ?? 0);
            if (!Number.isFinite(dY)) dY = 0;
            let dZ = Number(bodyObj.dZ ?? bodyObj.dz ?? 0);
            if (!Number.isFinite(dZ)) dZ = 0;

            value = {
              X: curX + dX,
              Y: curY + dY,
              Z: curZ + dZ,
            };
          }
          widgetRuntimeState[widgetId] = value;
          widget.currentValue = value;
          try {
            writeProjectDoc(pid, doc);
          } catch (e) {
            console.error('[UltiUnreal][Agent] failed to persist vector value', e);
          }

          const hasVectorAdjust = hasVectorValue || hasVectorDx || hasVectorDy || hasVectorDz;
          const vectorDispatch = resolveNudgeDispatchMeta({
            isLive,
            hasAdjust: hasVectorAdjust,
          });
          if (!vectorDispatch.shouldDispatchNow) {
            logWidgetNudge({
              logLine,
              widgetId,
              wtype,
              isLive,
              dispatchState: vectorDispatch.dispatchState,
              dispatchReason: vectorDispatch.dispatchReason,
              path,
              value,
              valueForWrc: toWrcVectorPropertyValue(widget, value),
              targets: targetIps,
              results: [],
            });
            return sendJSON(res, 200, {
              ok: true,
              widgetId,
              action,
              type: wtype,
              value,
              staged: true,
              dispatched: false,
              dispatchReason: vectorDispatch.dispatchReason,
              results: [],
            });
          }

          const valueForWrc = toWrcVectorPropertyValue(widget, value);
          for (const ip of targetIps) {
            const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
              presetName
            )}/property/${encodeURIComponent(path)}`;

          try {
            const r = await fetch(wrcUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                PropertyValue: valueForWrc,
                GenerateTransaction: true,
              }),
            });
            const txt = await r.text().catch(() => '');
            results.push({ ip, ok: r.ok, status: r.status, body: txt });
          } catch (e) {
            logWrcCallError({
              ip,
              url: wrcUrl,
              widgetId,
              type: wtype,
              action,
              error: String(e && e.message ? e.message : e),
            });
            results.push({
              ip,
              ok: false,
              status: 0,
              error: String(e && e.message ? e.message : e),
            });
          }
          }

          logWidgetNudge({
            logLine,
            widgetId,
            wtype,
            isLive,
            dispatchState: vectorDispatch.dispatchState,
            dispatchReason: vectorDispatch.dispatchReason,
            path,
            value,
            valueForWrc,
            targets: targetIps,
            results,
          });
          return sendJSON(res, 200, {
            ok: true,
            widgetId,
            action,
            type: wtype,
            value,
            staged: false,
            dispatched: true,
            dispatchReason: vectorDispatch.dispatchReason,
            results,
          });
        }

        // Transform : delta sur Location / Rotation / Scale
        if (wtype === 'transform') {
          const path = widget?.binding?.path;
          if (!path) {
            return sendJSON(res, 400, { ok: false, error: 'missing binding.path on transform widget' });
          }

          const base = widgetRuntimeState[widgetId] || widget.currentValue || {};
          const loc =
            base.Location && typeof base.Location === 'object'
              ? base.Location
              : base.Translation && typeof base.Translation === 'object'
                ? base.Translation
                : {};
          const rot = base.Rotation || {};
          const scl = base.Scale3D || {};

          let locX = Number(loc.X); if (!Number.isFinite(locX)) locX = 0;
          let locY = Number(loc.Y); if (!Number.isFinite(locY)) locY = 0;
          let locZ = Number(loc.Z); if (!Number.isFinite(locZ)) locZ = 0;

          let pitch = Number(rot.Pitch); if (!Number.isFinite(pitch)) pitch = 0;
          let yaw   = Number(rot.Yaw);   if (!Number.isFinite(yaw))   yaw   = 0;
          let roll  = Number(rot.Roll);  if (!Number.isFinite(roll))  roll  = 0;

          let scaleX = Number(scl.X); if (!Number.isFinite(scaleX)) scaleX = 1;
          let scaleY = Number(scl.Y); if (!Number.isFinite(scaleY)) scaleY = 1;
          let scaleZ = Number(scl.Z); if (!Number.isFinite(scaleZ)) scaleZ = 1;

          const hasTransformValue = Object.prototype.hasOwnProperty.call(bodyObj, 'value');
          const hasTransformDelta = [
            'dLocX',
            'dlocx',
            'dLocY',
            'dlocy',
            'dLocZ',
            'dlocz',
            'dRotPitch',
            'drotpitch',
            'dRotYaw',
            'drotyaw',
            'dRotRoll',
            'drotroll',
            'dScaleX',
            'dscalex',
            'dScaleY',
            'dscaley',
            'dScaleZ',
            'dscalez',
          ].some((k) => Object.prototype.hasOwnProperty.call(bodyObj, k));

          let value;
          if (hasTransformValue) {
            const rawValue = bodyObj.value;
            if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
              return sendJSON(res, 400, {
                ok: false,
                error: 'invalid value on transform nudge: expected object {Location,Rotation,Scale3D}',
              });
            }

            const rawLoc =
              rawValue.Location && typeof rawValue.Location === 'object'
                ? rawValue.Location
                : rawValue.Translation && typeof rawValue.Translation === 'object'
                  ? rawValue.Translation
                  : {};
            const rawRot =
              rawValue.Rotation && typeof rawValue.Rotation === 'object'
                ? rawValue.Rotation
                : {};
            const rawScale =
              rawValue.Scale3D && typeof rawValue.Scale3D === 'object'
                ? rawValue.Scale3D
                : rawValue.Scale && typeof rawValue.Scale === 'object'
                  ? rawValue.Scale
                  : {};

            const hasLocX = typeof (rawLoc.X ?? rawLoc.x) !== 'undefined';
            const hasLocY = typeof (rawLoc.Y ?? rawLoc.y) !== 'undefined';
            const hasLocZ = typeof (rawLoc.Z ?? rawLoc.z) !== 'undefined';
            const hasRotPitch = typeof (rawRot.Pitch ?? rawRot.pitch) !== 'undefined';
            const hasRotYaw = typeof (rawRot.Yaw ?? rawRot.yaw) !== 'undefined';
            const hasRotRoll = typeof (rawRot.Roll ?? rawRot.roll) !== 'undefined';
            const hasScaleX = typeof (rawScale.X ?? rawScale.x) !== 'undefined';
            const hasScaleY = typeof (rawScale.Y ?? rawScale.y) !== 'undefined';
            const hasScaleZ = typeof (rawScale.Z ?? rawScale.z) !== 'undefined';

            const hasAnyTransformField =
              hasLocX ||
              hasLocY ||
              hasLocZ ||
              hasRotPitch ||
              hasRotYaw ||
              hasRotRoll ||
              hasScaleX ||
              hasScaleY ||
              hasScaleZ;

            if (!hasAnyTransformField) {
              return sendJSON(res, 400, {
                ok: false,
                error: 'invalid value on transform nudge: expected at least one transform field',
              });
            }

            let nextLocX = Number(hasLocX ? (rawLoc.X ?? rawLoc.x) : locX);
            if (!Number.isFinite(nextLocX)) nextLocX = locX;
            let nextLocY = Number(hasLocY ? (rawLoc.Y ?? rawLoc.y) : locY);
            if (!Number.isFinite(nextLocY)) nextLocY = locY;
            let nextLocZ = Number(hasLocZ ? (rawLoc.Z ?? rawLoc.z) : locZ);
            if (!Number.isFinite(nextLocZ)) nextLocZ = locZ;

            let nextPitch = Number(hasRotPitch ? (rawRot.Pitch ?? rawRot.pitch) : pitch);
            if (!Number.isFinite(nextPitch)) nextPitch = pitch;
            let nextYaw = Number(hasRotYaw ? (rawRot.Yaw ?? rawRot.yaw) : yaw);
            if (!Number.isFinite(nextYaw)) nextYaw = yaw;
            let nextRoll = Number(hasRotRoll ? (rawRot.Roll ?? rawRot.roll) : roll);
            if (!Number.isFinite(nextRoll)) nextRoll = roll;

            let nextScaleX = Number(hasScaleX ? (rawScale.X ?? rawScale.x) : scaleX);
            if (!Number.isFinite(nextScaleX)) nextScaleX = scaleX;
            let nextScaleY = Number(hasScaleY ? (rawScale.Y ?? rawScale.y) : scaleY);
            if (!Number.isFinite(nextScaleY)) nextScaleY = scaleY;
            let nextScaleZ = Number(hasScaleZ ? (rawScale.Z ?? rawScale.z) : scaleZ);
            if (!Number.isFinite(nextScaleZ)) nextScaleZ = scaleZ;

            value = {
              Location: {
                X: nextLocX,
                Y: nextLocY,
                Z: nextLocZ,
              },
              Rotation: {
                Pitch: nextPitch,
                Yaw: nextYaw,
                Roll: nextRoll,
              },
              Scale3D: {
                X: nextScaleX,
                Y: nextScaleY,
                Z: nextScaleZ,
              },
            };
          } else {
            let dLocX = Number(bodyObj.dLocX ?? bodyObj.dlocx ?? 0);
            if (!Number.isFinite(dLocX)) dLocX = 0;
            let dLocY = Number(bodyObj.dLocY ?? bodyObj.dlocy ?? 0);
            if (!Number.isFinite(dLocY)) dLocY = 0;
            let dLocZ = Number(bodyObj.dLocZ ?? bodyObj.dlocz ?? 0);
            if (!Number.isFinite(dLocZ)) dLocZ = 0;

            let dRotPitch = Number(bodyObj.dRotPitch ?? bodyObj.drotpitch ?? 0);
            if (!Number.isFinite(dRotPitch)) dRotPitch = 0;
            let dRotYaw = Number(bodyObj.dRotYaw ?? bodyObj.drotyaw ?? 0);
            if (!Number.isFinite(dRotYaw)) dRotYaw = 0;
            let dRotRoll = Number(bodyObj.dRotRoll ?? bodyObj.drotroll ?? 0);
            if (!Number.isFinite(dRotRoll)) dRotRoll = 0;

            let dScaleX = Number(bodyObj.dScaleX ?? bodyObj.dscalex ?? 0);
            if (!Number.isFinite(dScaleX)) dScaleX = 0;
            let dScaleY = Number(bodyObj.dScaleY ?? bodyObj.dscaley ?? 0);
            if (!Number.isFinite(dScaleY)) dScaleY = 0;
            let dScaleZ = Number(bodyObj.dScaleZ ?? bodyObj.dscalez ?? 0);
            if (!Number.isFinite(dScaleZ)) dScaleZ = 0;

            value = {
              Location: {
                X: locX + dLocX,
                Y: locY + dLocY,
                Z: locZ + dLocZ,
              },
              Rotation: {
                Pitch: pitch + dRotPitch,
                Yaw:   yaw   + dRotYaw,
                Roll:  roll  + dRotRoll,
              },
              Scale3D: {
                X: scaleX + dScaleX,
                Y: scaleY + dScaleY,
                Z: scaleZ + dScaleZ,
              },
            };
          }

          widgetRuntimeState[widgetId] = value;
          widget.currentValue = value;
          try {
            writeProjectDoc(pid, doc);
          } catch (e) {
            console.error('[UltiUnreal][Agent] failed to persist transform value', e);
          }

          const hasTransformAdjust = hasTransformValue || hasTransformDelta;
          const transformDispatch = resolveNudgeDispatchMeta({
            isLive,
            hasAdjust: hasTransformAdjust,
          });
          if (!transformDispatch.shouldDispatchNow) {
            logWidgetNudge({
              logLine,
              widgetId,
              wtype,
              isLive,
              dispatchState: transformDispatch.dispatchState,
              dispatchReason: transformDispatch.dispatchReason,
              path,
              value,
              valueForWrc: toWrcTransformPropertyValue(value),
              targets: targetIps,
              results: [],
            });
            return sendJSON(res, 200, {
              ok: true,
              widgetId,
              action,
              type: wtype,
              value,
              staged: true,
              dispatched: false,
              dispatchReason: transformDispatch.dispatchReason,
              results: [],
            });
          }

          const valueForWrc = toWrcTransformPropertyValue(value);
          for (const ip of targetIps) {
            const wrcUrl = `http://${ip}:${rcPort}/remote/preset/${encodeURIComponent(
              presetName
            )}/property/${encodeURIComponent(path)}`;

          try {
            const r = await fetch(wrcUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                PropertyValue: valueForWrc,
                GenerateTransaction: true,
              }),
            });
            const txt = await r.text().catch(() => '');
            results.push({ ip, ok: r.ok, status: r.status, body: txt });
          } catch (e) {
            logWrcCallError({
              ip,
              url: wrcUrl,
              widgetId,
              type: wtype,
              action,
              error: String(e && e.message ? e.message : e),
            });
            results.push({
              ip,
              ok: false,
              status: 0,
              error: String(e && e.message ? e.message : e),
            });
          }
          }

          logWidgetNudge({
            logLine,
            widgetId,
            wtype,
            isLive,
            dispatchState: transformDispatch.dispatchState,
            dispatchReason: transformDispatch.dispatchReason,
            path,
            value,
            valueForWrc,
            targets: targetIps,
            results,
          });
          return sendJSON(res, 200, {
            ok: true,
            widgetId,
            action,
            type: wtype,
            value,
            staged: false,
            dispatched: true,
            dispatchReason: transformDispatch.dispatchReason,
            results,
          });
        }

        return sendJSON(res, 400, {
          ok: false,
          error: `nudge not supported for widget type ${wtype}`,
        });
      }

      // Action inconnue
      return sendJSON(res, 404, { ok: false, error: `unknown widget action "${action}"` });
    }

  // (y compris le if (url.pathname.startsWith('/agent/ui/widgets/')) { ... }
  // jusqu'à la dernière ligne : 
  //   return sendJSON(res, 404, { ok: false, error: `unknown widget action "${action}"` });

  // Si aucune route widget ne correspond, on laisse la main à server.cjs
  return false;
}

module.exports = { handleWidgets };
