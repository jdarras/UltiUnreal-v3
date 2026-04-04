// Helpers for reading/writing Unreal .ini files
function detectEol(txt = '') {
  return String(txt).includes('\r\n') ? '\r\n' : '\n';
}

function isSectionHeader(line = '') {
  const cleaned = String(line || '').replace(/^\uFEFF/, ''); // strip BOM if any
  const m = /^\s*\[(.+)\]\s*$/.exec(cleaned);
  return m && m[1] ? String(m[1]).trim() : '';
}

function rewriteIniSectionContent(txt = '', sectionName = '', kv = {}) {
  const eol = detectEol(txt);
  const targetLower = String(sectionName || '').trim().toLowerCase();
  const overrides = kv && typeof kv === 'object' ? kv : {};

  const lines = String(txt || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  const out = [];
  const order = [];
  const values = {};
  let inTarget = false;

  const collect = (line) => {
    const trimmed = String(line || '').trim();
    if (!trimmed) return;
    if (trimmed.startsWith(';') || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) return;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1);
    if (!order.includes(k)) order.push(k);
    values[k] = v; // last occurrence wins
  };

  for (let i = 0; i < lines.length; i++) {
    const header = isSectionHeader(lines[i]);
    if (header) {
      const isTarget = header.toLowerCase() === targetLower;
      inTarget = isTarget;
      if (!isTarget) out.push(lines[i]);
      continue;
    }
    if (inTarget) {
      collect(lines[i]);
    } else {
      out.push(lines[i]);
    }
  }

  Object.keys(overrides).forEach((k) => {
    if (!order.includes(k)) order.push(k);
    values[k] = overrides[k];
  });

  if (out.length && out[out.length - 1].trim() !== '') out.push('');
  out.push(`[${sectionName}]`);
  for (const k of order) {
    out.push(`${k}=${values[k] ?? ''}`);
  }
  return out.join(eol);
}

function normalizeBoolIni(v) {
  const s = String(v ?? '').trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return 'True';
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return 'False';
  return '';
}

function normalizeNumberIni(v) {
  const raw = String(v ?? '').trim();
  if (!raw) return '';
  const n = Number(raw);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(2);
}

function buildSmoothedFrameRateRange(minV, maxV) {
  const minRaw = String(minV ?? '').trim();
  const maxRaw = String(maxV ?? '').trim();
  if (!minRaw || !maxRaw) return '';
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '';
  return `(LowerBound=(Type=Inclusive,Value=${min.toFixed(2)}),UpperBound=(Type=Exclusive,Value=${max.toFixed(2)}))`;
}

module.exports = {
  detectEol,
  isSectionHeader,
  rewriteIniSectionContent,
  normalizeBoolIni,
  normalizeNumberIni,
  buildSmoothedFrameRateRange,
};
