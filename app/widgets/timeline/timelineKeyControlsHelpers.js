import {
  KEY_EYE_GAP,
  KEY_EYE_BOX,
  KEY_CONTROL_START_X,
  KEY_CONTROL_GAP,
  KEY_VALUE_HEIGHT,
  KEY_VALUE_OFFSET_Y,
} from './layout';

function buildCurveVisibilityTrackPatch(track, entryKind, channelId = null) {
  if (entryKind === 'multi') {
    const hiddenChannels = { ...(track.hiddenChannels || {}) };
    if (hiddenChannels[channelId]) {
      delete hiddenChannels[channelId];
    } else {
      hiddenChannels[channelId] = true;
    }
    return { ...track, hiddenChannels };
  }
  return { ...track, hidden: !track.hidden };
}

function buildKeyControlsGeometry(y) {
  const centerY = y - 4;
  const eyeX = KEY_CONTROL_START_X - KEY_EYE_GAP;
  const eyeBoxX = eyeX - KEY_EYE_BOX / 2;
  const eyeBoxY = centerY - KEY_EYE_BOX / 2;
  const leftArrowX = KEY_CONTROL_START_X;
  const dotX = leftArrowX + KEY_CONTROL_GAP;
  const rightArrowX = dotX + KEY_CONTROL_GAP;
  const valueBoxX = rightArrowX + KEY_CONTROL_GAP;
  const valueCenterY = centerY + KEY_VALUE_OFFSET_Y;
  const valueBoxY = valueCenterY - KEY_VALUE_HEIGHT / 2;
  return {
    centerY,
    eyeX,
    eyeBoxX,
    eyeBoxY,
    leftArrowX,
    dotX,
    rightArrowX,
    valueBoxX,
    valueCenterY,
    valueBoxY,
  };
}

function getKeyControlDisplayValue(rawValue, maxLen = 8) {
  const valueText = String(rawValue ?? '');
  return valueText.length > maxLen ? valueText.slice(0, maxLen) : valueText;
}

export {
  buildCurveVisibilityTrackPatch,
  buildKeyControlsGeometry,
  getKeyControlDisplayValue,
};
