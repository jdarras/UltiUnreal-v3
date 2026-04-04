import { readIdentity } from '../../utils/identity';
import { createT } from '../../i18n';

export function getT() {
  const id = readIdentity() || {};
  const lang = String(id.lang || 'fr').trim();
  return createT(lang);
}

export function formatNumber(value, kind = 'float') {
  if (!Number.isFinite(value)) return '';
  if (kind === 'int' || kind === 'int64' || kind === 'byte') {
    return String(Math.round(value));
  }
  const abs = Math.abs(value);
  let digits = 2;
  if (abs >= 100) digits = 0;
  else if (abs >= 10) digits = 1;
  return String(Number(value.toFixed(digits)));
}

export function formatInputNumber(value, kind = 'float') {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  if (kind === 'int' || kind === 'int64' || kind === 'byte') {
    return String(Math.round(num));
  }
  return num.toFixed(2).replace('.', ',');
}

export function getWidgetLabel(widget) {
  if (!widget) return 'Widget manquant';
  const label = String(widget.label || '').trim();
  if (label) return label;
  return String(widget.type || 'Widget');
}

export function getTimelineLabel(widget) {
  const label = String(widget?.label || '').trim();
  return label || 'Timeline';
}
