import { normalizeMachineColor } from '../utils/colors';

// Couleurs possibles pour les machines (10 au total)
const MACHINE_COLORS = [
  { value: '#60A5FA', label: 'Bleu' },
  { value: '#22D3EE', label: 'Cyan' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#7A1B3C', label: 'Bordeaux' },
  { value: '#A78BFA', label: 'Violet' },
  { value: '#14B8A6', label: 'Turquoise' },
  { value: '#F472B6', label: 'Rose' },
  { value: '#FACC15', label: 'Jaune' },
  { value: '#6366F1', label: 'Indigo' },
  { value: '#6B7280', label: 'Gris' },
];

// Options de résolution communes (évite de les recréer par carte)
const PRESET_OPTIONS = [
  { k: 'manual', label: 'Manuel', x: null, y: null },
  { k: '720x486', label: '720 × 486', x: 720, y: 486 },
  { k: '720x576', label: '720 × 576', x: 720, y: 576 },
  { k: '1280x720', label: '1280 × 720', x: 1280, y: 720 },
  { k: '1920x1080', label: '1920 × 1080', x: 1920, y: 1080 },
  { k: '2048x1080', label: '2048 × 1080', x: 2048, y: 1080 },
  { k: '3840x2160', label: '3840 × 2160', x: 3840, y: 2160 },
  { k: '4096x2160', label: '4096 × 2160', x: 4096, y: 2160 },
  { k: '7680x4320', label: '7680 × 4320', x: 7680, y: 4320 },
  { k: '8192x4320', label: '8192 × 4320', x: 8192, y: 4320 },
];

const PRESET_RESOLUTIONS = PRESET_OPTIONS
  .filter((preset) => Number.isFinite(preset.x) && Number.isFinite(preset.y))
  .map(({ k, x, y }) => ({ k, x, y }));

const RENDER_AVAILABILITY_VALUES = ['capable', 'busy', 'excluded'];

function hostArrayToEditList(list, locale = 'fr') {
  const presetKeyFromRes = (x, y) => {
    const px = Number(x);
    const py = Number(y);
    const hit = PRESET_RESOLUTIONS.find((p) => p.x === px && p.y === py);
    return hit ? hit.k : 'manual';
  };

  const collator = new Intl.Collator(locale || 'fr', { numeric: true, sensitivity: 'base' });

  const withIndex = [...(Array.isArray(list) ? list : [])].map((h, idx) => {
    const n = Number(h?.sortIndex);
    return { host: h, sortIndex: Number.isFinite(n) ? n : idx };
  });

  const sorted = withIndex.sort((a, b) => {
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
  });

  const out = [];
  for (const { host: h, sortIndex } of sorted) {
    const a = h.args || {};
    out.push({
      name: h.name || '',
      color: normalizeMachineColor(h.color),
      ip: h.ip || '',
      uproject: h.uproject || '',
      args: {
        resx: a.resx ?? '',
        resy: a.resy ?? '',
        frameRateLimit: (a.FrameRateLimit ?? a.frameRateLimit) ?? '',
        execCmds: a.ExecCmds ?? a.execCmds ?? '',
        renderOffscreen: !!a.RenderOffscreen || !!a.renderOffscreen,
        noScreenMessages: !!a.NoScreenMessages || !!a.noScreenMessages,
        videoCard: a.videoCard ?? '',
        resPreset: a.resPreset ?? presetKeyFromRes(a.resx, a.resy),
      },
      showEditor: false,
      showArgs: false,
      status: 'unknown',
      lastMsg: '',
      lastMsgType: '',
      renderAvailability: (() => {
        if (RENDER_AVAILABILITY_VALUES.includes(h.renderAvailability)) return h.renderAvailability;
        if (h.eligible === false || h.renderEnabled === false) return 'excluded';
        return 'capable';
      })(),
      renderReturnAt: typeof h.renderReturnAt === 'string' && h.renderReturnAt.trim()
        ? h.renderReturnAt.trim()
        : null,
      sortIndex,
    });
  }
  return out;
}

// Validation minimale IPv4 pour éviter les enregistrements avec une IP partielle
function isValidIpv4(ip) {
  const s = String(ip || '').trim();
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return false;
  return m.slice(1).every((x) => {
    const n = Number(x);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

function normalizeEditorsMap(map = {}) {
  const out = {};
  if (!map || typeof map !== 'object') return out;
  for (const [k, v] of Object.entries(map)) {
    const key = String(k || '').trim();
    if (!key) continue;
    out[key] = String(v || '').trim();
  }
  return out;
}

function buildEditorsSignature(map = {}) {
  const norm = normalizeEditorsMap(map);
  const keys = Object.keys(norm).sort((a, b) =>
    String(a || '').localeCompare(String(b || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  );
  return keys.map((k) => `${k}:${norm[k]}`).join('|');
}

export {
  MACHINE_COLORS,
  PRESET_OPTIONS,
  RENDER_AVAILABILITY_VALUES,
  hostArrayToEditList,
  isValidIpv4,
  normalizeEditorsMap,
  buildEditorsSignature,
};
