import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTimelineRuntimeStatusLabels,
  buildTimelineRuntimeTransportLabels,
  resolveTimelineRuntimeErrorStatusLabel
} from '../../app/widgets/timeline/timelineRuntimeI18n.js';

test('buildTimelineRuntimeTransportLabels uses translated values when available', () => {
  const t = (key) => {
    const map = {
      'timeline.cue': 'Cue',
      'timeline.play': 'Play',
      'timeline.pause': 'Pause',
      'timeline.continue': 'Continue'
    };
    return map[key] || key;
  };
  const labels = buildTimelineRuntimeTransportLabels(t);
  assert.equal(labels.cue, 'Cue');
  assert.equal(labels.play, 'Play');
  assert.equal(labels.pause, 'Pause');
  assert.equal(labels.continue, 'Continue');
});

test('buildTimelineRuntimeStatusLabels keeps safe fallbacks when translation is missing', () => {
  const t = (key) => key;
  const labels = buildTimelineRuntimeStatusLabels(t);
  assert.equal(labels.fpsMissing, 'FPS manquant sur la station serveur.');
  assert.equal(labels.noTracks, 'Aucune piste.');
  assert.equal(labels.fpsInvalid, 'FPS invalide.');
  assert.equal(labels.jsonInvalid, 'Valeur JSON invalide.');
  assert.equal(labels.transformInvalid, 'Valeur Transform invalide.');
  assert.equal(labels.valueOutOfRange, 'Valeur hors limite.');
});

test('resolveTimelineRuntimeErrorStatusLabel maps known error types only', () => {
  const labels = {
    fpsInvalid: 'fps',
    jsonInvalid: 'parse',
    transformInvalid: 'transform',
    valueOutOfRange: 'value'
  };
  assert.equal(resolveTimelineRuntimeErrorStatusLabel(labels, 'fps'), 'fps');
  assert.equal(resolveTimelineRuntimeErrorStatusLabel(labels, 'parse'), 'parse');
  assert.equal(
    resolveTimelineRuntimeErrorStatusLabel(labels, 'transform'),
    'transform'
  );
  assert.equal(resolveTimelineRuntimeErrorStatusLabel(labels, 'value'), 'value');
  assert.equal(resolveTimelineRuntimeErrorStatusLabel(labels, 'other'), '');
});
