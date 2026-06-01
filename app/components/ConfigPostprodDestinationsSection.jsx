export default function ConfigPostprodDestinationsSection({
  t,
  SectionTitleComponent,
  exportDestinations = [],
  onAddDestination,
  onUpdateDestination,
  onRemoveDestination,
  onBrowseDestinationPath,
}) {
  const titleNode = SectionTitleComponent
    ? (
        <SectionTitleComponent>
          {t('config.postprod.destinations.sectionTitle')}
        </SectionTitleComponent>
      )
    : (
        <h3 className="uu-h3 uu-block-title">
          {t('config.postprod.destinations.sectionTitle')}
        </h3>
      );

  return (
    <div className="uu-section mt-16">
      {titleNode}

      <div className="uu-grid-field uu-maxw-720 mt-12">
        <label className="uu-label">
          {t('config.postprod.exports.title')}
        </label>

        <div className="uu-row mt-12">
          <button
            type="button"
            className="uu-btn"
            onClick={() => onAddDestination?.()}
          >
            {t('config.postprod.exports.add')}
          </button>
        </div>

        {exportDestinations.length <= 0 ? (
          <div className="uu-muted mt-8">
            {t('config.postprod.exports.empty')}
          </div>
        ) : null}

        {exportDestinations.map((entry, idx) => (
          <div key={`config-export-destination-${entry.id || idx}`} className="uu-grid-field mt-12">
            <div className="uu-export-destination-grid">
              <div className="uu-grid-field">
                <label className="uu-label">{t('config.postprod.exports.name')}</label>
                <div className="uu-export-destination-name-row">
                  <label className="uu-check uu-export-destination-active">
                    <input
                      type="checkbox"
                      checked={entry.isActive !== false}
                      onChange={(e) => onUpdateDestination?.(idx, { isActive: !!e.target.checked })}
                    />
                    {t('config.postprod.exports.active')}
                  </label>
                  <input
                    className="uu-input"
                    value={String(entry.name || '')}
                    onChange={(e) => onUpdateDestination?.(idx, { name: e.target.value })}
                    placeholder={t('config.postprod.exports.namePlaceholder')}
                  />
                </div>
              </div>
              <div className="uu-grid-field">
                <label className="uu-label">{t('config.postprod.exports.path')}</label>
                <div className="uu-export-destination-path-row">
                  <input
                    className="uu-input"
                    value={String(entry.path || '')}
                    onChange={(e) => onUpdateDestination?.(idx, { path: e.target.value })}
                    placeholder="D:\\Livraison\\Rendus"
                  />
                  <button
                    type="button"
                    className="uu-btn"
                    onClick={() => { void onBrowseDestinationPath?.(idx); }}
                  >
                    {t('common.browse')}
                  </button>
                  <button
                    type="button"
                    className="uu-btn"
                    onClick={() => onRemoveDestination?.(idx)}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
