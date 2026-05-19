import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTimelineLinkAxesTitle,
  getTimelineModeLabel,
  getTimelineReorderTitle,
  getTimelineZoomInTitle,
  getTimelineZoomLabel,
  getTimelineZoomOutTitle,
} from '../../app/widgets/timeline/timelineHeaderI18n.js';

test('timelineHeaderI18n returns translated values when present', () => {
  const t = (key) => {
    const map = {
      'timeline.zoom': 'Zoom X',
      'timeline.zoomOut': 'Zoom Out X',
      'timeline.zoomIn': 'Zoom In X',
      'timeline.mode': 'Mode X',
      'timeline.linkAxes': 'Link X',
      'timeline.reorder': 'Reorder X',
    };
    return map[key];
  };

  assert.equal(getTimelineZoomLabel(t), 'Zoom X');
  assert.equal(getTimelineZoomOutTitle(t), 'Zoom Out X');
  assert.equal(getTimelineZoomInTitle(t), 'Zoom In X');
  assert.equal(getTimelineModeLabel(t), 'Mode X');
  assert.equal(getTimelineLinkAxesTitle(t), 'Link X');
  assert.equal(getTimelineReorderTitle(t), 'Reorder X');
});

test('timelineHeaderI18n falls back when translation is missing', () => {
  const t = () => undefined;

  assert.equal(getTimelineZoomLabel(t), 'Zoom');
  assert.equal(getTimelineZoomOutTitle(t), 'Zoom out');
  assert.equal(getTimelineZoomInTitle(t), 'Zoom in');
  assert.equal(getTimelineModeLabel(t), 'Mode');
  assert.equal(getTimelineLinkAxesTitle(t), 'Lier les axes (X/Y/Z)');
  assert.equal(getTimelineReorderTitle(t), 'Glisser pour réordonner');
});
