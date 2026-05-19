import { safeT } from '../../utils/i18nSafe.js';

export function buildTimelineRuntimeTransportLabels(t) {
  return {
    cue: safeT(t, 'timeline.cue', 'Cue (revenir au debut)'),
    play: safeT(t, 'timeline.play', 'Play'),
    pause: safeT(t, 'timeline.pause', 'Pause'),
    continue: safeT(t, 'timeline.continue', 'Continue')
  };
}

export function buildTimelineRuntimeStatusLabels(t) {
  return {
    fpsMissing: safeT(
      t,
      'timeline.status.fpsMissing',
      'FPS manquant sur la station serveur.'
    ),
    noTracks: safeT(t, 'timeline.status.noTracks', 'Aucune piste.'),
    fpsInvalid: safeT(t, 'timeline.status.fpsInvalid', 'FPS invalide.'),
    jsonInvalid: safeT(
      t,
      'timeline.status.jsonInvalid',
      'Valeur JSON invalide.'
    ),
    transformInvalid: safeT(
      t,
      'timeline.status.transformInvalid',
      'Valeur Transform invalide.'
    ),
    valueOutOfRange: safeT(
      t,
      'timeline.status.valueOutOfRange',
      'Valeur hors limite.'
    )
  };
}

export function resolveTimelineRuntimeErrorStatusLabel(statusLabels, errorType) {
  switch (errorType) {
    case 'fps':
      return statusLabels.fpsInvalid;
    case 'parse':
      return statusLabels.jsonInvalid;
    case 'transform':
      return statusLabels.transformInvalid;
    case 'value':
      return statusLabels.valueOutOfRange;
    default:
      return '';
  }
}
