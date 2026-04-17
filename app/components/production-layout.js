const SNAP = 10;

export function snap(v) {
  const n = Number(v) || 0;
  return Math.round(n / SNAP) * SNAP;
}

function normalizeMediaPath(input = '') {
  let p = String(input || '').trim();
  if (!p) return '';
  if (
    (p.startsWith('"') && p.endsWith('"')) ||
    (p.startsWith("'") && p.endsWith("'"))
  ) {
    p = p.slice(1, -1).trim();
  }
  if (/^file:\/\//i.test(p)) {
    p = p.replace(/^file:\/\//i, '');
    p = p.replace(/^\/+/, '');
    try {
      p = decodeURIComponent(p);
    } catch {
      // ignore decode errors
    }
  }
  p = p.replace(/\\/g, '/');
  return p;
}

export function normalizeBrowseWidget(w) {
  if (!w || w.type !== 'browse') return w;

  const rawMedia = w.mediaPath || '';
  const rawDefault = w.defaultValue || '';
  const rawBrowseLastDir = w.browseLastDir || '';
  const rawBrowsePreferType = String(w.browsePreferType || '').trim().toLowerCase();

  const nextMedia = normalizeMediaPath(rawMedia);
  const nextDefault = normalizeMediaPath(rawDefault);
  const nextBrowseLastDir = normalizeMediaPath(rawBrowseLastDir);
  const nextBrowsePreferType =
    rawBrowsePreferType === 'image' || rawBrowsePreferType === 'video'
      ? rawBrowsePreferType
      : '';

  let nextCurrent = null;
  if (w.currentValue !== undefined) nextCurrent = normalizeMediaPath(w.currentValue);
  else if (w.value !== undefined) nextCurrent = normalizeMediaPath(w.value);

  if (
    nextMedia === rawMedia &&
    nextDefault === rawDefault &&
    nextBrowseLastDir === rawBrowseLastDir &&
    nextBrowsePreferType === rawBrowsePreferType &&
    (nextCurrent === null ||
      nextCurrent === w.currentValue ||
      nextCurrent === w.value)
  ) {
    return w;
  }

  const out = { ...w };
  if (nextMedia !== rawMedia) out.mediaPath = nextMedia;
  if (nextDefault !== rawDefault) out.defaultValue = nextDefault;
  if (nextBrowseLastDir !== rawBrowseLastDir) out.browseLastDir = nextBrowseLastDir;
  if (nextBrowsePreferType !== rawBrowsePreferType) out.browsePreferType = nextBrowsePreferType;
  if (nextCurrent !== null) {
    if (w.currentValue !== undefined && nextCurrent !== w.currentValue) {
      out.currentValue = nextCurrent;
    } else if (w.value !== undefined && nextCurrent !== w.value) {
      out.value = nextCurrent;
    }
  }
  return out;
}

export function extractValuesFromLayout(layout = []) {
  const out = {};
  for (const w of layout || []) {
    if (!w || !w.id) continue;
    if (w.currentValue !== undefined) {
      out[w.id] = w.currentValue;
    } else if (w.value !== undefined) {
      out[w.id] = w.value;
    }
  }
  return out;
}

// Tri des machines comme dans Setup:
// 1) machines éligibles d'abord, puis exclues
// 2) sortIndex (ordre utilisateur)
// 3) fallback nom puis IP
export function sortHosts(list, locale = 'fr') {
  const collator = new Intl.Collator(locale || 'fr', { numeric: true, sensitivity: 'base' });
  const withMeta = [...(Array.isArray(list) ? list : [])].map((h, idx) => {
    const n = Number(h?.sortIndex);
    return {
      host: h,
      idx,
      sortIndex: Number.isFinite(n) ? n : idx,
      segment: (h?.renderAvailability === 'excluded' || h?.eligible === false) ? 1 : 0,
    };
  });

  return withMeta
    .sort((a, b) => {
      if (a.segment !== b.segment) return a.segment - b.segment;
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
    })
    .map((entry) => entry.host)
    .filter(Boolean);
}

// ---- Zones : constantes de mise en page ----
export const ZONE_HEADER_HEIGHT = 40;   // hauteur approximative du header de la zone
export const ZONE_PADDING = 12;         // padding intérieur pour les enfants
const ZONE_MIN_WIDTH = 260;      // largeur minimale d'une zone
const ZONE_MIN_BODY_HEIGHT = 120; // hauteur min de la partie "body" (hors header)
const LAYOUT_BOTTOM_MARGIN = 10; // marge sous le widget le plus bas

/**
 * À partir de widgets "bruts", calcule :
 *  - layoutWidgets : widgets prêts à être affichés (x/y globaux, w/h fiables)
 *  - layoutHeight  : hauteur max du layout
 *  - zoneDisplay   : géométrie des zones { [zoneId]: { x, y, width, height } }
 *
 * Les widgets "enfants" d'une zone ont :
 *   - w.zoneId = id de la zone
 *   - w.x / w.y = coordonnées RELATIVES à l'intérieur du body de la zone
 *
 * widgetSizes permet d'utiliser la TAILLE RÉELLE mesurée dans le DOM.
 */
export function deriveLayoutGeometry(
  widgets,
  layoutMinHeight,
  widgetSizes = {},
  zoneHeaderHeights = {}
) {
  const layoutWidgets = [];
  let maxBottom = layoutMinHeight;

  // Index des zones par id
  const zones = {};
  (widgets || []).forEach((w) => {
    if (w && w.type === 'zone' && w.id) {
      zones[w.id] = w;
    }
  });

  // Enfants par zone
  const childrenByZone = {};
  (widgets || []).forEach((w) => {
    if (!w || !w.zoneId) return;
    const z = zones[w.zoneId];
    if (!z) return;
    if (!childrenByZone[w.zoneId]) childrenByZone[w.zoneId] = [];
    childrenByZone[w.zoneId].push(w);
  });

  // Géométrie des zones (en pixels, global)
  const zoneDisplay = {};

  Object.values(zones).forEach((z) => {
    const children = childrenByZone[z.id] || [];

    let width = ZONE_MIN_WIDTH;
    let bodyHeight = ZONE_MIN_BODY_HEIGHT;

    // Hauteur réelle du header mesurée dans le DOM (fallback sur la constante)
    let headerHeight = Number(zoneHeaderHeights?.[z.id]);
    if (!Number.isFinite(headerHeight) || headerHeight <= 0) {
      headerHeight = ZONE_HEADER_HEIGHT;
    }

    if (children.length > 0) {
      // Bounding box des enfants en coordonnées RELATIVES
      // ⚠️ On NE normalise plus avec minX/minY : on respecte les coords stockées
      let maxRight = 0;
      let maxBottomLocal = 0;

      children.forEach((child) => {
        const size = widgetSizes?.[child.id];
        const childWidth = Number(
          (size && size.width) || child.w || 260
        );
        const childHeight = Number(
          (size && size.height) || child.h || 160
        );
        const cx = Number(child.x || 0); // coordonnées relatives stockées
        const cy = Number(child.y || 0);

        const right = cx + childWidth;
        const bottom = cy + childHeight;

        if (right > maxRight) maxRight = right;
        if (bottom > maxBottomLocal) maxBottomLocal = bottom;
      });

      const innerWidth = maxRight + ZONE_PADDING * 2;
      const innerHeight = maxBottomLocal + ZONE_PADDING * 2;

      width = Math.max(ZONE_MIN_WIDTH, innerWidth);
      bodyHeight = Math.max(ZONE_MIN_BODY_HEIGHT, innerHeight);
    } else {
      // Zone vide : fallback sur ses propres w/h si présents
      const fallbackW = Number(z.w || ZONE_MIN_WIDTH);
      const fallbackBodyH = Number(z.h || ZONE_MIN_BODY_HEIGHT);
      width = Math.max(ZONE_MIN_WIDTH, fallbackW);
      bodyHeight = Math.max(ZONE_MIN_BODY_HEIGHT, fallbackBodyH);
    }

    const x = Number(z.x ?? 40);
    const y = Number(z.y ?? 40);
    const totalHeight = headerHeight + bodyHeight;

    zoneDisplay[z.id] = {
      x,
      y,
      width,
      height: totalHeight,
      headerHeight
    };

    const bottom = y + totalHeight;
    if (bottom > maxBottom) {
      maxBottom = bottom + LAYOUT_BOTTOM_MARGIN;
    }
  });

  // Widgets affichés : on convertit les enfants de zone en coordonnées globales
  (widgets || []).forEach((w) => {
    if (!w) return;
    let x = Number(w.x ?? 40);
    let y = Number(w.y ?? 40);

    const size = widgetSizes?.[w.id];
    let width = Number((size && size.width) || w.w || 260);
    let height = Number((size && size.height) || w.h || 160);

    if (w.type === 'zone') {
      const zd = zoneDisplay[w.id];
      if (zd) {
        x = zd.x;
        y = zd.y;
        width = zd.width;
        height = zd.height;
      }
    } else if (w.zoneId && zoneDisplay[w.zoneId]) {
      // Widget enfant d'une zone → coordonnées globales
      const zd = zoneDisplay[w.zoneId];
      const headerHeight = zd.headerHeight ?? ZONE_HEADER_HEIGHT;
      const bodyTop = zd.y + headerHeight;

      const localX = Number(w.x || 0); // plus de minX/minY ici
      const localY = Number(w.y || 0);

      x = zd.x + ZONE_PADDING + localX;
      y = bodyTop + ZONE_PADDING + localY;
    }

    const bottom = y + height;
    if (bottom > maxBottom) {
      maxBottom = bottom + LAYOUT_BOTTOM_MARGIN;
    }

    layoutWidgets.push({
      ...w,
      x,
      y,
      w: width,
      h: height
    });
  });

  return { layoutWidgets, layoutHeight: maxBottom, zoneDisplay };
}

export function hasValidBinding(widget) {
  if (!widget) return false;

  // Zones et timelines n'ont pas de binding WRC, on les considère toujours "valides"
  if (widget.type === 'zone' || widget.type === 'timeline') return true;

  if (!widget.binding) return false;
  const b = widget.binding;

  // Propriété WRC
  if (b.kind === 'property') {
    const hasPath =
      typeof b.path === 'string' && b.path.trim() !== '';

    // Cas particulier : joystick
    if (widget.type === 'joystick') {
      const linkType = widget.ui?.linkType || 'vector2d';

      // Mode Vector2D : on valide sur la liaison principale
      if (linkType === 'vector2d') {
        return hasPath;
      }

      // Mode Manuel : on valide si X et Y sont renseignés
      const jb = widget.joystickBindings || {};
      const bx = jb.x || {};
      const by = jb.y || {};

      const hasX =
        typeof bx.path === 'string' && bx.path.trim() !== '';
      const hasY =
        typeof by.path === 'string' && by.path.trim() !== '';

      return hasX && hasY;
    }

    // Autres widgets : chemin simple
    return hasPath;
  }

  // Fonction WRC
  if (b.kind === 'function') {
    const hasPath =
      typeof b.path === 'string' && b.path.trim() !== '';
    const hasName =
      typeof b.displayName === 'string' &&
      b.displayName.trim() !== '';
    if (widget.type === 'browse') {
      const hasBrowseArg =
        typeof b.browseArgName === 'string' &&
        b.browseArgName.trim() !== '';
      return (hasPath || hasName) && hasBrowseArg;
    }
    return hasPath || hasName;
  }

  return false;
}

function normalizeBindingToken(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]/g, '');
}

