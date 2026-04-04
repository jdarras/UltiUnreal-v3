const DEFAULT_WIDGET_TYPE = 'text';

const WIDGET_TYPE_OPTIONS = [
  { id: 'button', labelKey: 'production.widgets.buttonLabel', fallback: 'Button' },
  { id: 'text', labelKey: 'production.widgets.textLabel', fallback: 'Text/Number' },
  { id: 'slider', labelKey: 'production.widgets.sliderLabel', fallback: 'Slider' },
  { id: 'vector', labelKey: 'production.widgets.vectorLabel', fallback: 'Vector' },
  { id: 'transform', labelKey: 'production.widgets.transformLabel', fallback: 'Transform' },
  { id: 'joystick', labelKey: 'production.widgets.joystickLabel', fallback: 'Joystick' },
  { id: 'toggle', labelKey: 'production.widgets.toggleLabel', fallback: 'Toggle' },
  { id: 'color', labelKey: 'production.widgets.colorLabel', fallback: 'Color' },
  { id: 'dropdown', labelKey: 'production.widgets.dropdownLabel', fallback: 'Dropdown' },
  { id: 'enum', labelKey: 'production.widgets.enumLabel', fallback: 'Enum' },
  { id: 'browse', labelKey: 'production.widgets.browseLabel', fallback: 'Browse' }
];

function makeId() {
  return (
    (crypto?.randomUUID && crypto.randomUUID()) ||
    String(Date.now()) + Math.random().toString(16).slice(2)
  );
}

function buildTargets(hosts) {
  const targets = {};
  (hosts || []).forEach((m) => {
    if (m?.ip) targets[m.ip] = false;
  });
  return targets;
}

export function getTimelineWidgetTypeOptions(t) {
  return WIDGET_TYPE_OPTIONS.map((opt) => ({
    id: opt.id,
    label: t?.(opt.labelKey) || opt.fallback
  }));
}

export function createTimelineWidget(type, hosts, t) {
  const kind = String(type || DEFAULT_WIDGET_TYPE).toLowerCase();
  const label =
    getTimelineWidgetTypeOptions(t).find((opt) => opt.id === kind)?.label ||
    kind;
  const base = {
    id: makeId(),
    type: kind,
    label,
    targets: buildTargets(hosts)
  };

  const defaults = {
    button: {
      binding: { kind: 'function', displayName: '', argValues: {} }
    },
    text: {
      binding: { kind: 'property', path: '', valueType: 'text' }
    },
    slider: {
      binding: { kind: 'property', path: '', valueType: 'float' },
      ui: { min: -10, max: 10, step: 0.1 }
    },
    vector: {
      binding: { kind: 'property', path: '', valueType: 'vector' },
      ui: {}
    },
    transform: {
      binding: { kind: 'property', path: '', valueType: 'transform' },
      ui: {}
    },
    joystick: {
      binding: { kind: 'property', path: '', valueType: 'vector' },
      ui: {
        linkType: 'vector2d',
        minX: -10,
        maxX: 10,
        minY: -10,
        maxY: 10
      },
      joystickBindings: {
        x: { kind: 'property', path: '', valueType: 'float' },
        y: { kind: 'property', path: '', valueType: 'float' }
      }
    },
    toggle: {
      binding: { kind: 'property', path: '', valueType: 'bool' }
    },
    color: {
      binding: { kind: 'property', path: '', valueType: 'color' }
    },
    dropdown: {
      binding: { kind: 'property', path: '', valueType: 'text' },
      ui: {
        options: [
          { label: 'Option 1', value: 'Option 1' },
          { label: 'Option 2', value: 'Option 2' }
        ]
      }
    },
    enum: {
      binding: { kind: 'property', path: '', valueType: 'text' },
      ui: {
        options: [
          { label: 'Option 1', value: 'Option 1' },
          { label: 'Option 2', value: 'Option 2' }
        ]
      }
    },
    browse: {
      binding: { kind: 'property', path: '', valueType: 'text' }
    }
  };

  return { ...base, ...(defaults[kind] || defaults[DEFAULT_WIDGET_TYPE]) };
}

export function syncTimelineWidgetTargets(widget, hosts) {
  const targets = { ...(widget?.targets || {}) };
  (hosts || []).forEach((m) => {
    if (m?.ip && !(m.ip in targets)) targets[m.ip] = false;
  });
  return { ...(widget || {}), targets };
}
