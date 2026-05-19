import { safeT } from '../../utils/i18nSafe.js';

export function getTimelineWidgetMissingLabel(t) {
  return safeT(t, 'timeline.widgetMissing', 'Widget manquant');
}

export function getTimelineDefaultLabel(t) {
  return safeT(t, 'production.widgets.timelineLabel', 'Timeline');
}