function makeBindingKey(ownerName = '', bindingName = '') {
  const owner = normalizeBindingToken(ownerName);
  const name = normalizeBindingToken(bindingName);
  if (!owner || !name) return '';
  return `${owner}::${name}`;
}

function addBindingKey(targetSet, ownerName, bindingName) {
  if (!targetSet) return;
  const key = makeBindingKey(ownerName, bindingName);
  if (!key) return;
  targetSet.add(key);
}

function addOwnerToken(targetSet, ownerName) {
  if (!targetSet) return;
  const owner = normalizeBindingToken(ownerName);
  if (!owner) return;
  targetSet.add(owner);
}

function getFunctionParamType(raw = {}) {
  return String(
    raw?.Type ||
      raw?.ParameterType ||
      raw?.InnerType ||
      raw?.type ||
      ''
  );
}

function getFunctionParamName(raw = {}, index = 0) {
  return String(
    raw?.Name ||
      raw?.ParameterName ||
      raw?.name ||
      `Param${index + 1}`
  ).trim();
}

function isBrowseFunctionArgType(rawType = '') {
  const t = normalizeBindingToken(rawType);
  if (!t) return false;
  return (
    t.includes('fstring') ||
    t === 'string' ||
    t.includes('ftext') ||
    t === 'text' ||
    t.includes('fname') ||
    t === 'name'
  );
}

