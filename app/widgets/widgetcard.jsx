// app/widgets/widgetcard.jsx
import { useEffect, useRef } from 'react';
import ButtonWidget from './buttonwidget.jsx';
import TextWidget from './textwidget.jsx';
import SliderWidget from './sliderwidget.jsx';
import ToggleWidget from './togglewidget.jsx';
import ColorWidget from './colorwidget.jsx';
import DropdownWidget from './dropdownwidget.jsx';
import VectorWidget from './vectorwidget.jsx';
import JoystickWidget from './joystickwidget.jsx';
import TransformWidget from './transformwidget.jsx';
import ZoneWidget from './zonewidget.jsx';
import EnumWidget from './enumwidget.jsx';
import { BrowseWidget } from './browsewidget.jsx';
import TimelineWidget from './timelinewidget.jsx';

import { colorClass } from '../utils/colors';
import {
  wrcCallFunctionForWidget,
  wrcPutPropertyForWidget,
  wrcSendJoystickForWidget,
  logWidgetAction
} from '../utils/agent';
import { normalizeTimeline } from '../utils/timeline';
import { getWidgetT } from './widgetTranslator.js';

function getFunctionParamName(param = {}, index = 0) {
  return String(
    param?.Name ||
      param?.ParameterName ||
      param?.name ||
      `Param${index + 1}`
  ).trim();
}

function getFunctionParamType(param = {}) {
  return String(
    param?.Type ||
      param?.ParameterType ||
      param?.InnerType ||
      param?.type ||
      ''
  );
}

function extractEnumOptions(param = {}) {
  let opts = param?.EnumValues || param?.enumValues;
  if (!opts && param?.Metadata) {
    opts = param.Metadata.EnumValues || param.Metadata.enumvalues;
  }
  if (typeof opts === 'string') {
    opts = opts
      .split(',')
      .map((s) => String(s || '').trim())
      .filter(Boolean);
  }
  if (!Array.isArray(opts)) return [];
  return opts.map((v) => String(v || '').trim()).filter(Boolean);
}

function inferArgumentMetaFromValue(currentValue) {
  if (currentValue && typeof currentValue === 'object') {
    const obj = currentValue;
    if (
      Object.prototype.hasOwnProperty.call(obj, 'Translation') ||
      Object.prototype.hasOwnProperty.call(obj, 'Rotation') ||
      Object.prototype.hasOwnProperty.call(obj, 'Scale3D')
    ) {
      return { kind: 'transform' };
    }

    const hasR = Object.prototype.hasOwnProperty.call(obj, 'R');
    const hasG = Object.prototype.hasOwnProperty.call(obj, 'G');
    const hasB = Object.prototype.hasOwnProperty.call(obj, 'B');
    if (hasR && hasG && hasB) {
      return { kind: 'color' };
    }

    const hasPitch = Object.prototype.hasOwnProperty.call(obj, 'Pitch');
    const hasYaw = Object.prototype.hasOwnProperty.call(obj, 'Yaw');
    const hasRoll = Object.prototype.hasOwnProperty.call(obj, 'Roll');
    if (hasPitch || hasYaw || hasRoll) {
      return { kind: 'rotator' };
    }

    const hasX = Object.prototype.hasOwnProperty.call(obj, 'X');
    const hasY = Object.prototype.hasOwnProperty.call(obj, 'Y');
    const hasZ = Object.prototype.hasOwnProperty.call(obj, 'Z');
    if (hasX && hasY && hasZ) {
      return { kind: 'vector3d' };
    }
    if (hasX && hasY) {
      return { kind: 'vector2d' };
    }
  }

  if (typeof currentValue === 'boolean') {
    return { kind: 'bool' };
  }
  if (typeof currentValue === 'number' && Number.isFinite(currentValue)) {
    return {
      kind: 'number',
      integer: Number.isInteger(currentValue),
      isByte: false
    };
  }
  return { kind: 'text' };
}

