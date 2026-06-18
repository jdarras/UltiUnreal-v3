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

export const deleteSelectedKeyframesFromTrack = (track, selection = []) => {
  const next = { ...track };
  const isMulti = track?.meta?.kind === 'multi';

  if (isMulti) {
    const grouped = {};
    selection.forEach((sel) => {
      if (!sel || sel.channelId === null || sel.channelId === undefined) return;
      grouped[sel.channelId] = grouped[sel.channelId] || [];
      grouped[sel.channelId].push(sel.idx);
    });

    Object.entries(grouped).forEach(([channelId, indices]) => {
      const list = Array.isArray(next.channels?.[channelId]) ? [...next.channels[channelId]] : [];
      indices
        .filter((i) => i >= 0 && i < list.length)
        .sort((a, b) => b - a)
        .forEach((i) => list.splice(i, 1));
      if (!next.channels) next.channels = {};
      next.channels[channelId] = list;
    });
    return next;
  }

  const list = Array.isArray(track?.keyframes) ? [...track.keyframes] : [];
  selection
    .map((sel) => sel?.idx)
    .filter((i) => Number.isInteger(i) && i >= 0 && i < list.length)
    .sort((a, b) => b - a)
    .forEach((i) => list.splice(i, 1));
  next.keyframes = list;
  return next;
};
