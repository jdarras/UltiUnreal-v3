const TITLE_ROW_STYLE = { marginBottom: '12px' };
const WIDTH_60_PERCENT_STYLE = { width: '60%' };

export default function ProjectsDetailIntervenantsCard({
  t,
  refs = {},
  onReferentChange,
}) {
  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.intervenants')}</strong>
      </div>
      <div className="uu-col uu-gap-16">
        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.labels.director')}</div>
          <div className="uu-value">
            <input
              className="uu-input"
              style={WIDTH_60_PERCENT_STYLE}
              value={refs.director || ''}
              onChange={(e) => onReferentChange?.('director', e.target.value)}
            />
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.labels.technician')}</div>
          <div className="uu-value">
            <input
              className="uu-input"
              style={WIDTH_60_PERCENT_STYLE}
              value={refs.technician || ''}
              onChange={(e) => onReferentChange?.('technician', e.target.value)}
            />
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.labels.operator')}</div>
          <div className="uu-value">
            <input
              className="uu-input"
              style={WIDTH_60_PERCENT_STYLE}
              value={refs.operator || ''}
              onChange={(e) => onReferentChange?.('operator', e.target.value)}
            />
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.labels.journalist')}</div>
          <div className="uu-value">
            <input
              className="uu-input"
              style={WIDTH_60_PERCENT_STYLE}
              value={refs.journalist || ''}
              onChange={(e) => onReferentChange?.('journalist', e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
