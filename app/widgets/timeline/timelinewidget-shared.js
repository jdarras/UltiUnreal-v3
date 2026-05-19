import { readIdentity } from '../../utils/identity.js';
import { createT } from '../../i18n/index.js';
import { getTimelineLabel, getWidgetLabel } from './timelineWidgetLabels.js';

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

export { getWidgetLabel, getTimelineLabel };
