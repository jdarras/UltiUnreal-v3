const RESOURCES_PAGINATION_ROW_STYLE = { marginBottom: '8px' };
const RESOURCES_PAGE_SIZE_STYLE = { width: '80px' };

export default function ResourcesPaginationBar({
  t,
  currentPage = 0,
  totalPages = 1,
  canPrevPage = false,
  canNextPage = false,
  pageSize = 25,
  onPrev,
  onNext,
  onPageSizeChange,
}) {
  return (
    <div className="uu-row uu-gap-12 uu-align-center" style={RESOURCES_PAGINATION_ROW_STYLE}>
      <div className="uu-row uu-gap-6 uu-align-center">
        {canPrevPage ? (
          <button
            type="button"
            className="uu-btn"
            onClick={onPrev}
            aria-label={t('projects.pagination.prevAria')}
          >
            ‹
          </button>
        ) : null}
        <span className="uu-muted">
          {`Page ${currentPage + 1}/${totalPages}`}
        </span>
        {canNextPage ? (
          <button
            type="button"
            className="uu-btn"
            onClick={onNext}
            aria-label={t('projects.pagination.nextAria')}
          >
            ›
          </button>
        ) : null}
        <select
          className="uu-select"
          value={pageSize}
          onChange={(event) => onPageSizeChange?.(Math.max(10, Number(event.target.value) || 25))}
          style={RESOURCES_PAGE_SIZE_STYLE}
          aria-label={t('projects.pagination.pageSizeAria')}
        >
          {[25, 50, 100, 200].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
