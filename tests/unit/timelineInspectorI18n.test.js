import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getTimelineAddKeyframeLabel,
  getTimelineBrowseLabel,
  getTimelineChannelValueLabel,
  getTimelineCompanionBodyLabel,
  getTimelineCompanionCopyLabel,
  getTimelineCompanionUrlLabel,
  getTimelineDeleteKeyframeLabel,
  getTimelineMissingWidgetForTrackLabel,
  getTimelineNoKeyframePlaceholder,
  getTimelineNoWidgetSelectedLabel,
  getTimelineOnOffLabel
} from '../../app/widgets/timeline/timelineInspectorI18n.js';

test('timeline inspector i18n helpers use translated values when available', () => {
  const t = (key, params) => {
    switch (key) {
      case 'timeline.noWidgetSelected':
        return 'Select a widget';
      case 'timeline.widgetMissingForTrack':
        return 'Widget missing';
      case 'timeline.noKeyframePlaceholder':
        return 'No keyframe';
      case 'timeline.browse':
        return 'Browse';
      case 'timeline.channelValueLabel':
        return `Channel ${params?.label}:`;
      case 'widgets.companion.urlLabel':
        return 'URL';
      case 'widgets.companion.copy':
        return 'Copy';
      case 'widgets.companion.bodyLabel':
        return 'Body';
      case 'widgets.common.deleteKeyframe':
        return 'Delete keyframe';
      case 'widgets.common.addKeyframe':
        return 'Add keyframe';
      case 'widgets.common.onLabel':
        return 'On';
      case 'widgets.common.offLabel':
        return 'Off';
      default:
        return key;
    }
  };

  assert.equal(getTimelineNoWidgetSelectedLabel(t), 'Select a widget');
  assert.equal(getTimelineMissingWidgetForTrackLabel(t), 'Widget missing');
  assert.equal(getTimelineNoKeyframePlaceholder(t), 'No keyframe');
  assert.equal(getTimelineBrowseLabel(t), 'Browse');
  assert.equal(getTimelineChannelValueLabel(t, 'R'), 'Channel R:');
  assert.equal(getTimelineCompanionUrlLabel(t), 'URL');
  assert.equal(getTimelineCompanionCopyLabel(t), 'Copy');
  assert.equal(getTimelineCompanionBodyLabel(t), 'Body');
  assert.equal(getTimelineDeleteKeyframeLabel(t), 'Delete keyframe');
  assert.equal(getTimelineAddKeyframeLabel(t), 'Add keyframe');
  assert.equal(getTimelineOnOffLabel(t), 'On/Off');
});

test('timeline inspector i18n helpers keep safe fallbacks when translation is missing', () => {
  const t = (key) => key;

  assert.equal(
    getTimelineNoWidgetSelectedLabel(t),
    'Selectionnez un widget dans la timeline.'
  );
  assert.equal(
    getTimelineMissingWidgetForTrackLabel(t),
    'Widget introuvable pour cette piste.'
  );
  assert.equal(getTimelineNoKeyframePlaceholder(t), 'Aucun keyframe');
  assert.equal(getTimelineBrowseLabel(t), 'Parcourir');
  assert.equal(getTimelineChannelValueLabel(t, 'X'), 'Canal X :');
  assert.equal(getTimelineChannelValueLabel(t, ''), 'Canal :');
  assert.equal(getTimelineCompanionUrlLabel(t), 'URL');
  assert.equal(getTimelineCompanionCopyLabel(t), 'Copier');
  assert.equal(getTimelineCompanionBodyLabel(t), 'Body');
  assert.equal(getTimelineDeleteKeyframeLabel(t), 'Supprimer le keyframe');
  assert.equal(getTimelineAddKeyframeLabel(t), 'Ajouter un keyframe');
  assert.equal(getTimelineOnOffLabel(t), 'On/Off');
});
