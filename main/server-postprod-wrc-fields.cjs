// Lecture des préréglages Unreal (Web Remote Control) : propriétés exposées
// d'un préréglage ou identifiants d'une disposition, transformés en champs de
// formulaire de rendu (fonctions pures, sans réseau).
const {
  sanitizeRenderFormFieldKey,
  sanitizeRenderFormFieldLabel,
  normalizeRenderFormFieldInputKind,
  normalizeRenderFormFieldValueType,
  sanitizeRenderFormFieldGroupName,
  sanitizeRenderFormFieldPayloadKey,
} = require('./server-postprod-render-form-field-sanitize.cjs');

function inferRenderFormFieldKindFromWrcRawType(rawTypeValue) {
  const rawType = String(rawTypeValue || '').trim().toLowerCase();
  if (!rawType) return { inputKind: 'text', valueType: 'string' };
  if (rawType.includes('bool')) return { inputKind: 'checkbox', valueType: 'boolean' };
  if (
    rawType.includes('vector2d')
    || rawType.includes('vec2')
    || rawType.includes('float2')
    || rawType.includes('intpoint')
  ) {
    return { inputKind: 'vector2', valueType: 'vector2' };
  }
  if (
    rawType.includes('vector')
    || rawType.includes('rotator')
    || rawType.includes('float3')
    || rawType.includes('vec3')
  ) {
    return { inputKind: 'vector3', valueType: 'vector3' };
  }
  if (
    rawType.includes('int')
    || rawType.includes('byte')
    || rawType.includes('uint')
  ) {
    return { inputKind: 'integer', valueType: 'integer' };
  }
  if (
    rawType.includes('float')
    || rawType.includes('double')
    || rawType.includes('number')
  ) {
    return { inputKind: 'number', valueType: 'number' };
  }
  if (rawType.includes('linearcolor') || rawType.includes('fcolor') || rawType === 'color' || rawType.includes('color')) {
    return { inputKind: 'color', valueType: 'color' };
  }
  if (
    rawType.includes('transform')
    || rawType.includes('quat')
    || rawType.includes('matrix')
    || rawType.includes('array')
    || rawType.includes('set')
    || rawType.includes('map')
    || rawType.includes('tarray')
    || rawType.includes('tset')
    || rawType.includes('tmap')
    || rawType.includes('object')
    || rawType.includes('class')
    || rawType.includes('struct')
  ) {
    return { inputKind: 'json', valueType: 'json' };
  }
  if (rawType.includes('enum')) return { inputKind: 'select', valueType: 'enum' };
  if (rawType.includes('date') || rawType.includes('time')) return { inputKind: 'date', valueType: 'date' };
  if (rawType.includes('texture') || rawType.includes('image')) return { inputKind: 'image', valueType: 'image' };
  if (rawType.includes('video') || rawType.includes('media')) return { inputKind: 'video', valueType: 'video' };
  if (rawType.includes('json')) return { inputKind: 'json', valueType: 'json' };
  return { inputKind: 'text', valueType: 'string' };
}

function resolveWrcPresetPayloadRoot(presetPayload) {
  const payload = presetPayload && typeof presetPayload === 'object' ? presetPayload : {};
  if (payload.Preset && typeof payload.Preset === 'object' && !Array.isArray(payload.Preset)) {
    return payload.Preset;
  }
  if (payload.preset && typeof payload.preset === 'object' && !Array.isArray(payload.preset)) {
    return payload.preset;
  }
  return payload;
}

function looksLikeWrcFunctionEntry(entry = {}) {
  if (!entry || typeof entry !== 'object') return false;
  const typeRaw = String(
    entry.Type
    || entry.type
    || entry.EntityType
    || entry.entityType
    || ''
  ).trim().toLowerCase();
  if (typeRaw.includes('function')) return true;
  if (entry.UnderlyingFunction && typeof entry.UnderlyingFunction === 'object') return true;
  if (entry.underlyingFunction && typeof entry.underlyingFunction === 'object') return true;
  if (Array.isArray(entry.Arguments) || Array.isArray(entry.arguments)) return true;
  if (Array.isArray(entry.Parameters) || Array.isArray(entry.parameters)) return true;
  return false;
}

