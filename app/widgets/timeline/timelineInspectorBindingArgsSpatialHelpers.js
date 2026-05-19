export const TIMELINE_BINDING_VECTOR_AXES = ['X', 'Y', 'Z'];

export const TIMELINE_BINDING_ROTATOR_AXES = [
  { lbl: 'X', prop: 'Pitch' },
  { lbl: 'Y', prop: 'Yaw' },
  { lbl: 'Z', prop: 'Roll' }
];

export const TIMELINE_BINDING_TRANSFORM_BLOCKS = [
  {
    title: 'Location',
    part: 'Translation',
    axes: ['X', 'Y', 'Z'],
    labels: ['X', 'Y', 'Z']
  },
  {
    title: 'Rotation',
    part: 'Rotation',
    axes: ['Roll', 'Pitch', 'Yaw'],
    labels: ['X', 'Y', 'Z']
  },
  {
    title: 'Scale',
    part: 'Scale3D',
    axes: ['X', 'Y', 'Z'],
    labels: ['X', 'Y', 'Z']
  }
];

export function normalizeTimelineBindingArgObject(value) {
  return value && typeof value === 'object' ? value : {};
}

export function parseTimelineBindingArgNumeric(rawValue) {
  return rawValue === '' ? '' : Number(rawValue);
}

export function updateTimelineBindingVectorAxis(current, axis, rawValue) {
  const cur = normalizeTimelineBindingArgObject(current);
  return {
    ...cur,
    [axis]: parseTimelineBindingArgNumeric(rawValue)
  };
}

export function updateTimelineBindingRotatorAxis(current, prop, rawValue) {
  const cur = normalizeTimelineBindingArgObject(current);
  return {
    ...cur,
    [prop]: parseTimelineBindingArgNumeric(rawValue)
  };
}

export function updateTimelineBindingTransformPart(current, part, axis, rawValue) {
  const cur = normalizeTimelineBindingArgObject(current);
  const translation = normalizeTimelineBindingArgObject(cur.Translation);
  const rotation = normalizeTimelineBindingArgObject(cur.Rotation);
  const scale3D = normalizeTimelineBindingArgObject(cur.Scale3D);
  const next = {
    Translation: { ...translation },
    Rotation: { ...rotation },
    Scale3D: { ...scale3D }
  };
  if (!next[part]) return next;
  next[part][axis] = parseTimelineBindingArgNumeric(rawValue);
  return next;
}