function getBrowseFunctionArgMeta(func = {}) {
  const params = Array.isArray(func?.parameters) ? func.parameters : [];
  if (params.length !== 1) return null;
  const p = params[0];
  const name = getFunctionParamName(p, 0);
  const type = getFunctionParamType(p);
  if (!name || !isBrowseFunctionArgType(type)) return null;
  return { name, type };
}

function buildPresetBindingIndex(presetData = null) {
  const props = Array.isArray(presetData?.props) ? presetData.props : [];
  const funcs = Array.isArray(presetData?.funcs) ? presetData.funcs : [];

  const propertyKeys = new Set();
  const propertyByKey = new Map();
  const functionKeys = new Set();
  const browseFunctionKeys = new Set();
  const browseFunctionArgByKey = new Map();
  const propertyOwners = new Set();
  const functionOwners = new Set();

  const indexPropertyKey = (owner, candidate, prop) => {
    const key = makeBindingKey(owner, candidate);
    if (!key) return;
    propertyKeys.add(key);
    if (!propertyByKey.has(key)) {
      propertyByKey.set(key, prop);
    }
  };

  props.forEach((p) => {
    const owner = p?.ownerName;
    addOwnerToken(propertyOwners, owner);
    indexPropertyKey(owner, p?.path, p);
    indexPropertyKey(owner, p?.displayName, p);
    indexPropertyKey(owner, p?.propertyName, p);
  });

  funcs.forEach((f) => {
    const ownerName = f?.ownerName;
    addOwnerToken(functionOwners, ownerName);
    addBindingKey(functionKeys, ownerName, f?.displayName);
    const key = makeBindingKey(ownerName, f?.displayName);
    const browseArg = getBrowseFunctionArgMeta(f);
    if (key && browseArg) {
      browseFunctionKeys.add(key);
      browseFunctionArgByKey.set(key, browseArg.name);
    }
  });

  return {
    propertyKeys,
    propertyByKey,
    functionKeys,
    browseFunctionKeys,
    browseFunctionArgByKey,
    propertyOwners,
    functionOwners
  };
}

