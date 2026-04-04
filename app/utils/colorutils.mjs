// app/utils/colorutils.mjs
// Utils communs pour gérer les couleurs UltiUnreal / FLinearColor

function clampByte(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function srgbByteToLinear(byte) {
  const c = Math.max(0, Math.min(255, byte)) / 255;
  if (c <= 0.04045) {
    return c / 12.92;
  }
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

export function parseColorChannels(value) {
  let rByte = 0;
  let gByte = 0;
  let bByte = 0;
  let a01 = 1;

  if (typeof value === 'string') {
    const raw = value.trim();

    // Format "#rrggbb|alpha"
    if (raw.includes('|')) {
      const [hexPart, alphaPart] = raw.split('|');

      if (/^#[0-9a-fA-F]{6}$/.test(hexPart)) {
        const hex = hexPart.slice(1);
        const rb = parseInt(hex.slice(0, 2), 16);
        const gb = parseInt(hex.slice(2, 4), 16);
        const bb = parseInt(hex.slice(4, 6), 16);

        if (!Number.isNaN(rb)) rByte = clampByte(rb);
        if (!Number.isNaN(gb)) gByte = clampByte(gb);
        if (!Number.isNaN(bb)) bByte = clampByte(bb);
      }

      const aNum = Number(String(alphaPart).replace(',', '.'));
      if (!Number.isNaN(aNum)) {
        a01 = clamp01(aNum);
      }
    }
    // Format "#rrggbb" ou "#rrggbbaa"
    else if (/^#[0-9a-fA-F]{6,8}$/.test(raw)) {
      const hex = raw.slice(1);
      const rb = parseInt(hex.slice(0, 2), 16);
      const gb = parseInt(hex.slice(2, 4), 16);
      const bb = parseInt(hex.slice(4, 6), 16);
      if (!Number.isNaN(rb)) rByte = clampByte(rb);
      if (!Number.isNaN(gb)) gByte = clampByte(gb);
      if (!Number.isNaN(bb)) bByte = clampByte(bb);

      if (hex.length >= 8) {
        const aByte = parseInt(hex.slice(6, 8), 16);
        if (!Number.isNaN(aByte)) {
          a01 = clamp01(aByte / 255);
        }
      }
    }
  } else if (value && typeof value === 'object') {
    if (typeof value._hex === 'string' && /^#[0-9a-fA-F]{6}$/.test(value._hex)) {
      const hex = value._hex.slice(1);
      const rb = parseInt(hex.slice(0, 2), 16);
      const gb = parseInt(hex.slice(2, 4), 16);
      const bb = parseInt(hex.slice(4, 6), 16);
      if (!Number.isNaN(rb)) rByte = clampByte(rb);
      if (!Number.isNaN(gb)) gByte = clampByte(gb);
      if (!Number.isNaN(bb)) bByte = clampByte(bb);
      const av = Number(value.A);
      if (Number.isFinite(av)) {
        a01 = av > 1 ? clamp01(av / 255) : clamp01(av);
      }
    } else {
      const Rv = Number(value.R);
      const Gv = Number(value.G);
      const Bv = Number(value.B);
      const AvRaw = Number(value.A);
      const Av = Number.isFinite(AvRaw) ? AvRaw : 1;

      const rgbLooksLikeByte = Rv > 1 || Gv > 1 || Bv > 1;
      if (rgbLooksLikeByte) {
        rByte = clampByte(Rv);
        gByte = clampByte(Gv);
        bByte = clampByte(Bv);
      } else {
        rByte = clampByte((Number.isFinite(Rv) ? Rv : 0) * 255);
        gByte = clampByte((Number.isFinite(Gv) ? Gv : 0) * 255);
        bByte = clampByte((Number.isFinite(Bv) ? Bv : 0) * 255);
      }

      if (Av > 1) {
        a01 = clamp01(Av / 255);
      } else {
        a01 = clamp01(Av);
      }
    }
  }

  return { rByte, gByte, bByte, a01 };
}

function channelsToLinearColor(channels) {
  return {
    R: srgbByteToLinear(channels.rByte),
    G: srgbByteToLinear(channels.gByte),
    B: srgbByteToLinear(channels.bByte),
    A: clamp01(channels.a01)
  };
}

export function channelsToUnitColor(channels = {}) {
  return {
    R: clamp01(Number(channels.rByte) / 255),
    G: clamp01(Number(channels.gByte) / 255),
    B: clamp01(Number(channels.bByte) / 255),
    A: clamp01(channels.a01)
  };
}

function channelsToFColor(channels) {
  return {
    R: clampByte(channels.rByte),
    G: clampByte(channels.gByte),
    B: clampByte(channels.bByte),
    A: clampByte(channels.a01 * 255)
  };
}

/**
 * Construit le body WRC pour une propriété couleur.
 * - FLinearColor / color -> 0..1 (linéaire)
 * - FColor -> 0..255 (byte)
 */
export function buildColorPropertyBody(value, valueType = 'color') {
  const t = String(valueType || '').toLowerCase();
  const channels = parseColorChannels(value);
  const isFColor = t === 'fcolor' || (t.includes('fcolor') && !t.includes('linearcolor'));
  const color = isFColor
    ? channelsToFColor(channels)
    : channelsToLinearColor(channels);

  return {
    PropertyValue: color,
    GenerateTransaction: true
  };
}
