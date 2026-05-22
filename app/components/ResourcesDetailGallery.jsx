export default function ResourcesDetailGallery({
  t,
  items = [],
  detailTitle = '',
  onOpenLightboxAt,
  onImageContextMenu,
}) {
  return (
    <div className="uu-card uu-col uu-gap-12">
      <strong className="uu-block-title">
        {t('resources.detail.gallery')}
      </strong>
      {items.length ? (
        <div className="uu-resource-gallery">
          {items.map((src, idx) => (
            <button
              key={`img-${idx}`}
              type="button"
              className="uu-resource-gallery-btn"
              onClick={() => onOpenLightboxAt?.(idx)}
              onContextMenu={(event) => {
                onImageContextMenu?.(event, src);
              }}
            >
              <img
                className="uu-resource-gallery-img"
                src={src}
                alt={detailTitle}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      ) : (
        <div className="uu-muted">{t('resources.noThumbnail')}</div>
      )}
    </div>
  );
}
