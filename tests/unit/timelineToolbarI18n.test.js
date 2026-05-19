import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimelineToolbarLabels,
  getTimelineFpsDisplayText,
  getTimelineToggleTimecodeTitle
} from '../../app/widgets/timeline/timelineToolbarI18n.js';

test('buildTimelineToolbarLabels returns translated values when available', () => {
  const t = (key) => {
    const map = {
      'timeline.cue': 'Cue',
      'timeline.play': 'Play',
      'timeline.pause': 'Pause',
      'timeline.continue': 'Resume',
      'timeline.prevFrame': 'Prev',
      'timeline.nextFrame': 'Next',
      'timeline.keyframeType.constant': 'Constant',
      'timeline.keyframeType.linear': 'Linear',
      'timeline.keyframeType.bezier': 'Bezier',
      'timeline.bezier.in': 'In',
      'timeline.bezier.out': 'Out',
      'timeline.bezier.inSlope': 'In slope',
      'timeline.bezier.outSlope': 'Out slope',
      'timeline.bezier.inSpan': 'In span',
      'timeline.bezier.outSpan': 'Out span',
      'timeline.durationTc': 'Duration TC',
      'timeline.durationFrames': 'Duration frames',
      'timeline.durationAuto': 'Auto'
    };
    return map[key] || key;
  };

  const labels = buildTimelineToolbarLabels(t);
  assert.equal(labels.cue, 'Cue');
  assert.equal(labels.keyframeTypeBezier, 'Bezier');
  assert.equal(labels.bezierOutSlope, 'Out slope');
  assert.equal(labels.durationFrames, 'Duration frames');
});

test('buildTimelineToolbarLabels falls back when translation key is missing', () => {
  const t = (key) => key;
  const labels = buildTimelineToolbarLabels(t);
  assert.equal(labels.cue, 'Cue (go back to start)');
  assert.equal(labels.play, 'Play');
  assert.equal(labels.durationAuto, 'Auto');
});

test('timecode i18n helpers build title and fps text with missing marker', () => {
  const t = (key) => {
    if (key === 'timeline.toggleTimecode') return 'Toggle frames / timecode';
    if (key === 'timeline.fpsLabel') return 'FPS';
    if (key === 'timeline.fpsMissingShort') return '(missing)';
    return key;
  };

  assert.equal(
    getTimelineToggleTimecodeTitle(t),
    'Toggle frames / timecode'
  );
  assert.equal(getTimelineFpsDisplayText(t, 25, []), 'FPS: 25');
  assert.equal(
    getTimelineFpsDisplayText(t, 25, ['missing']),
    'FPS: 25 (missing)'
  );
});

test('timecode i18n helpers use safe fallback values when translation function is absent', () => {
  assert.equal(getTimelineToggleTimecodeTitle(null), 'Toggle frames / timecode');
  assert.equal(getTimelineFpsDisplayText(null, 30, ['missing']), 'FPS: 30 (missing)');
});
