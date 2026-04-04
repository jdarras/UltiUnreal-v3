export default function ProjectsHeaderBar({
  t,
  sortMode,
  onSortChange,
  searchQuery,
  onSearchChange,
  onSearchClear,
  onAdvanced,
  canClear,
  favoriteOnly,
  onToggleFavoriteFilter,
  viewMode,
  onViewChange,
  onAdd,
  canAdd = true,
}) {
  return (
    <div className="uu-row uu-align-center uu-gap-8" style={{ flexWrap: 'nowrap', alignItems: 'center' }}>
      <button
        type="button"
        className="uu-btn"
        onClick={onAdd}
        disabled={!canAdd}
      >
        {t('projects.server.addProject')}
      </button>

      <div className="uu-row uu-gap-8 uu-align-center" style={{ flex: '0 0 auto' }}>
        <select
          className="uu-select"
          style={{ height: '36px' }}
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="name">{t('projects.server.sortByName')}</option>
          <option value="createdAt">{t('projects.server.sortByCreated')}</option>
          <option value="lastModified">{t('projects.server.sortByModified')}</option>
          <option value="engineVersion">{t('projects.server.sortByEngine')}</option>
        </select>

        <div className="uu-row uu-gap-4 uu-align-center" style={{ flex: '0 0 auto' }}>
          <input
            className="uu-input"
            style={{ width: '280px', maxWidth: '320px', height: '36px', lineHeight: '36px' }}
            placeholder={t('projects.search.placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button
            type="button"
            className="uu-btn uu-btn-icon"
            onClick={onSearchClear}
            disabled={!canClear}
            title={t('projects.search.clear')}
            style={{ width: '36px', minWidth: '36px', height: '36px', padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
          <button
            type="button"
            className="uu-btn"
            onClick={onAdvanced}
            style={{ height: '36px', minHeight: '36px', display: 'flex', alignItems: 'center' }}
          >
            {t('projects.search.advancedButton')}
          </button>
        </div>

        <div className="uu-row uu-gap-6 uu-align-center" style={{ marginLeft: '12px' }}>
          <button
            type="button"
            className={`uu-fav-filter ${favoriteOnly ? 'active' : ''}`}
            onClick={onToggleFavoriteFilter}
            aria-pressed={favoriteOnly ? 'true' : 'false'}
            title={t('resources.detail.labels.favorite') || 'Favoris'}
          >
            ★
          </button>
          <span>{t('resources.detail.labels.favorite') || 'Favoris'}</span>
        </div>
      </div>

      <div className="uu-row uu-gap-4" style={{ marginLeft: 'auto' }}>
        <button
          type="button"
          className={`uu-btn ${viewMode === 'thumbs' ? 'prod-toggle-active' : ''}`}
          onClick={() => onViewChange('thumbs')}
        >
          {t('projects.view.thumbs')}
        </button>
        <button
          type="button"
          className={`uu-btn ${viewMode === 'cards' ? 'prod-toggle-active' : ''}`}
          onClick={() => onViewChange('cards')}
        >
          {t('projects.view.cards')}
        </button>
        <button
          type="button"
          className={`uu-btn ${viewMode === 'list' ? 'prod-toggle-active' : ''}`}
          onClick={() => onViewChange('list')}
        >
          {t('projects.view.list')}
        </button>
      </div>
    </div>
  );
}
