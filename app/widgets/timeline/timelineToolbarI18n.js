import { safeT } from '../../utils/i18nSafe.js';

export function buildTimelineToolbarLabels(t) {
  return {
    cue: safeT(t, 'timeline.cue', 'Cue (go back to start)'),
    play: safeT(t, 'timeline.play', 'Play'),
    pause: safeT(t, 'timeline.pause', 'Pause'),
    continue: safeT(t, 'timeline.continue', 'Continue'),
    prevFrame: safeT(t, 'timeline.prevFrame', 'Previous frame'),
    nextFrame: safeT(t, 'timeline.nextFrame', 'Next frame'),
    keyframeTypeConstant: safeT(
      t,
      'timeline.keyframeType.constant',
      'Constant (hold)'
    ),
    keyframeTypeLinear: safeT(t, 'timeline.keyframeType.linear', 'Linear'),
    keyframeTypeBezier: safeT(t, 'timeline.keyframeType.bezier', 'Bezier'),
    bezierIn: safeT(t, 'timeline.bezier.in', 'In/Len'),
    bezierOut: safeT(t, 'timeline.bezier.out', 'Out/Len'),
    bezierInSlope: safeT(
      t,
      'timeline.bezier.inSlope',
      'Incoming slope (x100, integer)'
    ),
    bezierOutSlope: safeT(
      t,
      'timeline.bezier.outSlope',
      'Outgoing slope (x100, integer)'
    ),
    bezierInSpan: safeT(t, 'timeline.bezier.inSpan', 'Incoming span (frames)'),
    bezierOutSpan: safeT(
      t,
      'timeline.bezier.outSpan',
      'Outgoing span (frames)'
    ),
    durationTc: safeT(t, 'timeline.durationTc', 'Duration (TC)'),
    durationFrames: safeT(
      t,
      'timeline.durationFrames',
      'Duration (frames)'
    ),
    durationAuto: safeT(t, 'timeline.durationAuto', 'Auto')
  };
}

export function getTimelineToggleTimecodeTitle(t) {
  return safeT(
    t,
    'timeline.toggleTimecode',
    'Toggle frames / timecode'
  );
}

export function getTimelineFpsDisplayText(t, fps, fpsWarnings = []) {
  const fpsLabel = safeT(t, 'timeline.fpsLabel', 'FPS');
  const missingSuffix = Array.isArray(fpsWarnings) && fpsWarnings.includes('missing')
    ? ` ${safeT(t, 'timeline.fpsMissingShort', '(missing)')}`
    : '';
  return `${fpsLabel}: ${fps}${missingSuffix}`;
}
