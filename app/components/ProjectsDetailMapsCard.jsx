const TITLE_ROW_STYLE = { marginBottom: '12px' };
const WIDTH_520_STYLE = { width: '520px' };

export default function ProjectsDetailMapsCard({
  t,
  selectedGame = '',
  selectedEditor = '',
  mapOptions = [],
  mapListDisplay = [],
  mapsBusy = false,
  detailLoading = false,
  onSelectGame,
  onSelectEditor,
}) {
  return (
    <div className="uu-card">
      <div className="uu-row uu-align-center uu-gap-8" style={TITLE_ROW_STYLE}>
        <strong className="uu-block-title">{t('projects.detail.blocks.maps')}</strong>
      </div>

      <div className="uu-col uu-gap-16">
        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.maps.defaultGame')}</div>
          <div className="uu-value">
            <select
              className="uu-select"
              style={WIDTH_520_STYLE}
              value={selectedGame}
              onChange={onSelectGame}
              disabled={mapsBusy || detailLoading}
            >
              <option value="">{t('common.none')}</option>
              {mapOptions.map((option) => (
                <option key={`g-${option.assetFull}`} value={option.assetFull}>
                  {option.display}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="uu-row wrap">
          <div className="uu-label w-160">{t('projects.detail.maps.defaultEditor')}</div>
          <div className="uu-value">
            <select
              className="uu-select"
              style={WIDTH_520_STYLE}
              value={selectedEditor}
              onChange={onSelectEditor}
              disabled={mapsBusy || detailLoading}
            >
              <option value="">{t('common.none')}</option>
              {mapOptions.map((option) => (
                <option key={`e-${option.assetFull}`} value={option.assetFull}>
                  {option.display}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="uu-row wrap">
        <div className="uu-label w-160" />
        <div className="uu-value uu-muted">
          {mapListDisplay.length ? (
            <div className="uu-small mt-4">
              {mapListDisplay.map((displayPath, idx) => (
                <div key={idx}>{displayPath}</div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
