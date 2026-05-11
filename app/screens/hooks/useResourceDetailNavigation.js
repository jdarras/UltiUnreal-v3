import { useCallback } from 'react';

export function useResourceDetailNavigation({
  detailList,
  detailIndex,
  lightboxItems,
  setDetailUid,
  setLightboxIndex,
} = {}) {
  const openDetail = useCallback((item) => {
    const uid = String(item?.uid || '').trim();
    if (!uid) return;
    setDetailUid(uid);
  }, [setDetailUid]);

  const stepDetail = useCallback((delta) => {
    const list = Array.isArray(detailList) ? detailList : [];
    if (!list.length) return;
    const base = Number.isFinite(detailIndex) && detailIndex >= 0 ? detailIndex : 0;
    const next = (base + delta + list.length) % list.length;
    const nextUid = list[next]?.uid;
    if (!nextUid) return;
    setDetailUid(String(nextUid));
  }, [detailList, detailIndex, setDetailUid]);

  const openLightboxAt = useCallback((index) => {
    const list = Array.isArray(lightboxItems) ? lightboxItems : [];
    if (!list.length) return;
    const safeIndex = Math.min(Math.max(index, 0), list.length - 1);
    setLightboxIndex(safeIndex);
  }, [lightboxItems, setLightboxIndex]);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(-1);
  }, [setLightboxIndex]);

  const stepLightbox = useCallback((delta) => {
    const list = Array.isArray(lightboxItems) ? lightboxItems : [];
    if (!list.length) return;
    setLightboxIndex((prev) => {
      if (prev < 0) return prev;
      return (prev + delta + list.length) % list.length;
    });
  }, [lightboxItems, setLightboxIndex]);

  return {
    openDetail,
    stepDetail,
    openLightboxAt,
    closeLightbox,
    stepLightbox,
  };
}

export default useResourceDetailNavigation;
