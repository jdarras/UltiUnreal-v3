import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTimelineLabel,
  getWidgetLabel
} from '../../app/widgets/timeline/timelineWidgetLabels.js';
import {
  getTimelineDefaultLabel,
  getTimelineWidgetMissingLabel
} from '../../app/widgets/timeline/timelineWidgetSharedI18n.js';

test('timelineWidgetSharedI18n resolves translated and fallback labels', () => {
  const t = (key) => {
    if (key === 'timeline.widgetMissing') return 'Missing widget';
    if (key === 'production.widgets.timelineLabel') return 'Timeline';
    return key;
  };

  assert.equal(getTimelineWidgetMissingLabel(t), 'Missing widget');
  assert.equal(getTimelineDefaultLabel(t), 'Timeline');
  assert.equal(getTimelineWidgetMissingLabel(null), 'Widget manquant');
  assert.equal(getTimelineDefaultLabel(null), 'Timeline');
});

test('getWidgetLabel returns translated missing label and keeps existing label/type behavior', () => {
  const t = (key) => (key === 'timeline.widgetMissing' ? 'Missing widget' : key);

  assert.equal(getWidgetLabel(null, t), 'Missing widget');
  assert.equal(getWidgetLabel({ label: '  My Widget  ' }, t), 'My Widget');
  assert.equal(getWidgetLabel({ type: 'slider' }, t), 'slider');
  assert.equal(getWidgetLabel({}, t), 'Widget');
});

test('getTimelineLabel returns explicit label or localized timeline fallback', () => {
  const t = (key) =>
    key === 'production.widgets.timelineLabel' ? 'Timeline' : key;

  assert.equal(getTimelineLabel({ label: '  Cue Timeline  ' }, t), 'Cue Timeline');
  assert.equal(getTimelineLabel({ label: '' }, t), 'Timeline');
  assert.equal(getTimelineLabel({}, null), 'Timeline');
});
