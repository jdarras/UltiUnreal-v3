import { safeT } from '../../utils/i18nSafe.js';

export function getTimelineZoomLabel(t) {
  return safeT(t, 'timeline.zoom', 'Zoom');
}

export function getTimelineZoomOutTitle(t) {
  return safeT(t, 'timeline.zoomOut', 'Zoom out');
}

export function getTimelineZoomInTitle(t) {
  return safeT(t, 'timeline.zoomIn', 'Zoom in');
}

export function getTimelineModeLabel(t) {
  return safeT(t, 'timeline.mode', 'Mode');
}

export function getTimelineLinkAxesTitle(t) {
  return safeT(t, 'timeline.linkAxes', 'Lier les axes (X/Y/Z)');
}

export function getTimelineReorderTitle(t) {
  return safeT(t, 'timeline.reorder', 'Glisser pour réordonner');
}
