import { readIdentity } from '../utils/identity';
import { createT } from '../i18n';

export function getWidgetT() {
  const id = readIdentity() || {};
  const lang = String(id.lang || 'fr').trim();
  return createT(lang);
}