function reconcileFunctionBinding(binding, presetIndex, options = {}) {
  const current = binding && typeof binding === 'object' ? binding : {};
  const requireBrowseSignature = !!options.requireBrowseSignature;
  const ownerName = String(current.ownerName || '').trim();
  const ownerToken = normalizeBindingToken(ownerName);
  const ownerExists =
    !!ownerToken && presetIndex.functionOwners.has(ownerToken);
  const selectedName = String(
    current.displayName || current.path || ''
  ).trim();

  if (!selectedName) {
    let next = current;
    let changed = false;
    if (ownerName && !ownerExists) {
      next = next === current ? { ...current } : next;
      next.ownerName = '';
      changed = true;
    }
    if (String(next.browseArgName || '').trim() !== '') {
      next = next === current ? { ...current } : next;
      next.browseArgName = '';
      changed = true;
    }
    if (changed) {
      return {
        binding: next,
        changed: true,
        invalidated: false
      };
    }
    return { binding: current, changed: false, invalidated: false };
  }

  const key = makeBindingKey(ownerName, selectedName);
  const functionExists = !!key && presetIndex.functionKeys.has(key);
  const browseSigValid =
    !requireBrowseSignature ||
    (!!key && presetIndex.browseFunctionKeys.has(key));

  if (functionExists && browseSigValid) {
    if (requireBrowseSignature) {
      const expectedArg = String(
        presetIndex.browseFunctionArgByKey.get(key) || ''
      ).trim();
      const currentArg = String(current.browseArgName || '').trim();
      if (expectedArg && currentArg !== expectedArg) {
        return {
          binding: { ...current, browseArgName: expectedArg },
          changed: true,
          invalidated: false
        };
      }
    }
    return { binding: current, changed: false, invalidated: false };
  }

  const next = { ...current };
  let changed = false;

  if (String(next.displayName || '').trim() !== '') {
    next.displayName = '';
    changed = true;
  }
  if (String(next.path || '').trim() !== '') {
    next.path = '';
    changed = true;
  }
  if (String(next.ownerName || '').trim() !== '') {
    next.ownerName = '';
    changed = true;
  }
  if (next.argValues && Object.keys(next.argValues).length > 0) {
    next.argValues = {};
    changed = true;
  }
  if (next.argDefaults && Object.keys(next.argDefaults).length > 0) {
    next.argDefaults = {};
    changed = true;
  }
  if (next.paramBools && Object.keys(next.paramBools).length > 0) {
    next.paramBools = {};
    changed = true;
  }
  if (String(next.browseArgName || '').trim() !== '') {
    next.browseArgName = '';
    changed = true;
  }

  return {
    binding: changed ? next : current,
    changed,
    invalidated: changed
  };
}

