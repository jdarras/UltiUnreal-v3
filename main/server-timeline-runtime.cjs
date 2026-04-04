const DEFAULT_FPS = 25;
const DEFAULT_MODE = 'single';
const VALID_MODES = new Set(['single', 'loop', 'flipflop', 'flipstopflop']);

function coerceFrame(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.round(num));
}

function coerceOffset(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num);
}

function coerceScale(raw) {
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

function getMultiChannelDefinition(widget) {
  const type = String(widget?.type || '').toLowerCase();
  if (type === 'vector') {
    return {
      kind: 'vector',
      channels: [
        { id: 'x', path: ['X'], defaultValue: 0 },
        { id: 'y', path: ['Y'], defaultValue: 0 },
        { id: 'z', path: ['Z'], defaultValue: 0 },
      ],
    };
  }
  if (type === 'transform') {
    return {
      kind: 'transform',
      channels: [
        { id: 'tx', path: ['Translation', 'X'], defaultValue: 0 },
        { id: 'ty', path: ['Translation', 'Y'], defaultValue: 0 },
        { id: 'tz', path: ['Translation', 'Z'], defaultValue: 0 },
        { id: 'rroll', path: ['Rotation', 'Roll'], defaultValue: 0 },
        { id: 'rpitch', path: ['Rotation', 'Pitch'], defaultValue: 0 },
        { id: 'ryaw', path: ['Rotation', 'Yaw'], defaultValue: 0 },
        { id: 'sx', path: ['Scale3D', 'X'], defaultValue: 1 },
        { id: 'sy', path: ['Scale3D', 'Y'], defaultValue: 1 },
        { id: 'sz', path: ['Scale3D', 'Z'], defaultValue: 1 },
      ],
    };
  }
  if (type === 'joystick') {
    return {
      kind: 'joystick',
      channels: [
        { id: 'x', path: ['X'], defaultValue: 0 },
        { id: 'y', path: ['Y'], defaultValue: 0 },
      ],
    };
  }
  if (type === 'color') {
    return {
      kind: 'color',
      channels: [
        { id: 'r', path: ['R'], defaultValue: 1 },
        { id: 'g', path: ['G'], defaultValue: 1 },
        { id: 'b', path: ['B'], defaultValue: 1 },
        { id: 'a', path: ['A'], defaultValue: 1 },
      ],
    };
  }
  return null;
}

function normalizeTimeline(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const modeRaw = String(base.mode || '').toLowerCase();
  const mode = VALID_MODES.has(modeRaw)
    ? modeRaw
    : modeRaw === 'once'
      ? 'single'
      : DEFAULT_MODE;
  const duration = coerceFrame(base.duration);
  const widgetsRaw = Array.isArray(base.widgets) ? base.widgets : [];
  const widgets = widgetsRaw
    .map((widget) => {
      const id = String(widget?.id || '').trim();
      if (!id) return null;
      return {
        ...widget,
        id,
        type: String(widget?.type || '').trim(),
        label: widget?.label ?? '',
      };
    })
    .filter(Boolean);
  const tracksRaw = Array.isArray(base.tracks) ? base.tracks : [];
  const tracks = tracksRaw
    .map((track) => {
      const widgetId = String(track?.widgetId || '').trim();
      if (!widgetId) return null;
      const keyframesRaw = Array.isArray(track?.keyframes) ? track.keyframes : [];
      const keyframes = keyframesRaw
        .map((kf) => {
          const frame = coerceFrame(kf?.frame);
          if (frame === null) return null;
          const interp = typeof kf?.interp === 'string' ? kf.interp : undefined;
          const inTangent = Number.isFinite(kf?.inTangent) ? Number(kf.inTangent) : undefined;
          const outTangent = Number.isFinite(kf?.outTangent) ? Number(kf.outTangent) : undefined;
          const inSpan = Number.isFinite(kf?.inSpan) ? Number(kf.inSpan) : undefined;
          const outSpan = Number.isFinite(kf?.outSpan) ? Number(kf.outSpan) : undefined;
          const args = kf && typeof kf.args === 'object' ? kf.args : undefined;
          return {
            frame,
            value: kf?.value,
            ...(args ? { args } : {}),
            ...(interp ? { interp } : {}),
            ...(inTangent !== undefined ? { inTangent } : {}),
            ...(outTangent !== undefined ? { outTangent } : {}),
            ...(inSpan !== undefined ? { inSpan } : {}),
            ...(outSpan !== undefined ? { outSpan } : {}),
          };
        })
        .filter(Boolean);
      const channelsRaw = track?.channels && typeof track.channels === 'object' ? track.channels : null;
      const channels = channelsRaw
        ? Object.fromEntries(
            Object.entries(channelsRaw).map(([channelId, list]) => {
              const frames = Array.isArray(list) ? list : [];
              const nextFrames = frames
                .map((kf) => {
                  const frame = coerceFrame(kf?.frame);
                  if (frame === null) return null;
                  const interp = typeof kf?.interp === 'string' ? kf.interp : undefined;
                  const inTangent =
                    Number.isFinite(kf?.inTangent) ? Number(kf.inTangent) : undefined;
                  const outTangent =
                    Number.isFinite(kf?.outTangent) ? Number(kf.outTangent) : undefined;
                  const inSpan = Number.isFinite(kf?.inSpan) ? Number(kf.inSpan) : undefined;
                  const outSpan = Number.isFinite(kf?.outSpan) ? Number(kf.outSpan) : undefined;
                  const args = kf && typeof kf.args === 'object' ? kf.args : undefined;
                  return {
                    frame,
                    value: kf?.value,
                    ...(args ? { args } : {}),
                    ...(interp ? { interp } : {}),
                    ...(inTangent !== undefined ? { inTangent } : {}),
                    ...(outTangent !== undefined ? { outTangent } : {}),
                    ...(inSpan !== undefined ? { inSpan } : {}),
                    ...(outSpan !== undefined ? { outSpan } : {}),
                  };
                })
                .filter(Boolean);
              return [channelId, nextFrames];
            })
          )
        : null;
      return {
        widgetId,
        keyframes,
        offset: coerceOffset(track?.offset),
        scale: coerceScale(track?.scale) ?? 1,
        ...(channels ? { channels } : {}),
      };
    })
    .filter(Boolean);

  return {
    mode,
    tracks,
    widgets,
    duration: duration !== null ? duration : 50,
  };
}

function getNumericKind(binding = {}) {
  const raw = String(binding.rawType || '').toLowerCase();
  const vt = String(binding.valueType || '').toLowerCase();
  const src = raw || vt;
  if (
    src.includes('int64') ||
    src.includes('integer64') ||
    src.includes('long long')
  ) {
    return 'int64';
  }
  if (src.includes('uint8') || src.includes('byte')) return 'byte';
  if (src.includes('int')) return 'int';
  if (src.includes('float') || src.includes('double')) return 'float';
  return null;
}

function getWidgetValueMeta(widget) {
  const w = widget || {};
  const type = String(w.type || '').toLowerCase();
  const binding = w.binding || {};
  const valueType = String(binding.valueType || '').toLowerCase();
  const numericKind = getNumericKind(binding);
  const multi = getMultiChannelDefinition(w);

  if (type === 'button') return { kind: 'event' };
  if (type === 'toggle') return { kind: 'bool', bindingKind: binding.kind || 'property' };
  if (type === 'slider') {
    const ui = w.ui || {};
    return {
      kind: 'number',
      numericKind: numericKind || 'float',
      min: Number.isFinite(Number(ui.min)) ? Number(ui.min) : null,
      max: Number.isFinite(Number(ui.max)) ? Number(ui.max) : null,
      step: Number.isFinite(Number(ui.step)) ? Number(ui.step) : null,
    };
  }
  if (multi) {
    return {
      kind: 'multi',
      shape: multi.kind,
      channels: multi.channels,
    };
  }
  if (type === 'dropdown' || type === 'enum') return { kind: 'enum' };
  if (type === 'browse') return { kind: 'text' };
  if (valueType.includes('bool')) return { kind: 'bool', bindingKind: binding.kind || 'property' };
  if (numericKind) {
    const ui = w.ui || {};
    return {
      kind: 'number',
      numericKind,
      min: Number.isFinite(Number(ui.min)) ? Number(ui.min) : null,
      max: Number.isFinite(Number(ui.max)) ? Number(ui.max) : null,
      step: Number.isFinite(Number(ui.step)) ? Number(ui.step) : null,
    };
  }
  return { kind: 'text' };
}

function getNumericRange(meta, keyframes = []) {
  let min = Number.isFinite(Number(meta?.min)) ? Number(meta.min) : null;
  let max = Number.isFinite(Number(meta?.max)) ? Number(meta.max) : null;
  const values = keyframes
    .map((kf) => Number(kf?.value))
    .filter((v) => Number.isFinite(v));
  if (!(min < max)) {
    if (values.length) {
      min = Math.min(...values);
      max = Math.max(...values);
    } else {
      min = 0;
      max = 1;
    }
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return { min, max };
}

function coerceNumericValue(rawValue, meta, range) {
  let next = Number(rawValue);
  if (!Number.isFinite(next)) return null;
  const kind = meta?.numericKind;
  if (kind === 'int' || kind === 'int64' || kind === 'byte') next = Math.round(next);
  if (kind === 'byte') next = Math.max(0, Math.min(255, next));
  if (Number.isFinite(range?.min)) next = Math.max(range.min, next);
  if (Number.isFinite(range?.max)) next = Math.min(range.max, next);
  if (kind === 'int64' && !Number.isSafeInteger(next)) return null;
  return next;
}

function sortKeyframes(keyframes = []) {
  return [...keyframes].sort((a, b) => {
    const fa = Number(a?.frame);
    const fb = Number(b?.frame);
    if (!Number.isFinite(fa) && !Number.isFinite(fb)) return 0;
    if (!Number.isFinite(fa)) return 1;
    if (!Number.isFinite(fb)) return -1;
    if (fa !== fb) return fa - fb;
    return 0;
  });
}

function dedupeKeyframes(keyframes = []) {
  const map = new Map();
  keyframes.forEach((kf) => {
    const frame = Number(kf?.frame);
    if (!Number.isFinite(frame)) return;
    map.set(frame, kf);
  });
  return sortKeyframes(Array.from(map.values()));
}

function sampleNumericValue(keyframes, frame) {
  if (!keyframes.length) return null;
  if (frame <= keyframes[0].frame) return keyframes[0].value;
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (frame < b.frame) {
      const interp = String(a?.interp || '').toLowerCase();
      if (interp === 'constant') return a.value;
      const span = b.frame - a.frame;
      const t = span > 0 ? (frame - a.frame) / span : 0;
      return Number(a.value) + (Number(b.value) - Number(a.value)) * t;
    }
  }
  return keyframes[keyframes.length - 1].value;
}

function sampleDiscreteValue(keyframes, frame) {
  if (!keyframes.length) return null;
  if (frame <= keyframes[0].frame) return keyframes[0].value;
  for (let i = keyframes.length - 1; i >= 0; i -= 1) {
    const kf = keyframes[i];
    if (frame >= kf.frame) return kf.value;
  }
  return keyframes[0].value;
}

function parseObjectValue(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function valuesEqual(a, b) {
  if (a === b) return true;
  if (typeof a === 'object' || typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

function getPathValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.reduce((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return acc[key];
  }, obj);
}

function setPathValue(obj, path, value) {
  if (!obj || !path) return;
  let cursor = obj;
  for (let i = 0; i < path.length - 1; i += 1) {
    const key = path[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
}

function clampUnit(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function channelsToUnitColor(ch = {}) {
  const rawR = Number(ch?.R ?? ch?.r);
  const rawG = Number(ch?.G ?? ch?.g);
  const rawB = Number(ch?.B ?? ch?.b);
  const rawA = Number(ch?.A ?? ch?.a);
  const rgbLooksByte =
    (Number.isFinite(rawR) && rawR > 1) ||
    (Number.isFinite(rawG) && rawG > 1) ||
    (Number.isFinite(rawB) && rawB > 1);
  const alphaLooksByte = Number.isFinite(rawA) && rawA > 1;
  const divRgb = rgbLooksByte ? 255 : 1;
  const divA = alphaLooksByte ? 255 : 1;
  return {
    R: clampUnit((Number.isFinite(rawR) ? rawR : 1) / divRgb),
    G: clampUnit((Number.isFinite(rawG) ? rawG : 1) / divRgb),
    B: clampUnit((Number.isFinite(rawB) ? rawB : 1) / divRgb),
    A: clampUnit((Number.isFinite(rawA) ? rawA : 1) / divA),
  };
}

function parseColorChannels(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return channelsToUnitColor(raw);
  }
  if (typeof raw !== 'string') {
    return { R: 1, G: 1, B: 1, A: 1 };
  }
  const s = raw.trim();
  if (!s) return { R: 1, G: 1, B: 1, A: 1 };
  const [hexPart, alphaPart] = s.split('|');
  const hex = String(hexPart || '').trim();
  let r = 1;
  let g = 1;
  let b = 1;
  if (/^#?[0-9a-fA-F]{6}$/.test(hex)) {
    const clean = hex.startsWith('#') ? hex.slice(1) : hex;
    r = parseInt(clean.slice(0, 2), 16) / 255;
    g = parseInt(clean.slice(2, 4), 16) / 255;
    b = parseInt(clean.slice(4, 6), 16) / 255;
  }
  const aRaw = Number(alphaPart);
  const a = Number.isFinite(aRaw) ? clampUnit(aRaw) : 1;
  return { R: clampUnit(r), G: clampUnit(g), B: clampUnit(b), A: a };
}

function colorChannelsToString(raw) {
  const r = Math.round(clampUnit(Number(raw?.R)) * 255);
  const g = Math.round(clampUnit(Number(raw?.G)) * 255);
  const b = Math.round(clampUnit(Number(raw?.B)) * 255);
  const a = clampUnit(Number(raw?.A));
  const hex = `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  return `${hex}|${a.toFixed(3)}`;
}

function hasNonEmptyObject(value) {
  return !!(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function hasKeyframeArgs(keyframes = []) {
  return keyframes.some((kf) => hasNonEmptyObject(kf?.args));
}

function getObjectBase(widget, prev) {
  if (prev && typeof prev === 'object') return { ...prev };
  const raw = widget?.currentValue ?? widget?.value;
  const parsed = parseObjectValue(raw);
  if (parsed && typeof parsed === 'object') return { ...parsed };
  return {};
}

function getColorBase(widget, prev) {
  if (prev && typeof prev === 'object') return { ...prev };
  if (typeof prev === 'string') return parseColorChannels(prev);
  const raw = widget?.currentValue ?? widget?.value;
  return parseColorChannels(raw);
}

function getTrackLocalMaxFrame(track) {
  const keyframes = Array.isArray(track?.keyframes) ? track.keyframes : [];
  const channels = track?.channels && typeof track.channels === 'object' ? track.channels : null;
  let localMax = 0;
  keyframes.forEach((kf) => {
    const frame = Number(kf?.frame);
    if (Number.isFinite(frame)) localMax = Math.max(localMax, frame);
  });
  if (channels) {
    Object.values(channels).forEach((list) => {
      if (!Array.isArray(list)) return;
      list.forEach((kf) => {
        const frame = Number(kf?.frame);
        if (Number.isFinite(frame)) localMax = Math.max(localMax, frame);
      });
    });
  }
  return localMax;
}

function getTimelineMaxFrame(timeline) {
  const tracks = Array.isArray(timeline?.tracks) ? timeline.tracks : [];
  const frames = [];
  const duration = coerceFrame(timeline?.duration);
  if (duration !== null) frames.push(duration);
  tracks.forEach((track) => {
    const offset = coerceOffset(track?.offset);
    const scale = coerceScale(track?.scale) ?? 1;
    const localMax = getTrackLocalMaxFrame(track);
    frames.push(Math.ceil(offset + localMax * scale));
  });
  if (!frames.length) return 0;
  return Math.max(0, Math.round(Math.max(...frames)));
}

function createServerTimelinePlayer({
  timeline,
  widgets,
  fps = DEFAULT_FPS,
  startFrame = 0,
  initialDirection = 1,
  dispatch = () => {},
  onError,
  onFrame,
  onStop,
  onBoundaryPause,
}) {
  const norm = normalizeTimeline(timeline);
  const widgetsById = new Map(
    (Array.isArray(widgets) ? widgets : [])
      .filter((w) => w && w.id)
      .map((w) => [w.id, w])
  );

  const tracks = norm.tracks
    .map((track) => {
      const widget = widgetsById.get(track.widgetId);
      if (!widget) return null;
      const meta = getWidgetValueMeta(widget);
      const keyframes = dedupeKeyframes(sortKeyframes(track.keyframes || []));
      const channels = track?.channels && typeof track.channels === 'object' ? track.channels : null;
      const channelKeyframes = channels
        ? Object.fromEntries(
            Object.entries(channels).map(([channelId, list]) => [
              channelId,
              dedupeKeyframes(sortKeyframes(list || [])),
            ])
          )
        : null;
      const hasChannelKeyframes =
        channelKeyframes &&
        Object.values(channelKeyframes).some(
          (list) => Array.isArray(list) && list.length
        );
      const offset = coerceOffset(track.offset);
      const scale = coerceScale(track.scale) ?? 1;
      const eventFrames = keyframes.map((kf) =>
        Math.round(offset + kf.frame * scale)
      );
      const binding = widget?.binding && typeof widget.binding === 'object' ? widget.binding : {};
      const eventHasStatePayload =
        meta.kind === 'event' &&
        (
          hasKeyframeArgs(keyframes) ||
          hasNonEmptyObject(binding.argValues) ||
          hasNonEmptyObject(binding.argDefaults) ||
          hasNonEmptyObject(binding.paramBools)
        );
      let localMax = keyframes.length
        ? keyframes[keyframes.length - 1].frame
        : 0;
      if (channelKeyframes) {
        Object.values(channelKeyframes).forEach((list) => {
          if (!Array.isArray(list) || !list.length) return;
          const last = list[list.length - 1];
          if (Number.isFinite(last?.frame)) {
            localMax = Math.max(localMax, last.frame);
          }
        });
      }
      return {
        track,
        widget,
        meta,
        keyframes,
        eventFrames,
        eventHasStatePayload,
        channelKeyframes,
        hasChannelKeyframes,
        offset,
        scale,
        clipEndFrame: Math.ceil(offset + localMax * scale),
      };
    })
    .filter(Boolean);

  const maxFrame = getTimelineMaxFrame(norm);
  const intervalMs = Number.isFinite(fps) && fps > 0 ? 1000 / fps : 0;
  let playing = false;
  let timer = null;
  let frame = Math.max(0, Math.round(Number(startFrame) || 0));
  let direction = initialDirection || 1;

  const lastSent = new Map();
  const lastEventState = new Map();

  const stopTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const stop = () => {
    if (!playing) return;
    playing = false;
    stopTimer();
    onStop?.();
  };

  const emitDispatch = (payload) => {
    try {
      Promise.resolve(dispatch(payload)).catch(() => {});
    } catch {}
  };

  const applyFrame = (
    currentFrame,
    {
      triggerEvents = true,
      eventMode = 'edge',
      forceEvents = false,
      holdBeforeStart = false,
      holdAfterEnd = false,
    } = {}
  ) => {
    tracks.forEach(
      ({
        widget,
        meta,
        keyframes,
        eventFrames,
        eventHasStatePayload,
        channelKeyframes,
        hasChannelKeyframes,
        offset,
        scale,
        clipEndFrame,
        track,
      }) => {
        if (!widget) return;
        const clipStart = offset;
        if (currentFrame < clipStart && !holdBeforeStart) return;
        if (currentFrame > clipEndFrame && !holdAfterEnd) return;
        const localFrame = scale ? (currentFrame - offset) / scale : currentFrame;

        if (meta.kind === 'event') {
          if (!triggerEvents) return;
          if (!keyframes.length) return;
          const mode = eventMode === 'state' ? 'state' : 'edge';
          if (mode === 'state') {
            let hitIdx = -1;
            let bestGlobalFrame = -Infinity;
            eventFrames.forEach((globalFrame, idx) => {
              if (globalFrame <= currentFrame && globalFrame >= bestGlobalFrame) {
                bestGlobalFrame = globalFrame;
                hitIdx = idx;
              }
            });
            if (hitIdx < 0) {
              if (!eventHasStatePayload) return;
              hitIdx = 0;
            }
            const hitKf = keyframes[hitIdx];
            if (!hitKf) return;
            const prevIdx = lastEventState.get(track);
            if (!forceEvents && prevIdx === hitIdx) return;
            lastEventState.set(track, hitIdx);
            const args = hitKf && typeof hitKf.args === 'object' ? hitKf.args : null;
            emitDispatch({ kind: 'event', widget, args });
            return;
          }
          const hitIdx = eventFrames.findIndex((f) => f === currentFrame);
          if (hitIdx < 0) return;
          const hitKf = keyframes[hitIdx];
          if (!hitKf) return;
          const args = hitKf && typeof hitKf.args === 'object' ? hitKf.args : null;
          emitDispatch({ kind: 'event', widget, args });
          return;
        }

        if (meta.kind === 'multi') {
          if (!hasChannelKeyframes) {
            if (!keyframes.length) return;
            const rawValue = sampleDiscreteValue(keyframes, localFrame);
            if (rawValue === null || rawValue === undefined) return;
            if (meta.shape === 'color') {
              const colorValue = colorChannelsToString(parseColorChannels(rawValue));
              const prev = lastSent.get(widget.id);
              if (valuesEqual(prev, colorValue)) return;
              lastSent.set(widget.id, colorValue);
              emitDispatch({ kind: 'property', widget, value: colorValue, meta });
              return;
            }
            if (meta.shape === 'joystick') {
              const parsed = parseObjectValue(rawValue);
              if (!parsed) {
                onError?.({ type: 'parse', widgetId: widget.id });
                return;
              }
              const prev = lastSent.get(widget.id);
              if (valuesEqual(prev, parsed)) return;
              lastSent.set(widget.id, parsed);
              emitDispatch({ kind: 'joystick', widget, value: parsed, meta });
              return;
            }
            const parsed = parseObjectValue(rawValue);
            if (!parsed) {
              onError?.({ type: 'parse', widgetId: widget.id });
              return;
            }
            const prev = lastSent.get(widget.id);
            if (valuesEqual(prev, parsed)) return;
            lastSent.set(widget.id, parsed);
            emitDispatch({ kind: 'property', widget, value: parsed, meta });
            return;
          }

          const channelDefs = Array.isArray(meta.channels) ? meta.channels : [];
          const prev = lastSent.get(widget.id);
          const base =
            meta.shape === 'color'
              ? getColorBase(widget, prev)
              : getObjectBase(widget, prev);
          let changed = false;
          channelDefs.forEach((channel) => {
            const list = channelKeyframes?.[channel.id] || [];
            if (list.length) {
              const rawValue = sampleNumericValue(list, localFrame);
              const range = getNumericRange({ numericKind: 'float' }, list);
              const next = coerceNumericValue(
                rawValue,
                { numericKind: 'float' },
                range
              );
              if (next === null) {
                onError?.({ type: 'value', widgetId: widget.id });
                return;
              }
              const prevValue = getPathValue(prev, channel.path);
              setPathValue(base, channel.path, next);
              if (!changed && !valuesEqual(prevValue, next)) changed = true;
              return;
            }
            const current = getPathValue(base, channel.path);
            if (current === undefined && channel.defaultValue !== undefined) {
              const prevValue = getPathValue(prev, channel.path);
              setPathValue(base, channel.path, channel.defaultValue);
              if (!changed && !valuesEqual(prevValue, channel.defaultValue)) {
                changed = true;
              }
            }
          });

          if (!changed) return;
          if (meta.shape === 'color') {
            const colorValue = colorChannelsToString(base);
            lastSent.set(widget.id, base);
            emitDispatch({ kind: 'property', widget, value: colorValue, meta });
            return;
          }
          if (meta.shape === 'joystick') {
            lastSent.set(widget.id, base);
            emitDispatch({ kind: 'joystick', widget, value: base, meta });
            return;
          }
          lastSent.set(widget.id, base);
          emitDispatch({ kind: 'property', widget, value: base, meta });
          return;
        }

        if (!keyframes.length) return;
        let rawValue = null;
        if (meta.kind === 'number') {
          rawValue = sampleNumericValue(keyframes, localFrame);
          const range = getNumericRange(meta, keyframes);
          const next = coerceNumericValue(rawValue, meta, range);
          if (next === null) {
            onError?.({ type: 'value', widgetId: widget.id });
            return;
          }
          rawValue = next;
        } else {
          rawValue = sampleDiscreteValue(keyframes, localFrame);
        }
        if (rawValue === null || rawValue === undefined) return;

        let sendValue = rawValue;
        if (meta.kind === 'bool') sendValue = !!rawValue;
        if (meta.kind === 'text' || meta.kind === 'color' || meta.kind === 'enum') {
          sendValue = String(rawValue);
        }

        const prev = lastSent.get(widget.id);
        const changed = meta.kind === 'number' ? true : !valuesEqual(prev, sendValue);
        if (!changed) return;
        lastSent.set(widget.id, sendValue);

        if (meta.kind === 'bool' && meta.bindingKind === 'function') {
          if (!triggerEvents) return;
          emitDispatch({ kind: 'toggle-function', widget, value: sendValue, meta });
        } else {
          emitDispatch({ kind: 'property', widget, value: sendValue, meta });
        }
      }
    );
    onFrame?.(currentFrame);
  };

  const tick = () => {
    if (!playing) return;
    applyFrame(frame, { triggerEvents: true });
    if (maxFrame === 0) {
      stop();
      return;
    }

    if (frame >= maxFrame && direction > 0) {
      if (norm.mode === 'loop') {
        frame = 0;
      } else if (norm.mode === 'flipflop') {
        direction = -1;
        frame = Math.max(0, maxFrame - 1);
      } else if (norm.mode === 'flipstopflop') {
        direction = -1;
        playing = false;
        stopTimer();
        onBoundaryPause?.(direction, frame);
        return;
      } else {
        stop();
        return;
      }
    } else if (frame <= 0 && direction < 0) {
      if (norm.mode === 'flipflop') {
        direction = 1;
        frame = 1;
      } else if (norm.mode === 'flipstopflop') {
        direction = 1;
        playing = false;
        stopTimer();
        onBoundaryPause?.(direction, frame);
        return;
      } else {
        stop();
        return;
      }
    } else {
      frame += direction;
    }

    timer = setTimeout(tick, intervalMs);
  };

  const start = ({ startFrame: nextStart, direction: nextDirection } = {}) => {
    stop();
    if (!tracks.length) return false;
    if (!intervalMs) {
      onError?.({ type: 'fps' });
      return false;
    }
    playing = true;
    direction = nextDirection || direction || 1;
    frame = Math.min(
      Math.max(0, Math.round(Number(nextStart ?? frame) || 0)),
      maxFrame
    );
    tick();
    return true;
  };

  const pause = () => {
    stop();
  };

  const seek = (nextFrame, options = {}) => {
    const nf = Math.max(0, Math.min(maxFrame, Math.round(Number(nextFrame) || 0)));
    frame = nf;
    applyFrame(frame, {
      triggerEvents: options.triggerEvents === true,
      eventMode: options.eventMode === 'state' ? 'state' : 'edge',
      forceEvents: options.forceEvents === true,
      holdBeforeStart: options.holdBeforeStart !== false,
      holdAfterEnd: options.holdAfterEnd !== false,
    });
  };

  return {
    start,
    pause,
    stop,
    seek,
    isPlaying: () => playing,
    getFrame: () => frame,
    getDirection: () => direction,
    setDirection: (next) => {
      const d = Number(next);
      direction = Number.isFinite(d) && d !== 0 ? (d > 0 ? 1 : -1) : direction;
    },
    getMaxFrame: () => maxFrame,
    getMode: () => norm.mode,
    hasTracks: () => tracks.length > 0,
  };
}

module.exports = {
  createServerTimelinePlayer,
  normalizeTimeline,
  getTimelineMaxFrame,
  DEFAULT_FPS,
};

