const DETAIL_NAME_INPUT_STYLE = { minWidth: '240px', width: '50%' };
const FLEX_ZERO_AUTO_STYLE = { flex: '0 0 auto' };
const MARGIN_LEFT_AUTO_STYLE = { marginLeft: 'auto' };

export default function ProjectsDetailHeaderBar({
  t,
  detailId = '',
  detailName = '',
  onDetailNameChange,
  isFavorite = false,
  onToggleFavorite,
  engineVersionElement = null,
  detailIsNew = false,
  onCreateProject,
  onBack,
}) {
  return (
    <div className="uu-section">
      <div className="uu-row uu-align-center uu-gap-8 uu-wrap">
        <span className="uu-id-tag">[{detailId}]</span>
        <input
          className="uu-input"
          style={DETAIL_NAME_INPUT_STYLE}
          value={detailName}
          onChange={onDetailNameChange}
        />
        <div className="uu-row uu-align-center uu-gap-6" style={FLEX_ZERO_AUTO_STYLE}>
          <button
            type="button"
            className={`uu-fav-btn ${isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
            aria-pressed={isFavorite ? 'true' : 'false'}
            title={t('resources.detail.labels.favorite')}
          >
            ★
          </button>
          <span>Favori</span>
          <span>—</span>
          <span>{t('projects.detail.labels.engineVersionShort')} {engineVersionElement}</span>
        </div>
        <div className="uu-row uu-gap-8" style={MARGIN_LEFT_AUTO_STYLE}>
          {detailIsNew ? (
            <button className="uu-btn" onClick={onCreateProject}>
              {t('projects.detail.buttons.add')}
            </button>
          ) : null}
          <button className="uu-btn" onClick={onBack}>{t('projects.detail.back')}</button>
        </div>
      </div>
      {/* inline messages supprimés : seuls les messages top-page sont conservés */}
    </div>
  );
}