function reconcilePropertyBinding(binding, presetIndex) {
  const current = binding && typeof binding === 'object' ? binding : {};
  const ownerName = String(current.ownerName || '').trim();
  const ownerToken = normalizeBindingToken(ownerName);
  const ownerExists =
    !!ownerToken && presetIndex.propertyOwners.has(ownerToken);
  const selectedPath = String(current.path || '').trim();

  if (!selectedPath) {
    if (ownerName && !ownerExists) {
      return {
        binding: { ...current, ownerName: '' },
        changed: true,
        invalidated: false
      };
    }
    return { binding: current, changed: false, invalidated: false };
  }

  const key = makeBindingKey(ownerName, selectedPath);
  const valid = !!key && presetIndex.propertyKeys.has(key);
  if (valid) {
    const linkedProp = presetIndex.propertyByKey.get(key) || null;
    if (!linkedProp) {
      return { binding: current, changed: false, invalidated: false };
    }

    const next = { ...current };
    let changed = false;

    const canonicalOwner = String(linkedProp.ownerName || '').trim();
    if (canonicalOwner && String(next.ownerName || '').trim() !== canonicalOwner) {
      next.ownerName = canonicalOwner;
      changed = true;
    }

    const canonicalPropName = String(
      linkedProp.propertyName ||
      linkedProp.displayName ||
      ''
    ).trim();
    if (canonicalPropName && String(next.propertyName || '').trim() !== canonicalPropName) {
      next.propertyName = canonicalPropName;
      changed = true;
    }

    const canonicalValueType = String(linkedProp.type || '').trim();
    if (canonicalValueType && String(next.valueType || '').trim() !== canonicalValueType) {
      next.valueType = canonicalValueType;
      changed = true;
    }

    if (!changed) {
      return { binding: current, changed: false, invalidated: false };
    }
    return { binding: next, changed: true, invalidated: false };
  }

  const next = { ...current };
  let changed = false;

  if (String(next.path || '').trim() !== '') {
    next.path = '';
    changed = true;
  }
  if (String(next.ownerName || '').trim() !== '') {
    next.ownerName = '';
    changed = true;
  }
  if (String(next.propertyName || '').trim() !== '') {
    next.propertyName = '';
    changed = true;
  }

  return {
    binding: changed ? next : current,
    changed,
    invalidated: changed
  };
}

function reconcileWidgetBindingStrict(widget, presetIndex) {
  if (!widget || typeof widget !== 'object') {
    return { widget, changed: false, invalidatedCount: 0 };
  }

  let changed = false;
  let invalidatedCount = 0;
  let nextWidget = widget;

  if (widget.binding && typeof widget.binding === 'object') {
    const kind = String(widget.binding.kind || '').toLowerCase();
    const isBrowseFunction =
      String(widget.type || '').toLowerCase() === 'browse' &&
      kind === 'function';
    const result =
      kind === 'function'
        ? reconcileFunctionBinding(widget.binding, presetIndex, {
            requireBrowseSignature: isBrowseFunction
          })
        : kind === 'property'
        ? reconcilePropertyBinding(widget.binding, presetIndex)
        : null;

    if (result?.changed) {
      nextWidget = { ...nextWidget, binding: result.binding };
      changed = true;
    }
    if (result?.invalidated) invalidatedCount += 1;
  }

  // Joystick manuel: deux liaisons additionnelles X/Y
  if (
    String(widget.type || '').toLowerCase() === 'joystick' &&
    widget.ui?.linkType === 'manual' &&
    widget.joystickBindings &&
    typeof widget.joystickBindings === 'object'
  ) {
    const baseBindings = widget.joystickBindings;
    let nextBindings = baseBindings;
    ['x', 'y'].forEach((axis) => {
      const axisBinding = baseBindings?.[axis];
      if (!axisBinding || typeof axisBinding !== 'object') return;
      const axisKind = String(axisBinding.kind || 'property').toLowerCase();
      const result =
        axisKind === 'function'
          ? reconcileFunctionBinding(axisBinding, presetIndex)
          : reconcilePropertyBinding(axisBinding, presetIndex);
      if (result?.changed) {
        if (nextBindings === baseBindings) nextBindings = { ...baseBindings };
        nextBindings[axis] = result.binding;
        changed = true;
      }
      if (result?.invalidated) invalidatedCount += 1;
    });

    if (nextBindings !== baseBindings) {
      nextWidget = { ...nextWidget, joystickBindings: nextBindings };
    }
  }

  return {
    widget: changed ? nextWidget : widget,
    changed,
    invalidatedCount
  };
}