function looksLikeWrcPropertyEntry(entry = {}) {
  if (!entry || typeof entry !== 'object') return false;
  if (looksLikeWrcFunctionEntry(entry)) return false;
  const typeRaw = String(
    entry.Type
    || entry.type
    || entry.EntityType
    || entry.entityType
    || ''
  ).trim().toLowerCase();
  if (typeRaw && !typeRaw.includes('property') && typeRaw.includes('function')) return false;
  if (typeRaw.includes('property')) return true;
  if (entry.UnderlyingProperty && typeof entry.UnderlyingProperty === 'object') return true;
  if (entry.underlyingProperty && typeof entry.underlyingProperty === 'object') return true;
  if (
    entry.PropertyPath != null
    || entry.propertyPath != null
    || entry.Path != null
    || entry.path != null
    || entry.PropertyName != null
    || entry.propertyName != null
    || entry.PropertyId != null
    || entry.propertyId != null
    || entry.SubobjectPath != null
    || entry.subobjectPath != null
  ) {
    return true;
  }
  return false;
}

function extractWrcGroupPropertyEntries(group = {}) {
  const out = [];
  if (!group || typeof group !== 'object') return out;
  const containers = [
    group.ExposedProperties,
    group.properties,
    group.ExposedEntities,
    group.exposedEntities,
    group.Entities,
    group.entities,
  ];
  for (const listRaw of containers) {
    const list = Array.isArray(listRaw)
      ? listRaw
      : (
        listRaw && typeof listRaw === 'object' && !Array.isArray(listRaw)
          ? Object.values(listRaw)
          : []
      );
    if (!Array.isArray(list) || list.length <= 0) continue;
    for (const entry of list) {
      if (!entry || typeof entry !== 'object') continue;
      if (!looksLikeWrcPropertyEntry(entry)) continue;
      out.push(entry);
    }
  }
  return out;
}

function collectWrcExposedProperties(presetPayload) {
  const payload = resolveWrcPresetPayloadRoot(presetPayload);
  let props = [];
  const groups = Array.isArray(payload.Groups)
    ? payload.Groups
    : (Array.isArray(payload.groups) ? payload.groups : []);
  for (const group of groups) {
    const groupProps = extractWrcGroupPropertyEntries(group);
    if (groupProps.length > 0) {
      const wrcGroupName = String(group.Name || group.name || group.GroupName || group.groupName || '').trim();
      for (const entry of groupProps) {
        if (entry && typeof entry === 'object' && !entry._wrcGroupName) entry._wrcGroupName = wrcGroupName;
      }
      props = props.concat(groupProps);
    }
  }
  if (!props.length) {
    const rootContainers = [
      payload.ExposedProperties,
      payload.properties,
      payload.ExposedEntities,
      payload.exposedEntities,
      payload.Entities,
      payload.entities,
    ];
    for (const listRaw of rootContainers) {
      const list = Array.isArray(listRaw)
        ? listRaw
        : (
          listRaw && typeof listRaw === 'object' && !Array.isArray(listRaw)
            ? Object.values(listRaw)
            : []
        );
      if (!Array.isArray(list) || list.length <= 0) continue;
      props = props.concat(list.filter((entry) => looksLikeWrcPropertyEntry(entry)));
    }
  }
  const out = [];
  const seen = new Set();
  for (const entry of props) {
    if (!entry || typeof entry !== 'object') continue;
    const identity = JSON.stringify({
      id: entry.Id ?? entry.id ?? entry.PropertyId ?? entry.propertyId ?? entry.PropertyID ?? entry.propertyID ?? entry.FieldId ?? entry.fieldId ?? entry.EntityId ?? entry.entityId ?? entry.Path ?? entry.path ?? '',
      path: entry.PropertyPath ?? entry.propertyPath ?? entry.Path ?? entry.path ?? '',
      subobject: entry.SubobjectPath ?? entry.subobjectPath ?? '',
      name: entry.PropertyName ?? entry.propertyName ?? entry.Name ?? entry.name ?? entry.DisplayName ?? entry.displayName ?? entry.Label ?? entry.label ?? '',
    });
    if (seen.has(identity)) continue;
    seen.add(identity);
    out.push(entry);
  }
  return out;
}

