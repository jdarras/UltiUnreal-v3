import { useCallback, useState } from 'react';

export function useInlineDrafts({
  toLocalFrame,
  playheadFrame,
  selectedKey,
  pickDefaultChannelValue,
  sampleNumericValue,
  formatInputNumber
}) {
  const [inlineDrafts, setInlineDrafts] = useState({});

  const getInlineDraftKey = useCallback((trackId, channelId) => `${trackId || ''}:${channelId || ''}`, []);

  const getInlineDraftChannelKey = getInlineDraftKey;

  const getChannelInputValue = useCallback(
    (entry, channelId) => {
      if (!entry || !channelId) return '';
      if (
        selectedKey?.trackId === entry.track.widgetId &&
        selectedKey?.channelId === channelId &&
        Number.isFinite(selectedKey?.idx)
      ) {
        const list = entry.channels?.[channelId] || [];
        const selectedFrame = list[selectedKey.idx];
        const selectedValue = Number(selectedFrame?.value);
        if (Number.isFinite(selectedValue)) {
          return formatInputNumber(selectedValue, 'float');
        }
      }
      const localFrame = toLocalFrame(entry, playheadFrame);
      if (!Number.isFinite(localFrame)) return '';
      const list = entry.channels?.[channelId] || [];
      const value = sampleNumericValue(list, localFrame);
      if (Number.isFinite(value)) return formatInputNumber(value, 'float');
      const fallback = pickDefaultChannelValue(entry, channelId, localFrame);
      return Number.isFinite(fallback) ? formatInputNumber(fallback, 'float') : '';
    },
    [formatInputNumber, pickDefaultChannelValue, playheadFrame, sampleNumericValue, selectedKey, toLocalFrame]
  );

  const getInlineChannelValue = useCallback(
    (entry, channelId, fallbackFrame = null) => {
      if (!entry || !channelId) return '';
      const list = entry.channels?.[channelId] || [];
      const localFrame =
        fallbackFrame !== null && fallbackFrame !== undefined
          ? fallbackFrame
          : toLocalFrame(entry, playheadFrame);
      if (!Number.isFinite(localFrame)) return '';
      const value = sampleNumericValue(list, localFrame);
      if (Number.isFinite(value)) return formatInputNumber(value, 'float');
      const fallback = pickDefaultChannelValue(entry, channelId, localFrame);
      return Number.isFinite(fallback) ? formatInputNumber(fallback, 'float') : '';
    },
    [formatInputNumber, pickDefaultChannelValue, playheadFrame, sampleNumericValue, toLocalFrame]
  );

  const getInlineDraftValue = useCallback(
    (entry, channelId) => {
      if (!entry || !channelId) return '';
      const key = getInlineDraftKey(entry.track.widgetId, channelId);
      if (Object.prototype.hasOwnProperty.call(inlineDrafts, key)) {
        return inlineDrafts[key];
      }
      return getChannelInputValue(entry, channelId);
    },
    [getChannelInputValue, inlineDrafts, getInlineDraftKey]
  );

  const resetInlineDrafts = useCallback(() => setInlineDrafts({}), []);

  return {
    inlineDrafts,
    setInlineDrafts,
    resetInlineDrafts,
    getInlineDraftKey,
    getInlineDraftChannelKey,
    getInlineChannelValue,
    getInlineDraftValue
  };
}
