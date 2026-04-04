// Pure selection helpers shared by timeline editor/track code

export const sameKey = (a, b) => {
  if (!a || !b) return false;
  return (
    a.trackId === b.trackId &&
    (a.channelId || '') === (b.channelId || '') &&
    a.idx === b.idx
  );
};

export const dedupeSelection = (items) => {
  const seen = new Set();
  const out = [];
  items.forEach((item) => {
    if (!item) return;
    const key = `${item.trackId}:${item.channelId || ''}:${item.idx}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  });
  return out;
};

export const collectLinkedSiblings = (trackInfo, channelId, idx) => {
  if (!trackInfo || trackInfo.meta?.kind !== 'multi' || !trackInfo.track?.linkChannels) return [];
  const list = trackInfo.channels?.[channelId] || [];
  const source = list?.[idx];
  if (!source) return [];
  const frame = Number(source.frame);
  if (!Number.isFinite(frame)) return [];
  return (trackInfo.meta.channels || [])
    .map((channel) => {
      const channelList = trackInfo.channels?.[channel.id] || [];
      const matchIdx = channelList.findIndex((kf) => Number(kf?.frame) === frame);
      if (matchIdx < 0) return null;
      return {
        trackId: trackInfo.track.widgetId,
        channelId: channel.id,
        idx: matchIdx
      };
    })
    .filter(Boolean);
};

export const buildIgnoreMap = (selection) => {
  const map = new Map();
  selection.forEach((item) => {
    if (!item) return;
    const key = `${item.trackId}:${item.channelId || ''}`;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(item.idx);
  });
  return map;
};