function resolveArgumentMeta(rawType = '', param = {}, currentValue) {
  const typeStr = String(rawType || '').toLowerCase();

  const isBool = typeStr.includes('bool');
  const isFloat = typeStr.includes('float') || typeStr.includes('double');
  const isByte = typeStr.includes('byte') || typeStr.includes('uint8');
  const isInt64 = typeStr.includes('int64') || typeStr.includes('long long');
  const isInt =
    typeStr.includes('int') &&
    !isInt64 &&
    !typeStr.includes('point') &&
    !isByte;
  const isVector = typeStr.includes('vector');
  const isVector2D =
    isVector &&
    (typeStr.includes('vector2d') || typeStr.includes('vector2'));
  const isVector3D = isVector && !isVector2D;
  const isRotator = typeStr.includes('rotator');
  const isTransform = typeStr.includes('transform');
  const isEnum = typeStr.includes('enum');
  const isColor =
    typeStr.includes('linearcolor') ||
    typeStr === 'flinearcolor' ||
    typeStr === 'fcolor';
  const isTextLike =
    typeStr.includes('fname') ||
    typeStr.includes('fstring') ||
    typeStr.includes('ftext') ||
    typeStr === 'name' ||
    typeStr === 'string' ||
    typeStr === 'text';

  if (isEnum) {
    const enumOptions = extractEnumOptions(param);
    if (enumOptions.length > 0) {
      return { kind: 'enum', enumOptions };
    }
  }
  if (isVector2D) return { kind: 'vector2d' };
  if (isVector3D) return { kind: 'vector3d' };
  if (isRotator) return { kind: 'rotator' };
  if (isTransform) return { kind: 'transform' };
  if (isColor) return { kind: 'color' };
  if (isBool) return { kind: 'bool' };
  if (isFloat || isInt || isInt64 || isByte) {
    return {
      kind: 'number',
      integer: !!(isInt || isInt64 || isByte),
      isByte: !!isByte
    };
  }
  if (isTextLike) return { kind: 'text' };

  return inferArgumentMetaFromValue(currentValue);
}

function findBoundFunctionMeta(widget, presetData) {
  const funcs = Array.isArray(presetData?.funcs) ? presetData.funcs : [];
  if (!funcs.length) return null;

  const owner = String(widget?.binding?.ownerName || '').trim();
  const displayName = String(
    widget?.binding?.displayName || widget?.binding?.path || ''
  ).trim();
  if (!displayName) return null;

  if (owner) {
    const exact = funcs.find(
      (f) =>
        String(f?.displayName || '').trim() === displayName &&
        String(f?.ownerName || '').trim() === owner
    );
    if (exact) return exact;
  }

  return (
    funcs.find((f) => String(f?.displayName || '').trim() === displayName) ||
    null
  );
}

function resolveButtonArgumentDefs(widget, presetData) {
  const binding = widget?.binding || {};
  const hasArgDefaults =
    binding?.argDefaults && typeof binding.argDefaults === 'object';
  const defaultArgValues = hasArgDefaults
    ? binding.argDefaults
    : binding?.argValues && typeof binding.argValues === 'object'
    ? binding.argValues
    : {};
  const currentArgValues = hasArgDefaults
    ? binding?.argValues && typeof binding.argValues === 'object'
      ? binding.argValues
      : {}
    : {};
  const argValues = { ...defaultArgValues, ...currentArgValues };

  const defs = [];
  const seen = new Set();
  const func = findBoundFunctionMeta(widget, presetData);
  const parameters = Array.isArray(func?.parameters) ? func.parameters : [];

  parameters.forEach((param, idx) => {
    const name = getFunctionParamName(param, idx);
    if (!name || seen.has(name)) return;
    const rawType = String(getFunctionParamType(param) || '').toLowerCase();
    const inputMeta = resolveArgumentMeta(rawType, param, argValues[name]);
    defs.push({
      name,
      rawType,
      ...inputMeta
    });
    seen.add(name);
  });

  Object.keys(argValues || {}).forEach((name) => {
    const key = String(name || '').trim();
    if (!key || seen.has(key)) return;
    const inputMeta = inferArgumentMetaFromValue(argValues[key]);
    defs.push({
      name: key,
      rawType: '',
      ...inputMeta
    });
    seen.add(key);
  });

  return defs;
}

function getButtonArgumentMaps(binding = null) {
  const base = binding && typeof binding === 'object' ? binding : {};
  const hasArgDefaults =
    base.argDefaults && typeof base.argDefaults === 'object';
  const defaults = hasArgDefaults
    ? base.argDefaults
    : base.argValues && typeof base.argValues === 'object'
    ? base.argValues
    : {};
  const current = hasArgDefaults
    ? base.argValues && typeof base.argValues === 'object'
      ? base.argValues
      : {}
    : {};

  const keys = new Set([
    ...Object.keys(defaults || {}),
    ...Object.keys(current || {})
  ]);
  const effective = {};
  keys.forEach((key) => {
    if (!key) return;
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      effective[key] = current[key];
    } else if (Object.prototype.hasOwnProperty.call(defaults, key)) {
      effective[key] = defaults[key];
    }
  });

  return { defaults, current, effective };
}

function normalizeCompareValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeCompareValue(item));
  }
  if (value && typeof value === 'object') {
    const out = {};
    Object.keys(value)
      .sort()
      .forEach((k) => {
        out[k] = normalizeCompareValue(value[k]);
      });
    return out;
  }
  return value;
}