function reconcileTimelineWidgetBindingStrict(widget, presetIndex) {
  if (!widget || typeof widget !== 'object') {
    return { widget, changed: false, invalidatedCount: 0 };
  }

  const timeline = widget.ui?.timeline;
  const timelineWidgets = Array.isArray(timeline?.widgets)
    ? timeline.widgets
    : [];
  if (!timelineWidgets.length) {
    return { widget, changed: false, invalidatedCount: 0 };
  }

  let changed = false;
  let invalidatedCount = 0;
  const nextTimelineWidgets = timelineWidgets.map((inner) => {
    const result = reconcileWidgetBindingStrict(inner, presetIndex);
    if (result.changed) changed = true;
    invalidatedCount += result.invalidatedCount;
    return result.widget;
  });

  if (!changed) {
    return { widget, changed: false, invalidatedCount };
  }

  return {
    widget: {
      ...widget,
      ui: {
        ...(widget.ui || {}),
        timeline: {
          ...(timeline || {}),
          widgets: nextTimelineWidgets
        }
      }
    },
    changed: true,
    invalidatedCount
  };
}

export function reconcileWidgetsWithPreset(widgets = [], presetData = null) {
  if (!Array.isArray(widgets) || widgets.length === 0 || !presetData) {
    return {
      widgets: Array.isArray(widgets) ? widgets : [],
      changed: false,
      invalidatedCount: 0
    };
  }

  const presetIndex = buildPresetBindingIndex(presetData);
  let changed = false;
  let invalidatedCount = 0;

  const nextWidgets = widgets.map((widget) => {
    const type = String(widget?.type || '').toLowerCase();
    const result =
      type === 'timeline'
        ? reconcileTimelineWidgetBindingStrict(widget, presetIndex)
        : reconcileWidgetBindingStrict(widget, presetIndex);

    if (result.changed) changed = true;
    invalidatedCount += result.invalidatedCount;
    return result.widget;
  });

  return {
    widgets: changed ? nextWidgets : widgets,
    changed,
    invalidatedCount
  };
}

/* ----------- Utils ----------- */
function ownerLabel(owner) {
  if (!owner) return '';
  const cls = owner.Class || owner.class || '';
  const name = owner.Name || owner.name || '';
  const path = owner.Path || owner.path || '';

  const isGeneric = (s) => {
    const v = String(s || '').toLowerCase();
    return (
      !v ||
      v === 'defaultsceneroot' ||
      v === 'scenecomponent' ||
      v === 'persistentlevel'
    );
  };

  const looksLikeBp = (s) => /bp[_\.]/i.test(String(s || '')) || /_c\b/i.test(String(s || ''));

  // 1) Si Name ou Class est déjà un blueprint/actor non générique, on le garde
  if (name && !isGeneric(name) && looksLikeBp(name)) {
    return name;
  }
  if (cls && !isGeneric(cls) && looksLikeBp(cls)) {
    return cls;
  }

  // 2) Tenter d'extraire l'actor/blueprint depuis le Path
  if (path) {
    // ex: /Game/...:PersistentLevel.BP_CineCam_C_1.CineCamera
    const afterColon = path.split(':').pop() || '';
    const parts = afterColon.split('.').filter(Boolean);
    if (parts.length >= 2) {
      const actor = parts[parts.length - 2];
      if (actor && !/persistentlevel/i.test(actor)) {
        return actor.replace(/_C_.*/, '_C').replace(/_C\d*$/, '_C');
      }
    }
    if (parts.length > 0) {
      const actor = parts[0];
      if (actor && !/persistentlevel/i.test(actor)) {
        return actor.replace(/_C_.*/, '_C').replace(/_C\d*$/, '_C');
      }
    }
  }

  // 3) Classe parlante non générique
  if (cls && !isGeneric(cls)) return cls;

  // 4) Fallback sur Name ou Class
  return name || cls || '';
}

