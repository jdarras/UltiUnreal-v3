const RESOURCES_HEADER_ROOT_STYLE = { flexWrap: 'nowrap', alignItems: 'center' };
const RESOURCES_HEADER_GROUP_STYLE = { flex: '0 0 auto' };
const RESOURCES_HEADER_SEARCH_INPUT_STYLE = { width: '280px', maxWidth: '320px', height: '36px', lineHeight: '36px' };
const RESOURCES_HEADER_CLEAR_BUTTON_STYLE = {
  width: '36px',
  minWidth: '36px',
  height: '36px',
  padding: '0 6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
const RESOURCES_HEADER_ADVANCED_BUTTON_STYLE = { height: '36px', minHeight: '36px', display: 'flex', alignItems: 'center' };
const RESOURCES_HEADER_FILTERS_GROUP_STYLE = { flex: '0 0 auto', marginLeft: '12px', gap: '32px' };
const RESOURCES_HEADER_COMPAT_DISABLED_STYLE = { opacity: 0.5 };
const RESOURCES_HEADER_COMPAT_ENABLED_STYLE = { opacity: 1 };
const RESOURCES_HEADER_VIEW_MODE_STYLE = { marginLeft: 'auto' };

export default function ResourcesHeaderBar({
  t,
  query = '',
  onQueryChange,
  onClear,
  canClear = false,
  onOpenAdvanced,
  quickFilters,
  onToggleTested,
  onToggleCompatibleOnly,
  onToggleFavorite,
  compatDisabled = false,
  compatLabel = '',
  viewMode = 'cards',
  onViewModeChange,
  incompleteMsg = '',
}) {
  const tested = !!quickFilters?.tested;
  const compatibleOnly = !!quickFilters?.compatibleOnly;
  const favorite = !!quickFilters?.favorite;

  return (
    <div className="uu-section">
      <div className="uu-row uu-align-center uu-gap-8" style={RESOURCES_HEADER_ROOT_STYLE}>
        <div className="uu-row uu-gap-4 uu-align-center" style={RESOURCES_HEADER_GROUP_STYLE}>
          <input
            className="uu-input"
            style={RESOURCES_HEADER_SEARCH_INPUT_STYLE}
            placeholder={t('resources.searchPlaceholder')}
            value={query}
            onChange={(event) => onQueryChange?.(event.target.value)}
          />
          <button
            type="button"
            className="uu-btn uu-btn-icon"
            onClick={onClear}
            disabled={!canClear}
            title={t('resources.search.clear')}
            style={RESOURCES_HEADER_CLEAR_BUTTON_STYLE}
          >
            ✕
          </button>
          <button
            type="button"
            className="uu-btn"
            onClick={onOpenAdvanced}
            style={RESOURCES_HEADER_ADVANCED_BUTTON_STYLE}
          >
            {t('resources.search.advancedButton')}
          </button>
        </div>

        <div className="uu-row uu-align-center" style={RESOURCES_HEADER_FILTERS_GROUP_STYLE}>
          <label className="uu-check">
            <input
              type="checkbox"
              checked={tested}
              onChange={onToggleTested}
            />
            {t('resources.detail.labels.tested')}
          </label>
          <label className="uu-check" style={compatDisabled ? RESOURCES_HEADER_COMPAT_DISABLED_STYLE : RESOURCES_HEADER_COMPAT_ENABLED_STYLE}>
            <input
              type="checkbox"
              disabled={compatDisabled}
              checked={compatibleOnly}
              onChange={onToggleCompatibleOnly}
            />
            {compatLabel}
          </label>
          <div className="uu-row uu-gap-6 uu-align-center">
            <button
              type="button"
              className={`uu-fav-filter ${favorite ? 'active' : ''}`}
              onClick={onToggleFavorite}
              aria-pressed={favorite ? 'true' : 'false'}
              title={t('resources.detail.labels.favorite')}
            >
              ★
            </button>
            <span>{t('resources.detail.labels.favorite')}</span>
          </div>
        </div>

        <div className="uu-row uu-gap-4" style={RESOURCES_HEADER_VIEW_MODE_STYLE}>
          <button
            type="button"
            className={`uu-btn ${viewMode === 'thumbs' ? 'prod-toggle-active' : ''}`}
            onClick={() => onViewModeChange?.('thumbs')}
          >
            {t('resources.view.thumbs')}
          </button>
          <button
            type="button"
            className={`uu-btn ${viewMode === 'cards' ? 'prod-toggle-active' : ''}`}
            onClick={() => onViewModeChange?.('cards')}
          >
            {t('resources.view.cards')}
          </button>
        </div>
      </div>

      {incompleteMsg ? (
        <div className="uu-msg error mt-8">
          {incompleteMsg}
        </div>
      ) : null}
    </div>
  );
}