function areArgumentMapsEqual(a = {}, b = {}) {
  try {
    return (
      JSON.stringify(normalizeCompareValue(a || {})) ===
      JSON.stringify(normalizeCompareValue(b || {}))
    );
  } catch {
    return false;
  }
}

function hasTimelineBinding(widget) {
  if (!widget) return false;
  const b = widget.binding || {};
  const path = String(b.path || '').trim();
  const displayName = String(b.displayName || '').trim();

  if (b.kind === 'function') {
    return !!(path || displayName);
  }

  const type = String(widget.type || '').toLowerCase();
  if (type === 'joystick') {
    const linkType = widget.ui?.linkType || 'vector2d';
    if (linkType === 'vector2d') return !!path;
    const jb = widget.joystickBindings || {};
    const bx = String(jb.x?.path || '').trim();
    const by = String(jb.y?.path || '').trim();
    return !!(bx && by);
  }

  return !!path;
}

/**
 * WidgetCard
 *  - gère l'affichage d'UN widget dans le layout (carte + contenu)
 *  - ne gère PAS la liste, ni le layout global.
 *
 * Props attendues :
 *  - widget: l'objet w
 *  - editMode: bool
 *  - selectedId: id du widget sélectionné
 *  - setSelectedId(id)
 *  - leftPanelMode, setLeftPanelMode(mode)
 *  - values: map { widgetId -> valeur courante }
 *  - setValues(fn)
 *  - hosts, common: pour WRC + pastilles cibles
 *  - removeWidget(id)
 *  - hasValidBinding(widget)
 *  - dragState, setDragState
 *  - onDragStart(e, widgetId)
 *  - onDrop(e, widgetId)
 *  - onDuplicate(widgetId)
 */
