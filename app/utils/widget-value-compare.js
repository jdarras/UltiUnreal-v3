import {
  parseColorChannels as parseSharedColorChannels,
  channelsToUnitColor
} from './colorutils.mjs';

function asFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function almostEqual(a, b, epsilon = 1e-6) {
  if (Object.is(a, b)) return true;
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return false;
  return Math.abs(na - nb) <= epsilon;
}

function deepEqualLite(a, b, depth = 0) {
  if (Object.is(a, b)) return true;
  if (depth > 4) return false;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!deepEqualLite(a[i], b[i], depth + 1)) return false;
    }
    return true;
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b || {});
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!deepEqualLite(a[key], b[key], depth + 1)) return false;
    }
    return true;
  }

  return false;
}

function normalizeVector(raw = {}, dims = 3) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {
    X: asFiniteNumber(src.X ?? src.x, 0),
    Y: asFiniteNumber(src.Y ?? src.y, 0)
  };
  if (dims >= 3) {
    out.Z = asFiniteNumber(src.Z ?? src.z, 0);
  }
  return out;
}

function normalizeTransform(raw = {}) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const loc =
    src.Location && typeof src.Location === 'object'
      ? src.Location
      : src.Translation && typeof src.Translation === 'object'
        ? src.Translation
        : {};
  const rot = src.Rotation && typeof src.Rotation === 'object' ? src.Rotation : {};
  const scl =
    src.Scale3D && typeof src.Scale3D === 'object'
      ? src.Scale3D
      : src.Scale && typeof src.Scale === 'object'
        ? src.Scale
        : {};
  return {
    Location: {
      X: asFiniteNumber(loc.X ?? loc.x, 0),
      Y: asFiniteNumber(loc.Y ?? loc.y, 0),
      Z: asFiniteNumber(loc.Z ?? loc.z, 0)
    },
    Rotation: {
      Roll: asFiniteNumber(rot.Roll ?? rot.roll, 0),
      Pitch: asFiniteNumber(rot.Pitch ?? rot.pitch, 0),
      Yaw: asFiniteNumber(rot.Yaw ?? rot.yaw, 0)
    },
    Scale3D: {
      X: asFiniteNumber(scl.X ?? scl.x, 1),
      Y: asFiniteNumber(scl.Y ?? scl.y, 1),
      Z: asFiniteNumber(scl.Z ?? scl.z, 1)
    }
  };
}

function normalizeColor(raw) {
  return channelsToUnitColor(parseSharedColorChannels(raw));
}

export function isEqualWidgetValue(widget, currentValue, incomingValue) {
  if (Object.is(currentValue, incomingValue)) return true;
  const type = String(widget?.type || '').trim().toLowerCase();

  if (type === 'slider') {
    return almostEqual(asFiniteNumber(currentValue, 0), asFiniteNumber(incomingValue, 0));
  }

  if (type === 'toggle') {
    return !!currentValue === !!incomingValue;
  }

  if (type === 'vector') {
    const a = normalizeVector(currentValue, 3);
    const b = normalizeVector(incomingValue, 3);
    return almostEqual(a.X, b.X) && almostEqual(a.Y, b.Y) && almostEqual(a.Z, b.Z);
  }

  if (type === 'joystick') {
    const a = normalizeVector(currentValue, 2);
    const b = normalizeVector(incomingValue, 2);
    return almostEqual(a.X, b.X) && almostEqual(a.Y, b.Y);
  }

  if (type === 'transform') {
    const a = normalizeTransform(currentValue);
    const b = normalizeTransform(incomingValue);
    return (
      almostEqual(a.Location.X, b.Location.X) &&
      almostEqual(a.Location.Y, b.Location.Y) &&
      almostEqual(a.Location.Z, b.Location.Z) &&
      almostEqual(a.Rotation.Roll, b.Rotation.Roll) &&
      almostEqual(a.Rotation.Pitch, b.Rotation.Pitch) &&
      almostEqual(a.Rotation.Yaw, b.Rotation.Yaw) &&
      almostEqual(a.Scale3D.X, b.Scale3D.X) &&
      almostEqual(a.Scale3D.Y, b.Scale3D.Y) &&
      almostEqual(a.Scale3D.Z, b.Scale3D.Z)
    );
  }

  if (type === 'color') {
    const a = normalizeColor(currentValue);
    const b = normalizeColor(incomingValue);
    return (
      almostEqual(a.R, b.R) &&
      almostEqual(a.G, b.G) &&
      almostEqual(a.B, b.B) &&
      almostEqual(a.A, b.A)
    );
  }

  if (type === 'text' || type === 'dropdown' || type === 'enum' || type === 'browse') {
    return String(currentValue ?? '') === String(incomingValue ?? '');
  }

  return deepEqualLite(currentValue, incomingValue);
}