function normalizeRenderFormDefaultValueFromWrc(valueType, rawValue) {
  const normalizeVectorNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const parseVectorFromString = (text) => {
    const out = {};
    const matches = String(text || '').matchAll(/([A-Za-z]+)\s*=\s*(-?\d+(?:\.\d+)?)/g);
    for (const match of matches) {
      const key = String(match?.[1] || '').trim().toLowerCase();
      const value = normalizeVectorNumber(match?.[2]);
      if (!key || value == null) continue;
      out[key] = value;
    }
    return out;
  };
  const toVectorObject = (source, dims = 3) => {
    const getObjValue = (obj, keys) => {
      for (const key of keys) {
        if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = normalizeVectorNumber(obj[key]);
          if (value != null) return value;
        }
      }
      return null;
    };
    let obj = null;
    if (Array.isArray(source)) {
      obj = {
        x: normalizeVectorNumber(source[0]),
        y: normalizeVectorNumber(source[1]),
        z: normalizeVectorNumber(source[2]),
      };
    } else if (source && typeof source === 'object') {
      obj = {
        x: getObjValue(source, ['X', 'x', 'Pitch', 'pitch', 'Roll', 'roll']),
        y: getObjValue(source, ['Y', 'y', 'Yaw', 'yaw']),
        z: getObjValue(source, ['Z', 'z']),
      };
    } else if (typeof source === 'string') {
      const parsed = parseVectorFromString(source);
      obj = {
        x: parsed.x ?? parsed.pitch ?? parsed.roll ?? null,
        y: parsed.y ?? parsed.yaw ?? null,
        z: parsed.z ?? null,
      };
    }
    if (!obj) {
      return dims === 2
        ? { x: null, y: null }
        : { x: null, y: null, z: null };
    }
    if (dims === 2) return { x: obj.x, y: obj.y };
    return { x: obj.x, y: obj.y, z: obj.z };
  };

  if (valueType === 'boolean') {
    if (rawValue === true || rawValue === false) return rawValue;
    const normalized = String(rawValue || '').trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return false;
  }
  if (valueType === 'number') {
    const n = Number(rawValue);
    return Number.isFinite(n) ? n : '';
  }
  if (valueType === 'integer') {
    const n = Number(rawValue);
    return Number.isFinite(n) ? Math.trunc(n) : '';
  }
  if (valueType === 'vector2') {
    return toVectorObject(rawValue, 2);
  }
  if (valueType === 'vector3') {
    return toVectorObject(rawValue, 3);
  }
  if (valueType === 'color') {
    const normalizeColorChannel = (channelValue) => {
      const n = Number(channelValue);
      if (!Number.isFinite(n)) return null;
      const scaled = Math.abs(n) <= 1 ? Math.round(n * 255) : Math.round(n);
      return Math.max(0, Math.min(255, scaled));
    };
    const encodeHex = (r, g, b) => (
      `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
    );
    if (Array.isArray(rawValue) && rawValue.length >= 3) {
      const r = normalizeColorChannel(rawValue[0]);
      const g = normalizeColorChannel(rawValue[1]);
      const b = normalizeColorChannel(rawValue[2]);
      if (r != null && g != null && b != null) return encodeHex(r, g, b);
    }
    if (rawValue && typeof rawValue === 'object') {
      const r = normalizeColorChannel(rawValue.R ?? rawValue.r ?? rawValue.Red ?? rawValue.red ?? rawValue.X ?? rawValue.x);
      const g = normalizeColorChannel(rawValue.G ?? rawValue.g ?? rawValue.Green ?? rawValue.green ?? rawValue.Y ?? rawValue.y);
      const b = normalizeColorChannel(rawValue.B ?? rawValue.b ?? rawValue.Blue ?? rawValue.blue ?? rawValue.Z ?? rawValue.z);
      if (r != null && g != null && b != null) return encodeHex(r, g, b);
    }
    const color = String(rawValue || '').trim();
    const tupleMatch = /\(\s*R\s*=\s*([-\d.]+)\s*,\s*G\s*=\s*([-\d.]+)\s*,\s*B\s*=\s*([-\d.]+)(?:\s*,\s*A\s*=\s*([-\d.]+))?\s*\)/i.exec(color);
    if (tupleMatch) {
      const r = normalizeColorChannel(tupleMatch[1]);
      const g = normalizeColorChannel(tupleMatch[2]);
      const b = normalizeColorChannel(tupleMatch[3]);
      if (r != null && g != null && b != null) return encodeHex(r, g, b);
    }
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : '#ffffff';
  }
  if (valueType === 'json') {
    if (rawValue && typeof rawValue === 'object') return rawValue;
    const text = String(rawValue || '').trim();
    if (!text) return {};
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') return parsed;
      return {};
    } catch {
      return {};
    }
  }
  if (rawValue && typeof rawValue === 'object') {
    try {
      return JSON.stringify(rawValue);
    } catch {
      return '';
    }
  }
  return String(rawValue ?? '').trim();
}

function normalizeSingleLineDefaultText(value) {
  const raw = String(value ?? '');
  if (!raw) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyOpaqueWrcIdentifier(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const compact = raw.replace(/[-_.:]/g, '');
  return /^[a-f0-9]{24,}$/i.test(compact);
}

function pickReadableWrcIdentifier(...candidates) {
  const normalized = candidates
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
  if (normalized.length <= 0) return '';
  const readable = normalized.find((entry) => !isLikelyOpaqueWrcIdentifier(entry));
  return readable || normalized[0];
}

function extractWrcPropertyCurrentValue(entry = {}, underlying = {}) {
  const p = entry && typeof entry === 'object' ? entry : {};
  const u = underlying && typeof underlying === 'object' ? underlying : {};

  const directCandidates = [
    p.DefaultValue,
    p.defaultValue,
    p.Value,
    p.value,
    p.PropertyValue,
    p.propertyValue,
    p.CurrentValue,
    p.currentValue,
    u.DefaultValue,
    u.defaultValue,
    u.Value,
    u.value,
  ];
  for (const candidate of directCandidates) {
    if (candidate !== undefined) return candidate;
  }

  const nestedObjects = [
    p.Value,
    p.value,
    p.PropertyValue,
    p.propertyValue,
    p.CurrentValue,
    p.currentValue,
    p.Metadata,
    p.metadata,
    u.Value,
    u.value,
    u.PropertyValue,
    u.propertyValue,
  ];
  for (const obj of nestedObjects) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue;
    for (const key of ['Value', 'value', 'Text', 'text', 'String', 'string', 'CurrentValue', 'currentValue']) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
      }
    }
  }

  return undefined;
}

function buildRenderFormFieldsFromWrcPreset(presetPayload, wrcFile) {
  const props = collectWrcExposedProperties(presetPayload);
  const out = [];
  const seenKeys = new Set();
  const seenPayloadKeys = new Set();
  let sortOrder = 1;

  for (const entry of props) {
    const p = entry && typeof entry === 'object' ? entry : {};
    const underlying = p.UnderlyingProperty && typeof p.UnderlyingProperty === 'object'
      ? p.UnderlyingProperty
      : (p.underlyingProperty && typeof p.underlyingProperty === 'object' ? p.underlyingProperty : {});
    const entityIdRaw = (
      p.Id
      || p.id
      || p.ID
      || ''
    );
    const propertyIdRaw = (
      p.PropertyId
      || p.propertyId
      || p.PropertyID
      || p.propertyID
      || p.PropertyIdentifier
      || p.propertyIdentifier
      || p.EntityId
      || p.entityId
      || p.ID
      || p.id
      || p.Id
      || p.Label
      || p.label
      || p.Alias
      || p.alias
      || underlying.PropertyId
      || underlying.propertyId
      || underlying.PropertyID
      || underlying.propertyID
      || underlying.Label
      || underlying.label
      || ''
    );
    const displayNameRaw = pickReadableWrcIdentifier(
      p.DisplayName,
      p.displayName,
      underlying.DisplayName,
      p.Label,
      p.label,
      p.PropertyName,
      p.propertyName,
      p.Name,
      p.name,
      underlying.PropertyName,
      underlying.Name,
      propertyIdRaw,
      entityIdRaw
    );
    const subobjectPathRaw = (
      p.SubobjectPath
      || p.subobjectPath
      || p.OwnerPath
      || p.ownerPath
      || ''
    );
    const sourcePropertyPathRaw = (
      p.Path
      || p.path
      || p.PropertyPath
      || p.propertyPath
      || underlying.Path
      || underlying.path
      || underlying.PropertyPath
      || underlying.propertyPath
      || p.PropertyName
      || p.propertyName
      || p.Name
      || p.name
      || propertyIdRaw
      || ''
    );
    const sourcePathComposed = (
      String(subobjectPathRaw || '').trim()
      && String(sourcePropertyPathRaw || '').trim()
      && String(sourcePropertyPathRaw || '').trim() !== String(subobjectPathRaw || '').trim()
    )
      ? `${String(subobjectPathRaw || '').trim()}.${String(sourcePropertyPathRaw || '').trim()}`
      : String(sourcePropertyPathRaw || '').trim();
    const sourcePathRaw = (
      sourcePathComposed
      || sourcePropertyPathRaw
      || subobjectPathRaw
      || displayNameRaw
    );
    const propertyNameRaw = pickReadableWrcIdentifier(
      p.PropertyName,
      p.propertyName,
      p.Name,
      p.name,
      underlying.PropertyName,
      underlying.Name,
      propertyIdRaw,
      sourcePathRaw,
      displayNameRaw,
      entityIdRaw
    );
    // Prefer property GUID as stable source_path identifier; fall back to composed path.
    const propertyGuidRaw = String(
      p.PropertyId || p.propertyId || p.PropertyID || p.propertyID
      || p.PropertyIdentifier || p.propertyIdentifier
      || p.EntityId || p.entityId
      || p.ID || p.id || p.Id
      || underlying.PropertyId || underlying.propertyId || underlying.PropertyID || underlying.propertyID
      || ''
    ).trim();
    const sourcePath = propertyGuidRaw || String(sourcePathRaw || '').trim();
    if (!sourcePath) continue;
    const groupName = sanitizeRenderFormFieldGroupName(p._wrcGroupName || '');

    const fieldLabel = sanitizeRenderFormFieldLabel(
      pickReadableWrcIdentifier(propertyIdRaw, displayNameRaw, propertyNameRaw, sourcePath, entityIdRaw),
      sourcePath
    );
    const keySourceRaw = pickReadableWrcIdentifier(
      propertyIdRaw,
      propertyNameRaw,
      displayNameRaw,
      sourcePathRaw,
      sourcePath,
      entityIdRaw
    );
    const keyBase = sanitizeRenderFormFieldKey(
      keySourceRaw,
      sourcePath
    );
    if (!keyBase) continue;
    let fieldKey = keyBase;
    let dedupeIndex = 2;
    while (seenKeys.has(fieldKey)) {
      fieldKey = sanitizeRenderFormFieldKey(`${keyBase}_${dedupeIndex}`, keyBase);
      dedupeIndex += 1;
    }
    seenKeys.add(fieldKey);
    const payloadBase = sanitizeRenderFormFieldPayloadKey(
      pickReadableWrcIdentifier(propertyNameRaw, propertyIdRaw, fieldLabel, sourcePathRaw, fieldKey),
      fieldKey
    );
    let payloadKey = payloadBase || fieldKey;
    let payloadDedupeIndex = 2;
    while (seenPayloadKeys.has(payloadKey.toLowerCase())) {
      payloadKey = sanitizeRenderFormFieldPayloadKey(`${payloadBase || fieldKey}_${payloadDedupeIndex}`, fieldKey);
      payloadDedupeIndex += 1;
    }
    seenPayloadKeys.add(payloadKey.toLowerCase());

    const rawType = (
      underlying.Type
      || underlying.type
      || underlying.PropertyType
      || underlying.propertyType
      || underlying.TypeName
      || underlying.typeName
      || underlying?.TypePath?.Name
      || underlying?.typePath?.name
      || p.Type
      || p.ValueType
      || p.valueType
      || p.type
      || ''
    );
    const inferred = inferRenderFormFieldKindFromWrcRawType(rawType);
    let inputKind = normalizeRenderFormFieldInputKind(inferred.inputKind, 'text');
    let valueType = normalizeRenderFormFieldValueType(inferred.valueType, 'string');
    const defaultValueRaw = extractWrcPropertyCurrentValue(p, underlying);
    if (defaultValueRaw && typeof defaultValueRaw === 'object' && valueType === 'string') {
      valueType = 'json';
      inputKind = 'json';
    }
    let defaultValue = normalizeRenderFormDefaultValueFromWrc(valueType, defaultValueRaw);
    if (inputKind === 'text' && typeof defaultValue === 'string') {
      defaultValue = normalizeSingleLineDefaultText(defaultValue);
    }

    out.push({
      fieldKey,
      fieldLabel,
      sourcePath,
      sourceType: 'preset_property',
      inputKind,
      valueType,
      groupName,
      payloadKey,
      defaultValue,
      validation: {},
      isRequired: false,
      isVisible: true,
      sortOrder,
      wrcFile: String(wrcFile || '').trim(),
    });
    sortOrder += 1;
  }

  return out;
}

function normalizeWrcGuidPartHex(partValue) {
  const n = Number(partValue);
  if (!Number.isFinite(n)) return '';
  return ((Math.trunc(n)) >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

function normalizeWrcLayoutFieldId(fieldRaw, fallback = '') {
  if (typeof fieldRaw === 'string') {
    const compact = String(fieldRaw || '').replace(/[^a-f0-9]/gi, '').toUpperCase();
    return compact.length === 32 ? compact : (compact || String(fallback || '').trim());
  }
  if (!fieldRaw || typeof fieldRaw !== 'object') {
    return String(fallback || '').trim();
  }
  const aHex = normalizeWrcGuidPartHex(fieldRaw.A ?? fieldRaw.a);
  const bHex = normalizeWrcGuidPartHex(fieldRaw.B ?? fieldRaw.b);
  const cHex = normalizeWrcGuidPartHex(fieldRaw.C ?? fieldRaw.c);
  const dHex = normalizeWrcGuidPartHex(fieldRaw.D ?? fieldRaw.d);
  if (aHex && bHex && cHex && dHex) {
    return `${aHex}${bHex}${cHex}${dHex}`;
  }
  const compact = JSON.stringify(fieldRaw).replace(/[^a-f0-9]/gi, '').toUpperCase();
  if (compact.length === 32) return compact;
  return String(fallback || '').trim();
}

function extractWrcLayoutFieldIds(layoutPayload) {
  const layout = layoutPayload && typeof layoutPayload === 'object'
    ? (
      layoutPayload.Layout && typeof layoutPayload.Layout === 'object'
        ? layoutPayload.Layout
        : layoutPayload
    )
    : {};
  const groups = Array.isArray(layout.Groups)
    ? layout.Groups
    : (Array.isArray(layout.groups) ? layout.groups : []);
  if (!groups.length) return [];
  const out = [];
  const seen = new Set();
  for (const group of groups) {
    if (!group || typeof group !== 'object') continue;
    const fieldsRaw = (
      Array.isArray(group.Fields)
        ? group.Fields
        : (Array.isArray(group.fields) ? group.fields : [])
    );
    for (let index = 0; index < fieldsRaw.length; index += 1) {
      const fieldId = normalizeWrcLayoutFieldId(fieldsRaw[index], `field_${index + 1}`);
      if (!fieldId) continue;
      const key = fieldId.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(fieldId);
    }
  }
  return out;
}

function buildRenderFormFieldsFromWrcLayoutFieldIds(fieldIds = []) {
  const out = [];
  const seenFieldKeys = new Set();
  const seenPayloadKeys = new Set();
  let sortOrder = 1;
  const sourceList = Array.isArray(fieldIds) ? fieldIds : [];
  for (let index = 0; index < sourceList.length; index += 1) {
    const rawId = String(sourceList[index] || '').trim();
    if (!rawId) continue;
    const sourcePath = `layout.${rawId}`;
    const label = sanitizeRenderFormFieldLabel(rawId, sourcePath);
    const keyBase = sanitizeRenderFormFieldKey(rawId, `field_${index + 1}`);
    if (!keyBase) continue;
    let fieldKey = keyBase;
    let dedupeIndex = 2;
    while (seenFieldKeys.has(fieldKey.toLowerCase())) {
      fieldKey = sanitizeRenderFormFieldKey(`${keyBase}_${dedupeIndex}`, keyBase);
      dedupeIndex += 1;
    }
    seenFieldKeys.add(fieldKey.toLowerCase());
    const payloadBase = sanitizeRenderFormFieldPayloadKey(rawId, fieldKey) || fieldKey;
    let payloadKey = payloadBase;
    let payloadDedupeIndex = 2;
    while (seenPayloadKeys.has(payloadKey.toLowerCase())) {
      payloadKey = sanitizeRenderFormFieldPayloadKey(`${payloadBase}_${payloadDedupeIndex}`, fieldKey) || fieldKey;
      payloadDedupeIndex += 1;
    }
    seenPayloadKeys.add(payloadKey.toLowerCase());
    out.push({
      fieldKey,
      fieldLabel: label,
      sourcePath,
      sourceType: 'preset_property',
      inputKind: 'text',
      valueType: 'string',
      payloadKey,
      defaultValue: '',
      validation: {},
      isRequired: false,
      isVisible: true,
      sortOrder,
    });
    sortOrder += 1;
  }
  return out;
}

module.exports = {
  inferRenderFormFieldKindFromWrcRawType,
  resolveWrcPresetPayloadRoot,
  looksLikeWrcFunctionEntry,
  looksLikeWrcPropertyEntry,
  extractWrcGroupPropertyEntries,
  collectWrcExposedProperties,
  normalizeRenderFormDefaultValueFromWrc,
  normalizeSingleLineDefaultText,
  isLikelyOpaqueWrcIdentifier,
  pickReadableWrcIdentifier,
  extractWrcPropertyCurrentValue,
  buildRenderFormFieldsFromWrcPreset,
  normalizeWrcGuidPartHex,
  normalizeWrcLayoutFieldId,
  extractWrcLayoutFieldIds,
  buildRenderFormFieldsFromWrcLayoutFieldIds,
};
