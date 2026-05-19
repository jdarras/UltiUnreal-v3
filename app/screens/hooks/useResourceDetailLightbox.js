import { useEffect } from 'react';

export function useResourceDetailLightbox({
  detailUid,
  lightboxIndex,
  lightboxItems,
  lightboxOpen,
  setLightboxIndex,
  closeLightbox,
  stepLightbox,
} = {}) {
  useEffect(() => {
    setLightboxIndex(-1);
  }, [detailUid, setLightboxIndex]);

  useEffect(() => {
    if (lightboxIndex < 0) return;
    if (lightboxIndex >= lightboxItems.length) {
      setLightboxIndex(lightboxItems.length ? 0 : -1);
    }
  }, [lightboxIndex, lightboxItems.length, setLightboxIndex]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepLightbox(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, lightboxItems.length, closeLightbox, stepLightbox]);
}
