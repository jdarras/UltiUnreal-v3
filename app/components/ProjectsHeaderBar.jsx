import { getFavoriteLabel } from './componentI18n';

const PROJECTS_HEADER_ROOT_STYLE = { flexWrap: 'nowrap', alignItems: 'center' };
const PROJECTS_HEADER_GROUP_STYLE = { flex: '0 0 auto' };
const PROJECTS_HEADER_SORT_SELECT_STYLE = { height: '36px' };
const PROJECTS_HEADER_SEARCH_INPUT_STYLE = { width: '280px', maxWidth: '320px', height: '36px', lineHeight: '36px' };
const PROJECTS_HEADER_CLEAR_BUTTON_STYLE = {
  width: '36px',
  minWidth: '36px',
  height: '36px',
  padding: '0 6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const PROJECTS_HEADER_ADVANCED_BUTTON_STYLE = { height: '36px', minHeight: '36px', display: 'flex', alignItems: 'center' };
const PROJECTS_HEADER_FAVORITES_STYLE = { marginLeft: '12px' };
const PROJECTS_HEADER_VIEW_MODE_STYLE = { marginLeft: 'auto' };

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
  const favoriteLabel = getFavoriteLabel(t);
  return (
    <div className="uu-row uu-align-center uu-gap-8" style={PROJECTS_HEADER_ROOT_STYLE}>
      <button
        type="button"
        className="uu-btn"
        onClick={onAdd}
        disabled={!canAdd}
      >
        {t('projects.server.addProject')}
      </button>

      <div className="uu-row uu-gap-8 uu-align-center" style={PROJECTS_HEADER_GROUP_STYLE}>
        <select
          className="uu-select"
          style={PROJECTS_HEADER_SORT_SELECT_STYLE}
          value={sortMode}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="name">{t('projects.server.sortByName')}</option>
          <option value="createdAt">{t('projects.server.sortByCreated')}</option>
          <option value="lastModified">{t('projects.server.sortByModified')}</option>
          <option value="engineVersion">{t('projects.server.sortByEngine')}</option>
        </select>

        <div className="uu-row uu-gap-4 uu-align-center" style={PROJECTS_HEADER_GROUP_STYLE}>
          <input
            className="uu-input"
            style={PROJECTS_HEADER_SEARCH_INPUT_STYLE}
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
            style={PROJECTS_HEADER_CLEAR_BUTTON_STYLE}
          >
            ✕
          </button>
          <button
            type="button"
            className="uu-btn"
            onClick={onAdvanced}
            style={PROJECTS_HEADER_ADVANCED_BUTTON_STYLE}
          >
            {t('projects.search.advancedButton')}
          </button>
        </div>

        <div className="uu-row uu-gap-6 uu-align-center" style={PROJECTS_HEADER_FAVORITES_STYLE}>
          <button
            type="button"
            className={`uu-fav-filter ${favoriteOnly ? 'active' : ''}`}
            onClick={onToggleFavoriteFilter}
            aria-pressed={favoriteOnly ? 'true' : 'false'}
            title={favoriteLabel}
          >
            ★
          </button>
          <span>{favoriteLabel}</span>
        </div>
      </div>

      <div className="uu-row uu-gap-4" style={PROJECTS_HEADER_VIEW_MODE_STYLE}>
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