export default function WidgetCard({
  widget: w,
  presetData,
  editMode,
  selectedId,
  setSelectedId,
  leftPanelMode: _leftPanelMode,
  setLeftPanelMode,
  values,
  setValues,
  hosts,
  common,
  removeWidget,
  updateWidget,
  hasValidBinding,
  onDuplicate,
  dragState: _dragState,
  setDragState,
  onDragStart: _onDragStart,
  onDrop: _onDrop,
  onSizeChange,
  onZoneHeaderHeightChange
}) {
  const t = getWidgetT();
  const baseClass = 'uu-card prod-widget';
  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current || !onSizeChange || !w?.id) return;

    const el = cardRef.current;

    const notifySize = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) return;
      onSizeChange(w.id, width, height);
    };

    // première mesure immédiate
    notifySize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        notifySize();
      });
      observer.observe(el);
      return () => {
        observer.disconnect();
      };
    }

    return undefined;
  }, [onSizeChange, w?.id]);

  if (!w) return null;

  const selectedClass = selectedId === w.id ? 'selected' : '';
  const boundOk = hasValidBinding ? hasValidBinding(w) : false;
  const hasTargets = w.targets && Object.values(w.targets || {}).some(Boolean);
  const timelineMissing = (() => {
    if (w.type !== 'timeline') return false;
    const timeline = normalizeTimeline(w.ui?.timeline);
    const timelineWidgets = Array.isArray(timeline.widgets) ? timeline.widgets : [];
    if (!timelineWidgets.length) return true;
    return timelineWidgets.some((tw) => {
      const twTargets = tw.targets && Object.values(tw.targets || {}).some(Boolean);
      const bindingOk = hasTimelineBinding(tw);
      return !twTargets || !bindingOk;
    });
  })();
  const needsBinding =
    w.type === 'timeline'
      ? timelineMissing
      : w.type !== 'zone' && (!boundOk || !hasTargets);
  const typeClass =
    w.type === 'text'
      ? ' prod-widget-text'
      : w.type === 'zone'
      ? ' prod-widget-zone'
      : '';

  const duplicateHandler =
    editMode && typeof onDuplicate === 'function'
      ? () => onDuplicate(w.id)
      : undefined;


  const cardStyle = {
    left: w.x ?? 40,
    top: w.y ?? 40
  };

  // Pour les zones, on applique aussi la largeur / hauteur calculées
  if (w.type === 'zone') {
    if (typeof w.w === 'number') cardStyle.width = w.w;
    if (typeof w.h === 'number') cardStyle.height = w.h;
  }

  // valeur courante du widget (texte, slider, joystick, etc.)
  const value =
    values?.[w.id] ??
    w.mediaPath ??
    w.defaultValue ??
    w.value ??
    '';

  const inferType = (path = '') => {
    const s = String(path || '').toLowerCase();
    if (/\.(jpg|jpeg|png|tga)$/.test(s)) return 'image';
    if (/\.(mp4|mov|hap)$/.test(s)) return 'video';
    return '';
  };
  const inferDir = (path = '') => {
    const raw = String(path || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
    if (!raw) return '';
    const idx = raw.lastIndexOf('/');
    if (idx <= 0) return '';
    return raw.slice(0, idx);
  };

  const buttonArgDefs =
    w.type === 'button' ? resolveButtonArgumentDefs(w, presetData) : [];
  const buttonArgMaps =
    w.type === 'button' ? getButtonArgumentMaps(w?.binding) : null;
  const buttonDefaultArgs = buttonArgMaps?.defaults || {};
  const buttonEffectiveArgs = buttonArgMaps?.effective || {};
  const buttonCanReset =
    w.type === 'button' &&
    !areArgumentMapsEqual(buttonEffectiveArgs, buttonDefaultArgs);
  const buttonCanSetDefault = buttonCanReset;

  const persistBrowseMedia = (nextPath, nextThumb) => {
    if (!updateWidget) return;
    const nextType = inferType(nextPath);
    const nextDir = inferDir(nextPath);
    const samePath =
      String(nextPath || '').trim() ===
      String(w.mediaPath || '').trim();
    updateWidget(w.id, {
      mediaPath: nextPath,
      mediaThumb:
        nextType === 'image'
          ? nextThumb ?? (samePath ? w.mediaThumb || '' : '')
          : '',
      mediaType: nextType,
      ...(nextDir ? { browseLastDir: nextDir } : {}),
      ...(nextType ? { browsePreferType: nextType } : {}),
    });
  };

  function handleSelect() {
    if (!editMode) return;
    setSelectedId?.(w.id);
    setLeftPanelMode?.('editor');
  }

  function handleMouseDown(e) {
    if (!editMode) return;

    // éviter que la sélection dans la sidebar interfere
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    setDragState?.({
      active: true,
      widgetId: w.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      widgetWidth: rect.width,
      widgetHeight: rect.height
    });

    setSelectedId?.(w.id);
    setLeftPanelMode?.('editor');
  }

  function renderTargetsDots(className = 'prod-target-dots') {
    return (
      <div className={className}>
        {Object.entries(w.targets || {})
          .filter(([, v]) => v)
          .map(([ip]) => {
            const host = hosts.find((h) => String(h?.ip || '') === ip);
            const label = host?.name ? `${host.name} — ${ip}` : ip;
            return (
              <span
                key={ip}
                className={`uu-pastille prod-target-dot ${colorClass(
                  host?.color
                )}`}
                title={label}
              />
            );
          })}
      </div>
    );
  }

    return (
      <div
        ref={cardRef}
        className={`${baseClass} ${selectedClass}${typeClass}${
          needsBinding ? ' prod-widget-missing' : ''
        }`.trim()}
        style={cardStyle}
        onClick={handleSelect}
        onMouseDown={handleMouseDown}
      >

      {/* CONTENU SPÉCIFIQUE PAR TYPE */}
      {/* Zone */}
      {w.type === 'zone' && (
        <ZoneWidget
          label={w.label}
          note={w.note}
          color={w.ui?.color}
          editMode={editMode}
          onDuplicate={duplicateHandler}
          onDelete={
            editMode ? () => removeWidget?.(w.id) : undefined
          }
          onHeaderHeightChange={(headerHeight) =>
            onZoneHeaderHeightChange?.(w.id, headerHeight)
          }
        />
      )}
      
      {/* Button */}
      {w.type === 'button' && (
        <ButtonWidget
          label={w.label}
          showLabel={w.ui?.showLabel !== false}
          color={w.ui?.buttonColor || w.ui?.color}
          showArguments={w?.ui?.showArguments === true}
          argDefs={buttonArgDefs}
          argValues={buttonEffectiveArgs}
          onArgChange={(name, nextValue) => {
            if (!updateWidget) return;
            const argName = String(name || '').trim();
            if (!argName) return;

            const currentBinding =
              w?.binding && typeof w.binding === 'object'
                ? w.binding
                : { kind: 'function' };
            const hasArgDefaults =
              currentBinding?.argDefaults &&
              typeof currentBinding.argDefaults === 'object';
            const legacyDefaults =
              !hasArgDefaults &&
              currentBinding?.argValues &&
              typeof currentBinding.argValues === 'object'
                ? currentBinding.argValues
                : {};
            const currentArgValues =
              hasArgDefaults &&
              currentBinding?.argValues &&
              typeof currentBinding.argValues === 'object'
                ? currentBinding.argValues
                : {};
            const nextArgValues = { ...currentArgValues };

            if (typeof nextValue === 'undefined') {
              delete nextArgValues[argName];
            } else {
              nextArgValues[argName] = nextValue;
            }

            updateWidget(w.id, {
              binding: {
                ...currentBinding,
                ...(!hasArgDefaults
                  ? { argDefaults: { ...legacyDefaults } }
                  : {}),
                argValues: nextArgValues
              }
            });
          }}
          canResetArgs={buttonCanReset}
          canSetDefaultArgs={buttonCanSetDefault}
          onResetArgs={() => {
            if (!updateWidget) return;
            const currentBinding =
              w?.binding && typeof w.binding === 'object'
                ? w.binding
                : { kind: 'function' };
            updateWidget(w.id, {
              binding: {
                ...currentBinding,
                argDefaults: { ...buttonDefaultArgs },
                argValues: { ...buttonDefaultArgs }
              }
            });
          }}
          onSetDefaultArgs={() => {
            if (!updateWidget) return;
            const currentBinding =
              w?.binding && typeof w.binding === 'object'
                ? w.binding
                : { kind: 'function' };
            const nextDefaults = { ...buttonEffectiveArgs };
            updateWidget(w.id, {
              binding: {
                ...currentBinding,
                argDefaults: nextDefaults,
                argValues: { ...buttonEffectiveArgs }
              }
            });
          }}
          disabled={!boundOk}
          onExecute={async () => {
            // 1) Envoi vers Unreal
            await wrcCallFunctionForWidget(
              w,
              hosts,
              common,
              buttonEffectiveArgs
            );

            // 2) Log côté agent (uniquement en mode Production)
            if (!editMode) {
              const sel = w.targets || {};
              const targets = Object.entries(sel)
                .filter(([, enabled]) => !!enabled)
                .map(([ip]) => ip);

              try {
                await logWidgetAction({
                  level: 'info',
                  action: 'widget_press',
                  scope: 'production',
                  widgetId: w.id,
                  widgetType: w.type,
                  widgetLabel: w.label,
                  targets
                });
              } catch {
                // on ignore les erreurs de log
              }
            }
          }}
          onDelete={
            editMode
              ? () => removeWidget?.(w.id)
              : undefined
          }
          onDuplicate={duplicateHandler}
          // Pastilles machines affichées dans le widget via rightSlot
          rightSlot={renderTargetsDots()}
          editMode={editMode}
        />
      )}

      {/* Text */}
      {w.type === 'text' && (
        <TextWidget
          label={w.label}
          value={value ?? w.defaultValue ?? ''}
          onChange={(v) =>
            setValues((s) => ({
              ...s,
              [w.id]: v
            }))
          }
          onCommit={async (v) => {
            // 1) Envoi vers Unreal
            await wrcPutPropertyForWidget(w, hosts, common, v);

            // 2) Log uniquement en mode Production
            if (!editMode) {
              const sel = w.targets || {};
              const targets = Object.entries(sel)
                .filter(([, enabled]) => !!enabled)
                .map(([ip]) => ip);

              try {
                await logWidgetAction({
                  level: 'info',
                  action: 'widget_press',
                  scope: 'production',
                  widgetId: w.id,
                  widgetType: w.type,
                  widgetLabel: w.label,
                  value: v,
                  targets
                });
              } catch {
                // on ignore les erreurs de log
              }
            }
          }}
          disabled={!boundOk}
          onDelete={
            editMode
              ? () => removeWidget?.(w.id)
              : undefined
          }
          valueType={w.binding?.valueType}
          defaultValue={w.defaultValue}
          // Les pastilles sont rendues par le widget via rightSlot
          rightSlot={renderTargetsDots()}
          onDuplicate={duplicateHandler}
          editMode={editMode}
        />
      )}

      {/* Slider */}
      {w.type === 'slider' && (
        <SliderWidget
          widget={w}
          value={value}
          disabled={!boundOk}
          editMode={editMode}
          onSetDefault={(next) => {
            if (updateWidget)
              updateWidget(w.id, {
                defaultValue: next,
                ui: { ...(w.ui || {}), default: next }
              });
          }}
          onChange={(v) =>
            setValues((s) => ({
              ...s,
              [w.id]: v
            }))
          }
          onCommit={async (v) => {
            // 1) Envoi vers Unreal
            await wrcPutPropertyForWidget(w, hosts, common, v);

            // 2) Log uniquement en mode Production ET si pas "live"
            if (!editMode && w?.ui?.live !== true) {
              const sel = w.targets || {};
              const targets = Object.entries(sel)
                .filter(([, enabled]) => !!enabled)
                .map(([ip]) => ip);

              try {
                await logWidgetAction({
                  level: 'info',
                  action: 'widget_press',
                  scope: 'production',
                  widgetId: w.id,
                  widgetType: w.type,
                  widgetLabel: w.label,
                  value: v,
                  targets
                });
              } catch {
                // on ignore les erreurs de log
              }
            }
          }}
          onDelete={
            editMode
              ? () => removeWidget?.(w.id)
              : undefined
          }
          onDuplicate={duplicateHandler}
          targetsSlot={renderTargetsDots()}
        />
      )}

      {w.type === 'timeline' && (
        <TimelineWidget
          widget={w}
          hosts={hosts}
          common={common}
          editMode={editMode}
          onDelete={editMode ? () => removeWidget?.(w.id) : undefined}
        />
      )}

      {/* Vector */}
      {w.type === 'vector' && (
        <VectorWidget
          widget={w}
          value={value}
          disabled={!boundOk}
          editMode={editMode}
          onSetDefault={(next) => {
            if (updateWidget)
              updateWidget(w.id, {
                defaultValue: next,
                ui: {
                  ...(w.ui || {}),
                  defaultX: next?.X,
                  defaultY: next?.Y,
                  defaultZ: next?.Z
                }
              });
          }}
          onChange={(v) =>
            setValues((s) => ({
              ...s,
              [w.id]: v
            }))
          }
          onCommit={async (v) => {
            // 1) Envoi vers Unreal
            await wrcPutPropertyForWidget(w, hosts, common, v);

            // 2) Log uniquement en mode Production ET si pas "live"
            if (!editMode && w?.ui?.live !== true) {
              const sel = w.targets || {};
              const targets = Object.entries(sel)
                .filter(([, enabled]) => !!enabled)
                .map(([ip]) => ip);

              try {
                await logWidgetAction({
                  level: 'info',
                  action: 'widget_press',
                  scope: 'production',
                  widgetId: w.id,
                  widgetType: w.type,   // "vector"
                  widgetLabel: w.label,
                  value: v,             // { X, Y, Z }
                  targets
                });
              } catch {
                // on ignore les erreurs de log
              }
            }
          }}
          onDelete={editMode ? () => removeWidget?.(w.id) : undefined}
          onDuplicate={duplicateHandler}
          rightSlot={renderTargetsDots()}
        />
      )}

      {w.type === 'toggle' && (
        <ToggleWidget
          widget={w}
          value={value}
          defaultValue={w.defaultValue}
          disabled={!boundOk}
          editMode={editMode}
          onChange={(v) =>
            setValues((s) => ({
              ...s,
              [w.id]: v
            }))
          }
          onCommit={async (v) => {
            const bindingKind =
              w?.binding?.kind === 'function' ? 'function' : 'property';

            if (bindingKind === 'function') {
              const paramBools = w?.binding?.paramBools || {};
              const argValues = {};

              Object.keys(paramBools).forEach((name) => {
                const follows = !!paramBools[name];
                argValues[name] = follows ? v : !v;
              });

              const fnWidget = {
                ...w,
                binding: {
                  ...(w.binding || {}),
                  kind: 'function',
                  argValues
                }
              };
              await wrcCallFunctionForWidget(fnWidget, hosts, common);
            } else {
              // 1) Envoi vers Unreal (propriété bool)
              await wrcPutPropertyForWidget(w, hosts, common, v);
            }

            // 2) Log uniquement en mode Production
            if (!editMode) {
              const sel = w.targets || {};
              const targets = Object.entries(sel)
                .filter(([, enabled]) => !!enabled)
                .map(([ip]) => ip);

              try {
                await logWidgetAction({
                  level: 'info',
                  action: 'widget_press',
                  scope: 'production',
                  widgetId: w.id,
                widgetType: w.type,   // "toggle"
                widgetLabel: w.label,
                value: v,             // true / false
                targets
              });
              } catch {
                // on ignore les erreurs de log
              }
            }
          }}
          onSetDefault={(next) => {
            if (updateWidget) {
              updateWidget(w.id, {
                defaultValue: !!next
              });
            }
          }}
          onDelete={
            editMode
              ? () => removeWidget?.(w.id)
              : undefined
          }
          onDuplicate={duplicateHandler}
          targetsSlot={renderTargetsDots()}
        />
      )}

      {/* Dropdown */}
      {w.type === 'dropdown' && (() => {
        const options =
          Array.isArray(w.ui?.options)
            ? w.ui.options
            : [];

        const initialValue =
          value ??
          (options.length > 0 ? options[0].value ?? '' : '');

        return (
          <DropdownWidget
            label={w.label}
            value={initialValue}
            options={options}
            defaultValue={w.defaultValue}
            valueType={w.binding?.valueType}
            disabled={!boundOk}
            editMode={editMode}
            onChange={(v) =>
              setValues((s) => ({
                ...s,
                [w.id]: v
              }))
            }
            onCommit={async (v) => {
              // 1) Envoi vers Unreal
              await wrcPutPropertyForWidget(w, hosts, common, v);

              // 2) Log uniquement en mode Production
              if (!editMode) {
                const sel = w.targets || {};
                const targets = Object.entries(sel)
                  .filter(([, enabled]) => !!enabled)
                  .map(([ip]) => ip);

                try {
                  await logWidgetAction({
                    level: 'info',
                    action: 'widget_press',
                    scope: 'production',
                    widgetId: w.id,
                    widgetType: w.type,   // "dropdown"
                    widgetLabel: w.label,
                    value: v,
                    targets
                  });
                } catch {
                  // on ignore les erreurs de log
                }
              }
            }}
            onDelete={
              editMode ? () => removeWidget(w.id) : undefined
            }
            onDuplicate={duplicateHandler}
            rightSlot={renderTargetsDots()}
          />
        );
      })()}

      {/* Color */}
      {w.type === 'color' && (
        <ColorWidget
          label={w.label}
          value={value ?? w.defaultValue ?? '#ffffff'}
          defaultValue={w.defaultValue}
          onSetDefault={(next) => {
            if (updateWidget) updateWidget(w.id, { defaultValue: next });
          }}
          onChange={(v) =>
            setValues((s) => ({
              ...s,
              [w.id]: v
            }))
          }
          onCommit={async (v) => {
            // 1) Envoi vers Unreal
            await wrcPutPropertyForWidget(w, hosts, common, v);

            // 2) Log uniquement en mode Production
            if (!editMode) {
              const sel = w.targets || {};
              const targets = Object.entries(sel)
                .filter(([, enabled]) => !!enabled)
                .map(([ip]) => ip);

              try {
                await logWidgetAction({
                  level: 'info',
                  action: 'widget_press',
                  scope: 'production',
                  widgetId: w.id,
                  widgetType: w.type,   // "color"
                  widgetLabel: w.label,
                  value: v,             // couleur envoyée
                  targets
                });
              } catch {
                // on ignore les erreurs de log
              }
            }
          }}
          disabled={!boundOk}
          allowEditWhenDisabled
          onDelete={
            editMode
              ? () => removeWidget?.(w.id)
              : undefined
          }
          rightSlot={renderTargetsDots()}
          onDuplicate={duplicateHandler}
          editMode={editMode}
        />
      )}

      {/* Joystick */}
      {w.type === 'joystick' && (
        <JoystickWidget
          label={w.label}
          showLabel={w.ui?.showLabel !== false}
          value={value || {}}
          defaultValue={w.defaultValue}
          ui={w.ui}
          disabled={!boundOk}
          editMode={editMode}
          targetsSlot={renderTargetsDots()}
          onDuplicate={duplicateHandler}
          onSetDefault={(next) => {
            if (updateWidget) updateWidget(w.id, { defaultValue: next });
          }}
          onChange={(next) =>
            setValues((prev) => ({
              ...prev,
              [w.id]: next
            }))
          }
          onCommit={async (next) => {
            if (!boundOk) return;

            // 1) Envoi vers Unreal
            await wrcSendJoystickForWidget(w, hosts, common, next);

            // 2) Log uniquement en mode Production ET si pas "live"
            if (!editMode && w?.ui?.live !== true) {
              const sel = w.targets || {};
              const targets = Object.entries(sel)
                .filter(([, enabled]) => !!enabled)
                .map(([ip]) => ip);
              try {
                await logWidgetAction({
                  level: 'info',
                  action: 'widget_press',
                  scope: 'production',
                  widgetId: w.id,
                  widgetType: w.type,   // "joystick"
                  widgetLabel: w.label,
                  value: next,          // { X, Y, Z }
                  targets
                });
              } catch {
                // on ignore les erreurs de log
              }
            }
          }}
          onDelete={
            editMode
              ? () => removeWidget?.(w.id)
              : undefined
          }
        />
      )}

      {/* Enum */}
      {w.type === 'enum' && (() => {
        // 1) On privilégie les valeurs venues d'Unreal (binding.enumValues)
        const bindingEnumValues =
          Array.isArray(w.binding?.enumValues) &&
          w.binding.enumValues.length > 0
            ? w.binding.enumValues
            : null;

        const options =
          bindingEnumValues && bindingEnumValues.length > 0
            ? bindingEnumValues
            : Array.isArray(w.ui?.options)
            ? w.ui.options
            : [];

        const initialValue =
          value ??
          (options.length > 0 ? options[0].value ?? '' : '');

        return (
          <EnumWidget
            label={w.label}
            value={initialValue}
            options={options}
            defaultValue={w.defaultValue}
            disabled={!boundOk}
            editMode={editMode}
            onChange={(v) =>
              setValues((s) => ({
                ...s,
                [w.id]: v
              }))
            }
            onCommit={async (v) => {
              // 1) Envoi vers Unreal
              await wrcPutPropertyForWidget(w, hosts, common, v);

              // 2) Log uniquement en mode Production
              if (!editMode) {
                const sel = w.targets || {};
                const targets = Object.entries(sel)
                  .filter(([, enabled]) => !!enabled)
                  .map(([ip]) => ip);

                try {
                  await logWidgetAction({
                    level: 'info',
                    action: 'widget_press',
                    scope: 'production',
                    widgetId: w.id,
                    widgetType: w.type, // "enum"
                    widgetLabel: w.label,
                    value: v,
                    targets
                  });
                } catch {
                  // on ignore les erreurs de log
                }
              }
            }}
            onDelete={editMode ? () => removeWidget?.(w.id) : undefined}
            onDuplicate={duplicateHandler}
            rightSlot={renderTargetsDots()}
          />
        );
      })()}

      {/* Browse */}
      {w.type === 'browse' && (
        (() => {
          const browseValue = values?.[w.id] ?? w.mediaPath ?? '';
          return (
        <BrowseWidget
          label={w.label}
          value={browseValue}
          t={t}
          thumb={w.mediaThumb}
          defaultValue={w.defaultValue}
          browseLastDir={w.browseLastDir}
          browsePreferType={w.browsePreferType}
          live={w?.ui?.live === true}
          onChange={(v) => {
            setValues((s) => ({ ...s, [w.id]: v }));
          }}
          onPersist={(v, thumb) => {
            persistBrowseMedia(v, thumb);
          }}
          onCommit={async (v) => {
            const bindingKind = String(w?.binding?.kind || 'property').toLowerCase();
            if (bindingKind === 'function') {
              const argName = String(w?.binding?.browseArgName || '').trim();
              if (argName) {
                await wrcCallFunctionForWidget(w, hosts, common, {
                  [argName]: String(v ?? '')
                });
              }
            } else {
              await wrcPutPropertyForWidget(w, hosts, common, v);
            }
            if (!editMode) {
              const sel = w.targets || {};
              const targets = Object.entries(sel)
                .filter(([, enabled]) => !!enabled)
                .map(([ip]) => ip);
              try {
                await logWidgetAction({
                  level: 'info',
                  action: 'widget_press',
                  scope: 'production',
                  widgetId: w.id,
                  widgetType: w.type,
                  widgetLabel: w.label,
                  value: v,
                  targets
                });
              } catch {}
            }
          }}
          onSetDefault={(v) => {
            if (!updateWidget) return;
            const nextType = inferType(v);
            const nextDir = inferDir(v);
            updateWidget(w.id, {
              defaultValue: v,
              ...(nextDir ? { browseLastDir: nextDir } : {}),
              ...(nextType ? { browsePreferType: nextType } : {}),
            });
          }}
          // On autorise l'édition même si le binding n'est pas prêt, mais on désactive en prod si non lié
          disabled={!editMode && !boundOk}
          editMode={editMode}
          onDelete={
            editMode
              ? () => removeWidget?.(w.id)
              : undefined
          }
          rightSlot={renderTargetsDots()}
          onDuplicate={duplicateHandler}
        />
          );
        })()
      )}

      {/* Transform */}
      {w.type === 'transform' && (
        <TransformWidget
          widget={w}
          value={value}
          disabled={!boundOk}
          editMode={editMode}
          onSetDefault={(nextDefault) => {
            if (editMode && updateWidget) {
              updateWidget(w.id, { defaultValue: nextDefault });
            }
          }}
          onChange={(next) =>
            setValues((s) => ({
              ...s,
              [w.id]: next
            }))
          }
          onCommit={async (next) => {
            // 1) Envoi vers Unreal
            await wrcPutPropertyForWidget(w, hosts, common, next);

            // 2) Log uniquement en mode Production ET si pas "live"
            if (!editMode && w?.ui?.live !== true) {
              const sel = w.targets || {};
              const targets = Object.entries(sel)
                .filter(([, enabled]) => !!enabled)
                .map(([ip]) => ip);
              try {
                await logWidgetAction({
                  level: 'info',
                  action: 'widget_press',
                  scope: 'production',
                  widgetId: w.id,
                  widgetType: w.type,     // "transform"
                  widgetLabel: w.label,
                  value: next,            // { Location, Rotation, Scale3D }
                  targets
                });
              } catch {
                // on ignore les erreurs de log
              }
            }
          }}
          onDelete={
            editMode
              ? () => removeWidget?.(w.id)
              : undefined
          }
          onDuplicate={duplicateHandler}
          targetsSlot={renderTargetsDots()}
        />
      )}
    </div>
  );
}