function isTransformStruct(rawProp = {}) {
  // Essaye de détecter un Transform encapsulé dans un Struct (ex: Blueprint)
  const underlying = rawProp.UnderlyingProperty || rawProp.underlyingProperty || {};

  // 1) Champs explicites de type struct
  const candidates = [
    rawProp.StructType,
    rawProp.structType,
    rawProp.Struct,
    rawProp.struct,
    underlying.StructType,
    underlying.structType,
    underlying.Struct,
    underlying.struct,
  ];

  if (candidates.some((v) => String(v || '').toLowerCase() === 'transform' || String(v || '').toLowerCase() === 'ftransform')) {
    return true;
  }

  // 2) Heuristique par enfants (Location/Rotation/Scale3D)
  const childLists = [
    rawProp.ChildProperties,
    rawProp.Properties,
    rawProp.properties,
    underlying.ChildProperties,
    underlying.Properties,
    underlying.properties,
  ].filter(Array.isArray);

  for (const list of childLists) {
    const names = list
      .map((c) => String(c?.Name || c?.name || '').toLowerCase())
      .filter(Boolean);
    const hasLoc = names.includes('location');
    const hasRot = names.includes('rotation');
    const hasScale = names.includes('scale3d') || names.includes('scale');
    if (hasLoc && hasRot && hasScale) return true;
  }

  return false;
}

