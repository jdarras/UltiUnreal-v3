import DateTimeConfirmPicker from '../components/DateTimeConfirmPicker';

const FILTERS_ROW_STYLE = { gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' };
const FILTER_COL_MIN_200_STYLE = { minWidth: '200px' };
const FILTER_COL_MIN_160_STYLE = { minWidth: '160px' };
const FILTER_COL_SEARCH_STYLE = { minWidth: '220px', flex: 1 };
const HIDDEN_LABEL_STYLE = { visibility: 'hidden' };

function LogsFiltersBar({
  t,
  fromAtLocal,
  toAtLocal,
  actionFilter,
  actionOptions,
  text,
  onFromAtLocalChange,
  onToAtLocalChange,
  onActionFilterChange,
  onTextChange,
  onClear,
}) {
  return (
    <div className="uu-row mt-8" style={FILTERS_ROW_STYLE}>
      <div className="uu-col" style={FILTER_COL_MIN_200_STYLE}>
        <label className="uu-label">{t('postprod.users.activity.filter.fromAt')}</label>
        <DateTimeConfirmPicker
          value={fromAtLocal}
          onChange={onFromAtLocalChange}
          placeholder={t('common.datePicker.placeholder')}
          applyLabel={t('common.datePicker.apply')}
          cancelLabel={t('common.datePicker.cancel')}
          clearLabel={t('common.datePicker.clear')}
        />
      </div>
      <div className="uu-col" style={FILTER_COL_MIN_200_STYLE}>
        <label className="uu-label">{t('postprod.users.activity.filter.toAt')}</label>
        <DateTimeConfirmPicker
          value={toAtLocal}
          onChange={onToAtLocalChange}
          placeholder={t('common.datePicker.placeholder')}
          applyLabel={t('common.datePicker.apply')}
          cancelLabel={t('common.datePicker.cancel')}
          clearLabel={t('common.datePicker.clear')}
        />
      </div>
      <div className="uu-col" style={FILTER_COL_MIN_160_STYLE}>
        <label className="uu-label">{t('logs.filters.actionType')}</label>
        <select
          className="uu-input"
          value={actionFilter}
          onChange={(e) => onActionFilterChange(e.target.value)}
        >
          {actionOptions.map((actionOption) => (
            <option key={actionOption.id} value={actionOption.id}>
              {actionOption.label}
            </option>
          ))}
        </select>
      </div>
      <div className="uu-col" style={FILTER_COL_SEARCH_STYLE}>
        <label className="uu-label">{t('postprod.users.activity.filter.search')}</label>
        <input
          className="uu-input"
          placeholder={t('logs.toolbar.searchPlaceholder')}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
        />
      </div>
      <div className="uu-col">
        <label className="uu-label" style={HIDDEN_LABEL_STYLE}>_</label>
        <button
          className="uu-btn-ghost"
          type="button"
          onClick={onClear}
        >
          {t('postprod.users.activity.filter.clear')}
        </button>
      </div>
    </div>
  );
}

export { LogsFiltersBar };
