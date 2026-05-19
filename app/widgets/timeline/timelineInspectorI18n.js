import { safeT } from '../../utils/i18nSafe.js';

const TIMELINE_NO_WIDGET_SELECTED_FALLBACK =
  'Selectionnez un widget dans la timeline.';
const TIMELINE_MISSING_WIDGET_FOR_TRACK_FALLBACK =
  'Widget introuvable pour cette piste.';
const TIMELINE_NO_KEYFRAME_PLACEHOLDER_FALLBACK = 'Aucun keyframe';
const TIMELINE_BROWSE_FALLBACK = 'Parcourir';
const TIMELINE_CHANNEL_VALUE_LABEL_FALLBACK = 'Canal :';

export function getTimelineNoWidgetSelectedLabel(t) {
  return safeT(t, 'timeline.noWidgetSelected', TIMELINE_NO_WIDGET_SELECTED_FALLBACK);
}

export function getTimelineMissingWidgetForTrackLabel(t) {
  return safeT(
    t,
    'timeline.widgetMissingForTrack',
    TIMELINE_MISSING_WIDGET_FOR_TRACK_FALLBACK
  );
}

export function getTimelineNoKeyframePlaceholder(t) {
  return safeT(
    t,
    'timeline.noKeyframePlaceholder',
    TIMELINE_NO_KEYFRAME_PLACEHOLDER_FALLBACK
  );
}

export function getTimelineBrowseLabel(t) {
  return safeT(t, 'timeline.browse', TIMELINE_BROWSE_FALLBACK);
}

export function getTimelineOnOffLabel(t) {
  const onLabel = safeT(t, 'widgets.common.onLabel', 'On');
  const offLabel = safeT(t, 'widgets.common.offLabel', 'Off');
  return `${onLabel}/${offLabel}`;
}

export function getTimelineChannelValueLabel(t, channelLabel) {
  const normalized = String(channelLabel || '').trim();
  const fallback = normalized
    ? `Canal ${normalized} :`
    : TIMELINE_CHANNEL_VALUE_LABEL_FALLBACK;
  const translated = safeT(t, 'timeline.channelValueLabel', fallback, {
    label: normalized
  });
  return translated.replace('{label}', normalized).replace(/\s{2,}/g, ' ').trim();
}

export function getTimelineCompanionUrlLabel(t) {
  return safeT(t, 'widgets.companion.urlLabel', 'URL');
}

export function getTimelineCompanionCopyLabel(t) {
  return safeT(t, 'widgets.companion.copy', 'Copier');
}

export function getTimelineCompanionBodyLabel(t) {
  return safeT(t, 'widgets.companion.bodyLabel', 'Body');
}

export function getTimelineDeleteKeyframeLabel(t) {
  return safeT(t, 'widgets.common.deleteKeyframe', 'Supprimer le keyframe');
}

export function getTimelineAddKeyframeLabel(t) {
  return safeT(t, 'widgets.common.addKeyframe', 'Ajouter un keyframe');
}
