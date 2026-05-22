export default function ResourcesDetailLightbox({
  open = false,
  items = [],
  index = 0,
  title = '',
  onClose,
  onStep,
  onImageContextMenu,
}) {
  if (!open || !Array.isArray(items) || items.length === 0) return null;

  const canNavigate = items.length >= 2;
  const currentSrc = items[index];

  return (
    <div className="uu-lightbox" onClick={onClose}>
      <div className="uu-lightbox-inner" onClick={(event) => event.stopPropagation()}>
        <button className="uu-lightbox-close" type="button" onClick={onClose}>
          ×
        </button>
        <button
          className="uu-lightbox-nav left"
          type="button"
          onClick={() => onStep?.(-1)}
          disabled={!canNavigate}
        >
          ‹
        </button>
        <img
          className="uu-lightbox-img"
          src={currentSrc}
          alt={title}
          onContextMenu={(event) => {
            onImageContextMenu?.(event, currentSrc);
          }}
        />
        <button
          className="uu-lightbox-nav right"
          type="button"
          onClick={() => onStep?.(1)}
          disabled={!canNavigate}
        >
          ›
        </button>
      </div>
    </div>
  );
}
