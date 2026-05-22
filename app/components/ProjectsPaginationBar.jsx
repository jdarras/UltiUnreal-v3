const PAGINATION_ROW_MARGIN_STYLE = { margin: '12px 0' };
const PAGE_SIZE_SELECT_STYLE = { width: '80px' };

export default function ProjectsPaginationBar({
  t,
  currentPage,
  totalPages,
  canPrevPage,
  canNextPage,
  pageSize,
  onPrev,
  onNext,
  onPageSizeChange,
}) {
  return (
    <div className="uu-row uu-gap-12 uu-align-center" style={PAGINATION_ROW_MARGIN_STYLE}>
      <div className="uu-row uu-gap-6 uu-align-center">
        {canPrevPage && (
          <button
            type="button"
            className="uu-btn"
            onClick={onPrev}
            aria-label={t('projects.pagination.prevAria')}
          >
            {'\u2039'}
          </button>
        )}
        <span className="uu-muted">
          {`Page ${currentPage + 1}/${totalPages}`}
        </span>
        {canNextPage && (
          <button
            type="button"
            className="uu-btn"
            onClick={onNext}
            aria-label={t('projects.pagination.nextAria')}
          >
            {'\u203A'}
          </button>
        )}
        <select
          className="uu-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Math.max(10, Number(e.target.value) || 50))}
          style={PAGE_SIZE_SELECT_STYLE}
          aria-label={t('projects.pagination.pageSizeAria')}
        >
          {[25, 50, 100, 200].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
