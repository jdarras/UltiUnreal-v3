const FLEX_1_300_STYLE = { flex: '1 1 300px' };

export default function ProjectsDetailPathCard({
  t,
  detailPath = '',
  onPathChange,
  onPathBlur,
  onBrowse,
  onView,
}) {
  return (
    <div className="uu-card">
      <div className="uu-row wrap">
        <div className="uu-label w-160">{t('projects.detail.labels.path')}</div>
        <div className="uu-value">
          <div className="uu-row uu-gap-6 uu-wrap uu-align-center">
            <input
              className="uu-input"
              style={FLEX_1_300_STYLE}
              value={detailPath}
              onChange={onPathChange}
              onBlur={onPathBlur}
            />
            <button
              type="button"
              className="uu-btn"
              onClick={onBrowse}
            >
              {t('common.browse')}
            </button>
            <button
              type="button"
              className="uu-btn"
              onClick={onView}
            >
              {t('common.view')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
