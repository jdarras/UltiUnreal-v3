export default function ResourcesDetailHeroCard({
  t,
  detailHasNav = false,
  onStepDetail,
  heroNavAvailable = false,
  onStepHero,
  detailHeroSrc = '',
  detailTitle = '',
  heroActiveIndex = -1,
  onOpenLightboxAt,
  onImageContextMenu,
  galleryItemsLength = 0,
  setHeroIndex,
}) {
  return (
    <div className="uu-card uu-col uu-gap-12">
      <div className="uu-resource-detail-hero">
        {detailHasNav ? (
          <button
            type="button"
            className="uu-resource-hero-nav left"
            onClick={() => onStepDetail?.(-1)}
            disabled={!detailHasNav}
            title={t('common.prev')}
          >
            ‹
          </button>
        ) : null}
        {heroNavAvailable ? (
          <button
            type="button"
            className="uu-resource-hero-inline-nav left"
            onClick={() => onStepHero?.(-1)}
            title={t('common.prev')}
            aria-label={t('common.prev')}
          >
            ‹
          </button>
        ) : null}
        {detailHeroSrc ? (
          <button
            type="button"
            className="uu-resource-hero-btn"
            onClick={() => onOpenLightboxAt?.(heroActiveIndex >= 0 ? heroActiveIndex : 0)}
            onContextMenu={(event) => {
              onImageContextMenu?.(event, detailHeroSrc);
            }}
          >
            <img
              className="uu-resource-detail-thumb-hero"
              src={detailHeroSrc}
              alt={detailTitle}
              loading="lazy"
              decoding="async"
              onError={() => {
                if (galleryItemsLength <= 1) return;
                setHeroIndex?.((prev) => {
                  const next = prev + 1;
                  if (next >= galleryItemsLength) return prev;
                  return next;
                });
              }}
            />
          </button>
        ) : (
          <div className="uu-resource-detail-thumb-hero placeholder">
            {t('resources.noThumbnail')}
          </div>
        )}
        {heroNavAvailable ? (
          <button
            type="button"
            className="uu-resource-hero-inline-nav right"
            onClick={() => onStepHero?.(1)}
            title={t('common.next')}
            aria-label={t('common.next')}
          >
            ›
          </button>
        ) : null}
        {detailHasNav ? (
          <button
            type="button"
            className="uu-resource-hero-nav right"
            onClick={() => onStepDetail?.(1)}
            disabled={!detailHasNav}
            title={t('common.next')}
          >
            ›
          </button>
        ) : null}
      </div>
    </div>
  );
}
