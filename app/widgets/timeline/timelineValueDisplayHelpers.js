import { sampleDiscreteValue, sampleNumericValue } from '../../utils/timeline';
import { formatNumber } from './timelinewidget-shared.js';
import { toLocalFrame } from './frameUtils';
import { getChannelValueAt } from './timelineEntryHelpers';

function getTrackValueSummaryAtFrame(entry, playheadFrame) {
  const localFrame = toLocalFrame(entry, playheadFrame);
  if (!Number.isFinite(localFrame)) return '';

  if (entry.meta.kind === 'number') {
    const value = sampleNumericValue(entry.keyframes || [], localFrame);
    if (!Number.isFinite(value)) return '';
    return formatNumber(value, entry.meta.numericKind);
  }

  if (entry.meta.kind === 'multi') {
    const channels = Array.isArray(entry.meta.channels)
      ? entry.meta.channels
      : [];
    if (!channels.length) return '';
    const hasChannelData = channels.some(
      (channel) => (entry.channels?.[channel.id] || []).length
    );
    if (!hasChannelData) return '';
    if (
      entry.meta.shape === 'vector' ||
      entry.meta.shape === 'color' ||
      entry.meta.shape === 'joystick'
    ) {
      const parts = channels.map((channel) => {
        const value = getChannelValueAt(entry, channel.id, localFrame);
        const label = channel.label || channel.id;
        const display = value === null ? '-' : formatNumber(value, 'float');
        return `${label}:${display}`;
      });
      return parts.join(' ');
    }
    if (entry.meta.shape === 'transform') {
      const getVal = (id) => {
        const value = getChannelValueAt(entry, id, localFrame);
        return value === null ? '-' : formatNumber(value, 'float');
      };
      return `T(${getVal('tx')},${getVal('ty')},${getVal('tz')}) R(${getVal('rroll')},${getVal('rpitch')},${getVal('ryaw')}) S(${getVal('sx')},${getVal('sy')},${getVal('sz')})`;
    }
  }

  if (entry.meta.kind === 'bool') {
    const value = sampleDiscreteValue(entry.keyframes || [], localFrame);
    if (value === null || value === undefined) return '';
    return value ? 'On' : 'Off';
  }

  if (
    entry.meta.kind === 'text' ||
    entry.meta.kind === 'color' ||
    entry.meta.kind === 'enum'
  ) {
    const value = sampleDiscreteValue(entry.keyframes || [], localFrame);
    if (value === null || value === undefined) return '';
    return String(value);
  }

  return '';
}

function getCurrentValueDisplayAtFrame(entry, playheadFrame, channelId = null) {
  if (!entry) return '-';
  const localFrame = toLocalFrame(entry, playheadFrame);
  if (!Number.isFinite(localFrame)) return '-';

  if (entry.meta.kind === 'multi') {
    const effectiveChannelId =
      channelId || entry.meta.channels?.[0]?.id || '';
    if (!effectiveChannelId) return '-';
    const value = getChannelValueAt(entry, effectiveChannelId, localFrame);
    return value === null ? '-' : formatNumber(value, 'float');
  }

  if (entry.meta.kind === 'number') {
    const value = sampleNumericValue(entry.keyframes || [], localFrame);
    return Number.isFinite(value)
      ? formatNumber(value, entry.meta.numericKind)
      : '-';
  }

  if (entry.meta.kind === 'bool') {
    const value = sampleDiscreteValue(entry.keyframes || [], localFrame);
    if (value === null || value === undefined) return '-';
    return value ? 'On' : 'Off';
  }

  if (
    entry.meta.kind === 'text' ||
    entry.meta.kind === 'color' ||
    entry.meta.kind === 'enum'
  ) {
    const value = sampleDiscreteValue(entry.keyframes || [], localFrame);
    if (value === null || value === undefined) return '-';
    return String(value);
  }

  return '-';
}

export {
  getTrackValueSummaryAtFrame,
  getCurrentValueDisplayAtFrame,
};
