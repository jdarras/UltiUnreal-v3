const PAGINATION_ROW_STYLE = { marginTop: '8px', marginBottom: '8px', flexWrap: 'wrap' };

function LogsPaginationBar({
  t,
  totalItems,
  currentPage,
  totalPages,
  canPrevPage,
  canNextPage,
  pageSize,
  onPrevPage,
  onNextPage,
  onPageSizeChange,
}) {
  return (
    <div className="uu-row uu-gap-8 uu-align-center" style={PAGINATION_ROW_STYLE}>
      {totalItems > 0 ? (
        <div className="uu-row uu-gap-6 uu-align-center">
          {canPrevPage ? (
            <button
              type="button"
              className="uu-btn"
              onClick={onPrevPage}
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
              onClick={onNextPage}
            >
              ›
            </button>
          ) : null}
          <select
            className="uu-select w-90"
            value={pageSize}
            onChange={(e) => onPageSizeChange(e.target.value)}
            aria-label={t('logs.pageSizeAria')}
          >
            {[100, 200, 400, 800].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="uu-muted">{`${totalItems} ${t('logs.countLabel')}`}</span>
        </div>
      ) : null}
    </div>
  );
}

export { LogsPaginationBar };
