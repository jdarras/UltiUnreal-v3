import { readIdentity } from './identity.js';

export function getLocalIp() {
  const id = readIdentity();
  return String(id.localIp || '').trim();
}

export function normPath(p) { return String(p || '').replace(/\//g, '\\').trim(); }
export function isUproject(p) { return /\.uproject$/i.test(String(p || '').trim()); }
export function padId(n) { return String(Number(n) || 0).padStart(4, '0'); }

export function formatDateTime(raw) {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '—';

    const mois = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];

    const jj = String(d.getDate()).padStart(2, '0');
    const mmNom = mois[d.getMonth()];
    const aaaa = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');

    return `${jj} ${mmNom} ${aaaa} - ${hh}h${mi}`;
  } catch {
    return '—';
  }
}

export function normalizeThumbnailPath(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  if (/^https?:\/\//i.test(s)) return s;
  if (/^file:\/\//i.test(s)) return s;

  if (/^[A-Za-z]:[\\/]/.test(s)) {
    const norm = s.replace(/\\/g, '/');
    return `file:///${norm}`;
  }

  if (/^\\\\/.test(s)) {
    const norm = s.replace(/\\/g, '/');
    return `file:${norm}`;
  }

  return s.replace(/\\/g, '/');
}

export function mapRelToAssetPath(relPath = '') {
  const rel = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!rel) return '';
  const noExt = rel.replace(/\.umap$/i, '');
  const parts = noExt.split('/').filter(Boolean);
  const name = parts[parts.length - 1] || noExt;
  return `/Game/${noExt}.${name}`;
}

export function mapRelToAssetPathNoDot(relPath = '') {
  const rel = String(relPath || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!rel) return '';
  const noExt = rel.replace(/\.umap$/i, '');
  return `/Game/${noExt}`;
}

export function boolFromIni(v) {
  const s = String(v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'on';
}

export function parseSmoothedRange(v) {
  const s = String(v ?? '').trim();
  if (!s) return { min: '', max: '' };
  const m1 = /LowerBound=.*?Value=([0-9.]+)/i.exec(s);
  const m2 = /UpperBound=.*?Value=([0-9.]+)/i.exec(s);
  return {
    min: m1 && m1[1] ? m1[1] : '',
    max: m2 && m2[1] ? m2[1] : '',
  };
}

export function formatFixed2(v) {
  const s = String(v ?? '').trim();
  if (!s) return '';
  const n = Number(s.replace(',', '.'));
  if (!Number.isFinite(n)) return s;
  return n.toFixed(2);
}

export function getProjectUsageModeLabel(t, value, options = {}) {
  const v = String(value || '').trim();
  const preferThumbKeys = options?.preferThumbKeys === true;
  if (v === 'live') {
    return preferThumbKeys
      ? t('projects.thumb.usage.live', t('projects.detail.usageMode.live'))
      : t('projects.detail.usageMode.live');
  }
  if (v === 'auto_render') {
    return preferThumbKeys
      ? t('projects.thumb.usage.auto_render', t('projects.detail.usageMode.auto_render'))
      : t('projects.detail.usageMode.auto_render');
  }
  if (v === 'live_auto_render') {
    return preferThumbKeys
      ? t('projects.thumb.usage.live_auto_render', t('projects.detail.usageMode.live_auto_render'))
      : t('projects.detail.usageMode.live_auto_render');
  }
  if (v === 'other') return t('projects.detail.usageMode.other');
  return '—';
}
