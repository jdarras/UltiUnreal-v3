import {
  getTimelineDefaultLabel,
  getTimelineWidgetMissingLabel
} from './timelineWidgetSharedI18n.js';

export function getWidgetLabel(widget, t = null) {
  if (!widget) return getTimelineWidgetMissingLabel(t);
  const label = String(widget.label || '').trim();
  if (label) return label;
  return String(widget.type || 'Widget');
}

export function getTimelineLabel(widget, t = null) {
  const label = String(widget?.label || '').trim();
  return label || getTimelineDefaultLabel(t);
}