export function normalizePreset(j) {
  if (!j || typeof j !== 'object') {
    return { props: [], funcs: [] };
  }

  let props = [];
  let funcs = [];

  const groups = Array.isArray(j.Groups)
    ? j.Groups
    : Array.isArray(j.groups)
    ? j.groups
    : [];

  for (const g of groups) {
    if (!g || typeof g !== 'object') continue;

    if (Array.isArray(g.ExposedProperties)) {
      props = props.concat(g.ExposedProperties);
    } else if (Array.isArray(g.properties)) {
      props = props.concat(g.properties);
    }

    if (Array.isArray(g.ExposedFunctions)) {
      funcs = funcs.concat(g.ExposedFunctions);
    } else if (Array.isArray(g.functions)) {
      funcs = funcs.concat(g.functions);
    }
  }

  if (!props.length) {
    if (Array.isArray(j.ExposedProperties)) props = j.ExposedProperties;
    else if (Array.isArray(j.properties)) props = j.properties;
  }
  if (!funcs.length) {
    if (Array.isArray(j.ExposedFunctions)) funcs = j.ExposedFunctions;
    else if (Array.isArray(j.functions)) funcs = j.functions;
  }

  const mapProps = props.map((p) => {
    const underlying = p.UnderlyingProperty || p.underlyingProperty || {};
    const owner =
      (Array.isArray(p.OwnerObjects) && p.OwnerObjects[0]) ||
      (Array.isArray(p.ownerObjects) && p.ownerObjects[0]) ||
      null;

    const displayName =
      p.DisplayName ||
      underlying.DisplayName ||
      underlying.Name ||
      p.Name ||
      p.PropertyName ||
      p.Id ||
      'Property';

    const path =
      p.Path ||
      p.PropertyPath ||
      underlying.Path ||
      underlying.PropertyPath ||
      displayName;

    const rawType =
      underlying.Type ||
      underlying.type ||
      p.Type ||
      p.ValueType ||
      p.type ||
      '';

    let valueType = '';
    const t = String(rawType || '').toLowerCase();

    if (t.includes('bool')) {
      valueType = 'bool';
    } else if (t.includes('float') || t.includes('double')) {
      valueType = 'float';
    } else if (t.includes('byte') || t.includes('uint8')) {
      valueType = 'byte';
    } else if (t.includes('int')) {
      valueType = 'int';
    } else if (t.includes('transform')) {
      valueType = 'transform';
    } else if (t.includes('vector')) {
      valueType = 'vector';
    } else if (t.includes('linearcolor')) {
      valueType = 'flinearcolor';
    } else if (t === 'fcolor' || (t.includes('fcolor') && !t.includes('linearcolor'))) {
      valueType = 'fcolor';
    } else if (t === 'color') {
      valueType = 'color';
    } else if (
      t.includes('text') ||
      t.includes('string') ||
      t.includes('name')
    ) {
      valueType = 'text';
    }

    // Détection supplémentaire : Struct Transform (Blueprint)
    if (!valueType && isTransformStruct(p)) {
      valueType = 'transform';
    }

    const ownerName = ownerLabel(owner);

    return {
      displayName,
      path,
      propertyName:
        p.PropertyName ||
        p.Name ||
        underlying.PropertyName ||
        underlying.Name ||
        displayName,
      type: valueType,
      ownerName,
      raw: p
    };
  });

  // Synthèse de Transform "virtuels" à partir des triplets Location/Rotation/Scale
  const virtuals = [];
  const byOwner = {};

  for (const p of mapProps) {
    const key = String(p.ownerName || '').trim().toLowerCase();
    if (!byOwner[key]) byOwner[key] = [];
    byOwner[key].push(p);
  }

  const normName = (s) => String(s || '').toLowerCase().replace(/[\s_\-]/g, '');

  const hasTransformExisting = (ownerKey, pathLabel) => {
    const target = normName(pathLabel);
    return (byOwner[ownerKey] || []).some(
      (p) => p.type === 'transform' && normName(p.path || '') === target
    );
  };

  function maybeAddVirtual(ownerKey, locName, rotName, scaleName, label) {
    const list = byOwner[ownerKey] || [];
    const names = new Set(
      list.map((p) => normName(p.path || p.displayName || ''))
    );
    if (names.has(normName(locName)) && names.has(normName(rotName)) && names.has(normName(scaleName))) {
      if (hasTransformExisting(ownerKey, label)) return;
      virtuals.push({
        displayName: label,
        path: label,
        type: 'transform',
        ownerName: list[0]?.ownerName || '',
        raw: {
          virtual: true,
          components: { location: locName, rotation: rotName, scale: scaleName },
        },
      });
    }
  }

  for (const [ownerKey] of Object.entries(byOwner)) {
    // Classic Location/Rotation/Scale3D
    maybeAddVirtual(ownerKey, 'location', 'rotation', 'scale3d', 'Transform');
    // Relative variants
    maybeAddVirtual(ownerKey, 'RelativeLocation', 'RelativeRotation', 'RelativeScale3D', 'Relative Transform');
    // Fallback sans prefix (certains exports n'ont pas "Relative")
    maybeAddVirtual(ownerKey, 'Location', 'Rotation', 'Scale3D', 'Transform');
  }

  mapProps.push(...virtuals);

  // 4) Normalisation des fonctions
  const mapFuncs = funcs.map((f) => {
    const owner =
      (Array.isArray(f.OwnerObjects) && f.OwnerObjects[0]) ||
      (Array.isArray(f.ownerObjects) && f.ownerObjects[0]) ||
      null;

    const displayName =
      f.DisplayName ||
      (f.UnderlyingFunction &&
        (f.UnderlyingFunction.DisplayName || f.UnderlyingFunction.Name)) ||
      f.Name ||
      f.Id ||
      'Function';

    const ownerName = ownerLabel(owner);

    // On essaie plusieurs emplacements possibles pour les paramètres
    const uf = f.UnderlyingFunction || f.underlyingFunction || null;

    const candidates = [
      f.Parameters,
      f.parameters,
      f.Args,
      f.args,
      f.Arguments,
      f.arguments,
      f.FunctionArguments,
      f.functionArguments,
      uf && uf.Parameters,
      uf && uf.parameters,
      uf && uf.Args,
      uf && uf.args,
      uf && uf.Arguments,
      uf && uf.arguments,
      uf && uf.FunctionArguments,
      uf && uf.functionArguments
    ];

    let parameters = [];
    for (const arr of candidates) {
      if (Array.isArray(arr) && arr.length) {
        parameters = arr;
        break;
      }
    }

    return {
      displayName,
      ownerName,
      parameters,
      raw: f
    };
  });

  return { props: mapProps, funcs: mapFuncs };
}

function migrateTargetsToIps(widget, hosts = []) {
  const w = widget || {};
  const t = w.targets || {};
  if (!('A' in t) && !('B' in t)) return w;
  const map = {};
  (hosts || []).forEach((m, idx) => {
    if (!m?.ip) return;
    if (idx === 0 && t.A) map[m.ip] = true;
    else if (idx === 1 && t.B) map[m.ip] = true;
    else map[m.ip] = false;
  });
  return { ...w, targets: map };
}

export function buildLayoutWithValues(widgets = [], values = {}, hosts = []) {
  return Array.isArray(widgets)
    ? widgets.map((item) => {
        const base = migrateTargetsToIps(item, hosts);
        const currentVal = values?.[item.id];

        if (currentVal === undefined) {
          const clone = { ...base };
          delete clone.currentValue;
          return clone;
        }

        return {
          ...base,
          currentValue: currentVal,
        };
      })
    : [];
}
