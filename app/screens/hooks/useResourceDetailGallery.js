import { useCallback, useEffect, useMemo, useState } from 'react';
import { extractGalleryImages, getThumbSrc } from '../../utils/resources-helpers';
import { normalizeThumbnailPath } from '../../utils/projects-helpers';

export function useResourceDetailGallery({
  detailUid,
  detailItem,
} = {}) {
  const [heroIndex, setHeroIndex] = useState(0);

  const detailGalleryRaw = useMemo(
    () => (detailItem ? extractGalleryImages(detailItem) : []),
    [detailItem]
  );
  const detailThumb = useMemo(() => (detailItem ? getThumbSrc(detailItem) : ''), [detailItem]);

  const galleryBlockItems = useMemo(() => {
    const out = [];
    const seen = new Set();
    const push = (src) => {
      const safeSrc = normalizeThumbnailPath(src);
      if (!safeSrc) return;
      const key = safeSrc.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(safeSrc);
    };
    push(detailThumb);
    detailGalleryRaw.forEach(push);
    return out;
  }, [detailThumb, detailGalleryRaw]);

  useEffect(() => {
    setHeroIndex(0);
  }, [detailUid]);

  useEffect(() => {
    setHeroIndex((prev) => {
      if (!galleryBlockItems.length) return 0;
      if (prev < 0 || prev >= galleryBlockItems.length) return 0;
      return prev;
    });
  }, [galleryBlockItems.length]);

  const heroActiveIndex = galleryBlockItems.length
    ? Math.min(Math.max(heroIndex, 0), galleryBlockItems.length - 1)
    : -1;
  const detailHeroSrc = heroActiveIndex >= 0 ? galleryBlockItems[heroActiveIndex] : '';
  const heroNavAvailable = galleryBlockItems.length > 1;
  const lightboxItems = galleryBlockItems;

  const stepHero = useCallback((delta) => {
    const list = Array.isArray(galleryBlockItems) ? galleryBlockItems : [];
    if (!list.length) return;
    setHeroIndex((prev) => {
      const base = prev >= 0 && prev < list.length ? prev : 0;
      return (base + delta + list.length) % list.length;
    });
  }, [galleryBlockItems]);

  return {
    galleryBlockItems,
    heroActiveIndex,
    detailHeroSrc,
    heroNavAvailable,
    lightboxItems,
    setHeroIndex,
    stepHero,
  };
}
